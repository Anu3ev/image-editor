import {
  createTextCornerScaleMeasurement,
  createTextCornerScaleSnapPlan,
  createTextCornerScaleSnapPlanWithSecondAxis
} from '../../../../test-utils/text/corner-scale-plan'
import type { ScaleSnapPlan } from '../../../../../src/editor/snapping-manager/scaling/scale-snapping-resolver'
import {
  resolveReachedTextCornerScaleConstraints,
  resolveReachedTextCornerScaleFallback,
  resolveTextCornerScaleSnapMeasurement,
  type TextCornerScaleMeasurementSource
} from '../../../../../src/editor/text-manager/scaling/text-corner-scale-plan'

it('уточняет множитель по фактическим размерам текста', () => {
  const measuredScales: number[] = []
  const measurer: TextCornerScaleMeasurementSource = {
    measure: ({ scale }) => {
      measuredScales.push(scale)

      return createTextCornerScaleMeasurement({
        scale,
        right: scale < 1.05 ? 303 : 304
      })
    }
  }

  const measurement = resolveTextCornerScaleSnapMeasurement({
    plan: createTextCornerScaleSnapPlan(),
    measurer
  })

  expect(measuredScales).toEqual([1.04, 1.05])
  expect(measurement?.scale).toBe(1.05)
  expect(measurement?.projection.bounds.right).toBe(304)
})

it('отклоняет прилипание, если компоновка текста не позволяет достичь направляющей', () => {
  const measuredScales: number[] = []
  const measurer: TextCornerScaleMeasurementSource = {
    measure: ({ scale }) => {
      measuredScales.push(scale)

      return createTextCornerScaleMeasurement({
        scale,
        right: scale < 1.05 ? 303 : 305
      })
    }
  }

  const measurement = resolveTextCornerScaleSnapMeasurement({
    plan: createTextCornerScaleSnapPlan(),
    measurer
  })

  expect(measurement).toBeNull()
  expect(measuredScales).toEqual([1.04, 1.05])
})

it('сохраняет предыдущий подтверждённый множитель внутри удержания', () => {
  const measuredScales: number[] = []
  const measurer: TextCornerScaleMeasurementSource = {
    measure: ({ scale }) => {
      measuredScales.push(scale)

      return createTextCornerScaleMeasurement({ scale, right: 304 })
    }
  }

  const measurement = resolveTextCornerScaleSnapMeasurement({
    plan: createTextCornerScaleSnapPlan(),
    measurer,
    preferredScale: 1.03
  })

  expect(measuredScales).toEqual([1.03])
  expect(measurement?.scale).toBe(1.03)
  expect(measurement?.projection.bounds.right).toBe(304)
})

it('сохраняет только направляющую, которой достиг размер по указателю', () => {
  const planWithSecondAxis = createTextCornerScaleSnapPlanWithSecondAxis()
  const measurement = createTextCornerScaleMeasurement({ scale: 1.04, right: 304 })

  const constraints = resolveReachedTextCornerScaleConstraints({
    measurement,
    plan: planWithSecondAxis
  })

  expect(constraints.x).toBe(planWithSecondAxis.refinementCandidates.x)
  expect(constraints.y).toBeNull()
  expect(Object.isFrozen(constraints)).toBe(true)
})

it('сохраняет доступную направляющую по одной оси, когда две направляющие несовместимы', () => {
  const plan = createTextCornerScaleSnapPlanWithSecondAxis()
  const measuredScales: number[] = []
  const measurer: TextCornerScaleMeasurementSource = {
    measure: ({ scale }) => {
      measuredScales.push(scale)

      return createTextCornerScaleMeasurement({
        bottom: scale >= 1.06 ? 145 : 143,
        bottomCoefficient: 100,
        right: 303,
        rightCoefficient: 0,
        scale
      })
    }
  }
  const pointerMeasurement = createTextCornerScaleMeasurement({
    bottom: 142,
    right: 302,
    scale: 1.02
  })

  const pairedMeasurement = resolveTextCornerScaleSnapMeasurement({ measurer, plan })
  const fallback = resolveReachedTextCornerScaleFallback({
    measurer,
    plan,
    pointerMeasurement
  })

  expect(pairedMeasurement).toBeNull()
  expect(fallback.measurement.scale).toBeCloseTo(1.06, 7)
  expect(fallback.measurement.projection.bounds.bottom).toBe(145)
  expect(fallback.constraints.x).toBeNull()
  expect(fallback.constraints.y).toBe(plan.refinementCandidates.y)
  expect(measuredScales).toContain(1.06)
})

it('при несовместимых направляющих сохраняет уже удерживаемую ось', () => {
  const basePlan = createTextCornerScaleSnapPlanWithSecondAxis()
  const xConstraint = basePlan.refinementCandidates.x
  const yConstraint = basePlan.refinementCandidates.y
  if (!xConstraint || !yConstraint) throw new Error('Тестовый план должен содержать обе направляющие')

  const plan: ScaleSnapPlan = Object.freeze({
    ...basePlan,
    constraints: Object.freeze({
      x: Object.freeze({ ...xConstraint, transition: 'acquired' as const }),
      y: Object.freeze({ ...yConstraint, transition: 'held' as const })
    })
  })
  const measurer: TextCornerScaleMeasurementSource = {
    measure: ({ scale }) => createTextCornerScaleMeasurement({
      bottom: Math.abs(scale - 1.03) < 0.0000001 ? 145 : 143,
      bottomCoefficient: 0,
      right: Math.abs(scale - 1.04) < 0.0000001 ? 304 : 303,
      rightCoefficient: 0,
      scale
    })
  }

  const fallback = resolveReachedTextCornerScaleFallback({
    measurer,
    plan,
    pointerMeasurement: createTextCornerScaleMeasurement({ scale: 1.02, right: 302 }),
    preferredScale: 1.03
  })

  expect(fallback.measurement.scale).toBe(1.03)
  expect(fallback.measurement.projection.bounds.bottom).toBe(145)
  expect(fallback.constraints.x).toBeNull()
  expect(fallback.constraints.y).toBe(plan.refinementCandidates.y)
})

it('после несовместимого уточнения сохраняет направляющую, достигнутую выбранным множителем', () => {
  const plan = createTextCornerScaleSnapPlan()
  const pointerMeasurement = createTextCornerScaleMeasurement({ scale: 1.02, right: 302 })
  const measurer: TextCornerScaleMeasurementSource = {
    measure: ({ scale }) => createTextCornerScaleMeasurement({ scale, right: 304 })
  }

  const fallback = resolveReachedTextCornerScaleFallback({
    measurer,
    plan,
    pointerMeasurement
  })

  expect(fallback.measurement.projection.bounds.right).toBe(304)
  expect(fallback.measurement.scale).toBe(plan.effectiveValues[0])
  expect(fallback.constraints.x).toEqual(plan.refinementCandidates.x)
  expect(fallback.constraints.y).toBeNull()
})

it('возвращается к размеру по указателю, если выбранный множитель не достиг направляющих', () => {
  const plan = createTextCornerScaleSnapPlan()
  const pointerMeasurement = createTextCornerScaleMeasurement({ scale: 1.02, right: 302 })
  const measurer: TextCornerScaleMeasurementSource = {
    measure: ({ scale }) => createTextCornerScaleMeasurement({ scale, right: 303 })
  }

  const fallback = resolveReachedTextCornerScaleFallback({
    measurer,
    plan,
    pointerMeasurement
  })

  expect(fallback.measurement).toBe(pointerMeasurement)
  expect(fallback.constraints.x).toBeNull()
  expect(fallback.constraints.y).toBeNull()
  expect(Object.isFrozen(fallback.constraints)).toBe(true)
})
