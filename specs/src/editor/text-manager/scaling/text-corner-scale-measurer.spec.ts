import { createTextCornerScaleMeasurerHarness } from '../../../../test-utils/text/corner-scale-interaction'

it('сохраняет дробные канонические размеры при измерении углового скейлинга', () => {
  const harness = createTextCornerScaleMeasurerHarness({
    fontSize: 32,
    text: 'Текст',
    width: 101
  })

  try {
    const measurement = harness.measurer.measure({ scale: 0.5 })

    expect(measurement.scale).toBe(0.5)
    expect(measurement.canonicalState.width).toBe(50.5)
    expect(measurement.canonicalState.fontSize).toBe(16)
    expect(measurement.canonicalState.scaleX).toBe(1)
    expect(measurement.canonicalState.scaleY).toBe(1)
    expect(measurement.projection.bounds.right).toBeGreaterThan(measurement.projection.bounds.left)
  } finally {
    harness.dispose()
  }
})

it('не прерывает уменьшение текста, который уже достиг минимального размера', () => {
  const harness = createTextCornerScaleMeasurerHarness()

  try {
    const measurement = harness.measurer.measure({ scale: 0.5 })
    const hasMovingEdge = measurement.projection.projection.edges.some(({ coefficients }) => {
      return coefficients.some((coefficient) => Math.abs(coefficient) > 0)
    })

    expect(measurement.scale).toBe(1)
    expect(measurement.canonicalState.width).toBeGreaterThanOrEqual(1)
    expect(hasMovingEdge).toBe(true)
    expect(harness.target.width).toBe(1)
    expect(harness.target.fontSize).toBe(6)
  } finally {
    harness.dispose()
  }
})

it('повторно использует два последних измерения во время удержания', () => {
  const harness = createTextCornerScaleMeasurerHarness()

  try {
    const held = harness.measurer.measure({ scale: 1.1 })
    const raw = harness.measurer.measure({ scale: 1.2 })
    const heldAgain = harness.measurer.measure({ scale: 1.1 })
    const nextRaw = harness.measurer.measure({ scale: 1.3 })
    const heldAfterNextRaw = harness.measurer.measure({ scale: 1.1 })

    expect(heldAgain).toBe(held)
    expect(heldAfterNextRaw).toBe(held)
    expect(raw).not.toBe(nextRaw)
    expect(harness.target.width).toBe(1)
    expect(harness.target.fontSize).toBe(6)
  } finally {
    harness.dispose()
  }
})

it('использует одно измерение для разных значений ниже минимального размера', () => {
  const harness = createTextCornerScaleMeasurerHarness()

  try {
    const first = harness.measurer.measure({ scale: 0.25 })
    const second = harness.measurer.measure({ scale: 0.75 })

    expect(second).toBe(first)
    expect(second.scale).toBe(1)
    expect(harness.target.width).toBe(1)
    expect(harness.target.fontSize).toBe(6)
  } finally {
    harness.dispose()
  }
})
