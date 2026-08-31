import { ActiveSelection, type Canvas } from 'fabric'
import {
  DEFAULT_SHAPE_PRESET_KEY,
  SHAPE_DEFAULT_HORIZONTAL_ALIGN,
  SHAPE_DEFAULT_VERTICAL_ALIGN
} from '../domain/shape-presets'
import {
  applyShapeStyle
} from '../creation/shape-node-factory'
import { normalizeShapeRounding } from '../domain/shape-rounding'
import {
  getShapeNodes
} from '../domain/shape-nodes'
import {
  prepareRehydratedShapeLayout
} from './shape-rehydration'
import {
  SHAPE_TEXT_LAYOUT_RESET_STATE,
  ShapeUpdatePipeline
} from './shape-update-pipeline'
import {
  applyShapeGroupMetadata,
  ShapeGroupObject
} from '../domain/shape-group'
import { resolveShapeGroup } from '../domain/shape-reference'
import { detachShapeGroupAutoLayout } from '../domain/shape-runtime'
import type CanvasManager from '../../canvas-manager'
import type { ObjectPlacement } from '../../canvas-manager'
import type HistoryManager from '../../history-manager'
import type ShapeLayoutController from '../layout/shape-layout-controller'
import type ShapeLifecycleController from '../lifecycle/shape-lifecycle-controller'
import type ShapeTextNodeController from '../text/shape-text-node-controller'
import type {
  ShapeGroup,
  ShapeHorizontalAlign,
  ShapeNode,
  ShapeReference,
  ShapeStrokeOptions,
  ShapeTextAlignOptions,
  ShapeTextNode,
  ShapeTextStyleOptions,
  ShapeUpdateLifecycleContext,
  ShapeUpdateOptions,
  ShapeVerticalAlign
} from '../types'
import type {
  PreparedShapeUpdate
} from './shape-update-pipeline'
import { isCurrentTransformAffectedByRemoval } from '../../utils/current-transform'

/**
 * Конкретные зависимости команд, которые изменяют shape-группу.
 */
type ShapeMutationDependencies = {
  canvas: Canvas
  canvasManager: CanvasManager
  historyManager: HistoryManager
  lifecycleController: ShapeLifecycleController
  layoutController: ShapeLayoutController
  textNodeController: ShapeTextNodeController
  editingPlacements: WeakMap<ShapeGroup, ObjectPlacement>
}

/**
 * Одна programmatic mutation с общим shape lifecycle и history boundary.
 */
type ShapeLifecycleMutation = {
  lifecycle: ShapeUpdateLifecycleContext
  withoutSave?: boolean
  mutate: () => void
}

/**
 * Разрешённая группа и её обязательный visual node для mutation-команд.
 */
type ShapeMutationTarget = {
  group: ShapeGroup
  shape: ShapeNode
  text: ShapeTextNode | null
}

/**
 * Владеет командами изменения shape-группы и порядком подготовки/применения update.
 */
export default class ShapeMutationController {
  /**
   * Явные зависимости mutation и history lifecycle.
   */
  private readonly dependencies: ShapeMutationDependencies

  /**
   * Pipeline update вынесен отдельно, чтобы controller не смешивал расчёты и применение мутаций.
   */
  private readonly updatePipeline: ShapeUpdatePipeline

  /**
   * Инициализирует mutation controller конкретными domain dependencies.
   */
  constructor({ dependencies }: { dependencies: ShapeMutationDependencies }) {
    this.dependencies = dependencies
    this.updatePipeline = new ShapeUpdatePipeline({
      dependencies: {
        canvas: dependencies.canvas,
        canvasManager: dependencies.canvasManager,
        lifecycleController: dependencies.lifecycleController,
        layoutController: dependencies.layoutController,
        textNodeController: dependencies.textNodeController
      }
    })
  }

  /**
   * Обновляет shape-группу через единый порядок подготовки и применения изменений.
   */
  public async update({
    target,
    presetKey,
    options = {}
  }: {
    target?: ShapeReference
    presetKey?: string
    options?: ShapeUpdateOptions
  } = {}): Promise<ShapeGroup | null> {
    const preparedUpdate = await this.updatePipeline.prepare({
      target,
      presetKey,
      options
    })

    if (!preparedUpdate) return null

    const { group } = preparedUpdate.current
    const wasOnCanvas = this._isOnCanvas({ group })

    if (!wasOnCanvas) {
      this._applyPreparedUpdate({ preparedUpdate })
      this.dependencies.lifecycleController.fireBefore({ lifecycle: preparedUpdate.lifecycle })
      this.dependencies.lifecycleController.fireUpdated({ lifecycle: preparedUpdate.lifecycle })

      return group
    }

    this._beginMutation()

    try {
      this._applyPreparedUpdate({ preparedUpdate })

      if (!preparedUpdate.current.text.isEditing && !preparedUpdate.withoutSelection) {
        this.dependencies.canvas.setActiveObject(group)
      }

      this.dependencies.lifecycleController.fireBefore({ lifecycle: preparedUpdate.lifecycle })
      this.dependencies.canvas.requestRenderAll()
    } finally {
      this._endMutation({ withoutSave: preparedUpdate.withoutSave })
    }

    this.dependencies.lifecycleController.fireUpdated({ lifecycle: preparedUpdate.lifecycle })

    return group
  }

  /**
   * Удаляет shape-группу с canvas, если группа существует и не заблокирована.
   */
  public remove({
    target,
    withoutSave
  }: {
    target?: ShapeReference
    withoutSave?: boolean
  } = {}): boolean {
    const group = this._resolveUnlockedGroup({ target })

    if (!group) return false

    this._beginMutation()

    try {
      const { canvas } = this.dependencies

      // Фиксируем преобразование до удаления шейпа, пока исходное выделение ещё существует.
      if (isCurrentTransformAffectedByRemoval({ canvas, objects: [group] })) {
        canvas.endCurrentTransform()
      }

      const activeObject = canvas.getActiveObject()
      if (activeObject instanceof ActiveSelection && activeObject.getObjects().includes(group)) {
        canvas.discardActiveObject()
      }

      canvas.remove(group)
      canvas.requestRenderAll()
    } finally {
      this._endMutation({ withoutSave })
    }

    return true
  }

  /**
   * Обновляет заливку shape-узла и эмитит shape lifecycle события.
   */
  public setFill({
    target,
    fill,
    withoutSave
  }: {
    target?: ShapeReference
    fill: string
    withoutSave?: boolean
  }): ShapeGroup | null {
    const current = this._resolveUnlockedShapeTarget({ target })
    if (!current) return null

    const { group, shape } = current

    const lifecycle = this.dependencies.lifecycleController.createContext({
      group,
      source: 'fill',
      target,
      withoutSave
    })

    this._commitLifecycleMutation({
      lifecycle,
      withoutSave,
      mutate: () => {
        applyShapeStyle({
          shape,
          style: { fill }
        })

        group.shapeFill = fill
        group.setCoords()
      }
    })

    return group
  }

  /**
   * Обновляет параметры обводки и пересчитывает layout текста, если он есть в группе.
   */
  public setStroke({
    target,
    stroke,
    strokeWidth,
    dash,
    withoutSave
  }: {
    target?: ShapeReference
  } & ShapeStrokeOptions): ShapeGroup | null {
    const current = this._resolveUnlockedShapeTarget({ target })
    if (!current) return null

    const { group, shape, text } = current

    const lifecycle = this.dependencies.lifecycleController.createContext({
      group,
      source: 'stroke',
      target,
      withoutSave
    })

    this._commitLifecycleMutation({
      lifecycle,
      withoutSave,
      mutate: () => {
        this._applyStrokeAndTextLayout({
          group,
          shape,
          text,
          stroke,
          strokeWidth,
          dash
        })

        group.setCoords()
      }
    })

    return group
  }

  /**
   * Обновляет opacity фигуры и, по умолчанию, текста внутри группы.
   */
  public setOpacity({
    target,
    opacity,
    applyToText = true,
    withoutSave
  }: {
    target?: ShapeReference
    opacity: number
    applyToText?: boolean
    withoutSave?: boolean
  }): ShapeGroup | null {
    const current = this._resolveUnlockedShapeTarget({ target })
    if (!current) return null

    const { group, shape, text } = current

    const lifecycle = this.dependencies.lifecycleController.createContext({
      group,
      source: 'opacity',
      target,
      withoutSave
    })

    this._commitLifecycleMutation({
      lifecycle,
      withoutSave,
      mutate: () => {
        applyShapeStyle({
          shape,
          style: { opacity }
        })

        if (applyToText && text) {
          text.set({ opacity })
          text.setCoords()
        }

        group.shapeOpacity = opacity
        group.set({ opacity: 1 })
        group.setCoords()
      }
    })

    return group
  }

  /**
   * Обновляет стиль текста внутри фигуры, не переключая shape-level режим auto-expand.
   */
  public updateTextStyle({
    target,
    style = {},
    withoutSave
  }: {
    target?: ShapeReference
    style?: ShapeTextStyleOptions
    withoutSave?: boolean
  } = {}): ShapeGroup | null {
    const current = this._resolveUnlockedShapeTarget({ target })
    if (!current) return null

    const { group, shape, text } = current
    const hasStyleUpdates = Object.keys(style).length > 0

    if (!text) return null
    if (!hasStyleUpdates) return group

    const manualDimensions = this.dependencies.layoutController.resolveManualDimensions({ group })
    const placement = this.dependencies.canvasManager.getObjectPlacement({ object: group })
    const alignH = this.dependencies.layoutController.resolveShapeTextHorizontalAlign({
      group,
      textStyle: style
    })
    const lifecycle = this.dependencies.lifecycleController.createContext({
      group,
      source: 'text-style',
      target,
      withoutSave
    })

    this._commitLifecycleMutation({
      lifecycle,
      withoutSave,
      mutate: () => {
        this._applyTextStyleAndLayout({
          group,
          shape,
          text,
          placement,
          style,
          height: manualDimensions.height,
          alignH
        })
      }
    })

    return group
  }

  /**
   * Обновляет горизонтальное и вертикальное выравнивание текста внутри фигуры.
   */
  public setTextAlign({
    target,
    horizontal,
    vertical,
    withoutSave
  }: {
    target?: ShapeReference
  } & ShapeTextAlignOptions): ShapeGroup | null {
    const current = this._resolveUnlockedShapeTarget({ target })
    if (!current) return null

    const { group, shape, text } = current
    if (!text) return null

    const dimensions = this.dependencies.layoutController.resolveCurrentDimensions({ group })
    const alignH = horizontal
      ?? group.shapeAlignHorizontal
      ?? SHAPE_DEFAULT_HORIZONTAL_ALIGN
    const alignV = vertical
      ?? group.shapeAlignVertical
      ?? SHAPE_DEFAULT_VERTICAL_ALIGN
    const lifecycle = this.dependencies.lifecycleController.createContext({
      group,
      source: 'text-align',
      target,
      withoutSave
    })

    this._commitLifecycleMutation({
      lifecycle,
      withoutSave,
      mutate: () => {
        this._applyTextAlignAndLayout({
          group,
          shape,
          text,
          width: dimensions.width,
          height: dimensions.height,
          alignH,
          alignV
        })
      }
    })

    return group
  }

  /**
   * Нормализует rounding и делегирует изменение в общий update.
   */
  public async setRounding({
    target,
    rounding,
    withoutSave
  }: {
    target?: ShapeReference
    rounding: number
    withoutSave?: boolean
  }): Promise<ShapeGroup | null> {
    const group = this._resolveUnlockedGroup({ target })

    if (!group) return null

    const normalizedRounding = normalizeShapeRounding({ rounding })

    if (group.shapeCanRound === false) return group

    return this.update({
      target: group,
      presetKey: group.shapePresetKey ?? DEFAULT_SHAPE_PRESET_KEY,
      options: {
        rounding: normalizedRounding,
        withoutSave
      }
    })
  }

  /**
   * Материализует rehydrated shape-группу и пересчитывает auto-expand только для изменённых входов.
   */
  public commitRehydratedShapeLayout({
    target,
    textScale = 1,
    shapeTextAutoExpand
  }: {
    target?: ShapeReference
    textScale?: number
    shapeTextAutoExpand?: boolean
  }): boolean {
    const group = resolveShapeGroup({
      canvas: this.dependencies.canvas,
      target
    })

    if (!group) return false

    const { shape, text } = getShapeNodes({ group })

    if (!shape || !text) return false

    const placement = this.dependencies.canvasManager.getObjectPlacement({ object: group })
    const preparedLayout = prepareRehydratedShapeLayout({
      group,
      text,
      textScale,
      shapeTextAutoExpand
    })
    const {
      currentDimensions,
      replaceBoxDimensions,
      shouldRecalculateLayout
    } = preparedLayout

    this.dependencies.layoutController.applyCurrentLayout({
      group,
      shape,
      text,
      placement,
      width: shouldRecalculateLayout
        ? undefined
        : currentDimensions.width,
      height: currentDimensions.height,
      expandShapeHeightToFitText: shouldRecalculateLayout,
      alignH: group.shapeAlignHorizontal ?? SHAPE_DEFAULT_HORIZONTAL_ALIGN,
      alignV: group.shapeAlignVertical ?? SHAPE_DEFAULT_VERTICAL_ALIGN
    })

    group.shapeReplaceBoxWidth = replaceBoxDimensions.width
    group.shapeReplaceBoxHeight = replaceBoxDimensions.height

    return true
  }

  /**
   * Пропускает дальше только существующую и незаблокированную shape-группу.
   */
  private _resolveUnlockedGroup({ target }: { target?: ShapeReference }): ShapeGroup | null {
    const group = resolveShapeGroup({
      canvas: this.dependencies.canvas,
      target
    })

    if (!group || group.locked) return null

    return group
  }

  /**
   * Разрешает незаблокированную группу вместе с обязательным visual node.
   */
  private _resolveUnlockedShapeTarget({
    target
  }: {
    target?: ShapeReference
  }): ShapeMutationTarget | null {
    const group = this._resolveUnlockedGroup({ target })
    if (!group) return null

    const { shape, text } = getShapeNodes({ group })
    if (!shape) return null

    return {
      group,
      shape,
      text
    }
  }

  /**
   * Применяет stroke-свойства к shape-узлу и пересчитывает layout текста при наличии text node.
   */
  private _applyStrokeAndTextLayout({
    group,
    shape,
    text,
    stroke,
    strokeWidth,
    dash
  }: {
    group: ShapeGroup
    shape: ShapeNode
    text: ShapeTextNode | null
  } & ShapeStrokeOptions): void {
    applyShapeStyle({
      shape,
      style: {
        stroke,
        strokeWidth,
        strokeDashArray: dash
      }
    })

    if (stroke !== undefined) {
      group.shapeStroke = stroke
    }

    if (strokeWidth !== undefined) {
      group.shapeStrokeWidth = strokeWidth
    }

    if (dash !== undefined) {
      group.shapeStrokeDashArray = dash
    }

    if (!text) return

    const currentDimensions = this.dependencies.layoutController.resolveCurrentDimensions({ group })

    this.dependencies.layoutController.applyCurrentLayout({
      group,
      shape,
      text,
      width: currentDimensions.width,
      height: currentDimensions.height
    })
  }

  /**
   * Применяет стиль текста и пересчитывает layout без изменения shape-level auto-expand режима.
   */
  private _applyTextStyleAndLayout({
    group,
    shape,
    text,
    placement,
    style,
    height,
    alignH
  }: {
    group: ShapeGroup
    shape: ShapeNode
    text: ShapeTextNode
    placement: ObjectPlacement
    style: ShapeTextStyleOptions
    height: number
    alignH: ShapeHorizontalAlign
  }): void {
    this.dependencies.textNodeController.applyUpdates({
      textNode: text,
      textStyle: style,
      align: alignH
    })

    this.dependencies.layoutController.applyCurrentLayout({
      group,
      shape,
      text,
      placement,
      height,
      alignH
    })
  }

  /**
   * Применяет выравнивание текста и обновляет layout в текущих размерах группы.
   */
  private _applyTextAlignAndLayout({
    group,
    shape,
    text,
    width,
    height,
    alignH,
    alignV
  }: {
    group: ShapeGroup
    shape: ShapeNode
    text: ShapeTextNode
    width: number
    height: number
    alignH: ShapeHorizontalAlign
    alignV: ShapeVerticalAlign
  }): void {
    this.dependencies.textNodeController.applyUpdates({
      textNode: text,
      align: alignH
    })

    this.dependencies.layoutController.applyCurrentLayout({
      group,
      shape,
      text,
      width,
      height,
      alignH,
      alignV
    })
  }

  /**
   * Применяет подготовленное обновление к текущей группе в каноническом порядке мутации.
   */
  private _applyPreparedUpdate({ preparedUpdate }: { preparedUpdate: PreparedShapeUpdate }): void {
    this._applyPreparedTextState({ preparedUpdate })
    this._replacePreparedShapeNode({ preparedUpdate })
    this._applyPreparedMetadata({ preparedUpdate })
    this._applyPreparedLayout({ preparedUpdate })
    this._syncPreparedPostLayoutState({ preparedUpdate })
  }

  /**
   * Переводит текущий text node в подготовленное состояние до замены shape-узла.
   */
  private _applyPreparedTextState({ preparedUpdate }: { preparedUpdate: PreparedShapeUpdate }): void {
    const {
      current,
      text
    } = preparedUpdate

    detachShapeGroupAutoLayout({ group: current.group })
    current.text.set(SHAPE_TEXT_LAYOUT_RESET_STATE)
    this.dependencies.textNodeController.applyUpdates({
      textNode: current.text,
      text: text.value,
      textStyle: text.style,
      align: text.horizontalAlign,
      syncLineStylesWithText: text.syncLineStylesWithText
    })
  }

  /**
   * Подменяет shape-узел внутри текущей группы на уже материализованный next shape.
   */
  private _replacePreparedShapeNode({ preparedUpdate }: { preparedUpdate: PreparedShapeUpdate }): void {
    const {
      current,
      next
    } = preparedUpdate

    const groupRef = current.group as ShapeGroupObject

    groupRef.replaceShapeNode(
      current.shapeIndex,
      current.shape,
      next.shape
    )
  }

  /**
   * Применяет persisted metadata группы после замены shape-узла.
   */
  private _applyPreparedMetadata({ preparedUpdate }: { preparedUpdate: PreparedShapeUpdate }): void {
    const {
      current,
      next,
      text,
      layout
    } = preparedUpdate

    applyShapeGroupMetadata({
      group: current.group,
      metadata: {
        presetKey: next.presetKey,
        presetCanRound: next.presetCanRound,
        width: layout.width,
        height: layout.height,
        manualWidth: next.manual.width,
        manualHeight: next.manual.height,
        replaceBoxWidth: next.replaceBox.width,
        replaceBoxHeight: next.replaceBox.height,
        shapeTextAutoExpand: next.shapeTextAutoExpand,
        alignH: text.horizontalAlign,
        alignV: text.verticalAlign,
        padding: next.userPadding,
        style: next.style,
        rounding: next.rounding
      }
    })
  }

  /**
   * Применяет финальный layout уже к обновлённой группе с новым shape-узлом.
   */
  private _applyPreparedLayout({ preparedUpdate }: { preparedUpdate: PreparedShapeUpdate }): void {
    const {
      current,
      next,
      text,
      layout,
      placement
    } = preparedUpdate

    this.dependencies.layoutController.applyCurrentLayout({
      group: current.group,
      shape: next.shape,
      text: current.text,
      placement,
      width: layout.width,
      height: layout.height,
      alignH: text.horizontalAlign,
      alignV: text.verticalAlign,
      internalShapeTextInset: layout.internalShapeTextInset,
      resolveInternalShapeTextInset: layout.resolveInternalShapeTextInset,
      preserveAspectRatio: layout.preserveAspectRatio,
      expandShapeHeightToFitText: layout.expandShapeHeightToFitText,
      changedPadding: layout.changedPadding
    })
  }

  /**
   * Синхронизирует post-layout состояние manual base и editing placement.
   */
  private _syncPreparedPostLayoutState({ preparedUpdate }: { preparedUpdate: PreparedShapeUpdate }): void {
    const {
      current,
      next,
      layout,
      placement
    } = preparedUpdate

    if (next.shouldFitReplacementToPreset) {
      current.group.shapeManualBaseWidth = Math.max(1, current.group.shapeBaseWidth ?? layout.width)
      current.group.shapeManualBaseHeight = Math.max(1, current.group.shapeBaseHeight ?? layout.height)
    }

    if (current.text.isEditing) {
      this.dependencies.editingPlacements.set(current.group, placement)
    }
  }

  /**
   * Выполняет mutation внутри одной history-транзакции и эмитит общий shape lifecycle.
   */
  private _commitLifecycleMutation({
    lifecycle,
    withoutSave,
    mutate
  }: ShapeLifecycleMutation): void {
    this._beginMutation()

    try {
      mutate()
      this.dependencies.lifecycleController.fireBefore({ lifecycle })
      this.dependencies.canvas.requestRenderAll()
    } finally {
      this._endMutation({ withoutSave })
    }

    this.dependencies.lifecycleController.fireUpdated({ lifecycle })
  }

  /**
   * Начинает programmatic shape mutation с временно отключённой историей.
   */
  private _beginMutation(): void {
    this.dependencies.historyManager.suspendHistory()
  }

  /**
   * Завершает shape mutation и сохраняет только итоговое canvas state.
   */
  private _endMutation({ withoutSave }: { withoutSave?: boolean }): void {
    this.dependencies.historyManager.resumeHistory()

    if (!withoutSave) {
      this.dependencies.historyManager.saveState()
    }
  }

  /**
   * Проверяет, находится ли shape-группа непосредственно на canvas.
   */
  private _isOnCanvas({ group }: { group: ShapeGroup }): boolean {
    const objects = this.dependencies.canvas.getObjects()

    for (let index = 0; index < objects.length; index += 1) {
      if (objects[index] === group) return true
    }

    return false
  }
}
