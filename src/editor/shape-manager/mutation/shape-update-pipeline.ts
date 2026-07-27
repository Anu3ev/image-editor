import type { Canvas } from 'fabric'
import {
  DEFAULT_SHAPE_PRESET_KEY,
  SHAPE_DEFAULT_HORIZONTAL_ALIGN,
  SHAPE_DEFAULT_VERTICAL_ALIGN,
  getShapePreset,
  isShapePresetRoundable,
  resolvePresetKeyForRounding,
  resolveInternalShapeTextInset as resolvePresetInternalShapeTextInset
} from '../domain/shape-presets'
import {
  createShapeNode
} from '../creation/shape-node-factory'
import { normalizeShapeRounding } from '../domain/shape-rounding'
import {
  getShapePaddingChangeMap,
  mergeShapePadding,
  resolveShapeTextContentInset,
  sumShapePadding
} from '../layout/shape-padding'
import {
  getShapeNodes
} from '../domain/shape-nodes'
import { resolveShapeGroup } from '../domain/shape-reference'
import { resolveShapeStyle } from '../domain/shape-style'
import type CanvasManager from '../../canvas-manager'
import type { ObjectPlacement } from '../../canvas-manager'
import type ShapeLayoutController from '../layout/shape-layout-controller'
import type ShapeLifecycleController from '../lifecycle/shape-lifecycle-controller'
import type ShapeTextNodeController from '../text/shape-text-node-controller'
import type {
  ShapeDimensions,
  ShapeGroup,
  ShapeHorizontalAlign,
  ShapeNode,
  ShapePadding,
  ShapePaddingChangeMap,
  ShapeReference,
  ShapeInsetResolver,
  ShapeTextNode,
  ShapeTextStyleOptions,
  ShapeUpdateLifecycleContext,
  ShapeUpdateOptions,
  ShapeVerticalAlign,
  ShapeVisualStyle
} from '../types'

/**
 * Конкретные зависимости prepare-этапа shape update.
 */
type ShapeUpdatePipelineDependencies = {
  canvas: Canvas
  canvasManager: CanvasManager
  lifecycleController: ShapeLifecycleController
  layoutController: ShapeLayoutController
  textNodeController: ShapeTextNodeController
}

/**
 * Текущие узлы группы, которые будут использованы при применении подготовленного update.
 */
type PreparedShapeUpdateCurrent = {
  group: ShapeGroup
  shape: ShapeNode
  text: ShapeTextNode
  shapeIndex: number
}

/**
 * Новое shape-состояние, которое должно стать persisted metadata группы после update.
 */
type PreparedShapeUpdateNext = {
  shape: ShapeNode
  presetKey: string
  presetCanRound: boolean
  rounding: number
  style: ShapeVisualStyle
  shapeTextAutoExpand: boolean
  userPadding: ShapePadding
  replaceBox: ShapeDimensions
  manual: ShapeDimensions
  shouldFitReplacementToPreset: boolean
}

/**
 * Подготовленные text-параметры, которые нужно применить к текущему text node.
 */
type PreparedShapeUpdateText = {
  value?: string
  style?: ShapeTextStyleOptions
  syncLineStylesWithText: boolean
  horizontalAlign: ShapeHorizontalAlign
  verticalAlign: ShapeVerticalAlign
}

/**
 * Layout-параметры, вычисленные до фактической мутации группы.
 */
type PreparedShapeUpdateLayout = {
  width: number
  height: number
  internalShapeTextInset: ShapePadding
  resolveInternalShapeTextInset: ShapeInsetResolver
  preserveAspectRatio: boolean
  expandShapeHeightToFitText: boolean
  changedPadding: ShapePaddingChangeMap
}

/**
 * Полное состояние, подготовленное перед фактическим update группы.
 */
export type PreparedShapeUpdate = {
  current: PreparedShapeUpdateCurrent
  next: PreparedShapeUpdateNext
  text: PreparedShapeUpdateText
  layout: PreparedShapeUpdateLayout
  placement: ObjectPlacement
  lifecycle: ShapeUpdateLifecycleContext
  withoutSelection?: boolean
  withoutSave?: boolean
}

/**
 * Итог текущего состояния группы перед update.
 */
type ShapeUpdateContext = {
  currentGroup: ShapeGroup
  currentPresetKey: string
  requestedPresetKey: string
  basePreset: NonNullable<ReturnType<typeof getShapePreset>>
  placement: ObjectPlacement
  currentDimensions: ShapeDimensions
  currentManualDimensions: ShapeDimensions
  currentReplaceBoxDimensions: ShapeDimensions
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
 * Размеры update до создания нового shape-узла.
 */
type ResolvedUpdateDimensions = {
  nextCurrentDimensions: ShapeDimensions
  manualDimensions: ShapeDimensions
  nextReplaceBoxDimensions: ShapeDimensions | null
  nextShapeTextAutoExpand: boolean
  shouldFitReplacementToPreset: boolean
}

/**
 * Итоговые размеры layout и причина, по которой ширина могла остаться текущей.
 */
type PreparedLayoutDimensions = {
  width: number
  height: number
  shouldPreserveCurrentWidth: boolean
}

/**
 * Входные данные для сборки конечной формы PreparedShapeUpdate.
 */
type PreparedUpdateResultInput = {
  context: ShapeUpdateContext
  target?: ShapeReference
  options: ShapeUpdateOptions
  current: PreparedShapeUpdateCurrent
  shape: ShapeNode
  replaceBox: ShapeDimensions
  layoutDimensions: PreparedLayoutDimensions
  presetState: ResolvedUpdatePreset
  styleState: ResolvedUpdateStyle
  dimensionState: ResolvedUpdateDimensions
}

/**
 * Каноническое reset-состояние text node перед временным измерением и применением update.
 */
export const SHAPE_TEXT_LAYOUT_RESET_STATE = {
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
 * Собирает update shape-группы без мутации текущего canvas state.
 */
export class ShapeUpdatePipeline {
  /**
   * Зависимости preparation без доступа к mutation/history internals.
   */
  private readonly dependencies: ShapeUpdatePipelineDependencies

  /**
   * Инициализирует pipeline только нужными prepare-зависимостями.
   */
  constructor({ dependencies }: { dependencies: ShapeUpdatePipelineDependencies }) {
    this.dependencies = dependencies
  }

  /**
   * Собирает все промежуточные состояния update до создания нового shape-узла.
   */
  public async prepare({
    target,
    presetKey,
    options
  }: {
    target?: ShapeReference
    presetKey?: string
    options: ShapeUpdateOptions
  }): Promise<PreparedShapeUpdate | null> {
    const context = this._resolveUpdateContext({
      target,
      presetKey,
      options
    })

    if (!context) return null

    const presetState = this._resolvePresetState({
      currentGroup: context.currentGroup,
      basePreset: context.basePreset,
      options
    })
    const dimensionState = this._resolveDimensionState({
      context,
      presetState,
      presetKey,
      options
    })
    const styleState = this._resolveStyleState({
      currentGroup: context.currentGroup,
      nextDimensions: dimensionState.nextCurrentDimensions,
      options,
      presetState
    })

    return this._createPreparedUpdate({
      context,
      target,
      options,
      presetState,
      styleState,
      dimensionState
    })
  }

  /**
   * Возвращает текущий update context или null, если update невозможен.
   */
  private _resolveUpdateContext({
    target,
    presetKey,
    options
  }: {
    target?: ShapeReference
    presetKey?: string
    options: ShapeUpdateOptions
  }): ShapeUpdateContext | null {
    const currentGroup = resolveShapeGroup({
      canvas: this.dependencies.canvas,
      target
    })

    if (!currentGroup || currentGroup.locked) return null

    const currentPresetKey = currentGroup.shapePresetKey ?? DEFAULT_SHAPE_PRESET_KEY
    const requestedPresetKey = presetKey ?? currentPresetKey
    const basePreset = getShapePreset({ presetKey: requestedPresetKey })

    if (!basePreset) return null

    return {
      currentGroup,
      currentPresetKey,
      requestedPresetKey,
      basePreset,
      placement: this.dependencies.canvasManager.resolveObjectPlacement({
        object: currentGroup,
        left: options.left,
        top: options.top,
        originX: options.originX,
        originY: options.originY
      }),
      currentDimensions: this.dependencies.layoutController.resolveCurrentDimensions({
        group: currentGroup
      }),
      currentManualDimensions: this.dependencies.layoutController.resolveManualDimensions({
        group: currentGroup
      }),
      currentReplaceBoxDimensions: this.dependencies.layoutController.resolveReplaceBoxDimensions({
        group: currentGroup
      })
    }
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
    context,
    presetState,
    presetKey,
    options
  }: {
    context: ShapeUpdateContext
    presetState: ResolvedUpdatePreset
    presetKey?: string
    options: ShapeUpdateOptions
  }): ResolvedUpdateDimensions {
    const currentShapeTextAutoExpand = this.dependencies.layoutController.isShapeTextAutoExpandEnabled({
      group: context.currentGroup
    })
    const nextShapeTextAutoExpand = options.shapeTextAutoExpand !== undefined
      ? options.shapeTextAutoExpand !== false
      : currentShapeTextAutoExpand
    const shouldPreserveCurrentAspectRatio = Boolean(options.preserveCurrentAspectRatio)
    const isPresetReplace = presetKey !== undefined
      && context.requestedPresetKey !== context.currentPresetKey
    const shouldFitReplacementToPreset = isPresetReplace && !shouldPreserveCurrentAspectRatio
    const nextReplaceBoxDimensions = this._resolveNextReplaceBoxDimensions({
      shouldFitReplacementToPreset,
      currentReplaceBoxDimensions: context.currentReplaceBoxDimensions,
      options
    })
    const nextCurrentDimensions = this._resolveNextCurrentDimensions({
      presetState,
      nextReplaceBoxDimensions,
      currentDimensions: context.currentDimensions,
      options
    })

    return {
      nextCurrentDimensions,
      manualDimensions: this._resolveManualDimensions({
        isPresetReplace,
        currentShapeTextAutoExpand,
        nextShapeTextAutoExpand,
        nextCurrentDimensions,
        currentDimensions: context.currentDimensions,
        currentManualDimensions: context.currentManualDimensions,
        options
      }),
      nextReplaceBoxDimensions,
      nextShapeTextAutoExpand,
      shouldFitReplacementToPreset
    }
  }

  /**
   * Возвращает replace-box для замены пресета или null, если текущий box нужно сохранить.
   */
  private _resolveNextReplaceBoxDimensions({
    shouldFitReplacementToPreset,
    currentReplaceBoxDimensions,
    options
  }: {
    shouldFitReplacementToPreset: boolean
    currentReplaceBoxDimensions: ShapeDimensions
    options: ShapeUpdateOptions
  }): ShapeDimensions | null {
    if (!shouldFitReplacementToPreset) return null

    return {
      width: Math.max(1, options.width ?? currentReplaceBoxDimensions.width),
      height: Math.max(1, options.height ?? currentReplaceBoxDimensions.height)
    }
  }

  /**
   * Возвращает текущие размеры следующего shape layout с учётом замены пресета.
   */
  private _resolveNextCurrentDimensions({
    presetState,
    nextReplaceBoxDimensions,
    currentDimensions,
    options
  }: {
    presetState: ResolvedUpdatePreset
    nextReplaceBoxDimensions: ShapeDimensions | null
    currentDimensions: ShapeDimensions
    options: ShapeUpdateOptions
  }): ShapeDimensions {
    if (nextReplaceBoxDimensions) {
      return this.dependencies.layoutController.resolveAspectRatioFittedDimensions({
        targetWidth: nextReplaceBoxDimensions.width,
        targetHeight: nextReplaceBoxDimensions.height,
        aspectWidth: presetState.presetWidth,
        aspectHeight: presetState.presetHeight
      })
    }

    return {
      width: Math.max(1, options.width ?? currentDimensions.width),
      height: Math.max(1, options.height ?? currentDimensions.height)
    }
  }

  /**
   * Возвращает manual base размеры, которые сохраняются после update.
   */
  private _resolveManualDimensions({
    isPresetReplace,
    currentShapeTextAutoExpand,
    nextShapeTextAutoExpand,
    nextCurrentDimensions,
    currentDimensions,
    currentManualDimensions,
    options
  }: {
    isPresetReplace: boolean
    currentShapeTextAutoExpand: boolean
    nextShapeTextAutoExpand: boolean
    nextCurrentDimensions: ShapeDimensions
    currentDimensions: ShapeDimensions
    currentManualDimensions: ShapeDimensions
    options: ShapeUpdateOptions
  }): ShapeDimensions {
    if (isPresetReplace) return nextCurrentDimensions

    const {
      width: currentManualWidth,
      height: currentManualHeight
    } = currentManualDimensions
    let width = currentManualWidth
    let height = currentManualHeight

    if (options.width !== undefined) {
      width = Math.max(1, options.width)
    }

    if (options.height !== undefined) {
      height = Math.max(1, options.height)
    }

    if (options.width === undefined && currentShapeTextAutoExpand && !nextShapeTextAutoExpand) {
      width = currentDimensions.width
    }

    return { width, height }
  }

  /**
   * Собирает style, padding и inset resolver, которые нужны на layout шаге.
   */
  private _resolveStyleState({
    currentGroup,
    nextDimensions,
    options,
    presetState
  }: {
    currentGroup: ShapeGroup
    nextDimensions: ShapeDimensions
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
      base: this.dependencies.layoutController.resolveGroupUserPadding({
        group: currentGroup
      }),
      override: options.textPadding
    })
    const changedPadding = getShapePaddingChangeMap({
      padding: options.textPadding
    })
    const style = resolveShapeStyle({
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
        width: nextDimensions.width,
        height: nextDimensions.height
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
   * Создаёт подготовленное обновление с уже измеренным временным text node и новым shape-узлом.
   */
  private async _createPreparedUpdate({
    context,
    target,
    options,
    presetState,
    styleState,
    dimensionState
  }: {
    context: ShapeUpdateContext
    target?: ShapeReference
    options: ShapeUpdateOptions
    presetState: ResolvedUpdatePreset
    styleState: ResolvedUpdateStyle
    dimensionState: ResolvedUpdateDimensions
  }): Promise<PreparedShapeUpdate | null> {
    const current = this._resolvePreparedCurrentNodes({
      currentGroup: context.currentGroup
    })

    if (!current) return null

    const layoutDimensions = this._resolvePreparedLayoutDimensions({
      currentGroup: context.currentGroup,
      currentTextNode: current.text,
      currentDimensions: context.currentDimensions,
      options,
      styleState,
      dimensionState
    })
    const shape = await createShapeNode({
      preset: presetState.effectivePreset,
      width: layoutDimensions.width,
      height: layoutDimensions.height,
      style: styleState.style,
      rounding: presetState.effectiveRounding
    })
    const replaceBox = this._resolvePreparedReplaceBoxDimensions({
      currentReplaceBoxDimensions: context.currentReplaceBoxDimensions,
      dimensionState,
      options
    })

    return this._createPreparedUpdateResult({
      context,
      target,
      options,
      current,
      shape,
      replaceBox,
      layoutDimensions,
      presetState,
      styleState,
      dimensionState
    })
  }

  /**
   * Собирает конечную PreparedShapeUpdate форму из уже разрешённых частей update.
   */
  private _createPreparedUpdateResult({
    context,
    target,
    options,
    current,
    shape,
    replaceBox,
    layoutDimensions,
    presetState,
    styleState,
    dimensionState
  }: PreparedUpdateResultInput): PreparedShapeUpdate {
    return {
      current,
      next: this._createPreparedNextState({
        shape,
        replaceBox,
        presetState,
        styleState,
        dimensionState
      }),
      text: this._createPreparedTextState({
        options,
        styleState
      }),
      layout: this._createPreparedLayoutState({
        layoutDimensions,
        styleState,
        dimensionState,
        options
      }),
      placement: context.placement,
      lifecycle: this.dependencies.lifecycleController.createContext({
        group: context.currentGroup,
        source: 'update',
        target,
        presetKey: presetState.effectivePresetKey,
        options,
        withoutSave: options.withoutSave
      }),
      withoutSelection: options.withoutSelection,
      withoutSave: options.withoutSave
    }
  }

  /**
   * Возвращает текущие shape/text узлы и индекс shape-узла внутри группы.
   */
  private _resolvePreparedCurrentNodes({
    currentGroup
  }: {
    currentGroup: ShapeGroup
  }): PreparedShapeUpdateCurrent | null {
    const { shape, text } = getShapeNodes({
      group: currentGroup
    })

    if (!shape || !text) return null

    const shapeIndex = currentGroup.getObjects().indexOf(shape)

    if (shapeIndex < 0) return null

    return {
      group: currentGroup,
      shape,
      text,
      shapeIndex
    }
  }

  /**
   * Собирает metadata и новый shape-узел для применения update.
   */
  private _createPreparedNextState({
    shape,
    replaceBox,
    presetState,
    styleState,
    dimensionState
  }: {
    shape: ShapeNode
    replaceBox: ShapeDimensions
    presetState: ResolvedUpdatePreset
    styleState: ResolvedUpdateStyle
    dimensionState: ResolvedUpdateDimensions
  }): PreparedShapeUpdateNext {
    return {
      shape,
      presetKey: presetState.effectivePresetKey,
      presetCanRound: presetState.presetCanRound,
      rounding: presetState.effectiveRounding,
      style: styleState.style,
      shapeTextAutoExpand: dimensionState.nextShapeTextAutoExpand,
      userPadding: styleState.nextUserPadding,
      replaceBox,
      manual: dimensionState.manualDimensions,
      shouldFitReplacementToPreset: dimensionState.shouldFitReplacementToPreset
    }
  }

  /**
   * Собирает text-состояние, которое будет применено к текущему text node.
   */
  private _createPreparedTextState({
    options,
    styleState
  }: {
    options: ShapeUpdateOptions
    styleState: ResolvedUpdateStyle
  }): PreparedShapeUpdateText {
    return {
      value: options.text,
      style: options.textStyle,
      syncLineStylesWithText: options.syncLineStylesWithText !== false,
      horizontalAlign: styleState.horizontalAlign,
      verticalAlign: styleState.verticalAlign
    }
  }

  /**
   * Собирает layout-состояние, которое будет применено после замены shape-узла.
   */
  private _createPreparedLayoutState({
    layoutDimensions,
    styleState,
    dimensionState,
    options
  }: {
    layoutDimensions: PreparedLayoutDimensions
    styleState: ResolvedUpdateStyle
    dimensionState: ResolvedUpdateDimensions
    options: ShapeUpdateOptions
  }): PreparedShapeUpdateLayout {
    return {
      width: layoutDimensions.width,
      height: layoutDimensions.height,
      internalShapeTextInset: styleState.resolveInternalShapeTextInset({
        width: layoutDimensions.width,
        height: layoutDimensions.height
      }),
      resolveInternalShapeTextInset: styleState.resolveInternalShapeTextInset,
      preserveAspectRatio: dimensionState.shouldFitReplacementToPreset,
      expandShapeHeightToFitText: options.textPadding === undefined
        || !layoutDimensions.shouldPreserveCurrentWidth,
      changedPadding: styleState.changedPadding
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
    currentReplaceBoxDimensions: ShapeDimensions
    dimensionState: ResolvedUpdateDimensions
    options: ShapeUpdateOptions
  }): ShapeDimensions {
    return {
      width: dimensionState.nextReplaceBoxDimensions?.width
        ?? (options.width !== undefined ? Math.max(1, options.width) : currentReplaceBoxDimensions.width),
      height: dimensionState.nextReplaceBoxDimensions?.height
        ?? (options.height !== undefined ? Math.max(1, options.height) : currentReplaceBoxDimensions.height)
    }
  }

  /**
   * Определяет финальные width/height, которые будут материализованы в новый shape-узел.
   */
  private _resolvePreparedLayoutDimensions({
    currentGroup,
    currentTextNode,
    currentDimensions,
    options,
    styleState,
    dimensionState
  }: {
    currentGroup: ShapeGroup
    currentTextNode: ShapeTextNode
    currentDimensions: ShapeDimensions
    options: ShapeUpdateOptions
    styleState: ResolvedUpdateStyle
    dimensionState: ResolvedUpdateDimensions
  }): PreparedLayoutDimensions {
    const stagedTextNode = this._createStagedTextNode({
      currentGroup,
      currentTextNode,
      currentWidth: currentDimensions.width,
      horizontalAlign: styleState.horizontalAlign,
      text: options.text,
      textStyle: options.textStyle,
      syncLineStylesWithText: options.syncLineStylesWithText
    })

    return this._resolveLayoutDimensions({
      currentDimensions,
      options,
      stagedTextNode,
      styleState,
      dimensionState
    })
  }

  /**
   * Строит временный text node для безопасного измерения layout до мутации текущей группы.
   */
  private _createStagedTextNode({
    currentGroup,
    currentTextNode,
    currentWidth,
    horizontalAlign,
    text,
    textStyle,
    syncLineStylesWithText
  }: {
    currentGroup: ShapeGroup
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
    const stagedTextNode = this.dependencies.textNodeController.create({
      text: currentTextNodeWithRawText.textCaseRaw ?? currentTextNode.text ?? '',
      textStyle: this.dependencies.textNodeController.resolveCurrentStyle({
        group: currentGroup,
        textNode: currentTextNode
      }),
      width: Math.max(1, currentTextNode.width ?? currentWidth),
      align: horizontalAlign
    })

    stagedTextNode.set(SHAPE_TEXT_LAYOUT_RESET_STATE)
    this.dependencies.textNodeController.applyUpdates({
      textNode: stagedTextNode,
      text,
      textStyle,
      align: horizontalAlign,
      syncLineStylesWithText
    })

    return stagedTextNode
  }

  /**
   * Возвращает итоговые layout размеры с учётом auto-expand и замены пресета.
   */
  private _resolveLayoutDimensions({
    currentDimensions,
    options,
    stagedTextNode,
    styleState,
    dimensionState
  }: {
    currentDimensions: ShapeDimensions
    options: ShapeUpdateOptions
    stagedTextNode: ShapeTextNode
    styleState: ResolvedUpdateStyle
    dimensionState: ResolvedUpdateDimensions
  }): PreparedLayoutDimensions {
    const shouldPreserveCurrentWidth = options.width === undefined
      && options.height === undefined
      && !dimensionState.shouldFitReplacementToPreset
      && options.shapeTextAutoExpand === undefined
      && options.rounding === undefined
      && options.text === undefined
      && !this.dependencies.textNodeController.hasSizeAffectingStyleChanges({
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
      return this._resolveReplacementLayoutDimensions({
        stagedTextNode,
        styleState,
        dimensionState,
        shouldPreserveCurrentWidth
      })
    }

    return {
      width: this.dependencies.layoutController.resolveShapeLayoutWidth({
        text: stagedTextNode,
        currentWidth: dimensionState.nextCurrentDimensions.width,
        manualWidth: dimensionState.manualDimensions.width,
        shapeTextAutoExpandEnabled: dimensionState.nextShapeTextAutoExpand,
        padding: styleState.basePadding,
        resolvePaddingForWidth: ({ width }) => sumShapePadding({
          base: styleState.resolveInternalShapeTextInset({
            width,
            height: dimensionState.nextCurrentDimensions.height
          }),
          addition: styleState.nextUserPadding
        })
      }),
      height: dimensionState.nextCurrentDimensions.height,
      shouldPreserveCurrentWidth
    }
  }

  /**
   * Разрешает итоговый proportional layout для замены пресета с учётом текущего текста.
   */
  private _resolveReplacementLayoutDimensions({
    stagedTextNode,
    styleState,
    dimensionState,
    shouldPreserveCurrentWidth
  }: {
    stagedTextNode: ShapeTextNode
    styleState: ResolvedUpdateStyle
    dimensionState: ResolvedUpdateDimensions
    shouldPreserveCurrentWidth: boolean
  }): PreparedLayoutDimensions {
    const {
      width,
      height
    } = dimensionState.nextCurrentDimensions
    const aspectRatio = height / Math.max(1, width)
    const resolvedWidth = this.dependencies.layoutController.resolveShapeLayoutWidth({
      text: stagedTextNode,
      currentWidth: width,
      manualWidth: width,
      shapeTextAutoExpandEnabled: true,
      padding: styleState.basePadding,
      resolvePaddingForWidth: ({ width: candidateWidth }) => {
        const candidateHeight = Math.max(1, candidateWidth * aspectRatio)

        return sumShapePadding({
          base: styleState.resolveInternalShapeTextInset({
            width: candidateWidth,
            height: candidateHeight
          }),
          addition: styleState.nextUserPadding
        })
      }
    })

    return {
      width: resolvedWidth,
      height: Math.max(1, resolvedWidth * aspectRatio),
      shouldPreserveCurrentWidth
    }
  }
}
