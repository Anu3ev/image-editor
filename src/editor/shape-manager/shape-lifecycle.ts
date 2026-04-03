import { Canvas } from 'fabric'
import {
  SHAPE_DEFAULT_HORIZONTAL_ALIGN,
  SHAPE_DEFAULT_VERTICAL_ALIGN
} from './shape-presets'
import {
  getShapeNodes,
  isShapeGroup
} from './shape-utils'
import {
  BeforeShapeUpdatedPayload,
  ShapeGroup,
  ShapeReference,
  ShapeSnapshot,
  ShapeTextNode,
  ShapeUpdateLifecycleContext,
  ShapeUpdateOptions,
  ShapeUpdatedPayload
} from './types'

/**
 * Контроллер lifecycle-событий shape-композиций.
 * Хранит временное состояние editing/resize сессий и собирает snapshot payload.
 */
export default class ShapeLifecycleController {
  /**
   * Fabric canvas редактора.
   */
  private canvas: Canvas

  /**
   * Снимки shape на момент входа в live text editing.
   */
  private textEditingSnapshots: WeakMap<ShapeGroup, ShapeSnapshot>

  /**
   * Отложенные lifecycle-контексты для программных обновлений текста внутри shape.
   */
  private pendingTextUpdates: WeakMap<ShapeTextNode, ShapeUpdateLifecycleContext>

  /**
   * Снимки shape до начала pointer-resize.
   * Нужны потому, что первый object:scaling приходит уже после transient transform Fabric.
   */
  private resizeStartSnapshots: Map<ShapeGroup, ShapeSnapshot>

  /**
   * Отложенные lifecycle-контексты для финального commit ресайза shape.
   */
  private pendingResizeUpdates: WeakMap<ShapeGroup, ShapeUpdateLifecycleContext>

  constructor({ canvas }: { canvas: Canvas }) {
    this.canvas = canvas
    this.textEditingSnapshots = new WeakMap()
    this.pendingTextUpdates = new WeakMap()
    this.resizeStartSnapshots = new Map()
    this.pendingResizeUpdates = new WeakMap()
  }

  /**
   * Создает lifecycle-контекст обновления shape-композиции.
   */
  public createContext({
    group,
    source,
    target,
    presetKey,
    options,
    withoutSave
  }: {
    group: ShapeGroup
    source: BeforeShapeUpdatedPayload['source']
    target?: ShapeReference
    presetKey?: string
    options?: ShapeUpdateOptions
    withoutSave?: boolean
  }): ShapeUpdateLifecycleContext {
    return this._createContextFromBefore({
      group,
      before: ShapeLifecycleController.getSnapshot({ group }),
      source,
      target,
      presetKey,
      options,
      withoutSave
    })
  }

  /**
   * Эмитит before-lifecycle событие обновления shape.
   */
  public fireBefore({
    lifecycle
  }: {
    lifecycle: ShapeUpdateLifecycleContext
  }): void {
    this.canvas.fire('editor:before:shape-updated', lifecycle.payload)
  }

  /**
   * Эмитит финальное lifecycle событие обновления shape.
   */
  public fireUpdated({
    lifecycle,
    after
  }: {
    lifecycle: ShapeUpdateLifecycleContext
    after?: ShapeSnapshot
  }): ShapeSnapshot {
    const resolvedAfter = after ?? ShapeLifecycleController.getSnapshot({
      group: lifecycle.payload.shape
    })
    const shapeUpdatedPayload: ShapeUpdatedPayload = {
      ...lifecycle.payload,
      before: lifecycle.before,
      after: resolvedAfter
    }

    this.canvas.fire('editor:shape-updated', shapeUpdatedPayload)

    return resolvedAfter
  }

  /**
   * Фиксирует baseline shape перед live text editing.
   */
  public beginTextEditing({
    group
  }: {
    group: ShapeGroup
  }): void {
    this.textEditingSnapshots.set(
      group,
      ShapeLifecycleController.getSnapshot({ group })
    )
  }

  /**
   * Завершает live text editing и эмитит один итоговый shape lifecycle, если shape реально изменился.
   */
  public finishTextEditing({
    group,
    textNode
  }: {
    group: ShapeGroup
    textNode: ShapeTextNode
  }): ShapeSnapshot | null {
    const before = this.textEditingSnapshots.get(group)
    this.textEditingSnapshots.delete(group)
    if (!before) return null

    const after = ShapeLifecycleController.getSnapshot({ group })
    if (ShapeLifecycleController.areSnapshotsEqual({ before, after })) {
      return null
    }

    const lifecycle = this._createContextFromBefore({
      group,
      before,
      source: 'text-edit',
      target: textNode
    })

    this.fireBefore({
      lifecycle
    })

    return this.fireUpdated({
      lifecycle,
      after
    })
  }

  /**
   * Создает lifecycle-контекст программного обновления текста внутри shape.
   */
  public beginTextUpdate({
    group,
    textNode,
    withoutSave
  }: {
    group: ShapeGroup
    textNode: ShapeTextNode
    withoutSave?: boolean
  }): ShapeUpdateLifecycleContext {
    const lifecycle = this.createContext({
      group,
      source: 'text-update',
      target: textNode,
      withoutSave
    })

    this.pendingTextUpdates.set(textNode, lifecycle)

    return lifecycle
  }

  /**
   * Сбрасывает pending lifecycle программного обновления текста.
   */
  public cancelTextUpdate({
    textNode
  }: {
    textNode: ShapeTextNode
  }): void {
    this.pendingTextUpdates.delete(textNode)
  }

  /**
   * Завершает lifecycle программного обновления текста внутри shape.
   */
  public finishTextUpdate({
    textNode
  }: {
    textNode: ShapeTextNode
  }): ShapeSnapshot | null {
    const lifecycle = this.pendingTextUpdates.get(textNode)
    if (!lifecycle) return null

    this.pendingTextUpdates.delete(textNode)

    const after = this.fireUpdated({
      lifecycle
    })
    const { group } = textNode

    if (isShapeGroup(group) && textNode.isEditing) {
      this.textEditingSnapshots.set(group, after)
    }

    return after
  }

  /**
   * Сохраняет baseline shape до потенциального pointer-resize.
   */
  public captureResizeStart({
    group
  }: {
    group: ShapeGroup
  }): void {
    if (this.resizeStartSnapshots.has(group)) return

    this.resizeStartSnapshots.set(
      group,
      ShapeLifecycleController.getSnapshot({ group })
    )
  }

  /**
   * Переводит сохраненный resize-start snapshot в pending lifecycle-контекст.
   */
  public beginResize({
    group
  }: {
    group: ShapeGroup
  }): void {
    if (this.pendingResizeUpdates.has(group)) return

    const before = this.resizeStartSnapshots.get(group)
      ?? ShapeLifecycleController.getSnapshot({ group })

    this.resizeStartSnapshots.delete(group)
    this.pendingResizeUpdates.set(
      group,
      this._createContextFromBefore({
        group,
        before,
        source: 'resize',
        target: group
      })
    )
  }

  /**
   * Сбрасывает resize-start snapshots без активного scaling.
   */
  public clearResizeStarts(): void {
    this.resizeStartSnapshots.clear()
  }

  /**
   * Завершает lifecycle ресайза shape после commit геометрии.
   */
  public finishResize({
    group
  }: {
    group: ShapeGroup
  }): ShapeSnapshot | null {
    const lifecycle = this.pendingResizeUpdates.get(group)
    if (!lifecycle) return null

    this.pendingResizeUpdates.delete(group)

    const after = ShapeLifecycleController.getSnapshot({ group })
    if (ShapeLifecycleController.areSnapshotsEqual({
      before: lifecycle.before,
      after
    })) return null

    this.fireBefore({
      lifecycle
    })

    return this.fireUpdated({
      lifecycle,
      after
    })
  }

  /**
   * Формирует снимок текущего доменного состояния shape-группы для lifecycle-событий.
   */
  public static getSnapshot({ group }: { group: ShapeGroup }): ShapeSnapshot {
    const groupWithId = group as ShapeGroup & {
      id?: string
    }
    const {
      id,
      shapePresetKey,
      shapeBaseWidth,
      shapeBaseHeight,
      shapeManualBaseWidth,
      shapeManualBaseHeight,
      shapeTextAutoExpand,
      shapeAlignHorizontal,
      shapeAlignVertical,
      shapePaddingTop,
      shapePaddingRight,
      shapePaddingBottom,
      shapePaddingLeft,
      shapeFill,
      shapeStroke,
      shapeStrokeWidth,
      shapeStrokeDashArray,
      shapeOpacity,
      shapeRounding,
      left,
      top,
      originX,
      originY,
      angle,
      flipX,
      flipY,
      scaleX,
      scaleY
    } = groupWithId
    const { text } = getShapeNodes({ group })
    const currentWidth = Math.max(
      1,
      (shapeBaseWidth ?? group.width ?? 1) * (Math.abs(scaleX ?? 1) || 1)
    )
    const currentHeight = Math.max(
      1,
      (shapeBaseHeight ?? group.height ?? 1) * (Math.abs(scaleY ?? 1) || 1)
    )

    return {
      id,
      presetKey: shapePresetKey,
      baseWidth: shapeBaseWidth,
      baseHeight: shapeBaseHeight,
      manualBaseWidth: shapeManualBaseWidth,
      manualBaseHeight: shapeManualBaseHeight,
      currentWidth,
      currentHeight,
      shapeTextAutoExpand: shapeTextAutoExpand !== false,
      alignH: shapeAlignHorizontal ?? SHAPE_DEFAULT_HORIZONTAL_ALIGN,
      alignV: shapeAlignVertical ?? SHAPE_DEFAULT_VERTICAL_ALIGN,
      padding: {
        top: shapePaddingTop ?? 0,
        right: shapePaddingRight ?? 0,
        bottom: shapePaddingBottom ?? 0,
        left: shapePaddingLeft ?? 0
      },
      fill: shapeFill,
      stroke: shapeStroke,
      strokeWidth: shapeStrokeWidth,
      strokeDashArray: shapeStrokeDashArray
        ? shapeStrokeDashArray.slice()
        : shapeStrokeDashArray ?? null,
      opacity: shapeOpacity,
      rounding: shapeRounding,
      left,
      top,
      originX,
      originY,
      angle,
      flipX: Boolean(flipX),
      flipY: Boolean(flipY),
      scaleX,
      scaleY,
      text: text
        ? ShapeLifecycleController._getTextNodeSnapshot({ textNode: text })
        : undefined
    }
  }

  /**
   * Сравнивает два snapshot shape-композиции.
   */
  public static areSnapshotsEqual({
    before,
    after
  }: {
    before: ShapeSnapshot
    after: ShapeSnapshot
  }): boolean {
    return JSON.stringify(before) === JSON.stringify(after)
  }

  /**
   * Создает lifecycle-контекст из заранее подготовленного before snapshot.
   */
  private _createContextFromBefore({
    group,
    before,
    source,
    target,
    presetKey,
    options,
    withoutSave
  }: {
    group: ShapeGroup
    before: ShapeSnapshot
    source: BeforeShapeUpdatedPayload['source']
    target?: ShapeReference
    presetKey?: string
    options?: ShapeUpdateOptions
    withoutSave?: boolean
  }): ShapeUpdateLifecycleContext {
    return {
      before,
      payload: {
        shape: group,
        source,
        target,
        presetKey,
        options,
        withoutSave
      }
    }
  }

  /**
   * Формирует snapshot вложенного текстового узла shape-группы.
   */
  private static _getTextNodeSnapshot({ textNode }: { textNode: ShapeTextNode }): ShapeSnapshot['text'] {
    const textNodeWithSnapshotFields = textNode as ShapeTextNode & {
      id?: string
      textCaseRaw?: string
      uppercase?: boolean
    }
    const addIfPresent = (
      {
        snapshot,
        entries
      }: {
        snapshot: NonNullable<ShapeSnapshot['text']>
        entries: Record<string, unknown>
      }
    ): void => {
      Object.entries(entries).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          snapshot[key] = value
        }
      })
    }

    const {
      id,
      text,
      textCaseRaw,
      uppercase,
      autoExpand,
      fontFamily,
      fontSize,
      fontWeight,
      fontStyle,
      underline,
      linethrough,
      textAlign,
      fill,
      stroke,
      strokeWidth,
      opacity,
      backgroundColor,
      backgroundOpacity,
      paddingTop,
      paddingRight,
      paddingBottom,
      paddingLeft,
      radiusTopLeft,
      radiusTopRight,
      radiusBottomRight,
      radiusBottomLeft,
      left,
      top,
      width,
      height,
      angle,
      scaleX,
      scaleY
    } = textNodeWithSnapshotFields
    const snapshot: NonNullable<ShapeSnapshot['text']> = {
      id,
      uppercase: Boolean(uppercase),
      textAlign
    }

    addIfPresent({
      snapshot,
      entries: {
        text,
        textCaseRaw,
        autoExpand,
        fontFamily,
        fontSize,
        fontWeight,
        fontStyle,
        underline,
        linethrough,
        fill,
        stroke,
        strokeWidth,
        opacity,
        backgroundColor,
        backgroundOpacity,
        paddingTop,
        paddingRight,
        paddingBottom,
        paddingLeft,
        radiusTopLeft,
        radiusTopRight,
        radiusBottomRight,
        radiusBottomLeft,
        left,
        top,
        width,
        height,
        angle,
        scaleX,
        scaleY
      }
    })

    return snapshot
  }
}
