import type { Bounds, SpacingGuide } from '../types'
import {
  createSpacingGuideGeometryKey,
  isSpacingSelectionApplicable,
  type ResolvedSpacingSelection
} from './spacing'
import {
  ACTIVE_MOVEMENT_SPACING_SOURCE_ID,
  createMovementSpacingChainGuides,
  findMovementSpacingChainById
} from './spacing-chains'
import type {
  MovementGestureBaseline,
  MovementSnapPlan,
  PlannedMovementSpacingConstraint
} from './movement-snapping-resolver'

/** Возвращает допуск по поперечной оси для нового или удерживаемого прилипания. */
function resolveSpacingSelectionTolerance({
  constraint,
  baseline
}: {
  constraint: PlannedMovementSpacingConstraint
  baseline: MovementGestureBaseline
}): number {
  return constraint.transition === 'held'
    ? baseline.thresholds.spacingRelease
    : baseline.thresholds.acquire
}

/** Оставляет только варианты равноудалённости, применимые к заданным границам. */
export function resolveApplicableMovementSpacingSelections({
  constraint,
  baseline,
  bounds
}: {
  constraint: PlannedMovementSpacingConstraint
  baseline: MovementGestureBaseline
  bounds: Bounds
}): readonly ResolvedSpacingSelection[] {
  const tolerance = resolveSpacingSelectionTolerance({ constraint, baseline })

  return constraint.selections.filter((selection) => {
    return isSpacingSelectionApplicable({
      selection,
      activeBounds: bounds,
      candidates: baseline.spacingBounds,
      tolerance
    })
  })
}

/** Проверенные направляющие и признак общей оси полной цепочки. */
type VerifiedSpacingGuides = Readonly<{
  guides: readonly SpacingGuide[]
  usesChainAxis: boolean
}>

/** Возвращает полную цепочку или отдельные направляющие выбранной коррекции. */
function resolveVerifiedSpacingGuides({
  baseline,
  bounds,
  constraint
}: {
  baseline: MovementGestureBaseline
  bounds: Bounds
  constraint: PlannedMovementSpacingConstraint
}): VerifiedSpacingGuides {
  const selections = resolveApplicableMovementSpacingSelections({ constraint, baseline, bounds })
  const primarySelection = selections.find(({ isPrimary }) => isPrimary)
  const spacingChain = findMovementSpacingChainById({
    chains: baseline.spacingChains,
    chainId: constraint.chainId
  })
  if (!primarySelection || !spacingChain) {
    return Object.freeze({
      guides: Object.freeze(selections.map(({ guide }) => guide)),
      usesChainAxis: false
    })
  }

  const chainGuides = createMovementSpacingChainGuides({
    chain: spacingChain,
    activeSourceId: ACTIVE_MOVEMENT_SPACING_SOURCE_ID,
    activeBounds: bounds
  })

  if (chainGuides.length) {
    return Object.freeze({ guides: Object.freeze(chainGuides), usesChainAxis: true })
  }

  return Object.freeze({
    guides: Object.freeze(selections.map(({ guide }) => guide)),
    usesChainAxis: false
  })
}

/** Добавляет проверенные направляющие с фактическим положением объекта по поперечной оси. */
export function appendVerifiedMovementSpacingGuides({
  baseline,
  bounds,
  guides,
  constraint,
  plan
}: {
  baseline: MovementGestureBaseline
  bounds: Bounds
  guides: SpacingGuide[]
  constraint: PlannedMovementSpacingConstraint
  plan: MovementSnapPlan
}): void {
  const verified = resolveVerifiedSpacingGuides({ baseline, bounds, constraint })
  let crossAxisDelta = 0

  if (!verified.usesChainAxis) {
    crossAxisDelta = constraint.axis === 'x'
      ? bounds.centerY - plan.predictedBounds.centerY
      : bounds.centerX - plan.predictedBounds.centerX
  }

  const seenGuideKeys = new Set(guides.map((guide) => {
    return createSpacingGuideGeometryKey({ guide })
  }))

  for (const guide of verified.guides) {
    const adjustedGuide = Object.freeze({
      ...guide,
      axis: guide.axis + crossAxisDelta
    })
    const guideKey = createSpacingGuideGeometryKey({ guide: adjustedGuide })
    if (seenGuideKeys.has(guideKey)) continue

    seenGuideKeys.add(guideKey)
    guides.push(adjustedGuide)
  }
}
