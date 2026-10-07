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

/** Returns the cross-axis tolerance for new or held snapping. */
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

/** Keeps only equal-spacing options applicable to the given bounds. */
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

/** Verified guides and a flag indicating a common axis for the complete chain. */
type VerifiedSpacingGuides = Readonly<{
  guides: readonly SpacingGuide[]
  usesChainAxis: boolean
}>

/** Returns the complete chain or individual guides for the selected correction. */
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

/** Adds verified guides using the object's actual cross-axis position. */
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
