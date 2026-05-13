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
  applyRehydratedShapeTextScale,
  resolveRehydratedShapeDimensions
} from './shape-rehydration'
import {
  SHAPE_TEXT_LAYOUT_RESET_STATE,
  ShapeUpdatePipeline
} from './shape-update-pipeline'
import { ShapeGroupObject } from '../domain/shape-group'
import type { ObjectPlacement } from '../../canvas-manager'
import type {
  ShapeGroup,
  ShapeHorizontalAlign,
  ShapeNode,
  ShapeReference,
  ShapeStrokeOptions,
  ShapeTextAlignOptions,
  ShapeTextNode,
  ShapeTextStyleOptions,
  ShapeUpdateOptions,
  ShapeVerticalAlign
} from '../types'
import type {
  ShapeMutationRuntime
} from './shape-mutation-runtime'
import type {
  PreparedShapeUpdate
} from './shape-update-pipeline'

/**
 * Владеет командами изменения shape-группы и порядком подготовки/применения update.
 */
export default class ShapeMutationController {
  /**
   * Runtime-зависимости мутаций, вынесенные из ShapeManager facade.
   */
  private readonly runtime: ShapeMutationRuntime

  /**
   * Pipeline update вынесен отдельно, чтобы controller не смешивал расчёты и применение мутаций.
   */
  private readonly updatePipeline: ShapeUpdatePipeline

  /**
   * Инициализирует mutation controller готовым runtime-контрактом ShapeManager.
   */
  constructor({ runtime }: { runtime: ShapeMutationRuntime }) {
    this.runtime = runtime
    this.updatePipeline = new ShapeUpdatePipeline({ runtime })
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
    const wasOnCanvas = this.runtime.isOnCanvas({ object: group })

    if (!wasOnCanvas) {
      this._applyPreparedUpdate({ preparedUpdate })
      this.runtime.lifecycleController.fireBefore({ lifecycle: preparedUpdate.lifecycle })
      this.runtime.lifecycleController.fireUpdated({ lifecycle: preparedUpdate.lifecycle })

      return group
    }

    this.runtime.beginMutation()

    try {
      this._applyPreparedUpdate({ preparedUpdate })

      if (!preparedUpdate.current.text.isEditing && !preparedUpdate.withoutSelection) {
        this.runtime.editor.canvas.setActiveObject(group)
      }

      this.runtime.lifecycleController.fireBefore({ lifecycle: preparedUpdate.lifecycle })
      this.runtime.editor.canvas.requestRenderAll()
    } finally {
      this.runtime.endMutation({ withoutSave: preparedUpdate.withoutSave })
    }

    this.runtime.lifecycleController.fireUpdated({ lifecycle: preparedUpdate.lifecycle })

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

    this.runtime.beginMutation()

    try {
      this.runtime.editor.canvas.remove(group)
      this.runtime.editor.canvas.requestRenderAll()
    } finally {
      this.runtime.endMutation({ withoutSave })
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
    const group = this._resolveUnlockedGroup({ target })

    if (!group) return null

    const { shape } = getShapeNodes({ group })

    if (!shape) return null

    const lifecycle = this.runtime.lifecycleController.createContext({
      group,
      source: 'fill',
      target,
      withoutSave
    })

    this.runtime.beginMutation()

    try {
      applyShapeStyle({
        shape,
        style: { fill }
      })

      group.shapeFill = fill
      group.setCoords()
      this.runtime.lifecycleController.fireBefore({ lifecycle })
      this.runtime.editor.canvas.requestRenderAll()
    } finally {
      this.runtime.endMutation({ withoutSave })
    }

    this.runtime.lifecycleController.fireUpdated({ lifecycle })

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
    const group = this._resolveUnlockedGroup({ target })

    if (!group) return null

    const { shape, text } = getShapeNodes({ group })

    if (!shape) return null

    const lifecycle = this.runtime.lifecycleController.createContext({
      group,
      source: 'stroke',
      target,
      withoutSave
    })

    this.runtime.beginMutation()

    try {
      this._applyStrokeAndTextLayout({
        group,
        shape,
        text,
        stroke,
        strokeWidth,
        dash
      })

      group.setCoords()
      this.runtime.lifecycleController.fireBefore({ lifecycle })
      this.runtime.editor.canvas.requestRenderAll()
    } finally {
      this.runtime.endMutation({ withoutSave })
    }

    this.runtime.lifecycleController.fireUpdated({ lifecycle })

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
    const group = this._resolveUnlockedGroup({ target })

    if (!group) return null

    const { shape, text } = getShapeNodes({ group })

    if (!shape) return null

    const lifecycle = this.runtime.lifecycleController.createContext({
      group,
      source: 'opacity',
      target,
      withoutSave
    })

    this.runtime.beginMutation()

    try {
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
      this.runtime.lifecycleController.fireBefore({ lifecycle })
      this.runtime.editor.canvas.requestRenderAll()
    } finally {
      this.runtime.endMutation({ withoutSave })
    }

    this.runtime.lifecycleController.fireUpdated({ lifecycle })

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
    const group = this._resolveUnlockedGroup({ target })

    if (!group) return null

    const { shape, text } = getShapeNodes({ group })
    const hasStyleUpdates = Object.keys(style).length > 0

    if (!shape || !text) return null
    if (!hasStyleUpdates) return group

    const manualDimensions = this.runtime.resolveManualDimensions({ group })
    const placement = this.runtime.editor.canvasManager.getObjectPlacement({ object: group })
    const alignH = this.runtime.resolveShapeTextHorizontalAlign({
      group,
      textStyle: style
    })
    const lifecycle = this.runtime.lifecycleController.createContext({
      group,
      source: 'text-style',
      target,
      withoutSave
    })

    this.runtime.beginMutation()

    try {
      this._applyTextStyleAndLayout({
        group,
        shape,
        text,
        placement,
        style,
        height: manualDimensions.height,
        alignH
      })

      this.runtime.lifecycleController.fireBefore({ lifecycle })
      this.runtime.editor.canvas.requestRenderAll()
    } finally {
      this.runtime.endMutation({ withoutSave })
    }

    this.runtime.lifecycleController.fireUpdated({ lifecycle })

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
    const group = this._resolveUnlockedGroup({ target })

    if (!group) return null

    const { shape, text } = getShapeNodes({ group })

    if (!shape || !text) return null

    const dimensions = this.runtime.resolveCurrentDimensions({ group })
    const alignH = horizontal
      ?? group.shapeAlignHorizontal
      ?? SHAPE_DEFAULT_HORIZONTAL_ALIGN
    const alignV = vertical
      ?? group.shapeAlignVertical
      ?? SHAPE_DEFAULT_VERTICAL_ALIGN
    const lifecycle = this.runtime.lifecycleController.createContext({
      group,
      source: 'text-align',
      target,
      withoutSave
    })

    this.runtime.beginMutation()

    try {
      this._applyTextAlignAndLayout({
        group,
        shape,
        text,
        width: dimensions.width,
        height: dimensions.height,
        alignH,
        alignV
      })

      this.runtime.lifecycleController.fireBefore({ lifecycle })
      this.runtime.editor.canvas.requestRenderAll()
    } finally {
      this.runtime.endMutation({ withoutSave })
    }

    this.runtime.lifecycleController.fireUpdated({ lifecycle })

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
   * Материализует rehydrated shape-группу обратно в канонический layout-контракт.
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
    const group = this.runtime.resolveShapeGroup({ target })

    if (!group) return false

    const { shape, text } = getShapeNodes({ group })

    if (!shape || !text) return false

    const placement = this.runtime.editor.canvasManager.getObjectPlacement({ object: group })
    const {
      currentDimensions,
      manualDimensions,
      replaceBoxDimensions
    } = resolveRehydratedShapeDimensions({ group })

    applyRehydratedShapeTextScale({
      group,
      text,
      textScale
    })

    this.runtime.detachShapeGroupAutoLayout({ group })

    if (shapeTextAutoExpand !== undefined) {
      group.shapeTextAutoExpand = shapeTextAutoExpand
    }

    group.shapeManualBaseWidth = manualDimensions.width
    group.shapeManualBaseHeight = manualDimensions.height

    this.runtime.applyCurrentLayout({
      group,
      shape,
      text,
      placement,
      height: currentDimensions.height,
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
    const group = this.runtime.resolveShapeGroup({ target })

    if (!group || group.locked) return null

    return group
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

    const currentDimensions = this.runtime.resolveCurrentDimensions({ group })

    this.runtime.applyCurrentLayout({
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
    this.runtime.applyTextUpdates({
      textNode: text,
      textStyle: style,
      align: alignH
    })

    this.runtime.applyCurrentLayout({
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
    this.runtime.applyTextUpdates({
      textNode: text,
      align: alignH
    })

    this.runtime.applyCurrentLayout({
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

    this.runtime.detachShapeGroupAutoLayout({ group: current.group })
    current.text.set(SHAPE_TEXT_LAYOUT_RESET_STATE)
    this.runtime.applyTextUpdates({
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

    this.runtime.applyShapeGroupMetadata({
      group: current.group,
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

    this.runtime.applyCurrentLayout({
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
      this.runtime.editingPlacements.set(current.group, placement)
    }
  }
}
