import type { MovementSnapCandidateSource } from '../../../../src/editor/snapping-manager/movement-snap-candidates'
import { MovementSnappingRuntime } from '../../../../src/editor/snapping-manager/movement-snapping-runtime'
import {
  createFinalMovementGeometry,
  createMovementBaseline,
  createMovementBounds,
  createMovementRawIntent
} from '../../../test-utils/shared/movement-snapping-core'

/** Цель с близкими edge и center guide для проверки runtime hold-state. */
const REFERENCE_SOURCE = {
  id: 'reference',
  bounds: createMovementBounds({
    left: 100,
    top: 100,
    width: 12,
    height: 40
  })
} satisfies MovementSnapCandidateSource

it('выдаёт один план на marker и возвращает подтверждённый duplicate без новой мутации', () => {
  const runtime = new MovementSnappingRuntime()
  const marker = {}
  runtime.startSession({
    baseline: createMovementBaseline({
      sources: [REFERENCE_SOURCE]
    })
  })

  const intent = createMovementRawIntent({ left: 101, top: 101 })
  const step = runtime.resolveMovementPlan({
    marker,
    intent
  })
  expect(step.kind).toBe('planned')
  if (step.kind !== 'planned') {
    throw new Error('Первый movement-step должен выдать новый план')
  }

  const verification = runtime.verifyMovementPlan({
    token: step.token,
    finalGeometry: createFinalMovementGeometry({ left: 100, top: 100 })
  })
  const duplicate = runtime.resolveMovementPlan({ marker, intent })

  expect(verification.guides).toHaveLength(2)
  expect(duplicate.kind).toBe('duplicate')
  if (duplicate.kind !== 'duplicate') {
    throw new Error(
      'Повторный marker должен вернуть сохранённый movement-step'
    )
  }

  expect(duplicate.phase).toBe('verified')
  expect(duplicate.token).toBe(step.token)
  expect(duplicate.verification).toBe(verification)
})

it('не позволяет проверить один movement token повторно', () => {
  const runtime = new MovementSnappingRuntime()
  runtime.startSession({
    baseline: createMovementBaseline({
      sources: [REFERENCE_SOURCE]
    })
  })
  const step = runtime.resolveMovementPlan({
    marker: {},
    intent: createMovementRawIntent({ left: 101, top: 101 })
  })
  expect(step.kind).toBe('planned')
  if (step.kind !== 'planned') {
    throw new Error('Movement runtime должен выдать план для нового marker')
  }

  const finalGeometry = createFinalMovementGeometry({ left: 100, top: 100 })
  const firstVerification = runtime.verifyMovementPlan({
    token: step.token,
    finalGeometry
  })

  expect(firstVerification.guides).toHaveLength(2)
  expect(() => {
    runtime.verifyMovementPlan({
      token: step.token,
      finalGeometry
    })
  }).toThrow('Movement plan token has already been used')
})

it('не переносит заблокированную направляющую в следующий hold-state', () => {
  const runtime = new MovementSnappingRuntime()
  runtime.startSession({
    baseline: createMovementBaseline({
      sources: [REFERENCE_SOURCE]
    })
  })
  const firstStep = runtime.resolveMovementPlan({
    marker: {},
    intent: createMovementRawIntent({ left: 101, top: 101 })
  })
  expect(firstStep.kind).toBe('planned')
  if (firstStep.kind !== 'planned') {
    throw new Error('Первый movement marker должен выдать план')
  }

  const blocked = runtime.verifyMovementPlan({
    token: firstStep.token,
    finalGeometry: createFinalMovementGeometry({ left: 105, top: 100 })
  })
  const nextStep = runtime.resolveMovementPlan({
    marker: {},
    intent: createMovementRawIntent({ left: 104, top: 104 })
  })

  expect(blocked.holdState.x.kind).toBe('free')
  expect(blocked.holdState.y.kind).toBe('line')
  expect(nextStep.kind).toBe('planned')
  expect(nextStep.plan.constraints.x?.kind).toBe('line')
  expect(nextStep.plan.constraints.y?.kind).toBe('line')
  if (
    nextStep.plan.constraints.x?.kind !== 'line'
    || nextStep.plan.constraints.y?.kind !== 'line'
  ) {
    throw new Error('Следующий movement-step должен выбрать line constraints')
  }

  expect(nextStep.plan.constraints.x?.transition).toBe('acquired')
  expect(nextStep.plan.constraints.x?.candidate.id).toBe('reference:center-x')
  expect(nextStep.plan.constraints.y?.transition).toBe('held')
})

it('очищает активную сессию идемпотентно', () => {
  const runtime = new MovementSnappingRuntime()
  runtime.startSession({
    baseline: createMovementBaseline()
  })

  const firstCleanup = runtime.finishSession()
  const repeatedCleanup = runtime.finishSession()

  expect(firstCleanup.didCleanup).toBe(true)
  expect(repeatedCleanup.didCleanup).toBe(false)
  expect(() => {
    runtime.resolveMovementPlan({
      marker: {},
      intent: createMovementRawIntent({ left: 10, top: 10 })
    })
  }).toThrow('Movement snapping runtime has no active session')
})
