import type {
  ActiveSelection,
  Transform
} from 'fabric'

import {
  SHAPE_DEFAULT_HORIZONTAL_ALIGN,
  SHAPE_DEFAULT_VERTICAL_ALIGN
} from '../domain/shape-presets'
import { getShapeNodes } from '../domain/shape-nodes'
import type {
  ShapeGroup,
  ShapeScalingState
} from '../types'
import {
  commitResolvedShapeScalingLayout,
  resolveShapeScalingCommitDimensions,
  resolveShapeScalingConstraintPadding,
  resolveShapeScalingStartDimensions,
  resolveShapeScalingTextWrapPolicy,
  SHAPE_SCALING_SCALE_EPSILON as SCALE_EPSILON
} from './shape-scaling-layout'
import type { ShapeScalingStartDimensions } from './shape-scaling-layout'
import { resolveShapeScaleActionAxes } from './shape-scaling-transform'

/** Multipliers applied to the internal layout of a single shape. */
export type ActiveSelectionShapeLayoutScale = Readonly<{
  scaleX: number
  scaleY: number
}>

/** Prepared shape commit, finalized after the entire selection is successfully committed. */
export type ActiveSelectionShapeScaleCommit = Readonly<{
  groups: readonly ShapeGroup[]
  selection: ActiveSelection
}>

/** Restores the original dimensions and axes affected by the transform being finalized. */
function resolveCommitStartDimensions({
  group,
  scaleX,
  scaleY,
  state,
  transform
}: {
  group: ShapeGroup
  scaleX: number
  scaleY: number
  state?: ShapeScalingState
  transform?: Transform | null
}): ShapeScalingStartDimensions {
  const resolvedAxes = transform ? resolveShapeScaleActionAxes({ transform }) : null
  const captured = state ?? resolveShapeScalingStartDimensions({ group, transform })

  return {
    ...captured,
    canScaleWidth: state?.canScaleWidth
      ?? resolvedAxes?.canScaleWidth
      ?? (Math.abs(scaleX - 1) > SCALE_EPSILON),
    canScaleHeight: state?.canScaleHeight
      ?? resolvedAxes?.canScaleHeight
      ?? (Math.abs(scaleY - 1) > SCALE_EPSILON)
  }
}

/** Commits a single shape's canonical dimensions after scaling the selection. */
export function commitActiveSelectionShapeGroupScaling({
  group,
  layoutScale,
  scaleX,
  scaleY,
  state,
  transform
}: {
  group: ShapeGroup
  layoutScale?: ActiveSelectionShapeLayoutScale
  scaleX: number
  scaleY: number
  state?: ShapeScalingState
  transform?: Transform | null
}): boolean {
  const { shape, text } = getShapeNodes({ group })
  if (!shape || !text) return false

  const startDimensions = resolveCommitStartDimensions({ group, scaleX, scaleY, state, transform })
  const constraintPadding = resolveShapeScalingConstraintPadding({ group })
  const wrapPolicy = resolveShapeScalingTextWrapPolicy({
    isProportionalScaling: state?.isProportionalScaling,
    startTextSplitByGrapheme: state?.startTextSplitByGrapheme
  })
  const dimensions = resolveShapeScalingCommitDimensions({
    group,
    text,
    constraintPadding,
    startDimensions,
    scaleX: layoutScale?.scaleX ?? scaleX,
    scaleY: layoutScale?.scaleY ?? scaleY,
    wrapPolicy
  })
  if (!dimensions.hasDimensionChange && !state && !layoutScale) return false

  commitResolvedShapeScalingLayout({
    group,
    shape,
    text,
    width: dimensions.width,
    height: dimensions.height,
    alignH: group.shapeAlignHorizontal ?? SHAPE_DEFAULT_HORIZONTAL_ALIGN,
    alignV: group.shapeAlignVertical ?? SHAPE_DEFAULT_VERTICAL_ALIGN,
    startManualBaseWidth: startDimensions.startManualBaseWidth,
    startManualBaseHeight: startDimensions.startManualBaseHeight,
    canScaleWidth: startDimensions.canScaleWidth,
    canScaleHeight: startDimensions.canScaleHeight,
    hasWidthChange: dimensions.hasWidthChange,
    wrapPolicy
  })

  return dimensions.hasDimensionChange || Boolean(state || layoutScale)
}
