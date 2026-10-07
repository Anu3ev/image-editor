/* eslint-disable no-use-before-define -- The public class is declared before internal validation helpers. */
import { english, type Translate } from '../../i18n'
import {
  FREE_SCALE_HOLD_STATE,
  refineScaleSnapPlan,
  resolveScaleSnapPlan,
  verifyScaleSnapPlan,
  type FinalScaleGeometry,
  type ScaleGestureBaseline,
  type ScaleHoldState,
  type ScaleRawIntent,
  type ScaleSnapPlan,
  type ScaleSnapPlanRefinement,
  type ScaleSnapVerification,
  type ScaleStepProjectionInput,
  type VerifiedScaleGuide
} from './scale-snapping-resolver'

/** Single-use plan identifier for one pointer event. */
export type ScalePlanToken = Readonly<{
  sessionId: number
  step: number
}>

/** New pointer step whose plan the object's manager must apply once. */
export type PlannedScaleRuntimeStep = Readonly<{
  kind: 'planned'
  token: ScalePlanToken
  plan: ScaleSnapPlan
}>

/** Duplicate of an already handled event that must not modify the object again. */
export type DuplicateScaleRuntimeStep = Readonly<{
  kind: 'duplicate'
  phase: 'pending' | 'verified'
  token: ScalePlanToken
  plan: ScaleSnapPlan
  verification: ScaleSnapVerification | null
}>

/** Result of handling one pointer event. */
export type ScaleRuntimeStep = PlannedScaleRuntimeStep | DuplicateScaleRuntimeStep

/** Result of idempotently ending a snapping gesture. */
export type ScaleRuntimeCleanup = Readonly<{
  didCleanup: boolean
  hiddenGuides: readonly VerifiedScaleGuide[]
}>

/** State of one pointer event to prevent duplicate handling. */
type ScaleRuntimeStepRecord = {
  intent: ScaleRawIntent
  token: ScalePlanToken
  plan: ScaleSnapPlan
  verification: ScaleSnapVerification | null
}

/** Mutable state of the active resize operation. */
type ActiveScaleRuntimeSession = {
  id: number
  baseline: ScaleGestureBaseline
  holdState: ScaleHoldState
  visibleGuides: readonly VerifiedScaleGuide[]
  markerRecords: WeakMap<object, ScaleRuntimeStepRecord>
  pendingStep: ScaleRuntimeStepRecord | null
  nextStep: number
}

/** Next local resize identifier. */
let nextScaleRuntimeSessionId = 1

/** Immutable result of ending an already cleaned-up gesture again. */
const EMPTY_SCALE_RUNTIME_CLEANUP: ScaleRuntimeCleanup = Object.freeze({
  didCleanup: false,
  hiddenGuides: Object.freeze([])
})

/**
 * Associates a pointer event with one plan and updates the hold after verifying the result.
 * The class itself does not modify Fabric objects.
 */
export class ScaleSnappingRuntime {
  private readonly t: Translate

  /** Creates an isolated runtime using the editor's translator. */
  constructor(t: Translate = english) {
    this.t = t
  }

  private _session: ActiveScaleRuntimeSession | null = null

  private readonly _issuedTokens = new WeakSet<ScalePlanToken>()

  private readonly _consumedTokens = new WeakSet<ScalePlanToken>()

  /**
   * Starts a new gesture with an already captured initial state.
   */
  startSession({ baseline }: { baseline: ScaleGestureBaseline }): void {
    if (this._session) {
      throw new Error(this.t('snapping.scale.runtime.sessionAlreadyActive'))
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
   * Detects a duplicate event before rereading the already modified object.
   */
  getDuplicateStep({ marker }: { marker: object }): DuplicateScaleRuntimeStep | null {
    const session = this._getActiveSession()

    return this._getDuplicateStep({ session, marker })
  }

  /**
   * Returns at most one plan per pointer event.
   */
  resolveScalePlan({
    marker,
    intent,
    stepProjection
  }: {
    marker: object
    intent: ScaleRawIntent
    stepProjection?: ScaleStepProjectionInput
  }): ScaleRuntimeStep {
    const session = this._getActiveSession()
    const duplicateRecord = session.markerRecords.get(marker)
    if (duplicateRecord) {
      assertSameScaleProjectionMode({
        t: this.t,
        first: duplicateRecord.intent.projectionMode,
        second: intent.projectionMode
      })
      assertSameScaleValues({ t: this.t, first: duplicateRecord.intent.values, second: intent.values })
      assertSameScaleModifiers({ t: this.t, first: duplicateRecord.intent.modifiers, second: intent.modifiers })

      return createDuplicateScaleRuntimeStep({ record: duplicateRecord })
    }

    if (session.pendingStep) {
      throw new Error(this.t('snapping.scale.runtime.previousPlanVerificationRequired'))
    }

    const plan = resolveScaleSnapPlan({
      t: this.t,
      baseline: session.baseline,
      intent,
      holdState: session.holdState,
      stepProjection
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

  /** Refines the current plan using exact domain geometry before applying it. */
  refineScalePlan({
    token,
    refinement
  }: {
    token: ScalePlanToken
    refinement: ScaleSnapPlanRefinement
  }): ScaleSnapPlan {
    const session = this._getActiveSession()
    this._assertUsableToken({ session, token })

    const { pendingStep } = session
    if (!pendingStep) {
      throw new Error(this.t('snapping.scale.runtime.noPointerStepToRefine'))
    }

    const refinedPlan = refineScaleSnapPlan({ t: this.t, plan: pendingStep.plan, refinement })
    pendingStep.plan = refinedPlan

    return refinedPlan
  }

  /**
   * Verifies the final geometry before updating hold state.
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
      throw new Error(this.t('snapping.scale.runtime.noPointerStepToVerify'))
    }

    const verification = verifyScaleSnapPlan({ t: this.t, plan: pendingStep.plan, finalGeometry })
    this._consumedTokens.add(token)
    pendingStep.verification = verification
    session.pendingStep = null
    session.holdState = verification.holdState
    session.visibleGuides = verification.guides

    return verification
  }

  /**
   * Ends the gesture and returns the guides to hide once.
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
   * Returns the active gesture state or throws an error.
   */
  private _getActiveSession(): ActiveScaleRuntimeSession {
    if (!this._session) {
      throw new Error(this.t('snapping.scale.runtime.noActiveSession'))
    }

    return this._session
  }

  /**
   * Returns the cached result for a duplicate pointer event.
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
   * Creates a single-use plan identifier for the current gesture.
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
   * Rejects a foreign, stale, or already used plan identifier.
   */
  private _assertUsableToken({
    session,
    token
  }: {
    session: ActiveScaleRuntimeSession
    token: ScalePlanToken
  }): void {
    if (!this._issuedTokens.has(token)) {
      throw new Error(this.t('snapping.scale.runtime.foreignPlanToken'))
    }
    if (this._consumedTokens.has(token)) {
      throw new Error(this.t('snapping.scale.runtime.planTokenAlreadyUsed'))
    }
    if (!session.pendingStep || session.pendingStep.token !== token) {
      throw new Error(this.t('snapping.scale.runtime.planTokenPointerStepMismatch'))
    }
  }
}

/**
 * Copies the step's raw input values so input mutation cannot change the saved result.
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
 * Returns an immutable duplicate-event result from the saved state.
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
 * Checks the scaling mode when handling the same event again.
 */
function assertSameScaleProjectionMode({
  t = english,
  first,
  second
}: {
  t?: Translate
  first: string
  second: string
}): void {
  if (first !== second) {
    throw new Error(t('snapping.scale.runtime.pointerMarkerProjectionModeMismatch'))
  }
}

/**
 * Checks scale values when handling the same event again.
 */
function assertSameScaleValues({
  t = english,
  first,
  second
}: {
  t?: Translate
  first: readonly number[]
  second: readonly number[]
}): void {
  const hasSameValues = first.length === second.length
    && first.every((value, index) => value === second[index])

  if (!hasSameValues) {
    throw new Error(t('snapping.scale.runtime.pointerMarkerTransformMismatch'))
  }
}

/**
 * Checks modifier keys when handling the same event again.
 */
function assertSameScaleModifiers({
  t = english,
  first,
  second
}: {
  t?: Translate
  first: ScaleRawIntent['modifiers']
  second: ScaleRawIntent['modifiers']
}): void {
  if (first.ctrlKey !== second.ctrlKey
    || first.shiftKey !== second.shiftKey) {
    throw new Error(t('snapping.scale.runtime.pointerMarkerModifiersMismatch'))
  }
}
