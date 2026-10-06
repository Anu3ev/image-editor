import {
  createMovementSnapEnvironment,
  type MovementSnapCandidateSource
} from '../../../src/editor/snapping-manager/movement/movement-snap-candidates'
import {
  createMovementGestureBaseline,
  type FinalMovementGeometry,
  type MovementGestureBaseline,
  type MovementRawIntent
} from '../../../src/editor/snapping-manager/movement/movement-snapping-resolver'
import type { ObjectBounds } from '../../../src/editor/utils/geometry'

/** Creates exact bounds for a translation object, with centers derived from the same edges. */
export function createMovementBounds({
  left,
  top,
  width = 30,
  height = 30
}: {
  left: number
  top: number
  width?: number
  height?: number
}): ObjectBounds {
  return {
    left,
    right: left + width,
    top,
    bottom: top + height,
    centerX: left + (width / 2),
    centerY: top + (height / 2)
  }
}

/** Creates a movement-gesture baseline with an immutable snapshot of targets. */
export function createMovementBaseline({
  bounds = createMovementBounds({ left: 0, top: 0 }),
  sources = [],
  zoom = 1
}: {
  bounds?: ObjectBounds
  sources?: readonly MovementSnapCandidateSource[]
  zoom?: number
} = {}): MovementGestureBaseline {
  return createMovementGestureBaseline({
    bounds,
    position: {
      left: bounds.left,
      top: bounds.top
    },
    environment: createMovementSnapEnvironment({
      sources,
      zoom
    })
  })
}

/** Creates raw movement intent for an object with a left/top origin. */
export function createMovementRawIntent({
  left,
  top,
  width = 30,
  height = 30,
  canSnapX = true,
  canSnapY = true,
  ctrlKey = false
}: {
  left: number
  top: number
  width?: number
  height?: number
  canSnapX?: boolean
  canSnapY?: boolean
  ctrlKey?: boolean
}): MovementRawIntent {
  return {
    bounds: createMovementBounds({ left, top, width, height }),
    position: {
      left,
      top
    },
    axes: {
      x: canSnapX,
      y: canSnapY
    },
    modifiers: {
      ctrlKey
    }
  }
}

/** Creates the actual movement geometry after applying the calculated position. */
export function createFinalMovementGeometry({
  left,
  top,
  width = 30,
  height = 30
}: {
  left: number
  top: number
  width?: number
  height?: number
}): FinalMovementGeometry {
  return {
    bounds: createMovementBounds({ left, top, width, height }),
    position: {
      left,
      top
    }
  }
}
