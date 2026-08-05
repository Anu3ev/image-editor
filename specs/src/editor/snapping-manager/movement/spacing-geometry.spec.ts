import { calculateHorizontalSpacing } from '../../../../../src/editor/snapping-manager/movement/spacing'
import type { Bounds } from '../../../../../src/editor/snapping-manager/types'
import { resolveDisplayDistance } from '../../../../../src/editor/utils/distance'
import { createMovementBounds } from '../../../../test-utils/snapping/movement-snapping-core'

/** Геометрия пользовательских шаблонов во время перемещения среднего шейпа. */
const TEMPLATE_CENTERED_SPACING_CASES = [
  {
    title: 'находит точную позицию для шейпа целой ширины при произвольной дробной координате',
    beforeLeft: 0,
    afterLeft: 280,
    activeLeft: 152.1,
    activeWidth: 79,
    expectedLeft: 151.5,
    expectedGap: 49.5
  },
  {
    title: 'находит точную позицию для шейпа дробной ширины',
    beforeLeft: 68,
    afterLeft: 370,
    activeLeft: 230.5,
    activeWidth: 84.99999999999999,
    expectedLeft: 227.5,
    expectedGap: 57.5
  }
] as const

it.each(TEMPLATE_CENTERED_SPACING_CASES)('$title', ({
  beforeLeft,
  afterLeft,
  activeLeft,
  activeWidth,
  expectedLeft,
  expectedGap
}) => {
  const before = createMovementBounds({ left: beforeLeft, top: 0, width: 102, height: 102 })
  const after = createMovementBounds({ left: afterLeft, top: 0, width: 102, height: 102 })
  const active = createMovementBounds({ left: activeLeft, top: 8, width: activeWidth, height: 79 })
  const result = calculateHorizontalSpacing({
    activeBounds: active,
    candidates: [before, after],
    threshold: 5,
    patterns: []
  })
  const finalLeft = active.left + result.delta
  const finalRight = active.right + result.delta

  expect(finalLeft).toBeCloseTo(expectedLeft, 10)
  expect(finalLeft - before.right).toBeCloseTo(expectedGap, 10)
  expect(after.left - finalRight).toBeCloseTo(expectedGap, 10)
  expect(result.guides).toEqual([{
    type: 'horizontal',
    axis: active.centerY,
    refStart: before.right,
    refEnd: expectedLeft,
    activeStart: expectedLeft + activeWidth,
    activeEnd: after.left,
    distance: Math.round(expectedGap)
  }])
})

it('выбирает позицию, где spacing и фактический зазор отображаются одинаково', () => {
  const previous: Bounds = {
    left: 81.5,
    right: 101.6,
    top: 0,
    bottom: 20,
    centerX: 91.55,
    centerY: 10
  }
  const active: Bounds = {
    left: 163,
    right: 183,
    top: 0,
    bottom: 20,
    centerX: 173,
    centerY: 10
  }

  const result = calculateHorizontalSpacing({
    activeBounds: active,
    candidates: [previous],
    threshold: 5,
    patterns: [{
      type: 'horizontal',
      axis: 10,
      start: 20,
      end: 81.5,
      distance: 61.5
    }]
  })
  const guide = result.guides[0]
  const activeGap = active.left + result.delta - previous.right

  expect(guide).toBeDefined()
  expect(resolveDisplayDistance({ distance: activeGap })).toBe(guide?.distance)
  expect(guide?.activeStart).toBe(previous.right)
  expect(guide?.activeEnd).toBe(active.left + result.delta)
})

it('строит центральные spacing-гайды по реальным границам объектов', () => {
  const previous: Bounds = {
    left: 0.2,
    right: 20.2,
    top: 0,
    bottom: 20,
    centerX: 10.2,
    centerY: 10
  }
  const next: Bounds = {
    left: 85.4,
    right: 105.4,
    top: 0,
    bottom: 20,
    centerX: 95.4,
    centerY: 10
  }
  const active: Bounds = {
    left: 42.8,
    right: 62.8,
    top: 0,
    bottom: 20,
    centerX: 52.8,
    centerY: 10
  }

  const result = calculateHorizontalSpacing({
    activeBounds: active,
    candidates: [previous, next],
    threshold: 5,
    patterns: []
  })
  const guide = result.guides[0]

  expect(guide).toBeDefined()
  expect(guide?.refStart).toBe(previous.right)
  expect(guide?.refEnd).toBe(active.left + result.delta)
  expect(guide?.activeStart).toBe(active.right + result.delta)
  expect(guide?.activeEnd).toBe(next.left)
})

it('считает основной и дополнительный интервалы по одной точной позиции при дробном смещении', () => {
  const first = createMovementBounds({ left: -29.875, top: 229, width: 102, height: 102 })
  const second = createMovementBounds({ left: 119.375, top: 236.375, width: 87.25, height: 87.25 })
  const active = createMovementBounds({ left: 256.975, top: 230.375, width: 100.625, height: 100.625 })
  const fourth = createMovementBounds({ left: 401.75, top: 229, width: 102, height: 102 })
  const result = calculateHorizontalSpacing({
    activeBounds: active,
    candidates: [first, second, fourth],
    threshold: 5,
    patterns: [{
      type: 'horizontal',
      axis: first.centerY,
      start: first.right,
      end: second.left,
      distance: second.left - first.right
    }]
  })

  expect(result.delta).toBeCloseTo(-3.1, 10)
  expect(result.selections).toHaveLength(2)
  expect(result.guides).toHaveLength(2)
  expect(result.selections.map(({ identity }) => identity.side)).toEqual(['before', 'center'])
  expect(result.guides.every(({ distance }) => distance === 47)).toBe(true)
})

it('не удерживает reference-контекст с соседним display-расстоянием', () => {
  const active: Bounds = {
    left: 21,
    right: 121,
    top: 0,
    bottom: 20,
    centerX: 71,
    centerY: 10
  }
  const before: Bounds = {
    left: -20,
    right: 0,
    top: 0,
    bottom: 20,
    centerX: -10,
    centerY: 10
  }
  const after: Bounds = {
    left: 141,
    right: 161,
    top: 0,
    bottom: 20,
    centerX: 151,
    centerY: 10
  }

  const result = calculateHorizontalSpacing({
    activeBounds: active,
    candidates: [before, after],
    threshold: 5,
    patterns: [
      { type: 'horizontal', axis: 10, start: -40, end: -20, distance: 20 },
      { type: 'horizontal', axis: 10, start: 161, end: 181, distance: 20 }
    ],
    previousContext: { side: 'before', kind: 'reference', distance: 21 },
    switchDistance: 5
  })

  expect(result.delta).toBe(0)
  expect(result.context).toEqual({ side: 'after', kind: 'reference', distance: 20 })
  expect(result.guides).toEqual([
    expect.objectContaining({ activeStart: active.right, activeEnd: after.left, distance: 20 })
  ])
})
