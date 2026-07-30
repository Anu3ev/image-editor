/* eslint-disable no-use-before-define -- Публичный runtime расположен перед внутренними проверками. */
import {
  FREE_MOVEMENT_HOLD_STATE,
  resolveMovementSnapPlan,
  verifyMovementSnapPlan,
  type FinalMovementGeometry,
  type MovementGestureBaseline,
  type MovementHoldState,
  type MovementRawIntent,
  type MovementSnapPlan,
  type MovementSnapVerification
} from './movement-snapping-resolver'

/** Одноразовый идентификатор movement-плана. */
export type MovementPlanToken = Readonly<{
  sessionId: number
  step: number
}>

/** Новый pointer-step, который можно применить ровно один раз. */
export type PlannedMovementRuntimeStep = Readonly<{
  kind: 'planned'
  token: MovementPlanToken
  plan: MovementSnapPlan
}>

/** Повтор уже рассчитанного native pointer-step. */
export type DuplicateMovementRuntimeStep = Readonly<{
  kind: 'duplicate'
  phase: 'pending' | 'verified'
  token: MovementPlanToken
  plan: MovementSnapPlan
  verification: MovementSnapVerification | null
}>

/** Новый или повторный результат movement runtime. */
export type MovementRuntimeStep = PlannedMovementRuntimeStep | DuplicateMovementRuntimeStep

/** Результат идемпотентного завершения movement-сессии. */
export type MovementRuntimeCleanup = Readonly<{
  didCleanup: boolean
}>

/** Состояние одного native pointer marker. */
type MovementRuntimeStepRecord = {
  token: MovementPlanToken
  plan: MovementSnapPlan
  verification: MovementSnapVerification | null
}

/** Изменяемое состояние одного активного movement-жеста. */
type ActiveMovementRuntimeSession = {
  id: number
  baseline: MovementGestureBaseline
  holdState: MovementHoldState
  markerRecords: WeakMap<object, MovementRuntimeStepRecord>
  pendingStep: MovementRuntimeStepRecord | null
  nextStep: number
}

/** Следующий локальный идентификатор movement-сессии. */
let nextMovementRuntimeSessionId = 1

/** Неизменяемый результат повторной очистки. */
const EMPTY_MOVEMENT_RUNTIME_CLEANUP: MovementRuntimeCleanup = Object.freeze({
  didCleanup: false
})

/**
 * Связывает native pointer marker с одним movement-планом и обновляет hold после verification.
 * Runtime не изменяет Fabric-объекты.
 */
export class MovementSnappingRuntime {
  private _session: ActiveMovementRuntimeSession | null = null

  private readonly _issuedTokens = new WeakSet<MovementPlanToken>()

  private readonly _consumedTokens = new WeakSet<MovementPlanToken>()

  /** Начинает новую movement-сессию с неизменяемым baseline. */
  startSession({
    baseline
  }: {
    baseline: MovementGestureBaseline
  }): void {
    if (this._session) {
      throw new Error('Movement snapping runtime already has an active session')
    }

    this._session = {
      id: nextMovementRuntimeSessionId,
      baseline,
      holdState: FREE_MOVEMENT_HOLD_STATE,
      markerRecords: new WeakMap<object, MovementRuntimeStepRecord>(),
      pendingStep: null,
      nextStep: 1
    }
    nextMovementRuntimeSessionId += 1
  }

  /** Возвращает сохранённый результат до повторного чтения изменённого target. */
  getDuplicateStep({
    marker
  }: {
    marker: object
  }): DuplicateMovementRuntimeStep | null {
    const session = this._getActiveSession()
    const record = session.markerRecords.get(marker)
    if (!record) return null

    return createDuplicateMovementStep({ record })
  }

  /** Выдаёт не более одного плана для одного native pointer marker. */
  resolveMovementPlan({
    marker,
    intent
  }: {
    marker: object
    intent: MovementRawIntent
  }): MovementRuntimeStep {
    const session = this._getActiveSession()
    const duplicate = session.markerRecords.get(marker)
    if (duplicate) {
      assertSameMovementIntent({ first: duplicate.plan.rawIntent, second: intent })
      return createDuplicateMovementStep({ record: duplicate })
    }
    if (session.pendingStep) {
      throw new Error('Previous movement plan token must be verified before the next pointer marker')
    }

    const plan = resolveMovementSnapPlan({
      baseline: session.baseline,
      intent,
      holdState: session.holdState
    })
    const token = this._createPlanToken({ session })
    const record = {
      token,
      plan,
      verification: null
    }
    session.markerRecords.set(marker, record)
    session.pendingStep = record

    return Object.freeze({
      kind: 'planned',
      token,
      plan
    })
  }

  /** Проверяет применённый план и обновляет transient hold-state. */
  verifyMovementPlan({
    token,
    finalGeometry
  }: {
    token: MovementPlanToken
    finalGeometry: FinalMovementGeometry
  }): MovementSnapVerification {
    const session = this._getActiveSession()
    this._assertUsableToken({ session, token })

    const { pendingStep } = session
    if (!pendingStep) {
      throw new Error('Movement snapping runtime has no pointer step to verify')
    }

    const verification = verifyMovementSnapPlan({
      baseline: session.baseline,
      plan: pendingStep.plan,
      finalGeometry
    })
    this._consumedTokens.add(token)
    pendingStep.verification = verification
    session.pendingStep = null
    session.holdState = verification.holdState

    return verification
  }

  /** Завершает active session ровно один раз. */
  finishSession(): MovementRuntimeCleanup {
    const session = this._session
    if (!session) return EMPTY_MOVEMENT_RUNTIME_CLEANUP

    const pendingToken = session.pendingStep?.token
    if (pendingToken) this._consumedTokens.add(pendingToken)

    this._session = null

    return Object.freeze({
      didCleanup: true
    })
  }

  /** Возвращает активную сессию или явно сообщает о нарушении lifecycle. */
  private _getActiveSession(): ActiveMovementRuntimeSession {
    if (!this._session) {
      throw new Error('Movement snapping runtime has no active session')
    }

    return this._session
  }

  /** Создаёт одноразовый token текущего pointer-step. */
  private _createPlanToken({
    session
  }: {
    session: ActiveMovementRuntimeSession
  }): MovementPlanToken {
    const token = Object.freeze({
      sessionId: session.id,
      step: session.nextStep
    })
    session.nextStep += 1
    this._issuedTokens.add(token)

    return token
  }

  /** Отклоняет чужой, устаревший или уже использованный token. */
  private _assertUsableToken({
    session,
    token
  }: {
    session: ActiveMovementRuntimeSession
    token: MovementPlanToken
  }): void {
    if (!this._issuedTokens.has(token)) {
      throw new Error('Foreign movement plan token')
    }
    if (this._consumedTokens.has(token)) {
      throw new Error('Movement plan token has already been used')
    }
    if (!session.pendingStep || session.pendingStep.token !== token) {
      throw new Error('Movement plan token does not belong to the current pointer step')
    }
  }
}

/** Возвращает immutable duplicate-step из сохранённого record. */
function createDuplicateMovementStep({
  record
}: {
  record: MovementRuntimeStepRecord
}): DuplicateMovementRuntimeStep {
  return Object.freeze({
    kind: 'duplicate',
    phase: record.verification ? 'verified' : 'pending',
    token: record.token,
    plan: record.plan,
    verification: record.verification
  })
}

/** Проверяет что один marker не был переиспользован с другим raw intent. */
function assertSameMovementIntent({
  first,
  second
}: {
  first: MovementRawIntent
  second: MovementRawIntent
}): void {
  const sameBounds = areMovementBoundsEqual({
    first: first.bounds,
    second: second.bounds
  })
  const samePosition = first.position.left === second.position.left
    && first.position.top === second.position.top
  const sameAxes = first.axes.x === second.axes.x && first.axes.y === second.axes.y
  const sameModifiers = first.modifiers.ctrlKey === second.modifiers.ctrlKey

  if (!sameBounds || !samePosition || !sameAxes || !sameModifiers) {
    throw new Error('Native movement pointer marker was reused with a different raw intent')
  }
}

/** Сравнивает exact bounds двух raw intent без скрытого допуска. */
function areMovementBoundsEqual({
  first,
  second
}: {
  first: MovementRawIntent['bounds']
  second: MovementRawIntent['bounds']
}): boolean {
  return first.left === second.left
    && first.right === second.right
    && first.top === second.top
    && first.bottom === second.bottom
    && first.centerX === second.centerX
    && first.centerY === second.centerY
}
