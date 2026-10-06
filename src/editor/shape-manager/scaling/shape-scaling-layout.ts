import type { Transform } from 'fabric'
import {
  applyFixedWidthShapeTextLayout,
  applyShapeTextLayout,
  measureShapeTextFrameLayout,
  resolveMinimumShapeWidthForText,
  resolveShapeTextFixedWidthLayout,
  resolveRequiredShapeHeightForText
} from '../layout/shape-layout'
import type {
  ResolvedShapeTextLayout
} from '../layout/shape-layout'
import {
  normalizeShapeUserPadding,
  resolveShapeTextContentInset
} from '../layout/shape-padding'
import {
  getShapePreset,
  resolveInternalShapeTextInset as resolvePresetInternalShapeTextInset,
  SHAPE_DEFAULT_VERTICAL_ALIGN
} from '../domain/shape-presets'
import type {
  ShapeGroup,
  ShapeHorizontalAlign,
  ShapeNode,
  ShapePadding,
  ShapeScalingProportionalTextConstraintCacheEntry,
  ShapeScalingState,
  ShapeTextWrapPolicy,
  ShapeTextNode,
  ShapeTransformOriginX,
  ShapeTransformOriginY,
  ShapeVerticalAlign
} from '../types'
import {
  resolveShapeScaleActionAxes,
  resolveShapeScalingAnchorPoint,
  resolveShapeTransformOriginalNumber,
  resolveShapeTransformOriginXValue,
  resolveShapeTransformOriginYValue
} from './shape-scaling-transform'

/**
 * Minimum shape-layout size during scaling.
 */
export const SHAPE_SCALING_MIN_SIZE = 1

/**
 * Tolerance for comparing scale values during scaling.
 */
export const SHAPE_SCALING_SCALE_EPSILON = 0.0001

/**
 * Tolerance for comparing pixel dimensions during scaling.
 */
export const SHAPE_SCALING_SIZE_EPSILON = 0.5

/**
 * Pointer event that may come from a Fabric transform during scaling.
 */
export type ShapeScalingPointerEvent = Event | MouseEvent | PointerEvent | TouchEvent

/**
 * Initial shape-group dimensions required to calculate live scaling.
 */
export type ShapeScalingStartDimensions = {
  startWidth: number
  startHeight: number
  startManualBaseWidth: number
  startManualBaseHeight: number
  canScaleWidth: boolean
  canScaleHeight: boolean
}

/**
 * Final shape-group dimensions after committing scaling.
 */
export type ShapeScalingCommitDimensions = {
  width: number
  height: number
  hasWidthChange: boolean
  hasDimensionChange: boolean
}

/** Current scaling-step constraints after checking dimensions and text. */
export type ShapeScalingConstraintState = Readonly<{
  shouldHandleAsNoop: boolean
  shouldRestoreLastAllowedTransform: boolean
  clampedScaleX: number | null
  clampedScaleY: number | null
  resolvedMinimumHeight: number | null
}>

/** Input for the shared constraint check of the current step. */
type ShapeScalingConstraintParams = Readonly<{
  group: ShapeGroup
  text: ShapeTextNode
  constraintPadding: ShapePadding
  state: ShapeScalingState
  scaleX: number
  scaleY: number
}>

/** Measured dimensions and modes used to select the final constraint. */
type ShapeScalingConstraintAttempt = Readonly<{
  attemptedHeight: number
  attemptedWidth: number
  isShrinkingX: boolean
  isShrinkingY: boolean
  minimumHeight: number | null
  minimumWidth: number | null
  shouldHandleAsNoop: boolean
  shouldValidateProportionalConstraint: boolean
}>

/**
 * Manual base dimensions preserved after committing scaling.
 */
type ShapeScalingManualBaseDimensions = {
  width: number
  height: number
}

/**
 * Initial transform context of the drag session.
 */
type ShapeScalingStartTransform = {
  startScaleX: number
  startScaleY: number
  startLeft: number
  startTop: number
  startTransformOriginX: ShapeTransformOriginX | null
  startTransformOriginY: ShapeTransformOriginY | null
  startTransformCorner: string | null
  scalingAnchorX: number | null
  scalingAnchorY: number | null
}

/**
 * Complete data for applying scaling layout to a shape group.
 */
type ShapeScalingLayoutCommit = {
  group: ShapeGroup
  shape: ShapeNode
  text: ShapeTextNode
  width: number
  height: number
  alignH: ShapeHorizontalAlign
  alignV: ShapeVerticalAlign
  startManualBaseWidth: number
  startManualBaseHeight: number
  canScaleWidth: boolean
  canScaleHeight: boolean
  hasWidthChange: boolean
  wrapPolicy?: ShapeTextWrapPolicy
}

/**
 * Shape-group preview dimensions in a live-scaling frame.
 */
type ShapePreviewDimensions = {
  previewWidth: number
  previewHeight: number
}

/**
 * Text layout calculated for the preview dimensions.
 */
type ShapePreviewLayout = ResolvedShapeTextLayout

/**
 * Minimum proportional-scaling constraint for text inside the shape.
 */
export type ShapeScalingProportionalTextConstraint = ShapeScalingProportionalTextConstraintCacheEntry

export function resolveShapeScalingTextWrapPolicy({
  isProportionalScaling,
  startTextSplitByGrapheme
}: {
  isProportionalScaling?: boolean
  startTextSplitByGrapheme?: boolean
}): ShapeTextWrapPolicy | undefined {
  if (!isProportionalScaling) return undefined
  if (startTextSplitByGrapheme) return undefined

  return 'words-only'
}

/**
 * Returns a stable cache key for a pair of scaling dimensions.
 */
function resolveShapeScalingSizeCacheKey({
  width,
  height
}: {
  width: number
  height: number
}): string {
  const normalizedWidth = Math.round(Math.max(SHAPE_SCALING_MIN_SIZE, width) * 1_000_000) / 1_000_000
  const normalizedHeight = Math.round(Math.max(SHAPE_SCALING_MIN_SIZE, height) * 1_000_000) / 1_000_000

  return `${normalizedWidth}:${normalizedHeight}`
}

/**
 * Returns the text-frame width for scaling calculations.
 */
function resolveShapeScalingTextFrameWidth({
  width,
  padding
}: {
  width: number
  padding: ShapePadding
}): number {
  return Math.max(
    SHAPE_SCALING_MIN_SIZE,
    width - Math.max(0, padding.left) - Math.max(0, padding.right)
  )
}

/**
 * Returns the text-frame height for scaling calculations.
 */
function resolveShapeScalingTextFrameHeight({
  height,
  padding
}: {
  height: number
  padding: ShapePadding
}): number {
  return Math.max(
    SHAPE_SCALING_MIN_SIZE,
    height - Math.max(0, padding.top) - Math.max(0, padding.bottom)
  )
}

/**
 * Returns true if the shape text contains visible text.
 */
function hasVisibleShapeTextContent({
  text
}: {
  text: ShapeTextNode
}): boolean {
  const rawText = text.text ?? ''

  return rawText.trim().length > 0
}

/**
 * Returns a proportional constraint for empty text without additional measurement.
 */
function resolveEmptyTextProportionalConstraint({
  height
}: {
  height: number
}): ShapeScalingProportionalTextConstraint {
  return {
    measuredHeight: height,
    renderedLineCount: 0,
    longestLineWidth: 0,
    requiresGraphemeSplit: false,
    isValid: true
  }
}

/**
 * Returns user-defined text padding from group metadata.
 */
export function resolveShapeScalingUserPadding({ group }: { group: ShapeGroup }): ShapePadding {
  return normalizeShapeUserPadding({
    padding: {
      top: group.shapePaddingTop,
      right: group.shapePaddingRight,
      bottom: group.shapePaddingBottom,
      left: group.shapePaddingLeft
    }
  })
}

/**
 * Returns the full internal text inset for the current shape-group dimensions, accounting for preset and stroke.
 */
export function resolveShapeScalingInternalTextInset({
  group,
  width,
  height
}: {
  group: ShapeGroup
  width: number
  height: number
}): ShapePadding {
  const presetKey = group.shapePresetKey ?? ''
  const preset = presetKey
    ? getShapePreset({ presetKey })
    : null
  const presetInset = preset
    ? resolvePresetInternalShapeTextInset({
      preset,
      width,
      height
    })
    : undefined

  return resolveShapeTextContentInset({
    baseInset: presetInset,
    stroke: group.shapeStroke,
    strokeWidth: group.shapeStrokeWidth
  })
}

/**
 * Returns the padding used in minimum constraints during scaling.
 * User-defined padding is ignored here and may be reduced by layout as the shape shrinks.
 */
export function resolveShapeScalingConstraintPadding({
  group,
  width,
  height
}: {
  group: ShapeGroup
  width?: number
  height?: number
}): ShapePadding {
  const resolvedWidth = Math.max(
    SHAPE_SCALING_MIN_SIZE,
    width ?? group.shapeBaseWidth ?? group.width ?? group.shapeManualBaseWidth ?? SHAPE_SCALING_MIN_SIZE
  )
  const resolvedHeight = Math.max(
    SHAPE_SCALING_MIN_SIZE,
    height ?? group.shapeBaseHeight ?? group.height ?? group.shapeManualBaseHeight ?? SHAPE_SCALING_MIN_SIZE
  )

  return resolveShapeScalingInternalTextInset({
    group,
    width: resolvedWidth,
    height: resolvedHeight
  })
}

/**
 * Validates a proportional candidate against the actual current text layout.
 * Word wrapping is allowed on this path, but a splitByGrapheme fallback is not.
 */
export function validateShapeTextLayoutForProportionalScaling({
  group,
  text,
  width,
  height,
  measurementCache,
  constraintCache
}: {
  group: ShapeGroup
  text: ShapeTextNode
  width: number
  height: number
  measurementCache?: ShapeScalingState['previewTextMeasurementCache']
  constraintCache?: ShapeScalingState['proportionalTextConstraintCache']
}): ShapeScalingProportionalTextConstraint {
  const safeWidth = Math.max(SHAPE_SCALING_MIN_SIZE, width)
  const safeHeight = Math.max(SHAPE_SCALING_MIN_SIZE, height)
  const constraintCacheKey = resolveShapeScalingSizeCacheKey({
    width: safeWidth,
    height: safeHeight
  })
  const cachedConstraint = constraintCache?.get(constraintCacheKey)

  if (cachedConstraint) return cachedConstraint

  if (!hasVisibleShapeTextContent({ text })) {
    const constraint = resolveEmptyTextProportionalConstraint({
      height: safeHeight
    })

    constraintCache?.set(constraintCacheKey, constraint)

    return constraint
  }

  const constraintPadding = resolveShapeScalingConstraintPadding({
    group,
    width: safeWidth,
    height: safeHeight
  })
  const frameWidth = resolveShapeScalingTextFrameWidth({
    width: safeWidth,
    padding: constraintPadding
  })
  const frameHeight = resolveShapeScalingTextFrameHeight({
    height: safeHeight,
    padding: constraintPadding
  })
  const measurement = measureShapeTextFrameLayout({
    text,
    frameWidth,
    splitByGrapheme: false,
    measurementCache: measurementCache ?? undefined
  })

  const constraint = {
    ...measurement,
    isValid: !measurement.requiresGraphemeSplit
      && measurement.measuredHeight <= frameHeight + SHAPE_SCALING_SIZE_EPSILON
  }

  constraintCache?.set(constraintCacheKey, constraint)

  return constraint
}

/**
 * Returns the minimum scale for proportional shrinking under the current text-layout contract.
 */
export function resolveMinimumProportionalShapeScale({
  group,
  text,
  state
}: {
  group: ShapeGroup
  text: ShapeTextNode
  state: ShapeScalingState
}): {
  scale: number
  minimumHeight: number
} {
  const {
    startHeight,
    startWidth,
    startScaleX,
    startScaleY,
    lastAllowedScaleX,
    lastAllowedScaleY
  } = state
  const lowerBound = Math.max(
    SHAPE_SCALING_MIN_SIZE / startWidth,
    SHAPE_SCALING_MIN_SIZE / startHeight
  )
  const upperBound = Math.max(
    lowerBound,
    startScaleX,
    startScaleY,
    lastAllowedScaleX,
    lastAllowedScaleY
  )
  const evaluateScale = ({ scale }: { scale: number }) => {
    const attemptedWidth = Math.max(SHAPE_SCALING_MIN_SIZE, startWidth * scale)
    const attemptedHeight = Math.max(SHAPE_SCALING_MIN_SIZE, startHeight * scale)
    const candidateConstraint = validateShapeTextLayoutForProportionalScaling({
      group,
      text,
      width: attemptedWidth,
      height: attemptedHeight,
      measurementCache: state.previewTextMeasurementCache,
      constraintCache: state.proportionalTextConstraintCache
    })

    return {
      minimumHeight: candidateConstraint.measuredHeight,
      isValid: candidateConstraint.isValid
    }
  }
  const upperBoundConstraint = evaluateScale({
    scale: upperBound
  })

  if (!upperBoundConstraint.isValid) {
    return {
      scale: upperBound,
      minimumHeight: upperBoundConstraint.minimumHeight
    }
  }

  let low = lowerBound
  let high = upperBound
  let resolvedScale = upperBound
  let resolvedMinimumHeight = upperBoundConstraint.minimumHeight

  for (let index = 0; index < 24; index += 1) {
    const candidateScale = (low + high) / 2
    const candidateConstraint = evaluateScale({
      scale: candidateScale
    })

    if (candidateConstraint.isValid) {
      resolvedScale = candidateScale
      resolvedMinimumHeight = candidateConstraint.minimumHeight
      high = candidateScale
      continue
    }

    low = candidateScale
  }

  return {
    scale: resolvedScale,
    minimumHeight: resolvedMinimumHeight
  }
}

/**
 * Returns the minimum shape height sufficient to fit the text at the given width.
 */
export function resolveMinimumTextFitHeight({
  group,
  text,
  width,
  padding,
  wrapPolicy,
  measurementCache
}: {
  group: ShapeGroup
  text: ShapeTextNode
  width: number
  padding: ShapePadding
  wrapPolicy?: ShapeTextWrapPolicy
  measurementCache?: ShapeScalingState['previewTextMeasurementCache']
}): number {
  return resolveRequiredShapeHeightForText({
    text,
    width,
    height: SHAPE_SCALING_MIN_SIZE,
    padding,
    wrapPolicy,
    measurementCache: measurementCache ?? undefined,
    resolvePaddingForSize: ({ width: nextWidth, height: nextHeight }) => {
      return resolveShapeScalingConstraintPadding({
        group,
        width: nextWidth,
        height: nextHeight
      })
    }
  })
}

/** Measures dimensions and minimum constraints for the current scaling attempt. */
function resolveShapeScalingConstraintAttempt({
  group,
  text,
  constraintPadding,
  state,
  scaleX,
  scaleY
}: ShapeScalingConstraintParams): ShapeScalingConstraintAttempt {
  const attemptedWidth = state.canScaleWidth
    ? Math.max(SHAPE_SCALING_MIN_SIZE, state.startWidth * scaleX)
    : state.startWidth
  const attemptedHeight = state.canScaleHeight
    ? Math.max(SHAPE_SCALING_MIN_SIZE, state.startHeight * scaleY)
    : state.startHeight
  const isShrinkingX = scaleX < state.lastAllowedScaleX - SHAPE_SCALING_SCALE_EPSILON
  const isShrinkingY = scaleY < state.lastAllowedScaleY - SHAPE_SCALING_SCALE_EPSILON
  const isVerticalOnlyScale = state.canScaleHeight && !state.canScaleWidth
  const minimumWidth = state.canScaleWidth && isShrinkingX
    ? resolveMinimumShapeWidthForText({
      text,
      padding: constraintPadding,
      measurementCache: state.previewTextMeasurementCache ?? undefined,
      resolvePaddingForWidth: ({ width }) => resolveShapeScalingConstraintPadding({
        group,
        width,
        height: attemptedHeight
      })
    })
    : null
  const minimumHeight = state.canScaleHeight && isShrinkingY
    ? (isVerticalOnlyScale ? state.fixedWidthMinimumTextFitHeight : null)
      ?? resolveMinimumTextFitHeight({
        group,
        text,
        width: attemptedWidth,
        padding: constraintPadding,
        measurementCache: state.previewTextMeasurementCache
      })
    : null

  return {
    attemptedHeight,
    attemptedWidth,
    isShrinkingX,
    isShrinkingY,
    minimumHeight,
    minimumWidth,
    shouldHandleAsNoop: isVerticalOnlyScale
      && state.cannotScaleDownAtStart
      && scaleY < state.startScaleY - SHAPE_SCALING_SCALE_EPSILON,
    shouldValidateProportionalConstraint: state.isProportionalScaling
      && state.canScaleWidth
      && state.canScaleHeight
      && (isShrinkingX || isShrinkingY)
  }
}

/** Checks text during proportional shrinking and returns the overall scale limit. */
function resolveProportionalScalingConstraint({
  attempt,
  group,
  state,
  text
}: {
  attempt: ShapeScalingConstraintAttempt
  group: ShapeGroup
  state: ShapeScalingState
  text: ShapeTextNode
}): ShapeScalingConstraintState | null {
  if (!attempt.shouldValidateProportionalConstraint) return null

  const candidate = validateShapeTextLayoutForProportionalScaling({
    group,
    text,
    width: attempt.attemptedWidth,
    height: attempt.attemptedHeight,
    measurementCache: state.previewTextMeasurementCache,
    constraintCache: state.proportionalTextConstraintCache
  })
  if (candidate.isValid) {
    return {
      shouldHandleAsNoop: attempt.shouldHandleAsNoop,
      shouldRestoreLastAllowedTransform: state.crossedOppositeCorner,
      clampedScaleX: null,
      clampedScaleY: null,
      resolvedMinimumHeight: null
    }
  }

  const minimum = resolveMinimumProportionalShapeScale({ group, text, state })

  return {
    shouldHandleAsNoop: attempt.shouldHandleAsNoop,
    shouldRestoreLastAllowedTransform: state.crossedOppositeCorner,
    clampedScaleX: minimum.scale,
    clampedScaleY: minimum.scale,
    resolvedMinimumHeight: minimum.minimumHeight
  }
}

/** Constrains independent axes using the calculated minimum dimensions. */
function resolveAxisScalingConstraint({
  attempt,
  group,
  state,
  text
}: {
  attempt: ShapeScalingConstraintAttempt
  group: ShapeGroup
  state: ShapeScalingState
  text: ShapeTextNode
}): ShapeScalingConstraintState {
  const hasWidthViolation = attempt.minimumWidth !== null
    && attempt.attemptedWidth < attempt.minimumWidth + SHAPE_SCALING_SCALE_EPSILON
  const hasHeightViolation = attempt.minimumHeight !== null
    && attempt.attemptedHeight < attempt.minimumHeight + SHAPE_SCALING_SCALE_EPSILON

  if (state.isProportionalScaling && (hasWidthViolation || hasHeightViolation)) {
    const minimum = resolveMinimumProportionalShapeScale({ group, text, state })

    return {
      shouldHandleAsNoop: attempt.shouldHandleAsNoop,
      shouldRestoreLastAllowedTransform: state.crossedOppositeCorner,
      clampedScaleX: minimum.scale,
      clampedScaleY: minimum.scale,
      resolvedMinimumHeight: minimum.minimumHeight
    }
  }

  const minimumScaleX = attempt.minimumWidth === null || !hasWidthViolation
    ? null
    : Math.max(SHAPE_SCALING_MIN_SIZE / state.startWidth, attempt.minimumWidth / state.startWidth)
  const minimumScaleY = attempt.minimumHeight === null || !hasHeightViolation
    ? null
    : Math.max(SHAPE_SCALING_MIN_SIZE / state.startHeight, attempt.minimumHeight / state.startHeight)

  return {
    shouldHandleAsNoop: attempt.shouldHandleAsNoop,
    shouldRestoreLastAllowedTransform: state.crossedOppositeCorner,
    clampedScaleX: minimumScaleX,
    clampedScaleY: minimumScaleY,
    resolvedMinimumHeight: attempt.minimumHeight
  }
}

/** Returns dimension and text constraints for one shape-scaling step. */
export function resolveShapeScalingConstraintState(
  params: ShapeScalingConstraintParams
): ShapeScalingConstraintState {
  const attempt = resolveShapeScalingConstraintAttempt(params)
  const proportional = resolveProportionalScalingConstraint({
    attempt,
    group: params.group,
    state: params.state,
    text: params.text
  })

  return proportional ?? resolveAxisScalingConstraint({
    attempt,
    group: params.group,
    state: params.state,
    text: params.text
  })
}

/**
 * Returns shape preview dimensions for the current live scale, accounting for text wrapping.
 */
export function resolveShapeScalingPreviewDimensions({
  group,
  text,
  constraintPadding,
  startDimensions,
  appliedScaleX,
  appliedScaleY,
  minimumHeight,
  wrapPolicy,
  measurementCache
}: {
  group: ShapeGroup
  text: ShapeTextNode
  constraintPadding: ShapePadding
  startDimensions: ShapeScalingStartDimensions
  appliedScaleX: number
  appliedScaleY: number
  minimumHeight?: number | null
  wrapPolicy?: ShapeTextWrapPolicy
  measurementCache?: ShapeScalingState['previewTextMeasurementCache']
}): ShapePreviewDimensions {
  const previewWidth = startDimensions.canScaleWidth
    ? Math.max(SHAPE_SCALING_MIN_SIZE, startDimensions.startWidth * appliedScaleX)
    : startDimensions.startWidth
  const scaledPreviewHeight = startDimensions.canScaleHeight
    ? Math.max(SHAPE_SCALING_MIN_SIZE, startDimensions.startHeight * appliedScaleY)
    : startDimensions.startManualBaseHeight
  const resolvedMinimumHeight = minimumHeight ?? resolveRequiredShapeHeightForText({
    text,
    width: previewWidth,
    height: scaledPreviewHeight,
    padding: constraintPadding,
    wrapPolicy,
    measurementCache: measurementCache ?? undefined,
    resolvePaddingForSize: ({ width, height }) => resolveShapeScalingConstraintPadding({
      group,
      width,
      height
    })
  })
  const previewHeight = Math.max(
    scaledPreviewHeight,
    resolvedMinimumHeight
  )

  return {
    previewWidth,
    previewHeight
  }
}

/**
 * Returns the live-preview text layout for an already chosen scaling width.
 * Width is fixed by the current drag, and user-defined padding is reduced under the same contract as the final layout.
 */
export function resolveShapeScalingPreviewLayout({
  group,
  text,
  state,
  appliedScaleX,
  appliedScaleY,
  minimumHeight
}: {
  group: ShapeGroup
  text: ShapeTextNode
  state: ShapeScalingState
  appliedScaleX: number
  appliedScaleY: number
  minimumHeight?: number | null
}): ShapePreviewLayout {
  const previewWidth = state.canScaleWidth
    ? Math.max(SHAPE_SCALING_MIN_SIZE, state.startWidth * appliedScaleX)
    : state.startWidth
  const scaledPreviewHeight = state.canScaleHeight
    ? Math.max(SHAPE_SCALING_MIN_SIZE, state.startHeight * appliedScaleY)
    : state.startManualBaseHeight
  const initialPreviewHeight = minimumHeight === null || minimumHeight === undefined
    ? scaledPreviewHeight
    : Math.max(scaledPreviewHeight, minimumHeight)
  const expandShapeHeightToFitText = !state.canScaleHeight
  const wrapPolicy = resolveShapeScalingTextWrapPolicy({
    isProportionalScaling: state.isProportionalScaling,
    startTextSplitByGrapheme: state.startTextSplitByGrapheme
  })

  return resolveShapeTextFixedWidthLayout({
    text,
    width: previewWidth,
    height: initialPreviewHeight,
    alignV: group.shapeAlignVertical ?? SHAPE_DEFAULT_VERTICAL_ALIGN,
    padding: resolveShapeScalingUserPadding({ group }),
    wrapPolicy,
    expandShapeHeightToFitText,
    measurementCache: state.previewTextMeasurementCache ?? undefined,
    resolveInternalShapeTextInset: ({ width, height }) => resolveShapeScalingInternalTextInset({
      group,
      width,
      height
    })
  })
}

/**
 * Returns the drag session's initial dimensions: the shape's current laid-out size and manual base dimensions.
 */
export function resolveShapeScalingStartDimensions({
  group,
  transform
}: {
  group: ShapeGroup
  transform?: Transform | null
}): ShapeScalingStartDimensions {
  const {
    canScaleWidth,
    canScaleHeight
  } = resolveShapeScaleActionAxes({
    transform
  })
  const startWidth = Math.max(
    SHAPE_SCALING_MIN_SIZE,
    group.shapeBaseWidth ?? group.width ?? group.shapeManualBaseWidth ?? SHAPE_SCALING_MIN_SIZE
  )
  const startHeight = Math.max(
    SHAPE_SCALING_MIN_SIZE,
    group.shapeBaseHeight ?? group.height ?? group.shapeManualBaseHeight ?? SHAPE_SCALING_MIN_SIZE
  )
  const startManualBaseWidth = Math.max(
    SHAPE_SCALING_MIN_SIZE,
    group.shapeManualBaseWidth ?? startWidth
  )
  const startManualBaseHeight = Math.max(
    SHAPE_SCALING_MIN_SIZE,
    group.shapeManualBaseHeight ?? startHeight
  )

  return {
    startWidth,
    startHeight,
    startManualBaseWidth,
    startManualBaseHeight,
    canScaleWidth,
    canScaleHeight
  }
}

function resolveShapeScalingStartTransform({
  group,
  transform
}: {
  group: ShapeGroup
  transform?: Transform | null
}): ShapeScalingStartTransform {
  const originalScaleX = resolveShapeTransformOriginalNumber({
    transform,
    key: 'scaleX'
  })
  const originalScaleY = resolveShapeTransformOriginalNumber({
    transform,
    key: 'scaleY'
  })
  const originalLeft = resolveShapeTransformOriginalNumber({
    transform,
    key: 'left'
  })
  const originalTop = resolveShapeTransformOriginalNumber({
    transform,
    key: 'top'
  })
  const startTransformOriginX = resolveShapeTransformOriginXValue({
    value: transform?.original?.originX ?? transform?.originX
  })
  const startTransformOriginY = resolveShapeTransformOriginYValue({
    value: transform?.original?.originY ?? transform?.originY
  })
  const scalingAnchorPoint = resolveShapeScalingAnchorPoint({
    group,
    originX: startTransformOriginX,
    originY: startTransformOriginY
  })
  const startTransformCorner = typeof transform?.corner === 'string'
    ? transform.corner
    : null

  return {
    startScaleX: Math.abs(originalScaleX ?? group.scaleX ?? 1) || 1,
    startScaleY: Math.abs(originalScaleY ?? group.scaleY ?? 1) || 1,
    startLeft: originalLeft ?? group.left ?? 0,
    startTop: originalTop ?? group.top ?? 0,
    startTransformOriginX,
    startTransformOriginY,
    startTransformCorner,
    scalingAnchorX: scalingAnchorPoint?.x ?? null,
    scalingAnchorY: scalingAnchorPoint?.y ?? null
  }
}

function createShapeScalingState({
  group,
  text,
  constraintPadding,
  transform
}: {
  group: ShapeGroup
  text: ShapeTextNode
  constraintPadding: ShapePadding
  transform?: Transform | null
}): ShapeScalingState {
  const startDimensions = resolveShapeScalingStartDimensions({
    group,
    transform
  })
  const startTransform = resolveShapeScalingStartTransform({
    group,
    transform
  })
  const isFixedWidthVerticalScaling = !startDimensions.canScaleWidth && startDimensions.canScaleHeight
  const previewTextMeasurementCache = {
    measurementsByKey: new Map(),
    splitByGraphemeByFrameWidth: new Map(),
    minimumTextFrameWidth: null
  }
  const proportionalTextConstraintCache = new Map<string, ShapeScalingProportionalTextConstraintCacheEntry>()
  const minimumHeightAtStart = resolveMinimumTextFitHeight({
    group,
    text,
    width: startDimensions.startWidth,
    padding: constraintPadding,
    measurementCache: previewTextMeasurementCache
  })

  return {
    ...startDimensions,
    cannotScaleDownAtStart: minimumHeightAtStart >= startDimensions.startHeight - SHAPE_SCALING_SCALE_EPSILON,
    startTextSplitByGrapheme: Boolean(text.splitByGrapheme),
    isProportionalScaling: false,
    blockedScaleAttempt: false,
    ...startTransform,
    scalingAnchorOriginX: startTransform.startTransformOriginX,
    scalingAnchorOriginY: startTransform.startTransformOriginY,
    crossedOppositeCorner: false,
    lastAllowedFlipX: Boolean(group.flipX),
    lastAllowedFlipY: Boolean(group.flipY),
    lastAllowedScaleX: startTransform.startScaleX,
    lastAllowedScaleY: startTransform.startScaleY,
    lastAllowedLeft: startTransform.startLeft,
    lastAllowedTop: startTransform.startTop,
    scaleDirectionX: null,
    scaleDirectionY: null,
    fixedWidthMinimumTextFitHeight: isFixedWidthVerticalScaling ? minimumHeightAtStart : null,
    previewTextMeasurementCache,
    proportionalTextConstraintCache
  }
}

/**
 * Creates the initial scaling state for a shape group.
 */
export function ensureShapeScalingState({
  scalingState,
  group,
  text,
  constraintPadding,
  transform
}: {
  scalingState: WeakMap<ShapeGroup, ShapeScalingState>
  group: ShapeGroup
  text: ShapeTextNode
  constraintPadding: ShapePadding
  transform?: Transform | null
}): ShapeScalingState {
  let state = scalingState.get(group)

  if (state) return state

  state = createShapeScalingState({
    group,
    text,
    constraintPadding,
    transform
  })

  scalingState.set(group, state)

  return state
}

/**
 * Returns the final commit-step dimensions, accounting for the axes actually scaled.
 */
export function resolveShapeScalingCommitDimensions({
  group,
  text,
  constraintPadding,
  startDimensions,
  scaleX,
  scaleY,
  wrapPolicy
}: {
  group: ShapeGroup
  text: ShapeTextNode
  constraintPadding: ShapePadding
  startDimensions: ShapeScalingStartDimensions
  scaleX: number
  scaleY: number
  wrapPolicy?: ShapeTextWrapPolicy
}): ShapeScalingCommitDimensions {
  const {
    previewWidth,
    previewHeight
  } = resolveShapeScalingPreviewDimensions({
    group,
    text,
    constraintPadding,
    startDimensions,
    appliedScaleX: scaleX,
    appliedScaleY: scaleY,
    wrapPolicy
  })
  const {
    startWidth,
    startHeight
  } = startDimensions
  const hasWidthChange = Math.abs(previewWidth - startWidth) > SHAPE_SCALING_SIZE_EPSILON
  const hasHeightChange = Math.abs(previewHeight - startHeight) > SHAPE_SCALING_SIZE_EPSILON

  return {
    width: previewWidth,
    height: previewHeight,
    hasWidthChange,
    hasDimensionChange: hasWidthChange || hasHeightChange
  }
}

/**
 * Returns which manual base dimensions to preserve after scaling ends.
 */
function resolveNextManualBaseDimensionsAfterScaling({
  startManualBaseWidth,
  startManualBaseHeight,
  canScaleWidth,
  canScaleHeight,
  finalWidth,
  finalHeight
}: {
  startManualBaseWidth: number
  startManualBaseHeight: number
  canScaleWidth: boolean
  canScaleHeight: boolean
  finalWidth: number
  finalHeight: number
}): ShapeScalingManualBaseDimensions {
  let nextManualBaseWidth = startManualBaseWidth
  if (canScaleWidth) {
    nextManualBaseWidth = finalWidth
  }

  let nextManualBaseHeight = startManualBaseHeight
  if (canScaleHeight) {
    nextManualBaseHeight = finalHeight
  }

  return {
    width: nextManualBaseWidth,
    height: nextManualBaseHeight
  }
}

/**
 * Applies the already chosen resize dimensions to the shape layout and resets temporary scale.
 */
export function commitResolvedShapeScalingLayout({
  group,
  shape,
  text,
  width,
  height,
  alignH,
  alignV,
  startManualBaseWidth,
  startManualBaseHeight,
  canScaleWidth,
  canScaleHeight,
  hasWidthChange,
  wrapPolicy
}: ShapeScalingLayoutCommit): void {
  const nextManualBaseDimensions = resolveNextManualBaseDimensionsAfterScaling({
    startManualBaseWidth,
    startManualBaseHeight,
    canScaleWidth,
    canScaleHeight,
    finalWidth: width,
    finalHeight: height
  })

  group.shapeManualBaseWidth = nextManualBaseDimensions.width
  group.shapeManualBaseHeight = nextManualBaseDimensions.height

  if (canScaleWidth && hasWidthChange) {
    // A committed width change switches the shape to the manual-width contract.
    group.shapeTextAutoExpand = false
  }

  const userPadding = resolveShapeScalingUserPadding({ group })
  const internalShapeTextInset = resolveShapeScalingInternalTextInset({
    group,
    width,
    height
  })
  const expandShapeHeightToFitText = !canScaleHeight
  const resolveInternalShapeTextInsetForSize = ({ width: nextWidth, height: nextHeight }: {
    width: number
    height: number
  }) => {
    return resolveShapeScalingInternalTextInset({
      group,
      width: nextWidth,
      height: nextHeight
    })
  }

  if (!canScaleWidth && canScaleHeight) {
    applyFixedWidthShapeTextLayout({
      group,
      shape,
      text,
      width,
      height,
      alignH,
      alignV,
      padding: userPadding,
      wrapPolicy,
      internalShapeTextInset,
      expandShapeHeightToFitText,
      resolveInternalShapeTextInset: resolveInternalShapeTextInsetForSize
    })
  } else {
    applyShapeTextLayout({
      group,
      shape,
      text,
      width,
      height,
      alignH,
      alignV,
      padding: userPadding,
      wrapPolicy,
      shapeTextAutoExpandEnabled: group.shapeTextAutoExpand !== false,
      internalShapeTextInset,
      expandShapeHeightToFitText,
      resolveInternalShapeTextInset: resolveInternalShapeTextInsetForSize
    })
  }

  group.shapeReplaceBoxWidth = Math.max(1, width)
  group.shapeReplaceBoxHeight = Math.max(1, height)

  text.set({
    scaleX: 1,
    scaleY: 1
  })

  group.set({
    scaleX: 1,
    scaleY: 1
  })

  group.setCoords()
  text.setCoords()
  shape.setCoords()
}
