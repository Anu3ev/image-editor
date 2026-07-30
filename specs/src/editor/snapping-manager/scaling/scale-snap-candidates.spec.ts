import { createScaleSnapCandidates } from '../../../../../src/editor/snapping-manager/scaling/scale-snap-candidates'
import { createScaleBounds } from '../../../../test-utils/snapping/scale-snapping-core'

describe('Кандидаты для прилипания при скейлинге', () => {
  it('для каждой движущейся грани создаёт кандидатов по границам и центрам в стабильном порядке', () => {
    const candidates = createScaleSnapCandidates({
      targetEdges: ['right', 'top'],
      sources: [{
        id: 'source-image',
        bounds: createScaleBounds({ left: 10, top: 20, right: 110, bottom: 220 })
      }]
    })

    expect(candidates.map(({ id }) => id)).toEqual([
      'source-image:left->right',
      'source-image:center-x->right',
      'source-image:right->right',
      'source-image:top->top',
      'source-image:center-y->top',
      'source-image:bottom->top'
    ])
    expect(candidates.map(({ position }) => position)).toEqual([10, 60, 110, 20, 120, 220])
    expect(candidates.map(({ category }) => category)).toEqual([
      'edge',
      'center',
      'edge',
      'edge',
      'center',
      'edge'
    ])
    expect(Object.isFrozen(candidates)).toBe(true)
    expect(candidates.every(Object.isFrozen)).toBe(true)
  })

  it('для повёрнутого объекта создаёт отдельные кандидаты для двух движущихся граней одной оси', () => {
    const candidates = createScaleSnapCandidates({
      targetEdges: ['left', 'right'],
      sources: [{
        id: 'rotated-target-source',
        bounds: createScaleBounds({ left: 0, top: 0, right: 100, bottom: 80 }),
        edgeCategory: 'domain-boundary'
      }]
    })

    expect(candidates).toHaveLength(6)
    expect(candidates.map(({ edge }) => edge)).toEqual([
      'left', 'right',
      'left', 'right',
      'left', 'right'
    ])
    expect(new Set(candidates.map(({ id }) => id)).size).toBe(6)
    expect(candidates.filter(({ category }) => category === 'domain-boundary')).toHaveLength(4)
    expect(candidates.filter(({ category }) => category === 'center')).toHaveLength(2)
  })

  it('отклоняет пустой список граней, повторяющиеся грани и одинаковые id источников', () => {
    const bounds = createScaleBounds({ left: 0, top: 0, right: 100, bottom: 80 })

    expect(() => createScaleSnapCandidates({
      targetEdges: [],
      sources: []
    })).toThrow('at least one edge')
    expect(() => createScaleSnapCandidates({
      targetEdges: ['right', 'right'],
      sources: []
    })).toThrow('target edges must be unique')
    expect(() => createScaleSnapCandidates({
      targetEdges: ['right'],
      sources: [
        { id: 'duplicate', bounds },
        { id: 'duplicate', bounds }
      ]
    })).toThrow('source id')
  })
})
