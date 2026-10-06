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
 * Concrete dependencies of the shape-update preparation stage.
 */
type ShapeUpdatePipelineDependencies = {
  canvas: Canvas
  canvasManager: CanvasManager
  lifecycleController: ShapeLifecycleController
  layoutController: ShapeLayoutController
  textNodeController: ShapeTextNodeController
}

/**
 * Current group nodes to use when applying the prepared update.
 */
type PreparedShapeUpdateCurrent = {
  group: ShapeGroup
  shape: ShapeNode
  text: ShapeTextNode
  shapeIndex: number
}

/**
 * New shape state to become the group's persisted metadata after the update.
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
 * Prepared text parameters to apply to the current text node.
 */
type PreparedShapeUpdateText = {
  value?: string
  style?: ShapeTextStyleOptions
  syncLineStylesWithText: boolean
  horizontalAlign: ShapeHorizontalAlign
  verticalAlign: ShapeVerticalAlign
}

/**
 * Layout parameters calculated before the group is actually mutated.
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
 * Complete state prepared before the actual group update.
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
 * Summary of the group's current state before the update.
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
 * Resulting preset and rounding after normalizing the current update request.
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
 * Style and padding state subsequently used in layout calculations.
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
 * Update dimensions before creating the new shape node.
 */
type ResolvedUpdateDimensions = {
  nextCurrentDimensions: ShapeDimensions
  manualDimensions: ShapeDimensions
  nextReplaceBoxDimensions: ShapeDimensions | null
  nextShapeTextAutoExpand: boolean
  shouldFitReplacementToPreset: boolean
}

/**
 * Final layout dimensions and the reason the width may have remained unchanged.
 */
type PreparedLayoutDimensions = {
  width: number
  height: number
  shouldPreserveCurrentWidth: boolean
}

/**
 * Input for assembling the final PreparedShapeUpdate representation.
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
 * Canonical reset state of the text node before temporary measurement and update application.
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
 * Builds a shape-group update without mutating the current canvas state.
 */
export class ShapeUpdatePipeline {
  /**
   * Preparation dependencies without access to mutation/history internals.
   */
  private readonly dependencies: ShapeUpdatePipelineDependencies

  /**
   * Initializes the pipeline with only the required preparation dependencies.
   */
  constructor({ dependencies }: { dependencies: ShapeUpdatePipelineDependencies }) {
    this.dependencies = dependencies
  }

  /**
   * Builds all intermediate update states before creating the new shape node.
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
   * Returns the current update context, or null if an update is impossible.
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
   * Resolves the final preset and rounding for the current update request.
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
   * Resolves current/manual/replacement-box dimensions for the current update contract.
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
   * Returns the replacement box for a preset change, or null if the current box must be preserved.
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
   * Returns the current dimensions for the next shape layout, accounting for preset replacement.
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
   * Returns the manual base dimensions preserved after the update.
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
   * Builds the style, padding, and inset resolver needed at the layout step.
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
   * Creates a prepared update with an already measured temporary text node and a new shape node.
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
   * Assembles the final PreparedShapeUpdate representation from the already resolved update parts.
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
   * Returns the current shape/text nodes and the shape node's index within the group.
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
   * Builds metadata and a new shape node for applying the update.
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
   * Builds the text state to apply to the current text node.
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
   * Builds the layout state to apply after replacing the shape node.
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
   * Resolves the final replacement box that remains with the group after the update.
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
   * Determines the final width/height to materialize in the new shape node.
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
   * Builds a temporary text node for safe layout measurement before mutating the current group.
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
   * Returns the final layout dimensions, accounting for auto-expansion and preset replacement.
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
   * Resolves the final proportional layout for preset replacement, accounting for the current text.
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
