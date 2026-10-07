import type {
  ShapeTransformOriginX
} from '../types'
import {
  resolveActiveSelectionOriginOffset,
  type ActiveSelectionLocalBounds,
  type ActiveSelectionVerticalAttachment
} from './active-selection-geometry'
import {
  SHAPE_SCALING_MIN_SIZE
} from './shape-scaling-layout'

/** Constraints of a single shape that affect the shared frame's proportional scale. */
type ActiveSelectionShapeScaleConstraint = Readonly<{
  availableHeight: number
  availableWidth: number
  canScaleHeight: boolean
  canScaleWidth: boolean
  minimumHeight: number
  minimumWidth: number
}>

/** Initial dimensions and permitted layout axes for a single shape. */
type ActiveSelectionShapeScaleLimits = Readonly<{
  canScaleHeight: boolean
  canScaleWidth: boolean
  startHeight: number
  startWidth: number
}>

/** Returns the available width of the shared frame for a specific shape. */
export function resolveSelectionAvailableWidth({
  originX,
  selectionBounds,
  shapeBounds
}: {
  originX: ShapeTransformOriginX
  selectionBounds: ActiveSelectionLocalBounds
  shapeBounds: ActiveSelectionLocalBounds
}): number {
  const originOffset = resolveActiveSelectionOriginOffset({ origin: originX })

  if (originOffset > 0) {
    return Math.max(SHAPE_SCALING_MIN_SIZE, shapeBounds.right - selectionBounds.left)
  }
  if (originOffset < 0) {
    return Math.max(SHAPE_SCALING_MIN_SIZE, selectionBounds.right - shapeBounds.left)
  }

  const shapeCenterX = (shapeBounds.left + shapeBounds.right) / 2

  return Math.max(
    SHAPE_SCALING_MIN_SIZE,
    2 * Math.min(
      shapeCenterX - selectionBounds.left,
      selectionBounds.right - shapeCenterX
    )
  )
}

/** Returns the available height of the shared frame for a specific shape. */
export function resolveSelectionAvailableHeight({
  selectionBounds,
  shapeBounds,
  verticalAttachment
}: {
  selectionBounds: ActiveSelectionLocalBounds
  shapeBounds: ActiveSelectionLocalBounds
  verticalAttachment: ActiveSelectionVerticalAttachment
}): number {
  if (verticalAttachment === 'top') {
    return Math.max(SHAPE_SCALING_MIN_SIZE, selectionBounds.bottom - shapeBounds.top)
  }

  if (verticalAttachment === 'bottom') {
    return Math.max(SHAPE_SCALING_MIN_SIZE, shapeBounds.bottom - selectionBounds.top)
  }

  const shapeCenterY = (shapeBounds.top + shapeBounds.bottom) / 2

  return Math.max(
    SHAPE_SCALING_MIN_SIZE,
    2 * Math.min(
      shapeCenterY - selectionBounds.top,
      selectionBounds.bottom - shapeCenterY
    )
  )
}

/** Builds a single shape's constraint in the shared frame's coordinates. */
export function resolveActiveSelectionShapeScaleConstraint({
  layoutMinimumScale,
  limits,
  selectionBounds,
  shapeBounds,
  transformOriginX,
  verticalAttachment
}: {
  layoutMinimumScale: number
  limits: ActiveSelectionShapeScaleLimits
  selectionBounds: ActiveSelectionLocalBounds
  shapeBounds: ActiveSelectionLocalBounds
  transformOriginX: ShapeTransformOriginX
  verticalAttachment: ActiveSelectionVerticalAttachment
}): ActiveSelectionShapeScaleConstraint {
  return {
    availableHeight: resolveSelectionAvailableHeight({
      selectionBounds,
      shapeBounds,
      verticalAttachment
    }),
    availableWidth: resolveSelectionAvailableWidth({
      originX: transformOriginX,
      selectionBounds,
      shapeBounds
    }),
    canScaleHeight: limits.canScaleHeight,
    canScaleWidth: limits.canScaleWidth,
    minimumHeight: limits.canScaleHeight
      ? Math.max(SHAPE_SCALING_MIN_SIZE, limits.startHeight * layoutMinimumScale)
      : limits.startHeight,
    minimumWidth: limits.canScaleWidth
      ? Math.max(SHAPE_SCALING_MIN_SIZE, limits.startWidth * layoutMinimumScale)
      : limits.startWidth
  }
}

/** Converts the shape's minimum size into the shared frame's minimum scale. */
export function resolveMinimumSelectionScaleForSize({
  allowGrowth,
  minimumSize,
  startSize
}: {
  allowGrowth: boolean
  minimumSize: number
  startSize: number
}): number {
  const minimumScale = Math.max(
    SHAPE_SCALING_MIN_SIZE / startSize,
    minimumSize / startSize
  )

  if (allowGrowth) return minimumScale

  return Math.min(1, minimumScale)
}

/** Returns a shared-frame scale sufficient to satisfy all shape constraints. */
export function resolveProportionalSelectionScale({
  allowGrowthX,
  allowGrowthY,
  constraints,
  requestedScale
}: {
  allowGrowthX: boolean
  allowGrowthY: boolean
  constraints: readonly ActiveSelectionShapeScaleConstraint[]
  requestedScale: number
}): number {
  let appliedScale = requestedScale

  for (const constraint of constraints) {
    const minimumScaleX = constraint.canScaleWidth
      ? resolveMinimumSelectionScaleForSize({
        allowGrowth: allowGrowthX,
        minimumSize: constraint.minimumWidth,
        startSize: constraint.availableWidth
      })
      : requestedScale
    const minimumScaleY = constraint.canScaleHeight
      ? resolveMinimumSelectionScaleForSize({
        allowGrowth: allowGrowthY,
        minimumSize: constraint.minimumHeight,
        startSize: constraint.availableHeight
      })
      : requestedScale

    appliedScale = Math.max(appliedScale, minimumScaleX, minimumScaleY)
  }

  return appliedScale
}
