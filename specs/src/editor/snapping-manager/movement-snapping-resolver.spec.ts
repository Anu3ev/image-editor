import type { MovementSnapCandidateSource } from '../../../../src/editor/snapping-manager/movement-snap-candidates'
import {
  FREE_MOVEMENT_HOLD_STATE,
  resolveMovementSnapPlan,
  verifyMovementSnapPlan
} from '../../../../src/editor/snapping-manager/movement-snapping-resolver'
import {
  createFinalMovementGeometry,
  createMovementBaseline,
  createMovementBounds,
  createMovementRawIntent
} from '../../../test-utils/shared/movement-snapping-core'

/** Узкая цель с двумя близкими вертикальными направляющими. */
const REFERENCE_SOURCE = {
  id: 'reference',
  bounds: createMovementBounds({
    left: 100,
    top: 100,
    width: 12,
    height: 40
  }),
  useForSpacing: true
} satisfies MovementSnapCandidateSource

/** Два широких объекта с позицией равноудалённости `left = 35` для target шириной 20. */
const HORIZONTAL_SPACING_SOURCES = [
  {
    id: 'left-spacing-source',
    bounds: createMovementBounds({ left: 0, top: 0, width: 20, height: 300 }),
    useForSpacing: true
  },
  {
    id: 'right-spacing-source',
    bounds: createMovementBounds({ left: 70, top: 0, width: 20, height: 300 }),
    useForSpacing: true
  }
] satisfies readonly MovementSnapCandidateSource[]

/** Spacing-цели, у которых после сдвига по Y появляется новый ближайший сосед. */
const CHANGING_NEIGHBOR_SOURCES = [
  {
    id: 'left-spacing-source',
    bounds: createMovementBounds({ left: 0, top: 0, width: 20, height: 10 }),
    useForSpacing: true
  },
  {
    id: 'closer-spacing-source',
    bounds: createMovementBounds({ left: 25, top: 7, width: 2, height: 4 }),
    useForSpacing: true
  },
  {
    id: 'right-spacing-source',
    bounds: createMovementBounds({ left: 70, top: 0, width: 20, height: 10 }),
    useForSpacing: true
  }
] satisfies readonly MovementSnapCandidateSource[]

/** Источники для возврата к X-направляющей при удерживаемой Y-направляющей. */
const CHANGING_NEIGHBOR_WITH_FALLBACK_SOURCES = [
  ...CHANGING_NEIGHBOR_SOURCES,
  {
    id: 'fallback-x-line',
    bounds: createMovementBounds({
      left: 37,
      top: -100,
      width: 0,
      height: 300
    })
  },
  {
    id: 'held-y-line',
    bounds: createMovementBounds({
      left: -100,
      top: 4,
      width: 500,
      height: 0
    })
  }
] satisfies readonly MovementSnapCandidateSource[]

/** Две совместимые reference-направляющие с разным пересечением по Y. */
const RELATED_REFERENCE_SPACING_SOURCES = [
  {
    id: 'before-reference-start',
    bounds: createMovementBounds({ left: -40, top: -2, width: 20, height: 12 }),
    useForSpacing: true
  },
  {
    id: 'before-neighbor',
    bounds: createMovementBounds({ left: 0, top: -2, width: 20, height: 12 }),
    useForSpacing: true
  },
  {
    id: 'after-neighbor',
    bounds: createMovementBounds({ left: 80, top: 0, width: 20, height: 4 }),
    useForSpacing: true
  },
  {
    id: 'after-reference-end',
    bounds: createMovementBounds({ left: 120, top: 0, width: 20, height: 4 }),
    useForSpacing: true
  }
] satisfies readonly MovementSnapCandidateSource[]

/** Одинаковые spacing-границы в двух непересекающихся рядах. */
const SAME_SPACING_EDGES_IN_DIFFERENT_ROWS = [
  {
    id: 'first-row-left',
    bounds: createMovementBounds({ left: 0, top: 0, width: 20, height: 8 }),
    useForSpacing: true
  },
  {
    id: 'first-row-right',
    bounds: createMovementBounds({ left: 70, top: 0, width: 20, height: 8 }),
    useForSpacing: true
  },
  {
    id: 'second-row-left',
    bounds: createMovementBounds({ left: 0, top: 12, width: 20, height: 8 }),
    useForSpacing: true
  },
  {
    id: 'second-row-right',
    bounds: createMovementBounds({ left: 70, top: 12, width: 20, height: 8 }),
    useForSpacing: true
  }
] satisfies readonly MovementSnapCandidateSource[]

/** Spacing-цели для независимой проверки X hold и Y acquisition. */
const PER_AXIS_SPACING_SOURCES = [
  ...HORIZONTAL_SPACING_SOURCES,
  {
    id: 'top-spacing-source',
    bounds: createMovementBounds({
      left: -200,
      top: 0,
      width: 300,
      height: 20
    }),
    useForSpacing: true
  },
  {
    id: 'bottom-spacing-source',
    bounds: createMovementBounds({
      left: -200,
      top: 70,
      width: 300,
      height: 20
    }),
    useForSpacing: true
  }
] satisfies readonly MovementSnapCandidateSource[]

it('удерживает выбранные направляющие, даже когда соседняя линия становится ближе', () => {
  const baseline = createMovementBaseline({
    sources: [REFERENCE_SOURCE]
  })
  const acquiredPlan = resolveMovementSnapPlan({
    baseline,
    intent: createMovementRawIntent({ left: 101, top: 101 }),
    holdState: FREE_MOVEMENT_HOLD_STATE
  })
  const acquired = verifyMovementSnapPlan({
    baseline,
    plan: acquiredPlan,
    finalGeometry: createFinalMovementGeometry({ left: 100, top: 100 })
  })
  const heldPlan = resolveMovementSnapPlan({
    baseline,
    intent: createMovementRawIntent({ left: 104, top: 104 }),
    holdState: acquired.holdState
  })
  const held = verifyMovementSnapPlan({
    baseline,
    plan: heldPlan,
    finalGeometry: createFinalMovementGeometry({ left: 100, top: 100 })
  })
  const acquiredX = acquiredPlan.constraints.x
  const acquiredY = acquiredPlan.constraints.y
  const heldX = heldPlan.constraints.x

  expect(acquiredX?.kind).toBe('line')
  expect(acquiredY?.kind).toBe('line')
  expect(heldX?.kind).toBe('line')
  if (
    acquiredX?.kind !== 'line'
    || acquiredY?.kind !== 'line'
    || heldX?.kind !== 'line'
  ) {
    throw new Error(
      'В этом сценарии должны быть выбраны обычные line constraints'
    )
  }

  expect(acquiredX.candidate.id).toBe('reference:left')
  expect(acquiredY.candidate.id).toBe('reference:top')
  expect(heldX.transition).toBe('held')
  expect(heldX.candidate.id).toBe('reference:left')
  expect(heldPlan.nextPosition).toEqual({ left: 100, top: 100 })
  expect(held.guides).toHaveLength(2)
})

it('отпускает X независимо от продолжающего удерживаться Y', () => {
  const baseline = createMovementBaseline({
    sources: [REFERENCE_SOURCE]
  })
  const acquiredPlan = resolveMovementSnapPlan({
    baseline,
    intent: createMovementRawIntent({ left: 101, top: 101 }),
    holdState: FREE_MOVEMENT_HOLD_STATE
  })
  const acquired = verifyMovementSnapPlan({
    baseline,
    plan: acquiredPlan,
    finalGeometry: createFinalMovementGeometry({ left: 100, top: 100 })
  })
  const releasedPlan = resolveMovementSnapPlan({
    baseline,
    intent: createMovementRawIntent({ left: 140, top: 104 }),
    holdState: acquired.holdState
  })
  const released = verifyMovementSnapPlan({
    baseline,
    plan: releasedPlan,
    finalGeometry: createFinalMovementGeometry({ left: 140, top: 100 })
  })

  expect(releasedPlan.constraints.x).toBeNull()
  expect(releasedPlan.constraints.y?.transition).toBe('held')
  expect(releasedPlan.nextPosition).toEqual({ left: 140, top: 100 })
  expect(released.holdState.x.kind).toBe('free')
  expect(released.holdState.y.kind).toBe('line')
  expect(released.guides.map((guide) => guide.axis)).toEqual(['y'])
})

it('Ctrl возвращает raw position и очищает transient hold', () => {
  const baseline = createMovementBaseline({
    sources: [REFERENCE_SOURCE]
  })
  const acquiredPlan = resolveMovementSnapPlan({
    baseline,
    intent: createMovementRawIntent({ left: 101, top: 101 }),
    holdState: FREE_MOVEMENT_HOLD_STATE
  })
  const acquired = verifyMovementSnapPlan({
    baseline,
    plan: acquiredPlan,
    finalGeometry: createFinalMovementGeometry({ left: 100, top: 100 })
  })
  const disabledPlan = resolveMovementSnapPlan({
    baseline,
    intent: createMovementRawIntent({
      left: 104.25,
      top: 104.25,
      ctrlKey: true
    }),
    holdState: acquired.holdState
  })
  const disabled = verifyMovementSnapPlan({
    baseline,
    plan: disabledPlan,
    finalGeometry: createFinalMovementGeometry({ left: 104.25, top: 104.25 })
  })

  expect(disabledPlan.nextPosition).toEqual({ left: 104.25, top: 104.25 })
  expect(disabledPlan.constraints).toEqual({ x: null, y: null })
  expect(disabled.guides).toHaveLength(0)
  expect(disabled.spacingGuides).toHaveLength(0)
  expect(disabled.holdState).toEqual(FREE_MOVEMENT_HOLD_STATE)
})

it('не публикует и не удерживает линию, которой final geometry не достигла', () => {
  const baseline = createMovementBaseline({
    sources: [REFERENCE_SOURCE]
  })
  const plan = resolveMovementSnapPlan({
    baseline,
    intent: createMovementRawIntent({ left: 101, top: 101 }),
    holdState: FREE_MOVEMENT_HOLD_STATE
  })
  const verification = verifyMovementSnapPlan({
    baseline,
    plan,
    finalGeometry: createFinalMovementGeometry({ left: 105, top: 100 })
  })

  expect(verification.blockedAxes).toEqual(['x'])
  expect(verification.guides.map((guide) => guide.axis)).toEqual(['y'])
  expect(verification.holdState.x.kind).toBe('free')
  expect(verification.holdState.y.kind).toBe('line')
})

it('переводит acquire-порог из экранных пикселей через zoom', () => {
  const zoomedBaseline = createMovementBaseline({
    sources: [REFERENCE_SOURCE],
    zoom: 2
  })
  const plan = resolveMovementSnapPlan({
    baseline: zoomedBaseline,
    intent: createMovementRawIntent({ left: 103, top: 103, canSnapY: false }),
    holdState: FREE_MOVEMENT_HOLD_STATE
  })

  expect(zoomedBaseline.thresholds.acquire).toBe(2.5)
  expect(plan.constraints.x).toBeNull()
  expect(plan.constraints.y).toBeNull()
  expect(plan.nextPosition).toEqual({ left: 103, top: 103 })
})

it('включает pixel rounding и равноудалённость в одну итоговую translation', () => {
  const spacingBaseline = createMovementBaseline({
    bounds: createMovementBounds({
      left: 0,
      top: 0,
      width: 20,
      height: 30
    }),
    sources: HORIZONTAL_SPACING_SOURCES
  })
  const spaced = resolveMovementSnapPlan({
    baseline: spacingBaseline,
    intent: createMovementRawIntent({
      left: 33,
      top: 100.6,
      width: 20
    }),
    holdState: FREE_MOVEMENT_HOLD_STATE
  })
  const verifiedSpacing = verifyMovementSnapPlan({
    baseline: spacingBaseline,
    plan: spaced,
    finalGeometry: createFinalMovementGeometry({
      left: 35,
      top: 101,
      width: 20
    })
  })
  const heldSpacing = resolveMovementSnapPlan({
    baseline: spacingBaseline,
    intent: createMovementRawIntent({
      left: 39,
      top: 100.6,
      width: 20
    }),
    holdState: verifiedSpacing.holdState
  })

  expect(spaced.nextPosition).toEqual({ left: 35, top: 101 })
  expect(spaced.constraints.x?.kind).toBe('spacing')
  expect(spaced.constraints.y).toBeNull()
  expect(heldSpacing.nextPosition).toEqual({ left: 35, top: 101 })
  expect(verifiedSpacing.spacingGuides.length).toBeGreaterThan(0)
  expect(verifiedSpacing.holdState.x.kind).toBe('spacing')
})

it('заново выбирает равноудалённость после перехода к другим соседям с такими же X-границами', () => {
  const baseline = createMovementBaseline({
    bounds: createMovementBounds({ left: 0, top: 0, width: 20, height: 4 }),
    sources: SAME_SPACING_EDGES_IN_DIFFERENT_ROWS
  })
  const acquiredPlan = resolveMovementSnapPlan({
    baseline,
    intent: createMovementRawIntent({
      left: 33,
      top: 2,
      width: 20,
      height: 4,
      canSnapY: false
    }),
    holdState: FREE_MOVEMENT_HOLD_STATE
  })
  const acquired = verifyMovementSnapPlan({
    baseline,
    plan: acquiredPlan,
    finalGeometry: createFinalMovementGeometry({ left: 35, top: 2, width: 20, height: 4 })
  })
  const nextPlan = resolveMovementSnapPlan({
    baseline,
    intent: createMovementRawIntent({
      left: 39,
      top: 14,
      width: 20,
      height: 4,
      canSnapY: false
    }),
    holdState: acquired.holdState
  })
  const acquiredX = acquiredPlan.constraints.x
  const nextX = nextPlan.constraints.x

  expect(acquiredX?.kind).toBe('spacing')
  expect(nextX?.kind).toBe('spacing')
  if (acquiredX?.kind !== 'spacing' || nextX?.kind !== 'spacing') {
    throw new Error('В обоих рядах должна быть выбрана равноудалённость')
  }

  expect(nextX.transition).toBe('acquired')
  expect(nextX.candidateId).not.toBe(acquiredX.candidateId)
  expect(acquiredX.selections[0].identity.before?.top).toBe(0)
  expect(nextX.selections[0].identity.before?.top).toBe(12)
})

it('при коррекции по Y прилипает к обычной направляющей по X, если у равноудалённости меняется ближайший сосед', () => {
  const baseline = createMovementBaseline({
    bounds: createMovementBounds({ left: 0, top: 0, width: 20, height: 4 }),
    sources: CHANGING_NEIGHBOR_WITH_FALLBACK_SOURCES
  })
  const heldYCandidate = baseline.candidates.find(({ id }) => id === 'held-y-line:top')
  expect(heldYCandidate).toBeDefined()
  if (!heldYCandidate) {
    throw new Error('Y-направляющая должна входить в baseline')
  }
  const plan = resolveMovementSnapPlan({
    baseline,
    intent: createMovementRawIntent({
      left: 33,
      top: 3,
      width: 20,
      height: 4
    }),
    holdState: {
      x: FREE_MOVEMENT_HOLD_STATE.x,
      y: {
        kind: 'line',
        candidate: heldYCandidate,
        activeAnchor: 'top'
      }
    }
  })
  const verification = verifyMovementSnapPlan({
    baseline,
    plan,
    finalGeometry: createFinalMovementGeometry({
      left: plan.nextPosition.left,
      top: plan.nextPosition.top,
      width: 20,
      height: 4
    })
  })
  const xConstraint = plan.constraints.x

  expect(xConstraint?.kind).toBe('line')
  if (xConstraint?.kind !== 'line') {
    throw new Error('После потери равноудалённости должна быть выбрана X-направляющая')
  }

  expect(xConstraint.candidate.id).toBe('fallback-x-line:left')
  expect(xConstraint.transition).toBe('acquired')
  expect(plan.constraints.y?.transition).toBe('held')
  expect(plan.nextPosition).toEqual({ left: 37, top: 4 })
  expect(verification.spacingGuides).toHaveLength(0)
  expect(verification.blockedAxes).toEqual([])
  expect(verification.holdState.x.kind).toBe('line')
  expect(verification.guides.map(({ axis }) => axis)).toEqual(['x', 'y'])
})

it('сохраняет основную равноудалённость, если дополнительный интервал перестаёт быть применим', () => {
  const baseline = createMovementBaseline({
    bounds: createMovementBounds({ left: 0, top: 0, width: 20, height: 4 }),
    sources: RELATED_REFERENCE_SPACING_SOURCES
  })
  const rawIntent = createMovementRawIntent({
    left: 40,
    top: 3,
    width: 20,
    height: 4
  })
  const beforeCorrection = resolveMovementSnapPlan({
    baseline,
    intent: {
      ...rawIntent,
      axes: { x: true, y: false }
    },
    holdState: FREE_MOVEMENT_HOLD_STATE
  })
  const plan = resolveMovementSnapPlan({
    baseline,
    intent: rawIntent,
    holdState: FREE_MOVEMENT_HOLD_STATE
  })
  const initialX = beforeCorrection.constraints.x
  const finalX = plan.constraints.x

  expect(initialX?.kind).toBe('spacing')
  expect(finalX?.kind).toBe('spacing')
  if (initialX?.kind !== 'spacing' || finalX?.kind !== 'spacing') {
    throw new Error('В этом сценарии по X должна быть выбрана равноудалённость')
  }

  expect(initialX.selections.map(({ identity }) => identity.side)).toEqual(['before', 'after'])
  expect(initialX.selections.map(({ isPrimary }) => isPrimary)).toEqual([true, false])
  expect(finalX.selections).toHaveLength(1)
  expect(finalX.selections[0].identity.side).toBe('before')
  expect(finalX.selections[0].isPrimary).toBe(true)
  expect(plan.nextPosition).toEqual({ left: 40, top: 4 })
  expect(plan.constraints.y?.kind).toBe('line')
})

it('показывает только основной интервал, если дополнительный пропал после фактического перемещения', () => {
  const baseline = createMovementBaseline({
    bounds: createMovementBounds({ left: 0, top: 0, width: 20, height: 4 }),
    sources: RELATED_REFERENCE_SPACING_SOURCES
  })
  const plan = resolveMovementSnapPlan({
    baseline,
    intent: createMovementRawIntent({
      left: 40,
      top: 3,
      width: 20,
      height: 4,
      canSnapY: false
    }),
    holdState: FREE_MOVEMENT_HOLD_STATE
  })
  const verification = verifyMovementSnapPlan({
    baseline,
    plan,
    finalGeometry: createFinalMovementGeometry({
      left: 40,
      top: 4,
      width: 20,
      height: 4
    })
  })
  const xConstraint = plan.constraints.x

  expect(xConstraint?.kind).toBe('spacing')
  if (xConstraint?.kind !== 'spacing') {
    throw new Error('До применения движения по X должны быть выбраны два интервала равноудалённости')
  }

  expect(xConstraint.selections).toHaveLength(2)
  expect(verification.spacingGuides).toHaveLength(1)
  expect(verification.blockedAxes).toEqual([])
  expect(verification.holdState.x.kind).toBe('spacing')
})

it('не показывает равноудалённость, если после перемещения появился более близкий сосед', () => {
  const baseline = createMovementBaseline({
    bounds: createMovementBounds({ left: 0, top: 0, width: 20, height: 4 }),
    sources: CHANGING_NEIGHBOR_SOURCES
  })
  const plan = resolveMovementSnapPlan({
    baseline,
    intent: createMovementRawIntent({
      left: 33,
      top: 3,
      width: 20,
      height: 4,
      canSnapY: false
    }),
    holdState: FREE_MOVEMENT_HOLD_STATE
  })
  const verification = verifyMovementSnapPlan({
    baseline,
    plan,
    finalGeometry: createFinalMovementGeometry({
      left: 35,
      top: 4,
      width: 20,
      height: 4
    })
  })

  expect(plan.nextPosition).toEqual({ left: 35, top: 3 })
  expect(plan.constraints.x?.kind).toBe('spacing')
  expect(verification.spacingGuides).toHaveLength(0)
  expect(verification.guides).toHaveLength(0)
  expect(verification.blockedAxes).toEqual(['x'])
  expect(verification.holdState.x.kind).toBe('free')
})

it('удерживает line и не применяет более близкий spacing по той же оси', () => {
  const baseline = createMovementBaseline({
    bounds: createMovementBounds({ left: 0, top: 0, width: 20, height: 30 }),
    sources: [
      ...HORIZONTAL_SPACING_SOURCES,
      {
        id: 'line-source',
        bounds: createMovementBounds({
          left: 34,
          top: 0,
          width: 0,
          height: 300
        })
      }
    ]
  })
  const acquiredPlan = resolveMovementSnapPlan({
    baseline,
    intent: createMovementRawIntent({ left: 33, top: 100.6, width: 20 }),
    holdState: FREE_MOVEMENT_HOLD_STATE
  })
  const acquired = verifyMovementSnapPlan({
    baseline,
    plan: acquiredPlan,
    finalGeometry: createFinalMovementGeometry({
      left: 34,
      top: 101,
      width: 20
    })
  })
  const heldPlan = resolveMovementSnapPlan({
    baseline,
    intent: createMovementRawIntent({ left: 38, top: 100.6, width: 20 }),
    holdState: acquired.holdState
  })

  expect(acquiredPlan.constraints.x?.kind).toBe('line')
  expect(acquired.spacingGuides).toHaveLength(0)
  expect(acquired.holdState.x.kind).toBe('line')
  expect(heldPlan.constraints.x?.kind).toBe('line')
  expect(heldPlan.constraints.x?.transition).toBe('held')
  expect(heldPlan.nextPosition).toEqual({ left: 34, top: 101 })
})

it('выбирает spacing, если его новая correction меньше line correction', () => {
  const baseline = createMovementBaseline({
    bounds: createMovementBounds({ left: 0, top: 0, width: 20, height: 30 }),
    sources: [
      ...HORIZONTAL_SPACING_SOURCES,
      {
        id: 'line-source',
        bounds: createMovementBounds({
          left: 37,
          top: 0,
          width: 0,
          height: 300
        })
      }
    ]
  })
  const plan = resolveMovementSnapPlan({
    baseline,
    intent: createMovementRawIntent({ left: 33, top: 100.6, width: 20 }),
    holdState: FREE_MOVEMENT_HOLD_STATE
  })
  const verified = verifyMovementSnapPlan({
    baseline,
    plan,
    finalGeometry: createFinalMovementGeometry({
      left: 35,
      top: 101,
      width: 20
    })
  })

  expect(plan.constraints.x?.kind).toBe('spacing')
  expect(plan.nextPosition).toEqual({ left: 35, top: 101 })
  expect(verified.guides).toHaveLength(0)
  expect(verified.spacingGuides.length).toBeGreaterThan(0)
  expect(verified.holdState.x.kind).toBe('spacing')
})

it('при практически равном расстоянии выбирает границу рабочей области', () => {
  const baseline = createMovementBaseline({
    sources: [
      {
        id: 'object-edge',
        bounds: createMovementBounds({ left: 100, top: 0, width: 0, height: 300 })
      },
      {
        id: 'work-area',
        bounds: createMovementBounds({
          left: 100.0000000005,
          top: 0,
          width: 0,
          height: 300
        }),
        edgeCategory: 'domain-boundary'
      }
    ]
  })
  const plan = resolveMovementSnapPlan({
    baseline,
    intent: createMovementRawIntent({ left: 100, top: 400, canSnapY: false }),
    holdState: FREE_MOVEMENT_HOLD_STATE
  })
  const constraint = plan.constraints.x

  expect(constraint?.kind).toBe('line')
  if (constraint?.kind !== 'line') {
    throw new Error('В этом сценарии должна быть выбрана обычная направляющая')
  }

  expect(constraint.candidate.id).toBe('work-area:left')
  expect(constraint.candidate.category).toBe('domain-boundary')
})

it('не расширяет acquisition-порог свободной Y из-за spacing hold по X', () => {
  const baseline = createMovementBaseline({
    bounds: createMovementBounds({ left: 0, top: 0, width: 20, height: 20 }),
    sources: PER_AXIS_SPACING_SOURCES
  })
  const acquiredPlan = resolveMovementSnapPlan({
    baseline,
    intent: createMovementRawIntent({
      left: 33,
      top: 200,
      width: 20,
      height: 20
    }),
    holdState: FREE_MOVEMENT_HOLD_STATE
  })
  const acquired = verifyMovementSnapPlan({
    baseline,
    plan: acquiredPlan,
    finalGeometry: createFinalMovementGeometry({
      left: 35,
      top: 200,
      width: 20,
      height: 20
    })
  })
  const heldPlan = resolveMovementSnapPlan({
    baseline,
    intent: createMovementRawIntent({
      left: 39,
      top: 28,
      width: 20,
      height: 20
    }),
    holdState: acquired.holdState
  })

  expect(acquired.holdState.x.kind).toBe('spacing')
  expect(acquired.holdState.y.kind).toBe('free')
  expect(heldPlan.constraints.x?.kind).toBe('spacing')
  expect(heldPlan.constraints.x?.transition).toBe('held')
  expect(heldPlan.constraints.y).toBeNull()
  expect(heldPlan.nextPosition).toEqual({ left: 35, top: 28 })
})

it('не подтверждает spacing после изменения размеров target', () => {
  const baseline = createMovementBaseline({
    bounds: createMovementBounds({ left: 0, top: 0, width: 20, height: 30 }),
    sources: HORIZONTAL_SPACING_SOURCES
  })
  const plan = resolveMovementSnapPlan({
    baseline,
    intent: createMovementRawIntent({ left: 33, top: 100.6, width: 20 }),
    holdState: FREE_MOVEMENT_HOLD_STATE
  })
  const verification = verifyMovementSnapPlan({
    baseline,
    plan,
    finalGeometry: createFinalMovementGeometry({
      left: 35,
      top: 101,
      width: 21
    })
  })

  expect(plan.constraints.x?.kind).toBe('spacing')
  expect(verification.spacingGuides).toHaveLength(0)
  expect(verification.blockedAxes).toEqual(['x'])
  expect(verification.holdState.x.kind).toBe('free')
})

it('отклоняет raw intent, который не является translation начального состояния', () => {
  const baseline = createMovementBaseline()
  const translated = createMovementRawIntent({ left: 10, top: 10 })

  expect(() => {
    resolveMovementSnapPlan({
      baseline,
      intent: createMovementRawIntent({ left: 10, top: 10, width: 31 }),
      holdState: FREE_MOVEMENT_HOLD_STATE
    })
  }).toThrow('must be a translation of the gesture baseline')
  expect(() => {
    resolveMovementSnapPlan({
      baseline,
      intent: {
        ...translated,
        position: {
          left: translated.position.left + 1,
          top: translated.position.top
        }
      },
      holdState: FREE_MOVEMENT_HOLD_STATE
    })
  }).toThrow('must be a translation of the gesture baseline')
})
