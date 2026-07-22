/* eslint-disable no-use-before-define -- экспортируемые функции объявлены перед внутренними расчётами. */
import type { ObjectBounds } from '../utils/geometry'

/** Ось координат, по которой проверяется направляющая. */
export type ScaleSceneAxis = 'x' | 'y'

/** Грань видимой ограничивающей рамки, положение которой меняется при scale. */
export type ScaleSceneEdge = 'left' | 'right' | 'top' | 'bottom'

/** Параметр scale, которым конкретный менеджер изменяет объект. */
export type ScaleProjectionVariable = 'scale-x' | 'scale-y' | 'uniform-scale'

/** Коэффициенты зависимости положения движущейся грани от значений scale. */
export type ScaleProjectionEdgeInput = Readonly<{
  edge: ScaleSceneEdge
  coefficients: readonly number[]
}>

/** Исходные данные линейной модели выбранного режима scale. */
export type ScaleProjectionInput = Readonly<{
  variables: readonly ScaleProjectionVariable[]
  baselineValues: readonly number[]
  /** Расстояние ручки в координатах сцены при изменении параметра на единицу. */
  variableSceneWeights: readonly number[]
  edges: readonly ScaleProjectionEdgeInput[]
}>

/** Проверенная линейная модель одной движущейся грани. */
export type ScaleProjectionEdge = Readonly<{
  axis: ScaleSceneAxis
  edge: ScaleSceneEdge
  baselinePosition: number
  coefficients: readonly number[]
}>

/** Модель движущихся граней и веса для сравнения смещений. */
export type ScaleProjection = Readonly<{
  variables: readonly ScaleProjectionVariable[]
  baselineValues: readonly number[]
  variableSceneWeights: readonly number[]
  edges: readonly ScaleProjectionEdge[]
}>

/** Положения всех граней, движущихся в выбранном режиме scale. */
export type ProjectedScaleEdgePositions = Readonly<{
  left: number | null
  right: number | null
  top: number | null
  bottom: number | null
}>

/** Ограничение, совмещающее конкретную движущуюся грань с направляющей. */
export type ScaleProjectionConstraint = Readonly<{
  axis: ScaleSceneAxis
  edge: ScaleSceneEdge
  position: number
}>

/** Значения scale и положения граней после применения ограничений. */
export type ScaleProjectionSolution = Readonly<{
  values: readonly number[]
  positions: ProjectedScaleEdgePositions
}>

/** Минимальный относительный допуск для проверки ранга линейной проекции. */
const PROJECTION_RANK_EPSILON = 0.000000001

/** Максимальное число степеней свободы поддерживаемого scale-жеста. */
const MAX_SCALE_PROJECTION_VARIABLES = 2

/** Пустые позиции до расчёта движущихся граней. */
const EMPTY_PROJECTED_EDGE_POSITIONS: ProjectedScaleEdgePositions = Object.freeze({
  left: null,
  right: null,
  top: null,
  bottom: null
})

/**
 * Строит и проверяет линейную модель от точной геометрии начала жеста.
 */
export function createScaleProjection({
  bounds,
  input
}: {
  bounds: ObjectBounds
  input: ScaleProjectionInput
}): ScaleProjection {
  assertProjectionVariables({ input })
  if (input.edges.length === 0) {
    throw new Error('Scale projection must contain at least one moving scene edge')
  }

  const edgeNames = new Set<ScaleSceneEdge>()
  const edges = input.edges.map((edgeInput) => {
    if (edgeNames.has(edgeInput.edge)) {
      throw new Error(`Scale projection contains duplicate ${edgeInput.edge} edge`)
    }
    edgeNames.add(edgeInput.edge)

    return createProjectionEdge({ bounds, input: edgeInput, variableCount: input.variables.length })
  })

  return Object.freeze({
    variables: Object.freeze([...input.variables]),
    baselineValues: Object.freeze([...input.baselineValues]),
    variableSceneWeights: Object.freeze([...input.variableSceneWeights]),
    edges: Object.freeze(edges)
  })
}

/**
 * Возвращает модель конкретной грани или null, если выбранный режим её не двигает.
 */
export function getScaleProjectionEdge({
  projection,
  edge
}: {
  projection: ScaleProjection
  edge: ScaleSceneEdge
}): ScaleProjectionEdge | null {
  return projection.edges.find((projectionEdge) => projectionEdge.edge === edge) ?? null
}

/**
 * Рассчитывает положения всех движущихся граней для указанных значений scale.
 */
export function projectScaleEdgePositions({
  projection,
  values
}: {
  projection: ScaleProjection
  values: readonly number[]
}): ProjectedScaleEdgePositions {
  assertProjectionValues({ projection, values })
  const positions: Record<ScaleSceneEdge, number | null> = { ...EMPTY_PROJECTED_EDGE_POSITIONS }

  for (const projectionEdge of projection.edges) {
    positions[projectionEdge.edge] = projectEdgePosition({ projection, projectionEdge, values })
  }

  return Object.freeze(positions)
}

/**
 * Подбирает значения scale, при которых выполняются одно или два ограничения.
 */
export function resolveScaleProjection({
  projection,
  rawValues,
  constraints,
  epsilon
}: {
  projection: ScaleProjection
  rawValues: readonly number[]
  constraints: readonly ScaleProjectionConstraint[]
  epsilon: number
}): ScaleProjectionSolution | null {
  assertProjectionValues({ projection, values: rawValues })
  assertProjectionConstraints({ projection, constraints, epsilon })

  if (constraints.length === 0) {
    return createProjectionSolution({ projection, values: rawValues })
  }
  if (constraints.length === 1) {
    return resolveSingleConstraint({ projection, rawValues, constraint: constraints[0] })
  }

  return resolveConstraintPair({ projection, rawValues, constraints, epsilon })
}

/**
 * Возвращает величину изменения scale, необходимого для одного ограничения.
 */
export function getScaleProjectionCorrectionMagnitude({
  projection,
  rawValues,
  constraint
}: {
  projection: ScaleProjection
  rawValues: readonly number[]
  constraint: ScaleProjectionConstraint
}): number {
  const solution = resolveScaleProjection({
    projection,
    rawValues,
    constraints: [constraint],
    epsilon: PROJECTION_RANK_EPSILON
  })
  if (!solution) {
    throw new Error(`Scale constraint for ${constraint.edge} edge cannot be projected`)
  }

  return resolveVectorDistance({ projection, first: rawValues, second: solution.values })
}

/**
 * Возвращает ось координат конкретной грани.
 */
export function resolveScaleSceneEdgeAxis({ edge }: { edge: ScaleSceneEdge }): ScaleSceneAxis {
  return edge === 'left' || edge === 'right' ? 'x' : 'y'
}

/**
 * Проверяет параметры scale, их исходные значения и веса.
 */
function assertProjectionVariables({ input }: { input: ScaleProjectionInput }): void {
  const { variables, baselineValues, variableSceneWeights } = input
  if (variables.length === 0 || variables.length > MAX_SCALE_PROJECTION_VARIABLES) {
    throw new Error('Scale projection must contain one or two variables')
  }
  if (variables.length !== baselineValues.length) {
    throw new Error('Scale projection variables and baseline values must have equal length')
  }
  if (variables.length !== variableSceneWeights.length) {
    throw new Error('Scale projection variables and scene weights must have equal length')
  }
  if (new Set(variables).size !== variables.length) {
    throw new Error('Scale projection variables must be unique')
  }
  if (!baselineValues.every(Number.isFinite)) {
    throw new Error('Scale projection baseline values must be finite')
  }
  if (!variableSceneWeights.every((weight) => Number.isFinite(weight) && weight > 0)) {
    throw new Error('Scale projection scene weights must be finite positive numbers')
  }
}

/**
 * Создаёт и проверяет линейную модель одной движущейся грани.
 */
function createProjectionEdge({
  bounds,
  input,
  variableCount
}: {
  bounds: ObjectBounds
  input: ScaleProjectionEdgeInput
  variableCount: number
}): ScaleProjectionEdge {
  if (input.coefficients.length !== variableCount) {
    throw new Error(`Scale projection coefficients for ${input.edge} edge have invalid length`)
  }
  if (!input.coefficients.every(Number.isFinite)) {
    throw new Error(`Scale projection coefficients for ${input.edge} edge must be finite`)
  }

  const coefficientNorm = Math.hypot(...input.coefficients)
  if (coefficientNorm <= PROJECTION_RANK_EPSILON) {
    throw new Error(`Scale projection coefficients for ${input.edge} edge must affect its position`)
  }

  return Object.freeze({
    axis: resolveScaleSceneEdgeAxis({ edge: input.edge }),
    edge: input.edge,
    baselinePosition: bounds[input.edge],
    coefficients: Object.freeze([...input.coefficients])
  })
}

/**
 * Проверяет количество и конечность переданных значений scale.
 */
function assertProjectionValues({
  projection,
  values
}: {
  projection: ScaleProjection
  values: readonly number[]
}): void {
  if (values.length !== projection.variables.length) {
    throw new Error('Scale projection values have invalid length')
  }
  if (!values.every(Number.isFinite)) {
    throw new Error('Scale projection values must be finite')
  }
}

/**
 * Проверяет ограничения для граней и допустимую погрешность решения.
 */
function assertProjectionConstraints({
  projection,
  constraints,
  epsilon
}: {
  projection: ScaleProjection
  constraints: readonly ScaleProjectionConstraint[]
  epsilon: number
}): void {
  if (constraints.length > 2) {
    throw new Error('Scale projection supports at most two scene constraints')
  }
  if (!Number.isFinite(epsilon) || epsilon < 0) {
    throw new Error('Scale projection epsilon must be a finite non-negative number')
  }
  if (new Set(constraints.map(({ axis }) => axis)).size !== constraints.length) {
    throw new Error('Scale projection constraints must use different scene axes')
  }

  for (const constraint of constraints) {
    const projectionEdge = getScaleProjectionEdge({ projection, edge: constraint.edge })
    if (!projectionEdge || projectionEdge.axis !== constraint.axis) {
      throw new Error(`Scale projection does not contain ${constraint.edge} edge on ${constraint.axis} axis`)
    }
    if (!Number.isFinite(constraint.position)) {
      throw new Error(`Scale projection constraint for ${constraint.edge} edge must be finite`)
    }
  }
}

/**
 * Вычисляет положение одной движущейся грани.
 */
function projectEdgePosition({
  projection,
  projectionEdge,
  values
}: {
  projection: ScaleProjection
  projectionEdge: ScaleProjectionEdge
  values: readonly number[]
}): number {
  let position = projectionEdge.baselinePosition
  for (let index = 0; index < values.length; index += 1) {
    position += projectionEdge.coefficients[index] * (values[index] - projection.baselineValues[index])
  }

  return position
}

/**
 * Находит ближайшие исходным значения scale, которые выполняют одно ограничение.
 */
function resolveSingleConstraint({
  projection,
  rawValues,
  constraint
}: {
  projection: ScaleProjection
  rawValues: readonly number[]
  constraint: ScaleProjectionConstraint
}): ScaleProjectionSolution {
  const projectionEdge = getScaleProjectionEdge({ projection, edge: constraint.edge })
  if (!projectionEdge) {
    throw new Error(`Scale projection does not contain ${constraint.edge} edge`)
  }

  const rawPositions = projectScaleEdgePositions({ projection, values: rawValues })
  const rawPosition = rawPositions[constraint.edge]
  if (rawPosition === null) {
    throw new Error(`Scale projection did not resolve ${constraint.edge} position`)
  }

  const inverseMetricCoefficients = projectionEdge.coefficients.map((coefficient, index) => {
    return coefficient / (projection.variableSceneWeights[index] ** 2)
  })
  const constraintMetricNorm = projectionEdge.coefficients.reduce((sum, coefficient, index) => {
    return sum + (coefficient * inverseMetricCoefficients[index])
  }, 0)
  const positionCorrection = constraint.position - rawPosition
  const values = rawValues.map((value, index) => {
    return value + ((inverseMetricCoefficients[index] * positionCorrection) / constraintMetricNorm)
  })

  return createProjectionSolution({ projection, values })
}

/**
 * Пытается выполнить два ограничения с одним или двумя параметрами scale.
 */
function resolveConstraintPair({
  projection,
  rawValues,
  constraints,
  epsilon
}: {
  projection: ScaleProjection
  rawValues: readonly number[]
  constraints: readonly ScaleProjectionConstraint[]
  epsilon: number
}): ScaleProjectionSolution | null {
  const directSolution = projection.variables.length === 2
    ? resolveTwoVariableConstraintPair({ projection, rawValues, constraints })
    : null
  if (directSolution && areConstraintsSatisfied({ solution: directSolution, constraints, epsilon })) {
    return directSolution
  }

  for (const constraint of constraints) {
    const solution = resolveSingleConstraint({ projection, rawValues, constraint })
    if (areConstraintsSatisfied({ solution, constraints, epsilon })) return solution
  }

  return null
}

/**
 * Решает невырожденную систему двух ограничений для двух параметров scale.
 */
function resolveTwoVariableConstraintPair({
  projection,
  rawValues,
  constraints
}: {
  projection: ScaleProjection
  rawValues: readonly number[]
  constraints: readonly ScaleProjectionConstraint[]
}): ScaleProjectionSolution | null {
  const [firstConstraint, secondConstraint] = constraints
  const firstEdge = getScaleProjectionEdge({ projection, edge: firstConstraint.edge })
  const secondEdge = getScaleProjectionEdge({ projection, edge: secondConstraint.edge })
  if (!firstEdge || !secondEdge) return null

  const [firstA, firstB] = firstEdge.coefficients
  const [secondA, secondB] = secondEdge.coefficients
  const firstNorm = Math.hypot(firstA, firstB)
  const secondNorm = Math.hypot(secondA, secondB)
  const normalizedFirstA = firstA / firstNorm
  const normalizedFirstB = firstB / firstNorm
  const normalizedSecondA = secondA / secondNorm
  const normalizedSecondB = secondB / secondNorm
  const relativeDeterminant = (normalizedFirstA * normalizedSecondB)
    - (normalizedFirstB * normalizedSecondA)
  if (Math.abs(relativeDeterminant) <= PROJECTION_RANK_EPSILON) return null

  const rawPositions = projectScaleEdgePositions({ projection, values: rawValues })
  const firstRawPosition = rawPositions[firstConstraint.edge]
  const secondRawPosition = rawPositions[secondConstraint.edge]
  if (firstRawPosition === null || secondRawPosition === null) return null

  const firstCorrection = (firstConstraint.position - firstRawPosition) / firstNorm
  const secondCorrection = (secondConstraint.position - secondRawPosition) / secondNorm
  const firstDelta = ((firstCorrection * normalizedSecondB) - (normalizedFirstB * secondCorrection))
    / relativeDeterminant
  const secondDelta = ((normalizedFirstA * secondCorrection) - (firstCorrection * normalizedSecondA))
    / relativeDeterminant

  return createProjectionSolution({
    projection,
    values: [rawValues[0] + firstDelta, rawValues[1] + secondDelta]
  })
}

/**
 * Проверяет, что рассчитанное решение выполняет все ограничения.
 */
function areConstraintsSatisfied({
  solution,
  constraints,
  epsilon
}: {
  solution: ScaleProjectionSolution
  constraints: readonly ScaleProjectionConstraint[]
  epsilon: number
}): boolean {
  for (const constraint of constraints) {
    const position = solution.positions[constraint.edge]
    if (position === null || Math.abs(position - constraint.position) > epsilon) return false
  }

  return true
}

/**
 * Создаёт неизменяемый результат проекции.
 */
function createProjectionSolution({
  projection,
  values
}: {
  projection: ScaleProjection
  values: readonly number[]
}): ScaleProjectionSolution {
  const immutableValues = Object.freeze([...values])

  return Object.freeze({
    values: immutableValues,
    positions: projectScaleEdgePositions({ projection, values: immutableValues })
  })
}

/**
 * Возвращает расстояние между двумя наборами значений с учётом их веса на сцене.
 */
function resolveVectorDistance({
  projection,
  first,
  second
}: {
  projection: ScaleProjection
  first: readonly number[]
  second: readonly number[]
}): number {
  let squaredDistance = 0
  for (let index = 0; index < first.length; index += 1) {
    const sceneDistance = (first[index] - second[index]) * projection.variableSceneWeights[index]
    squaredDistance += sceneDistance ** 2
  }

  return Math.sqrt(squaredDistance)
}
