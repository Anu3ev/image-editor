/* eslint-disable no-use-before-define -- Публичные контракты расположены перед внутренними расчётами. */
import {
  MOVE_SNAP_STEP,
  SNAP_THRESHOLD,
  SPACING_SNAP_HOLD_MARGIN
} from '../constants'
import {
  calculateHorizontalSpacing,
  calculateVerticalSpacing,
  type ResolvedSpacingSelection,
  type SpacingSelectionContext,
  type SpacingSelectionIdentity
} from './spacing'
import {
  type MovementBoundsAnchor,
  type MovementSceneAxis,
  type MovementSnapCandidate,
  type MovementSnapCandidateCategory,
  type MovementSnapEnvironment,
  type MovementSnapSpacingSource
} from './movement-snap-candidates'
import type {
  Bounds,
  GuideLine,
  SpacingGuide,
  SpacingPattern
} from '../types'
import { buildSpacingPatterns } from './spacing-patterns'
import {
  ACTIVE_MOVEMENT_SPACING_SOURCE_ID,
  createMovementSpacingChains,
  type MovementSpacingChains
} from './spacing-chains'
import {
  MOVEMENT_CORRECTION_COMPARISON_EPSILON,
  resolveMovementSpacingCorrection
} from './movement-spacing-correction'
import {
  appendVerifiedMovementSpacingGuides,
  resolveApplicableMovementSpacingSelections
} from './movement-spacing-verification'

/** Положение Fabric origin перемещаемого объекта. */
export type MovementTargetPosition = Readonly<{
  left: number
  top: number
}>

/** Состояние одной оси без удерживаемой направляющей. */
export type FreeMovementAxisHold = Readonly<{
  kind: 'free'
}>

/** Удержание конкретной линии и опорной точки перемещаемого объекта. */
export type HeldMovementLineAxisHold = Readonly<{
  kind: 'line'
  candidate: MovementSnapCandidate
  activeAnchor: MovementBoundsAnchor
}>

/** Удержание конкретного интервала равноудалённости. */
export type HeldMovementSpacingAxisHold = Readonly<{
  kind: 'spacing'
  candidateId: string
  context: Readonly<SpacingSelectionContext>
}>

/** Свободное или удерживаемое состояние одной оси. */
export type MovementAxisHold = FreeMovementAxisHold
  | HeldMovementLineAxisHold
  | HeldMovementSpacingAxisHold

/** Независимое временное состояние line или spacing-ограничений по двум осям. */
export type MovementHoldState = Readonly<{
  x: MovementAxisHold
  y: MovementAxisHold
}>

/** Пороговые значения одного movement-жеста в координатах сцены. */
export type MovementSnapThresholds = Readonly<{
  acquire: number
  release: number
  spacingRelease: number
  verification: number
}>

/** Неизменяемый снимок начальной геометрии и целей перемещения. */
export type MovementGestureBaseline = Readonly<{
  bounds: Bounds
  position: MovementTargetPosition
  candidates: readonly MovementSnapCandidate[]
  spacingBounds: readonly Bounds[]
  spacingChains: MovementSpacingChains
  spacingPatterns: Readonly<{
    vertical: readonly SpacingPattern[]
    horizontal: readonly SpacingPattern[]
  }>
  thresholds: MovementSnapThresholds
}>

/** Доступные оси прилипания текущего movement-step. */
export type MovementSnapAxes = Readonly<{
  x: boolean
  y: boolean
}>

/** Raw-состояние объекта после Fabric drag и до применения прилипания. */
export type MovementRawIntent = Readonly<{
  bounds: Bounds
  position: MovementTargetPosition
  axes: MovementSnapAxes
  modifiers: Readonly<{
    ctrlKey: boolean
  }>
}>

/** Способ выбора ограничения на текущем шаге. */
export type MovementSnapTransition = 'acquired' | 'held'

/** Выбранная линия и опорная точка по одной оси. */
export type PlannedMovementLineConstraint = Readonly<{
  kind: 'line'
  axis: MovementSceneAxis
  activeAnchor: MovementBoundsAnchor
  candidate: MovementSnapCandidate
  transition: MovementSnapTransition
}>

/** Выбранный интервал равноудалённости по одной оси. */
export type PlannedMovementSpacingConstraint = Readonly<{
  kind: 'spacing'
  axis: MovementSceneAxis
  candidateId: string
  chainId: string | null
  context: Readonly<SpacingSelectionContext>
  delta: number
  selections: readonly ResolvedSpacingSelection[]
  transition: MovementSnapTransition
}>

/** Единственное линейное или spacing-ограничение одной оси. */
export type PlannedMovementConstraint = PlannedMovementLineConstraint
  | PlannedMovementSpacingConstraint

/** Результат расчёта одной итоговой translation для текущего raw-состояния. */
export type MovementSnapPlan = Readonly<{
  rawIntent: MovementRawIntent
  nextPosition: MovementTargetPosition
  predictedBounds: Bounds
  constraints: Readonly<{
    x: PlannedMovementConstraint | null
    y: PlannedMovementConstraint | null
  }>
  verificationEpsilon: number
}>

/** Фактическое состояние после единственного применения movement-плана. */
export type FinalMovementGeometry = Readonly<{
  bounds: Bounds
  position: MovementTargetPosition
}>

/** Линейная направляющая, подтверждённая по фактической геометрии. */
export type VerifiedMovementGuide = Readonly<{
  axis: MovementSceneAxis
  activeAnchor: MovementBoundsAnchor
  position: number
  candidateId: string
  category: MovementSnapCandidateCategory
  snapshotIndex: number
}>

/** Подтверждённые направляющие и новое временное состояние удержания. */
export type MovementSnapVerification = Readonly<{
  guides: readonly VerifiedMovementGuide[]
  spacingGuides: readonly SpacingGuide[]
  blockedAxes: readonly MovementSceneAxis[]
  holdState: MovementHoldState
}>

/** Результат выбора ограничения по одной оси до materialization guide. */
type MovementAxisProposal = Readonly<
  | PlannedMovementLineConstraint
  | PlannedMovementSpacingConstraint
>

/** Ограничения обеих осей до materialization итогового movement-плана. */
type MovementAxisProposals = Readonly<{
  x: MovementAxisProposal | null
  y: MovementAxisProposal | null
}>

/** Результат существующего spacing-calculator по одной оси. */
type MovementSpacingCalculation = {
  delta: number
  guides: SpacingGuide[]
  context: SpacingSelectionContext | null
  selections: ResolvedSpacingSelection[]
}

/** Общий допуск проверки фактически применённого movement-плана. */
export const MOVEMENT_SNAP_VERIFICATION_EPSILON = 0.1

/** Допуск проверки центров в точных границах. */
const EXACT_BOUNDS_CENTER_EPSILON = 0.000000001

/** Число проходов для стабилизации cross-axis spacing после замены constraints. */
const MOVEMENT_SPACING_COMPATIBILITY_PASSES = 3

/** Порядок категорий при одинаковом расстоянии до нескольких линий. */
const MOVEMENT_CANDIDATE_CATEGORY_PRIORITY: Readonly<Record<MovementSnapCandidateCategory, number>> = Object.freeze({
  'domain-boundary': 0,
  edge: 1,
  center: 2
})

/** Опорные точки по X в стабильном порядке. */
const X_ANCHORS: readonly MovementBoundsAnchor[] = Object.freeze(['left', 'centerX', 'right'])

/** Опорные точки по Y в стабильном порядке. */
const Y_ANCHORS: readonly MovementBoundsAnchor[] = Object.freeze(['top', 'centerY', 'bottom'])

/** Общее неизменяемое состояние свободной оси. */
const FREE_MOVEMENT_AXIS_HOLD: FreeMovementAxisHold = Object.freeze({ kind: 'free' })

/** Начальное состояние без удерживаемых линейных направляющих. */
export const FREE_MOVEMENT_HOLD_STATE: MovementHoldState = Object.freeze({
  x: FREE_MOVEMENT_AXIS_HOLD,
  y: FREE_MOVEMENT_AXIS_HOLD
})

/**
 * Проверяет и сохраняет начальную геометрию, цели и пороги movement-жеста.
 */
export function createMovementGestureBaseline({
  bounds,
  position,
  environment
}: {
  bounds: Bounds
  position: MovementTargetPosition
  environment: MovementSnapEnvironment
}): MovementGestureBaseline {
  const exactBounds = createExactBoundsSnapshot({ bounds })
  const exactPosition = createPositionSnapshot({ position })
  const spacingSources = environment.spacingSources.map(({ id, bounds: candidateBounds }) => {
    return Object.freeze({
      id,
      bounds: createExactBoundsSnapshot({ bounds: candidateBounds })
    })
  })
  const spacingBounds = spacingSources.map(({ bounds: candidateBounds }) => candidateBounds)
  const spacingPatterns = buildSpacingPatterns({ bounds: [...spacingBounds] })
  const activeSpacingSource: MovementSnapSpacingSource = Object.freeze({
    id: ACTIVE_MOVEMENT_SPACING_SOURCE_ID,
    bounds: exactBounds
  })

  return Object.freeze({
    bounds: exactBounds,
    position: exactPosition,
    candidates: environment.candidates,
    spacingBounds: Object.freeze(spacingBounds),
    spacingChains: createMovementSpacingChains({ sources: [...spacingSources, activeSpacingSource] }),
    spacingPatterns: Object.freeze({
      vertical: Object.freeze(spacingPatterns.vertical.map((pattern) => Object.freeze({ ...pattern }))),
      horizontal: Object.freeze(spacingPatterns.horizontal.map((pattern) => Object.freeze({ ...pattern })))
    }),
    thresholds: createMovementSnapThresholds({ zoom: environment.zoom })
  })
}

/**
 * Рассчитывает одну итоговую translation от raw intent и текущего hold-state.
 */
export function resolveMovementSnapPlan({
  baseline,
  intent,
  holdState
}: {
  baseline: MovementGestureBaseline
  intent: MovementRawIntent
  holdState: MovementHoldState
}): MovementSnapPlan {
  const rawIntent = createRawIntentSnapshot({ intent })
  assertMovementHoldState({ baseline, holdState })
  assertRawIntentMatchesBaseline({ baseline, intent: rawIntent })

  if (rawIntent.modifiers.ctrlKey) {
    return createDisabledMovementPlan({ rawIntent })
  }

  const proposals = resolveCompatibleMovementProposals({
    baseline,
    intent: rawIntent,
    proposals: {
      x: resolveAxisProposal({ axis: 'x', baseline, intent: rawIntent, hold: holdState.x }),
      y: resolveAxisProposal({ axis: 'y', baseline, intent: rawIntent, hold: holdState.y })
    }
  })
  const nextPosition = resolveNextMovementPosition({
    intent: rawIntent,
    proposals
  })
  const predictedBounds = translateBounds({
    bounds: rawIntent.bounds,
    deltaX: nextPosition.left - rawIntent.position.left,
    deltaY: nextPosition.top - rawIntent.position.top
  })
  const constraints = createPlannedMovementConstraints({
    proposals,
    deltaX: nextPosition.left - rawIntent.position.left,
    deltaY: nextPosition.top - rawIntent.position.top
  })

  return Object.freeze({
    rawIntent,
    nextPosition,
    predictedBounds,
    constraints,
    verificationEpsilon: baseline.thresholds.verification
  })
}

/**
 * Проверяет фактическую геометрию и только после этого обновляет hold-state и guide.
 */
export function verifyMovementSnapPlan({
  baseline,
  plan,
  finalGeometry
}: {
  baseline: MovementGestureBaseline
  plan: MovementSnapPlan
  finalGeometry: FinalMovementGeometry
}): MovementSnapVerification {
  const bounds = createExactBoundsSnapshot({ bounds: finalGeometry.bounds })
  const position = createPositionSnapshot({ position: finalGeometry.position })
  const dimensionsPreserved = areBoundsDimensionsEqual({
    first: baseline.bounds,
    second: bounds,
    epsilon: plan.verificationEpsilon
  })
  const xVerified = verifyMovementAxisConstraint({
    baseline,
    constraint: plan.constraints.x,
    plan,
    bounds,
    position,
    dimensionsPreserved
  })
  const yVerified = verifyMovementAxisConstraint({
    baseline,
    constraint: plan.constraints.y,
    plan,
    bounds,
    position,
    dimensionsPreserved
  })

  return createMovementVerification({
    baseline,
    plan,
    xVerified,
    yVerified,
    bounds
  })
}

/** Создаёт план без прилипания и pixel rounding при нажатом Ctrl. */
function createDisabledMovementPlan({
  rawIntent
}: {
  rawIntent: MovementRawIntent
}): MovementSnapPlan {
  return Object.freeze({
    rawIntent,
    nextPosition: rawIntent.position,
    predictedBounds: rawIntent.bounds,
    constraints: Object.freeze({ x: null, y: null }),
    verificationEpsilon: MOVEMENT_SNAP_VERIFICATION_EPSILON
  })
}

/** Выбирает ровно одно удерживаемое или новое ограничение по одной оси. */
function resolveAxisProposal({
  axis,
  baseline,
  intent,
  hold
}: {
  axis: MovementSceneAxis
  baseline: MovementGestureBaseline
  intent: MovementRawIntent
  hold: MovementAxisHold
}): MovementAxisProposal | null {
  if (!intent.axes[axis]) return null

  const heldProposal = resolveHeldAxisProposal({
    axis,
    baseline,
    intent,
    hold
  })
  if (heldProposal) return heldProposal

  const line = resolveAcquiredLineConstraint({
    axis,
    bounds: intent.bounds,
    candidates: baseline.candidates,
    threshold: baseline.thresholds.acquire
  })
  const spacing = resolveSpacingConstraint({
    axis,
    baseline,
    bounds: intent.bounds,
    threshold: baseline.thresholds.acquire,
    transition: 'acquired'
  })

  return selectAcquiredAxisProposal({
    bounds: intent.bounds,
    line,
    spacing
  })
}

/** Сохраняет прежнее line или spacing-ограничение внутри его release-zone. */
function resolveHeldAxisProposal({
  axis,
  baseline,
  intent,
  hold
}: {
  axis: MovementSceneAxis
  baseline: MovementGestureBaseline
  intent: MovementRawIntent
  hold: MovementAxisHold
}): MovementAxisProposal | null {
  if (hold.kind === 'line') {
    return resolveHeldLineConstraint({
      axis,
      bounds: intent.bounds,
      hold,
      releaseThreshold: baseline.thresholds.release
    })
  }
  if (hold.kind === 'spacing') {
    return resolveHeldSpacingConstraint({
      axis,
      baseline,
      bounds: intent.bounds,
      hold
    })
  }

  return null
}

/** Сохраняет выбранную line, пока её raw anchor остаётся в release-zone. */
function resolveHeldLineConstraint({
  axis,
  bounds,
  hold,
  releaseThreshold
}: {
  axis: MovementSceneAxis
  bounds: Bounds
  hold: HeldMovementLineAxisHold
  releaseThreshold: number
}): PlannedMovementLineConstraint | null {
  const rawPosition = bounds[hold.activeAnchor]
  const distance = Math.abs(rawPosition - hold.candidate.position)
  if (distance > releaseThreshold) return null

  return Object.freeze({
    kind: 'line',
    axis,
    activeAnchor: hold.activeAnchor,
    candidate: hold.candidate,
    transition: 'held'
  })
}

/** Сохраняет конкретный spacing-кандидат, не переключаясь внутри release-zone. */
function resolveHeldSpacingConstraint({
  axis,
  baseline,
  bounds,
  hold
}: {
  axis: MovementSceneAxis
  baseline: MovementGestureBaseline
  bounds: Bounds
  hold: HeldMovementSpacingAxisHold
}): PlannedMovementSpacingConstraint | null {
  const constraint = resolveSpacingConstraint({
    axis,
    baseline,
    bounds,
    threshold: baseline.thresholds.spacingRelease,
    previousContext: hold.context,
    transition: 'held'
  })
  if (!constraint || constraint.candidateId !== hold.candidateId) return null

  return constraint
}

/** Выбирает меньшую новую correction; при равенстве line имеет приоритет над spacing. */
function selectAcquiredAxisProposal({
  bounds,
  line,
  spacing
}: {
  bounds: Bounds
  line: PlannedMovementLineConstraint | null
  spacing: PlannedMovementSpacingConstraint | null
}): MovementAxisProposal | null {
  if (!line) return spacing
  if (!spacing) return line

  const lineDelta = Math.abs(resolveLineConstraintDelta({
    constraint: line,
    bounds
  }))

  return lineDelta <= Math.abs(spacing.delta) + MOVEMENT_CORRECTION_COMPARISON_EPSILON
    ? line
    : spacing
}

/** Стабилизирует spacing-ограничения после совместной коррекции обеих осей. */
function resolveCompatibleMovementProposals({
  baseline,
  intent,
  proposals
}: {
  baseline: MovementGestureBaseline
  intent: MovementRawIntent
  proposals: MovementAxisProposals
}): MovementAxisProposals {
  let compatible = proposals

  for (let pass = 0; pass < MOVEMENT_SPACING_COMPATIBILITY_PASSES; pass += 1) {
    const nextPosition = resolveNextMovementPosition({
      intent,
      proposals: compatible
    })
    const predictedBounds = translateBounds({
      bounds: intent.bounds,
      deltaX: nextPosition.left - intent.position.left,
      deltaY: nextPosition.top - intent.position.top
    })
    const x = resolveCompatibleSpacingProposal({
      proposal: compatible.x,
      baseline,
      intent,
      bounds: predictedBounds
    })
    const y = resolveCompatibleSpacingProposal({
      proposal: compatible.y,
      baseline,
      intent,
      bounds: predictedBounds
    })
    if (x === compatible.x && y === compatible.y) return compatible

    compatible = Object.freeze({ x, y })
  }

  return compatible
}

/** Фильтрует secondary spacing guides или возвращает line при потере primary interval. */
function resolveCompatibleSpacingProposal({
  proposal,
  baseline,
  intent,
  bounds
}: {
  proposal: MovementAxisProposal | null
  baseline: MovementGestureBaseline
  intent: MovementRawIntent
  bounds: Bounds
}): MovementAxisProposal | null {
  if (!proposal || proposal.kind === 'line') return proposal

  const selections = resolveApplicableMovementSpacingSelections({
    constraint: proposal,
    baseline,
    bounds
  })
  if (!selections.some(({ isPrimary }) => isPrimary)) {
    return resolveAcquiredLineConstraint({
      axis: proposal.axis,
      bounds: intent.bounds,
      candidates: baseline.candidates,
      threshold: baseline.thresholds.acquire
    })
  }
  if (selections.length === proposal.selections.length) return proposal

  return Object.freeze({
    ...proposal,
    selections: Object.freeze(selections)
  })
}

/** Ищет ближайшую новую пару active anchor → candidate. */
function resolveAcquiredLineConstraint({
  axis,
  bounds,
  candidates,
  threshold
}: {
  axis: MovementSceneAxis
  bounds: Bounds
  candidates: readonly MovementSnapCandidate[]
  threshold: number
}): PlannedMovementLineConstraint | null {
  let best: PlannedMovementLineConstraint | null = null
  let bestDistance = Number.POSITIVE_INFINITY
  const anchors = axis === 'x' ? X_ANCHORS : Y_ANCHORS

  for (let anchorIndex = 0; anchorIndex < anchors.length; anchorIndex += 1) {
    const activeAnchor = anchors[anchorIndex]
    for (const candidate of candidates) {
      if (candidate.axis !== axis) continue

      const distance = Math.abs(bounds[activeAnchor] - candidate.position)
      if (distance > threshold) continue
      if (!isBetterMovementCandidate({ candidate, distance, current: best, currentDistance: bestDistance })) continue

      best = Object.freeze({
        kind: 'line',
        axis,
        activeAnchor,
        candidate,
        transition: 'acquired'
      })
      bestDistance = distance
    }
  }

  return best
}

/** Сравнивает кандидатов по расстоянию, категории и стабильному snapshot index. */
function isBetterMovementCandidate({
  candidate,
  distance,
  current,
  currentDistance
}: {
  candidate: MovementSnapCandidate
  distance: number
  current: PlannedMovementLineConstraint | null
  currentDistance: number
}): boolean {
  if (!current) return true

  const distanceDifference = distance - currentDistance
  if (distanceDifference < -MOVEMENT_CORRECTION_COMPARISON_EPSILON) return true
  if (distanceDifference > MOVEMENT_CORRECTION_COMPARISON_EPSILON) return false

  const candidatePriority = MOVEMENT_CANDIDATE_CATEGORY_PRIORITY[candidate.category]
  const currentPriority = MOVEMENT_CANDIDATE_CATEGORY_PRIORITY[current.candidate.category]
  if (candidatePriority !== currentPriority) return candidatePriority < currentPriority

  return candidate.snapshotIndex < current.candidate.snapshotIndex
}

/** Возвращает сдвиг, необходимый для выбранной обычной направляющей. */
function resolveLineConstraintDelta({
  constraint,
  bounds
}: {
  constraint: PlannedMovementLineConstraint
  bounds: Bounds
}): number {
  return constraint.candidate.position - bounds[constraint.activeAnchor]
}

/** Возвращает сдвиг для выбранной обычной направляющей или равноудалённости. */
function resolveProposalDelta({
  proposal,
  bounds
}: {
  proposal: MovementAxisProposal | null
  bounds: Bounds
}): number {
  if (!proposal) return 0
  if (proposal.kind === 'spacing') return proposal.delta

  return resolveLineConstraintDelta({ constraint: proposal, bounds })
}

/** Преобразует расчёт равноудалённости в ограничение для одной оси. */
function resolveSpacingConstraint({
  axis,
  baseline,
  bounds,
  threshold,
  transition,
  previousContext = null
}: {
  axis: MovementSceneAxis
  baseline: MovementGestureBaseline
  bounds: Bounds
  threshold: number
  transition: MovementSnapTransition
  previousContext?: Readonly<SpacingSelectionContext> | null
}): PlannedMovementSpacingConstraint | null {
  const calculation = calculateMovementAxisSpacing({
    axis,
    baseline,
    bounds,
    threshold,
    previousContext
  })
  if (!calculation.context || !calculation.guides.length) return null
  if (!calculation.selections.length) {
    throw new Error('Movement spacing result must describe its selected intervals')
  }

  return createPlannedMovementSpacingConstraint({
    axis,
    baseline,
    bounds,
    threshold,
    transition,
    calculation
  })
}

/** Создаёт ограничение из проверенного результата расчёта равноудалённости. */
function createPlannedMovementSpacingConstraint({
  axis,
  baseline,
  bounds,
  threshold,
  transition,
  calculation
}: {
  axis: MovementSceneAxis
  baseline: MovementGestureBaseline
  bounds: Bounds
  threshold: number
  transition: MovementSnapTransition
  calculation: MovementSpacingCalculation
}): PlannedMovementSpacingConstraint {
  const context = freezeSpacingContext({ context: calculation.context })
  if (!context) throw new Error('Movement spacing result must contain a context')
  const selections = freezeSpacingSelections({
    selections: calculation.selections
  })
  const primarySelection = resolvePrimarySpacingSelection({ selections })
  const correction = resolveMovementSpacingCorrection({
    axis,
    baseline,
    bounds,
    threshold,
    selections,
    primarySelection
  })

  return Object.freeze({
    kind: 'spacing',
    axis,
    candidateId: createSpacingCandidateId({
      axis,
      chainId: correction.chain?.id ?? null,
      identity: primarySelection.identity,
      context
    }),
    chainId: correction.chain?.id ?? null,
    context,
    delta: correction.delta,
    selections: correction.selections,
    transition
  })
}

/** Возвращает единственный основной интервал рассчитанной равноудалённости. */
function resolvePrimarySpacingSelection({
  selections
}: {
  selections: readonly ResolvedSpacingSelection[]
}): ResolvedSpacingSelection {
  const primarySelections = selections.filter(({ isPrimary }) => isPrimary)
  if (primarySelections.length !== 1) {
    throw new Error('Movement spacing result must identify exactly one primary interval')
  }

  return primarySelections[0]
}

/** Рассчитывает равноудалённость с порогом для выбранной оси. */
function calculateMovementAxisSpacing({
  axis,
  baseline,
  bounds,
  threshold,
  previousContext
}: {
  axis: MovementSceneAxis
  baseline: MovementGestureBaseline
  bounds: Bounds
  threshold: number
  previousContext?: Readonly<SpacingSelectionContext> | null
}): MovementSpacingCalculation {
  const params = {
    activeBounds: bounds,
    candidates: baseline.spacingBounds.map((candidate) => ({ ...candidate })),
    threshold,
    patterns: axis === 'x'
      ? baseline.spacingPatterns.horizontal.map((pattern) => ({ ...pattern }))
      : baseline.spacingPatterns.vertical.map((pattern) => ({ ...pattern })),
    previousContext: previousContext ? { ...previousContext } : null,
    switchDistance: previousContext ? Number.POSITIVE_INFINITY : 0
  }

  return axis === 'x'
    ? calculateHorizontalSpacing(params)
    : calculateVerticalSpacing(params)
}

/** Создаёт стабильный идентификатор по точным данным основного интервала. */
function createSpacingCandidateId({
  axis,
  chainId,
  identity,
  context
}: {
  axis: MovementSceneAxis
  chainId: string | null
  identity: SpacingSelectionIdentity
  context: SpacingSelectionContext
}): string {
  return JSON.stringify({
    axis,
    chainId,
    context,
    identity
  })
}

/** Сравнивает точные координаты без округления отображаемого значения. */
function areNumbersNear(first: number, second: number): boolean {
  return Math.abs(first - second) <= EXACT_BOUNDS_CENTER_EPSILON
}

/** Рассчитывает итоговую позицию объекта по одному ограничению на каждой оси. */
function resolveNextMovementPosition({
  intent,
  proposals
}: {
  intent: MovementRawIntent
  proposals: MovementAxisProposals
}): MovementTargetPosition {
  return Object.freeze({
    left: resolveMovementAxisPosition({
      value: intent.position.left,
      delta: resolveProposalDelta({ proposal: proposals.x, bounds: intent.bounds }),
      canSnap: intent.axes.x,
      hasConstraint: Boolean(proposals.x)
    }),
    top: resolveMovementAxisPosition({
      value: intent.position.top,
      delta: resolveProposalDelta({ proposal: proposals.y, bounds: intent.bounds }),
      canSnap: intent.axes.y,
      hasConstraint: Boolean(proposals.y)
    })
  })
}

/** Округляет свободную ось до пикселя, не сдвигая объект с направляющей. */
function resolveMovementAxisPosition({
  value,
  delta,
  canSnap,
  hasConstraint
}: {
  value: number
  delta: number
  canSnap: boolean
  hasConstraint: boolean
}): number {
  if (!canSnap) return value
  if (hasConstraint) return value + delta

  return Math.round(value / MOVE_SNAP_STEP) * MOVE_SNAP_STEP
}

/** Формирует ограничения плана и сдвигает равноудалённость по поперечной оси. */
function createPlannedMovementConstraints({
  proposals,
  deltaX,
  deltaY
}: {
  proposals: MovementAxisProposals
  deltaX: number
  deltaY: number
}): MovementSnapPlan['constraints'] {
  return Object.freeze({
    x: materializeMovementConstraint({ proposal: proposals.x, deltaX, deltaY }),
    y: materializeMovementConstraint({ proposal: proposals.y, deltaX, deltaY })
  })
}

/** Сохраняет обычную направляющую или фиксирует равноудалённость в итоговой позиции. */
function materializeMovementConstraint({
  proposal,
  deltaX,
  deltaY
}: {
  proposal: MovementAxisProposal | null
  deltaX: number
  deltaY: number
}): PlannedMovementConstraint | null {
  if (!proposal || proposal.kind === 'line') return proposal

  return Object.freeze({
    ...proposal,
    selections: Object.freeze(proposal.selections.map((selection) => {
      const { guide } = selection
      const crossAxisDelta = guide.type === 'horizontal' ? deltaY : deltaX

      return Object.freeze({
        ...selection,
        guide: Object.freeze({
          ...guide,
          axis: guide.axis + crossAxisDelta
        })
      })
    }))
  })
}

/** Проверяет выбранное ограничение по итоговым границам, не заменяя его другим. */
function verifyMovementAxisConstraint({
  baseline,
  constraint,
  plan,
  bounds,
  position,
  dimensionsPreserved
}: {
  baseline: MovementGestureBaseline
  constraint: PlannedMovementConstraint | null
  plan: MovementSnapPlan
  bounds: Bounds
  position: MovementTargetPosition
  dimensionsPreserved: boolean
}): boolean {
  if (!constraint || !dimensionsPreserved) return false

  const targetPosition = constraint.axis === 'x' ? position.left : position.top
  const plannedPosition = constraint.axis === 'x' ? plan.nextPosition.left : plan.nextPosition.top
  if (Math.abs(targetPosition - plannedPosition) > plan.verificationEpsilon) return false
  if (!doesMovementAxisMatchPlan({ axis: constraint.axis, bounds, plan })) return false
  if (constraint.kind === 'spacing') {
    const selections = resolveApplicableMovementSpacingSelections({
      constraint,
      baseline,
      bounds
    })

    return selections.some(({ isPrimary }) => isPrimary)
  }

  return Math.abs(
    bounds[constraint.activeAnchor] - constraint.candidate.position
  ) <= plan.verificationEpsilon
}

/** Сравнивает фактические и рассчитанные границы только по проверяемой оси. */
function doesMovementAxisMatchPlan({
  axis,
  bounds,
  plan
}: {
  axis: MovementSceneAxis
  bounds: Bounds
  plan: MovementSnapPlan
}): boolean {
  const edges: readonly (keyof Bounds)[] = axis === 'x'
    ? ['left', 'centerX', 'right']
    : ['top', 'centerY', 'bottom']

  return edges.every((edge) => {
    return Math.abs(bounds[edge] - plan.predictedBounds[edge]) <= plan.verificationEpsilon
  })
}

/** Формирует окончательный результат verification. */
function createMovementVerification({
  baseline,
  plan,
  xVerified,
  yVerified,
  bounds
}: {
  baseline: MovementGestureBaseline
  plan: MovementSnapPlan
  xVerified: boolean
  yVerified: boolean
  bounds: Bounds
}): MovementSnapVerification {
  const guides: VerifiedMovementGuide[] = []
  const spacingGuides: SpacingGuide[] = []
  const blockedAxes: MovementSceneAxis[] = []
  const x = resolveVerifiedAxisHold({
    baseline,
    bounds,
    guides,
    spacingGuides,
    blockedAxes,
    constraint: plan.constraints.x,
    plan,
    verified: xVerified
  })
  const y = resolveVerifiedAxisHold({
    baseline,
    bounds,
    guides,
    spacingGuides,
    blockedAxes,
    constraint: plan.constraints.y,
    plan,
    verified: yVerified
  })

  return Object.freeze({
    guides: Object.freeze(guides),
    spacingGuides: Object.freeze(spacingGuides),
    blockedAxes: Object.freeze(blockedAxes),
    holdState: Object.freeze({ x, y })
  })
}

/** Сохраняет подтверждённый hold и guide либо отмечает заблокированную ось. */
function resolveVerifiedAxisHold({
  baseline,
  bounds,
  guides,
  spacingGuides,
  blockedAxes,
  constraint,
  plan,
  verified
}: {
  baseline: MovementGestureBaseline
  bounds: Bounds
  guides: VerifiedMovementGuide[]
  spacingGuides: SpacingGuide[]
  blockedAxes: MovementSceneAxis[]
  constraint: PlannedMovementConstraint | null
  plan: MovementSnapPlan
  verified: boolean
}): MovementAxisHold {
  if (!constraint) return FREE_MOVEMENT_AXIS_HOLD
  if (!verified) {
    blockedAxes.push(constraint.axis)
    return FREE_MOVEMENT_AXIS_HOLD
  }
  if (constraint.kind === 'spacing') {
    appendVerifiedMovementSpacingGuides({
      baseline,
      bounds,
      guides: spacingGuides,
      constraint,
      plan
    })

    return Object.freeze({
      kind: 'spacing',
      candidateId: constraint.candidateId,
      context: constraint.context
    })
  }

  guides.push(Object.freeze({
    axis: constraint.axis,
    activeAnchor: constraint.activeAnchor,
    position: constraint.candidate.position,
    candidateId: constraint.candidate.id,
    category: constraint.candidate.category,
    snapshotIndex: constraint.candidate.snapshotIndex
  }))

  return Object.freeze({
    kind: 'line',
    candidate: constraint.candidate,
    activeAnchor: constraint.activeAnchor
  })
}

/** Переводит точные границы на рассчитанную дельту без округления. */
function translateBounds({
  bounds,
  deltaX,
  deltaY
}: {
  bounds: Bounds
  deltaX: number
  deltaY: number
}): Bounds {
  return Object.freeze({
    left: bounds.left + deltaX,
    right: bounds.right + deltaX,
    top: bounds.top + deltaY,
    bottom: bounds.bottom + deltaY,
    centerX: bounds.centerX + deltaX,
    centerY: bounds.centerY + deltaY
  })
}

/** Проверяет и копирует raw intent до любых изменений target. */
function createRawIntentSnapshot({
  intent
}: {
  intent: MovementRawIntent
}): MovementRawIntent {
  return Object.freeze({
    bounds: createExactBoundsSnapshot({ bounds: intent.bounds }),
    position: createPositionSnapshot({ position: intent.position }),
    axes: Object.freeze({
      x: intent.axes.x,
      y: intent.axes.y
    }),
    modifiers: Object.freeze({
      ctrlKey: intent.modifiers.ctrlKey
    })
  })
}

/** Проверяет, что Fabric movement сохранил начальную геометрию и дал чистую translation. */
function assertRawIntentMatchesBaseline({
  baseline,
  intent
}: {
  baseline: MovementGestureBaseline
  intent: MovementRawIntent
}): void {
  const expectedBounds = translateBounds({
    bounds: baseline.bounds,
    deltaX: intent.position.left - baseline.position.left,
    deltaY: intent.position.top - baseline.position.top
  })
  const edges: readonly (keyof Bounds)[] = [
    'left',
    'centerX',
    'right',
    'top',
    'centerY',
    'bottom'
  ]
  const matchesBaseline = edges.every((edge) => {
    return areNumbersNear(expectedBounds[edge], intent.bounds[edge])
  })
  if (!matchesBaseline) {
    throw new Error('Movement raw intent must be a translation of the gesture baseline')
  }
}

/** Проверяет и копирует точные границы movement-объекта. */
function createExactBoundsSnapshot({ bounds }: { bounds: Bounds }): Bounds {
  const { left, right, top, bottom, centerX, centerY } = bounds
  const values = [left, right, top, bottom, centerX, centerY]
  if (!values.every(Number.isFinite) || right < left || bottom < top) {
    throw new Error('Movement snapping bounds must contain finite ordered values')
  }

  const expectedCenterX = left + ((right - left) / 2)
  const expectedCenterY = top + ((bottom - top) / 2)
  if (Math.abs(centerX - expectedCenterX) > EXACT_BOUNDS_CENTER_EPSILON
    || Math.abs(centerY - expectedCenterY) > EXACT_BOUNDS_CENTER_EPSILON) {
    throw new Error('Movement snapping bounds centers must be derived from its edges')
  }

  return Object.freeze({ left, right, top, bottom, centerX, centerY })
}

/** Проверяет и копирует положение Fabric target. */
function createPositionSnapshot({
  position
}: {
  position: MovementTargetPosition
}): MovementTargetPosition {
  if (!Number.isFinite(position.left) || !Number.isFinite(position.top)) {
    throw new Error('Movement snapping target position must contain finite coordinates')
  }

  return Object.freeze({
    left: position.left,
    top: position.top
  })
}

/** Возвращает пороги в координатах сцены с учётом zoom. */
function createMovementSnapThresholds({
  zoom
}: {
  zoom: number
}): MovementSnapThresholds {
  return Object.freeze({
    acquire: SNAP_THRESHOLD / zoom,
    release: SNAP_THRESHOLD / zoom,
    spacingRelease: (SNAP_THRESHOLD + SPACING_SNAP_HOLD_MARGIN) / zoom,
    verification: MOVEMENT_SNAP_VERIFICATION_EPSILON
  })
}

/** Проверяет что переданный hold-state принадлежит текущему baseline. */
function assertMovementHoldState({
  baseline,
  holdState
}: {
  baseline: MovementGestureBaseline
  holdState: MovementHoldState
}): void {
  assertAxisHold({ axis: 'x', baseline, hold: holdState.x })
  assertAxisHold({ axis: 'y', baseline, hold: holdState.y })
}

/** Проверяет candidate и active anchor одной удерживаемой оси. */
function assertAxisHold({
  axis,
  baseline,
  hold
}: {
  axis: MovementSceneAxis
  baseline: MovementGestureBaseline
  hold: MovementAxisHold
}): void {
  if (hold.kind === 'free') return
  if (hold.kind === 'spacing') {
    if (!hold.candidateId.trim()
      || !Number.isFinite(hold.context.distance)
      || hold.context.distance < 0) {
      throw new Error(`Movement hold state contains an invalid ${axis} spacing constraint`)
    }

    return
  }
  if (hold.candidate.axis !== axis || resolveAnchorAxis({ anchor: hold.activeAnchor }) !== axis) {
    throw new Error(`Movement hold state contains an invalid ${axis} constraint`)
  }

  const candidate = baseline.candidates[hold.candidate.snapshotIndex]
  if (!candidate || candidate.id !== hold.candidate.id || candidate.position !== hold.candidate.position) {
    throw new Error('Movement hold state candidate does not belong to the active baseline')
  }
}

/** Возвращает ось именованной опорной точки bounds. */
function resolveAnchorAxis({
  anchor
}: {
  anchor: MovementBoundsAnchor
}): MovementSceneAxis {
  return anchor === 'left' || anchor === 'centerX' || anchor === 'right' ? 'x' : 'y'
}

/** Проверяет неизменность ширины и высоты во время translation. */
function areBoundsDimensionsEqual({
  first,
  second,
  epsilon
}: {
  first: Bounds
  second: Bounds
  epsilon: number
}): boolean {
  const firstWidth = first.right - first.left
  const firstHeight = first.bottom - first.top
  const secondWidth = second.right - second.left
  const secondHeight = second.bottom - second.top

  return Math.abs(firstWidth - secondWidth) <= epsilon
    && Math.abs(firstHeight - secondHeight) <= epsilon
}

/** Копирует и замораживает выбранные spacing-варианты вместе с их identity. */
function freezeSpacingSelections({
  selections
}: {
  selections: readonly ResolvedSpacingSelection[]
}): readonly ResolvedSpacingSelection[] {
  return Object.freeze(selections.map((selection) => {
    const { identity } = selection

    return Object.freeze({
      guide: Object.freeze({ ...selection.guide }),
      identity: Object.freeze({
        kind: identity.kind,
        side: identity.side,
        before: identity.before
          ? createExactBoundsSnapshot({ bounds: identity.before })
          : null,
        after: identity.after
          ? createExactBoundsSnapshot({ bounds: identity.after })
          : null,
        pattern: identity.pattern
          ? Object.freeze({ ...identity.pattern })
          : null
      }),
      isPrimary: selection.isPrimary
    })
  }))
}

/** Копирует один выбранный spacing-контекст. */
function freezeSpacingContext({
  context
}: {
  context: SpacingSelectionContext | null
}): SpacingSelectionContext | null {
  if (!context) return null

  return Object.freeze({
    side: context.side,
    kind: context.kind,
    distance: context.distance
  })
}

/** Преобразует подтверждённые movement-guide в формат renderer-а. */
export function createMovementGuideLines({
  guides
}: {
  guides: readonly VerifiedMovementGuide[]
}): GuideLine[] {
  return guides.map(({ axis, position }) => ({
    type: axis === 'x' ? 'vertical' : 'horizontal',
    position
  }))
}
