import {
  createScaleProjection,
  resolveScaleProjection,
  resolveScaleSceneEdgeAxis,
  type ScaleProjectionConstraint
} from '../../snapping-manager/scaling/scale-projection'
import type {
  PlannedScaleConstraint,
  ScaleSnapConstraints,
  ScaleSnapPlan,
  ScaleSnapPlanRefinement
} from '../../snapping-manager/scaling/scale-snapping-resolver'
import { createScaleProjectionConstraints } from '../../snapping-manager/scaling/scale-snapping-resolver'
import type { RectangularScaleGestureMode } from '../../snapping-manager/scaling/rectangular-scale-gesture-projection'
import type {
  ActiveSelectionTextScaleMeasurement
} from './active-selection-scale-measurer'

/** Source of exact measurements and the last confirmed state of a selection containing text. */
export type ActiveSelectionTextScaleMeasurementSource = Readonly<{
  getLastConfirmedMeasurement(): ActiveSelectionTextScaleMeasurement | null
  measureValues({
    mode,
    values
  }: {
    mode: RectangularScaleGestureMode
    values: readonly number[]
  }): ActiveSelectionTextScaleMeasurement
}>

/** Measurement and optional refinement of one snapping plan. */
export type ResolvedActiveSelectionTextScaleStep = Readonly<{
  measurement: ActiveSelectionTextScaleMeasurement
  refinement: ScaleSnapPlanRefinement | null
}>

/** Maximum number of nonlinear-geometry refinements per pointer movement. */
const MAX_ACTIVE_SELECTION_TEXT_SCALE_REFINEMENT_STEPS = 8

/** Tolerance for remeasuring one set of multipliers. */
const ACTIVE_SELECTION_TEXT_SCALE_REFINEMENT_EPSILON = 0.0000001

/** Checks whether the measured frame reaches one selected guide. */
function reachesConstraint({
  constraint,
  measurement,
  plan
}: {
  constraint: PlannedScaleConstraint | null
  measurement: ActiveSelectionTextScaleMeasurement
  plan: ScaleSnapPlan
}): boolean {
  if (!constraint) return true

  return Math.abs(measurement.bounds[constraint.candidate.edge] - constraint.expectedPosition)
    <= plan.verificationEpsilon
}

/** Retains only guides actually reached by the measured frame. */
function resolveReachedConstraints({
  constraints,
  measurement,
  plan
}: {
  constraints: ScaleSnapConstraints
  measurement: ActiveSelectionTextScaleMeasurement
  plan: ScaleSnapPlan
}): ScaleSnapConstraints {
  return Object.freeze({
    x: reachesConstraint({ constraint: constraints.x, measurement, plan }) ? constraints.x : null,
    y: reachesConstraint({ constraint: constraints.y, measurement, plan }) ? constraints.y : null
  })
}

/** Checks all constraints, including preservation of the pointer's unconstrained axis. */
function reachesProjectionConstraints({
  constraints,
  measurement,
  plan
}: {
  constraints: readonly ScaleProjectionConstraint[]
  measurement: ActiveSelectionTextScaleMeasurement
  plan: ScaleSnapPlan
}): boolean {
  return constraints.every(({ edge, position }) => {
    return Math.abs(measurement.bounds[edge] - position) <= plan.verificationEpsilon
  })
}

/** Adds the pointer-specified position of the second axis to the guide constraints. */
function createMeasurementConstraints({
  constraints,
  pointerMeasurement
}: {
  constraints: ScaleSnapConstraints
  pointerMeasurement: ActiveSelectionTextScaleMeasurement
}): readonly ScaleProjectionConstraint[] {
  const result = [...createScaleProjectionConstraints({ constraints })]
  if (pointerMeasurement.projection.projection.variables.length !== 2) return Object.freeze(result)

  const constrainedAxes = new Set(result.map(({ axis }) => axis))
  for (const { edge } of pointerMeasurement.projection.projection.edges) {
    const axis = resolveScaleSceneEdgeAxis({ edge })
    if (constrainedAxes.has(axis)) continue

    result.push(Object.freeze({
      axis,
      edge,
      position: pointerMeasurement.bounds[edge]
    }))
    constrainedAxes.add(axis)
  }

  return Object.freeze(result)
}

/** Checks that the set of multipliers has not yet been measured in the current step. */
function areValuesNew({
  measuredValues,
  values
}: {
  measuredValues: readonly (readonly number[])[]
  values: readonly number[]
}): boolean {
  return measuredValues.every((measured) => {
    return measured.length !== values.length || measured.some((value, index) => {
      return Math.abs(value - values[index]) > ACTIVE_SELECTION_TEXT_SCALE_REFINEMENT_EPSILON
    })
  })
}

/** Calculates the next set of multipliers from the local measured projection. */
function resolveNextValues({
  constraints,
  measurement,
  plan
}: {
  constraints: readonly ScaleProjectionConstraint[]
  measurement: ActiveSelectionTextScaleMeasurement
  plan: ScaleSnapPlan
}): readonly number[] | null {
  const projection = createScaleProjection({
    bounds: measurement.projection.bounds,
    input: measurement.projection.projection
  })
  const solution = resolveScaleProjection({
    projection,
    rawValues: measurement.values,
    constraints,
    epsilon: plan.verificationEpsilon
  })

  return solution ? Object.freeze([...solution.values]) : null
}

/** Finds a measurement that reaches the supplied set of guides. */
function resolveMeasurementForConstraints({
  constraints,
  initialValues,
  measurer,
  mode,
  plan,
  pointerMeasurement
}: {
  constraints: ScaleSnapConstraints
  initialValues: readonly number[]
  measurer: ActiveSelectionTextScaleMeasurementSource
  mode: RectangularScaleGestureMode
  plan: ScaleSnapPlan
  pointerMeasurement: ActiveSelectionTextScaleMeasurement
}): ActiveSelectionTextScaleMeasurement | null {
  const projectionConstraints = createMeasurementConstraints({ constraints, pointerMeasurement })
  if (projectionConstraints.length === 0) return null

  const measuredValues: Array<readonly number[]> = []
  let values = initialValues

  for (let step = 0; step < MAX_ACTIVE_SELECTION_TEXT_SCALE_REFINEMENT_STEPS; step += 1) {
    const measurement = measurer.measureValues({ mode, values })
    measuredValues.push(measurement.values)
    if (reachesProjectionConstraints({ constraints: projectionConstraints, measurement, plan })) return measurement

    const nextValues = resolveNextValues({
      constraints: projectionConstraints,
      measurement,
      plan
    })
    if (!nextValues || !areValuesNew({ measuredValues, values: nextValues })) return null
    values = nextValues
  }

  return null
}

/** Returns guides one at a time, preserving priority for the already held axis. */
function createSingleConstraintAttempts({
  plan
}: {
  plan: ScaleSnapPlan
}): readonly ScaleSnapConstraints[] {
  const axes: Array<'x' | 'y'> = ['x', 'y']
  axes.sort((first, second) => {
    return Number(plan.constraints[second]?.transition === 'held')
      - Number(plan.constraints[first]?.transition === 'held')
  })

  const attempts: ScaleSnapConstraints[] = []
  const addedAxes = new Set<'x' | 'y'>()
  /** Adds one axis constraint if it is not already included in the attempts. */
  const addAxis = (axis: 'x' | 'y', source: ScaleSnapConstraints): void => {
    if (addedAxes.has(axis) || !source[axis]) return
    attempts.push(Object.freeze({
      x: axis === 'x' ? source.x : null,
      y: axis === 'y' ? source.y : null
    }))
    addedAxes.add(axis)
  }

  axes.forEach((axis) => addAxis(axis, plan.constraints))
  axes.forEach((axis) => addAxis(axis, plan.refinementCandidates))

  return Object.freeze(attempts)
}

/** Creates a step result with the shared plan refined against the measured state. */
function createRefinedStep({
  constraints,
  measurement
}: {
  constraints: ScaleSnapConstraints
  measurement: ActiveSelectionTextScaleMeasurement
}): ResolvedActiveSelectionTextScaleStep {
  return Object.freeze({
    measurement,
    refinement: Object.freeze({
      constraints,
      effectiveValues: measurement.values,
      stepProjection: measurement.projection
    })
  })
}

/** Preserves confirmed geometry when the held snap already determines the proportional size. */
function resolveHeldUniformMeasurement({
  measurer,
  mode,
  plan
}: {
  measurer: ActiveSelectionTextScaleMeasurementSource
  mode: RectangularScaleGestureMode
  plan: ScaleSnapPlan
}): ResolvedActiveSelectionTextScaleStep | null {
  if (mode !== 'uniform') return null

  const heldAxes = (['x', 'y'] as const).filter((axis) => {
    return plan.constraints[axis]?.transition === 'held'
  })
  if (heldAxes.length === 0) return null

  const measurement = measurer.getLastConfirmedMeasurement()
  if (!measurement || measurement.mode !== mode) return null

  const constraints = resolveReachedConstraints({
    constraints: plan.refinementCandidates,
    measurement,
    plan
  })
  const preservesHeldAxes = heldAxes.every((axis) => {
    const held = plan.constraints[axis]
    const reached = constraints[axis]
    if (!held || !reached) return false

    return held.candidate.id === reached.candidate.id
      && Math.abs(held.expectedPosition - reached.expectedPosition) <= plan.verificationEpsilon
  })
  if (!preservesHeldAxes) return null

  return createRefinedStep({ constraints, measurement })
}

/**
 * Refines the shared plan using the actual geometry of all children and retains only reachable guides.
 */
export function resolveActiveSelectionTextScaleStep({
  measurer,
  mode,
  plan,
  pointerMeasurement
}: {
  measurer: ActiveSelectionTextScaleMeasurementSource
  mode: RectangularScaleGestureMode
  plan: ScaleSnapPlan
  pointerMeasurement: ActiveSelectionTextScaleMeasurement
}): ResolvedActiveSelectionTextScaleStep {
  const heldMeasurement = resolveHeldUniformMeasurement({ measurer, mode, plan })
  if (heldMeasurement) return heldMeasurement

  const candidates = plan.refinementCandidates
  if (!candidates.x && !candidates.y) {
    return Object.freeze({ measurement: pointerMeasurement, refinement: null })
  }

  const plannedMeasurement = resolveMeasurementForConstraints({
    constraints: candidates,
    initialValues: plan.effectiveValues,
    measurer,
    mode,
    plan,
    pointerMeasurement
  })
  if (plannedMeasurement) {
    return createRefinedStep({ constraints: candidates, measurement: plannedMeasurement })
  }

  for (const constraints of createSingleConstraintAttempts({ plan })) {
    const measurement = resolveMeasurementForConstraints({
      constraints,
      initialValues: plan.effectiveValues,
      measurer,
      mode,
      plan,
      pointerMeasurement
    })
    if (!measurement) continue

    return createRefinedStep({ constraints, measurement })
  }

  const reached = resolveReachedConstraints({
    constraints: candidates,
    measurement: pointerMeasurement,
    plan
  })

  return createRefinedStep({ constraints: reached, measurement: pointerMeasurement })
}
