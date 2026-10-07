import {
  MIN_SHAPE_TEXT_FRAME_SIZE,
  normalizeShapeLayoutPadding
} from './shape-padding'
import {
  ShapePadding,
  ShapePaddingChangeMap
} from '../types'

const TEXT_FRAME_FILL_EPSILON = 0.5
const MAX_MIN_FRAME_WIDTH_SEARCH_ITERATIONS = 12

/**
 * Minimal text contract for calculating the frame inside a shape.
 */
type ShapeLayoutText = {
  text?: string | null
}

/**
 * Arguments for measuring textbox height at a given frame width.
 */
type TextboxFrameMeasureParams<TText extends ShapeLayoutText> = {
  text: TText
  frameWidth: number
}

/**
 * Function for measuring textbox height inside the text frame.
 */
type MeasureTextboxHeightForFrame<TText extends ShapeLayoutText> = ({
  text,
  frameWidth
}: TextboxFrameMeasureParams<TText>) => number

/**
 * Arguments for calculating the minimum text-frame width.
 */
type MinimumTextFrameWidthParams<TText extends ShapeLayoutText> = {
  text: TText
}

/**
 * Function for calculating the minimum text-frame width.
 */
type ResolveMinimumTextFrameWidth<TText extends ShapeLayoutText> = ({
  text
}: MinimumTextFrameWidthParams<TText>) => number

/**
 * Arguments for constraining a padding pair to the total available space.
 */
type ClampPaddingPairParams = {
  start: number
  end: number
  maxTotalPadding: number
  startChanged: boolean
  endChanged: boolean
}

/**
 * Pair of padding values for opposite sides.
 */
type PaddingPair = {
  start: number
  end: number
}

/**
 * Arguments for calculating the final padding pair, accounting for the internal inset.
 */
type ResolveAppliedPaddingPairParams = {
  start: number
  end: number
  insetStart: number
  insetEnd: number
  maxTotalPadding: number
  startChanged: boolean
  endChanged: boolean
}

/**
 * Padding-pair result: effective values and the separate user-defined component.
 */
type AppliedPaddingPair = {
  appliedPaddingStart: number
  appliedPaddingEnd: number
  appliedUserPaddingStart: number
  appliedUserPaddingEnd: number
}

/**
 * Arguments for finding the minimum frame width for a given height.
 */
type ResolveMinimumFrameWidthToFitHeightParams<TText extends ShapeLayoutText> = {
  text: TText
  minFrameWidth: number
  maxFrameWidth: number
  frameHeight: number
  measureTextboxHeightForFrame: MeasureTextboxHeightForFrame<TText>
}

/**
 * Result of applying horizontal padding and the minimum required shape width.
 */
type ResolvedHorizontalPadding = {
  appliedPadding: Pick<ShapePadding, 'left' | 'right'>
  appliedUserPadding: Pick<ShapePadding, 'left' | 'right'>
  requiredWidth: number
}

/**
 * Arguments for applying horizontal padding.
 */
type ResolveAppliedHorizontalPaddingParams<TText extends ShapeLayoutText> = {
  text: TText
  width: number
  availableTextFrameHeight: number
  padding: ShapePadding
  internalShapeTextInset: ShapePadding
  expandShapeHeightToFitText: boolean
  changedPadding?: ShapePaddingChangeMap
  measureTextboxHeightForFrame: MeasureTextboxHeightForFrame<TText>
  resolveMinimumTextFrameWidth: ResolveMinimumTextFrameWidth<TText>
}

/**
 * Result of applying vertical padding.
 */
type ResolvedVerticalPadding = {
  appliedPadding: Pick<ShapePadding, 'top' | 'bottom'>
  appliedUserPadding: Pick<ShapePadding, 'top' | 'bottom'>
}

/**
 * Arguments for applying vertical padding.
 */
type ResolveAppliedVerticalPaddingParams = {
  padding: ShapePadding
  internalShapeTextInset: ShapePadding
  height: number
  textHeight: number
  changedPadding?: ShapePaddingChangeMap
}

/**
 * Complete arguments for calculating the shape's applied padding.
 */
type ResolveAppliedShapePaddingParams<TText extends ShapeLayoutText> = {
  text: TText
  width: number
  height: number
  padding: ShapePadding
  internalShapeTextInset?: ShapePadding
  expandShapeHeightToFitText: boolean
  changedPadding?: ShapePaddingChangeMap
  measureTextboxHeightForFrame: MeasureTextboxHeightForFrame<TText>
  resolveMinimumTextFrameWidth: ResolveMinimumTextFrameWidth<TText>
}

/**
 * Calculated applied padding and minimum shape dimensions for the selected layout.
 */
type ResolvedShapePadding = {
  appliedPadding: ShapePadding
  appliedUserPadding: ShapePadding
  requiredWidth: number
  requiredHeight: number
}

/**
 * Returns the available text-frame width for the given shape width.
 */
export function resolveTextFrameWidth({
  width,
  padding
}: {
  width: number
  padding: ShapePadding
}): number {
  const leftPadding = Math.max(0, padding.left)
  const rightPadding = Math.max(0, padding.right)

  return Math.max(MIN_SHAPE_TEXT_FRAME_SIZE, width - leftPadding - rightPadding)
}

/**
 * Checks whether the textbox contains visible text.
 */
function hasShapeTextContent({
  text
}: {
  text: ShapeLayoutText
}): boolean {
  const rawText = text.text ?? ''

  return rawText.trim().length > 0
}

/**
 * Constrains a padding pair to the total available space.
 * If only one side changed, tries to preserve the other without unnecessary changes.
 */
function clampPaddingPair({
  start,
  end,
  maxTotalPadding,
  startChanged,
  endChanged
}: ClampPaddingPairParams): PaddingPair {
  const safeStart = Math.max(0, start)
  const safeEnd = Math.max(0, end)
  const safeMaxTotalPadding = Math.max(0, maxTotalPadding)

  if (safeStart + safeEnd <= safeMaxTotalPadding + TEXT_FRAME_FILL_EPSILON) {
    return {
      start: safeStart,
      end: safeEnd
    }
  }

  if (startChanged && !endChanged) {
    const clampedEnd = Math.min(safeEnd, safeMaxTotalPadding)

    return {
      start: Math.min(safeStart, Math.max(0, safeMaxTotalPadding - clampedEnd)),
      end: clampedEnd
    }
  }

  if (endChanged && !startChanged) {
    const clampedStart = Math.min(safeStart, safeMaxTotalPadding)

    return {
      start: clampedStart,
      end: Math.min(safeEnd, Math.max(0, safeMaxTotalPadding - clampedStart))
    }
  }

  const totalPadding = safeStart + safeEnd
  if (totalPadding <= 0) {
    return {
      start: 0,
      end: 0
    }
  }

  const scale = safeMaxTotalPadding / totalPadding

  return {
    start: safeStart * scale,
    end: safeEnd * scale
  }
}

/**
 * Returns the final padding for a pair of sides and the separate user-defined component without the internal inset.
 * The internal inset is never reduced: insufficient space only reduces user-defined padding.
 */
function resolveAppliedPaddingPair({
  start,
  end,
  insetStart,
  insetEnd,
  maxTotalPadding,
  startChanged,
  endChanged
}: ResolveAppliedPaddingPairParams): AppliedPaddingPair {
  const safeInsetStart = Math.max(0, insetStart)
  const safeInsetEnd = Math.max(0, insetEnd)
  const maxTotalUserPadding = Math.max(
    0,
    maxTotalPadding - safeInsetStart - safeInsetEnd
  )
  const clampedUserPadding = clampPaddingPair({
    start: Math.max(0, start),
    end: Math.max(0, end),
    maxTotalPadding: maxTotalUserPadding,
    startChanged,
    endChanged
  })
  const appliedUserPaddingStart = Math.max(0, Math.floor(clampedUserPadding.start))
  const appliedUserPaddingEnd = Math.max(0, Math.floor(clampedUserPadding.end))

  return {
    appliedPaddingStart: safeInsetStart + appliedUserPaddingStart,
    appliedPaddingEnd: safeInsetEnd + appliedUserPaddingEnd,
    appliedUserPaddingStart,
    appliedUserPaddingEnd
  }
}

/**
 * Returns the minimum text-frame width at which the text still fits
 * within the given height.
 */
function resolveMinimumFrameWidthToFitHeight<TText extends ShapeLayoutText>({
  text,
  minFrameWidth,
  maxFrameWidth,
  frameHeight,
  measureTextboxHeightForFrame
}: ResolveMinimumFrameWidthToFitHeightParams<TText>): number {
  const safeMinFrameWidth = Math.max(MIN_SHAPE_TEXT_FRAME_SIZE, minFrameWidth)
  const safeMaxFrameWidth = Math.max(safeMinFrameWidth, maxFrameWidth)
  const safeFrameHeight = Math.max(MIN_SHAPE_TEXT_FRAME_SIZE, frameHeight)

  if (!hasShapeTextContent({ text })) return safeMinFrameWidth

  const minFrameHeight = measureTextboxHeightForFrame({
    text,
    frameWidth: safeMinFrameWidth
  })
  if (minFrameHeight <= safeFrameHeight + TEXT_FRAME_FILL_EPSILON) {
    return safeMinFrameWidth
  }

  const maxFrameHeight = measureTextboxHeightForFrame({
    text,
    frameWidth: safeMaxFrameWidth
  })
  if (maxFrameHeight > safeFrameHeight + TEXT_FRAME_FILL_EPSILON) {
    return safeMaxFrameWidth
  }

  let low = safeMinFrameWidth
  let high = safeMaxFrameWidth

  for (let iteration = 0; iteration < MAX_MIN_FRAME_WIDTH_SEARCH_ITERATIONS; iteration += 1) {
    const middle = (low + high) / 2
    const measuredHeight = measureTextboxHeightForFrame({
      text,
      frameWidth: middle
    })

    if (measuredHeight <= safeFrameHeight + TEXT_FRAME_FILL_EPSILON) {
      high = middle
      continue
    }

    low = middle
  }

  return high
}

/**
 * Chooses horizontal padding that does not require expanding the shape beyond the selected layout policy.
 */
function resolveAppliedHorizontalPadding<TText extends ShapeLayoutText>({
  text,
  width,
  availableTextFrameHeight,
  padding,
  internalShapeTextInset,
  expandShapeHeightToFitText,
  changedPadding,
  measureTextboxHeightForFrame,
  resolveMinimumTextFrameWidth
}: ResolveAppliedHorizontalPaddingParams<TText>): ResolvedHorizontalPadding {
  const safeWidth = Math.max(MIN_SHAPE_TEXT_FRAME_SIZE, width)
  const safeAvailableTextFrameHeight = Math.max(
    MIN_SHAPE_TEXT_FRAME_SIZE,
    availableTextFrameHeight
  )

  const hasTextContent = hasShapeTextContent({ text })
  const minimumFrameWidth = hasTextContent
    ? resolveMinimumTextFrameWidth({ text })
    : MIN_SHAPE_TEXT_FRAME_SIZE

  let requiredFrameWidth = minimumFrameWidth

  if (!expandShapeHeightToFitText) {
    requiredFrameWidth = resolveMinimumFrameWidthToFitHeight({
      text,
      minFrameWidth: minimumFrameWidth,
      maxFrameWidth: safeWidth,
      frameHeight: safeAvailableTextFrameHeight,
      measureTextboxHeightForFrame
    })
  }

  const requiredWidth = requiredFrameWidth
    + internalShapeTextInset.left
    + internalShapeTextInset.right

  const maxTotalPadding = Math.max(0, safeWidth - requiredFrameWidth)
  const pair = resolveAppliedPaddingPair({
    start: padding.left,
    end: padding.right,
    insetStart: internalShapeTextInset.left,
    insetEnd: internalShapeTextInset.right,
    maxTotalPadding,
    startChanged: Boolean(changedPadding?.left),
    endChanged: Boolean(changedPadding?.right)
  })

  return {
    appliedPadding: {
      left: pair.appliedPaddingStart,
      right: pair.appliedPaddingEnd
    },
    appliedUserPadding: {
      left: pair.appliedUserPaddingStart,
      right: pair.appliedUserPaddingEnd
    },
    requiredWidth
  }
}

/**
 * Chooses vertical padding within the already calculated shape height.
 */
function resolveAppliedVerticalPadding({
  padding,
  internalShapeTextInset,
  height,
  textHeight,
  changedPadding
}: ResolveAppliedVerticalPaddingParams): ResolvedVerticalPadding {
  const safeHeight = Math.max(MIN_SHAPE_TEXT_FRAME_SIZE, height)
  const safeTextHeight = Math.max(MIN_SHAPE_TEXT_FRAME_SIZE, textHeight)
  const maxTotalPadding = Math.max(0, safeHeight - safeTextHeight)

  const pair = resolveAppliedPaddingPair({
    start: padding.top,
    end: padding.bottom,
    insetStart: internalShapeTextInset.top,
    insetEnd: internalShapeTextInset.bottom,
    maxTotalPadding,
    startChanged: Boolean(changedPadding?.top),
    endChanged: Boolean(changedPadding?.bottom)
  })

  return {
    appliedPadding: {
      top: pair.appliedPaddingStart,
      bottom: pair.appliedPaddingEnd
    },
    appliedUserPadding: {
      top: pair.appliedUserPaddingStart,
      bottom: pair.appliedUserPaddingEnd
    }
  }
}

/**
 * Applies padding within the given shape dimensions and returns the final effective/user values
 * together with the minimum required width/height for the non-removable internal inset.
 */
export function resolveAppliedShapePadding<TText extends ShapeLayoutText>({
  text,
  width,
  height,
  padding,
  internalShapeTextInset,
  expandShapeHeightToFitText,
  changedPadding,
  measureTextboxHeightForFrame,
  resolveMinimumTextFrameWidth
}: ResolveAppliedShapePaddingParams<TText>): ResolvedShapePadding {
  const safeWidth = Math.max(MIN_SHAPE_TEXT_FRAME_SIZE, width)
  const safeHeight = Math.max(MIN_SHAPE_TEXT_FRAME_SIZE, height)

  const normalizedPadding = normalizeShapeLayoutPadding({
    padding
  })
  const normalizedInternalShapeTextInset = normalizeShapeLayoutPadding({
    padding: internalShapeTextInset
  })

  const hasHorizontalPaddingChange = Boolean(changedPadding?.left)
    || Boolean(changedPadding?.right)
  const hasVerticalPaddingChange = Boolean(changedPadding?.top)
    || Boolean(changedPadding?.bottom)
  const shouldPreserveVerticalPadding = !expandShapeHeightToFitText
    && hasHorizontalPaddingChange
    && !hasVerticalPaddingChange

  const verticalInset = normalizedInternalShapeTextInset.top
    + normalizedInternalShapeTextInset.bottom
  const preservedVerticalUserPadding = shouldPreserveVerticalPadding
    ? normalizedPadding.top + normalizedPadding.bottom
    : 0
  const reservedVerticalPadding = verticalInset + preservedVerticalUserPadding
  const availableTextFrameHeightForHorizontalFit = Math.max(
    MIN_SHAPE_TEXT_FRAME_SIZE,
    safeHeight - reservedVerticalPadding
  )

  const horizontalPadding = resolveAppliedHorizontalPadding({
    text,
    width: safeWidth,
    availableTextFrameHeight: availableTextFrameHeightForHorizontalFit,
    padding: normalizedPadding,
    internalShapeTextInset: normalizedInternalShapeTextInset,
    expandShapeHeightToFitText,
    changedPadding,
    measureTextboxHeightForFrame,
    resolveMinimumTextFrameWidth
  })

  const horizontalFramePadding = {
    top: 0,
    right: horizontalPadding.appliedPadding.right,
    bottom: 0,
    left: horizontalPadding.appliedPadding.left
  }
  const frameWidth = resolveTextFrameWidth({
    width: safeWidth,
    padding: horizontalFramePadding
  })

  const hasTextContent = hasShapeTextContent({ text })
  const measuredHeight = hasTextContent
    ? measureTextboxHeightForFrame({
      text,
      frameWidth
    })
    : MIN_SHAPE_TEXT_FRAME_SIZE
  const requestedVerticalUserPadding = normalizedPadding.top
    + normalizedPadding.bottom

  const requiredHeight = expandShapeHeightToFitText
    ? Math.max(
      safeHeight,
      measuredHeight + verticalInset + requestedVerticalUserPadding
    )
    : safeHeight

  const verticalPadding = resolveAppliedVerticalPadding({
    padding: normalizedPadding,
    internalShapeTextInset: normalizedInternalShapeTextInset,
    height: requiredHeight,
    textHeight: measuredHeight,
    changedPadding
  })

  return {
    appliedPadding: {
      top: verticalPadding.appliedPadding.top,
      right: horizontalPadding.appliedPadding.right,
      bottom: verticalPadding.appliedPadding.bottom,
      left: horizontalPadding.appliedPadding.left
    },
    appliedUserPadding: {
      top: verticalPadding.appliedUserPadding.top,
      right: horizontalPadding.appliedUserPadding.right,
      bottom: verticalPadding.appliedUserPadding.bottom,
      left: horizontalPadding.appliedUserPadding.left
    },
    requiredWidth: horizontalPadding.requiredWidth,
    requiredHeight
  }
}
