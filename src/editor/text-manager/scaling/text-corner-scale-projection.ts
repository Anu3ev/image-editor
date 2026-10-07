import type { Transform } from 'fabric'
import { english, type Translate } from '../../i18n'
import type { ObjectBounds } from '../../utils/geometry'
import type {
  ScaleProjectionEdgeInput,
  ScaleSceneEdge
} from '../../snapping-manager/scaling/scale-projection'
import type {
  ScaleProjectionModeInput,
  ScaleStepProjectionInput
} from '../../snapping-manager/scaling/scale-snapping-resolver'
import {
  createRectangularScaleGestureProjection,
  createRectangularScaleProjectionModes,
  resolveRectangularScaleMovingEdges,
  resolveRectangularScalePointerMultipliers,
  type RectangularScaleGestureProjection,
  type RectangularScalePoint
} from '../../snapping-manager/scaling/rectangular-scale-gesture-projection'
import type { EditorTextbox } from '../types'

/** Identifier of the proportional standalone-text corner-scaling mode. */
export const TEXT_CORNER_SCALE_PROJECTION_MODE = 'uniform'

/** Original standalone-text corner-scaling geometry. */
export type TextCornerScaleGestureProjection = Readonly<{
  baselineBounds: ObjectBounds
  fixedAnchor: RectangularScalePoint
  movingEdges: readonly ScaleSceneEdge[]
  projectionMode: ScaleProjectionModeInput
  rectangular: RectangularScaleGestureProjection
}>

/** Measured text geometry near the multiplier being checked. */
export type TextCornerScaleProjectionSample = Readonly<{
  bounds: ObjectBounds
  scale: number
}>

/** Tolerance for identifying a local region where the edge has not yet changed. */
const TEXT_CORNER_SCALE_PROJECTION_EPSILON = 0.000000001

/** Checks that the original Fabric transform contains a positive multiplier. */
function resolveOriginalScales({
  transform
}: {
  transform: Transform
}): Readonly<{ x: number; y: number }> | null {
  const scaleX = transform.original?.scaleX
  const scaleY = transform.original?.scaleY
  if (typeof scaleX !== 'number' || !Number.isFinite(scaleX) || scaleX <= 0) return null
  if (typeof scaleY !== 'number' || !Number.isFinite(scaleY) || scaleY <= 0) return null

  return Object.freeze({ x: scaleX, y: scaleY })
}

/** Selects the single proportional mode from the shared rectangular projection. */
function resolveUniformProjectionMode({
  t = english,
  projection
}: {
  t?: Translate
  projection: RectangularScaleGestureProjection
}): ScaleProjectionModeInput | null {
  return createRectangularScaleProjectionModes({ t, projection })
    .find(({ id }) => id === TEXT_CORNER_SCALE_PROJECTION_MODE) ?? null
}

/** Captures text corner-scaling geometry before the first object change. */
export function createTextCornerScaleGestureProjection({
  t = english,
  textbox,
  transform,
  pointerStart
}: {
  t?: Translate
  textbox: EditorTextbox
  transform: Transform
  pointerStart: RectangularScalePoint
}): TextCornerScaleGestureProjection | null {
  const originalScales = resolveOriginalScales({ transform })
  if (!originalScales) return null

  const rectangular = createRectangularScaleGestureProjection({
    transform: Object.freeze({
      target: textbox,
      action: transform.action,
      corner: transform.corner,
      originX: transform.originX,
      originY: transform.originY,
      original: Object.freeze({
        scaleX: originalScales.x,
        scaleY: originalScales.y
      })
    }),
    pointerStart
  })
  if (!rectangular) return null

  const projectionMode = resolveUniformProjectionMode({ t, projection: rectangular })
  if (!projectionMode) return null

  return Object.freeze({
    baselineBounds: rectangular.baselineBounds,
    fixedAnchor: rectangular.fixedAnchor,
    movingEdges: resolveRectangularScaleMovingEdges({ t, projectionModes: [projectionMode] }),
    projectionMode,
    rectangular
  })
}

/**
 * Returns the proportional multiplier from the pointer position relative to gesture start.
 * Returns zero after crossing the fixed point so the measurer preserves the minimum
 * text size and the current session can continue when movement reverses.
 */
export function resolveTextCornerScalePointerMultiplier({
  gesture,
  pointer
}: {
  gesture: TextCornerScaleGestureProjection
  pointer: RectangularScalePoint
}): number | null {
  if (!Number.isFinite(pointer.x) || !Number.isFinite(pointer.y)) return null

  const multipliers = resolveRectangularScalePointerMultipliers({
    projection: gesture.rectangular,
    pointer,
    mode: TEXT_CORNER_SCALE_PROJECTION_MODE
  })
  if (!multipliers) return 0
  if (!Number.isFinite(multipliers.x) || multipliers.x < 0) return null

  return multipliers.x
}

/** Returns the local coefficient of one edge, accounting for nonlinear text layout. */
function resolveTextCornerScaleEdgeCoefficient({
  bounds,
  edge,
  samples,
  scale
}: {
  bounds: ObjectBounds
  edge: ScaleSceneEdge
  samples: readonly TextCornerScaleProjectionSample[]
  scale: number
}): number {
  let selectedCoefficient = 0

  for (const sample of samples) {
    const edgeDelta = sample.bounds[edge] - bounds[edge]
    if (Math.abs(edgeDelta) <= TEXT_CORNER_SCALE_PROJECTION_EPSILON) continue

    const coefficient = edgeDelta / (sample.scale - scale)
    if (Math.abs(coefficient) > Math.abs(selectedCoefficient)) {
      selectedCoefficient = coefficient
    }
  }

  return selectedCoefficient
}

/** Creates an exact local projection from neighboring canonical text measurements. */
export function createTextCornerScaleStepProjection({
  bounds,
  gesture,
  samples,
  scale
}: {
  bounds: ObjectBounds
  gesture: TextCornerScaleGestureProjection
  samples: readonly TextCornerScaleProjectionSample[]
  scale: number
}): ScaleStepProjectionInput | null {
  if (!Number.isFinite(scale) || scale <= 0) return null
  if (samples.length === 0 || samples.length > 2) return null
  const validSamples = samples.every((sample) => {
    return Number.isFinite(sample.scale)
      && sample.scale > 0
      && Math.abs(sample.scale - scale) > Number.EPSILON
  })
  if (!validSamples) return null
  if (samples.length === 2 && Math.abs(samples[0].scale - samples[1].scale) <= Number.EPSILON) return null

  const edges = gesture.projectionMode.projection.edges.map(({ edge }) => {
    return Object.freeze({
      edge,
      coefficients: Object.freeze([resolveTextCornerScaleEdgeCoefficient({
        bounds,
        edge,
        samples,
        scale
      })])
    })
  }) satisfies readonly ScaleProjectionEdgeInput[]

  return Object.freeze({
    bounds: Object.freeze({ ...bounds }),
    projection: Object.freeze({
      variables: gesture.projectionMode.projection.variables,
      baselineValues: Object.freeze([scale]),
      variableSceneWeights: gesture.projectionMode.projection.variableSceneWeights,
      edges: Object.freeze(edges)
    })
  })
}
