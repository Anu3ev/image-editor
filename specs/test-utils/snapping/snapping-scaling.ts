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
 * Returns the bounds width of an object with the given X scale, composing Fabric's rotation, flipped scale, skewX
 * and skewY as plain matrix products, independently of the closed form used by the editor.
 */
export function getReferenceBoundsWidth({
  geometry,
  scaleX
}: {
  geometry: ReferenceObjectGeometry
  scaleX: number
}): number {
  const toRadians = (degrees: number): number => (degrees * Math.PI) / 180
  const cos = Math.cos(toRadians(geometry.angle))
  const sin = Math.sin(toRadians(geometry.angle))
  const rotation: Matrix2 = [[cos, -sin], [sin, cos]]
  const scale: Matrix2 = [
    [geometry.flipX ? -scaleX : scaleX, 0],
    [0, geometry.flipY ? -geometry.scaleY : geometry.scaleY]
  ]
  const skewX: Matrix2 = [[1, Math.tan(toRadians(geometry.skewX))], [0, 1]]
  const skewY: Matrix2 = [[1, 0], [Math.tan(toRadians(geometry.skewY)), 1]]
  const transform = [scale, skewX, skewY].reduce((result, matrix) => {
    return multiplyMatrices({ first: result, second: matrix })
  }, rotation)

  return (Math.abs(transform[0][0]) * geometry.width) + (Math.abs(transform[0][1]) * geometry.height)
}

/** Finds the X scale between the bounds at which the reference bounds width equals the target, by bisection. */
export function findReferenceScaleX({
  geometry,
  targetWidth,
  minScale,
  maxScale
}: {
  geometry: ReferenceObjectGeometry
  targetWidth: number
  minScale: number
  maxScale: number
}): number {
  const BISECTION_STEPS = 200
  let low = minScale
  let high = maxScale

  for (let step = 0; step < BISECTION_STEPS; step += 1) {
    const middle = (low + high) / 2
    if (getReferenceBoundsWidth({ geometry, scaleX: middle }) < targetWidth) {
      low = middle
    } else {
      high = middle
    }
  }

  return (low + high) / 2
}
