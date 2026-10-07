/* eslint-disable no-use-before-define -- Exported functions are declared before internal calculations. */
import { english, type Translate } from '../../i18n'
import {
  SNAP_THRESHOLD,
  SPACING_SNAP_HOLD_MARGIN
} from '../constants'
import {
  createScaleProjection,
  getScaleProjectionCorrectionMagnitude,
  getScaleProjectionEdge,
  projectScaleEdgePositions,
  resolveScaleProjection,
  resolveScaleSceneEdgeAxis,
  type ProjectedScaleEdgePositions,
  type ScaleProjection,
  type ScaleProjectionConstraint,
  type ScaleProjectionInput,
  type ScaleProjectionSolution,
  type ScaleProjectionVariable,
  type ScaleSceneAxis,
  type ScaleSceneEdge
} from './scale-projection'
import type { ObjectBounds } from '../../utils/geometry'

/** Guide category used to choose between tied candidates. */
export type ScaleSnapCandidateCategory = 'domain-boundary' | 'edge' | 'center' | 'spacing'

/** Point in scene coordinates independent of Fabric Point. */
export type ScaleScenePoint = Readonly<{
  x: number
  y: number
}>

/** Named resizing mode before gesture input validation. */
export type ScaleProjectionModeInput = Readonly<{
  id: string
  projection: ScaleProjectionInput
}>

/** Validated resizing mode for one gesture. */
export type ScaleProjectionMode = Readonly<{
  id: string
  projection: ScaleProjection
}>

/** Snap candidate before capturing the initial gesture state. */
export type ScaleSnapCandidateInput = Readonly<{
  id: string
  axis: ScaleSceneAxis
  edge: ScaleSceneEdge
  position: number
  category: ScaleSnapCandidateCategory
}>

/** Candidate for a specific moving edge, fixed for the duration of the gesture. */
export type ScaleSnapCandidate = Readonly<{
  id: string
  axis: ScaleSceneAxis
  edge: ScaleSceneEdge
  position: number
  category: ScaleSnapCandidateCategory
  snapshotIndex: number
}>

/** Axis state with no held guide. */
export type FreeScaleAxisHold = Readonly<{
  kind: 'free'
}>

/** A specific guide held on one axis. */
export type HeldScaleAxisHold = Readonly<{
  kind: 'held'
  candidate: ScaleSnapCandidate
}>

/** Free or held state of one axis. */
export type ScaleAxisHold = FreeScaleAxisHold | HeldScaleAxisHold

/** Independent temporary snapping state for both axes. */
export type ScaleHoldState = Readonly<{
  x: ScaleAxisHold
  y: ScaleAxisHold
}>

/** Snapping thresholds in scene coordinates, accounting for zoom. */
export type ScaleSnapThresholds = Readonly<{
  acquire: number
  release: number
  spacingRelease: number
  verification: number
}>

/** Initial gesture geometry and available resizing modes. */
export type ScaleGestureBaselineInput = Readonly<{
  t?: Translate
  bounds: ObjectBounds
  fixedAnchor: ScaleScenePoint
  projectionModes: readonly ScaleProjectionModeInput[]
  candidates: readonly ScaleSnapCandidateInput[]
  zoom: number
}>

/** Validated snapshot of the gesture-start state. */
export type ScaleGestureBaseline = Readonly<{
  bounds: ObjectBounds
  fixedAnchor: ScaleScenePoint
  projectionModes: readonly ScaleProjectionMode[]
  candidates: readonly ScaleSnapCandidate[]
  thresholds: ScaleSnapThresholds
}>

/** Modifier key state for one pointer event. */
export type ScaleSnapModifiers = Readonly<{
  ctrlKey: boolean
  shiftKey: boolean
}>

/** Raw canonical values and mode selected by the object's manager. */
export type ScaleRawIntent = Readonly<{
  projectionMode: string
  values: readonly number[]
  modifiers: ScaleSnapModifiers
}>

/** Exact bounds and edge dependence on dimensions in the current step. */
export type ScaleStepProjectionInput = Readonly<{
  bounds: ObjectBounds
  projection: ScaleProjectionInput
}>

/** Constraints on both axes selected for one scaling step. */
export type ScaleSnapConstraints = Readonly<{
  x: PlannedScaleConstraint | null
  y: PlannedScaleConstraint | null
}>

/** Converts selected guides into constraints for the local size projection. */
export function createScaleProjectionConstraints({
  constraints
}: {
  constraints: ScaleSnapConstraints
}): readonly ScaleProjectionConstraint[] {
  const projectionConstraints = [constraints.x, constraints.y]
    .filter((constraint): constraint is PlannedScaleConstraint => constraint !== null)
    .map((constraint) => Object.freeze({
      axis: constraint.axis,
      edge: constraint.candidate.edge,
      position: constraint.expectedPosition
    }))

  return Object.freeze(projectionConstraints)
}

/** Exact projection, canonical values, and satisfied constraints after refinement. */
export type ScaleSnapPlanRefinement = Readonly<{
  constraints: ScaleSnapConstraints
  effectiveValues: readonly number[]
  stepProjection: ScaleStepProjectionInput
}>

/** How the constraint was selected in the current pointer step. */
export type ScaleSnapTransition = 'acquired' | 'held'

/** Constraint for a specific edge that the object's manager must apply once. */
export type PlannedScaleConstraint = Readonly<{
  axis: ScaleSceneAxis
  candidate: ScaleSnapCandidate
  transition: ScaleSnapTransition
  expectedPosition: number
}>

/** Immutable snapping calculation result for one resize step. */
export type ScaleSnapPlan = Readonly<{
  projectionMode: string
  projection: ScaleProjection
  variables: readonly ScaleProjectionVariable[]
  rawValues: readonly number[]
  effectiveValues: readonly number[]
  rawPositions: ProjectedScaleEdgePositions
  effectivePositions: ProjectedScaleEdgePositions
  constraints: ScaleSnapConstraints
  refinementCandidates: ScaleSnapConstraints
  proposedHoldState: ScaleHoldState
  fixedAnchor: ScaleScenePoint
  verificationEpsilon: number
}>

/** Result of the object's manager applying a constraint on one axis. */
export type ScaleDomainAxisVerdict = 'satisfied' | 'blocked'

/** Result of applying constraints and verifying immutable object properties. */
export type FinalScaleDomainVerdict = Readonly<{
  x: ScaleDomainAxisVerdict
  y: ScaleDomainAxisVerdict
  protectedState: 'preserved' | 'changed'
}>

/** Actual geometry after applying the plan exactly once. */
export type FinalScaleGeometry = Readonly<{
  bounds: ObjectBounds
  fixedAnchor: ScaleScenePoint
  measuredValues: readonly number[]
  domainVerdict: FinalScaleDomainVerdict
}>

/** Guide actually reached by the object after the plan was applied. */
export type VerifiedScaleGuide = Readonly<{
  axis: ScaleSceneAxis
  edge: ScaleSceneEdge
  position: number
  candidateId: string
  category: ScaleSnapCandidateCategory
  snapshotIndex: number
}>

/** Verification result for the applied plan without modifying the object again. */
export type ScaleSnapVerification = Readonly<{
  guides: readonly VerifiedScaleGuide[]
  blockedAxes: readonly ScaleSceneAxis[]
  holdState: ScaleHoldState
}>

/** Candidate on one axis before checking compatibility with the other axis. */
type ScaleAxisProposal = Readonly<{
  axis: ScaleSceneAxis
  candidate: ScaleSnapCandidate
  transition: ScaleSnapTransition
}>

/** Compatible constraints and their calculated canonical values. */
type ResolvedScaleProposals = Readonly<{
  x: ScaleAxisProposal | null
  y: ScaleAxisProposal | null
  solution: ScaleProjectionSolution
}>

/** Shared tolerance for checking a guide and fixed point in scene coordinates. */
export const SCALE_SNAP_VERIFICATION_EPSILON = 0.1

/** Tolerance for checking centers calculated from exact bounds. */
const EXACT_BOUNDS_CENTER_EPSILON = 0.000000001

/** Tolerance within which two offsets are considered equal. */
const SCALE_CORRECTION_COMPARISON_EPSILON = 0.000000001

/** Category order when candidates require the same offset. */
const SCALE_CANDIDATE_CATEGORY_PRIORITY: Readonly<Record<ScaleSnapCandidateCategory, number>> = Object.freeze({
  'domain-boundary': 0,
  edge: 1,
  center: 2,
  spacing: 3
})

/** Shared immutable state of an axis without snapping. */
const FREE_SCALE_AXIS_HOLD: FreeScaleAxisHold = Object.freeze({ kind: 'free' })

/** Initial state with no held guides. */
export const FREE_SCALE_HOLD_STATE: ScaleHoldState = Object.freeze({
  x: FREE_SCALE_AXIS_HOLD,
  y: FREE_SCALE_AXIS_HOLD
})

/**
 * Validates and captures geometry, scale modes, candidates, and thresholds at the start of the gesture.
 */
export function createScaleGestureBaseline({
  t = english,
  bounds,
  fixedAnchor,
  projectionModes,
  candidates,
  zoom
}: ScaleGestureBaselineInput): ScaleGestureBaseline {
  const exactBounds = createExactBoundsSnapshot({ t, bounds })
  const anchorSnapshot = createScenePointSnapshot({
    t,
    point: fixedAnchor,
    name: t('snapping.scale.pointLabels.fixedAnchor')
  })
  const modeSnapshot = createProjectionModeSnapshot({ t, bounds: exactBounds, projectionModes })
  const candidateSnapshot = createCandidateSnapshot({ t, candidates, projectionModes: modeSnapshot })

  return Object.freeze({
    bounds: exactBounds,
    fixedAnchor: anchorSnapshot,
    projectionModes: modeSnapshot,
    candidates: candidateSnapshot,
    thresholds: createScaleSnapThresholds({ t, zoom })
  })
}

/**
 * Calculates a new snapping plan or continues holding the selected guides.
 */
export function resolveScaleSnapPlan({
  t = english,
  baseline,
  intent,
  holdState,
  stepProjection
}: {
  t?: Translate
  baseline: ScaleGestureBaseline
  intent: ScaleRawIntent
  holdState: ScaleHoldState
  stepProjection?: ScaleStepProjectionInput
}): ScaleSnapPlan {
  const baselineMode = resolveProjectionMode({ t, baseline, modeId: intent.projectionMode })
  const projectionMode = resolveStepProjectionMode({ t, baselineMode, stepProjection })
  assertScaleRawIntent({ t, projection: projectionMode.projection, intent })
  assertScaleHoldState({ t, baseline, holdState })

  const rawValues = Object.freeze([...intent.values])
  const rawPositions = projectScaleEdgePositions({ t, projection: projectionMode.projection, values: rawValues })
  if (intent.modifiers.ctrlKey) {
    return createScaleSnapPlan({
      t,
      baseline,
      projectionMode,
      rawValues,
      rawPositions,
      proposals: Object.freeze({ x: null, y: null }),
      resolved: null
    })
  }

  const axisProposalContext = { baseline, projectionMode, rawPositions, rawValues }
  const x = resolveAxisProposal({ t, ...axisProposalContext, axis: 'x', hold: holdState.x })
  const y = resolveAxisProposal({ t, ...axisProposalContext, axis: 'y', hold: holdState.y })
  const resolved = resolveCompatibleProposals({
    t,
    baseline,
    projectionMode,
    rawValues,
    x,
    y
  })

  return createScaleSnapPlan({
    t,
    baseline,
    projectionMode,
    rawValues,
    rawPositions,
    proposals: Object.freeze({ x, y }),
    resolved
  })
}

/**
 * Refines values and applicable constraints using the object's actual geometry.
 * The original pointer position and candidates available for refinement remain unchanged.
 */
export function refineScaleSnapPlan({
  t = english,
  plan,
  refinement
}: {
  t?: Translate
  plan: ScaleSnapPlan
  refinement: ScaleSnapPlanRefinement
}): ScaleSnapPlan {
  const projectionMode = resolveStepProjectionMode({
    t,
    baselineMode: Object.freeze({ id: plan.projectionMode, projection: plan.projection }),
    stepProjection: refinement.stepProjection
  })
  const effectiveValues = Object.freeze([...refinement.effectiveValues])
  assertScaleValues({ t, projection: projectionMode.projection, values: effectiveValues })
  const constraints = createRefinedScaleConstraints({
    t,
    candidates: plan.refinementCandidates,
    constraints: refinement.constraints
  })

  const effectivePositions = projectScaleEdgePositions({
    t,
    projection: projectionMode.projection,
    values: effectiveValues
  })
  assertRefinedConstraintsReached({
    t,
    bounds: refinement.stepProjection.bounds,
    constraints,
    effectivePositions,
    verificationEpsilon: plan.verificationEpsilon
  })

  return Object.freeze({
    ...plan,
    projection: projectionMode.projection,
    variables: projectionMode.projection.variables,
    effectiveValues,
    effectivePositions,
    constraints,
    proposedHoldState: createHoldStateFromConstraints(constraints)
  })
}

/**
 * Uses the original gesture projection or an exact local model of the current step.
 */
function resolveStepProjectionMode({
  t = english,
  baselineMode,
  stepProjection
}: {
  t?: Translate
  baselineMode: ScaleProjectionMode
  stepProjection?: ScaleStepProjectionInput
}): ScaleProjectionMode {
  if (!stepProjection) return baselineMode

  const bounds = createExactBoundsSnapshot({ t, bounds: stepProjection.bounds })
  const projection = createScaleProjection({ t, bounds, input: stepProjection.projection })
  assertStepProjectionContract({ t, baseline: baselineMode.projection, step: projection })

  return Object.freeze({ id: baselineMode.id, projection })
}

/** Checks that the local projection preserves the gesture's parameters and moving edges. */
function assertStepProjectionContract({
  t = english,
  baseline,
  step
}: {
  t?: Translate
  baseline: ScaleProjection
  step: ScaleProjection
}): void {
  const hasSameVariables = baseline.variables.length === step.variables.length
    && baseline.variables.every((variable, index) => variable === step.variables[index])
  if (!hasSameVariables) {
    throw new Error(t('snapping.scale.stepProjection.variablesMustBePreserved'))
  }

  const baselineEdges = baseline.edges.map(({ edge }) => edge).sort()
  const stepEdges = step.edges.map(({ edge }) => edge).sort()
  const hasSameEdges = baselineEdges.length === stepEdges.length
    && baselineEdges.every((edge, index) => edge === stepEdges[index])
  if (!hasSameEdges) {
    throw new Error(t('snapping.scale.stepProjection.edgesMustBePreserved'))
  }
}

/**
 * Verifies the plan against actual geometry and the object's manager application result.
 */
export function verifyScaleSnapPlan({
  t = english,
  plan,
  finalGeometry
}: {
  t?: Translate
  plan: ScaleSnapPlan
  finalGeometry: FinalScaleGeometry
}): ScaleSnapVerification {
  const { measuredValues, domainVerdict } = finalGeometry
  const bounds = createExactBoundsSnapshot({ t, bounds: finalGeometry.bounds })
  const fixedAnchor = createScenePointSnapshot({
    t,
    point: finalGeometry.fixedAnchor,
    name: t('snapping.scale.pointLabels.finalFixedAnchor')
  })
  const fixedAnchorMatches = areScenePointsNear({
    first: plan.fixedAnchor,
    second: fixedAnchor,
    epsilon: plan.verificationEpsilon
  })
  const measuredPositions = projectMeasuredScalePositions({ t, plan, measuredValues })
  const commonStateMatches = fixedAnchorMatches
    && domainVerdict.protectedState === 'preserved'

  const xVerified = commonStateMatches
    && domainVerdict.x === 'satisfied'
    && isMeasuredConstraintEquivalent({ constraint: plan.constraints.x, measuredPositions, plan })
    && isConstraintReached({ constraint: plan.constraints.x, bounds, plan })
  const yVerified = commonStateMatches
    && domainVerdict.y === 'satisfied'
    && isMeasuredConstraintEquivalent({ constraint: plan.constraints.y, measuredPositions, plan })
    && isConstraintReached({ constraint: plan.constraints.y, bounds, plan })

  return createScaleSnapVerification({ plan, xVerified, yVerified })
}

/**
 * Converts thresholds from screen pixels to scene coordinates, accounting for zoom.
 */
function createScaleSnapThresholds({ t = english, zoom }: { t?: Translate; zoom: number }): ScaleSnapThresholds {
  if (!Number.isFinite(zoom) || zoom <= 0) {
    throw new Error(t('snapping.scale.zoomMustBePositiveFinite'))
  }

  return Object.freeze({
    acquire: SNAP_THRESHOLD / zoom,
    release: SNAP_THRESHOLD / zoom,
    spacingRelease: (SNAP_THRESHOLD + SPACING_SNAP_HOLD_MARGIN) / zoom,
    verification: SCALE_SNAP_VERIFICATION_EPSILON
  })
}

/**
 * Validates and copies exact bounds without rounding.
 */
function createExactBoundsSnapshot({ t = english, bounds }: { t?: Translate; bounds: ObjectBounds }): ObjectBounds {
  const { left, right, top, bottom, centerX, centerY } = bounds
  const edges = [left, right, top, bottom]
  if (!edges.every(Number.isFinite) || right < left || bottom < top) {
    throw new Error(t('snapping.scale.bounds.edgesMustBeFiniteAndOrdered'))
  }
  if (!Number.isFinite(centerX) || !Number.isFinite(centerY)) {
    throw new Error(t('snapping.scale.bounds.centersMustBeFinite'))
  }

  const expectedCenterX = left + ((right - left) / 2)
  const expectedCenterY = top + ((bottom - top) / 2)
  if (Math.abs(centerX - expectedCenterX) > EXACT_BOUNDS_CENTER_EPSILON
    || Math.abs(centerY - expectedCenterY) > EXACT_BOUNDS_CENTER_EPSILON) {
    throw new Error(t('snapping.scale.bounds.centersMustMatchEdges'))
  }

  return Object.freeze({ left, right, top, bottom, centerX, centerY })
}

/**
 * Validates and copies a point in scene coordinates.
 */
function createScenePointSnapshot({
  t = english,
  point,
  name
}: {
  t?: Translate
  point: ScaleScenePoint
  name: string
}): ScaleScenePoint {
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    throw new Error(t('snapping.scale.point.coordinatesMustBeFinite', { name }))
  }

  return Object.freeze({ x: point.x, y: point.y })
}

/**
 * Validates and captures all available resizing modes.
 */
function createProjectionModeSnapshot({
  t = english,
  bounds,
  projectionModes
}: {
  t?: Translate
  bounds: ObjectBounds
  projectionModes: readonly ScaleProjectionModeInput[]
}): readonly ScaleProjectionMode[] {
  if (projectionModes.length === 0) {
    throw new Error(t('snapping.scale.gestureBaseline.projectionModeRequired'))
  }

  const modeIds = new Set<string>()
  const snapshot = projectionModes.map(({ id, projection }) => {
    if (id.trim().length === 0 || modeIds.has(id)) {
      throw new Error(t('snapping.scale.projectionMode.idMustBeUniqueAndNonEmpty', { id }))
    }
    modeIds.add(id)

    return Object.freeze({ id, projection: createScaleProjection({ t, bounds, input: projection }) })
  })

  return Object.freeze(snapshot)
}

/**
 * Returns the mode selected by the object's manager for the current pointer event.
 */
function resolveProjectionMode({
  t = english,
  baseline,
  modeId
}: {
  t?: Translate
  baseline: ScaleGestureBaseline
  modeId: string
}): ScaleProjectionMode {
  const projectionMode = baseline.projectionModes.find(({ id }) => id === modeId)
  if (!projectionMode) {
    throw new Error(t('snapping.scale.projectionMode.unknown', { modeId }))
  }

  return projectionMode
}

/**
 * Validates candidates and preserves their original order for the duration of the gesture.
 */
function createCandidateSnapshot({
  t = english,
  candidates,
  projectionModes
}: {
  t?: Translate
  candidates: readonly ScaleSnapCandidateInput[]
  projectionModes: readonly ScaleProjectionMode[]
}): readonly ScaleSnapCandidate[] {
  const candidateIds = new Set<string>()
  const snapshot = candidates.map((candidate, snapshotIndex) => {
    assertScaleCandidate({ t, candidate, projectionModes, candidateIds })
    candidateIds.add(candidate.id)

    return Object.freeze({ ...candidate, snapshotIndex })
  })

  return Object.freeze(snapshot)
}

/**
 * Checks the candidate's identifier, axis, and support by at least one mode.
 */
function assertScaleCandidate({
  t = english,
  candidate,
  projectionModes,
  candidateIds
}: {
  t?: Translate
  candidate: ScaleSnapCandidateInput
  projectionModes: readonly ScaleProjectionMode[]
  candidateIds: ReadonlySet<string>
}): void {
  if (candidate.id.trim().length === 0 || candidateIds.has(candidate.id)) {
    throw new Error(t('snapping.scale.candidate.idMustBeUniqueAndNonEmpty', { candidateId: candidate.id }))
  }
  if (!Number.isFinite(candidate.position)) {
    throw new Error(t('snapping.scale.candidate.positionMustBeFinite', { candidateId: candidate.id }))
  }
  if (resolveScaleSceneEdgeAxis({ edge: candidate.edge }) !== candidate.axis) {
    throw new Error(t('snapping.scale.candidate.edgeAxisMismatch', { candidateId: candidate.id, axis: candidate.axis }))
  }

  const isSupported = projectionModes.some(({ projection }) => {
    return Boolean(getScaleProjectionEdge({ projection, edge: candidate.edge }))
  })
  if (!isSupported) {
    throw new Error(t('snapping.scale.candidate.edgeMustMove', { candidateId: candidate.id }))
  }
}

/**
 * Validates raw canonical values for the selected mode.
 */
function assertScaleRawIntent({
  t = english,
  projection,
  intent
}: {
  t?: Translate
  projection: ScaleProjection
  intent: ScaleRawIntent
}): void {
  if (intent.values.length !== projection.variables.length) {
    throw new Error(t('snapping.scale.rawIntent.invalidValueCount'))
  }
  if (!intent.values.every(Number.isFinite)) {
    throw new Error(t('snapping.scale.rawIntent.valuesMustBeFinite'))
  }
  if (typeof intent.modifiers.ctrlKey !== 'boolean' || typeof intent.modifiers.shiftKey !== 'boolean') {
    throw new Error(t('snapping.scale.rawIntent.modifiersMustBeBoolean'))
  }
}

/** Validates canonical values of the refined projection. */
function assertScaleValues({
  t = english,
  projection,
  values
}: {
  t?: Translate
  projection: ScaleProjection
  values: readonly number[]
}): void {
  if (values.length !== projection.variables.length) {
    throw new Error(t('snapping.scale.refinement.invalidValueCount'))
  }
  if (!values.every(Number.isFinite)) {
    throw new Error(t('snapping.scale.refinement.valuesMustBeFinite'))
  }
}

/** Checks that the refined plan's exact geometry satisfies the original constraints. */
function assertRefinedConstraintsReached({
  t = english,
  bounds,
  constraints,
  effectivePositions,
  verificationEpsilon
}: {
  t?: Translate
  bounds: ObjectBounds
  constraints: ScaleSnapConstraints
  effectivePositions: ProjectedScaleEdgePositions
  verificationEpsilon: number
}): void {
  for (const constraint of [constraints.x, constraints.y]) {
    if (!constraint) continue

    const { edge } = constraint.candidate
    const projectedPosition = effectivePositions[edge]
    const exactPosition = bounds[edge]
    if (projectedPosition === null
      || Math.abs(projectedPosition - constraint.expectedPosition) > verificationEpsilon
      || Math.abs(exactPosition - constraint.expectedPosition) > verificationEpsilon) {
      throw new Error(t('snapping.scale.refinement.constraintNotReached', { edge }))
    }
  }
}

/** Validates selected constraints and creates an immutable snapshot of them. */
function createRefinedScaleConstraints({
  t = english,
  candidates,
  constraints
}: {
  t?: Translate
  candidates: ScaleSnapConstraints
  constraints: ScaleSnapConstraints
}): ScaleSnapConstraints {
  return Object.freeze({
    x: resolveRefinedScaleConstraint({ t, axis: 'x', candidate: candidates.x, constraint: constraints.x }),
    y: resolveRefinedScaleConstraint({ t, axis: 'y', candidate: candidates.y, constraint: constraints.y })
  })
}

/** Validates a selected constraint and returns its snapshot from the original plan. */
function resolveRefinedScaleConstraint({
  t = english,
  axis,
  candidate,
  constraint
}: {
  t?: Translate
  axis: ScaleSceneAxis
  candidate: PlannedScaleConstraint | null
  constraint: PlannedScaleConstraint | null
}): PlannedScaleConstraint | null {
  if (!constraint) return null
  if (!candidate || !arePlannedScaleConstraintsEqual({ first: candidate, second: constraint })) {
    throw new Error(t('snapping.scale.refinement.constraintNotInCandidates', { axis }))
  }

  return candidate
}

/**
 * Checks that the held candidate belongs to the current gesture.
 */
function assertScaleHoldState({
  t = english,
  baseline,
  holdState
}: {
  t?: Translate
  baseline: ScaleGestureBaseline
  holdState: ScaleHoldState
}): void {
  for (const axis of ['x', 'y'] as const) {
    const axisHold = holdState[axis]
    if (axisHold.kind === 'free') continue
    if (axisHold.candidate.axis !== axis) {
      throw new Error(t('snapping.scale.hold.candidateAxisMismatch', { candidateAxis: axisHold.candidate.axis, axis }))
    }

    const baselineCandidate = baseline.candidates[axisHold.candidate.snapshotIndex]
    if (!baselineCandidate || !areScaleCandidatesEqual({ first: baselineCandidate, second: axisHold.candidate })) {
      throw new Error(t('snapping.scale.hold.candidateNotInBaseline', { candidateId: axisHold.candidate.id }))
    }
  }
}

/**
 * Preserves a held guide or selects a new candidate on one axis.
 */
function resolveAxisProposal({
  t = english,
  axis,
  baseline,
  projectionMode,
  rawPositions,
  rawValues,
  hold
}: {
  t?: Translate
  axis: ScaleSceneAxis
  baseline: ScaleGestureBaseline
  projectionMode: ScaleProjectionMode
  rawPositions: ProjectedScaleEdgePositions
  rawValues: readonly number[]
  hold: ScaleAxisHold
}): ScaleAxisProposal | null {
  if (hold.kind === 'held') {
    const rawPosition = rawPositions[hold.candidate.edge]
    const releaseThreshold = hold.candidate.category === 'spacing'
      ? baseline.thresholds.spacingRelease
      : baseline.thresholds.release
    if (rawPosition !== null
      && Math.abs(rawPosition - hold.candidate.position) <= releaseThreshold
      && canProjectScaleCandidate({ t, baseline, candidate: hold.candidate, projectionMode, rawValues })) {
      return Object.freeze({ axis, candidate: hold.candidate, transition: 'held' })
    }
  }

  const candidate = findBestScaleCandidate({
    t,
    axis,
    baseline,
    projectionMode,
    rawPositions,
    rawValues
  })
  if (!candidate) return null

  return Object.freeze({ axis, candidate, transition: 'acquired' })
}

/**
 * Selects the nearest candidate, accounting for category and original order.
 */
function findBestScaleCandidate({
  t = english,
  axis,
  baseline,
  projectionMode,
  rawPositions,
  rawValues
}: {
  t?: Translate
  axis: ScaleSceneAxis
  baseline: ScaleGestureBaseline
  projectionMode: ScaleProjectionMode
  rawPositions: ProjectedScaleEdgePositions
  rawValues: readonly number[]
}): ScaleSnapCandidate | null {
  let bestCandidate: ScaleSnapCandidate | null = null
  let bestDistance = Number.POSITIVE_INFINITY

  for (const candidate of baseline.candidates) {
    if (candidate.axis !== axis) continue
    if (!getScaleProjectionEdge({ projection: projectionMode.projection, edge: candidate.edge })) continue

    const rawPosition = rawPositions[candidate.edge]
    if (rawPosition === null) continue
    const distance = Math.abs(candidate.position - rawPosition)
    if (distance > baseline.thresholds.acquire) continue
    if (!canProjectScaleCandidate({ t, baseline, candidate, projectionMode, rawValues })) continue
    if (isScaleCandidatePreferred({ candidate, distance, bestCandidate, bestDistance })) {
      bestCandidate = candidate
      bestDistance = distance
    }
  }

  return bestCandidate
}

/** Checks whether the candidate's constraint can be satisfied in the step's local projection. */
function canProjectScaleCandidate({
  t = english,
  baseline,
  candidate,
  projectionMode,
  rawValues
}: {
  t?: Translate
  baseline: ScaleGestureBaseline
  candidate: ScaleSnapCandidate
  projectionMode: ScaleProjectionMode
  rawValues: readonly number[]
}): boolean {
  return resolveScaleProjection({
    t,
    projection: projectionMode.projection,
    rawValues,
    constraints: [{
      axis: candidate.axis,
      edge: candidate.edge,
      position: candidate.position
    }],
    epsilon: baseline.thresholds.verification
  }) !== null
}

/**
 * Compares candidates by distance, category, and original order.
 */
function isScaleCandidatePreferred({
  candidate,
  distance,
  bestCandidate,
  bestDistance
}: {
  candidate: ScaleSnapCandidate
  distance: number
  bestCandidate: ScaleSnapCandidate | null
  bestDistance: number
}): boolean {
  if (!bestCandidate) return true

  const distanceDifference = distance - bestDistance
  if (distanceDifference < -SCALE_CORRECTION_COMPARISON_EPSILON) return true
  if (distanceDifference > SCALE_CORRECTION_COMPARISON_EPSILON) return false

  const categoryPriority = SCALE_CANDIDATE_CATEGORY_PRIORITY[candidate.category]
  const bestCategoryPriority = SCALE_CANDIDATE_CATEGORY_PRIORITY[bestCandidate.category]
  if (categoryPriority !== bestCategoryPriority) return categoryPriority < bestCategoryPriority

  return candidate.snapshotIndex < bestCandidate.snapshotIndex
}

/**
 * Combines constraints on both axes or keeps one priority constraint.
 */
function resolveCompatibleProposals({
  t = english,
  baseline,
  projectionMode,
  rawValues,
  x,
  y
}: {
  t?: Translate
  baseline: ScaleGestureBaseline
  projectionMode: ScaleProjectionMode
  rawValues: readonly number[]
  x: ScaleAxisProposal | null
  y: ScaleAxisProposal | null
}): ResolvedScaleProposals {
  const orderedProposals = orderScaleProposals({ t, projectionMode, rawValues, x, y })
  const constraints = orderedProposals.map(createProjectionConstraint)
  const solution = resolveScaleProjection({
    t,
    projection: projectionMode.projection,
    rawValues,
    constraints,
    epsilon: baseline.thresholds.verification
  })

  if (solution) return Object.freeze({ x, y, solution })
  const [preferred] = orderedProposals
  if (!preferred) {
    throw new Error(t('snapping.scale.rawIntent.projectionSolutionRequired'))
  }

  const preferredSolution = resolveScaleProjection({
    t,
    projection: projectionMode.projection,
    rawValues,
    constraints: [createProjectionConstraint(preferred)],
    epsilon: baseline.thresholds.verification
  })
  if (!preferredSolution) {
    throw new Error(t('snapping.scale.constraint.projectionSolutionRequired', { edge: preferred.candidate.edge }))
  }

  return Object.freeze({
    x: preferred.axis === 'x' ? preferred : null,
    y: preferred.axis === 'y' ? preferred : null,
    solution: preferredSolution
  })
}

/**
 * Prioritizes the held constraint, then the smaller offset, then the X axis.
 */
function orderScaleProposals({
  t = english,
  projectionMode,
  rawValues,
  x,
  y
}: {
  t?: Translate
  projectionMode: ScaleProjectionMode
  rawValues: readonly number[]
  x: ScaleAxisProposal | null
  y: ScaleAxisProposal | null
}): readonly ScaleAxisProposal[] {
  const proposals: ScaleAxisProposal[] = []
  if (x) proposals.push(x)
  if (y) proposals.push(y)
  if (!x || !y) return Object.freeze(proposals)

  const preferred = selectPrimaryScaleProposal({ t, projectionMode, rawValues, x, y })
  return preferred.axis === 'x' ? Object.freeze([x, y]) : Object.freeze([y, x])
}

/**
 * Selects a single constraint if two constraints cannot be applied together.
 */
function selectPrimaryScaleProposal({
  t = english,
  projectionMode,
  rawValues,
  x,
  y
}: {
  t?: Translate
  projectionMode: ScaleProjectionMode
  rawValues: readonly number[]
  x: ScaleAxisProposal
  y: ScaleAxisProposal
}): ScaleAxisProposal {
  if (x.transition !== y.transition) return x.transition === 'held' ? x : y

  const xMagnitude = getProposalCorrectionMagnitude({ t, projectionMode, rawValues, proposal: x })
  const yMagnitude = getProposalCorrectionMagnitude({ t, projectionMode, rawValues, proposal: y })
  const magnitudeDifference = xMagnitude - yMagnitude
  if (magnitudeDifference < -SCALE_CORRECTION_COMPARISON_EPSILON) return x
  if (magnitudeDifference > SCALE_CORRECTION_COMPARISON_EPSILON) return y

  return x
}

/**
 * Returns the scale change required for one constraint.
 */
function getProposalCorrectionMagnitude({
  t = english,
  projectionMode,
  rawValues,
  proposal
}: {
  t?: Translate
  projectionMode: ScaleProjectionMode
  rawValues: readonly number[]
  proposal: ScaleAxisProposal
}): number {
  return getScaleProjectionCorrectionMagnitude({
    t,
    projection: projectionMode.projection,
    rawValues,
    constraint: createProjectionConstraint(proposal)
  })
}

/**
 * Converts the selected candidate to a constraint for a specific edge.
 */
function createProjectionConstraint(proposal: ScaleAxisProposal): ScaleProjectionConstraint {
  return Object.freeze({
    axis: proposal.axis,
    edge: proposal.candidate.edge,
    position: proposal.candidate.position
  })
}

/**
 * Builds a plan with snapping or with the original unsnapped values.
 */
function createScaleSnapPlan({
  t = english,
  baseline,
  projectionMode,
  rawValues,
  rawPositions,
  proposals,
  resolved
}: {
  t?: Translate
  baseline: ScaleGestureBaseline
  projectionMode: ScaleProjectionMode
  rawValues: readonly number[]
  rawPositions: ProjectedScaleEdgePositions
  proposals: Readonly<{
    x: ScaleAxisProposal | null
    y: ScaleAxisProposal | null
  }>
  resolved: ResolvedScaleProposals | null
}): ScaleSnapPlan {
  const effectiveValues = resolved ? resolved.solution.values : rawValues
  const effectivePositions = resolved ? resolved.solution.positions : rawPositions
  const constraints = createPlannedScaleConstraints({ x: resolved?.x ?? null, y: resolved?.y ?? null })
  const refinementCandidates = createPlannedScaleConstraints(proposals)
  assertEffectiveConstraintsReached({
    t,
    constraints,
    effectivePositions,
    verificationEpsilon: baseline.thresholds.verification
  })

  return Object.freeze({
    projectionMode: projectionMode.id,
    projection: projectionMode.projection,
    variables: projectionMode.projection.variables,
    rawValues,
    effectiveValues,
    rawPositions,
    effectivePositions,
    constraints,
    refinementCandidates,
    proposedHoldState: createHoldStateFromConstraints(constraints),
    fixedAnchor: baseline.fixedAnchor,
    verificationEpsilon: baseline.thresholds.verification
  })
}

/** Converts axis proposals to immutable plan constraints. */
function createPlannedScaleConstraints({
  x,
  y
}: {
  x: ScaleAxisProposal | null
  y: ScaleAxisProposal | null
}): ScaleSnapConstraints {
  return Object.freeze({
    x: x ? createPlannedConstraint(x) : null,
    y: y ? createPlannedConstraint(y) : null
  })
}

/** Checks that applicable constraints match the calculated edges. */
function assertEffectiveConstraintsReached({
  t = english,
  constraints,
  effectivePositions,
  verificationEpsilon
}: {
  t?: Translate
  constraints: ScaleSnapConstraints
  effectivePositions: ProjectedScaleEdgePositions
  verificationEpsilon: number
}): void {
  for (const constraint of [constraints.x, constraints.y]) {
    if (!constraint) continue

    const position = effectivePositions[constraint.candidate.edge]
    if (position === null || Math.abs(position - constraint.expectedPosition) > verificationEpsilon) {
      throw new Error(t('snapping.scale.plan.constraintNotReached', { edge: constraint.candidate.edge }))
    }
  }
}

/**
 * Stores the selected constraint in the plan.
 */
function createPlannedConstraint(proposal: ScaleAxisProposal): PlannedScaleConstraint {
  return Object.freeze({
    axis: proposal.axis,
    candidate: proposal.candidate,
    transition: proposal.transition,
    expectedPosition: proposal.candidate.position
  })
}

/**
 * Preserves only compatible constraints for the next step.
 */
function createHoldStateFromConstraints({
  x,
  y
}: ScaleSnapConstraints): ScaleHoldState {
  return Object.freeze({
    x: createAxisHold({ constraint: x }),
    y: createAxisHold({ constraint: y })
  })
}

/**
 * Creates an immutable state for one axis.
 */
function createAxisHold({ constraint }: { constraint: PlannedScaleConstraint | null }): ScaleAxisHold {
  if (!constraint) return FREE_SCALE_AXIS_HOLD

  return Object.freeze({ kind: 'held', candidate: constraint.candidate })
}

/**
 * Checks the final exact bounds to verify that the object reached the guide.
 */
function isConstraintReached({
  constraint,
  bounds,
  plan
}: {
  constraint: PlannedScaleConstraint | null
  bounds: ObjectBounds
  plan: ScaleSnapPlan
}): boolean {
  if (!constraint) return false

  const finalPosition = bounds[constraint.candidate.edge]
  return Math.abs(finalPosition - constraint.expectedPosition) <= plan.verificationEpsilon
}

/**
 * Calculates edge positions for the scale values actually applied.
 */
function projectMeasuredScalePositions({
  t = english,
  plan,
  measuredValues
}: {
  t?: Translate
  plan: ScaleSnapPlan
  measuredValues: readonly number[]
}): ProjectedScaleEdgePositions | null {
  if (measuredValues.length !== plan.projection.variables.length) return null
  if (!measuredValues.every(Number.isFinite)) return null

  return projectScaleEdgePositions({
    t,
    projection: plan.projection,
    values: measuredValues
  })
}

/**
 * Checks the actual position only of the edge on which the constraint depends.
 */
function isMeasuredConstraintEquivalent({
  constraint,
  measuredPositions,
  plan
}: {
  constraint: PlannedScaleConstraint | null
  measuredPositions: ProjectedScaleEdgePositions | null
  plan: ScaleSnapPlan
}): boolean {
  if (!constraint || !measuredPositions) return false

  const { edge } = constraint.candidate
  const measuredPosition = measuredPositions[edge]
  const effectivePosition = plan.effectivePositions[edge]
  if (measuredPosition === null || effectivePosition === null) return false

  return Math.abs(measuredPosition - effectivePosition) <= plan.verificationEpsilon
}

/**
 * Builds verified guides, blocked axes, and the new hold state.
 */
function createScaleSnapVerification({
  plan,
  xVerified,
  yVerified
}: {
  plan: ScaleSnapPlan
  xVerified: boolean
  yVerified: boolean
}): ScaleSnapVerification {
  const guides: VerifiedScaleGuide[] = []
  const blockedAxes: ScaleSceneAxis[] = []
  const x = resolveVerifiedAxisHold({ constraint: plan.constraints.x, verified: xVerified, guides, blockedAxes })
  const y = resolveVerifiedAxisHold({ constraint: plan.constraints.y, verified: yVerified, guides, blockedAxes })

  return Object.freeze({
    guides: Object.freeze(guides),
    blockedAxes: Object.freeze(blockedAxes),
    holdState: Object.freeze({ x, y })
  })
}

/**
 * Preserves an axis hold only for a satisfied constraint.
 */
function resolveVerifiedAxisHold({
  constraint,
  verified,
  guides,
  blockedAxes
}: {
  constraint: PlannedScaleConstraint | null
  verified: boolean
  guides: VerifiedScaleGuide[]
  blockedAxes: ScaleSceneAxis[]
}): ScaleAxisHold {
  if (!constraint) return FREE_SCALE_AXIS_HOLD
  if (!verified) {
    blockedAxes.push(constraint.axis)
    return FREE_SCALE_AXIS_HOLD
  }

  guides.push(createVerifiedGuide(constraint))
  return Object.freeze({ kind: 'held', candidate: constraint.candidate })
}

/**
 * Creates a verified guide with the original candidate's identifier.
 */
function createVerifiedGuide(constraint: PlannedScaleConstraint): VerifiedScaleGuide {
  const { candidate } = constraint

  return Object.freeze({
    axis: constraint.axis,
    edge: candidate.edge,
    position: candidate.position,
    candidateId: candidate.id,
    category: candidate.category,
    snapshotIndex: candidate.snapshotIndex
  })
}

/**
 * Checks whether two points coincide within the shared tolerance.
 */
function areScenePointsNear({
  first,
  second,
  epsilon
}: {
  first: ScaleScenePoint
  second: ScaleScenePoint
  epsilon: number
}): boolean {
  return Math.abs(first.x - second.x) <= epsilon
    && Math.abs(first.y - second.y) <= epsilon
}

/**
 * Checks whether two captured candidates match exactly.
 */
function areScaleCandidatesEqual({
  first,
  second
}: {
  first: ScaleSnapCandidate
  second: ScaleSnapCandidate
}): boolean {
  return first.id === second.id
    && first.axis === second.axis
    && first.edge === second.edge
    && first.position === second.position
    && first.category === second.category
    && first.snapshotIndex === second.snapshotIndex
}

/** Checks whether constraints for the same candidate match exactly. */
function arePlannedScaleConstraintsEqual({
  first,
  second
}: {
  first: PlannedScaleConstraint
  second: PlannedScaleConstraint
}): boolean {
  return first.axis === second.axis
    && first.transition === second.transition
    && first.expectedPosition === second.expectedPosition
    && areScaleCandidatesEqual({ first: first.candidate, second: second.candidate })
}
