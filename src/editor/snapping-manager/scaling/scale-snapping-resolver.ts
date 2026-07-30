/* eslint-disable no-use-before-define -- экспортируемые функции объявлены перед внутренними расчётами. */
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

/** Категория направляющей, участвующая в выборе между равными кандидатами. */
export type ScaleSnapCandidateCategory = 'domain-boundary' | 'edge' | 'center' | 'spacing'

/** Точка в координатах сцены, не зависящая от Fabric Point. */
export type ScaleScenePoint = Readonly<{
  x: number
  y: number
}>

/** Именованный режим изменения размера до проверки исходных данных жеста. */
export type ScaleProjectionModeInput = Readonly<{
  id: string
  projection: ScaleProjectionInput
}>

/** Проверенный режим изменения размера для одного жеста. */
export type ScaleProjectionMode = Readonly<{
  id: string
  projection: ScaleProjection
}>

/** Кандидат прилипания до сохранения исходного состояния жеста. */
export type ScaleSnapCandidateInput = Readonly<{
  id: string
  axis: ScaleSceneAxis
  edge: ScaleSceneEdge
  position: number
  category: ScaleSnapCandidateCategory
}>

/** Кандидат для конкретной движущейся грани, зафиксированный на время жеста. */
export type ScaleSnapCandidate = Readonly<{
  id: string
  axis: ScaleSceneAxis
  edge: ScaleSceneEdge
  position: number
  category: ScaleSnapCandidateCategory
  snapshotIndex: number
}>

/** Состояние оси без удерживаемой направляющей. */
export type FreeScaleAxisHold = Readonly<{
  kind: 'free'
}>

/** Удержание конкретной направляющей по одной оси. */
export type HeldScaleAxisHold = Readonly<{
  kind: 'held'
  candidate: ScaleSnapCandidate
}>

/** Свободное или удерживаемое состояние одной оси. */
export type ScaleAxisHold = FreeScaleAxisHold | HeldScaleAxisHold

/** Независимое временное состояние прилипания по двум осям. */
export type ScaleHoldState = Readonly<{
  x: ScaleAxisHold
  y: ScaleAxisHold
}>

/** Пороги прилипания в координатах сцены с учётом zoom. */
export type ScaleSnapThresholds = Readonly<{
  acquire: number
  release: number
  spacingRelease: number
  verification: number
}>

/** Исходная геометрия жеста и доступные режимы изменения размера. */
export type ScaleGestureBaselineInput = Readonly<{
  bounds: ObjectBounds
  fixedAnchor: ScaleScenePoint
  projectionModes: readonly ScaleProjectionModeInput[]
  candidates: readonly ScaleSnapCandidateInput[]
  zoom: number
}>

/** Проверенный снимок состояния в начале жеста. */
export type ScaleGestureBaseline = Readonly<{
  bounds: ObjectBounds
  fixedAnchor: ScaleScenePoint
  projectionModes: readonly ScaleProjectionMode[]
  candidates: readonly ScaleSnapCandidate[]
  thresholds: ScaleSnapThresholds
}>

/** Состояние клавиш-модификаторов для одного события указателя. */
export type ScaleSnapModifiers = Readonly<{
  ctrlKey: boolean
  shiftKey: boolean
}>

/** Исходные значения scale и режим, выбранный менеджером объекта. */
export type ScaleRawIntent = Readonly<{
  projectionMode: string
  values: readonly number[]
  modifiers: ScaleSnapModifiers
}>

/** Способ выбора ограничения на текущем шаге указателя. */
export type ScaleSnapTransition = 'acquired' | 'held'

/** Ограничение для конкретной грани, которое менеджер объекта должен применить один раз. */
export type PlannedScaleConstraint = Readonly<{
  axis: ScaleSceneAxis
  candidate: ScaleSnapCandidate
  transition: ScaleSnapTransition
  expectedPosition: number
}>

/** Неизменяемый результат расчёта прилипания для одного шага scale. */
export type ScaleSnapPlan = Readonly<{
  projectionMode: string
  projection: ScaleProjection
  variables: readonly ScaleProjectionVariable[]
  rawValues: readonly number[]
  effectiveValues: readonly number[]
  rawPositions: ProjectedScaleEdgePositions
  effectivePositions: ProjectedScaleEdgePositions
  constraints: Readonly<{
    x: PlannedScaleConstraint | null
    y: PlannedScaleConstraint | null
  }>
  proposedHoldState: ScaleHoldState
  fixedAnchor: ScaleScenePoint
  verificationEpsilon: number
}>

/** Результат применения ограничения по одной оси менеджером объекта. */
export type ScaleDomainAxisVerdict = 'satisfied' | 'blocked'

/** Результат применения ограничений и проверки неизменяемых свойств объекта. */
export type FinalScaleDomainVerdict = Readonly<{
  x: ScaleDomainAxisVerdict
  y: ScaleDomainAxisVerdict
  protectedState: 'preserved' | 'changed'
}>

/** Фактическая геометрия после однократного применения плана. */
export type FinalScaleGeometry = Readonly<{
  bounds: ObjectBounds
  fixedAnchor: ScaleScenePoint
  measuredValues: readonly number[]
  domainVerdict: FinalScaleDomainVerdict
}>

/** Направляющая, которой объект действительно достиг после применения плана. */
export type VerifiedScaleGuide = Readonly<{
  axis: ScaleSceneAxis
  edge: ScaleSceneEdge
  position: number
  candidateId: string
  category: ScaleSnapCandidateCategory
  snapshotIndex: number
}>

/** Результат проверки применённого плана без повторного изменения объекта. */
export type ScaleSnapVerification = Readonly<{
  guides: readonly VerifiedScaleGuide[]
  blockedAxes: readonly ScaleSceneAxis[]
  holdState: ScaleHoldState
}>

/** Кандидат по одной оси до проверки совместимости с другой осью. */
type ScaleAxisProposal = Readonly<{
  axis: ScaleSceneAxis
  candidate: ScaleSnapCandidate
  transition: ScaleSnapTransition
}>

/** Совместимые ограничения и рассчитанные для них значения scale. */
type ResolvedScaleProposals = Readonly<{
  x: ScaleAxisProposal | null
  y: ScaleAxisProposal | null
  solution: ScaleProjectionSolution
}>

/** Общий допуск проверки направляющей и неподвижной точки в координатах сцены. */
export const SCALE_SNAP_VERIFICATION_EPSILON = 0.1

/** Допуск проверки центров, рассчитанных из точных границ. */
const EXACT_BOUNDS_CENTER_EPSILON = 0.000000001

/** Допуск, внутри которого два смещения считаются равными. */
const SCALE_CORRECTION_COMPARISON_EPSILON = 0.000000001

/** Порядок категорий, если кандидаты требуют одинакового смещения. */
const SCALE_CANDIDATE_CATEGORY_PRIORITY: Readonly<Record<ScaleSnapCandidateCategory, number>> = Object.freeze({
  'domain-boundary': 0,
  edge: 1,
  center: 2,
  spacing: 3
})

/** Общее неизменяемое состояние оси без прилипания. */
const FREE_SCALE_AXIS_HOLD: FreeScaleAxisHold = Object.freeze({ kind: 'free' })

/** Начальное состояние без удерживаемых направляющих. */
export const FREE_SCALE_HOLD_STATE: ScaleHoldState = Object.freeze({
  x: FREE_SCALE_AXIS_HOLD,
  y: FREE_SCALE_AXIS_HOLD
})

/**
 * Проверяет и сохраняет геометрию, режимы scale, кандидатов и пороги на начало жеста.
 */
export function createScaleGestureBaseline({
  bounds,
  fixedAnchor,
  projectionModes,
  candidates,
  zoom
}: ScaleGestureBaselineInput): ScaleGestureBaseline {
  const exactBounds = createExactBoundsSnapshot({ bounds })
  const anchorSnapshot = createScenePointSnapshot({ point: fixedAnchor, name: 'fixed anchor' })
  const modeSnapshot = createProjectionModeSnapshot({ bounds: exactBounds, projectionModes })
  const candidateSnapshot = createCandidateSnapshot({ candidates, projectionModes: modeSnapshot })

  return Object.freeze({
    bounds: exactBounds,
    fixedAnchor: anchorSnapshot,
    projectionModes: modeSnapshot,
    candidates: candidateSnapshot,
    thresholds: createScaleSnapThresholds({ zoom })
  })
}

/**
 * Рассчитывает новый план прилипания или продолжает удерживать выбранные направляющие.
 */
export function resolveScaleSnapPlan({
  baseline,
  intent,
  holdState
}: {
  baseline: ScaleGestureBaseline
  intent: ScaleRawIntent
  holdState: ScaleHoldState
}): ScaleSnapPlan {
  const projectionMode = resolveProjectionMode({ baseline, modeId: intent.projectionMode })
  assertScaleRawIntent({ projection: projectionMode.projection, intent })
  assertScaleHoldState({ baseline, holdState })

  const rawValues = Object.freeze([...intent.values])
  const rawPositions = projectScaleEdgePositions({ projection: projectionMode.projection, values: rawValues })
  if (intent.modifiers.ctrlKey) {
    return createScaleSnapPlan({ baseline, projectionMode, rawValues, rawPositions, resolved: null })
  }

  const x = resolveAxisProposal({ axis: 'x', baseline, projectionMode, rawPositions, hold: holdState.x })
  const y = resolveAxisProposal({ axis: 'y', baseline, projectionMode, rawPositions, hold: holdState.y })
  const resolved = resolveCompatibleProposals({ baseline, projectionMode, rawValues, x, y })

  return createScaleSnapPlan({ baseline, projectionMode, rawValues, rawPositions, resolved })
}

/**
 * Проверяет план по фактической геометрии и результату применения менеджером объекта.
 */
export function verifyScaleSnapPlan({
  plan,
  finalGeometry
}: {
  plan: ScaleSnapPlan
  finalGeometry: FinalScaleGeometry
}): ScaleSnapVerification {
  const { measuredValues, domainVerdict } = finalGeometry
  const bounds = createExactBoundsSnapshot({ bounds: finalGeometry.bounds })
  const fixedAnchor = createScenePointSnapshot({ point: finalGeometry.fixedAnchor, name: 'final fixed anchor' })
  const fixedAnchorMatches = areScenePointsNear({
    first: plan.fixedAnchor,
    second: fixedAnchor,
    epsilon: plan.verificationEpsilon
  })
  const measuredPositions = projectMeasuredScalePositions({ plan, measuredValues })
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
 * Переводит пороги из экранных пикселей в координаты сцены с учётом zoom.
 */
function createScaleSnapThresholds({ zoom }: { zoom: number }): ScaleSnapThresholds {
  if (!Number.isFinite(zoom) || zoom <= 0) {
    throw new Error('Scale snapping zoom must be a finite positive number')
  }

  return Object.freeze({
    acquire: SNAP_THRESHOLD / zoom,
    release: SNAP_THRESHOLD / zoom,
    spacingRelease: (SNAP_THRESHOLD + SPACING_SNAP_HOLD_MARGIN) / zoom,
    verification: SCALE_SNAP_VERIFICATION_EPSILON
  })
}

/**
 * Проверяет и копирует точные границы без округления.
 */
function createExactBoundsSnapshot({ bounds }: { bounds: ObjectBounds }): ObjectBounds {
  const { left, right, top, bottom, centerX, centerY } = bounds
  const edges = [left, right, top, bottom]
  if (!edges.every(Number.isFinite) || right < left || bottom < top) {
    throw new Error('Scale snapping bounds must contain finite ordered edges')
  }
  if (!Number.isFinite(centerX) || !Number.isFinite(centerY)) {
    throw new Error('Scale snapping bounds must contain finite centers')
  }

  const expectedCenterX = left + ((right - left) / 2)
  const expectedCenterY = top + ((bottom - top) / 2)
  if (Math.abs(centerX - expectedCenterX) > EXACT_BOUNDS_CENTER_EPSILON
    || Math.abs(centerY - expectedCenterY) > EXACT_BOUNDS_CENTER_EPSILON) {
    throw new Error('Scale snapping bounds centers must be derived from their edges')
  }

  return Object.freeze({ left, right, top, bottom, centerX, centerY })
}

/**
 * Проверяет и копирует точку в координатах сцены.
 */
function createScenePointSnapshot({
  point,
  name
}: {
  point: ScaleScenePoint
  name: string
}): ScaleScenePoint {
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    throw new Error(`Scale snapping ${name} must contain finite coordinates`)
  }

  return Object.freeze({ x: point.x, y: point.y })
}

/**
 * Проверяет и сохраняет все доступные режимы изменения размера.
 */
function createProjectionModeSnapshot({
  bounds,
  projectionModes
}: {
  bounds: ObjectBounds
  projectionModes: readonly ScaleProjectionModeInput[]
}): readonly ScaleProjectionMode[] {
  if (projectionModes.length === 0) {
    throw new Error('Scale gesture baseline must contain at least one projection mode')
  }

  const modeIds = new Set<string>()
  const snapshot = projectionModes.map(({ id, projection }) => {
    if (id.trim().length === 0 || modeIds.has(id)) {
      throw new Error(`Scale projection mode id "${id}" must be non-empty and unique`)
    }
    modeIds.add(id)

    return Object.freeze({ id, projection: createScaleProjection({ bounds, input: projection }) })
  })

  return Object.freeze(snapshot)
}

/**
 * Возвращает режим, выбранный менеджером объекта для текущего события указателя.
 */
function resolveProjectionMode({
  baseline,
  modeId
}: {
  baseline: ScaleGestureBaseline
  modeId: string
}): ScaleProjectionMode {
  const projectionMode = baseline.projectionModes.find(({ id }) => id === modeId)
  if (!projectionMode) {
    throw new Error(`Unknown scale projection mode "${modeId}"`)
  }

  return projectionMode
}

/**
 * Проверяет кандидатов и сохраняет их исходный порядок на время жеста.
 */
function createCandidateSnapshot({
  candidates,
  projectionModes
}: {
  candidates: readonly ScaleSnapCandidateInput[]
  projectionModes: readonly ScaleProjectionMode[]
}): readonly ScaleSnapCandidate[] {
  const candidateIds = new Set<string>()
  const snapshot = candidates.map((candidate, snapshotIndex) => {
    assertScaleCandidate({ candidate, projectionModes, candidateIds })
    candidateIds.add(candidate.id)

    return Object.freeze({ ...candidate, snapshotIndex })
  })

  return Object.freeze(snapshot)
}

/**
 * Проверяет идентификатор, ось и поддержку кандидата хотя бы одним режимом.
 */
function assertScaleCandidate({
  candidate,
  projectionModes,
  candidateIds
}: {
  candidate: ScaleSnapCandidateInput
  projectionModes: readonly ScaleProjectionMode[]
  candidateIds: ReadonlySet<string>
}): void {
  if (candidate.id.trim().length === 0 || candidateIds.has(candidate.id)) {
    throw new Error(`Scale snap candidate id "${candidate.id}" must be non-empty and unique`)
  }
  if (!Number.isFinite(candidate.position)) {
    throw new Error(`Scale snap candidate "${candidate.id}" position must be finite`)
  }
  if (resolveScaleSceneEdgeAxis({ edge: candidate.edge }) !== candidate.axis) {
    throw new Error(`Scale snap candidate "${candidate.id}" edge does not belong to ${candidate.axis} axis`)
  }

  const isSupported = projectionModes.some(({ projection }) => {
    return Boolean(getScaleProjectionEdge({ projection, edge: candidate.edge }))
  })
  if (!isSupported) {
    throw new Error(`Scale snap candidate "${candidate.id}" edge is not moved by any projection mode`)
  }
}

/**
 * Проверяет исходные значения scale для выбранного режима.
 */
function assertScaleRawIntent({
  projection,
  intent
}: {
  projection: ScaleProjection
  intent: ScaleRawIntent
}): void {
  if (intent.values.length !== projection.variables.length) {
    throw new Error('Scale raw intent has invalid values length')
  }
  if (!intent.values.every(Number.isFinite)) {
    throw new Error('Scale raw intent values must be finite')
  }
  if (typeof intent.modifiers.ctrlKey !== 'boolean' || typeof intent.modifiers.shiftKey !== 'boolean') {
    throw new Error('Scale raw intent modifiers must be boolean')
  }
}

/**
 * Проверяет, что удерживаемый кандидат относится к текущему жесту.
 */
function assertScaleHoldState({
  baseline,
  holdState
}: {
  baseline: ScaleGestureBaseline
  holdState: ScaleHoldState
}): void {
  for (const axis of ['x', 'y'] as const) {
    const axisHold = holdState[axis]
    if (axisHold.kind === 'free') continue
    if (axisHold.candidate.axis !== axis) {
      throw new Error(`Held scale candidate belongs to ${axisHold.candidate.axis}, not ${axis} axis`)
    }

    const baselineCandidate = baseline.candidates[axisHold.candidate.snapshotIndex]
    if (!baselineCandidate || !areScaleCandidatesEqual({ first: baselineCandidate, second: axisHold.candidate })) {
      throw new Error(`Held scale candidate "${axisHold.candidate.id}" does not belong to baseline snapshot`)
    }
  }
}

/**
 * Сохраняет удерживаемую направляющую либо выбирает нового кандидата по одной оси.
 */
function resolveAxisProposal({
  axis,
  baseline,
  projectionMode,
  rawPositions,
  hold
}: {
  axis: ScaleSceneAxis
  baseline: ScaleGestureBaseline
  projectionMode: ScaleProjectionMode
  rawPositions: ProjectedScaleEdgePositions
  hold: ScaleAxisHold
}): ScaleAxisProposal | null {
  if (hold.kind === 'held') {
    const rawPosition = rawPositions[hold.candidate.edge]
    const releaseThreshold = hold.candidate.category === 'spacing'
      ? baseline.thresholds.spacingRelease
      : baseline.thresholds.release
    if (rawPosition !== null && Math.abs(rawPosition - hold.candidate.position) <= releaseThreshold) {
      return Object.freeze({ axis, candidate: hold.candidate, transition: 'held' })
    }
  }

  const candidate = findBestScaleCandidate({ axis, baseline, projectionMode, rawPositions })
  if (!candidate) return null

  return Object.freeze({ axis, candidate, transition: 'acquired' })
}

/**
 * Выбирает ближайшего кандидата с учётом категории и исходного порядка.
 */
function findBestScaleCandidate({
  axis,
  baseline,
  projectionMode,
  rawPositions
}: {
  axis: ScaleSceneAxis
  baseline: ScaleGestureBaseline
  projectionMode: ScaleProjectionMode
  rawPositions: ProjectedScaleEdgePositions
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
    if (isScaleCandidatePreferred({ candidate, distance, bestCandidate, bestDistance })) {
      bestCandidate = candidate
      bestDistance = distance
    }
  }

  return bestCandidate
}

/**
 * Сравнивает кандидатов по расстоянию, категории и исходному порядку.
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
 * Совмещает ограничения двух осей или оставляет одно приоритетное ограничение.
 */
function resolveCompatibleProposals({
  baseline,
  projectionMode,
  rawValues,
  x,
  y
}: {
  baseline: ScaleGestureBaseline
  projectionMode: ScaleProjectionMode
  rawValues: readonly number[]
  x: ScaleAxisProposal | null
  y: ScaleAxisProposal | null
}): ResolvedScaleProposals {
  const orderedProposals = orderScaleProposals({ projectionMode, rawValues, x, y })
  const constraints = orderedProposals.map(createProjectionConstraint)
  const solution = resolveScaleProjection({
    projection: projectionMode.projection,
    rawValues,
    constraints,
    epsilon: baseline.thresholds.verification
  })

  if (solution) return Object.freeze({ x, y, solution })
  const [preferred] = orderedProposals
  if (!preferred) {
    throw new Error('Raw scale intent must have a projection solution')
  }

  const preferredSolution = resolveScaleProjection({
    projection: projectionMode.projection,
    rawValues,
    constraints: [createProjectionConstraint(preferred)],
    epsilon: baseline.thresholds.verification
  })
  if (!preferredSolution) {
    throw new Error(`Scale constraint for ${preferred.candidate.edge} edge must have a projection solution`)
  }

  return Object.freeze({
    x: preferred.axis === 'x' ? preferred : null,
    y: preferred.axis === 'y' ? preferred : null,
    solution: preferredSolution
  })
}

/**
 * Сначала ставит удерживаемое ограничение, затем меньшее смещение и ось X.
 */
function orderScaleProposals({
  projectionMode,
  rawValues,
  x,
  y
}: {
  projectionMode: ScaleProjectionMode
  rawValues: readonly number[]
  x: ScaleAxisProposal | null
  y: ScaleAxisProposal | null
}): readonly ScaleAxisProposal[] {
  const proposals: ScaleAxisProposal[] = []
  if (x) proposals.push(x)
  if (y) proposals.push(y)
  if (!x || !y) return Object.freeze(proposals)

  const preferred = selectPrimaryScaleProposal({ projectionMode, rawValues, x, y })
  return preferred.axis === 'x' ? Object.freeze([x, y]) : Object.freeze([y, x])
}

/**
 * Выбирает единственное ограничение, если два ограничения нельзя применить вместе.
 */
function selectPrimaryScaleProposal({
  projectionMode,
  rawValues,
  x,
  y
}: {
  projectionMode: ScaleProjectionMode
  rawValues: readonly number[]
  x: ScaleAxisProposal
  y: ScaleAxisProposal
}): ScaleAxisProposal {
  if (x.transition !== y.transition) return x.transition === 'held' ? x : y

  const xMagnitude = getProposalCorrectionMagnitude({ projectionMode, rawValues, proposal: x })
  const yMagnitude = getProposalCorrectionMagnitude({ projectionMode, rawValues, proposal: y })
  const magnitudeDifference = xMagnitude - yMagnitude
  if (magnitudeDifference < -SCALE_CORRECTION_COMPARISON_EPSILON) return x
  if (magnitudeDifference > SCALE_CORRECTION_COMPARISON_EPSILON) return y

  return x
}

/**
 * Возвращает величину изменения scale для одного ограничения.
 */
function getProposalCorrectionMagnitude({
  projectionMode,
  rawValues,
  proposal
}: {
  projectionMode: ScaleProjectionMode
  rawValues: readonly number[]
  proposal: ScaleAxisProposal
}): number {
  return getScaleProjectionCorrectionMagnitude({
    projection: projectionMode.projection,
    rawValues,
    constraint: createProjectionConstraint(proposal)
  })
}

/**
 * Преобразует выбранного кандидата в ограничение для конкретной грани.
 */
function createProjectionConstraint(proposal: ScaleAxisProposal): ScaleProjectionConstraint {
  return Object.freeze({
    axis: proposal.axis,
    edge: proposal.candidate.edge,
    position: proposal.candidate.position
  })
}

/**
 * Собирает план с прилипанием или с исходными значениями без него.
 */
function createScaleSnapPlan({
  baseline,
  projectionMode,
  rawValues,
  rawPositions,
  resolved
}: {
  baseline: ScaleGestureBaseline
  projectionMode: ScaleProjectionMode
  rawValues: readonly number[]
  rawPositions: ProjectedScaleEdgePositions
  resolved: ResolvedScaleProposals | null
}): ScaleSnapPlan {
  const effectiveValues = resolved ? resolved.solution.values : rawValues
  const effectivePositions = resolved ? resolved.solution.positions : rawPositions
  const x = resolved?.x ? createPlannedConstraint(resolved.x) : null
  const y = resolved?.y ? createPlannedConstraint(resolved.y) : null
  const constraints = Object.freeze({ x, y })

  return Object.freeze({
    projectionMode: projectionMode.id,
    projection: projectionMode.projection,
    variables: projectionMode.projection.variables,
    rawValues,
    effectiveValues,
    rawPositions,
    effectivePositions,
    constraints,
    proposedHoldState: createHoldStateFromConstraints({ x, y }),
    fixedAnchor: baseline.fixedAnchor,
    verificationEpsilon: baseline.thresholds.verification
  })
}

/**
 * Сохраняет выбранное ограничение в плане.
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
 * Сохраняет для следующего шага только совместимые ограничения.
 */
function createHoldStateFromConstraints({
  x,
  y
}: {
  x: PlannedScaleConstraint | null
  y: PlannedScaleConstraint | null
}): ScaleHoldState {
  return Object.freeze({
    x: createAxisHold({ constraint: x }),
    y: createAxisHold({ constraint: y })
  })
}

/**
 * Создаёт неизменяемое состояние одной оси.
 */
function createAxisHold({ constraint }: { constraint: PlannedScaleConstraint | null }): ScaleAxisHold {
  if (!constraint) return FREE_SCALE_AXIS_HOLD

  return Object.freeze({ kind: 'held', candidate: constraint.candidate })
}

/**
 * Проверяет по итоговым точным границам, что объект достиг направляющей.
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
 * Рассчитывает положения граней для фактически применённых значений scale.
 */
function projectMeasuredScalePositions({
  plan,
  measuredValues
}: {
  plan: ScaleSnapPlan
  measuredValues: readonly number[]
}): ProjectedScaleEdgePositions | null {
  if (measuredValues.length !== plan.projection.variables.length) return null
  if (!measuredValues.every(Number.isFinite)) return null

  return projectScaleEdgePositions({
    projection: plan.projection,
    values: measuredValues
  })
}

/**
 * Проверяет фактическое положение только той грани, от которой зависит ограничение.
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
 * Формирует подтверждённые направляющие, заблокированные оси и новое состояние удержания.
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
 * Сохраняет удержание по оси только для выполненного ограничения.
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
 * Создаёт подтверждённую направляющую с идентификатором исходного кандидата.
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
 * Проверяет совпадение двух точек в пределах общего допуска.
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
 * Проверяет полное совпадение двух зафиксированных кандидатов.
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
