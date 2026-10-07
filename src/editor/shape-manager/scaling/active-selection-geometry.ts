import {
  Point,
  util,
  type ActiveSelection,
  type FabricObject,
  type Transform
} from 'fabric'
import { english, type Translate } from '../../i18n'
import type {
  ShapeGroup,
  ShapeTransformOriginX,
  ShapeTransformOriginY
} from '../types'
import {
  SHAPE_SCALING_SCALE_EPSILON,
  SHAPE_SCALING_SIZE_EPSILON
} from './shape-scaling-layout'
import {
  resolveShapeTransformOriginXValue,
  resolveShapeTransformOriginYValue
} from './shape-scaling-transform'

/** Tolerance for checking a rotated shape's canonical geometry. */
const ROTATED_SHAPE_GEOMETRY_EPSILON = 0.000000001

/** Checks whether a number equals zero within the geometry tolerance. */
function isApproximatelyZero(value: number): boolean {
  return Math.abs(value) <= ROTATED_SHAPE_GEOMETRY_EPSILON
}

/** Checks a child shape's canonical scale, skew, and flip. */
function hasCanonicalShapeTransform({ group }: { group: ShapeGroup }): boolean {
  const affineOffsets = [
    (group.scaleX ?? 1) - 1,
    (group.scaleY ?? 1) - 1,
    group.skewX ?? 0,
    group.skewY ?? 0
  ]

  return affineOffsets.every(isApproximatelyZero) && !group.flipX && !group.flipY
}

/** Checks that the temporary frame contains no skew or flip. */
function hasSupportedSelectionTransform({
  selection
}: {
  selection: ActiveSelection
}): boolean {
  const skew = [selection.skewX ?? 0, selection.skewY ?? 0]

  return skew.every(isApproximatelyZero) && !selection.flipX && !selection.flipY
}

/** Immutable geometry of a rotated shape in the selection's local plane. */
export type RotatedActiveSelectionShapeGeometry = Readonly<{
  angle: number
  center: Point
}>

/** Child-object bounds in the selection's immutable local plane. */
export type ActiveSelectionLocalBounds = Readonly<{
  bottom: number
  left: number
  right: number
  top: number
}>

/** Vertical anchoring of a shape to the original selection frame. */
export type ActiveSelectionVerticalAttachment = 'top' | 'bottom' | 'center'

/** Transform remaining on the restored selection frame. */
export type ActiveSelectionTransformState = Readonly<{
  angle: number
  flipX: boolean
  flipY: boolean
  scaleX: number
  scaleY: number
  skewX: number
  skewY: number
}>

/** Selection-frame dimensions and position after applying the latest scaling frame. */
export type ActiveSelectionCommittedFrame = Readonly<{
  center: Point
  height: number
  transformState: ActiveSelectionTransformState
  width: number
}>

/** Saves the frame's last visible state before transferring scale into child objects. */
export function captureActiveSelectionCommittedFrame({
  t = english,
  selection
}: {
  t?: Translate
  selection: ActiveSelection
}): ActiveSelectionCommittedFrame {
  const center = selection.getCenterPoint()
  const width = selection.width * Math.abs(selection.scaleX ?? 1)
  const height = selection.height * Math.abs(selection.scaleY ?? 1)

  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error(t('shape.errors.invalidRestoredSelectionSize'))
  }
  if (!Number.isFinite(center.x) || !Number.isFinite(center.y)) {
    throw new Error(t('shape.errors.invalidRestoredSelectionCenter'))
  }

  return {
    center,
    height,
    transformState: {
      angle: selection.angle ?? 0,
      flipX: Boolean(selection.flipX),
      flipY: Boolean(selection.flipY),
      scaleX: 1,
      scaleY: 1,
      skewX: selection.skewX ?? 0,
      skewY: selection.skewY ?? 0
    },
    width
  }
}

/**
 * Returns the geometry of a canonical rotated shape that requires compensation
 * for the selection's nonuniform scale.
 */
export function captureRotatedActiveSelectionShapeGeometry({
  t = english,
  group,
  selection
}: {
  t?: Translate
  group: ShapeGroup
  selection: ActiveSelection
}): RotatedActiveSelectionShapeGeometry | null {
  const angle = group.angle ?? 0
  if (isApproximatelyZero(angle)) return null
  if (!hasCanonicalShapeTransform({ group })) return null
  if (!hasSupportedSelectionTransform({ selection })) return null

  const center = group.getRelativeCenterPoint()
  if (!Number.isFinite(angle)) throw new Error(t('shape.errors.invalidRotatedShapeAngle'))
  if (!Number.isFinite(center.x) || !Number.isFinite(center.y)) {
    throw new Error(t('shape.errors.invalidRotatedShapeCenter'))
  }

  return { angle, center }
}

/**
 * Compensates for the selection transform so the shape retains its own angle
 * and receives the already calculated canonical dimensions without skew in scene coordinates.
 */
export function applyRotatedActiveSelectionShapeGeometry({
  t = english,
  geometry,
  group,
  selection
}: {
  t?: Translate
  geometry: RotatedActiveSelectionShapeGeometry
  group: ShapeGroup
  selection: ActiveSelection
}): void {
  const selectionMatrix = selection.calcTransformMatrix()
  const sceneCenter = geometry.center.transform(selectionMatrix)
  const sceneAngle = (selection.angle ?? 0) + geometry.angle
  const sceneMatrix = util.composeMatrix({
    angle: sceneAngle,
    translateX: sceneCenter.x,
    translateY: sceneCenter.y
  })
  const localMatrix = util.multiplyTransformMatrices(
    util.invertTransform(selectionMatrix),
    sceneMatrix
  )

  if (!Number.isFinite(sceneCenter.x) || !Number.isFinite(sceneCenter.y)) {
    throw new Error(t('shape.errors.invalidFinalRotatedShapeCenter'))
  }
  if (!localMatrix.every(Number.isFinite)) {
    throw new Error(t('shape.errors.invalidRotatedShapeCompensationMatrix'))
  }

  util.applyTransformToObject(group, localMatrix)
  group.setCoords()
}

/** Returns the exact local bounds of a direct child of the selection. */
export function resolveActiveSelectionObjectLocalBounds({
  target
}: {
  target: FabricObject
}): ActiveSelectionLocalBounds {
  const corners = [
    target.getPositionByOrigin('left', 'top'),
    target.getPositionByOrigin('right', 'top'),
    target.getPositionByOrigin('right', 'bottom'),
    target.getPositionByOrigin('left', 'bottom')
  ]
  const xCoordinates = corners.map(({ x }) => x)
  const yCoordinates = corners.map(({ y }) => y)

  return Object.freeze({
    bottom: Math.max(...yCoordinates),
    left: Math.min(...xCoordinates),
    right: Math.max(...xCoordinates),
    top: Math.min(...yCoordinates)
  })
}

/** Combines the local bounds of two parts of the selection. */
export function mergeActiveSelectionLocalBounds({
  current,
  next
}: {
  current: ActiveSelectionLocalBounds
  next: ActiveSelectionLocalBounds
}): ActiveSelectionLocalBounds {
  return Object.freeze({
    bottom: Math.max(current.bottom, next.bottom),
    left: Math.min(current.left, next.left),
    right: Math.max(current.right, next.right),
    top: Math.min(current.top, next.top)
  })
}

/** Determines the nearest vertical anchor for the shape within the original frame. */
export function resolveActiveSelectionVerticalAttachment({
  selectionBounds,
  shapeBounds
}: {
  selectionBounds: ActiveSelectionLocalBounds
  shapeBounds: ActiveSelectionLocalBounds
}): ActiveSelectionVerticalAttachment {
  const topGap = Math.max(0, shapeBounds.top - selectionBounds.top)
  const bottomGap = Math.max(0, selectionBounds.bottom - shapeBounds.bottom)
  const isTopAttached = topGap <= SHAPE_SCALING_SIZE_EPSILON
  const isBottomAttached = bottomGap <= SHAPE_SCALING_SIZE_EPSILON

  if (isTopAttached && !isBottomAttached) return 'top'
  if (isBottomAttached && !isTopAttached) return 'bottom'
  if (Math.abs(topGap - bottomGap) <= SHAPE_SCALING_SIZE_EPSILON) return 'center'

  return topGap < bottomGap ? 'top' : 'bottom'
}

/** Converts a Fabric anchor point to a numeric offset from the center. */
export function resolveActiveSelectionOriginOffset({
  origin
}: {
  origin: ShapeTransformOriginX | ShapeTransformOriginY
}): number {
  if (origin === 'left' || origin === 'top') return -0.5
  if (origin === 'right' || origin === 'bottom') return 0.5
  if (origin === 'center') return 0

  return origin - 0.5
}

/** Preserves an unrotated shape's original anchor within the temporary frame. */
export function positionActiveSelectionShape({
  bounds,
  group,
  transformOriginPointX,
  transformOriginX,
  verticalAttachment
}: {
  bounds: ActiveSelectionLocalBounds
  group: ShapeGroup
  transformOriginPointX: number
  transformOriginX: ShapeTransformOriginX
  verticalAttachment: ActiveSelectionVerticalAttachment
}): void {
  if (verticalAttachment === 'top') {
    group.setPositionByOrigin(new Point(transformOriginPointX, bounds.top), transformOriginX, 'top')
    return
  }
  if (verticalAttachment === 'bottom') {
    group.setPositionByOrigin(new Point(transformOriginPointX, bounds.bottom), transformOriginX, 'bottom')
    return
  }

  group.setPositionByOrigin(
    new Point(transformOriginPointX, (bounds.top + bounds.bottom) / 2),
    transformOriginX,
    'center'
  )
}

/** Applies the constrained scale to the frame and preserves the current gesture's fixed point. */
export function applyActiveSelectionScale({
  scaleX,
  scaleY,
  selection,
  transform
}: {
  scaleX: number
  scaleY: number
  selection: ActiveSelection
  transform: Transform
}): void {
  const currentScaleX = Math.abs(selection.scaleX ?? 1) || 1
  const currentScaleY = Math.abs(selection.scaleY ?? 1) || 1
  const hasScaleChange = Math.abs(currentScaleX - scaleX) > SHAPE_SCALING_SCALE_EPSILON
    || Math.abs(currentScaleY - scaleY) > SHAPE_SCALING_SCALE_EPSILON

  if (!hasScaleChange) return

  const originX = resolveShapeTransformOriginXValue({ value: transform.originX })
  const originY = resolveShapeTransformOriginYValue({ value: transform.originY })
  const anchorPoint = originX !== null && originY !== null
    ? selection.getPositionByOrigin(originX, originY)
    : null

  selection.set({
    flipX: false,
    flipY: false,
    scaleX,
    scaleY
  })

  if (anchorPoint && originX !== null && originY !== null) {
    selection.setPositionByOrigin(anchorPoint, originX, originY)
  }

  selection.setCoords()
}
