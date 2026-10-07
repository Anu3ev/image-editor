import {
  createScaleProjection,
  resolveScaleProjection,
  type ScaleProjectionConstraint
} from '../../snapping-manager/scaling/scale-projection'
import type {
  ScaleSnapPlan
} from '../../snapping-manager/scaling/scale-snapping-resolver'
import { createScaleProjectionConstraints } from '../../snapping-manager/scaling/scale-snapping-resolver'
import type { TextWidthResizeMeasurement } from './text-width-resize-measurer'

/** Source of exact Textbox geometry at the width being checked. */
export type TextWidthMeasurementSource = Readonly<{
  measure({ width }: { width: number }): TextWidthResizeMeasurement
}>

/** Maximum number of width refinements per pointer movement. */
const MAX_TEXT_WIDTH_REFINEMENT_STEPS = 8

/** Tolerance for stopping repeated width calculations. */
const TEXT_WIDTH_REFINEMENT_EPSILON = 0.0000001

/** Checks whether the measured geometry reaches all selected guides. */
function didReachPlannedGuides({
  measurement,
  plan
}: {
  measurement: TextWidthResizeMeasurement
  plan: ScaleSnapPlan
}): boolean {
  const { bounds } = measurement.projection

  return [plan.constraints.x, plan.constraints.y].every((constraint) => {
    if (!constraint) return true

    const position = bounds[constraint.candidate.edge]
    return Math.abs(position - constraint.expectedPosition) <= plan.verificationEpsilon
  })
}

/** Calculates the next width from the Textbox's exact local geometry. */
function resolveNextWidth({
  measurement,
  plan,
  constraints
}: {
  measurement: TextWidthResizeMeasurement
  plan: ScaleSnapPlan
  constraints: readonly ScaleProjectionConstraint[]
}): number | null {
  const projection = createScaleProjection({
    bounds: measurement.projection.bounds,
    input: measurement.projection.projection
  })
  const solution = resolveScaleProjection({
    projection,
    rawValues: [measurement.width],
    constraints,
    epsilon: plan.verificationEpsilon
  })
  const [nextWidth] = solution?.values ?? []

  return typeof nextWidth === 'number' && Number.isFinite(nextWidth) ? nextWidth : null
}

/** Checks that the width has not yet been measured in the current step. */
function isNewWidth({
  width,
  measuredWidths
}: {
  width: number
  measuredWidths: readonly number[]
}): boolean {
  return measuredWidths.every((measuredWidth) => {
    return Math.abs(measuredWidth - width) > TEXT_WIDTH_REFINEMENT_EPSILON
  })
}

/**
 * Finds a width that reaches the already selected guides after line wrapping.
 * The live Textbox remains unchanged.
 */
export function resolveTextWidthSnapMeasurement({
  plan,
  measurer
}: {
  plan: ScaleSnapPlan
  measurer: TextWidthMeasurementSource
}): TextWidthResizeMeasurement | null {
  const [initialWidth] = plan.effectiveValues
  if (!Number.isFinite(initialWidth)) return null

  const constraints = createScaleProjectionConstraints({ constraints: plan.constraints })
  if (constraints.length === 0) return null

  const measuredWidths: number[] = []
  let width = initialWidth

  for (let step = 0; step < MAX_TEXT_WIDTH_REFINEMENT_STEPS; step += 1) {
    const measurement = measurer.measure({ width })
    measuredWidths.push(measurement.width)
    if (didReachPlannedGuides({ measurement, plan })) return measurement

    const nextWidth = resolveNextWidth({ measurement, plan, constraints })
    if (nextWidth === null || !isNewWidth({ width: nextWidth, measuredWidths })) return null

    width = nextWidth
  }

  return null
}
