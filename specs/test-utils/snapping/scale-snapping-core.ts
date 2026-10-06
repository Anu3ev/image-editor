/* eslint-disable no-use-before-define -- Exported functions appear above the shared bounds calculation. */
import {
  createScaleGestureBaseline,
  type FinalScaleGeometry,
  type ScaleGestureBaseline,
  type ScaleRawIntent,
  type ScaleScenePoint,
  type ScaleSnapCandidateInput
} from '../../../src/editor/snapping-manager/scaling/scale-snapping-resolver'
import type { ScaleSceneEdge } from '../../../src/editor/snapping-manager/scaling/scale-projection'
import type { ObjectBounds } from '../../../src/editor/utils/geometry'

/**
 * Creates an initial state for free and proportional scaling.
 */
export function createScaleBaseline({
  width = 100,
  height = 100,
  candidates = [],
  zoom = 1
}: {
  width?: number
  height?: number
  candidates?: readonly ScaleSnapCandidateInput[]
  zoom?: number
} = {}): ScaleGestureBaseline {
  const bounds = createScaleBounds({ left: 0, top: 0, right: width, bottom: height })

  return createScaleGestureBaseline({
    bounds,
    fixedAnchor: { x: bounds.left, y: bounds.top },
    projectionModes: [
      {
        id: 'free',
        projection: {
          variables: ['scale-x', 'scale-y'],
          baselineValues: [1, 1],
          variableSceneWeights: [width, height],
          edges: [
            { edge: 'right', coefficients: [width, 0] },
            { edge: 'bottom', coefficients: [0, height] }
          ]
        }
      },
      {
        id: 'uniform',
        projection: {
          variables: ['uniform-scale'],
          baselineValues: [1],
          variableSceneWeights: [Math.hypot(width, height)],
          edges: [
            { edge: 'right', coefficients: [width] },
            { edge: 'bottom', coefficients: [height] }
          ]
        }
      }
    ],
    candidates,
    zoom
  })
}

/**
 * Creates a guide for the active right or bottom edge.
 */
export function createScaleCandidate({
  id,
  axis,
  edge = axis === 'x' ? 'right' : 'bottom',
  position,
  category = 'edge'
}: {
  id: string
  axis: 'x' | 'y'
  edge?: ScaleSceneEdge
  position: number
  category?: ScaleSnapCandidateInput['category']
}): ScaleSnapCandidateInput {
  return {
    id,
    axis,
    edge,
    position,
    category
  }
}

/**
 * Creates immutable scaling intent with explicitly specified modifiers.
 */
export function createScaleRawIntent({
  projectionMode = 'free',
  values,
  ctrlKey = false,
  shiftKey = false
}: {
  projectionMode?: string
  values: readonly number[]
  ctrlKey?: boolean
  shiftKey?: boolean
}): ScaleRawIntent {
  return Object.freeze({
    projectionMode,
    values: Object.freeze([...values]),
    modifiers: Object.freeze({ ctrlKey, shiftKey })
  })
}

/**
 * Creates the final exact geometry from bounds and a fixed point.
 */
export function createFinalScaleGeometry({
  left = 0,
  top = 0,
  right,
  bottom,
  fixedAnchor = { x: left, y: top },
  measuredValues = [1, 1],
  domainX = 'satisfied',
  domainY = 'satisfied',
  protectedState = 'preserved'
}: {
  left?: number
  top?: number
  right: number
  bottom: number
  fixedAnchor?: ScaleScenePoint
  measuredValues?: readonly number[]
  domainX?: FinalScaleGeometry['domainVerdict']['x']
  domainY?: FinalScaleGeometry['domainVerdict']['y']
  protectedState?: FinalScaleGeometry['domainVerdict']['protectedState']
}): FinalScaleGeometry {
  return {
    bounds: createScaleBounds({ left, top, right, bottom }),
    fixedAnchor,
    measuredValues,
    domainVerdict: {
      x: domainX,
      y: domainY,
      protectedState
    }
  }
}

/**
 * Creates exact bounds and calculates their center.
 */
export function createScaleBounds({
  left,
  top,
  right,
  bottom
}: {
  left: number
  top: number
  right: number
  bottom: number
}): ObjectBounds {
  return {
    left,
    top,
    right,
    bottom,
    centerX: left + ((right - left) / 2),
    centerY: top + ((bottom - top) / 2)
  }
}
