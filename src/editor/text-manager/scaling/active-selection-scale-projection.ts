import type { ObjectBounds } from '../../utils/geometry'
import type { ScaleProjectionEdgeInput } from '../../snapping-manager/scaling/scale-projection'
import type {
  ScaleProjectionModeInput,
  ScaleStepProjectionInput
} from '../../snapping-manager/scaling/scale-snapping-resolver'

/** Геометрия общего выделения при соседнем наборе канонических множителей текста. */
export type ActiveSelectionTextScaleProjectionSample = Readonly<{
  bounds: ObjectBounds
  values: readonly number[]
}>

/** Допуск проверки соседнего значения канонического множителя. */
const ACTIVE_SELECTION_TEXT_SCALE_PROJECTION_EPSILON = 0.000000001

/** Возвращает локальный коэффициент одной грани по конкретной переменной скейлинга. */
function resolveEdgeCoefficient({
  bounds,
  edge,
  sample,
  value,
  variableIndex
}: {
  bounds: ObjectBounds
  edge: ScaleProjectionEdgeInput['edge']
  sample: ActiveSelectionTextScaleProjectionSample
  value: number
  variableIndex: number
}): number {
  const valueDelta = sample.values[variableIndex] - value
  if (Math.abs(valueDelta) <= ACTIVE_SELECTION_TEXT_SCALE_PROJECTION_EPSILON) {
    throw new Error('Соседнее измерение текста должно менять выбранный множитель')
  }

  return (sample.bounds[edge] - bounds[edge]) / valueDelta
}

/** Проверяет количество переменных и соседних измерений текущего режима. */
function assertProjectionSamples({
  projectionMode,
  samples,
  values
}: {
  projectionMode: ScaleProjectionModeInput
  samples: readonly ActiveSelectionTextScaleProjectionSample[]
  values: readonly number[]
}): void {
  const variableCount = projectionMode.projection.variables.length
  if (variableCount < 1 || variableCount > 2) {
    throw new Error('Скейлинг выделения с текстами должен иметь одну или две степени свободы')
  }
  if (values.length !== variableCount || samples.length !== variableCount) {
    throw new Error('Каждой переменной скейлинга текста должно соответствовать соседнее измерение')
  }
  if (samples.some((sample) => sample.values.length !== variableCount)) {
    throw new Error('Соседние измерения текста должны использовать одинаковый набор множителей')
  }
}

/**
 * Создаёт локальную линейную модель по точным измерениям канонического состояния текстов.
 */
export function createActiveSelectionTextScaleStepProjection({
  bounds,
  projectionMode,
  samples,
  values
}: {
  bounds: ObjectBounds
  projectionMode: ScaleProjectionModeInput
  samples: readonly ActiveSelectionTextScaleProjectionSample[]
  values: readonly number[]
}): ScaleStepProjectionInput {
  assertProjectionSamples({ projectionMode, samples, values })

  const edges = projectionMode.projection.edges.map(({ edge }) => {
    const coefficients = samples.map((sample, variableIndex) => {
      return resolveEdgeCoefficient({
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
