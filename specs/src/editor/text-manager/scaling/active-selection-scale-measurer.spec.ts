import {
  createActiveSelectionTextScaleMeasurerSetup,
  installTextWrappingMeasurementContract,
  resolveActiveSelectionTextScaleMinimums
} from '../../../../test-utils/text/active-selection-scaling'

afterEach(jest.restoreAllMocks)

it('учитывает перенос строк при горизонтальном уменьшении', () => {
  installTextWrappingMeasurementContract()
  const { harness, measurer } = createActiveSelectionTextScaleMeasurerSetup({ controlKey: 'mr' })
  const initial = measurer.measure({ mode: 'horizontal', multipliers: { x: 1, y: 1 } })
  const narrowed = measurer.measure({ mode: 'horizontal', multipliers: { x: 0.5, y: 1 } })

  expect(narrowed.children[0].canonicalState.lineCount)
    .toBeGreaterThan(initial.children[0].canonicalState.lineCount)
  expect(narrowed.children[1].canonicalState.lineCount)
    .toBeGreaterThan(initial.children[1].canonicalState.lineCount)
  expect(narrowed.children[0].canonicalState.width)
    .toBeCloseTo(initial.children[0].canonicalState.width * 0.5, 9)
  expect(narrowed.children[0].canonicalState.fontSize)
    .toBe(initial.children[0].canonicalState.fontSize)
  expect(narrowed.frame.height).toBeGreaterThan(initial.frame.height)
  expect(harness.children[0].width).not.toBe(narrowed.children[0].canonicalState.width)

  measurer.dispose()
})

it('учитывает перенос строк при свободном скейлинге по обеим осям', () => {
  installTextWrappingMeasurementContract()
  const { measurer } = createActiveSelectionTextScaleMeasurerSetup({
    controlKey: 'br',
    uniformScaling: false
  })
  const initial = measurer.measure({ mode: 'free', multipliers: { x: 1, y: 1 } })
  const scaled = measurer.measure({ mode: 'free', multipliers: { x: 0.55, y: 1.25 } })

  expect(scaled.children[0].canonicalState.lineCount)
    .toBeGreaterThan(initial.children[0].canonicalState.lineCount)
  expect(scaled.children[1].canonicalState.lineCount)
    .toBeGreaterThan(initial.children[1].canonicalState.lineCount)
  expect(scaled.frame.scaleX).toBeCloseTo(0.55, 6)
  expect(scaled.frame.scaleY).toBeCloseTo(1.25, 6)
  expect(scaled.children[0].canonicalState.width).not.toBe(initial.children[0].canonicalState.width)
  expect(scaled.children[0].canonicalState.fontSize).not.toBe(initial.children[0].canonicalState.fontSize)
  expect(scaled.multipliers.x).not.toBeCloseTo(0.55, 6)
  expect(scaled.multipliers.y).not.toBeCloseTo(1.25, 6)

  measurer.dispose()
})

it('применяет самые строгие минимумы всех текстов выделения', () => {
  const side = createActiveSelectionTextScaleMeasurerSetup({ controlKey: 'mr' })
  const corner = createActiveSelectionTextScaleMeasurerSetup({ controlKey: 'br' })
  const minimums = resolveActiveSelectionTextScaleMinimums({ children: side.harness.children })

  const horizontal = side.measurer.measure({ mode: 'horizontal', multipliers: { x: 0, y: 1 } })
  const free = corner.measurer.measure({ mode: 'free', multipliers: { x: 0, y: 0 } })
  const uniform = corner.measurer.measure({ mode: 'uniform', multipliers: { x: 0, y: 0 } })

  expect(horizontal.multipliers).toEqual({ x: minimums.width, y: 1 })
  expect(free.multipliers).toEqual({ x: minimums.width, y: minimums.font })
  expect(uniform.multipliers).toEqual({
    x: minimums.proportional,
    y: minimums.proportional
  })
  expect(horizontal.multipliers.x).toBeGreaterThan(0)
  expect(free.multipliers.y).toBeGreaterThan(0)

  side.measurer.dispose()
  corner.measurer.dispose()
})

it('кеширует одинаковое измерение и ограничивает число пересчётов текста', () => {
  installTextWrappingMeasurementContract()
  const { harness, measurer } = createActiveSelectionTextScaleMeasurerSetup({ controlKey: 'mr' })
  const applyPlacementMock = jest.mocked(harness.editor.canvasManager.applyObjectPlacement)
  applyPlacementMock.mockClear()

  const first = measurer.measure({ mode: 'horizontal', multipliers: { x: 0.7, y: 1 } })
  const firstMaterializationCount = applyPlacementMock.mock.calls.length
  const cached = measurer.measure({ mode: 'horizontal', multipliers: { x: 0.7, y: 1 } })

  expect(firstMaterializationCount).toBeGreaterThan(0)
  expect(firstMaterializationCount).toBeLessThanOrEqual(harness.children.length * 9)
  expect(cached).toBe(first)
  expect(applyPlacementMock).toHaveBeenCalledTimes(firstMaterializationCount)

  for (let index = 1; index <= 16; index += 1) {
    measurer.measure({ mode: 'horizontal', multipliers: { x: 0.7 + (index * 0.01), y: 1 } })
  }
  const afterEviction = measurer.measure({ mode: 'horizontal', multipliers: { x: 0.7, y: 1 } })

  expect(afterEviction).not.toBe(first)
  expect(afterEviction.bounds).toEqual(first.bounds)

  measurer.dispose()
})

it('после свободного изменения ширины не возвращает измерение с прежним autoExpand', () => {
  const { harness, measurer } = createActiveSelectionTextScaleMeasurerSetup({
    controlKey: 'br'
  })
  harness.children.forEach((textbox) => {
    textbox.autoExpand = true
  })
  const uniformBeforeWidthChange = measurer.measure({
    mode: 'uniform',
    multipliers: { x: 1.2, y: 1.2 }
  })
  const freeWidthChange = measurer.measure({
    mode: 'free',
    multipliers: { x: 0.8, y: 1.2 }
  })

  measurer.apply({ measurement: freeWidthChange })

  expect(harness.children.every(({ autoExpand }) => autoExpand === false)).toBe(true)
  expect(freeWidthChange.multipliers.x).not.toBeCloseTo(1, 5)

  const uniformAfterWidthChange = measurer.measure({
    mode: 'uniform',
    multipliers: { x: 1.2, y: 1.2 }
  })
  const cachedUniform = measurer.measure({
    mode: 'uniform',
    multipliers: { x: 1.2, y: 1.2 }
  })

  expect(uniformAfterWidthChange).not.toBe(uniformBeforeWidthChange)
  expect(cachedUniform).toBe(uniformAfterWidthChange)

  measurer.apply({ measurement: uniformAfterWidthChange })

  expect(harness.children.every(({ autoExpand }) => autoExpand === false)).toBe(true)
  const appliedBounds = harness.target.getBoundingRect()

  expect(appliedBounds.left).toBeCloseTo(uniformAfterWidthChange.bounds.left, 9)
  expect(appliedBounds.top).toBeCloseTo(uniformAfterWidthChange.bounds.top, 9)
  expect(appliedBounds.width).toBeCloseTo(
    uniformAfterWidthChange.bounds.right - uniformAfterWidthChange.bounds.left,
    9
  )
  expect(appliedBounds.height).toBeCloseTo(
    uniformAfterWidthChange.bounds.bottom - uniformAfterWidthChange.bounds.top,
    9
  )

  measurer.dispose()
})
