import {
  createScaleProjection,
  resolveScaleProjection,
  type ScaleProjectionConstraint
} from '../../snapping-manager/scaling/scale-projection'
import type {
  PlannedScaleConstraint,
  ScaleSnapPlan
} from '../../snapping-manager/scaling/scale-snapping-resolver'
import type { TextWidthResizeMeasurement } from './text-width-resize-measurer'

/** Источник точной геометрии Textbox при проверяемой ширине. */
export type TextWidthMeasurementSource = Readonly<{
  measure({ width }: { width: number }): TextWidthResizeMeasurement
}>

/** Максимальное число уточнений ширины на одном движении указателя. */
const MAX_TEXT_WIDTH_REFINEMENT_STEPS = 8

/** Допуск остановки повторяющегося расчёта ширины. */
const TEXT_WIDTH_REFINEMENT_EPSILON = 0.0000001

/** Возвращает ограничения плана в формате линейной проекции. */
function createProjectionConstraints({
  plan
}: {
  plan: ScaleSnapPlan
}): readonly ScaleProjectionConstraint[] {
  return [plan.constraints.x, plan.constraints.y]
    .filter((constraint): constraint is PlannedScaleConstraint => constraint !== null)
    .map((constraint) => Object.freeze({
      axis: constraint.axis,
      edge: constraint.candidate.edge,
      position: constraint.expectedPosition
    }))
}

/** Проверяет достижение всех выбранных направляющих измеренной геометрией. */
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

/** Рассчитывает следующую ширину из точной локальной геометрии Textbox. */
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

/** Проверяет, что ширина ещё не измерялась на текущем шаге. */
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
 * Подбирает ширину, которая после переноса строк достигает уже выбранных направляющих.
 * Живой Textbox при этом не изменяется.
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

  const constraints = createProjectionConstraints({ plan })
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
