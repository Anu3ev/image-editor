import {
  createScaleProjection,
  resolveScaleProjection,
  type ScaleProjectionConstraint
} from '../../snapping-manager/scaling/scale-projection'
import type {
  PlannedScaleConstraint,
  ScaleSnapConstraints,
  ScaleSnapPlan
} from '../../snapping-manager/scaling/scale-snapping-resolver'
import { createScaleProjectionConstraints } from '../../snapping-manager/scaling/scale-snapping-resolver'
import type { TextCornerScaleMeasurement } from './text-corner-scale-measurer'

/** Source of exact text geometry at the multiplier being checked. */
export type TextCornerScaleMeasurementSource = Readonly<{
  measure({ scale }: { scale: number }): TextCornerScaleMeasurement
}>

/** Maximum number of multiplier refinements per pointer movement. */
const MAX_TEXT_CORNER_SCALE_REFINEMENT_STEPS = 8

/** Tolerance for stopping repeated multiplier calculations. */
const TEXT_CORNER_SCALE_REFINEMENT_EPSILON = 0.0000001

/** Checks which selected guides the measured text reaches. */
function resolveReachedPlannedAxes({
  constraints,
  measurement,
  plan
}: {
  constraints: ScaleSnapConstraints
  measurement: TextCornerScaleMeasurement
  plan: ScaleSnapPlan
}): Readonly<{ x: boolean; y: boolean }> {
  const { bounds } = measurement.projection
  const reaches = (constraint: PlannedScaleConstraint | null): boolean => {
    if (!constraint) return true

    return Math.abs(bounds[constraint.candidate.edge] - constraint.expectedPosition)
      <= plan.verificationEpsilon
  }

  return Object.freeze({
    x: reaches(constraints.x),
    y: reaches(constraints.y)
  })
}

/** Checks that the measured text reaches the supplied guides. */
function didReachTextCornerScaleConstraints({
  constraints,
  measurement,
  plan
}: {
  constraints: ScaleSnapConstraints
  measurement: TextCornerScaleMeasurement
  plan: ScaleSnapPlan
}): boolean {
  const reached = resolveReachedPlannedAxes({
    constraints,
    measurement,
    plan
  })

  return reached.x && reached.y
}

/** Calculates the next multiplier from exact local text geometry. */
function resolveNextScale({
  constraints,
  measurement,
  plan
}: {
  constraints: readonly ScaleProjectionConstraint[]
  measurement: TextCornerScaleMeasurement
  plan: ScaleSnapPlan
}): number | null {
  const projection = createScaleProjection({
    bounds: measurement.projection.bounds,
    input: measurement.projection.projection
  })
  const solution = resolveScaleProjection({
    projection,
    rawValues: [measurement.scale],
    constraints,
    epsilon: plan.verificationEpsilon
  })
  const [nextScale] = solution?.values ?? []

  return typeof nextScale === 'number' && Number.isFinite(nextScale) ? nextScale : null
}

/** Checks that the multiplier has not yet been measured in the current step. */
function isNewScale({
  measuredScales,
  scale
}: {
  measuredScales: readonly number[]
  scale: number
}): boolean {
  return measuredScales.every((measuredScale) => {
    return Math.abs(measuredScale - scale) > TEXT_CORNER_SCALE_REFINEMENT_EPSILON
  })
}

/** Finds a multiplier for a specific set of preselected guides. */
function resolveTextCornerScaleMeasurementForConstraints({
  constraints,
  initialScale,
  measurer,
  plan,
  preferredScale
}: {
  constraints: ScaleSnapConstraints
  initialScale: number
  measurer: TextCornerScaleMeasurementSource
  plan: ScaleSnapPlan
  preferredScale?: number
}): TextCornerScaleMeasurement | null {
  const projectionConstraints = createScaleProjectionConstraints({ constraints })
  if (projectionConstraints.length === 0) return null

  const measuredScales: number[] = []
  if (typeof preferredScale === 'number' && Number.isFinite(preferredScale)) {
    const preferredMeasurement = measurer.measure({ scale: preferredScale })
    measuredScales.push(preferredMeasurement.scale)
    if (didReachTextCornerScaleConstraints({ constraints, measurement: preferredMeasurement, plan })) {
      return preferredMeasurement
    }
  }

  let scale = initialScale

  for (let step = 0; step < MAX_TEXT_CORNER_SCALE_REFINEMENT_STEPS; step += 1) {
    const measurement = measurer.measure({ scale })
    measuredScales.push(measurement.scale)
    if (didReachTextCornerScaleConstraints({ constraints, measurement, plan })) return measurement

    const nextScale = resolveNextScale({ constraints: projectionConstraints, measurement, plan })
    if (nextScale === null || !isNewScale({ measuredScales, scale: nextScale })) return null

    scale = nextScale
  }

  return null
}

/**
 * Finds a multiplier at which the calculated text dimensions reach the selected guides.
 * The Textbox on the canvas remains unchanged.
 */
export function resolveTextCornerScaleSnapMeasurement({
  measurer,
  plan,
  preferredScale
}: {
  measurer: TextCornerScaleMeasurementSource
  plan: ScaleSnapPlan
  preferredScale?: number
}): TextCornerScaleMeasurement | null {
  const [initialScale] = plan.effectiveValues
  if (!Number.isFinite(initialScale)) return null

  return resolveTextCornerScaleMeasurementForConstraints({
    constraints: plan.refinementCandidates,
    initialScale,
    measurer,
    plan,
    preferredScale
  })
}

/** Returns guides one at a time in their original selection order from the shared calculation. */
function createTextCornerScaleSingleConstraintAttempts({
  plan
}: {
  plan: ScaleSnapPlan
}): readonly ScaleSnapConstraints[] {
  const attempts: ScaleSnapConstraints[] = []
  const addedAxes = new Set<'x' | 'y'>()

  /** Adds an untested guide for the selected axis. */
  const addAxis = (axis: 'x' | 'y', constraints: ScaleSnapConstraints): void => {
    if (addedAxes.has(axis) || !constraints[axis]) return

    attempts.push(Object.freeze({
      x: axis === 'x' ? constraints.x : null,
      y: axis === 'y' ? constraints.y : null
    }))
    addedAxes.add(axis)
  }

  const orderedAxes: Array<'x' | 'y'> = ['x', 'y']
  orderedAxes.sort((first, second) => {
    const firstIsHeld = plan.constraints[first]?.transition === 'held'
    const secondIsHeld = plan.constraints[second]?.transition === 'held'

    return Number(secondIsHeld) - Number(firstIsHeld)
  })

  for (const axis of orderedAxes) addAxis(axis, plan.constraints)
  for (const axis of orderedAxes) addAxis(axis, plan.refinementCandidates)

  return Object.freeze(attempts)
}

/** Returns only the preselected guides reached by the measured text. */
export function resolveReachedTextCornerScaleConstraints({
  measurement,
  plan
}: {
  measurement: TextCornerScaleMeasurement
  plan: ScaleSnapPlan
}): ScaleSnapConstraints {
  const { refinementCandidates } = plan
  const reached = resolveReachedPlannedAxes({
    constraints: refinementCandidates,
    measurement,
    plan
  })

  return Object.freeze({
    x: reached.x ? refinementCandidates.x : null,
    y: reached.y ? refinementCandidates.y : null
  })
}

/** Selects a measurement that reaches at least one planned guide. */
export function resolveReachedTextCornerScaleFallback({
  measurer,
  plan,
  pointerMeasurement,
  preferredScale
}: {
  measurer: TextCornerScaleMeasurementSource
  plan: ScaleSnapPlan
  pointerMeasurement: TextCornerScaleMeasurement
  preferredScale?: number
}): Readonly<{
  constraints: ScaleSnapConstraints
  measurement: TextCornerScaleMeasurement
}> {
  const [plannedScale] = plan.effectiveValues
  if (typeof plannedScale !== 'number' || !Number.isFinite(plannedScale)) {
    throw new Error('План углового скейлинга текста должен содержать конечный множитель')
  }

  if (typeof preferredScale === 'number' && Number.isFinite(preferredScale)) {
    const measurement = measurer.measure({ scale: preferredScale })
    const constraints = resolveReachedTextCornerScaleConstraints({ measurement, plan })
    if (constraints.x || constraints.y) {
      return Object.freeze({ constraints, measurement })
    }
  }

  {
    const measurement = measurer.measure({ scale: plannedScale })
    const constraints = resolveReachedTextCornerScaleConstraints({ measurement, plan })
    if (constraints.x || constraints.y) {
      return Object.freeze({ constraints, measurement })
    }
  }

  const pointerConstraints = resolveReachedTextCornerScaleConstraints({
    measurement: pointerMeasurement,
    plan
  })
  if (pointerConstraints.x || pointerConstraints.y) {
    return Object.freeze({ constraints: pointerConstraints, measurement: pointerMeasurement })
  }

  for (const constraints of createTextCornerScaleSingleConstraintAttempts({ plan })) {
    const measurement = resolveTextCornerScaleMeasurementForConstraints({
      constraints,
      initialScale: plannedScale,
      measurer,
      plan
    })
    if (measurement) return Object.freeze({ constraints, measurement })
  }

  return Object.freeze({
    constraints: pointerConstraints,
    measurement: pointerMeasurement
  })
}
