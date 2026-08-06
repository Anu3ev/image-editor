/* eslint-disable no-use-before-define -- Публичная функция расположена перед внутренними расчётами. */
import { MOVE_SNAP_STEP } from '../constants'
import type { Bounds, SpacingGuide } from '../types'
import type { MovementSceneAxis } from './movement-snap-candidates'
import type { MovementGestureBaseline } from './movement-snapping-resolver'
import type {
  ResolvedSpacingSelection,
  SpacingSelectionIdentity
} from './spacing'
import {
  ACTIVE_MOVEMENT_SPACING_SOURCE_ID,
  movementSpacingChainIncludesPattern,
  movementSpacingChainIncludesSource,
  type MovementSpacingChain
} from './spacing-chains'

/** Допуск сравнения двух точных коррекций. */
export const MOVEMENT_CORRECTION_COMPARISON_EPSILON = 0.000000001

/** Точная коррекция и цепочка, выбранные для одного ограничения равноудалённости. */
export type ResolvedMovementSpacingCorrection = Readonly<{
  chain: MovementSpacingChain | null
  delta: number
  selections: readonly ResolvedSpacingSelection[]
}>

/** Выбирает точную коррекцию существующей цепочки или отдельного интервала. */
export function resolveMovementSpacingCorrection({
  axis,
  baseline,
  bounds,
  threshold,
  selections,
  primarySelection
}: {
  axis: MovementSceneAxis
  baseline: MovementGestureBaseline
  bounds: Bounds
  threshold: number
  selections: readonly ResolvedSpacingSelection[]
  primarySelection: ResolvedSpacingSelection
}): ResolvedMovementSpacingCorrection {
  const chain = resolveExistingMovementSpacingChain({
    axis,
    baseline,
    bounds,
    threshold,
    primarySelection
  })
  const delta = chain
    ? resolveBaselineSpacingDelta({ axis, baseline, bounds })
    : resolveExactSpacingDelta({ axis, bounds, identity: primarySelection.identity })
  const exactSelections = resolveExactSpacingSelections({
    axis,
    bounds,
    selections,
    exactDelta: delta,
    spacingChain: chain
  })
  if (!exactSelections.length) {
    throw new Error('Movement spacing constraint must keep its primary interval')
  }

  return Object.freeze({ chain, delta, selections: exactSelections })
}

/** Находит исходную цепочку, если объект всё ещё рядом со своим начальным положением. */
function resolveExistingMovementSpacingChain({
  axis,
  baseline,
  bounds,
  threshold,
  primarySelection
}: {
  axis: MovementSceneAxis
  baseline: MovementGestureBaseline
  bounds: Bounds
  threshold: number
  primarySelection: ResolvedSpacingSelection
}): MovementSpacingChain | null {
  const chains = axis === 'x' ? baseline.spacingChains.horizontal : baseline.spacingChains.vertical
  const chain = findMovementSpacingChainForSelection({
    chains,
    selection: primarySelection
  })
  if (!chain) return null

  const startEdge = axis === 'x' ? 'left' : 'top'
  const distanceFromInitialPosition = Math.abs(baseline.bounds[startEdge] - bounds[startEdge])

  return distanceFromInitialPosition <= threshold + MOVEMENT_CORRECTION_COMPARISON_EPSILON
    ? chain
    : null
}

/** Находит цепочку активного объекта, которой принадлежит основной выбранный интервал. */
function findMovementSpacingChainForSelection({
  chains,
  selection
}: {
  chains: readonly MovementSpacingChain[]
  selection: ResolvedSpacingSelection
}): MovementSpacingChain | null {
  for (const chain of chains) {
    const includesActive = movementSpacingChainIncludesSource({
      chain,
      sourceId: ACTIVE_MOVEMENT_SPACING_SOURCE_ID
    })
    if (!includesActive) continue

    const { pattern } = selection.identity
    if (pattern && movementSpacingChainIncludesPattern({ chain, pattern })) return chain
    if (!pattern && movementSpacingChainIncludesCenteredSelection({ chain, selection })) return chain
  }

  return null
}

/** Проверяет, что оба интервала центрированного варианта входят в одну цепочку. */
function movementSpacingChainIncludesCenteredSelection({
  chain,
  selection
}: {
  chain: MovementSpacingChain
  selection: ResolvedSpacingSelection
}): boolean {
  const { guide } = selection
  const includesBefore = chain.intervals.some((interval) => {
    return Math.abs(interval.start - guide.refStart) <= MOVEMENT_CORRECTION_COMPARISON_EPSILON
      && Math.abs(interval.end - guide.refEnd) <= MOVEMENT_CORRECTION_COMPARISON_EPSILON
  })
  const includesAfter = chain.intervals.some((interval) => {
    return Math.abs(interval.start - guide.activeStart) <= MOVEMENT_CORRECTION_COMPARISON_EPSILON
      && Math.abs(interval.end - guide.activeEnd) <= MOVEMENT_CORRECTION_COMPARISON_EPSILON
  })

  return includesBefore && includesAfter
}

/** Возвращает объект из существующей цепочки в положение начала перемещения. */
function resolveBaselineSpacingDelta({
  axis,
  baseline,
  bounds
}: {
  axis: MovementSceneAxis
  baseline: MovementGestureBaseline
  bounds: Bounds
}): number {
  const startEdge = axis === 'x' ? 'left' : 'top'

  return baseline.bounds[startEdge] - bounds[startEdge]
}

/** Рассчитывает точное смещение по выбранным соседям или опорному интервалу. */
function resolveExactSpacingDelta({
  axis,
  bounds,
  identity
}: {
  axis: MovementSceneAxis
  bounds: Bounds
  identity: SpacingSelectionIdentity
}): number {
  const startEdge = axis === 'x' ? 'left' : 'top'
  const endEdge = axis === 'x' ? 'right' : 'bottom'
  const { before, after, pattern } = identity

  if (identity.kind === 'center') {
    if (!before || !after) {
      throw new Error('Centered movement spacing requires both exact neighbours')
    }

    const targetSize = bounds[endEdge] - bounds[startEdge]
    const availableSpace = after[startEdge] - before[endEdge] - targetSize
    const expectedStart = before[endEdge] + (availableSpace / 2)

    return expectedStart - bounds[startEdge]
  }

  if (!pattern) {
    throw new Error('Reference movement spacing requires an exact pattern')
  }
  if (identity.side === 'before' && before) {
    return before[endEdge] + pattern.distance - bounds[startEdge]
  }
  if (identity.side === 'after' && after) {
    return after[startEdge] - pattern.distance - bounds[endEdge]
  }

  throw new Error('Reference movement spacing requires the selected exact neighbour')
}

/** Оставляет варианты, совместимые с точной позицией или исходной цепочкой. */
function resolveExactSpacingSelections({
  axis,
  bounds,
  selections,
  exactDelta,
  spacingChain
}: {
  axis: MovementSceneAxis
  bounds: Bounds
  selections: readonly ResolvedSpacingSelection[]
  exactDelta: number
  spacingChain: MovementSpacingChain | null
}): readonly ResolvedSpacingSelection[] {
  const exactSelections: ResolvedSpacingSelection[] = []

  for (const selection of selections) {
    const selectionDelta = resolveExactSpacingDelta({
      axis,
      bounds,
      identity: selection.identity
    })
    const matchesChainPattern = spacingChain && movementSpacingChainIncludesPattern({
      chain: spacingChain,
      pattern: selection.identity.pattern
    })
    const keepsChainPosition = spacingChain
      && Math.abs(selectionDelta - exactDelta) <= MOVE_SNAP_STEP + MOVEMENT_CORRECTION_COMPARISON_EPSILON

    if (spacingChain && !matchesChainPattern && !keepsChainPosition) continue
    if (!spacingChain
      && Math.abs(selectionDelta - exactDelta) > MOVEMENT_CORRECTION_COMPARISON_EPSILON) continue

    exactSelections.push(Object.freeze({
      ...selection,
      guide: createExactSpacingGuide({ axis, bounds, selection, exactDelta })
    }))
  }

  return Object.freeze(exactSelections)
}

/** Перестраивает концы направляющей по точным итоговым границам объекта. */
function createExactSpacingGuide({
  axis,
  bounds,
  selection,
  exactDelta
}: {
  axis: MovementSceneAxis
  bounds: Bounds
  selection: ResolvedSpacingSelection
  exactDelta: number
}): SpacingGuide {
  const { guide, identity } = selection
  const startEdge = axis === 'x' ? 'left' : 'top'
  const endEdge = axis === 'x' ? 'right' : 'bottom'
  const finalStart = bounds[startEdge] + exactDelta
  const finalEnd = bounds[endEdge] + exactDelta

  if (identity.kind === 'center') {
    return Object.freeze({
      ...guide,
      refEnd: finalStart,
      activeStart: finalEnd
    })
  }
  if (identity.side === 'before') {
    return Object.freeze({
      ...guide,
      activeEnd: finalStart
    })
  }

  return Object.freeze({
    ...guide,
    activeStart: finalEnd
  })
}
