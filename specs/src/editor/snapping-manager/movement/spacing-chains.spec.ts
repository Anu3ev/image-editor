import {
  ACTIVE_MOVEMENT_SPACING_SOURCE_ID,
  createMovementSpacingChainGuides,
  createMovementSpacingChains,
  movementSpacingChainIncludesPattern,
  movementSpacingChainIncludesSource
} from '../../../../../src/editor/snapping-manager/movement/spacing-chains'
import { createMovementBounds } from '../../../../test-utils/snapping/movement-snapping-core'

it('выбирает одну подпись дробной цепочки независимо от активного объекта и порядка источников', () => {
  const bounds = [
    createMovementBounds({ left: -29.875, top: 229, width: 102, height: 102 }),
    createMovementBounds({ left: 119.375, top: 236.375, width: 87.25, height: 87.25 }),
    createMovementBounds({ left: 253.875, top: 230.375, width: 100.625, height: 100.625 }),
    createMovementBounds({ left: 401.75, top: 229, width: 102, height: 102 })
  ]
  const expectedIntervals = [
    { start: 72.125, end: 119.375, exactDistance: 47.25 },
    { start: 206.625, end: 253.875, exactDistance: 47.25 },
    { start: 354.5, end: 401.75, exactDistance: 47.25 }
  ]

  for (let activeIndex = 0; activeIndex < bounds.length; activeIndex += 1) {
    const sources = bounds.map((sourceBounds, index) => ({
      id: index === activeIndex ? ACTIVE_MOVEMENT_SPACING_SOURCE_ID : `shape-${index + 1}`,
      bounds: sourceBounds
    }))

    for (const orderedSources of [sources, [...sources].reverse()]) {
      const chains = createMovementSpacingChains({ sources: orderedSources })
      const chain = chains.horizontal[0]

      expect(chains.horizontal).toHaveLength(1)
      expect(chain).toBeDefined()
      if (!chain) throw new Error('Должна быть построена горизонтальная цепочка')

      expect(chain.intervals).toHaveLength(3)
      expect(chain.exactRepresentative).toBeCloseTo(47.25, 10)
      expect(chain.displayDistance).toBe(47)
      expect(movementSpacingChainIncludesSource({
        chain,
        sourceId: ACTIVE_MOVEMENT_SPACING_SOURCE_ID
      })).toBe(true)
      expect(movementSpacingChainIncludesPattern({
        chain,
        pattern: {
          type: 'horizontal',
          axis: 280,
          start: 72.125,
          end: 119.375,
          distance: 47.25
        }
      })).toBe(true)
      expect(chain.intervals.map(({ start, end, exactDistance }) => {
        return { start, end, exactDistance }
      })).toEqual(expectedIntervals)
    }
  }
})

it('объединяет точные интервалы с незначительной вычислительной погрешностью', () => {
  const first = createMovementBounds({ left: 0, top: 0, width: 20, height: 20 })
  const second = createMovementBounds({ left: 67.25, top: 0, width: 20, height: 20 })
  const third = createMovementBounds({ left: 134.5005, top: 0, width: 20, height: 20 })
  const chains = createMovementSpacingChains({
    sources: [
      { id: 'first', bounds: first },
      { id: 'second', bounds: second },
      { id: 'third', bounds: third }
    ]
  })

  expect(second.left - first.right).toBeCloseTo(47.25, 10)
  expect(third.left - second.right).toBeCloseTo(47.2505, 10)
  expect(chains.horizontal).toHaveLength(1)
  expect(chains.horizontal[0]?.displayDistance).toBe(47)
})

it('не объединяет фактически разные интервалы с одинаковой округлённой подписью', () => {
  const first = createMovementBounds({ left: 0, top: 0, width: 20, height: 20 })
  const second = createMovementBounds({ left: 67.25, top: 0, width: 20, height: 20 })
  const third = createMovementBounds({ left: 134.51, top: 0, width: 20, height: 20 })
  const chains = createMovementSpacingChains({
    sources: [
      { id: 'first', bounds: first },
      { id: 'second', bounds: second },
      { id: 'third', bounds: third }
    ]
  })

  expect(second.left - first.right).toBeCloseTo(47.25, 10)
  expect(third.left - second.right).toBeCloseTo(47.26, 10)
  expect(chains.horizontal).toHaveLength(0)
})

it('не объединяет горизонтальные и вертикальные интервалы 47 / 48 / 47', () => {
  const positions = [0, 147, 295, 442]
  const horizontalChains = createMovementSpacingChains({
    sources: positions.map((left, index) => ({
      id: `horizontal-${index}`,
      bounds: createMovementBounds({ left, top: 0, width: 100, height: 100 })
    }))
  })
  const verticalChains = createMovementSpacingChains({
    sources: positions.map((top, index) => ({
      id: `vertical-${index}`,
      bounds: createMovementBounds({ left: 0, top, width: 100, height: 100 })
    }))
  })
  expect(horizontalChains.horizontal).toHaveLength(0)
  expect(horizontalChains.vertical).toHaveLength(0)
  expect(verticalChains.vertical).toHaveLength(0)
  expect(verticalChains.horizontal).toHaveLength(0)
})

it('показывает все интервалы цепочки по итоговым границам активного объекта', () => {
  const activeBounds = createMovementBounds({
    left: 253.875,
    top: 230.375,
    width: 100.625,
    height: 100.625
  })
  const chains = createMovementSpacingChains({
    sources: [
      {
        id: 'first',
        bounds: createMovementBounds({ left: -29.875, top: 229, width: 102, height: 102 })
      },
      {
        id: 'second',
        bounds: createMovementBounds({
          left: 119.375,
          top: 236.375,
          width: 87.25,
          height: 87.25
        })
      },
      { id: ACTIVE_MOVEMENT_SPACING_SOURCE_ID, bounds: activeBounds },
      {
        id: 'fourth',
        bounds: createMovementBounds({ left: 401.75, top: 229, width: 102, height: 102 })
      }
    ]
  })
  const chain = chains.horizontal[0]
  expect(chain).toBeDefined()
  if (!chain) throw new Error('Должна быть построена горизонтальная цепочка')

  const finalBounds = createMovementBounds({
    left: 254,
    top: 230.375,
    width: 100.625,
    height: 100.625
  })
  const guides = createMovementSpacingChainGuides({
    chain,
    activeSourceId: ACTIVE_MOVEMENT_SPACING_SOURCE_ID,
    activeBounds: finalBounds
  })

  expect(guides).toHaveLength(2)
  expect(guides.every(({ distance }) => distance === 47)).toBe(true)
  expect(guides).toEqual([
    expect.objectContaining({ refStart: 72.125, refEnd: 119.375, activeStart: 206.625, activeEnd: 254 }),
    expect.objectContaining({ refStart: 206.625, refEnd: 254, activeStart: 354.625, activeEnd: 401.75 })
  ])
})

it('показывает полную вертикальную цепочку и скрывает её вне общего коридора', () => {
  const activeBounds = createMovementBounds({
    left: 230.375,
    top: 253.875,
    width: 100.625,
    height: 100.625
  })
  const chains = createMovementSpacingChains({
    sources: [
      {
        id: 'first',
        bounds: createMovementBounds({ left: 229, top: -29.875, width: 102, height: 102 })
      },
      {
        id: 'second',
        bounds: createMovementBounds({
          left: 236.375,
          top: 119.375,
          width: 87.25,
          height: 87.25
        })
      },
      { id: ACTIVE_MOVEMENT_SPACING_SOURCE_ID, bounds: activeBounds },
      {
        id: 'fourth',
        bounds: createMovementBounds({ left: 229, top: 401.75, width: 102, height: 102 })
      }
    ]
  })
  const chain = chains.vertical[0]
  expect(chain).toBeDefined()
  if (!chain) throw new Error('Должна быть построена вертикальная цепочка')

  const guides = createMovementSpacingChainGuides({
    chain,
    activeSourceId: ACTIVE_MOVEMENT_SPACING_SOURCE_ID,
    activeBounds
  })
  const outsideCorridor = createMovementSpacingChainGuides({
    chain,
    activeSourceId: ACTIVE_MOVEMENT_SPACING_SOURCE_ID,
    activeBounds: createMovementBounds({
      left: 340,
      top: activeBounds.top,
      width: activeBounds.right - activeBounds.left,
      height: activeBounds.bottom - activeBounds.top
    })
  })

  expect(chain.axis).toBe(280)
  expect(guides).toHaveLength(2)
  expect(guides.every(({ type, distance }) => type === 'vertical' && distance === 47)).toBe(true)
  expect(guides).toEqual([
    expect.objectContaining({ refStart: 72.125, refEnd: 119.375, activeStart: 206.625, activeEnd: 253.875 }),
    expect.objectContaining({ refStart: 206.625, refEnd: 253.875, activeStart: 354.5, activeEnd: 401.75 })
  ])
  expect(outsideCorridor).toHaveLength(0)
})

it('разрывает цепочку, если у всех объектов нет общего поперечного пересечения', () => {
  const chains = createMovementSpacingChains({
    sources: [
      { id: 'first', bounds: createMovementBounds({ left: 0, top: 0, width: 10, height: 100 }) },
      { id: 'second', bounds: createMovementBounds({ left: 20, top: 0, width: 10, height: 10 }) },
      { id: 'third', bounds: createMovementBounds({ left: 40, top: 0, width: 10, height: 100 }) },
      { id: 'fourth', bounds: createMovementBounds({ left: 60, top: 90, width: 10, height: 10 }) }
    ]
  })
  const horizontal = chains.horizontal[0]

  expect(chains.horizontal).toHaveLength(1)
  expect(horizontal?.intervals.map(({ beforeId, afterId }) => {
    return `${beforeId}:${afterId}`
  })).toEqual(['first:second', 'second:third'])
  expect(horizontal?.axis).toBe(5)
})
