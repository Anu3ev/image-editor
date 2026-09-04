import { resolveActiveSelectionTextScaleStep } from '../../../../../src/editor/text-manager/scaling/active-selection-scale-plan'
import {
  createActiveSelectionTextScaleMeasurerSetup,
  createActiveSelectionTextScalePlan,
  installTextWrappingMeasurementContract,
  resolveActiveSelectionTextScaleMinimums
} from '../../../../test-utils/text/active-selection-scaling'

afterEach(jest.restoreAllMocks)

it('независимо уточняет обе оси по фактическим границам текстов', () => {
  installTextWrappingMeasurementContract()
  const { measurer } = createActiveSelectionTextScaleMeasurerSetup({
    controlKey: 'br',
    uniformScaling: false
  })
  const pointerMeasurement = measurer.measure({
    mode: 'free',
    multipliers: { x: 0.85, y: 1 }
  })
  const targetMeasurement = measurer.measure({
    mode: 'free',
    multipliers: { x: 0.9, y: 1.05 }
  })
  const plan = createActiveSelectionTextScalePlan({
    measurement: pointerMeasurement,
    xPosition: targetMeasurement.bounds.right,
    yPosition: targetMeasurement.bounds.bottom
  })

  const resolved = resolveActiveSelectionTextScaleStep({
    measurer,
    mode: 'free',
    plan,
    pointerMeasurement
  })

  expect(resolved.refinement?.constraints.x).toBe(plan.refinementCandidates.x)
  expect(resolved.refinement?.constraints.y).toBe(plan.refinementCandidates.y)
  expect(resolved.measurement.bounds.right).toBeCloseTo(targetMeasurement.bounds.right, 6)
  expect(resolved.measurement.bounds.bottom).toBeCloseTo(targetMeasurement.bounds.bottom, 6)
  expect(resolved.measurement.values[0]).not.toBe(resolved.measurement.values[1])
  expect(resolved.refinement?.effectiveValues).toEqual(resolved.measurement.values)

  measurer.dispose()
})

it('при прилипании по одной оси сохраняет положение второй оси указателя', () => {
  installTextWrappingMeasurementContract()
  const { measurer } = createActiveSelectionTextScaleMeasurerSetup({
    controlKey: 'br',
    uniformScaling: false
  })
  const pointerMeasurement = measurer.measure({
    mode: 'free',
    multipliers: { x: 0.85, y: 1.15 }
  })
  const horizontalTarget = measurer.measure({
    mode: 'free',
    multipliers: { x: 0.9, y: 1.15 }
  })
  const plan = createActiveSelectionTextScalePlan({
    measurement: pointerMeasurement,
    xPosition: horizontalTarget.bounds.right
  })

  const resolved = resolveActiveSelectionTextScaleStep({
    measurer,
    mode: 'free',
    plan,
    pointerMeasurement
  })

  expect(resolved.refinement?.constraints.x).toBe(plan.refinementCandidates.x)
  expect(resolved.refinement?.constraints.y).toBeNull()
  expect(resolved.measurement.bounds.right).toBeCloseTo(horizontalTarget.bounds.right, 6)
  expect(resolved.measurement.bounds.bottom).toBeCloseTo(pointerMeasurement.bounds.bottom, 6)

  measurer.dispose()
})

it('при пропорциональном скейлинге сохраняет подтверждённый размер внутри удержания', () => {
  installTextWrappingMeasurementContract()
  const { measurer } = createActiveSelectionTextScaleMeasurerSetup({
    controlKey: 'br',
    uniformScaling: true
  })
  const acquiredMeasurement = measurer.measure({
    mode: 'uniform',
    multipliers: { x: 0.9, y: 0.9 }
  })
  const pointerMeasurement = measurer.measure({
    mode: 'uniform',
    multipliers: { x: 0.9002, y: 0.9002 }
  })
  const plan = createActiveSelectionTextScalePlan({
    measurement: pointerMeasurement,
    transition: 'held',
    yPosition: acquiredMeasurement.bounds.bottom
  })

  expect(Math.abs(pointerMeasurement.bounds.bottom - acquiredMeasurement.bounds.bottom))
    .toBeLessThan(plan.verificationEpsilon)
  expect(pointerMeasurement.values).not.toEqual(acquiredMeasurement.values)

  measurer.apply({ measurement: acquiredMeasurement })
  const resolved = resolveActiveSelectionTextScaleStep({
    measurer,
    mode: 'uniform',
    plan,
    pointerMeasurement
  })

  expect(resolved.measurement).toBe(acquiredMeasurement)
  expect(resolved.refinement?.constraints.y).toBe(plan.constraints.y)
  expect(resolved.refinement?.effectiveValues).toEqual(acquiredMeasurement.values)

  measurer.dispose()
})

it('отбрасывает недостижимую направляющую и сохраняет доступную вторую ось', () => {
  installTextWrappingMeasurementContract()
  const { harness, measurer } = createActiveSelectionTextScaleMeasurerSetup({
    controlKey: 'br',
    uniformScaling: false
  })
  const minimums = resolveActiveSelectionTextScaleMinimums({ children: harness.children })
  const pointerMeasurement = measurer.measure({
    mode: 'free',
    multipliers: { x: minimums.width * 1.5, y: 0.8 }
  })
  const minimumMeasurement = measurer.measure({
    mode: 'free',
    multipliers: { x: 0, y: 0.9 }
  })
  const yTargetMeasurement = measurer.measure({
    mode: 'free',
    multipliers: { x: pointerMeasurement.multipliers.x, y: 0.9 }
  })
  const plan = createActiveSelectionTextScalePlan({
    measurement: pointerMeasurement,
    xPosition: minimumMeasurement.bounds.right - 10,
    yPosition: yTargetMeasurement.bounds.bottom
  })

  const resolved = resolveActiveSelectionTextScaleStep({
    measurer,
    mode: 'free',
    plan,
    pointerMeasurement
  })

  expect(resolved.refinement?.constraints.x).toBeNull()
  expect(resolved.refinement?.constraints.y).toBe(plan.refinementCandidates.y)
  expect(resolved.measurement.bounds.bottom).toBeCloseTo(yTargetMeasurement.bounds.bottom, 6)
  expect(resolved.measurement.bounds.right).not.toBeCloseTo(
    plan.refinementCandidates.x?.expectedPosition ?? Number.NaN,
    6
  )
  expect(resolved.measurement.multipliers.x).toBeGreaterThanOrEqual(minimums.width)
  expect(resolved.refinement?.effectiveValues).toEqual(resolved.measurement.values)

  measurer.dispose()
})
