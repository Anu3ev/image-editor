import { Canvas } from 'fabric'
import {
  SHAPE_DEFAULT_HORIZONTAL_ALIGN,
  SHAPE_DEFAULT_VERTICAL_ALIGN
} from '../domain/shape-presets'
import {
  getShapeNodes
} from '../domain/shape-nodes'
import {
  isShapeGroup
} from '../domain/shape-reference'
import {
  BeforeShapeUpdatedPayload,
  ShapeGroup,
  ShapeReference,
  ShapeSnapshot,
  ShapeTextNode,
  ShapeUpdateLifecycleContext,
  ShapeUpdateOptions,
  ShapeUpdatedPayload
} from '../types'

/**
 * Lifecycle-event controller for shape compositions.
 * Stores temporary editing/resize session state and builds the snapshot payload.
 */
export default class ShapeLifecycleController {
  /**
   * The editor's Fabric canvas.
   */
  private canvas: Canvas

  /**
   * Shape snapshots taken when entering live text editing.
   */
  private textEditingSnapshots: WeakMap<ShapeGroup, ShapeSnapshot>

  /**
   * Deferred lifecycle contexts for programmatic text updates inside shapes.
   */
  private pendingTextUpdates: WeakMap<ShapeTextNode, ShapeUpdateLifecycleContext>

  /**
   * Shape snapshots taken before pointer resizing begins.
   * Needed because the first object:scaling arrives after Fabric's transient transform.
   */
  private resizeStartSnapshots: Map<ShapeGroup, ShapeSnapshot>

  /**
   * Deferred lifecycle contexts for the final shape-resize commit.
   */
  private pendingResizeUpdates: WeakMap<ShapeGroup, ShapeUpdateLifecycleContext>

  /**
   * Initializes the shape-event lifecycle controller for the given canvas.
   */
  constructor({ canvas }: { canvas: Canvas }) {
    this.canvas = canvas
    this.textEditingSnapshots = new WeakMap()
    this.pendingTextUpdates = new WeakMap()
    this.resizeStartSnapshots = new Map()
    this.pendingResizeUpdates = new WeakMap()
  }

  /**
   * Creates a lifecycle context for updating a shape composition.
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
   * Emits the before-lifecycle event for a shape update.
   */
  public fireBefore({
    lifecycle
  }: {
    lifecycle: ShapeUpdateLifecycleContext
  }): void {
    this.canvas.fire('editor:before:shape-updated', lifecycle.payload)
  }

  /**
   * Emits the final lifecycle event for a shape update.
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
   * Captures the shape baseline before live text editing.
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
   * Finishes live text editing and emits a single final shape lifecycle if the shape actually changed.
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
   * Creates a lifecycle context for a programmatic text update inside a shape.
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
   * Resets the pending lifecycle for a programmatic text update.
   */
  public cancelTextUpdate({
    textNode
  }: {
    textNode: ShapeTextNode
  }): void {
    this.pendingTextUpdates.delete(textNode)
  }

  /**
   * Completes the lifecycle for a programmatic text update inside a shape.
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

    if (isShapeGroup(group) && this.textEditingSnapshots.has(group)) {
      this.textEditingSnapshots.set(group, after)
    }

    return after
  }

  /**
   * Saves the shape baseline before a potential pointer resize.
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
   * Converts the saved resize-start snapshot into a pending lifecycle context.
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
   * Resets resize-start snapshots without active scaling.
   */
  public clearResizeStarts(): void {
    this.resizeStartSnapshots.clear()
  }

  /** Removes initial and pending state for an interrupted resize of a single shape group. */
  public cancelResize({
    group
  }: {
    group: ShapeGroup
  }): void {
    this.resizeStartSnapshots.delete(group)
    this.pendingResizeUpdates.delete(group)
  }

  /** Finalizes shape resizing from its current state on the canvas. */
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
   * Builds a snapshot of the shape group's current domain state for lifecycle events.
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
   * Compares two shape-composition snapshots.
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
   * Creates a lifecycle context from a previously prepared before snapshot.
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
   * Builds a snapshot of the shape group's nested text node.
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
