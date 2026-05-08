import {
  DEFAULT_SHAPE_PRESET_KEY,
  SHAPE_DEFAULT_HORIZONTAL_ALIGN,
  SHAPE_DEFAULT_VERTICAL_ALIGN,
  getShapePreset,
  isShapePresetRoundable,
  resolvePresetKeyForRounding,
  resolveInternalShapeTextInset as resolvePresetInternalShapeTextInset
} from './shape-presets'
import {
  applyShapeStyle,
  createShapeNode
} from './shape-factory'
import { normalizeShapeRounding } from './shape-rounding'
import {
  getShapePaddingChangeMap,
  mergeShapePadding,
  resolveShapeTextContentInset,
  sumShapePadding
} from './layout/shape-padding'
import {
  applyScaledTextboxVisualState,
  captureTextScaleBase
} from '../text-manager/scaling/text-scaling-materialization'
import {
  getShapeNodes
} from './shape-utils'
import { ShapeGroupObject } from './shape-group'
import type { ObjectPlacement } from '../canvas-manager'
import type ShapeLifecycleController from './shape-lifecycle'
import type { TextStyleOptions } from '../text-manager'
import type {
  ShapeGroup,
  ShapeGroupLike,
  ShapeHorizontalAlign,
  ShapeNode,
  ShapePadding,
  ShapePaddingChangeMap,
  ShapeReference,
  ShapeStrokeOptions,
  ShapeTextAlignOptions,
  ShapeTextNode,
  ShapeTextStyleOptions,
  ShapeUpdateLifecycleContext,
  ShapeUpdateOptions,
  ShapeVerticalAlign,
  ShapeVisualStyle
} from './types'
import type { ImageEditor } from '../index'

/**
 * Пара визуальных размеров shape-группы в текущем mutation/layout контракте.
 */
type ShapeGroupDimensions = {
  width: number
  height: number
}

/**
 * Функция, которая возвращает внутренний text inset для заданных размеров фигуры.
 */
type ShapeInsetResolver = ({
  width,
  height
}: {
  width: number
  height: number
}) => ShapePadding

/**
 * Runtime-зависимости mutation controller без прямого владения ShapeManager internals.
 */
type ShapeMutationRuntime = {
  editor: ImageEditor
  lifecycleController: ShapeLifecycleController
  editingPlacements: WeakMap<ShapeGroup, ObjectPlacement>
  resolveShapeGroup: ({ target }: { target?: ShapeReference }) => ShapeGroup | null
  resolveCurrentDimensions: ({ group }: { group: ShapeGroupLike }) => ShapeGroupDimensions
  resolveManualDimensions: ({ group }: { group: ShapeGroupLike }) => ShapeGroupDimensions
  resolveReplaceBoxDimensions: ({ group }: { group: ShapeGroupLike }) => ShapeGroupDimensions
  resolveGroupUserPadding: ({ group }: { group: ShapeGroupLike }) => ShapePadding
  isShapeTextAutoExpandEnabled: ({ group }: { group: ShapeGroupLike }) => boolean
  resolveShapeStyle: ({
    options,
    fallback
  }: {
    options: Pick<
      ShapeUpdateOptions,
      'fill' | 'stroke' | 'strokeWidth' | 'strokeDashArray' | 'opacity'
    >
    fallback: ShapeGroupLike | null
  }) => ShapeVisualStyle
  resolveCurrentTextStyle: ({ textNode }: { textNode: ShapeTextNode }) => TextStyleOptions
  createTextNode: ({
    text,
    textStyle,
    width,
    align
  }: {
    text?: string
    textStyle?: ShapeTextStyleOptions
    width: number
    align: ShapeHorizontalAlign
  }) => ShapeTextNode
  applyTextUpdates: ({
    textNode,
    text,
    textStyle,
    align,
    syncLineStylesWithText
  }: {
    textNode: ShapeTextNode
    text?: string
    textStyle?: ShapeTextStyleOptions
    align?: ShapeHorizontalAlign
    syncLineStylesWithText?: boolean
  }) => void
  hasShapeTextSizeAffectingStyleChanges: ({ textStyle }: { textStyle?: ShapeTextStyleOptions }) => boolean
  resolveShapeLayoutWidth: ({
    text,
    currentWidth,
    manualWidth,
    shapeTextAutoExpandEnabled,
    padding,
    resolvePaddingForWidth
  }: {
    text: ShapeTextNode
    currentWidth: number
    manualWidth: number
    shapeTextAutoExpandEnabled: boolean
    padding: ShapePadding
    resolvePaddingForWidth?: ({ width }: { width: number }) => ShapePadding
  }) => number
  applyShapeGroupMetadata: (params: {
    group: ShapeGroupLike
    presetKey: string
    presetCanRound: boolean
    width: number
    height: number
    manualWidth: number
    manualHeight: number
    replaceBoxWidth: number
    replaceBoxHeight: number
    shapeTextAutoExpand: boolean
    alignH: ShapeHorizontalAlign
    alignV: ShapeVerticalAlign
    padding: ShapePadding
    style: ShapeVisualStyle
    rounding: number
  }) => void
  applyCurrentLayout: (params: {
    group: ShapeGroupLike
    shape: ShapeNode
    text: ShapeTextNode
    width?: number
    height: number
    placement?: ObjectPlacement
    alignH?: ShapeHorizontalAlign
    alignV?: ShapeVerticalAlign
    internalShapeTextInset?: ShapePadding
    resolveInternalShapeTextInset?: ShapeInsetResolver
    preserveAspectRatio?: boolean
    expandShapeHeightToFitText?: boolean
    changedPadding?: ShapePaddingChangeMap
  }) => void
  resolveShapeTextHorizontalAlign: ({
    group,
    textStyle
  }: {
    group: ShapeGroupLike
    textStyle?: ShapeTextStyleOptions
  }) => ShapeHorizontalAlign
  detachShapeGroupAutoLayout: ({ group }: { group: ShapeGroupLike }) => void
  resolveAspectRatioFittedDimensions: ({
    targetWidth,
    targetHeight,
    aspectWidth,
    aspectHeight
  }: {
    targetWidth?: number
    targetHeight?: number
    aspectWidth: number
    aspectHeight: number
  }) => ShapeGroupDimensions
  beginMutation: () => void
  endMutation: ({ withoutSave }: { withoutSave?: boolean }) => void
  isOnCanvas: ({ object }: { object: ShapeGroup }) => boolean
}

/**
 * Полное подготовленное состояние update path перед фактической мутацией группы.
 */
type PreparedShapeUpdate = {
  currentGroup: ShapeGroup
  currentTextNode: ShapeTextNode
  currentShapeNode: ShapeNode
  currentShapeIndex: number
  shape: ShapeNode
  placement: ObjectPlacement
  lifecycle: ShapeUpdateLifecycleContext
  withoutSelection?: boolean
  withoutSave?: boolean
  text?: string
  textStyle?: ShapeTextStyleOptions
  syncLineStylesWithText: boolean
  horizontalAlign: ShapeHorizontalAlign
  verticalAlign: ShapeVerticalAlign
  nextShapeTextAutoExpand: boolean
  nextUserPadding: ShapePadding
  nextReplaceBoxWidth: number
  nextReplaceBoxHeight: number
  resolvedLayoutWidth: number
  resolvedLayoutHeight: number
  manualWidth: number
  manualHeight: number
  effectivePresetKey: string
  presetCanRound: boolean
  effectiveRounding: number
  style: ShapeVisualStyle
  resolvedInternalShapeTextInset: ShapePadding
  resolveInternalShapeTextInset: ShapeInsetResolver
  shouldFitReplacementToPreset: boolean
  shouldPreventPaddingResize: boolean
  changedPadding: ShapePaddingChangeMap
}

/**
 * Итог пресета и rounding после нормализации текущего update запроса.
 */
type ResolvedUpdatePreset = {
  effectivePreset: NonNullable<ReturnType<typeof getShapePreset>>
  effectivePresetKey: string
  presetCanRound: boolean
  effectiveRounding: number
  presetWidth: number
  presetHeight: number
}

/**
 * Style- и padding-состояние, которое потом участвует в layout расчётах.
 */
type ResolvedUpdateStyle = {
  horizontalAlign: ShapeHorizontalAlign
  verticalAlign: ShapeVerticalAlign
  nextUserPadding: ShapePadding
  changedPadding: ShapePaddingChangeMap
  style: ShapeVisualStyle
  resolveInternalShapeTextInset: ShapeInsetResolver
  basePadding: ShapePadding
}

/**
 * Размерное состояние update path до materialization нового shape-узла.
 */
type ResolvedUpdateDimensions = {
  nextWidth: number
  nextHeight: number
  manualWidth: number
  manualHeight: number
  nextReplaceBoxDimensions: ShapeGroupDimensions | null
  nextShapeTextAutoExpand: boolean
  shouldFitReplacementToPreset: boolean
}

/**
 * Каноническое reset-состояние text node перед staged measurement и перед apply update.
 */
const SHAPE_TEXT_LAYOUT_RESET_STATE = {
  angle: 0,
  skewX: 0,
  skewY: 0,
  flipX: false,
  flipY: false,
  scaleX: 1,
  scaleY: 1,
  autoExpand: false,
  left: 0,
  top: 0,
  originX: 'left',
  originY: 'top'
} as const

/**
 * Владеет mutating API shape-группы и общим prepare/apply pipeline для update path.
 */
export default class ShapeMutationController {
  /**
   * Runtime-зависимости mutation path, вынесенные из ShapeManager facade.
   */
  private readonly runtime: ShapeMutationRuntime

  /**
   * Инициализирует mutation controller готовым runtime-контрактом ShapeManager.
   */
  constructor({ runtime }: { runtime: ShapeMutationRuntime }) {
    this.runtime = runtime
  }

  /**
   * Обновляет shape-группу через единый pipeline подготовки и применения изменений.
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
    const preparedUpdate = await this._prepareUpdate({
      target,
      presetKey,
      options
    })

    if (!preparedUpdate) return null

    const { currentGroup } = preparedUpdate
    const wasOnCanvas = this.runtime.isOnCanvas({ object: currentGroup })

    if (!wasOnCanvas) {
      this._applyPreparedUpdate({ preparedUpdate })
      this.runtime.lifecycleController.fireBefore({ lifecycle: preparedUpdate.lifecycle })
      this.runtime.lifecycleController.fireUpdated({ lifecycle: preparedUpdate.lifecycle })

      return currentGroup
    }

    this.runtime.beginMutation()

    try {
      this._applyPreparedUpdate({ preparedUpdate })

      if (!preparedUpdate.currentTextNode.isEditing && !preparedUpdate.withoutSelection) {
        this.runtime.editor.canvas.setActiveObject(currentGroup)
      }

      this.runtime.lifecycleController.fireBefore({ lifecycle: preparedUpdate.lifecycle })
      this.runtime.editor.canvas.requestRenderAll()
    } finally {
      this.runtime.endMutation({ withoutSave: preparedUpdate.withoutSave })
    }

    this.runtime.lifecycleController.fireUpdated({ lifecycle: preparedUpdate.lifecycle })

    return currentGroup
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

      if (text) {
        const currentDimensions = this.runtime.resolveCurrentDimensions({ group })

        this.runtime.applyCurrentLayout({
          group,
          shape,
          text,
          width: currentDimensions.width,
          height: currentDimensions.height
        })
      }

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
      this.runtime.applyTextUpdates({
        textNode: text,
        align: alignH
      })

      this.runtime.applyCurrentLayout({
        group,
        shape,
        text,
        height: dimensions.height,
        width: dimensions.width,
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
   * Нормализует rounding и делегирует изменение в общий update path.
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
    } = this._resolveRehydratedDimensions({ group })

    this._applyRehydratedTextScale({
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
   * Пересчитывает base/manual/replace-box размеры после восстановления группы из внешнего path.
   */
  private _resolveRehydratedDimensions({ group }: { group: ShapeGroup }): {
    currentDimensions: ShapeGroupDimensions
    manualDimensions: ShapeGroupDimensions
    replaceBoxDimensions: ShapeGroupDimensions
  } {
    const scaleX = Math.abs(group.scaleX ?? 1) || 1
    const scaleY = Math.abs(group.scaleY ?? 1) || 1
    const baseWidth = Math.max(1, group.shapeBaseWidth ?? group.width ?? 1)
    const baseHeight = Math.max(1, group.shapeBaseHeight ?? group.height ?? 1)

    return {
      currentDimensions: {
        width: Math.max(1, baseWidth * scaleX),
        height: Math.max(1, baseHeight * scaleY)
      },
      manualDimensions: {
        width: Math.max(1, (group.shapeManualBaseWidth ?? baseWidth) * scaleX),
        height: Math.max(1, (group.shapeManualBaseHeight ?? baseHeight) * scaleY)
      },
      replaceBoxDimensions: {
        width: Math.max(1, (group.shapeReplaceBoxWidth ?? baseWidth) * scaleX),
        height: Math.max(1, (group.shapeReplaceBoxHeight ?? baseHeight) * scaleY)
      }
    }
  }

  /**
   * Запекает scene text scale обратно в визуальное состояние текста и пользовательский padding.
   */
  private _applyRehydratedTextScale({
    group,
    text,
    textScale
  }: {
    group: ShapeGroup
    text: ShapeTextNode
    textScale: number
  }): void {
    const resolvedTextScale = Number.isFinite(textScale) && textScale > 0
      ? textScale
      : 1

    if (Math.abs(resolvedTextScale - 1) <= 0.0001) {
      return
    }

    applyScaledTextboxVisualState({
      textbox: text,
      base: captureTextScaleBase({ textbox: text }),
      scale: resolvedTextScale
    })

    group.shapePaddingTop = Math.max(0, (group.shapePaddingTop ?? 0) * resolvedTextScale)
    group.shapePaddingRight = Math.max(0, (group.shapePaddingRight ?? 0) * resolvedTextScale)
    group.shapePaddingBottom = Math.max(0, (group.shapePaddingBottom ?? 0) * resolvedTextScale)
    group.shapePaddingLeft = Math.max(0, (group.shapePaddingLeft ?? 0) * resolvedTextScale)
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
   * Собирает все промежуточные состояния update до создания нового shape-узла.
   */
  private async _prepareUpdate({
    target,
    presetKey,
    options
  }: {
    target?: ShapeReference
    presetKey?: string
    options: ShapeUpdateOptions
  }): Promise<PreparedShapeUpdate | null> {
    const currentGroup = this._resolveUnlockedGroup({ target })

    if (!currentGroup) return null

    const currentPresetKey = currentGroup.shapePresetKey ?? DEFAULT_SHAPE_PRESET_KEY
    const requestedPresetKey = presetKey ?? currentPresetKey
    const basePreset = getShapePreset({ presetKey: requestedPresetKey })

    if (!basePreset) return null

    const placement = this.runtime.editor.canvasManager.resolveObjectPlacement({
      object: currentGroup,
      left: options.left,
      top: options.top,
      originX: options.originX,
      originY: options.originY
    })
    const currentDimensions = this.runtime.resolveCurrentDimensions({ group: currentGroup })
    const currentManualDimensions = this.runtime.resolveManualDimensions({ group: currentGroup })
    const currentReplaceBoxDimensions = this.runtime.resolveReplaceBoxDimensions({ group: currentGroup })
    const presetState = this._resolvePresetState({
      currentGroup,
      basePreset,
      options
    })
    const dimensionState = this._resolveDimensionState({
      currentGroup,
      currentDimensions,
      currentManualDimensions,
      currentReplaceBoxDimensions,
      currentPresetKey,
      requestedPresetKey,
      presetState,
      presetKey,
      options
    })
    const styleState = this._resolveStyleState({
      currentGroup,
      nextWidth: dimensionState.nextWidth,
      nextHeight: dimensionState.nextHeight,
      options,
      presetState
    })

    return this._createPreparedUpdate({
      currentGroup,
      target,
      options,
      placement,
      currentDimensions,
      currentReplaceBoxDimensions,
      presetState,
      styleState,
      dimensionState
    })
  }

  /**
   * Разрешает итоговый пресет и rounding для текущего update запроса.
   */
  private _resolvePresetState({
    currentGroup,
    basePreset,
    options
  }: {
    currentGroup: ShapeGroup
    basePreset: NonNullable<ReturnType<typeof getShapePreset>>
    options: ShapeUpdateOptions
  }): ResolvedUpdatePreset {
    const requestedRounding = options.rounding !== undefined
      ? normalizeShapeRounding({ rounding: options.rounding })
      : normalizeShapeRounding({
        rounding: currentGroup.shapeRounding
      })
    const effectivePresetKey = resolvePresetKeyForRounding({
      preset: basePreset,
      rounding: requestedRounding
    })
    const effectivePreset = getShapePreset({ presetKey: effectivePresetKey }) ?? basePreset
    const presetCanRound = isShapePresetRoundable({ preset: effectivePreset })

    return {
      effectivePreset,
      effectivePresetKey: effectivePreset.key,
      presetCanRound,
      effectiveRounding: presetCanRound ? requestedRounding : 0,
      presetWidth: effectivePreset.width,
      presetHeight: effectivePreset.height
    }
  }

  /**
   * Разрешает current/manual/replace-box размеры для текущего update контракта.
   */
  private _resolveDimensionState({
    currentGroup,
    currentDimensions,
    currentManualDimensions,
    currentReplaceBoxDimensions,
    currentPresetKey,
    requestedPresetKey,
    presetState,
    presetKey,
    options
  }: {
    currentGroup: ShapeGroup
    currentDimensions: ShapeGroupDimensions
    currentManualDimensions: ShapeGroupDimensions
    currentReplaceBoxDimensions: ShapeGroupDimensions
    currentPresetKey: string
    requestedPresetKey: string
    presetState: ResolvedUpdatePreset
    presetKey?: string
    options: ShapeUpdateOptions
  }): ResolvedUpdateDimensions {
    const currentShapeTextAutoExpand = this.runtime.isShapeTextAutoExpandEnabled({ group: currentGroup })
    const nextShapeTextAutoExpand = options.shapeTextAutoExpand !== undefined
      ? options.shapeTextAutoExpand !== false
      : currentShapeTextAutoExpand
    const shouldPreserveCurrentAspectRatio = Boolean(options.preserveCurrentAspectRatio)
    const isPresetReplace = presetKey !== undefined && requestedPresetKey !== currentPresetKey
    const shouldFitReplacementToPreset = isPresetReplace && !shouldPreserveCurrentAspectRatio
    const nextReplaceBoxDimensions = shouldFitReplacementToPreset
      ? {
        width: Math.max(1, options.width ?? currentReplaceBoxDimensions.width),
        height: Math.max(1, options.height ?? currentReplaceBoxDimensions.height)
      }
      : null
    const nextCurrentDimensions = nextReplaceBoxDimensions
      ? this.runtime.resolveAspectRatioFittedDimensions({
        targetWidth: nextReplaceBoxDimensions.width,
        targetHeight: nextReplaceBoxDimensions.height,
        aspectWidth: presetState.presetWidth,
        aspectHeight: presetState.presetHeight
      })
      : {
        width: Math.max(1, options.width ?? currentDimensions.width),
        height: Math.max(1, options.height ?? currentDimensions.height)
      }
    let manualWidth = isPresetReplace
      ? nextCurrentDimensions.width
      : currentManualDimensions.width
    let manualHeight = isPresetReplace
      ? nextCurrentDimensions.height
      : currentManualDimensions.height

    if (!isPresetReplace && options.width !== undefined) {
      manualWidth = Math.max(1, options.width)
    }

    if (!isPresetReplace && options.height !== undefined) {
      manualHeight = Math.max(1, options.height)
    }

    if (!isPresetReplace && options.width === undefined && currentShapeTextAutoExpand && !nextShapeTextAutoExpand) {
      manualWidth = currentDimensions.width
    }

    return {
      nextWidth: nextCurrentDimensions.width,
      nextHeight: nextCurrentDimensions.height,
      manualWidth,
      manualHeight,
      nextReplaceBoxDimensions,
      nextShapeTextAutoExpand,
      shouldFitReplacementToPreset
    }
  }

  /**
   * Собирает style, padding и inset resolver, которые нужны на layout шаге.
   */
  private _resolveStyleState({
    currentGroup,
    nextWidth,
    nextHeight,
    options,
    presetState
  }: {
    currentGroup: ShapeGroup
    nextWidth: number
    nextHeight: number
    options: ShapeUpdateOptions
    presetState: ResolvedUpdatePreset
  }): ResolvedUpdateStyle {
    const horizontalAlign = options.alignH
      ?? currentGroup.shapeAlignHorizontal
      ?? SHAPE_DEFAULT_HORIZONTAL_ALIGN
    const verticalAlign = options.alignV
      ?? currentGroup.shapeAlignVertical
      ?? SHAPE_DEFAULT_VERTICAL_ALIGN
    const nextUserPadding = mergeShapePadding({
      base: this.runtime.resolveGroupUserPadding({ group: currentGroup }),
      override: options.textPadding
    })
    const changedPadding = getShapePaddingChangeMap({
      padding: options.textPadding
    })
    const style = this.runtime.resolveShapeStyle({
      options,
      fallback: currentGroup
    })
    const resolveInternalShapeTextInset: ShapeInsetResolver = ({ width, height }) => {
      return resolveShapeTextContentInset({
        baseInset: resolvePresetInternalShapeTextInset({
          preset: presetState.effectivePreset,
          width,
          height
        }),
        stroke: style.stroke,
        strokeWidth: style.strokeWidth
      })
    }
    const basePadding = sumShapePadding({
      base: resolveInternalShapeTextInset({
        width: nextWidth,
        height: nextHeight
      }),
      addition: nextUserPadding
    })

    return {
      horizontalAlign,
      verticalAlign,
      nextUserPadding,
      changedPadding,
      style,
      resolveInternalShapeTextInset,
      basePadding
    }
  }

  /**
   * Создаёт подготовленное обновление с уже измеренным staged text и новым shape-узлом.
   */
  private async _createPreparedUpdate({
    currentGroup,
    target,
    options,
    placement,
    currentDimensions,
    currentReplaceBoxDimensions,
    presetState,
    styleState,
    dimensionState
  }: {
    currentGroup: ShapeGroup
    target?: ShapeReference
    options: ShapeUpdateOptions
    placement: ObjectPlacement
    currentDimensions: ShapeGroupDimensions
    currentReplaceBoxDimensions: ShapeGroupDimensions
    presetState: ResolvedUpdatePreset
    styleState: ResolvedUpdateStyle
    dimensionState: ResolvedUpdateDimensions
  }): Promise<PreparedShapeUpdate | null> {
    const preparedNodes = this._resolvePreparedCurrentNodes({
      currentGroup
    })

    if (!preparedNodes) return null

    const {
      currentShapeNode,
      currentTextNode,
      currentShapeIndex
    } = preparedNodes
    const {
      resolvedLayout
    } = this._resolvePreparedLayoutState({
      currentTextNode,
      currentDimensions,
      options,
      styleState,
      dimensionState
    })
    const shape = await createShapeNode({
      preset: presetState.effectivePreset,
      width: resolvedLayout.width,
      height: resolvedLayout.height,
      style: styleState.style,
      rounding: presetState.effectiveRounding
    })
    const nextReplaceBoxDimensions = this._resolvePreparedReplaceBoxDimensions({
      currentReplaceBoxDimensions,
      dimensionState,
      options
    })

    return {
      currentGroup,
      currentTextNode,
      currentShapeNode,
      currentShapeIndex,
      shape,
      placement,
      lifecycle: this.runtime.lifecycleController.createContext({
        group: currentGroup,
        source: 'update',
        target,
        presetKey: presetState.effectivePresetKey,
        options,
        withoutSave: options.withoutSave
      }),
      withoutSelection: options.withoutSelection,
      withoutSave: options.withoutSave,
      text: options.text,
      textStyle: options.textStyle,
      syncLineStylesWithText: options.syncLineStylesWithText !== false,
      horizontalAlign: styleState.horizontalAlign,
      verticalAlign: styleState.verticalAlign,
      nextShapeTextAutoExpand: dimensionState.nextShapeTextAutoExpand,
      nextUserPadding: styleState.nextUserPadding,
      nextReplaceBoxWidth: nextReplaceBoxDimensions.width,
      nextReplaceBoxHeight: nextReplaceBoxDimensions.height,
      resolvedLayoutWidth: resolvedLayout.width,
      resolvedLayoutHeight: resolvedLayout.height,
      manualWidth: dimensionState.manualWidth,
      manualHeight: dimensionState.manualHeight,
      effectivePresetKey: presetState.effectivePresetKey,
      presetCanRound: presetState.presetCanRound,
      effectiveRounding: presetState.effectiveRounding,
      style: styleState.style,
      resolvedInternalShapeTextInset: styleState.resolveInternalShapeTextInset({
        width: resolvedLayout.width,
        height: resolvedLayout.height
      }),
      resolveInternalShapeTextInset: styleState.resolveInternalShapeTextInset,
      shouldFitReplacementToPreset: dimensionState.shouldFitReplacementToPreset,
      shouldPreventPaddingResize: options.textPadding !== undefined && resolvedLayout.shouldPreserveCurrentWidth,
      changedPadding: styleState.changedPadding
    }
  }

  /**
   * Возвращает текущие shape/text узлы и индекс shape-узла внутри группы.
   */
  private _resolvePreparedCurrentNodes({ currentGroup }: { currentGroup: ShapeGroup }): {
    currentShapeNode: ShapeNode
    currentTextNode: ShapeTextNode
    currentShapeIndex: number
  } | null {
    const { shape: currentShapeNode, text: currentTextNode } = getShapeNodes({
      group: currentGroup
    })

    if (!currentShapeNode || !currentTextNode) return null

    const currentShapeIndex = currentGroup.getObjects().indexOf(currentShapeNode)

    if (currentShapeIndex < 0) return null

    return {
      currentShapeNode,
      currentTextNode,
      currentShapeIndex
    }
  }

  /**
   * Готовит staged text node и финальные layout размеры до materialization нового shape-узла.
   */
  private _resolvePreparedLayoutState({
    currentTextNode,
    currentDimensions,
    options,
    styleState,
    dimensionState
  }: {
    currentTextNode: ShapeTextNode
    currentDimensions: ShapeGroupDimensions
    options: ShapeUpdateOptions
    styleState: ResolvedUpdateStyle
    dimensionState: ResolvedUpdateDimensions
  }): {
    stagedTextNode: ShapeTextNode
    resolvedLayout: {
      width: number
      height: number
      shouldPreserveCurrentWidth: boolean
    }
  } {
    const stagedTextNode = this._createStagedTextNode({
      currentTextNode,
      currentWidth: currentDimensions.width,
      horizontalAlign: styleState.horizontalAlign,
      text: options.text,
      textStyle: options.textStyle,
      syncLineStylesWithText: options.syncLineStylesWithText
    })

    return {
      stagedTextNode,
      resolvedLayout: this._resolveLayoutDimensions({
        currentDimensions,
        options,
        stagedTextNode,
        styleState,
        dimensionState
      })
    }
  }

  /**
   * Разрешает финальный replace-box, который останется у группы после update.
   */
  private _resolvePreparedReplaceBoxDimensions({
    currentReplaceBoxDimensions,
    dimensionState,
    options
  }: {
    currentReplaceBoxDimensions: ShapeGroupDimensions
    dimensionState: ResolvedUpdateDimensions
    options: ShapeUpdateOptions
  }): ShapeGroupDimensions {
    return {
      width: dimensionState.nextReplaceBoxDimensions?.width
        ?? (options.width !== undefined ? Math.max(1, options.width) : currentReplaceBoxDimensions.width),
      height: dimensionState.nextReplaceBoxDimensions?.height
        ?? (options.height !== undefined ? Math.max(1, options.height) : currentReplaceBoxDimensions.height)
    }
  }

  /**
   * Строит временный text node для безопасного измерения layout до мутации текущей группы.
   */
  private _createStagedTextNode({
    currentTextNode,
    currentWidth,
    horizontalAlign,
    text,
    textStyle,
    syncLineStylesWithText
  }: {
    currentTextNode: ShapeTextNode
    currentWidth: number
    horizontalAlign: ShapeHorizontalAlign
    text?: string
    textStyle?: ShapeTextStyleOptions
    syncLineStylesWithText?: boolean
  }): ShapeTextNode {
    const currentTextNodeWithRawText = currentTextNode as ShapeTextNode & {
      textCaseRaw?: string
    }
    const stagedTextNode = this.runtime.createTextNode({
      text: currentTextNodeWithRawText.textCaseRaw ?? currentTextNode.text ?? '',
      textStyle: this.runtime.resolveCurrentTextStyle({
        textNode: currentTextNode
      }),
      width: Math.max(1, currentTextNode.width ?? currentWidth),
      align: horizontalAlign
    })

    stagedTextNode.set(SHAPE_TEXT_LAYOUT_RESET_STATE)
    this.runtime.applyTextUpdates({
      textNode: stagedTextNode,
      text,
      textStyle,
      align: horizontalAlign,
      syncLineStylesWithText
    })

    return stagedTextNode
  }

  /**
   * Определяет финальные width/height, которые будут материализованы в новый shape-узел.
   */
  private _resolveLayoutDimensions({
    currentDimensions,
    options,
    stagedTextNode,
    styleState,
    dimensionState
  }: {
    currentDimensions: ShapeGroupDimensions
    options: ShapeUpdateOptions
    stagedTextNode: ShapeTextNode
    styleState: ResolvedUpdateStyle
    dimensionState: ResolvedUpdateDimensions
  }): {
    width: number
    height: number
    shouldPreserveCurrentWidth: boolean
  } {
    const shouldPreserveCurrentWidth = options.width === undefined
      && options.height === undefined
      && !dimensionState.shouldFitReplacementToPreset
      && options.shapeTextAutoExpand === undefined
      && options.rounding === undefined
      && options.text === undefined
      && !this.runtime.hasShapeTextSizeAffectingStyleChanges({
        textStyle: options.textStyle
      })

    if (shouldPreserveCurrentWidth) {
      return {
        width: currentDimensions.width,
        height: currentDimensions.height,
        shouldPreserveCurrentWidth
      }
    }

    if (dimensionState.shouldFitReplacementToPreset) {
      return {
        width: dimensionState.nextWidth,
        height: dimensionState.nextHeight,
        shouldPreserveCurrentWidth
      }
    }

    return {
      width: this.runtime.resolveShapeLayoutWidth({
        text: stagedTextNode,
        currentWidth: dimensionState.nextWidth,
        manualWidth: dimensionState.manualWidth,
        shapeTextAutoExpandEnabled: dimensionState.nextShapeTextAutoExpand,
        padding: styleState.basePadding,
        resolvePaddingForWidth: ({ width }) => sumShapePadding({
          base: styleState.resolveInternalShapeTextInset({
            width,
            height: dimensionState.nextHeight
          }),
          addition: styleState.nextUserPadding
        })
      }),
      height: dimensionState.nextHeight,
      shouldPreserveCurrentWidth
    }
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
      currentGroup,
      currentTextNode,
      text,
      textStyle,
      horizontalAlign,
      syncLineStylesWithText
    } = preparedUpdate

    this.runtime.detachShapeGroupAutoLayout({ group: currentGroup })
    currentTextNode.set(SHAPE_TEXT_LAYOUT_RESET_STATE)
    this.runtime.applyTextUpdates({
      textNode: currentTextNode,
      text,
      textStyle,
      align: horizontalAlign,
      syncLineStylesWithText
    })
  }

  /**
   * Подменяет shape-узел внутри текущей группы на уже материализованный next shape.
   */
  private _replacePreparedShapeNode({ preparedUpdate }: { preparedUpdate: PreparedShapeUpdate }): void {
    const {
      currentGroup,
      currentShapeIndex,
      currentShapeNode,
      shape
    } = preparedUpdate

    const groupRef = currentGroup as ShapeGroupObject

    groupRef.replaceShapeNode(
      currentShapeIndex,
      currentShapeNode,
      shape
    )
  }

  /**
   * Применяет persisted metadata группы после замены shape-узла.
   */
  private _applyPreparedMetadata({ preparedUpdate }: { preparedUpdate: PreparedShapeUpdate }): void {
    const {
      currentGroup,
      horizontalAlign,
      verticalAlign,
      nextShapeTextAutoExpand,
      nextUserPadding,
      nextReplaceBoxWidth,
      nextReplaceBoxHeight,
      resolvedLayoutWidth,
      resolvedLayoutHeight,
      manualWidth,
      manualHeight,
      effectivePresetKey,
      presetCanRound,
      effectiveRounding,
      style
    } = preparedUpdate

    this.runtime.applyShapeGroupMetadata({
      group: currentGroup,
      presetKey: effectivePresetKey,
      presetCanRound,
      width: resolvedLayoutWidth,
      height: resolvedLayoutHeight,
      manualWidth,
      manualHeight,
      replaceBoxWidth: nextReplaceBoxWidth,
      replaceBoxHeight: nextReplaceBoxHeight,
      shapeTextAutoExpand: nextShapeTextAutoExpand,
      alignH: horizontalAlign,
      alignV: verticalAlign,
      padding: nextUserPadding,
      style,
      rounding: effectiveRounding
    })
  }

  /**
   * Применяет финальный layout уже к обновлённой группе с новым shape-узлом.
   */
  private _applyPreparedLayout({ preparedUpdate }: { preparedUpdate: PreparedShapeUpdate }): void {
    const {
      currentGroup,
      currentTextNode,
      shape,
      placement,
      horizontalAlign,
      verticalAlign,
      resolvedLayoutWidth,
      resolvedLayoutHeight,
      resolvedInternalShapeTextInset,
      resolveInternalShapeTextInset,
      shouldFitReplacementToPreset,
      shouldPreventPaddingResize,
      changedPadding
    } = preparedUpdate

    this.runtime.applyCurrentLayout({
      group: currentGroup,
      shape,
      text: currentTextNode,
      placement,
      width: resolvedLayoutWidth,
      height: resolvedLayoutHeight,
      alignH: horizontalAlign,
      alignV: verticalAlign,
      internalShapeTextInset: resolvedInternalShapeTextInset,
      resolveInternalShapeTextInset,
      preserveAspectRatio: shouldFitReplacementToPreset,
      expandShapeHeightToFitText: !shouldPreventPaddingResize,
      changedPadding
    })
  }

  /**
   * Синхронизирует post-layout состояние manual base и editing placement.
   */
  private _syncPreparedPostLayoutState({ preparedUpdate }: { preparedUpdate: PreparedShapeUpdate }): void {
    const {
      currentGroup,
      currentTextNode,
      placement,
      resolvedLayoutWidth,
      resolvedLayoutHeight,
      shouldFitReplacementToPreset
    } = preparedUpdate

    if (shouldFitReplacementToPreset) {
      currentGroup.shapeManualBaseWidth = Math.max(1, currentGroup.shapeBaseWidth ?? resolvedLayoutWidth)
      currentGroup.shapeManualBaseHeight = Math.max(1, currentGroup.shapeBaseHeight ?? resolvedLayoutHeight)
    }

    if (currentTextNode.isEditing) {
      this.runtime.editingPlacements.set(currentGroup, placement)
    }
  }
}
