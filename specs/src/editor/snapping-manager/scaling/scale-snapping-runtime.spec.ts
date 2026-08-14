import { ScaleSnappingRuntime } from '../../../../../src/editor/snapping-manager/scaling/scale-snapping-runtime'
import {
  createFinalScaleGeometry,
  createScaleBaseline,
  createScaleCandidate,
  createScaleRawIntent
} from '../../../../test-utils/snapping/scale-snapping-core'

describe('Жизненный цикл прилипания во время скейлинга', () => {
  it('при повторной обработке одного события возвращает тот же token и не создаёт новый план', () => {
    const runtime = new ScaleSnappingRuntime()
    const marker = {}
    const intent = createScaleRawIntent({ values: [0.98, 1] })
    runtime.startSession({
      baseline: createScaleBaseline({
        candidates: [createScaleCandidate({ id: 'right', axis: 'x', position: 100 })]
      })
    })

    const planned = runtime.resolveScalePlan({ marker, intent })
    const duplicatePending = runtime.resolveScalePlan({ marker, intent })
    if (planned.kind !== 'planned' || duplicatePending.kind !== 'duplicate') {
      throw new Error('Первое событие должно создать план, а повторное — вернуть уже созданный шаг')
    }
    const verification = runtime.verifyScalePlan({
      token: planned.token,
      finalGeometry: createFinalScaleGeometry({ right: 100, bottom: 100 })
    })
    const duplicateVerified = runtime.resolveScalePlan({ marker, intent })
    if (duplicateVerified.kind !== 'duplicate') {
      throw new Error('После проверки повторное событие должно остаться уже обработанным')
    }

    expect(Object.isFrozen(planned.token)).toBe(true)
    expect(Object.isFrozen(planned.plan)).toBe(true)
    expect(duplicatePending.phase).toBe('pending')
    expect(duplicatePending.token).toBe(planned.token)
    expect(duplicateVerified.kind).toBe('duplicate')
    expect(duplicateVerified.verification).toBe(verification)
    expect(verification.guides).toHaveLength(1)
  })

  it('сохраняет уточнённый план для проверки и повторного события', () => {
    const runtime = new ScaleSnappingRuntime()
    const marker = {}
    const intent = createScaleRawIntent({ values: [0.98, 1] })
    runtime.startSession({
      baseline: createScaleBaseline({
        candidates: [createScaleCandidate({ id: 'right', axis: 'x', position: 100 })]
      })
    })
    const planned = runtime.resolveScalePlan({ marker, intent })
    if (planned.kind !== 'planned') throw new Error('Первое событие должно создать план')

    const refinedPlan = runtime.refineScalePlan({
      token: planned.token,
      refinement: {
        constraints: planned.plan.constraints,
        effectiveValues: [1.002, 1],
        stepProjection: {
          bounds: {
            left: 0,
            right: 100,
            top: 0,
            bottom: 100,
            centerX: 50,
            centerY: 50
          },
          projection: {
            variables: ['scale-x', 'scale-y'],
            baselineValues: [1.002, 1],
            variableSceneWeights: [100, 100],
            edges: [
              { edge: 'right', coefficients: [100, 0] },
              { edge: 'bottom', coefficients: [0, 100] }
            ]
          }
        }
      }
    })
    const duplicate = runtime.getDuplicateStep({ marker })
    const verification = runtime.verifyScalePlan({
      token: planned.token,
      finalGeometry: createFinalScaleGeometry({
        right: 100,
        bottom: 100,
        measuredValues: [1.002, 1]
      })
    })

    expect(refinedPlan.effectiveValues).toEqual([1.002, 1])
    expect(duplicate?.plan).toBe(refinedPlan)
    expect(verification.guides).toHaveLength(1)
    expect(verification.holdState.x.kind).toBe('held')
  })

  it('после уточнения не восстанавливает снятую направляющую', () => {
    const runtime = new ScaleSnappingRuntime()
    const marker = {}
    runtime.startSession({
      baseline: createScaleBaseline({
        candidates: [createScaleCandidate({ id: 'right', axis: 'x', position: 100 })]
      })
    })
    const planned = runtime.resolveScalePlan({
      marker,
      intent: createScaleRawIntent({ values: [0.98, 1] })
    })
    if (planned.kind !== 'planned') throw new Error('Первое событие должно создать план')

    const refined = runtime.refineScalePlan({
      token: planned.token,
      refinement: {
        constraints: { x: null, y: null },
        effectiveValues: [0.98, 1],
        stepProjection: {
          bounds: {
            left: 0,
            right: 98,
            top: 0,
            bottom: 100,
            centerX: 49,
            centerY: 50
          },
          projection: {
            variables: ['scale-x', 'scale-y'],
            baselineValues: [0.98, 1],
            variableSceneWeights: [100, 100],
            edges: [
              { edge: 'right', coefficients: [100, 0] },
              { edge: 'bottom', coefficients: [0, 100] }
            ]
          }
        }
      }
    })
    const verification = runtime.verifyScalePlan({
      token: planned.token,
      finalGeometry: createFinalScaleGeometry({ right: 98, bottom: 100, measuredValues: [0.98, 1] })
    })
    const duplicate = runtime.getDuplicateStep({ marker })

    expect(refined.constraints.x).toBeNull()
    expect(verification.guides).toHaveLength(0)
    expect(verification.holdState.x.kind).toBe('free')
    expect(duplicate?.plan).toBe(refined)
    expect(duplicate?.verification).toBe(verification)
  })

  it('отклоняет повторную обработку события с другими параметрами скейлинга', () => {
    const runtime = new ScaleSnappingRuntime()
    const marker = {}
    runtime.startSession({ baseline: createScaleBaseline() })
    const planned = runtime.resolveScalePlan({
      marker,
      intent: createScaleRawIntent({ values: [1, 1] })
    })

    expect(planned.kind).toBe('planned')
    expect(() => runtime.resolveScalePlan({
      marker,
      intent: createScaleRawIntent({ values: [1, 1], ctrlKey: true })
    })).toThrow('reused with different modifiers')
    expect(() => runtime.resolveScalePlan({
      marker,
      intent: createScaleRawIntent({ values: [0.99, 1] })
    })).toThrow('reused with different transform values')
    expect(() => runtime.resolveScalePlan({
      marker,
      intent: createScaleRawIntent({ projectionMode: 'uniform', values: [1] })
    })).toThrow('different projection mode')
  })

  it('позволяет старой логике распознать обработанное событие до чтения изменённого объекта', () => {
    const runtime = new ScaleSnappingRuntime()
    const marker = {}
    const readIntentFromTarget = jest.fn(() => createScaleRawIntent({ values: [1, 1] }))
    runtime.startSession({ baseline: createScaleBaseline() })
    const planned = runtime.resolveScalePlan({
      marker,
      intent: createScaleRawIntent({ values: [0.98, 1] })
    })

    const duplicate = runtime.getDuplicateStep({ marker })
    const fallbackIntent = duplicate ? null : readIntentFromTarget()

    expect(planned.kind).toBe('planned')
    expect(duplicate?.kind).toBe('duplicate')
    expect(duplicate?.phase).toBe('pending')
    expect(fallbackIntent).toBeNull()
    expect(readIntentFromTarget).not.toHaveBeenCalled()
  })

  it('Shift переключает свободный и пропорциональный scale в рамках одного жеста', () => {
    const runtime = new ScaleSnappingRuntime()
    const baseline = createScaleBaseline({
      candidates: [
        createScaleCandidate({ id: 'right', axis: 'x', position: 100 }),
        createScaleCandidate({ id: 'bottom', axis: 'y', position: 100 })
      ]
    })
    runtime.startSession({ baseline })
    const first = runtime.resolveScalePlan({
      marker: {},
      intent: createScaleRawIntent({ values: [0.98, 0.97] })
    })
    if (first.kind !== 'planned') throw new Error('Первый шаг скейлинга должен создать план')
    runtime.verifyScalePlan({
      token: first.token,
      finalGeometry: createFinalScaleGeometry({ right: 100, bottom: 100 })
    })

    const second = runtime.resolveScalePlan({
      marker: {},
      intent: createScaleRawIntent({ projectionMode: 'uniform', values: [0.98], shiftKey: true })
    })
    if (second.kind !== 'planned') throw new Error('Следующее событие должно создать новый план')

    expect(baseline.projectionModes.map(({ id }) => id)).toEqual(['free', 'uniform'])
    expect(first.plan.variables).toEqual(['scale-x', 'scale-y'])
    expect(first.plan.effectiveValues).toEqual([1, 1])
    expect(second.plan.variables).toEqual(['uniform-scale'])
    expect(second.plan.effectiveValues).toEqual([1])
    expect(second.token).not.toBe(first.token)
    expect(second.token.step).toBe(first.token.step + 1)
  })

  it('повтор события A после события B не создаёт для A новый token', () => {
    const runtime = new ScaleSnappingRuntime()
    const markerA = {}
    const markerB = {}
    const intentA = createScaleRawIntent({ values: [1, 1] })
    runtime.startSession({ baseline: createScaleBaseline() })
    const stepA = runtime.resolveScalePlan({ marker: markerA, intent: intentA })
    if (stepA.kind !== 'planned') throw new Error('Событие A должно создать план прилипания')
    runtime.verifyScalePlan({
      token: stepA.token,
      finalGeometry: createFinalScaleGeometry({ right: 100, bottom: 100 })
    })
    const stepB = runtime.resolveScalePlan({
      marker: markerB,
      intent: createScaleRawIntent({ values: [0.99, 1] })
    })
    if (stepB.kind !== 'planned') throw new Error('Событие B должно создать план прилипания')
    runtime.verifyScalePlan({
      token: stepB.token,
      finalGeometry: createFinalScaleGeometry({ right: 99, bottom: 100, measuredValues: [0.99, 1] })
    })

    const lazyDuplicateA = runtime.getDuplicateStep({ marker: markerA })
    const strictDuplicateA = runtime.resolveScalePlan({ marker: markerA, intent: intentA })

    expect(lazyDuplicateA?.phase).toBe('verified')
    expect(lazyDuplicateA?.token).toBe(stepA.token)
    expect(strictDuplicateA.kind).toBe('duplicate')
    expect(strictDuplicateA.token).toBe(stepA.token)
    expect(stepB.token.step).toBe(stepA.token.step + 1)
  })

  it('отклоняет token, созданный другим экземпляром', () => {
    const firstRuntime = new ScaleSnappingRuntime()
    const secondRuntime = new ScaleSnappingRuntime()
    const baseline = createScaleBaseline()
    firstRuntime.startSession({ baseline })
    secondRuntime.startSession({ baseline })

    const first = firstRuntime.resolveScalePlan({
      marker: {},
      intent: createScaleRawIntent({ values: [1, 1] })
    })
    const second = secondRuntime.resolveScalePlan({
      marker: {},
      intent: createScaleRawIntent({ values: [1, 1] })
    })
    if (first.kind !== 'planned' || second.kind !== 'planned') {
      throw new Error('Каждый экземпляр должен выдать собственный token')
    }

    expect(second.token).not.toBe(first.token)
    expect(() => firstRuntime.verifyScalePlan({
      token: second.token,
      finalGeometry: createFinalScaleGeometry({ right: 100, bottom: 100 })
    })).toThrow('Foreign scale plan token')
  })

  it('не позволяет повторно проверить уже использованный token', () => {
    const runtime = new ScaleSnappingRuntime()
    runtime.startSession({ baseline: createScaleBaseline() })
    const planned = runtime.resolveScalePlan({
      marker: {},
      intent: createScaleRawIntent({ values: [1, 1] })
    })
    if (planned.kind !== 'planned') throw new Error('Первый шаг скейлинга должен создать план')

    const verification = runtime.verifyScalePlan({
      token: planned.token,
      finalGeometry: createFinalScaleGeometry({ right: 100, bottom: 100 })
    })

    expect(verification.guides).toEqual([])
    expect(() => runtime.verifyScalePlan({
      token: planned.token,
      finalGeometry: createFinalScaleGeometry({ right: 100, bottom: 100 })
    })).toThrow('already been used')
  })

  it('после ошибки итоговой геометрии позволяет повторно проверить тот же token', () => {
    const runtime = new ScaleSnappingRuntime()
    runtime.startSession({ baseline: createScaleBaseline() })
    const planned = runtime.resolveScalePlan({
      marker: {},
      intent: createScaleRawIntent({ values: [1, 1] })
    })
    if (planned.kind !== 'planned') throw new Error('Первый шаг скейлинга должен создать план')
    const invalidGeometry = createFinalScaleGeometry({ right: 100, bottom: 100 })
    invalidGeometry.bounds.centerX = 49

    expect(() => runtime.verifyScalePlan({
      token: planned.token,
      finalGeometry: invalidGeometry
    })).toThrow('centers')

    const verification = runtime.verifyScalePlan({
      token: planned.token,
      finalGeometry: createFinalScaleGeometry({ right: 100, bottom: 100 })
    })

    expect(verification.guides).toEqual([])
    expect(() => runtime.verifyScalePlan({
      token: planned.token,
      finalGeometry: createFinalScaleGeometry({ right: 100, bottom: 100 })
    })).toThrow('already been used')
  })

  it('не переносит неподтверждённую направляющую в удержание следующего шага', () => {
    const runtime = new ScaleSnappingRuntime()
    runtime.startSession({
      baseline: createScaleBaseline({
        candidates: [createScaleCandidate({ id: 'right', axis: 'x', position: 100 })]
      })
    })
    const blockedStep = runtime.resolveScalePlan({
      marker: {},
      intent: createScaleRawIntent({ values: [0.98, 1] })
    })
    if (blockedStep.kind !== 'planned') throw new Error('Первый шаг скейлинга должен создать план')
    const blocked = runtime.verifyScalePlan({
      token: blockedStep.token,
      finalGeometry: createFinalScaleGeometry({ right: 99.8, bottom: 100 })
    })

    const nextStep = runtime.resolveScalePlan({
      marker: {},
      intent: createScaleRawIntent({ values: [0.98, 1] })
    })
    if (nextStep.kind !== 'planned') throw new Error('Следующее событие должно создать новый план')

    expect(blocked.blockedAxes).toEqual(['x'])
    expect(blocked.holdState.x.kind).toBe('free')
    expect(nextStep.plan.constraints.x?.transition).toBe('acquired')
    expect(nextStep.plan.constraints.x?.candidate.id).toBe('right')
  })

  it('при завершении скрывает подтверждённые направляющие и очищает состояние один раз', () => {
    const runtime = new ScaleSnappingRuntime()
    runtime.startSession({
      baseline: createScaleBaseline({
        candidates: [createScaleCandidate({ id: 'right', axis: 'x', position: 100 })]
      })
    })
    const planned = runtime.resolveScalePlan({
      marker: {},
      intent: createScaleRawIntent({ values: [0.98, 1] })
    })
    if (planned.kind !== 'planned') throw new Error('Первый шаг скейлинга должен создать план')
    runtime.verifyScalePlan({
      token: planned.token,
      finalGeometry: createFinalScaleGeometry({ right: 100, bottom: 100 })
    })

    const firstCleanup = runtime.finishSession()
    const secondCleanup = runtime.finishSession()

    expect(firstCleanup.didCleanup).toBe(true)
    expect(firstCleanup.hiddenGuides.map(({ candidateId }) => candidateId)).toEqual(['right'])
    expect(secondCleanup).toEqual({ didCleanup: false, hiddenGuides: [] })
    expect(() => runtime.resolveScalePlan({
      marker: {},
      intent: createScaleRawIntent({ values: [1, 1] })
    })).toThrow('no active session')
  })

  it('после завершения не принимает незавершённый token в новом жесте', () => {
    const runtime = new ScaleSnappingRuntime()
    const baseline = createScaleBaseline()
    runtime.startSession({ baseline })
    const pending = runtime.resolveScalePlan({
      marker: {},
      intent: createScaleRawIntent({ values: [1, 1] })
    })
    if (pending.kind !== 'planned') throw new Error('Первый шаг скейлинга должен создать план')

    const cleanup = runtime.finishSession()
    runtime.startSession({ baseline })

    expect(cleanup.didCleanup).toBe(true)
    expect(cleanup.hiddenGuides).toEqual([])
    expect(() => runtime.verifyScalePlan({
      token: pending.token,
      finalGeometry: createFinalScaleGeometry({ right: 100, bottom: 100 })
    })).toThrow('already been used')
  })
})
