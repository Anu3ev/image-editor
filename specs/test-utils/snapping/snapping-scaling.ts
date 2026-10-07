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
