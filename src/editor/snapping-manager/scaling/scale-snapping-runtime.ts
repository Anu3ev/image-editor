/* eslint-disable no-use-before-define -- The public class is declared before internal validation helpers. */
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
  private _session: ActiveScaleRuntimeSession | null = null

  private readonly _issuedTokens = new WeakSet<ScalePlanToken>()

  private readonly _consumedTokens = new WeakSet<ScalePlanToken>()

  /**
   * Starts a new gesture with an already captured initial state.
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
      throw new Error('Scale snapping runtime has no pointer step to refine')
    }

    const refinedPlan = refineScaleSnapPlan({ plan: pendingStep.plan, refinement })
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
      throw new Error('Scale snapping runtime has no active session')
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
 * Checks scale values when handling the same event again.
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
 * Checks modifier keys when handling the same event again.
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
