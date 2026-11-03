import type { Bounds } from '../../../src/editor/snapping-manager/types'

/** Minimal snap-result stub for scaling-snap unit tests. */
type AxisSnapResultStub = {
  delta: number
  guidePosition: number | null
  candidate: {
    edge: 'left' | 'right' | 'top' | 'bottom'
    position: number
  } | null
}

/** Returns rectangle bounds with the center already calculated. */
export function createScalingBounds({
  left,
  top,
  width,
  height
}: {
  left: number
  top: number
  width: number
  height: number
}): Bounds {
  return {
    left,
    top,
    right: left + width,
    bottom: top + height,
    centerX: left + (width / 2),
    centerY: top + (height / 2)
  }
}

/** Returns a snap result associated with a specific object edge. */
export function createAxisSnapResult({
  edge,
  position,
  guidePosition,
  delta = guidePosition - position
}: {
  edge: 'left' | 'right' | 'top' | 'bottom'
  position: number
  guidePosition: number
  delta?: number
}): AxisSnapResultStub {
  return {
    delta,
    guidePosition,
    candidate: {
      edge,
      position
    }
  }
}

/** Returns a snap result with no guide found. */
export function createEmptyAxisSnapResult(): AxisSnapResultStub {
  return {
    delta: 0,
    guidePosition: null,
    candidate: null
  }
}

/** Object geometry for the reference bounds calculation. */
type ReferenceObjectGeometry = {
  width: number
  height: number
  angle: number
  skewX: number
  skewY: number
  flipX: boolean
  flipY: boolean
  scaleY: number
}

/** Row-major 2x2 matrix. */
type Matrix2 = [[number, number], [number, number]]

/** Multiplies two row-major 2x2 matrices. */
function multiplyMatrices({ first, second }: { first: Matrix2, second: Matrix2 }): Matrix2 {
  return [
    [
      (first[0][0] * second[0][0]) + (first[0][1] * second[1][0]),
      (first[0][0] * second[0][1]) + (first[0][1] * second[1][1])
    ],
    [
      (first[1][0] * second[0][0]) + (first[1][1] * second[1][0]),
      (first[1][0] * second[0][1]) + (first[1][1] * second[1][1])
    ]
  ]
}

/**
 * Returns the smallest and largest scene X offsets of the object bounds box corners from the top-left corner of
 * that box for the given X scale. Like Fabric, the box surrounds the scaled and skewed shape before rotation and is
 * then rotated. The shape is composed from plain matrix products, independently of the closed form in the editor.
 */
export function getReferenceCornerOffsetsX({
  geometry,
  scaleX
}: {
  geometry: ReferenceObjectGeometry
  scaleX: number
}): { min: number, max: number } {
  const toRadians = (degrees: number): number => (degrees * Math.PI) / 180
  const cos = Math.cos(toRadians(geometry.angle))
  const sin = Math.sin(toRadians(geometry.angle))
  const scale: Matrix2 = [
    [geometry.flipX ? -scaleX : scaleX, 0],
    [0, geometry.flipY ? -geometry.scaleY : geometry.scaleY]
  ]
  const skewX: Matrix2 = [[1, Math.tan(toRadians(geometry.skewX))], [0, 1]]
  const skewY: Matrix2 = [[1, 0], [Math.tan(toRadians(geometry.skewY)), 1]]
  const shape = multiplyMatrices({ first: multiplyMatrices({ first: scale, second: skewX }), second: skewY })
  const shapeCorners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([signX, signY]) => {
    const x = signX * (geometry.width / 2)
    const y = signY * (geometry.height / 2)

    return { x: (shape[0][0] * x) + (shape[0][1] * y), y: (shape[1][0] * x) + (shape[1][1] * y) }
  })
  const boxWidth = Math.max(...shapeCorners.map(({ x }) => x)) - Math.min(...shapeCorners.map(({ x }) => x))
  const boxHeight = Math.max(...shapeCorners.map(({ y }) => y)) - Math.min(...shapeCorners.map(({ y }) => y))
  const offsets = [[0, 0], [boxWidth, 0], [boxWidth, boxHeight], [0, boxHeight]]
    .map(([x, y]) => (cos * x) - (sin * y))

  return { min: Math.min(...offsets), max: Math.max(...offsets) }
}

/**
 * Finds by bisection the X scale at which the right bounds edge reaches the guide while the top-left corner of the
 * bounds box stays fixed. The fixed corner is placed so that the bounds start at `boundsLeft` at scale 1.
 */
export function findReferenceScaleXForRightEdge({
  geometry,
  boundsLeft,
  guide,
  minScale,
  maxScale
}: {
  geometry: ReferenceObjectGeometry
  boundsLeft: number
  guide: number
  minScale: number
  maxScale: number
}): number {
  const BISECTION_STEPS = 200
  const fixedX = boundsLeft - getReferenceCornerOffsetsX({ geometry, scaleX: 1 }).min
  let low = minScale
  let high = maxScale

  for (let step = 0; step < BISECTION_STEPS; step += 1) {
    const middle = (low + high) / 2
    if (fixedX + getReferenceCornerOffsetsX({ geometry, scaleX: middle }).max < guide) {
      low = middle
    } else {
      high = middle
    }
  }

  return (low + high) / 2
}
