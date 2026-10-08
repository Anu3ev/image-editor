/* eslint-disable no-use-before-define -- Exported functions are declared before internal calculations. */
import type { ObjectBounds } from '../../utils/geometry'

/** Coordinate axis along which a guide is checked. */
export type ScaleSceneAxis = 'x' | 'y'

/** Edge of the visible bounding box whose position changes with the object's size. */
export type ScaleSceneEdge = 'left' | 'right' | 'top' | 'bottom'

/** Canonical parameter used by a specific manager to resize an object. */
export type ScaleProjectionVariable = 'scale-x' | 'scale-y' | 'uniform-scale' | 'text-width'

/** Coefficients relating the checked edge's position to canonical size parameters. */
export type ScaleProjectionEdgeInput = Readonly<{
  edge: ScaleSceneEdge
  coefficients: readonly number[]
}>

/** Inputs to the linear model for the selected resizing mode. */
export type ScaleProjectionInput = Readonly<{
  variables: readonly ScaleProjectionVariable[]
  baselineValues: readonly number[]
  /** Control travel in scene coordinates per unit change in a parameter. */
  variableSceneWeights: readonly number[]
  edges: readonly ScaleProjectionEdgeInput[]
}>

/** Validated linear model of one participating edge. */
export type ScaleProjectionEdge = Readonly<{
  axis: ScaleSceneAxis
  edge: ScaleSceneEdge
  baselinePosition: number
  coefficients: readonly number[]
}>

/** Participating edge model and weights for comparing offsets. */
export type ScaleProjection = Readonly<{
  variables: readonly ScaleProjectionVariable[]
  baselineValues: readonly number[]
  variableSceneWeights: readonly number[]
  edges: readonly ScaleProjectionEdge[]
}>

/** Positions of all edges participating in the selected resizing mode. */
export type ProjectedScaleEdgePositions = Readonly<{
  left: number | null
  right: number | null
  top: number | null
  bottom: number | null
}>

/** Constraint aligning a specific checked edge with a guide. */
export type ScaleProjectionConstraint = Readonly<{
  axis: ScaleSceneAxis
  edge: ScaleSceneEdge
  position: number
}>

/** Canonical values and edge positions after applying constraints. */
export type ScaleProjectionSolution = Readonly<{
  values: readonly number[]
  positions: ProjectedScaleEdgePositions
}>

/** Minimum relative tolerance for checking the rank of a linear projection. */
const PROJECTION_RANK_EPSILON = 0.000000001

/** Maximum number of supported resizing degrees of freedom. */
const MAX_SCALE_PROJECTION_VARIABLES = 2

/** Empty positions before calculating participating edges. */
const EMPTY_PROJECTED_EDGE_POSITIONS: ProjectedScaleEdgePositions = Object.freeze({
  left: null,
  right: null,
  top: null,
  bottom: null
})

/**
 * Builds and validates a linear model from the exact gesture-start geometry.
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
      throw new Error(`The scale projection contains a duplicate ${edgeInput.edge} edge`)
    }
    edgeNames.add(edgeInput.edge)

    return createProjectionEdge({ bounds, input: edgeInput, variableCount: input.variables.length })
  })
  assertProjectionVariablesAffectGeometry({ edges, variables: input.variables })

  return Object.freeze({
    variables: Object.freeze([...input.variables]),
    baselineValues: Object.freeze([...input.baselineValues]),
    variableSceneWeights: Object.freeze([...input.variableSceneWeights]),
    edges: Object.freeze(edges)
  })
}

/**
 * Returns a specific edge's model, or null if it does not participate in the selected mode.
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
 * Calculates all participating edge positions for the given canonical values.
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
 * Finds canonical values satisfying one or two constraints.
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
    return resolveSingleConstraint({ projection, rawValues, constraint: constraints[0], epsilon })
  }

  return resolveConstraintPair({ projection, rawValues, constraints, epsilon })
}

/**
 * Returns the canonical parameter change required for one constraint.
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
    throw new Error(`The scale constraint for the ${constraint.edge} edge cannot be projected`)
  }

  return resolveVectorDistance({ projection, first: rawValues, second: solution.values })
}

/**
 * Returns the coordinate axis of a specific edge.
 */
export function resolveScaleSceneEdgeAxis({ edge }: { edge: ScaleSceneEdge }): ScaleSceneAxis {
  return edge === 'left' || edge === 'right' ? 'x' : 'y'
}

/**
 * Validates canonical size parameters, their initial values, and weights.
 */
function assertProjectionVariables({ input }: { input: ScaleProjectionInput }): void {
  const { variables, baselineValues, variableSceneWeights } = input
  if (variables.length === 0 || variables.length > MAX_SCALE_PROJECTION_VARIABLES) {
    throw new Error('Scale projection must contain one or two variables')
  }
  if (variables.length !== baselineValues.length) {
    throw new Error('The scale projection must contain the same number of variables and baseline values')
  }
  if (variables.length !== variableSceneWeights.length) {
    throw new Error('The scale projection must contain the same number of variables and scene weights')
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
 * Creates and validates a linear model of one participating edge.
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
    throw new Error(`The scale projection has an invalid number of coefficients for the ${input.edge} edge`)
  }
  if (!input.coefficients.every(Number.isFinite)) {
    throw new Error(`Scale projection coefficients for the ${input.edge} edge must be finite`)
  }

  return Object.freeze({
    axis: resolveScaleSceneEdgeAxis({ edge: input.edge }),
    edge: input.edge,
    baselinePosition: bounds[input.edge],
    coefficients: Object.freeze([...input.coefficients])
  })
}

/** Checks that each canonical parameter changes at least one edge. */
function assertProjectionVariablesAffectGeometry({
  edges,
  variables
}: {
  edges: readonly ScaleProjectionEdge[]
  variables: readonly ScaleProjectionVariable[]
}): void {
  variables.forEach((variable, index) => {
    const affectsGeometry = edges.some(({ coefficients }) => {
      return Math.abs(coefficients[index]) > PROJECTION_RANK_EPSILON
    })
    if (!affectsGeometry) {
      throw new Error(`Scale projection variable "${variable}" must affect at least one edge`)
    }
  })
}

/**
 * Validates the number and finiteness of the supplied scale values.
 */
function assertProjectionValues({
  projection,
  values
}: {
  projection: ScaleProjection
  values: readonly number[]
}): void {
  if (values.length !== projection.variables.length) {
    throw new Error('The scale projection has an invalid number of values')
  }
  if (!values.every(Number.isFinite)) {
    throw new Error('Scale projection values must be finite')
  }
}

/**
 * Validates edge constraints and the allowed solution error.
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
      throw new Error(
        `The scale projection does not contain the ${constraint.edge} edge on the ${constraint.axis} axis`
      )
    }
    if (!Number.isFinite(constraint.position)) {
      throw new Error(`The scale projection constraint for the ${constraint.edge} edge must be finite`)
    }
  }
}

/**
 * Calculates the position of one participating edge.
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
 * Finds scale values that satisfy one constraint while staying closest to the raw input values.
 */
function resolveSingleConstraint({
  projection,
  rawValues,
  constraint,
  epsilon
}: {
  projection: ScaleProjection
  rawValues: readonly number[]
  constraint: ScaleProjectionConstraint
  epsilon: number
}): ScaleProjectionSolution | null {
  const projectionEdge = getScaleProjectionEdge({ projection, edge: constraint.edge })
  if (!projectionEdge) {
    throw new Error(`The scale projection does not contain the ${constraint.edge} edge`)
  }

  const rawPositions = projectScaleEdgePositions({ projection, values: rawValues })
  const rawPosition = rawPositions[constraint.edge]
  if (rawPosition === null) {
    throw new Error(`The scale projection did not resolve the position of the ${constraint.edge} edge`)
  }

  const positionCorrection = constraint.position - rawPosition
  const coefficientNorm = Math.hypot(...projectionEdge.coefficients)
  if (coefficientNorm <= PROJECTION_RANK_EPSILON) {
    return Math.abs(positionCorrection) <= epsilon
      ? createProjectionSolution({ projection, values: rawValues })
      : null
  }

  const inverseMetricCoefficients = projectionEdge.coefficients.map((coefficient, index) => {
    return coefficient / (projection.variableSceneWeights[index] ** 2)
  })
  const constraintMetricNorm = projectionEdge.coefficients.reduce((sum, coefficient, index) => {
    return sum + (coefficient * inverseMetricCoefficients[index])
  }, 0)
  const values = rawValues.map((value, index) => {
    return value + ((inverseMetricCoefficients[index] * positionCorrection) / constraintMetricNorm)
  })

  return createProjectionSolution({ projection, values })
}

/**
 * Attempts to satisfy two constraints with one or two scale parameters.
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
    const solution = resolveSingleConstraint({ projection, rawValues, constraint, epsilon })
    if (solution && areConstraintsSatisfied({ solution, constraints, epsilon })) return solution
  }

  return null
}

/**
 * Solves a nonsingular system of two constraints for two scale parameters.
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
  if (firstNorm <= PROJECTION_RANK_EPSILON || secondNorm <= PROJECTION_RANK_EPSILON) return null
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
 * Checks that the calculated solution satisfies all constraints.
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
 * Creates an immutable projection result.
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
 * Returns the distance between two sets of values, accounting for their scene weights.
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
