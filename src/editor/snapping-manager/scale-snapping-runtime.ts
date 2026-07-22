/* eslint-disable no-use-before-define -- публичный класс объявлен перед внутренними проверками. */
import {
  FREE_SCALE_HOLD_STATE,
  resolveScaleSnapPlan,
  verifyScaleSnapPlan,
  type FinalScaleGeometry,
  type ScaleGestureBaseline,
  type ScaleHoldState,
  type ScaleRawIntent,
  type ScaleSnapPlan,
  type ScaleSnapVerification,
  type VerifiedScaleGuide
} from './scale-snapping-resolver'

/** Одноразовый идентификатор плана для одного события указателя. */
export type ScalePlanToken = Readonly<{
  sessionId: number
  step: number
}>

/** Новый шаг указателя, план которого менеджер объекта должен применить один раз. */
export type PlannedScaleRuntimeStep = Readonly<{
  kind: 'planned'
  token: ScalePlanToken
  plan: ScaleSnapPlan
}>

/** Повтор уже обработанного события, который не должен повторно менять объект. */
export type DuplicateScaleRuntimeStep = Readonly<{
  kind: 'duplicate'
  phase: 'pending' | 'verified'
  token: ScalePlanToken
  plan: ScaleSnapPlan
  verification: ScaleSnapVerification | null
}>

/** Результат обработки одного события указателя. */
export type ScaleRuntimeStep = PlannedScaleRuntimeStep | DuplicateScaleRuntimeStep

/** Результат идемпотентного завершения активного snapping-жеста. */
export type ScaleRuntimeCleanup = Readonly<{
  didCleanup: boolean
  hiddenGuides: readonly VerifiedScaleGuide[]
}>

/** Состояние одного события указателя для защиты от повторной обработки. */
type ScaleRuntimeStepRecord = {
  intent: ScaleRawIntent
  token: ScalePlanToken
  plan: ScaleSnapPlan
  verification: ScaleSnapVerification | null
}

/** Изменяемое состояние активного scale-жеста. */
type ActiveScaleRuntimeSession = {
  id: number
  baseline: ScaleGestureBaseline
  holdState: ScaleHoldState
  visibleGuides: readonly VerifiedScaleGuide[]
  markerRecords: WeakMap<object, ScaleRuntimeStepRecord>
  pendingStep: ScaleRuntimeStepRecord | null
  nextStep: number
}

/** Следующий локальный идентификатор scale-жеста. */
let nextScaleRuntimeSessionId = 1

/** Неизменяемый результат повторного завершения уже очищенного жеста. */
const EMPTY_SCALE_RUNTIME_CLEANUP: ScaleRuntimeCleanup = Object.freeze({
  didCleanup: false,
  hiddenGuides: Object.freeze([])
})

/**
 * Связывает событие указателя с одним планом и обновляет удержание после проверки результата.
 * Сам класс не изменяет Fabric-объекты.
 */
export class ScaleSnappingRuntime {
  private _session: ActiveScaleRuntimeSession | null = null

  private readonly _issuedTokens = new WeakSet<ScalePlanToken>()

  private readonly _consumedTokens = new WeakSet<ScalePlanToken>()

  /**
   * Начинает новый жест с уже зафиксированным исходным состоянием.
   */
  startSession({ baseline }: { baseline: ScaleGestureBaseline }): void {
    if (this._session) {
      throw new Error('Scale snapping runtime already has an active session')
    }

    this._session = {
      id: nextScaleRuntimeSessionId,
      baseline,
      holdState: FREE_SCALE_HOLD_STATE,
      visibleGuides: Object.freeze([]),
      markerRecords: new WeakMap<object, ScaleRuntimeStepRecord>(),
      pendingStep: null,
      nextStep: 1
    }
    nextScaleRuntimeSessionId += 1
  }

  /**
   * Определяет повторное событие до повторного чтения уже изменённого объекта.
   */
  getDuplicateStep({ marker }: { marker: object }): DuplicateScaleRuntimeStep | null {
    const session = this._getActiveSession()

    return this._getDuplicateStep({ session, marker })
  }

  /**
   * Возвращает не более одного плана для одного события указателя.
   */
  resolveScalePlan({
    marker,
    intent
  }: {
    marker: object
    intent: ScaleRawIntent
  }): ScaleRuntimeStep {
    const session = this._getActiveSession()
    const duplicateRecord = session.markerRecords.get(marker)
    if (duplicateRecord) {
      assertSameScaleProjectionMode({ first: duplicateRecord.intent.projectionMode, second: intent.projectionMode })
      assertSameScaleValues({ first: duplicateRecord.intent.values, second: intent.values })
      assertSameScaleModifiers({ first: duplicateRecord.intent.modifiers, second: intent.modifiers })

      return createDuplicateScaleRuntimeStep({ record: duplicateRecord })
    }

    if (session.pendingStep) {
      throw new Error('Previous scale plan token must be verified before the next pointer marker')
    }

    const plan = resolveScaleSnapPlan({
      baseline: session.baseline,
      intent,
      holdState: session.holdState
    })
    const token = this._createPlanToken({ session })
    const stepRecord = {
      intent: createScaleRawIntentSnapshot(intent),
      token,
      plan,
      verification: null
    }
    session.markerRecords.set(marker, stepRecord)
    session.pendingStep = stepRecord

    return Object.freeze({ kind: 'planned', token, plan })
  }

  /**
   * Проверяет итоговую геометрию и только после этого обновляет состояние удержания.
   */
  verifyScalePlan({
    token,
    finalGeometry
  }: {
    token: ScalePlanToken
    finalGeometry: FinalScaleGeometry
  }): ScaleSnapVerification {
    const session = this._getActiveSession()
    this._assertUsableToken({ session, token })

    const { pendingStep } = session
    if (!pendingStep) {
      throw new Error('Scale snapping runtime has no pointer step to verify')
    }

    const verification = verifyScaleSnapPlan({ plan: pendingStep.plan, finalGeometry })
    this._consumedTokens.add(token)
    pendingStep.verification = verification
    session.pendingStep = null
    session.holdState = verification.holdState
    session.visibleGuides = verification.guides

    return verification
  }

  /**
   * Завершает жест и возвращает направляющие, которые нужно скрыть один раз.
   */
  finishSession(): ScaleRuntimeCleanup {
    const session = this._session
    if (!session) return EMPTY_SCALE_RUNTIME_CLEANUP

    const pendingToken = session.pendingStep?.token
    if (pendingToken) this._consumedTokens.add(pendingToken)

    const cleanup = Object.freeze({
      didCleanup: true,
      hiddenGuides: Object.freeze([...session.visibleGuides])
    })
    this._session = null

    return cleanup
  }

  /**
   * Возвращает состояние активного жеста или выбрасывает ошибку.
   */
  private _getActiveSession(): ActiveScaleRuntimeSession {
    if (!this._session) {
      throw new Error('Scale snapping runtime has no active session')
    }

    return this._session
  }

  /**
   * Возвращает сохранённый результат для повторного события указателя.
   */
  private _getDuplicateStep({
    session,
    marker
  }: {
    session: ActiveScaleRuntimeSession
    marker: object
  }): DuplicateScaleRuntimeStep | null {
    const record = session.markerRecords.get(marker)
    if (!record) return null

    return createDuplicateScaleRuntimeStep({ record })
  }

  /**
   * Создаёт одноразовый идентификатор плана для текущего жеста.
   */
  private _createPlanToken({ session }: { session: ActiveScaleRuntimeSession }): ScalePlanToken {
    const token = Object.freeze({
      sessionId: session.id,
      step: session.nextStep
    })
    session.nextStep += 1
    this._issuedTokens.add(token)

    return token
  }

  /**
   * Отклоняет чужой, устаревший или уже использованный идентификатор плана.
   */
  private _assertUsableToken({
    session,
    token
  }: {
    session: ActiveScaleRuntimeSession
    token: ScalePlanToken
  }): void {
    if (!this._issuedTokens.has(token)) {
      throw new Error('Foreign scale plan token')
    }
    if (this._consumedTokens.has(token)) {
      throw new Error('Scale plan token has already been used')
    }
    if (!session.pendingStep || session.pendingStep.token !== token) {
      throw new Error('Scale plan token does not belong to the current pointer step')
    }
  }
}

/**
 * Копирует исходные значения шага, чтобы входная мутация не изменила сохранённый результат.
 */
function createScaleRawIntentSnapshot(intent: ScaleRawIntent): ScaleRawIntent {
  return Object.freeze({
    projectionMode: intent.projectionMode,
    values: Object.freeze([...intent.values]),
    modifiers: Object.freeze({
      ctrlKey: intent.modifiers.ctrlKey,
      shiftKey: intent.modifiers.shiftKey
    })
  })
}

/**
 * Возвращает неизменяемый результат повторного события из сохранённого состояния.
 */
function createDuplicateScaleRuntimeStep({
  record
}: {
  record: ScaleRuntimeStepRecord
}): DuplicateScaleRuntimeStep {
  return Object.freeze({
    kind: 'duplicate',
    phase: record.verification ? 'verified' : 'pending',
    token: record.token,
    plan: record.plan,
    verification: record.verification
  })
}

/**
 * Проверяет режим scale при повторной обработке того же события.
 */
function assertSameScaleProjectionMode({
  first,
  second
}: {
  first: string
  second: string
}): void {
  if (first !== second) {
    throw new Error('Native scale pointer marker was reused with a different projection mode')
  }
}

/**
 * Проверяет значения scale при повторной обработке того же события.
 */
function assertSameScaleValues({
  first,
  second
}: {
  first: readonly number[]
  second: readonly number[]
}): void {
  const hasSameValues = first.length === second.length
    && first.every((value, index) => value === second[index])

  if (!hasSameValues) {
    throw new Error('Native scale pointer marker was reused with different transform values')
  }
}

/**
 * Проверяет клавиши-модификаторы при повторной обработке того же события.
 */
function assertSameScaleModifiers({
  first,
  second
}: {
  first: ScaleRawIntent['modifiers']
  second: ScaleRawIntent['modifiers']
}): void {
  if (first.ctrlKey !== second.ctrlKey
    || first.shiftKey !== second.shiftKey) {
    throw new Error('Native scale pointer marker was reused with different modifiers')
  }
}
