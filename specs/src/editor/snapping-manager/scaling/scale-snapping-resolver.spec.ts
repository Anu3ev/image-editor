import {
  FREE_SCALE_HOLD_STATE,
  createScaleGestureBaseline,
  resolveScaleSnapPlan,
  verifyScaleSnapPlan
} from '../../../../../src/editor/snapping-manager/scaling/scale-snapping-resolver'
import {
  createFinalScaleGeometry,
  createScaleBounds,
  createScaleBaseline,
  createScaleCandidate,
  createScaleRawIntent
} from '../../../../test-utils/snapping/scale-snapping-core'

describe('Расчёт прилипания при скейлинге', () => {
  it('при подходе с обеих сторон выбирает одну направляющую и не меняет исходные данные', () => {
    const baseline = createScaleBaseline({
      candidates: [createScaleCandidate({ id: 'right-edge', axis: 'x', position: 100 })]
    })
    const fromInside = resolveScaleSnapPlan({
      baseline,
      intent: createScaleRawIntent({ values: [0.96, 1] }),
      holdState: FREE_SCALE_HOLD_STATE
    })
    const fromOutside = resolveScaleSnapPlan({
      baseline,
      intent: createScaleRawIntent({ values: [1.04, 1] }),
      holdState: FREE_SCALE_HOLD_STATE
    })

    expect(fromInside.constraints.x?.candidate.id).toBe('right-edge')
    expect(fromInside.effectiveValues[0]).toBeCloseTo(1, 8)
    expect(fromOutside.constraints.x?.candidate.id).toBe('right-edge')
    expect(fromOutside.effectiveValues[0]).toBeCloseTo(1, 8)
    expect(Object.isFrozen(baseline)).toBe(true)
    expect(Object.isFrozen(baseline.candidates[0])).toBe(true)
  })

  it('при почти равном смещении сначала учитывает категорию, затем исходный порядок кандидатов', () => {
    const categoryBaseline = createScaleBaseline({
      candidates: [
        createScaleCandidate({ id: 'spacing', axis: 'x', position: 102, category: 'spacing' }),
        createScaleCandidate({ id: 'boundary', axis: 'x', position: 102.0000000005, category: 'domain-boundary' })
      ]
    })
    const snapshotBaseline = createScaleBaseline({
      candidates: [
        createScaleCandidate({ id: 'first-edge', axis: 'x', position: 102.0000000005 }),
        createScaleCandidate({ id: 'second-edge', axis: 'x', position: 102 })
      ]
    })

    const categoryPlan = resolveScaleSnapPlan({
      baseline: categoryBaseline,
      intent: createScaleRawIntent({ values: [1, 1] }),
      holdState: FREE_SCALE_HOLD_STATE
    })
    const snapshotPlan = resolveScaleSnapPlan({
      baseline: snapshotBaseline,
      intent: createScaleRawIntent({ values: [1, 1] }),
      holdState: FREE_SCALE_HOLD_STATE
    })

    expect(categoryPlan.constraints.x?.candidate.id).toBe('boundary')
    expect(categoryPlan.constraints.x?.candidate.snapshotIndex).toBe(1)
    expect(snapshotPlan.constraints.x?.candidate.id).toBe('first-edge')
    expect(snapshotPlan.constraints.x?.candidate.snapshotIndex).toBe(0)
  })

  it('удерживает направляющую в зоне отпускания, а после выхода сразу выбирает следующую', () => {
    const baseline = createScaleBaseline({
      candidates: [
        createScaleCandidate({ id: 'first', axis: 'x', position: 100 }),
        createScaleCandidate({ id: 'second', axis: 'x', position: 110 })
      ]
    })
    const acquired = resolveScaleSnapPlan({
      baseline,
      intent: createScaleRawIntent({ values: [0.98, 1] }),
      holdState: FREE_SCALE_HOLD_STATE
    })
    const firstVerification = verifyScaleSnapPlan({
      plan: acquired,
      finalGeometry: createFinalScaleGeometry({ right: 100, bottom: 100 })
    })
    const held = resolveScaleSnapPlan({
      baseline,
      intent: createScaleRawIntent({ values: [1.04, 1] }),
      holdState: firstVerification.holdState
    })
    const released = resolveScaleSnapPlan({
      baseline,
      intent: createScaleRawIntent({ values: [1.06, 1] }),
      holdState: firstVerification.holdState
    })

    expect(held.constraints.x?.candidate.id).toBe('first')
    expect(held.constraints.x?.transition).toBe('held')
    expect(released.constraints.x?.candidate.id).toBe('second')
    expect(released.constraints.x?.transition).toBe('acquired')
  })

  it('для равных отступов удерживает направляющую в пределах 10 px экрана и отпускает дальше', () => {
    const baseline = createScaleBaseline({
      candidates: [createScaleCandidate({ id: 'spacing', axis: 'x', position: 100, category: 'spacing' })]
    })
    const acquired = resolveScaleSnapPlan({
      baseline,
      intent: createScaleRawIntent({ values: [0.96, 1] }),
      holdState: FREE_SCALE_HOLD_STATE
    })
    const verification = verifyScaleSnapPlan({
      plan: acquired,
      finalGeometry: createFinalScaleGeometry({ right: 100, bottom: 100 })
    })
    const held = resolveScaleSnapPlan({
      baseline,
      intent: createScaleRawIntent({ values: [0.91, 1] }),
      holdState: verification.holdState
    })
    const released = resolveScaleSnapPlan({
      baseline,
      intent: createScaleRawIntent({ values: [0.89, 1] }),
      holdState: verification.holdState
    })

    expect(held.constraints.x?.transition).toBe('held')
    expect(held.effectiveValues[0]).toBeCloseTo(1, 8)
    expect(released.constraints.x).toBeNull()
    expect(released.proposedHoldState.x.kind).toBe('free')
  })

  it('Ctrl снимает удержание, а после отпускания снова выбирает направляющую по текущему положению', () => {
    const baseline = createScaleBaseline({
      candidates: [createScaleCandidate({ id: 'right', axis: 'x', position: 100 })]
    })
    const acquired = resolveScaleSnapPlan({
      baseline,
      intent: createScaleRawIntent({ values: [0.98, 1] }),
      holdState: FREE_SCALE_HOLD_STATE
    })
    const verification = verifyScaleSnapPlan({
      plan: acquired,
      finalGeometry: createFinalScaleGeometry({ right: 100, bottom: 100 })
    })
    const disabled = resolveScaleSnapPlan({
      baseline,
      intent: createScaleRawIntent({ values: [0.98, 1], ctrlKey: true }),
      holdState: verification.holdState
    })
    const enabled = resolveScaleSnapPlan({
      baseline,
      intent: createScaleRawIntent({ values: [0.98, 1] }),
      holdState: disabled.proposedHoldState
    })

    expect(disabled.constraints.x).toBeNull()
    expect(disabled.effectiveValues[0]).toBeCloseTo(0.98, 8)
    expect(enabled.constraints.x?.transition).toBe('acquired')
    expect(enabled.constraints.x?.candidate.id).toBe('right')
  })

  it('учитывает zoom при переводе порога прилипания из экранных пикселей в координаты сцены', () => {
    const baseline = createScaleBaseline({
      zoom: 2,
      candidates: [createScaleCandidate({ id: 'right', axis: 'x', position: 100 })]
    })
    const atThreshold = resolveScaleSnapPlan({
      baseline,
      intent: createScaleRawIntent({ values: [0.975, 1] }),
      holdState: FREE_SCALE_HOLD_STATE
    })
    const outsideThreshold = resolveScaleSnapPlan({
      baseline,
      intent: createScaleRawIntent({ values: [0.9749, 1] }),
      holdState: FREE_SCALE_HOLD_STATE
    })

    expect(baseline.thresholds.acquire).toBe(2.5)
    expect(atThreshold.constraints.x?.candidate.id).toBe('right')
    expect(outsideThreshold.constraints.x).toBeNull()
    expect(outsideThreshold.effectiveValues[0]).toBeCloseTo(0.9749, 8)
  })

  it('при независимом scale одновременно прилипает по X и Y', () => {
    const baseline = createScaleBaseline({
      candidates: [
        createScaleCandidate({ id: 'right', axis: 'x', position: 100 }),
        createScaleCandidate({ id: 'bottom', axis: 'y', position: 100 })
      ]
    })
    const plan = resolveScaleSnapPlan({
      baseline,
      intent: createScaleRawIntent({ values: [0.97, 0.96] }),
      holdState: FREE_SCALE_HOLD_STATE
    })
    const verification = verifyScaleSnapPlan({
      plan,
      finalGeometry: createFinalScaleGeometry({ right: 100, bottom: 100 })
    })

    expect(plan.effectiveValues[0]).toBeCloseTo(1, 8)
    expect(plan.effectiveValues[1]).toBeCloseTo(1, 8)
    expect(plan.constraints.x?.candidate.id).toBe('right')
    expect(plan.constraints.y?.candidate.id).toBe('bottom')
    expect(verification.guides).toHaveLength(2)
    expect(verification.holdState.x.kind).toBe('held')
    expect(verification.holdState.y.kind).toBe('held')
    expect(Object.isFrozen(plan)).toBe(true)
    expect(Object.isFrozen(plan.effectiveValues)).toBe(true)
  })

  it('при скейлинге повёрнутой фигуры за угол одновременно прилипает по X и Y', () => {
    const baseline = createScaleGestureBaseline({
      bounds: createScaleBounds({ left: 0, top: 0, right: 100, bottom: 100 }),
      fixedAnchor: { x: 0, y: 0 },
      projectionModes: [{
        id: 'free',
        projection: {
          variables: ['scale-x', 'scale-y'],
          baselineValues: [1, 1],
          variableSceneWeights: [100, 100],
          edges: [
            { edge: 'right', coefficients: [80, 60] },
            { edge: 'bottom', coefficients: [-60, 80] }
          ]
        }
      }],
      candidates: [
        createScaleCandidate({ id: 'right', axis: 'x', position: 100 }),
        createScaleCandidate({ id: 'bottom', axis: 'y', position: 100 })
      ],
      zoom: 1
    })
    const plan = resolveScaleSnapPlan({
      baseline,
      intent: createScaleRawIntent({ values: [0.98, 0.97] }),
      holdState: FREE_SCALE_HOLD_STATE
    })

    expect(plan.constraints.x?.candidate.id).toBe('right')
    expect(plan.constraints.y?.candidate.id).toBe('bottom')
    expect(plan.effectiveValues[0]).toBeCloseTo(1, 8)
    expect(plan.effectiveValues[1]).toBeCloseTo(1, 8)
  })

  it('для повёрнутой фигуры с разными сторонами минимизирует смещение ручки', () => {
    const longSideProjection = Math.SQRT1_2 * 1000
    const shortSideProjection = Math.SQRT1_2 * 100
    const baseline = createScaleGestureBaseline({
      bounds: createScaleBounds({ left: 0, top: 0, right: 800, bottom: 800 }),
      fixedAnchor: { x: 0, y: 800 },
      projectionModes: [{
        id: 'free',
        projection: {
          variables: ['scale-x', 'scale-y'],
          baselineValues: [1, 1],
          variableSceneWeights: [1000, 100],
          edges: [{ edge: 'right', coefficients: [longSideProjection, shortSideProjection] }]
        }
      }],
      candidates: [createScaleCandidate({ id: 'right', axis: 'x', position: 801 })],
      zoom: 1
    })
    const plan = resolveScaleSnapPlan({
      baseline,
      intent: createScaleRawIntent({ values: [1, 1] }),
      holdState: FREE_SCALE_HOLD_STATE
    })
    const longSideSceneCorrection = (plan.effectiveValues[0] - 1) * 1000
    const shortSideSceneCorrection = (plan.effectiveValues[1] - 1) * 100

    expect(plan.constraints.x?.candidate.id).toBe('right')
    expect(plan.effectivePositions.right).toBeCloseTo(801, 8)
    expect(longSideSceneCorrection).toBeCloseTo(Math.SQRT1_2, 8)
    expect(shortSideSceneCorrection).toBeCloseTo(Math.SQRT1_2, 8)
  })

  it('для повёрнутой фигуры выбирает нужные движущиеся грани по обеим осям', () => {
    const baseline = createScaleGestureBaseline({
      bounds: createScaleBounds({ left: 0, top: 0, right: 100, bottom: 100 }),
      fixedAnchor: { x: 50, y: 50 },
      projectionModes: [{
        id: 'free',
        projection: {
          variables: ['scale-x', 'scale-y'],
          baselineValues: [1, 1],
          variableSceneWeights: [100, 100],
          edges: [
            { edge: 'left', coefficients: [-40, -20] },
            { edge: 'right', coefficients: [40, 20] },
            { edge: 'top', coefficients: [20, -40] },
            { edge: 'bottom', coefficients: [-20, 40] }
          ]
        }
      }],
      candidates: [
        createScaleCandidate({ id: 'left', axis: 'x', edge: 'left', position: 0 }),
        createScaleCandidate({ id: 'right', axis: 'x', edge: 'right', position: 100.5 }),
        createScaleCandidate({ id: 'top', axis: 'y', edge: 'top', position: 0 })
      ],
      zoom: 1
    })
    const plan = resolveScaleSnapPlan({
      baseline,
      intent: createScaleRawIntent({ values: [0.95, 0.95] }),
      holdState: FREE_SCALE_HOLD_STATE
    })

    expect(plan.rawPositions.left).toBeCloseTo(3, 8)
    expect(plan.rawPositions.right).toBeCloseTo(97, 8)
    expect(plan.rawPositions.top).toBeCloseTo(1, 8)
    expect(plan.rawPositions.bottom).toBeCloseTo(99, 8)
    expect(plan.constraints.x?.candidate.edge).toBe('left')
    expect(plan.constraints.y?.candidate.edge).toBe('top')
    expect(plan.effectiveValues).toEqual([1, 1])
  })

  it('при скейлинге повёрнутой фигуры за боковую ручку прилипает разными гранями по X и Y', () => {
    const baseline = createScaleGestureBaseline({
      bounds: createScaleBounds({ left: 0, top: 0, right: 100, bottom: 100 }),
      fixedAnchor: { x: 0, y: 50 },
      projectionModes: [{
        id: 'side',
        projection: {
          variables: ['scale-x'],
          baselineValues: [1],
          variableSceneWeights: [100],
          edges: [
            { edge: 'right', coefficients: [80] },
            { edge: 'top', coefficients: [30] },
            { edge: 'bottom', coefficients: [-30] }
          ]
        }
      }],
      candidates: [
        createScaleCandidate({ id: 'right', axis: 'x', edge: 'right', position: 100 }),
        createScaleCandidate({ id: 'bottom', axis: 'y', edge: 'bottom', position: 100 }),
        createScaleCandidate({ id: 'top', axis: 'y', edge: 'top', position: 0 })
      ],
      zoom: 1
    })
    const plan = resolveScaleSnapPlan({
      baseline,
      intent: createScaleRawIntent({ projectionMode: 'side', values: [0.95] }),
      holdState: FREE_SCALE_HOLD_STATE
    })

    expect(plan.rawPositions.right).toBeCloseTo(96, 8)
    expect(plan.rawPositions.top).toBeCloseTo(-1.5, 8)
    expect(plan.rawPositions.bottom).toBeCloseTo(101.5, 8)
    expect(plan.constraints.x?.candidate.edge).toBe('right')
    expect(plan.constraints.y?.candidate.edge).toBe('bottom')
    expect(plan.effectiveValues).toEqual([1])
  })

  it('не использует численно неустойчивое прилипание сразу по двум направляющим', () => {
    const baseline = createScaleGestureBaseline({
      bounds: createScaleBounds({ left: 0, top: 0, right: 100, bottom: 100 }),
      fixedAnchor: { x: 0, y: 0 },
      projectionModes: [{
        id: 'free',
        projection: {
          variables: ['scale-x', 'scale-y'],
          baselineValues: [1, 1],
          variableSceneWeights: [1, 1],
          edges: [
            { edge: 'right', coefficients: [1000000, 1000000] },
            { edge: 'bottom', coefficients: [1000000, 1000000.0001] }
          ]
        }
      }],
      candidates: [
        createScaleCandidate({ id: 'right', axis: 'x', position: 101 }),
        createScaleCandidate({ id: 'bottom', axis: 'y', position: 102 })
      ],
      zoom: 1
    })
    const plan = resolveScaleSnapPlan({
      baseline,
      intent: createScaleRawIntent({ values: [1, 1] }),
      holdState: FREE_SCALE_HOLD_STATE
    })

    expect(plan.constraints.x?.candidate.id).toBe('right')
    expect(plan.constraints.y).toBeNull()
    expect(Math.abs(plan.effectiveValues[0] - 1)).toBeLessThan(0.001)
    expect(Math.abs(plan.effectiveValues[1] - 1)).toBeLessThan(0.001)
  })

  it('сохраняет прилипание по двум направляющим для независимых малых коэффициентов', () => {
    const baseline = createScaleGestureBaseline({
      bounds: createScaleBounds({ left: 0, top: 0, right: 100, bottom: 100 }),
      fixedAnchor: { x: 0, y: 0 },
      projectionModes: [{
        id: 'free',
        projection: {
          variables: ['scale-x', 'scale-y'],
          baselineValues: [1, 1],
          variableSceneWeights: [0.00001, 0.00001],
          edges: [
            { edge: 'right', coefficients: [0.00001, 0] },
            { edge: 'bottom', coefficients: [0, 0.00001] }
          ]
        }
      }],
      candidates: [
        createScaleCandidate({ id: 'right', axis: 'x', position: 100.00001 }),
        createScaleCandidate({ id: 'bottom', axis: 'y', position: 100.00002 })
      ],
      zoom: 1
    })
    const plan = resolveScaleSnapPlan({
      baseline,
      intent: createScaleRawIntent({ values: [1, 1] }),
      holdState: FREE_SCALE_HOLD_STATE
    })

    expect(plan.constraints.x?.candidate.id).toBe('right')
    expect(plan.constraints.y?.candidate.id).toBe('bottom')
    expect(plan.effectiveValues[0]).toBeCloseTo(2, 8)
    expect(plan.effectiveValues[1]).toBeCloseTo(3, 8)
  })

  it('при пропорциональном scale удерживает две совместимые направляющие', () => {
    const compatibleBaseline = createScaleBaseline({
      width: 100,
      height: 200,
      candidates: [
        createScaleCandidate({ id: 'right', axis: 'x', position: 100 }),
        createScaleCandidate({ id: 'bottom', axis: 'y', position: 200 })
      ]
    })
    const plan = resolveScaleSnapPlan({
      baseline: compatibleBaseline,
      intent: createScaleRawIntent({ projectionMode: 'uniform', values: [0.98] }),
      holdState: FREE_SCALE_HOLD_STATE
    })

    expect(plan.constraints.x?.candidate.id).toBe('right')
    expect(plan.constraints.y?.candidate.id).toBe('bottom')
    expect(plan.effectiveValues).toEqual([1])
    expect(plan.effectivePositions).toEqual({ left: null, right: 100, top: null, bottom: 200 })
  })

  it('при несовместимых направляющих выбирает ту, которая требует меньшей коррекции scale', () => {
    const baseline = createScaleBaseline({
      width: 100,
      height: 200,
      candidates: [
        createScaleCandidate({ id: 'right', axis: 'x', position: 104 }),
        createScaleCandidate({ id: 'bottom', axis: 'y', position: 198 })
      ]
    })
    const plan = resolveScaleSnapPlan({
      baseline,
      intent: createScaleRawIntent({ projectionMode: 'uniform', values: [1] }),
      holdState: FREE_SCALE_HOLD_STATE
    })

    expect(plan.constraints.x).toBeNull()
    expect(plan.constraints.y?.candidate.id).toBe('bottom')
    expect(plan.effectiveValues[0]).toBeCloseTo(0.99, 8)
    expect(plan.effectivePositions.bottom).toBeCloseTo(198, 8)
  })

  it('при одинаковой коррекции по X и Y стабильно выбирает X', () => {
    const baseline = createScaleBaseline({
      width: 100,
      height: 200,
      candidates: [
        createScaleCandidate({ id: 'right', axis: 'x', position: 102 }),
        createScaleCandidate({ id: 'bottom', axis: 'y', position: 196 })
      ]
    })
    const plan = resolveScaleSnapPlan({
      baseline,
      intent: createScaleRawIntent({ projectionMode: 'uniform', values: [1] }),
      holdState: FREE_SCALE_HOLD_STATE
    })

    expect(plan.constraints.x?.candidate.id).toBe('right')
    expect(plan.constraints.y).toBeNull()
    expect(plan.effectiveValues[0]).toBeCloseTo(1.02, 8)
    expect(plan.effectivePositions.right).toBeCloseTo(102, 8)
  })

  it('при почти одинаковой коррекции по X и Y сохраняет выбор X', () => {
    const baseline = createScaleBaseline({
      candidates: [
        createScaleCandidate({ id: 'right', axis: 'x', position: 102.0000000005 }),
        createScaleCandidate({ id: 'bottom', axis: 'y', position: 98 })
      ]
    })
    const plan = resolveScaleSnapPlan({
      baseline,
      intent: createScaleRawIntent({ projectionMode: 'uniform', values: [1] }),
      holdState: FREE_SCALE_HOLD_STATE
    })

    expect(plan.constraints.x?.candidate.id).toBe('right')
    expect(plan.constraints.y).toBeNull()
    expect(plan.effectiveValues[0]).toBeCloseTo(1.020000000005, 10)
  })

  it('удерживаемая направляющая имеет приоритет перед новой несовместимой', () => {
    const baseline = createScaleBaseline({
      width: 100,
      height: 200,
      candidates: [
        createScaleCandidate({ id: 'right', axis: 'x', position: 100 }),
        createScaleCandidate({ id: 'bottom', axis: 'y', position: 198 })
      ]
    })
    const acquired = resolveScaleSnapPlan({
      baseline,
      intent: createScaleRawIntent({ projectionMode: 'uniform', values: [0.96] }),
      holdState: FREE_SCALE_HOLD_STATE
    })
    const verification = verifyScaleSnapPlan({
      plan: acquired,
      finalGeometry: createFinalScaleGeometry({ right: 100, bottom: 200, measuredValues: [1] })
    })
    const held = resolveScaleSnapPlan({
      baseline,
      intent: createScaleRawIntent({ projectionMode: 'uniform', values: [0.985] }),
      holdState: verification.holdState
    })

    expect(held.constraints.x?.candidate.id).toBe('right')
    expect(held.constraints.x?.transition).toBe('held')
    expect(held.constraints.y).toBeNull()
    expect(held.effectiveValues[0]).toBeCloseTo(1, 8)
  })

  it('для почти совместимых направляющих сохраняет точное удержание по Y при новом прилипании по X', () => {
    const baseline = createScaleBaseline({
      candidates: [
        createScaleCandidate({ id: 'right', axis: 'x', position: 100.05 }),
        createScaleCandidate({ id: 'bottom', axis: 'y', position: 100 })
      ]
    })
    const acquiredY = resolveScaleSnapPlan({
      baseline,
      intent: createScaleRawIntent({ projectionMode: 'uniform', values: [0.95] }),
      holdState: FREE_SCALE_HOLD_STATE
    })
    const firstVerification = verifyScaleSnapPlan({
      plan: acquiredY,
      finalGeometry: createFinalScaleGeometry({ right: 100, bottom: 100, measuredValues: [1] })
    })
    const heldY = resolveScaleSnapPlan({
      baseline,
      intent: createScaleRawIntent({ projectionMode: 'uniform', values: [0.98] }),
      holdState: firstVerification.holdState
    })

    expect(acquiredY.constraints.x).toBeNull()
    expect(acquiredY.constraints.y?.transition).toBe('acquired')
    expect(heldY.constraints.x?.transition).toBe('acquired')
    expect(heldY.constraints.y?.transition).toBe('held')
    expect(heldY.effectiveValues).toEqual([1])
    expect(heldY.effectivePositions.bottom).toBe(100)
    expect(heldY.effectivePositions.right).toBe(100)
  })

  it('при zoom использует разные зоны отпускания для обычной направляющей и равных отступов', () => {
    const baseline = createScaleBaseline({
      zoom: 2,
      candidates: [
        createScaleCandidate({ id: 'right', axis: 'x', position: 100 }),
        createScaleCandidate({ id: 'spacing', axis: 'y', position: 100, category: 'spacing' })
      ]
    })
    const acquired = resolveScaleSnapPlan({
      baseline,
      intent: createScaleRawIntent({ values: [0.98, 0.98] }),
      holdState: FREE_SCALE_HOLD_STATE
    })
    const verification = verifyScaleSnapPlan({
      plan: acquired,
      finalGeometry: createFinalScaleGeometry({ right: 100, bottom: 100 })
    })
    const nextPlan = resolveScaleSnapPlan({
      baseline,
      intent: createScaleRawIntent({ values: [0.974, 0.951] }),
      holdState: verification.holdState
    })

    expect(baseline.thresholds.release).toBe(2.5)
    expect(baseline.thresholds.spacingRelease).toBe(5)
    expect(nextPlan.constraints.x).toBeNull()
    expect(nextPlan.constraints.y?.transition).toBe('held')
    expect(nextPlan.effectiveValues[0]).toBeCloseTo(0.974, 8)
    expect(nextPlan.effectiveValues[1]).toBeCloseTo(1, 8)
  })

  it('после проверки освобождает только ось, которая не достигла направляющей', () => {
    const baseline = createScaleBaseline({
      candidates: [
        createScaleCandidate({ id: 'right', axis: 'x', position: 100 }),
        createScaleCandidate({ id: 'bottom', axis: 'y', position: 100 })
      ]
    })
    const plan = resolveScaleSnapPlan({
      baseline,
      intent: createScaleRawIntent({ values: [0.98, 0.98] }),
      holdState: FREE_SCALE_HOLD_STATE
    })
    const verification = verifyScaleSnapPlan({
      plan,
      finalGeometry: createFinalScaleGeometry({ right: 99.8, bottom: 100 })
    })

    expect(verification.blockedAxes).toEqual(['x'])
    expect(verification.guides.map(({ candidateId }) => candidateId)).toEqual(['bottom'])
    expect(verification.holdState.x.kind).toBe('free')
    expect(verification.holdState.y.kind).toBe('held')
  })

  it('изменение измеренного scale по Y не снимает подтверждённое прилипание по X', () => {
    const baseline = createScaleBaseline({
      candidates: [
        createScaleCandidate({ id: 'right', axis: 'x', position: 100 }),
        createScaleCandidate({ id: 'bottom', axis: 'y', position: 100 })
      ]
    })
    const plan = resolveScaleSnapPlan({
      baseline,
      intent: createScaleRawIntent({ values: [0.98, 0.98] }),
      holdState: FREE_SCALE_HOLD_STATE
    })
    const verification = verifyScaleSnapPlan({
      plan,
      finalGeometry: createFinalScaleGeometry({
        right: 100,
        bottom: 100,
        measuredValues: [1, 0.99]
      })
    })

    expect(verification.guides.map(({ candidateId }) => candidateId)).toEqual(['right'])
    expect(verification.blockedAxes).toEqual(['y'])
    expect(verification.holdState.x.kind).toBe('held')
    expect(verification.holdState.y.kind).toBe('free')
  })

  it('для повёрнутой фигуры снимает оба прилипания при расхождении scale по связанной оси', () => {
    const baseline = createScaleGestureBaseline({
      bounds: createScaleBounds({ left: 0, top: 0, right: 100, bottom: 100 }),
      fixedAnchor: { x: 0, y: 0 },
      projectionModes: [{
        id: 'free',
        projection: {
          variables: ['scale-x', 'scale-y'],
          baselineValues: [1, 1],
          variableSceneWeights: [100, 100],
          edges: [
            { edge: 'right', coefficients: [80, 60] },
            { edge: 'bottom', coefficients: [-60, 80] }
          ]
        }
      }],
      candidates: [
        createScaleCandidate({ id: 'right', axis: 'x', position: 100 }),
        createScaleCandidate({ id: 'bottom', axis: 'y', position: 100 })
      ],
      zoom: 1
    })
    const plan = resolveScaleSnapPlan({
      baseline,
      intent: createScaleRawIntent({ values: [0.98, 0.97] }),
      holdState: FREE_SCALE_HOLD_STATE
    })
    const verification = verifyScaleSnapPlan({
      plan,
      finalGeometry: createFinalScaleGeometry({
        right: 100,
        bottom: 100,
        measuredValues: [1, 0.99]
      })
    })

    expect(plan.effectiveValues[0]).toBeCloseTo(1, 8)
    expect(plan.effectiveValues[1]).toBeCloseTo(1, 8)
    expect(verification.blockedAxes).toEqual(['x', 'y'])
    expect(verification.guides).toEqual([])
    expect(verification.holdState.x.kind).toBe('free')
  })

  it('не подтверждает прилипание, если после применения scale сместилась фиксированная точка', () => {
    const baseline = createScaleBaseline({
      candidates: [
        createScaleCandidate({ id: 'right', axis: 'x', position: 100 }),
        createScaleCandidate({ id: 'bottom', axis: 'y', position: 100 })
      ]
    })
    const plan = resolveScaleSnapPlan({
      baseline,
      intent: createScaleRawIntent({ values: [0.98, 0.98] }),
      holdState: FREE_SCALE_HOLD_STATE
    })
    const verification = verifyScaleSnapPlan({
      plan,
      finalGeometry: createFinalScaleGeometry({
        right: 100,
        bottom: 100,
        fixedAnchor: { x: 0.2, y: 0 }
      })
    })

    expect(verification.guides).toEqual([])
    expect(verification.blockedAxes).toEqual(['x', 'y'])
    expect(verification.holdState.x.kind).toBe('free')
    expect(verification.holdState.y.kind).toBe('free')
  })

  it('не подтверждает пропорциональное прилипание при несовпадении измеренного scale', () => {
    const baseline = createScaleBaseline({
      width: 100,
      height: 200,
      candidates: [
        createScaleCandidate({ id: 'right', axis: 'x', position: 100 }),
        createScaleCandidate({ id: 'bottom', axis: 'y', position: 200 })
      ]
    })
    const plan = resolveScaleSnapPlan({
      baseline,
      intent: createScaleRawIntent({ projectionMode: 'uniform', values: [0.98] }),
      holdState: FREE_SCALE_HOLD_STATE
    })
    const verification = verifyScaleSnapPlan({
      plan,
      finalGeometry: createFinalScaleGeometry({ right: 100, bottom: 200, measuredValues: [0.99] })
    })
    const invalidMeasurement = verifyScaleSnapPlan({
      plan,
      finalGeometry: createFinalScaleGeometry({ right: 100, bottom: 200, measuredValues: [Number.NaN] })
    })

    expect(plan.effectiveValues).toEqual([1])
    expect(verification.guides).toEqual([])
    expect(verification.blockedAxes).toEqual(['x', 'y'])
    expect(verification.holdState.x.kind).toBe('free')
    expect(verification.holdState.y.kind).toBe('free')
    expect(invalidMeasurement.guides).toEqual([])
    expect(invalidMeasurement.blockedAxes).toEqual(['x', 'y'])
  })

  it('отказ применить scale по одной оси блокирует только её, а изменение защищённого состояния — обе', () => {
    const baseline = createScaleBaseline({
      candidates: [
        createScaleCandidate({ id: 'right', axis: 'x', position: 100 }),
        createScaleCandidate({ id: 'bottom', axis: 'y', position: 100 })
      ]
    })
    const plan = resolveScaleSnapPlan({
      baseline,
      intent: createScaleRawIntent({ values: [0.98, 0.98] }),
      holdState: FREE_SCALE_HOLD_STATE
    })
    const domainBlocked = verifyScaleSnapPlan({
      plan,
      finalGeometry: createFinalScaleGeometry({ right: 100, bottom: 100, domainX: 'blocked' })
    })
    const protectedChanged = verifyScaleSnapPlan({
      plan,
      finalGeometry: createFinalScaleGeometry({ right: 100, bottom: 100, protectedState: 'changed' })
    })

    expect(domainBlocked.blockedAxes).toEqual(['x'])
    expect(domainBlocked.guides.map(({ candidateId }) => candidateId)).toEqual(['bottom'])
    expect(domainBlocked.holdState.y.kind).toBe('held')
    expect(protectedChanged.blockedAxes).toEqual(['x', 'y'])
    expect(protectedChanged.guides).toEqual([])
  })

  it('отклоняет некорректную проекцию, исходные границы и итоговую геометрию', () => {
    expect(() => createScaleGestureBaseline({
      bounds: createScaleBounds({ left: 0, top: 0, right: 100, bottom: 100 }),
      fixedAnchor: { x: 0, y: 0 },
      projectionModes: [{
        id: 'free',
        projection: {
          variables: ['scale-x'],
          baselineValues: [1],
          variableSceneWeights: [0],
          edges: [{ edge: 'right', coefficients: [100] }]
        }
      }],
      candidates: [],
      zoom: 1
    })).toThrow('scene weights must be finite positive numbers')

    expect(() => createScaleGestureBaseline({
      bounds: createScaleBounds({ left: 0, top: 0, right: Number.NaN, bottom: 100 }),
      fixedAnchor: { x: 0, y: 0 },
      projectionModes: [{
        id: 'free',
        projection: {
          variables: ['scale-x'],
          baselineValues: [1],
          variableSceneWeights: [100],
          edges: [{ edge: 'right', coefficients: [100] }]
        }
      }],
      candidates: [],
      zoom: 1
    })).toThrow('finite ordered edges')

    const baseline = createScaleBaseline()
    const plan = resolveScaleSnapPlan({
      baseline,
      intent: createScaleRawIntent({ values: [1, 1] }),
      holdState: FREE_SCALE_HOLD_STATE
    })
    const invalidFinalGeometry = createFinalScaleGeometry({ right: 100, bottom: 100 })
    invalidFinalGeometry.bounds.centerX = 49

    expect(() => verifyScaleSnapPlan({ plan, finalGeometry: invalidFinalGeometry })).toThrow('centers')
  })
})
