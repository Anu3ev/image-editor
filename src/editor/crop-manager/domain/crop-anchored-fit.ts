/* eslint-disable no-use-before-define -- Keep the public fit above its private calculations. */
import {
  Point,
  type FabricObject,
  type Rect,
  type TOriginX,
  type TOriginY
} from 'fabric'

import {
  MIN_CROP_FRAME_HEIGHT,
  MIN_CROP_FRAME_WIDTH,
  SOURCE_FIT_EPSILON,
  getSourceSize,
  mapFramePointsToSource,
  type CropAxisShrink
} from './crop-geometry'
import { getCropFrameSourceSize } from './crop-frame-size'

/** Frame axes that the current resize gesture changes. */
export type CropResizeAxes = {
  x: boolean
  y: boolean
}

/** Linear constraint `x * multiplierX + y * multiplierY <= limit` that keeps one frame corner inside the source. */
type CropFitConstraint = {
  x: number
  y: number
  limit: number
}

/**
 * Result of fitting a resized frame: it already fit, it was shrunk to fit, or no allowed size fits.
 */
export type CropAnchoredFitResult = 'unchanged' | 'shrunk' | 'impossible'

/** Constraint coefficient below which a constraint does not depend on a multiplier. */
const COEFFICIENT_EPSILON = 0.000000001

/**
 * Shrinks a resized crop frame around its fixed point until all its corners are inside the source. Returns
 * `impossible` when no size of at least the minimum crop size fits, so the caller can fall back to the regular clamp.
 * Box-based source limits do not work when the frame is a parallelogram in source coordinates, so the corners are
 * fitted directly. Each corner position is linear in the axis scale multipliers, which turns every source edge into
 * one linear constraint. A proportional resize and a side handle shrink along one multiplier; a free corner resize
 * keeps the size closest to the one the pointer asks for.
 */
export function fitResizedCropFrameToSource({
  source,
  frame,
  originX,
  originY,
  axes,
  preserveAspectRatio
}: {
  source: FabricObject
  frame: Rect
  originX: TOriginX
  originY: TOriginY
  axes: CropResizeAxes
  preserveAspectRatio: boolean
}): CropAnchoredFitResult {
  // Fabric origin points include the stroke, whose local size changes with the scale under strokeUniform, so the
  // fixed point is taken on the stroke-free frame that the source constraint is about.
  const localFixedPoint = new Point(
    resolveOriginOffset({ origin: originX }) * frame.width,
    resolveOriginOffset({ origin: originY }) * frame.height
  )
  const constraints = getCornerFitConstraints({ source, frame, localFixedPoint })
  if (isWithinConstraints({ constraints, multipliers: { x: 1, y: 1 } })) return 'unchanged'

  const frameSize = getCropFrameSourceSize({ frame })
  const minimum = {
    x: Math.min(1, MIN_CROP_FRAME_WIDTH / frameSize.width),
    y: Math.min(1, MIN_CROP_FRAME_HEIGHT / frameSize.height)
  }
  const multipliers = preserveAspectRatio || !axes.x || !axes.y
    ? resolveLineMultipliers({ constraints, minimum, axes: preserveAspectRatio ? { x: true, y: true } : axes })
    : resolveClosestMultipliers({
      constraints,
      minimum,
      width: frame.width * (frame.scaleX ?? 1),
      height: frame.height * (frame.scaleY ?? 1)
    })
  if (!multipliers) return 'impossible'

  const fixedPoint = localFixedPoint.transform(frame.calcTransformMatrix())
  frame.set({
    scaleX: (frame.scaleX ?? 1) * multipliers.x,
    scaleY: (frame.scaleY ?? 1) * multipliers.y
  })
  const movedFixedPoint = localFixedPoint.transform(frame.calcTransformMatrix())
  frame.set({
    left: frame.left + (fixedPoint.x - movedFixedPoint.x),
    top: frame.top + (fixedPoint.y - movedFixedPoint.y)
  })
  frame.setCoords()

  return 'shrunk'
}

/**
 * Returns the origin position relative to the object center as a share of its size, from -0.5 to 0.5.
 */
function resolveOriginOffset({ origin }: { origin: TOriginX | TOriginY }): number {
  if (typeof origin === 'number') return origin - 0.5
  if (origin === 'left' || origin === 'top') return -0.5
  if (origin === 'right' || origin === 'bottom') return 0.5

  return 0
}

/**
 * Returns the constraints that keep every frame corner inside the source when the frame scales around a point.
 */
function getCornerFitConstraints({
  source,
  frame,
  localFixedPoint
}: {
  source: FabricObject
  frame: Rect
  localFixedPoint: Point
}): CropFitConstraint[] {
  const { width, height } = getSourceSize({ source })
  const halfWidth = frame.width / 2
  const halfHeight = frame.height / 2
  const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([signX, signY]) => {
    return new Point(signX * halfWidth, signY * halfHeight)
  })
  // Each corner is reached from the fixed point by one step along the frame X axis and one along its Y axis.
  const [sourceFixedPoint, ...sourceAxisSteps] = mapFramePointsToSource({
    source,
    frame,
    points: [
      localFixedPoint,
      ...corners.flatMap((corner) => [
        new Point(corner.x, localFixedPoint.y),
        new Point(localFixedPoint.x, corner.y)
      ])
    ]
  })

  return corners.flatMap((_, index) => {
    const alongX = sourceAxisSteps[index * 2].subtract(sourceFixedPoint)
    const alongY = sourceAxisSteps[(index * 2) + 1].subtract(sourceFixedPoint)

    return [
      { x: alongX.x, y: alongY.x, limit: (width / 2) - sourceFixedPoint.x },
      { x: -alongX.x, y: -alongY.x, limit: (width / 2) + sourceFixedPoint.x },
      { x: alongX.y, y: alongY.y, limit: (height / 2) - sourceFixedPoint.y },
      { x: -alongX.y, y: -alongY.y, limit: (height / 2) + sourceFixedPoint.y }
    ]
  })
}

/**
 * Returns true if the multipliers keep every constraint within the fit tolerance.
 */
function isWithinConstraints({
  constraints,
  multipliers
}: {
  constraints: CropFitConstraint[]
  multipliers: CropAxisShrink
}): boolean {
  return constraints.every(({ x, y, limit }) => {
    return (x * multipliers.x) + (y * multipliers.y) <= limit + SOURCE_FIT_EPSILON
  })
}

/**
 * Returns the largest multiplier up to 1 for the selected axes while the other axis keeps its size,
 * or null when even the minimum size does not fit.
 */
function resolveLineMultipliers({
  constraints,
  minimum,
  axes
}: {
  constraints: CropFitConstraint[]
  minimum: CropAxisShrink
  axes: CropResizeAxes
}): CropAxisShrink | null {
  const toMultipliers = (multiplier: number): CropAxisShrink => ({
    x: axes.x ? multiplier : 1,
    y: axes.y ? multiplier : 1
  })
  const largest = constraints.reduce((current, { x, y, limit }) => {
    const coefficient = (axes.x ? x : 0) + (axes.y ? y : 0)
    const available = limit - (axes.x ? 0 : x) - (axes.y ? 0 : y)
    if (coefficient <= COEFFICIENT_EPSILON) return current

    return Math.min(current, available / coefficient)
  }, 1)
  const smallest = Math.max(axes.x ? minimum.x : 0, axes.y ? minimum.y : 0)
  const multipliers = toMultipliers(largest)
  if (largest < smallest || !isWithinConstraints({ constraints, multipliers })) return null

  return multipliers
}

/**
 * Returns the multipliers up to 1 for the frame size closest to the requested one, measured in visible pixels,
 * or null when even the minimum size does not fit. The corner then slides along the source edge it reached
 * instead of trading one side for the other. The closest point of the allowed region is either a corner of that
 * region or the projection onto one of its edges, so only those candidates are checked. Without skew the
 * constraints are independent and this is the usual per-axis clamp.
 */
function resolveClosestMultipliers({
  constraints,
  minimum,
  width,
  height
}: {
  constraints: CropFitConstraint[]
  minimum: CropAxisShrink
  width: number
  height: number
}): CropAxisShrink | null {
  const allConstraints: CropFitConstraint[] = [
    ...constraints,
    { x: 1, y: 0, limit: 1 },
    { x: 0, y: 1, limit: 1 },
    { x: -1, y: 0, limit: -minimum.x },
    { x: 0, y: -1, limit: -minimum.y }
  ]
  const getDistance = ({ x, y }: CropAxisShrink): number => {
    return (((1 - x) * width) ** 2) + (((1 - y) * height) ** 2)
  }
  const vertices = allConstraints.flatMap((first, firstIndex) => {
    return allConstraints.slice(firstIndex + 1).map((second) => intersectConstraintLines({ first, second }))
  })
  const projections = allConstraints.map((constraint) => projectRequestedSize({ constraint, width, height }))
  const candidates = [...vertices, ...projections].filter((candidate): candidate is CropAxisShrink => {
    return candidate !== null && isWithinConstraints({ constraints: allConstraints, multipliers: candidate })
  })
  if (!candidates.length) return null

  return candidates.reduce((best, candidate) => {
    return getDistance(candidate) < getDistance(best) ? candidate : best
  })
}

/**
 * Returns the multipliers on one constraint line closest to the requested size in visible pixels, or null for a
 * constraint that does not depend on the multipliers.
 */
function projectRequestedSize({
  constraint,
  width,
  height
}: {
  constraint: CropFitConstraint
  width: number
  height: number
}): CropAxisShrink | null {
  if ((constraint.x ** 2) + (constraint.y ** 2) <= COEFFICIENT_EPSILON) return null

  // In visible pixels u = x * width and v = y * height, the line is (x / width) * u + (y / height) * v = limit.
  const normalU = constraint.x / width
  const normalV = constraint.y / height
  const normalLengthSquared = (normalU ** 2) + (normalV ** 2)

  const excess = ((normalU * width) + (normalV * height) - constraint.limit) / normalLengthSquared

  return {
    x: (width - (excess * normalU)) / width,
    y: (height - (excess * normalV)) / height
  }
}

/**
 * Returns the point where both constraints are tight, or null for parallel constraints.
 */
function intersectConstraintLines({
  first,
  second
}: {
  first: CropFitConstraint
  second: CropFitConstraint
}): CropAxisShrink | null {
  const determinant = (first.x * second.y) - (first.y * second.x)
  if (Math.abs(determinant) <= COEFFICIENT_EPSILON) return null

  return {
    x: ((first.limit * second.y) - (first.y * second.limit)) / determinant,
    y: ((first.x * second.limit) - (first.limit * second.x)) / determinant
  }
}
