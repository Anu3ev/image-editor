import { calculateHorizontalSpacing } from '../../../../src/editor/snapping-manager/spacing'
import type { Bounds } from '../../../../src/editor/snapping-manager/types'
import { resolveDisplayDistance } from '../../../../src/editor/utils/distance'

describe('точная геометрия равноудалённого прилипания', () => {
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
})
