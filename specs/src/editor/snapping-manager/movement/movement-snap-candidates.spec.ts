import { createMovementSnapEnvironment } from '../../../../../src/editor/snapping-manager/movement/movement-snap-candidates'
import { createMovementBounds } from '../../../../test-utils/snapping/movement-snapping-core'

it('фиксирует стабильный порядок линий и отделяет montage от spacing-целей', () => {
  const referenceBounds = createMovementBounds({
    left: 100,
    top: 120,
    width: 40,
    height: 20
  })
  const montageBounds = createMovementBounds({
    left: 0,
    top: 0,
    width: 500,
    height: 400
  })
  const environment = createMovementSnapEnvironment({
    sources: [
      {
        id: 'reference',
        bounds: referenceBounds,
        useForSpacing: true
      },
      {
        id: 'montage',
        bounds: montageBounds,
        edgeCategory: 'domain-boundary'
      }
    ],
    zoom: 2
  })

  expect(environment.candidates).toHaveLength(12)
  expect(environment.candidates[0]).toEqual(expect.objectContaining({
    id: 'reference:left',
    position: referenceBounds.left,
    snapshotIndex: 0
  }))
  expect(environment.candidates[6]).toEqual(expect.objectContaining({
    id: 'montage:left',
    category: 'domain-boundary',
    snapshotIndex: 6
  }))
  expect(environment.spacingSources).toEqual([{
    id: 'reference',
    bounds: referenceBounds
  }])
  expect(environment.zoom).toBe(2)
  expect(Object.isFrozen(environment.candidates)).toBe(true)
  expect(Object.isFrozen(environment.spacingSources)).toBe(true)
})

it('отклоняет неуникальные id, некорректные центры и zoom', () => {
  const bounds = createMovementBounds({
    left: 0,
    top: 0
  })

  expect(() => {
    createMovementSnapEnvironment({
      sources: [
        { id: 'same', bounds },
        { id: 'same', bounds }
      ],
      zoom: 1
    })
  }).toThrow('must be non-empty and unique')
  expect(() => {
    createMovementSnapEnvironment({
      sources: [{
        id: 'invalid-center',
        bounds: {
          ...bounds,
          centerX: bounds.centerX + 1
        }
      }],
      zoom: 1
    })
  }).toThrow('centers must be derived')
  expect(() => {
    createMovementSnapEnvironment({
      sources: [],
      zoom: 0
    })
  }).toThrow('zoom must be a finite positive number')
})
