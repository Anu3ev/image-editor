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
import type { TextCornerScaleMeasurement } from './text-corner-scale-measurer'

/** Источник точной геометрии текста при проверяемом множителе. */
export type TextCornerScaleMeasurementSource = Readonly<{
  measure({ scale }: { scale: number }): TextCornerScaleMeasurement
}>

/** Максимальное число уточнений множителя на одном движении указателя. */
const MAX_TEXT_CORNER_SCALE_REFINEMENT_STEPS = 8

/** Допуск остановки повторяющегося расчёта множителя. */
const TEXT_CORNER_SCALE_REFINEMENT_EPSILON = 0.0000001

/** Возвращает выбранные направляющие в формате локальной проекции. */
function createProjectionConstraints({
  constraints
}: {
  constraints: ScaleSnapConstraints
}): readonly ScaleProjectionConstraint[] {
  return [constraints.x, constraints.y]
    .filter((constraint): constraint is PlannedScaleConstraint => constraint !== null)
    .map((constraint) => Object.freeze({
      axis: constraint.axis,
      edge: constraint.candidate.edge,
      position: constraint.expectedPosition
    }))
}

/** Проверяет, какие выбранные направляющие достигнуты измеренным текстом. */
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

/** Проверяет, что измеренный текст достиг переданных направляющих. */
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

/** Рассчитывает следующий множитель по точной локальной геометрии текста. */
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

/** Проверяет, что множитель ещё не измерялся на текущем шаге. */
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

/** Подбирает множитель для конкретного набора предварительно выбранных направляющих. */
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
  const projectionConstraints = createProjectionConstraints({ constraints })
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
 * Подбирает множитель, при котором рассчитанный размер текста достигает выбранных направляющих.
 * Textbox на холсте при этом не изменяется.
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

/** Возвращает направляющие по одной в порядке исходного выбора общего расчёта. */
function createTextCornerScaleSingleConstraintAttempts({
  plan
}: {
  plan: ScaleSnapPlan
}): readonly ScaleSnapConstraints[] {
  const attempts: ScaleSnapConstraints[] = []
  const addedAxes = new Set<'x' | 'y'>()

  /** Добавляет ещё не проверенную направляющую выбранной оси. */
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

/** Возвращает только те предварительно выбранные направляющие, которых достиг измеренный текст. */
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

/** Выбирает измерение, достигшее хотя бы одной запланированной направляющей. */
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
