import { english, type Translate } from '../../i18n'
import type { ObjectBounds } from '../../utils/geometry'
import type { ScaleProjectionEdgeInput } from '../../snapping-manager/scaling/scale-projection'
import type {
  ScaleProjectionModeInput,
  ScaleStepProjectionInput
} from '../../snapping-manager/scaling/scale-snapping-resolver'

/** Selection geometry at a neighboring set of canonical text multipliers. */
export type ActiveSelectionTextScaleProjectionSample = Readonly<{
  bounds: ObjectBounds
  values: readonly number[]
}>

/** Tolerance for checking a neighboring canonical-multiplier value. */
const ACTIVE_SELECTION_TEXT_SCALE_PROJECTION_EPSILON = 0.000000001

/** Returns the local coefficient of one edge with respect to a specific scaling variable. */
function resolveEdgeCoefficient({
  t = english,
  bounds,
  edge,
  sample,
  value,
  variableIndex
}: {
  t?: Translate
  bounds: ObjectBounds
  edge: ScaleProjectionEdgeInput['edge']
  sample: ActiveSelectionTextScaleProjectionSample
  value: number
  variableIndex: number
}): number {
  const valueDelta = sample.values[variableIndex] - value
  if (Math.abs(valueDelta) <= ACTIVE_SELECTION_TEXT_SCALE_PROJECTION_EPSILON) {
    throw new Error(t('text.errors.neighborSampleMustChangeMultiplier'))
  }

  return (sample.bounds[edge] - bounds[edge]) / valueDelta
}

/** Checks the number of variables and neighboring measurements for the current mode. */
function assertProjectionSamples({
  t = english,
  projectionMode,
  samples,
  values
}: {
  t?: Translate
  projectionMode: ScaleProjectionModeInput
  samples: readonly ActiveSelectionTextScaleProjectionSample[]
  values: readonly number[]
}): void {
  const variableCount = projectionMode.projection.variables.length
  if (variableCount < 1 || variableCount > 2) {
    throw new Error(t('text.errors.invalidSelectionScaleDegreesOfFreedom'))
  }
  if (values.length !== variableCount || samples.length !== variableCount) {
    throw new Error(t('text.errors.missingNeighborMeasurement'))
  }
  if (samples.some((sample) => sample.values.length !== variableCount)) {
    throw new Error(t('text.errors.neighborMultiplierSetMismatch'))
  }
}

/**
 * Creates a local linear model from exact measurements of canonical text state.
 */
export function createActiveSelectionTextScaleStepProjection({
  t = english,
  bounds,
  projectionMode,
  samples,
  values
}: {
  t?: Translate
  bounds: ObjectBounds
  projectionMode: ScaleProjectionModeInput
  samples: readonly ActiveSelectionTextScaleProjectionSample[]
  values: readonly number[]
}): ScaleStepProjectionInput {
  assertProjectionSamples({ t, projectionMode, samples, values })

  const edges = projectionMode.projection.edges.map(({ edge }) => {
    const coefficients = samples.map((sample, variableIndex) => {
      return resolveEdgeCoefficient({
        t,
        bounds,
        edge,
        sample,
        value: values[variableIndex],
        variableIndex
      })
    })

    return Object.freeze({ edge, coefficients: Object.freeze(coefficients) })
  })

  return Object.freeze({
    bounds: Object.freeze({ ...bounds }),
    projection: Object.freeze({
      variables: projectionMode.projection.variables,
      baselineValues: Object.freeze([...values]),
      variableSceneWeights: projectionMode.projection.variableSceneWeights,
      edges: Object.freeze(edges)
    })
  })
}
