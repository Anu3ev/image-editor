import { english, type Translate } from '../../i18n'
import {
  MAX_DISPLAY_DISTANCE_DIFF,
  resolveDisplayDistance
} from '../../utils/distance'
import type {
  Bounds,
  SpacingGuide,
  SpacingPattern
} from '../types'

/** Object in the sorted neighbor list, marked if it is the active object. */
type SpacingItem = {
  bounds: Bounds
  isActive: boolean
}

/** Interval selection preserved between consecutive movement events. */
export type SpacingSelectionContext = {
  side: 'before' | 'center' | 'after'
  kind: 'reference' | 'center'
  distance: number
}

/** Saved interval selection for both axes. */
export type SpacingContextByAxis = {
  vertical: SpacingSelectionContext | null
  horizontal: SpacingSelectionContext | null
}

/** Stable neighbors and reference pattern for one selected spacing option. */
export type SpacingSelectionIdentity = Readonly<{
  kind: SpacingSelectionContext['kind']
  side: SpacingSelectionContext['side']
  before: Bounds | null
  after: Bounds | null
  pattern: SpacingPattern | null
}>

/** Selected spacing option and its role in the published guide set. */
export type ResolvedSpacingSelection = Readonly<{
  guide: SpacingGuide
  identity: SpacingSelectionIdentity
  isPrimary: boolean
}>

/** Active interval position relative to the selected reference distance pattern. */
type SpacingOptionSide = SpacingSelectionContext['side']

/** Option source: an existing interval or the center between neighbors. */
type SpacingOptionKind = SpacingSelectionContext['kind']

/** One valid equal-spacing snap option. */
type SpacingOption = {
  delta: number
  guide: SpacingGuide
  diff: number
  side: SpacingOptionSide
  kind: SpacingOptionKind
  contextDistance: number
  identity: SpacingSelectionIdentity
}

/** Tolerance only for errors in equivalent calculations of the same exact offset. */
const SPACING_OPTION_DELTA_EPSILON = 1e-9

/**
 * Returns the overlap length of two segments on an axis.
 * A positive value means overlap, 0 means contact, and a negative value means a gap.
 */
const getAxisOverlap = ({
  firstStart,
  firstEnd,
  secondStart,
  secondEnd
}: {
  firstStart: number
  firstEnd: number
  secondStart: number
  secondEnd: number
}): number => Math.min(firstEnd, secondEnd) - Math.max(firstStart, secondStart)

/**
 * Returns the start and end coordinates along the selected axis.
 */
const resolveBoundsEdges = ({
  bounds,
  axis
}: {
  bounds: Bounds
  axis: 'horizontal' | 'vertical'
}): { start: number; end: number } => {
  const {
    left = 0,
    right = 0,
    top = 0,
    bottom = 0
  } = bounds

  if (axis === 'vertical') {
    return {
      start: top,
      end: bottom
    }
  }

  return {
    start: left,
    end: right
  }
}

/**
 * Sorts items in place along the selected axis.
 */
const sortSpacingItems = ({
  items,
  axis
}: {
  items: SpacingItem[]
  axis: 'left' | 'top'
}): void => {
  for (let index = 1; index < items.length; index += 1) {
    const currentItem = items[index]
    const { bounds: currentBounds } = currentItem
    const currentValue = currentBounds[axis]
    let insertIndex = index - 1

    while (insertIndex >= 0) {
      const compareItem = items[insertIndex]
      const { bounds: compareBounds } = compareItem
      const compareValue = compareBounds[axis]
      if (compareValue <= currentValue) break
      items[insertIndex + 1] = compareItem
      insertIndex -= 1
    }

    items[insertIndex + 1] = currentItem
  }
}

/**
 * Finds the nearest neighbor with a positive gap along the selected axis.
 */
const findNeighborIndex = ({
  items,
  index,
  axis,
  direction
}: {
  items: SpacingItem[]
  index: number
  axis: 'horizontal' | 'vertical'
  direction: 'prev' | 'next'
}): number | null => {
  const activeItem = items[index]
  if (!activeItem) return null

  const { bounds: activeBounds } = activeItem
  const { start: activeStart, end: activeEnd } = resolveBoundsEdges({
    bounds: activeBounds,
    axis
  })

  if (direction === 'prev') {
    for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
      const candidate = items[cursor]
      if (!candidate) continue

      const { bounds: candidateBounds } = candidate
      const { end: candidateEnd } = resolveBoundsEdges({
        bounds: candidateBounds,
        axis
      })

      const distance = activeStart - candidateEnd
      if (distance >= 0) return cursor
    }

    return null
  }

  for (let cursor = index + 1; cursor < items.length; cursor += 1) {
    const candidate = items[cursor]
    if (!candidate) continue

    const { bounds: candidateBounds } = candidate
    const { start: candidateStart } = resolveBoundsEdges({
      bounds: candidateBounds,
      axis
    })

    const distance = candidateStart - activeEnd
    if (distance >= 0) return cursor
  }

  return null
}

/**
 * Returns the active item's index in the list.
 */
const findActiveItemIndex = ({
  items
}: {
  items: SpacingItem[]
}): number => {
  for (let index = 0; index < items.length; index += 1) {
    const { isActive } = items[index]
    if (isActive) return index
  }

  return -1
}

/** Result of finding a position between two neighboring objects. */
type EqualSpacingCandidate = {
  delta: number
  distance: number
  diff: number
  activeStart: number
  activeEnd: number
}

/** Axis along which intervals are compared. */
type SpacingAxis = SpacingGuide['type']

/** Nearest non-overlapping neighbors of the active object. */
type SpacingNeighbors = {
  before: Bounds | null
  after: Bounds | null
}

/** Object geometry in the selected axis coordinates. */
type AxisSpacingGeometry = {
  start: number
  end: number
  crossStart: number
  crossEnd: number
  guideAxis: number
}

/** Equal-spacing calculation parameters for one axis. */
type CalculateAxisSpacingParams = {
  t?: Translate
  activeBounds: Bounds
  candidates: Bounds[]
  threshold: number
  patterns: SpacingPattern[]
  previousContext?: SpacingSelectionContext | null
  switchDistance?: number
  axis: SpacingAxis
}

/** Public parameters for vertical or horizontal equal-spacing calculation. */
type CalculateSpacingParams = {
  t?: Translate
  activeBounds: Bounds
  candidates: Bounds[]
  threshold: number
  patterns: SpacingPattern[]
  previousContext?: SpacingSelectionContext | null
  switchDistance?: number
}

/** Equal-spacing calculation result for one axis. */
type SpacingCalculationResult = {
  delta: number
  guides: SpacingGuide[]
  context: SpacingSelectionContext | null
  selections: ResolvedSpacingSelection[]
}

/** Candidate for snapping to an existing interval. */
type ReferenceSpacingCandidate = {
  delta: number
  distance: number
  diff: number
  adjustedStart: number
  adjustedEnd: number
}

/** Parameters for checking one existing interval. */
type ResolveReferenceSpacingOptionParams = {
  t?: Translate
  activeBounds: Bounds
  neighbors: SpacingNeighbors
  pattern: SpacingPattern
  axis: SpacingAxis
  threshold: number
}

/** Data for creating an option based on an existing interval. */
type ReferenceSpacingOptionContext = {
  active: AxisSpacingGeometry
  neighbor: AxisSpacingGeometry
  neighborBounds: Bounds
  pattern: SpacingPattern
  candidate: ReferenceSpacingCandidate
  axis: SpacingAxis
  side: Exclude<SpacingOptionSide, 'center'>
}

/**
 * Checks whether the original interval's line runs alongside the active object.
 */
const isPatternAxisAlignedWithActiveRange = ({
  patternAxis,
  activeRangeStart,
  activeRangeEnd,
  tolerance = 0
}: {
  patternAxis: number
  activeRangeStart: number
  activeRangeEnd: number
  tolerance?: number
}): boolean => {
  const minRange = Math.min(activeRangeStart, activeRangeEnd)
  const maxRange = Math.max(activeRangeStart, activeRangeEnd)

  return patternAxis >= minRange - tolerance && patternAxis <= maxRange + tolerance
}

/**
 * Determines which side of the active object contains the original interval.
 */
const resolveReferencePatternSide = ({
  patternStart,
  patternEnd,
  activeStart,
  activeEnd
}: {
  patternStart: number
  patternEnd: number
  activeStart: number
  activeEnd: number
}): Exclude<SpacingOptionSide, 'center'> | null => {
  if (patternEnd <= activeStart) return 'before'
  if (patternStart >= activeEnd) return 'after'

  return null
}

/**
 * Checks that options lead to the same exact position and show the same distance.
 */
const areSpacingOptionsCompatible = ({
  baseOption,
  candidateOption
}: {
  baseOption: SpacingOption
  candidateOption: SpacingOption
}): boolean => {
  const {
    delta: baseDelta,
    guide: { distance: baseDistance }
  } = baseOption
  const {
    delta: candidateDelta,
    guide: { distance: candidateDistance }
  } = candidateOption

  const deltaDifference = Math.abs(baseDelta - candidateDelta)

  return deltaDifference <= SPACING_OPTION_DELTA_EPSILON
    && baseDistance === candidateDistance
}

/**
 * Selects the option with the smallest distance discrepancy and smaller offset.
 */
const resolveBestSpacingOption = ({
  options
}: {
  options: SpacingOption[]
}): SpacingOption => {
  let bestOption = options[0]

  for (let index = 1; index < options.length; index += 1) {
    const option = options[index]
    if (option.diff < bestOption.diff) {
      bestOption = option
      continue
    }

    if (option.diff !== bestOption.diff) continue

    const optionDelta = Math.abs(option.delta)
    const bestDelta = Math.abs(bestOption.delta)
    if (optionDelta < bestDelta) {
      bestOption = option
    }
  }

  return bestOption
}

/**
 * Checks whether the next option belongs to a closer neighborhood of the object.
 */
const shouldReplaceContextOption = ({
  currentOption,
  nextOption
}: {
  currentOption: SpacingOption | null
  nextOption: SpacingOption
}): boolean => {
  if (!currentOption) return true

  const { contextDistance: currentContextDistance, diff: currentDiff, delta: currentDelta } = currentOption
  const { contextDistance: nextContextDistance, diff: nextDiff, delta: nextDelta } = nextOption

  if (nextContextDistance < currentContextDistance) return true
  if (nextContextDistance > currentContextDistance) return false

  if (nextDiff < currentDiff) return true
  if (nextDiff > currentDiff) return false

  return Math.abs(nextDelta) < Math.abs(currentDelta)
}

/**
 * Keeps the nearest existing interval on each side to remove options differing by 1 px.
 */
const resolveNearestReferenceOptions = ({
  options
}: {
  options: SpacingOption[]
}): SpacingOption[] => {
  const filteredOptions: SpacingOption[] = []
  let bestBeforeOption: SpacingOption | null = null
  let bestAfterOption: SpacingOption | null = null

  for (const option of options) {
    const { kind, side } = option

    if (kind !== 'reference') {
      filteredOptions.push(option)
      continue
    }

    if (side === 'before') {
      const shouldReplace = shouldReplaceContextOption({
        currentOption: bestBeforeOption,
        nextOption: option
      })
      if (shouldReplace) {
        bestBeforeOption = option
      }
    }

    if (side === 'after') {
      const shouldReplace = shouldReplaceContextOption({
        currentOption: bestAfterOption,
        nextOption: option
      })
      if (shouldReplace) {
        bestAfterOption = option
      }
    }
  }

  if (bestBeforeOption) {
    filteredOptions.push(bestBeforeOption)
  }

  if (bestAfterOption) {
    filteredOptions.push(bestAfterOption)
  }

  return filteredOptions
}

/**
 * Returns the best option on the selected side that is compatible with the primary option.
 */
const resolveBestSpacingOptionBySide = ({
  options,
  side,
  baseOption
}: {
  options: SpacingOption[]
  side: SpacingOptionSide
  baseOption: SpacingOption
}): SpacingOption | null => {
  let bestOption: SpacingOption | null = null

  for (const option of options) {
    if (option.side !== side) continue
    const isCompatible = areSpacingOptionsCompatible({
      baseOption,
      candidateOption: option
    })
    if (!isCompatible) continue

    if (!bestOption || option.diff < bestOption.diff) {
      bestOption = option
      continue
    }

    if (!bestOption || option.diff !== bestOption.diff) continue

    const optionDelta = Math.abs(option.delta)
    const bestDelta = Math.abs(bestOption.delta)
    if (optionDelta < bestDelta) {
      bestOption = option
    }
  }

  return bestOption
}

/**
 * Saves the selected option to hold it through subsequent steps.
 */
const resolveSpacingContextFromOption = ({
  option
}: {
  option: SpacingOption
}): SpacingSelectionContext => {
  const {
    side,
    kind,
    guide: { distance }
  } = option

  return {
    side,
    kind,
    distance
  }
}

/**
 * Checks whether an option matches the previously saved selection.
 */
const isSpacingOptionMatchedByContext = ({
  option,
  context
}: {
  option: SpacingOption
  context: SpacingSelectionContext
}): boolean => {
  const {
    side: contextSide,
    kind: contextKind,
    distance: contextDistance
  } = context
  const {
    side: optionSide,
    kind: optionKind,
    guide: { distance: optionDistance }
  } = option

  if (contextSide !== optionSide || contextKind !== optionKind) return false

  const distanceDiff = Math.abs(optionDistance - contextDistance)

  return distanceDiff <= MAX_DISPLAY_DISTANCE_DIFF
}

/**
 * Finds the snap option matching the previously saved selection.
 */
const resolveSpacingOptionByContext = ({
  options,
  context
}: {
  options: SpacingOption[]
  context: SpacingSelectionContext | null
}): SpacingOption | null => {
  if (!context) return null

  for (const option of options) {
    const isMatched = isSpacingOptionMatchedByContext({
      option,
      context
    })

    if (isMatched) return option
  }

  return null
}

/**
 * Returns the primary option, accounting for the interval switching threshold.
 */
const resolvePrimarySpacingOption = ({
  options,
  bestOption,
  previousContext,
  switchDistance = 0
}: {
  options: SpacingOption[]
  bestOption: SpacingOption
  previousContext: SpacingSelectionContext | null
  switchDistance?: number
}): SpacingOption => {
  const previousOption = resolveSpacingOptionByContext({
    options,
    context: previousContext
  })
  if (!previousOption) return bestOption

  const normalizedSwitchDistance = Math.max(0, switchDistance)
  if (normalizedSwitchDistance === 0) return bestOption

  const deltaDistance = Math.abs(bestOption.delta - previousOption.delta)
  if (deltaDistance >= normalizedSwitchDistance) return bestOption

  return previousOption
}

/**
 * Creates a stable key for the complete spacing guide geometry.
 */
export const createSpacingGuideGeometryKey = ({
  guide
}: {
  guide: SpacingGuide
}): string => {
  const {
    type,
    axis,
    refStart,
    refEnd,
    activeStart,
    activeEnd,
    distance
  } = guide

  return `${type}:${axis}:${refStart}:${refEnd}:${activeStart}:${activeEnd}:${distance}`
}

/**
 * Adds a guide without duplicates in geometry and distance.
 */
const pushUniqueSpacingGuide = ({
  guides,
  seenGuideKeys,
  guide
}: {
  guides: SpacingGuide[]
  seenGuideKeys: Set<string>
  guide: SpacingGuide
}): void => {
  const key = createSpacingGuideGeometryKey({ guide })
  if (seenGuideKeys.has(key)) return

  seenGuideKeys.add(key)
  guides.push(guide)
}

/**
 * Selects intervals compatible with the primary snap option.
 */
const resolveRelatedSpacingOptions = ({
  resolvedOptions,
  prioritizedOptions,
  primaryOption,
  hasReferenceOptions
}: {
  resolvedOptions: SpacingOption[]
  prioritizedOptions: SpacingOption[]
  primaryOption: SpacingOption
  hasReferenceOptions: boolean
}): SpacingOption[] => {
  const beforeOption = resolveBestSpacingOptionBySide({
    options: prioritizedOptions,
    side: 'before',
    baseOption: primaryOption
  })
  const afterOption = resolveBestSpacingOptionBySide({
    options: prioritizedOptions,
    side: 'after',
    baseOption: primaryOption
  })
  const centerOption = resolveBestSpacingOptionBySide({
    options: hasReferenceOptions ? resolvedOptions : prioritizedOptions,
    side: 'center',
    baseOption: primaryOption
  })

  if (beforeOption && afterOption) return [beforeOption, afterOption]

  const selectedOptions = [primaryOption]

  if (primaryOption.side === 'before' && afterOption) selectedOptions.push(afterOption)
  if (primaryOption.side === 'after' && beforeOption) selectedOptions.push(beforeOption)

  if (primaryOption.side === 'center' && beforeOption) selectedOptions.push(beforeOption)
  if (primaryOption.side === 'center' && afterOption) selectedOptions.push(afterOption)

  if (hasReferenceOptions && primaryOption.side !== 'center' && centerOption) {
    selectedOptions.push(centerOption)
  }

  return selectedOptions
}

/** Returns unique guides for the selected snap options. */
const createSpacingGuides = ({
  selectedOptions
}: {
  selectedOptions: SpacingOption[]
}): SpacingGuide[] => {
  const guides: SpacingGuide[] = []
  const seenGuideKeys = new Set<string>()

  for (const option of selectedOptions) {
    pushUniqueSpacingGuide({ guides, seenGuideKeys, guide: option.guide })
  }

  return guides
}

/** Associates each displayed option with its identity and marks the primary correction. */
const createResolvedSpacingSelections = ({
  selectedOptions,
  primaryOption
}: {
  selectedOptions: SpacingOption[]
  primaryOption: SpacingOption
}): ResolvedSpacingSelection[] => {
  return selectedOptions.map((option) => ({
    guide: option.guide,
    identity: option.identity,
    isPrimary: option === primaryOption
  }))
}

/**
 * Builds equal-spacing guides without mixing different distances.
 */
const resolveSpacingResult = ({
  options,
  previousContext = null,
  switchDistance = 0
}: {
  options: SpacingOption[]
  previousContext?: SpacingSelectionContext | null
  switchDistance?: number
}): SpacingCalculationResult => {
  if (!options.length) {
    return {
      delta: 0,
      guides: [],
      context: null,
      selections: []
    }
  }

  const resolvedOptions = resolveNearestReferenceOptions({ options })
  const referenceOptions: SpacingOption[] = []
  for (const option of resolvedOptions) {
    if (option.kind !== 'reference') continue
    referenceOptions.push(option)
  }
  const hasReferenceOptions = referenceOptions.length > 0
  const prioritizedOptions = hasReferenceOptions ? referenceOptions : resolvedOptions

  const bestOption = resolveBestSpacingOption({ options: prioritizedOptions })
  const primaryOption = resolvePrimarySpacingOption({
    options: prioritizedOptions,
    bestOption,
    previousContext,
    switchDistance
  })
  const selectedOptions = resolveRelatedSpacingOptions({
    resolvedOptions,
    prioritizedOptions,
    primaryOption,
    hasReferenceOptions
  })

  return {
    delta: primaryOption.delta,
    guides: createSpacingGuides({ selectedOptions }),
    context: resolveSpacingContextFromOption({
      option: primaryOption
    }),
    selections: createResolvedSpacingSelections({
      selectedOptions,
      primaryOption
    })
  }
}

/** Returns object bounds in the selected axis coordinates. */
const resolveAxisSpacingGeometry = ({
  bounds,
  axis
}: {
  bounds: Bounds
  axis: SpacingAxis
}): AxisSpacingGeometry => {
  const { left, right, top, bottom, centerX, centerY } = bounds

  if (axis === 'vertical') {
    return {
      start: top,
      end: bottom,
      crossStart: left,
      crossEnd: right,
      guideAxis: centerX
    }
  }

  return {
    start: left,
    end: right,
    crossStart: top,
    crossEnd: bottom,
    guideAxis: centerY
  }
}

/** Copies the stable neighbor identity and reference pattern of the selected option. */
const createSpacingSelectionIdentity = ({
  kind,
  side,
  before = null,
  after = null,
  pattern = null
}: {
  kind: SpacingOptionKind
  side: SpacingOptionSide
  before?: Bounds | null
  after?: Bounds | null
  pattern?: SpacingPattern | null
}): SpacingSelectionIdentity => ({
  kind,
  side,
  before: before ? { ...before } : null,
  after: after ? { ...after } : null,
  pattern: pattern ? { ...pattern } : null
})

/** Checks object overlap on the perpendicular axis. */
const isBoundsAligned = ({
  activeGeometry,
  candidateBounds,
  axis
}: {
  activeGeometry: AxisSpacingGeometry
  candidateBounds: Bounds
  axis: SpacingAxis
}): boolean => {
  const candidateGeometry = resolveAxisSpacingGeometry({ bounds: candidateBounds, axis })
  const overlap = getAxisOverlap({
    firstStart: activeGeometry.crossStart,
    firstEnd: activeGeometry.crossEnd,
    secondStart: candidateGeometry.crossStart,
    secondEnd: candidateGeometry.crossEnd
  })

  return overlap > 0
}

/** Finds the active object's nearest neighbors along the selected axis. */
const resolveSpacingNeighbors = ({
  activeBounds,
  candidates,
  axis
}: {
  activeBounds: Bounds
  candidates: readonly Bounds[]
  axis: SpacingAxis
}): SpacingNeighbors | null => {
  const activeGeometry = resolveAxisSpacingGeometry({ bounds: activeBounds, axis })
  const items: SpacingItem[] = []

  for (const bounds of candidates) {
    if (!isBoundsAligned({ activeGeometry, candidateBounds: bounds, axis })) continue
    items.push({ bounds, isActive: false })
  }

  if (!items.length) return null

  items.push({ bounds: activeBounds, isActive: true })
  sortSpacingItems({ items, axis: axis === 'vertical' ? 'top' : 'left' })

  const activeIndex = findActiveItemIndex({ items })
  if (activeIndex === -1) return null

  const beforeIndex = findNeighborIndex({ items, index: activeIndex, axis, direction: 'prev' })
  const afterIndex = findNeighborIndex({ items, index: activeIndex, axis, direction: 'next' })

  return {
    before: beforeIndex === null ? null : items[beforeIndex].bounds,
    after: afterIndex === null ? null : items[afterIndex].bounds
  }
}

/** Compares the exact bounds of the selected and current nearest neighbor. */
const areSpacingBoundsEqual = ({
  first,
  second
}: {
  first: Bounds | null
  second: Bounds | null
}): boolean => {
  if (!first || !second) return first === second

  return first.left === second.left
    && first.right === second.right
    && first.top === second.top
    && first.bottom === second.bottom
    && first.centerX === second.centerX
    && first.centerY === second.centerY
}

/**
 * Verifies that the saved spacing option still uses the same nearest neighbors.
 */
export const isSpacingSelectionApplicable = ({
  selection,
  activeBounds,
  candidates,
  tolerance
}: {
  selection: ResolvedSpacingSelection
  activeBounds: Bounds
  candidates: readonly Bounds[]
  tolerance: number
}): boolean => {
  const { identity, guide } = selection
  const neighbors = resolveSpacingNeighbors({
    activeBounds,
    candidates,
    axis: guide.type
  })
  if (!neighbors) return false

  if (identity.kind === 'center') {
    return identity.side === 'center'
      && areSpacingBoundsEqual({ first: neighbors.before, second: identity.before })
      && areSpacingBoundsEqual({ first: neighbors.after, second: identity.after })
  }

  const expectedNeighbor = identity.side === 'before' ? identity.before : identity.after
  const currentNeighbor = identity.side === 'before' ? neighbors.before : neighbors.after
  if (!areSpacingBoundsEqual({ first: currentNeighbor, second: expectedNeighbor })) return false

  const { pattern } = identity
  if (!pattern || pattern.type !== guide.type || identity.side === 'center') return false

  const active = resolveAxisSpacingGeometry({
    bounds: activeBounds,
    axis: guide.type
  })
  const side = resolveReferencePatternSide({
    patternStart: pattern.start,
    patternEnd: pattern.end,
    activeStart: active.start,
    activeEnd: active.end
  })
  if (side !== identity.side) return false

  return isPatternAxisAlignedWithActiveRange({
    patternAxis: pattern.axis,
    activeRangeStart: active.crossStart,
    activeRangeEnd: active.crossEnd,
    tolerance
  })
}

/** Returns the exact position between two neighboring objects. */
const resolveCenteredEqualSpacing = ({
  t = english,
  activeStart,
  activeEnd,
  beforeEdge,
  afterEdge,
  threshold
}: {
  t?: Translate
  activeStart: number
  activeEnd: number
  beforeEdge: number
  afterEdge: number
  threshold: number
}): EqualSpacingCandidate | null => {
  const activeSize = activeEnd - activeStart
  const availableSpace = afterEdge - beforeEdge - activeSize
  if (availableSpace < 0) return null

  const idealGap = availableSpace / 2
  const rawDelta = ((beforeEdge + afterEdge) - (activeStart + activeEnd)) / 2
  if (Math.abs(rawDelta) > threshold) return null

  return {
    delta: rawDelta,
    distance: resolveDisplayDistance({ t, distance: idealGap }),
    diff: 0,
    activeStart: activeStart + rawDelta,
    activeEnd: activeEnd + rawDelta
  }
}

/** Builds an option for snapping to the center between two neighbors. */
const resolveCenteredSpacingOption = ({
  t = english,
  activeBounds,
  neighbors,
  axis,
  threshold
}: {
  t?: Translate
  activeBounds: Bounds
  neighbors: SpacingNeighbors
  axis: SpacingAxis
  threshold: number
}): SpacingOption | null => {
  const { before, after } = neighbors
  if (!before || !after) return null

  const active = resolveAxisSpacingGeometry({ bounds: activeBounds, axis })
  const beforeGeometry = resolveAxisSpacingGeometry({ bounds: before, axis })
  const afterGeometry = resolveAxisSpacingGeometry({ bounds: after, axis })
  const availableSpace = afterGeometry.start - beforeGeometry.end - (active.end - active.start)
  if (availableSpace < 0) return null

  const idealGap = availableSpace / 2
  const currentDiff = Math.max(
    Math.abs(active.start - beforeGeometry.end - idealGap),
    Math.abs(afterGeometry.start - active.end - idealGap)
  )
  if (currentDiff > threshold) return null

  const centered = resolveCenteredEqualSpacing({
    t,
    activeStart: active.start,
    activeEnd: active.end,
    beforeEdge: beforeGeometry.end,
    afterEdge: afterGeometry.start,
    threshold
  })
  if (!centered) return null

  return {
    delta: centered.delta,
    guide: {
      type: axis,
      axis: active.guideAxis,
      refStart: beforeGeometry.end,
      refEnd: centered.activeStart,
      activeStart: centered.activeEnd,
      activeEnd: afterGeometry.start,
      distance: centered.distance
    },
    diff: centered.diff,
    side: 'center',
    kind: 'center',
    contextDistance: 0,
    identity: createSpacingSelectionIdentity({
      kind: 'center',
      side: 'center',
      before,
      after
    })
  }
}

/** Calculates the exact position needed to match an existing interval. */
const resolveReferenceSpacingCandidate = ({
  t = english,
  currentGap,
  referenceGap,
  gapDirection,
  activeStart,
  activeEnd,
  threshold
}: {
  t?: Translate
  currentGap: number
  referenceGap: number
  gapDirection: 1 | -1
  activeStart: number
  activeEnd: number
  threshold: number
}): ReferenceSpacingCandidate | null => {
  if (currentGap < 0 || referenceGap < 0) return null
  if (Math.abs(currentGap - referenceGap) > threshold) return null

  const gapDifference = referenceGap - currentGap
  const delta = gapDifference === 0 ? 0 : gapDifference / gapDirection
  if (Math.abs(delta) > threshold) return null

  const adjustedGap = currentGap + (delta * gapDirection)

  return {
    delta,
    distance: resolveDisplayDistance({ t, distance: referenceGap }),
    diff: Math.abs(adjustedGap - referenceGap),
    adjustedStart: activeStart + delta,
    adjustedEnd: activeEnd + delta
  }
}

/** Creates a snap option and guide for a verified interval. */
const createReferenceSpacingOption = ({
  active,
  neighbor,
  neighborBounds,
  pattern,
  candidate,
  axis,
  side
}: ReferenceSpacingOptionContext): SpacingOption => {
  const activeGuideStart = side === 'before' ? neighbor.end : candidate.adjustedEnd
  const activeGuideEnd = side === 'before' ? candidate.adjustedStart : neighbor.start
  const contextDistance = side === 'before'
    ? active.start - pattern.end
    : pattern.start - active.end

  return {
    delta: candidate.delta,
    guide: {
      type: axis,
      axis: active.guideAxis,
      refStart: pattern.start,
      refEnd: pattern.end,
      activeStart: activeGuideStart,
      activeEnd: activeGuideEnd,
      distance: candidate.distance
    },
    diff: candidate.diff,
    side,
    kind: 'reference',
    contextDistance,
    identity: createSpacingSelectionIdentity({
      kind: 'reference',
      side,
      before: side === 'before' ? neighborBounds : null,
      after: side === 'after' ? neighborBounds : null,
      pattern
    })
  }
}

/** Validates and builds a snap option for one existing interval. */
const resolveReferenceSpacingOption = ({
  t = english,
  activeBounds,
  neighbors,
  pattern,
  axis,
  threshold
}: ResolveReferenceSpacingOptionParams): SpacingOption | null => {
  if (pattern.type !== axis) return null

  const active = resolveAxisSpacingGeometry({ bounds: activeBounds, axis })
  const isAxisAligned = isPatternAxisAlignedWithActiveRange({
    patternAxis: pattern.axis,
    activeRangeStart: active.crossStart,
    activeRangeEnd: active.crossEnd,
    tolerance: threshold
  })
  if (!isAxisAligned) return null

  const side = resolveReferencePatternSide({
    patternStart: pattern.start,
    patternEnd: pattern.end,
    activeStart: active.start,
    activeEnd: active.end
  })
  if (!side) return null

  const neighborBounds = side === 'before' ? neighbors.before : neighbors.after
  if (!neighborBounds) return null

  const neighbor = resolveAxisSpacingGeometry({ bounds: neighborBounds, axis })
  const currentGap = side === 'before'
    ? active.start - neighbor.end
    : neighbor.start - active.end
  const gapDirection = side === 'before' ? 1 : -1
  const candidate = resolveReferenceSpacingCandidate({
    t,
    currentGap,
    referenceGap: pattern.distance,
    gapDirection,
    activeStart: active.start,
    activeEnd: active.end,
    threshold
  })
  if (!candidate) return null

  return createReferenceSpacingOption({
    active,
    neighbor,
    neighborBounds,
    pattern,
    candidate,
    axis,
    side
  })
}

/** Collects all valid equal-spacing options on one axis. */
const resolveAxisSpacingOptions = ({
  t = english,
  activeBounds,
  neighbors,
  patterns,
  axis,
  threshold
}: {
  t?: Translate
  activeBounds: Bounds
  neighbors: SpacingNeighbors
  patterns: SpacingPattern[]
  axis: SpacingAxis
  threshold: number
}): SpacingOption[] => {
  const options: SpacingOption[] = []
  const centeredOption = resolveCenteredSpacingOption({ t, activeBounds, neighbors, axis, threshold })
  if (centeredOption) options.push(centeredOption)

  for (const pattern of patterns) {
    const option = resolveReferenceSpacingOption({
      t,
      activeBounds,
      neighbors,
      pattern,
      axis,
      threshold
    })
    if (option) options.push(option)
  }

  return options
}

/** Calculates equal spacing on one axis. */
const calculateAxisSpacing = ({
  t = english,
  activeBounds,
  candidates,
  threshold,
  patterns,
  previousContext = null,
  switchDistance = 0,
  axis
}: CalculateAxisSpacingParams): SpacingCalculationResult => {
  const neighbors = resolveSpacingNeighbors({ activeBounds, candidates, axis })
  if (!neighbors) {
    return {
      delta: 0,
      guides: [],
      context: null,
      selections: []
    }
  }

  const options = resolveAxisSpacingOptions({
    t,
    activeBounds,
    neighbors,
    patterns,
    axis,
    threshold
  })

  return resolveSpacingResult({ options, previousContext, switchDistance })
}

/** Finds a suitable vertical equal-spacing snap option. */
export const calculateVerticalSpacing = (
  params: CalculateSpacingParams
): SpacingCalculationResult => calculateAxisSpacing({ ...params, axis: 'vertical' })

/** Finds a suitable horizontal equal-spacing snap option. */
export const calculateHorizontalSpacing = (
  params: CalculateSpacingParams
): SpacingCalculationResult => calculateAxisSpacing({ ...params, axis: 'horizontal' })

/**
 * Calculates the equal-spacing snap offset and a set of interval guides.
 */
export const calculateSpacingSnap = ({
  t = english,
  activeBounds,
  candidates,
  threshold,
  spacingPatterns,
  previousContexts,
  switchDistance = 0
}: {
  t?: Translate
  activeBounds: Bounds
  candidates: Bounds[]
  threshold: number
  spacingPatterns: { vertical: SpacingPattern[]; horizontal: SpacingPattern[] }
  previousContexts?: SpacingContextByAxis
  switchDistance?: number
}): {
  deltaX: number
  deltaY: number
  guides: SpacingGuide[]
  contexts: SpacingContextByAxis
} => {
  const {
    vertical: previousVerticalContext = null,
    horizontal: previousHorizontalContext = null
  } = previousContexts ?? {}

  const verticalResult = calculateVerticalSpacing({
    t,
    activeBounds,
    candidates,
    threshold,
    patterns: spacingPatterns.vertical,
    previousContext: previousVerticalContext,
    switchDistance
  })
  const horizontalResult = calculateHorizontalSpacing({
    t,
    activeBounds,
    candidates,
    threshold,
    patterns: spacingPatterns.horizontal,
    previousContext: previousHorizontalContext,
    switchDistance
  })

  const guides: SpacingGuide[] = []
  for (const guide of verticalResult.guides) {
    guides.push(guide)
  }
  for (const guide of horizontalResult.guides) {
    guides.push(guide)
  }

  return {
    deltaX: horizontalResult.delta,
    deltaY: verticalResult.delta,
    guides,
    contexts: {
      vertical: verticalResult.context,
      horizontal: horizontalResult.context
    }
  }
}
