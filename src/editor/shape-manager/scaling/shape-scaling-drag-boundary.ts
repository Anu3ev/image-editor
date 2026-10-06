import type {
  Canvas,
  Transform
} from 'fabric'

import type {
  ShapeGroup,
  ShapeScalingState
} from '../types'
import {
  SHAPE_SCALING_MIN_SIZE,
  SHAPE_SCALING_SCALE_EPSILON,
  type ShapeScalingPointerEvent
} from './shape-scaling-layout'
import type { ShapeModifiedEvent } from './shape-scaling-types'
import {
  resolveScaleLocalPointerForTransform,
  resolveShapeScaleActionAxes,
  resolveShapeScaleDirection
} from './shape-scaling-transform'

/** Returns the current gesture's scale only along the axes being changed. */
export function resolveCurrentShapeDragScales({
  group,
  state
}: {
  group: ShapeGroup
  state: ShapeScalingState
}): Readonly<{ scaleX: number; scaleY: number }> {
  const rawScaleX = Math.abs(group.scaleX ?? state.startScaleX) || state.startScaleX
  const rawScaleY = Math.abs(group.scaleY ?? state.startScaleY) || state.startScaleY

  return {
    scaleX: state.canScaleWidth ? rawScaleX : state.startScaleX,
    scaleY: state.canScaleHeight ? rawScaleY : state.startScaleY
  }
}

/** Checks whether the pointer reached the active transform's original point along the selected axis. */
export function hasShapePointerReachedScaleOrigin({
  axis,
  canvas,
  event,
  group,
  state
}: {
  axis: 'x' | 'y'
  canvas: Canvas
  event: ShapeModifiedEvent
  group: ShapeGroup
  state?: ShapeScalingState
}): boolean {
  const { transform } = event
  if (!transform) return false

  const transformWithSign = transform as Transform & { signX?: number; signY?: number }
  const storedDirection = axis === 'x' ? state?.scaleDirectionX ?? null : state?.scaleDirectionY ?? null
  const transformSign = axis === 'x' ? transformWithSign.signX : transformWithSign.signY
  const sign = resolveShapeScaleDirection({ value: transformSign }) ?? storedDirection
  if (sign === null) return false

  const localPoint = resolveScaleLocalPointerForTransform({
    canvas,
    event: event.e,
    target: group,
    transform
  })
  if (!localPoint) return false

  const coordinate = axis === 'x' ? localPoint.x : localPoint.y

  return (coordinate * sign) <= 0
}

/** Checks whether the shape's width must be held at its minimum boundary. */
export function shouldClampShapeWidthToMinimum({
  canvas,
  event,
  group,
  minimumWidth,
  state
}: {
  canvas: Canvas
  event: ShapeModifiedEvent
  group: ShapeGroup
  minimumWidth: number
  state?: ShapeScalingState
}): boolean {
  if (!state || !event.transform) return false
  if (!resolveShapeScaleActionAxes({ transform: event.transform }).canScaleWidth) return false
  if (!hasShapePointerReachedScaleOrigin({ axis: 'x', canvas, event, group, state })) return false

  const minimumScaleX = Math.max(
    SHAPE_SCALING_MIN_SIZE / state.startWidth,
    minimumWidth / state.startWidth
  )

  return state.lastAllowedScaleX > minimumScaleX + SHAPE_SCALING_SCALE_EPSILON
}

/** Checks whether the shape's height must be held at its minimum boundary. */
export function shouldClampShapeHeightToMinimum({
  canvas,
  event,
  group,
  minimumHeight,
  state
}: {
  canvas: Canvas
  event: ShapeModifiedEvent
  group: ShapeGroup
  minimumHeight: number
  state?: ShapeScalingState
}): boolean {
  if (!state || !event.transform) return false
  if (!resolveShapeScaleActionAxes({ transform: event.transform }).canScaleHeight) return false
  if (!hasShapePointerReachedScaleOrigin({ axis: 'y', canvas, event, group, state })) return false

  const minimumScaleY = Math.max(
    SHAPE_SCALING_MIN_SIZE / state.startHeight,
    minimumHeight / state.startHeight
  )

  return state.lastAllowedScaleY > minimumScaleY + SHAPE_SCALING_SCALE_EPSILON
}

/** Captures axis directions not yet known from Fabric-transform attributes. */
function storeTransformScaleDirections({
  canScaleHeight,
  canScaleWidth,
  state,
  transform
}: {
  canScaleHeight: boolean
  canScaleWidth: boolean
  state: ShapeScalingState
  transform: Transform
}): void {
  const transformWithSign = transform as Transform & { signX?: number; signY?: number }

  if (canScaleWidth && state.scaleDirectionX === null) {
    state.scaleDirectionX = resolveShapeScaleDirection({ value: transformWithSign.signX })
  }
  if (canScaleHeight && state.scaleDirectionY === null) {
    state.scaleDirectionY = resolveShapeScaleDirection({ value: transformWithSign.signY })
  }
}

/** Fills in unknown axis directions from the pointer's local position. */
function storePointerScaleDirections({
  canScaleHeight,
  canScaleWidth,
  localX,
  localY,
  state
}: {
  canScaleHeight: boolean
  canScaleWidth: boolean
  localX: number
  localY: number
  state: ShapeScalingState
}): void {
  if (canScaleWidth && state.scaleDirectionX === null) {
    state.scaleDirectionX = resolveShapeScaleDirection({ value: localX })
  }
  if (canScaleHeight && state.scaleDirectionY === null) {
    state.scaleDirectionY = resolveShapeScaleDirection({ value: localY })
  }
}

/** Captures the shrinking direction for each changed axis once per gesture. */
export function storeShapeScaleDirectionsForCurrentTransform({
  canvas,
  event,
  group,
  state,
  transform
}: {
  canvas: Canvas
  event?: ShapeScalingPointerEvent
  group: ShapeGroup
  state: ShapeScalingState
  transform?: Transform | null
}): void {
  if (!transform) return

  const axes = resolveShapeScaleActionAxes({ transform })
  if (!axes.isCornerScaleAction) return

  storeTransformScaleDirections({ ...axes, state, transform })
  const hasWidthDirection = !axes.canScaleWidth || state.scaleDirectionX !== null
  const hasHeightDirection = !axes.canScaleHeight || state.scaleDirectionY !== null
  if (hasWidthDirection && hasHeightDirection) return

  const localPoint = resolveScaleLocalPointerForTransform({ canvas, event, target: group, transform })
  if (!localPoint) return

  storePointerScaleDirections({
    ...axes,
    localX: localPoint.x,
    localY: localPoint.y,
    state
  })
}
