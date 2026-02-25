import { MOVE_SNAP_STEP } from './constants'
import {
  MAX_DISPLAY_DISTANCE_DIFF,
  resolveCommonDisplayDistance
} from '../utils/distance'
import type {
  AnchorBuckets,
  Bounds,
  GuideLine,
  SpacingGuide,
  SpacingPattern
} from './types'

type SpacingItem = {
  bounds: Bounds
  isActive: boolean
}

export type SpacingSelectionContext = {
  side: 'before' | 'center' | 'after'
  kind: 'reference' | 'center'
  distance: number
}

export type SpacingContextByAxis = {
  vertical: SpacingSelectionContext | null
  horizontal: SpacingSelectionContext | null
}

type SpacingOptionSide = SpacingSelectionContext['side']
type SpacingOptionKind = SpacingSelectionContext['kind']

type SpacingOption = {
  delta: number
  guide: SpacingGuide
  diff: number
  side: SpacingOptionSide
  kind: SpacingOptionKind
  contextDistance: number
}

/**
 * Возвращает величину перекрытия двух отрезков на оси.
 * Положительное значение означает пересечение, 0 — касание, отрицательное — разрыв.
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
 * Возвращает количество знаков после запятой для шага сетки.
 */
const resolveStepPrecision = ({
  step
}: {
  step: number
}): number => {
  const normalizedStep = Math.abs(step)
  const stepString = normalizedStep.toString()
  const dotIndex = stepString.indexOf('.')

  if (dotIndex === -1) return 0

  const decimalPart = stepString.slice(dotIndex + 1)

  return decimalPart.length
}

/**
 * Приводит значение к ближайшему шагу сетки.
 */
const snapToStep = ({
  value,
  step
}: {
  value: number
  step: number
}): number => {
  if (step === 0) return value

  const precision = resolveStepPrecision({ step })
  const snappedValue = Math.round(value / step) * step

  return Number(snappedValue.toFixed(precision))
}

/**
 * Проверяет, что значение кратно шагу сетки.
 */
const isStepAligned = ({
  value,
  step
}: {
  value: number
  step: number
}): boolean => {
  if (step === 0) return true

  const snappedValue = snapToStep({ value, step })
  const precision = resolveStepPrecision({ step })
  const epsilon = 10 ** -(precision + 4)

  return Math.abs(snappedValue - value) <= epsilon
}

/**
 * Возвращает границы по выбранной оси в формате start/end.
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
 * Сортирует элементы по заданной оси без использования колбэков.
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
 * Ищет ближайшего соседа с положительным зазором по выбранной оси.
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
 * Возвращает индекс активного элемента в списке.
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

type EqualSpacingCandidate = {
  delta: number
  distance: number
  diff: number
  activeStart: number
  activeEnd: number
}

/**
 * Проверяет, попадает ли ось референсного паттерна в диапазон активного объекта.
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
 * Определяет сторону активного объекта, на которой находится референсный паттерн.
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
 * Проверяет, что два варианта привязки совместимы и описывают один и тот же display-паттерн.
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

  return baseDelta === candidateDelta && baseDistance === candidateDistance
}

/**
 * Выбирает лучший вариант по минимальной ошибке diff с учётом ближайшей дельты.
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
 * Возвращает true, если следующий вариант лучше текущего для одной стороны по приоритету близости контекста.
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
 * Оставляет только ближайший референсный контекст на каждой стороне, чтобы не было конкурирующих 1px-паттернов.
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
 * Возвращает лучший вариант по выбранной стороне, совместимый с базовым паттерном.
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
 * Преобразует вариант прилипания в контекст выбора для последующей стабилизации.
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
 * Проверяет, соответствует ли вариант сохранённому контексту выбора.
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
 * Находит вариант прилипания, соответствующий ранее выбранному контексту.
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
 * Возвращает основной вариант прилипания с учетом порога переключения контекста.
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
 * Добавляет guide в итог без дублей по геометрии и distance.
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
  const {
    type,
    axis,
    refStart,
    refEnd,
    activeStart,
    activeEnd,
    distance
  } = guide
  const key = `${type}:${axis}:${refStart}:${refEnd}:${activeStart}:${activeEnd}:${distance}`
  if (seenGuideKeys.has(key)) return

  seenGuideKeys.add(key)
  guides.push(guide)
}

/**
 * Формирует итоговые направляющие для равноудалённости без смешивания разных паттернов.
 */
const resolveSpacingResult = ({
  options,
  previousContext = null,
  switchDistance = 0
}: {
  options: SpacingOption[]
  previousContext?: SpacingSelectionContext | null
  switchDistance?: number
}): { delta: number; guides: SpacingGuide[]; context: SpacingSelectionContext | null } => {
  if (!options.length) {
    return {
      delta: 0,
      guides: [],
      context: null
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
  const centerOptionSource = hasReferenceOptions ? resolvedOptions : prioritizedOptions
  const centerOption = resolveBestSpacingOptionBySide({
    options: centerOptionSource,
    side: 'center',
    baseOption: primaryOption
  })

  const selectedOptions: SpacingOption[] = []
  if (beforeOption && afterOption) {
    selectedOptions.push(beforeOption, afterOption)
  } else {
    selectedOptions.push(primaryOption)

    if (primaryOption.side === 'before' && afterOption) {
      selectedOptions.push(afterOption)
    }

    if (primaryOption.side === 'after' && beforeOption) {
      selectedOptions.push(beforeOption)
    }

    if (primaryOption.side === 'center') {
      if (beforeOption && !afterOption) {
        selectedOptions.push(beforeOption)
      }

      if (afterOption && !beforeOption) {
        selectedOptions.push(afterOption)
      }
    }

    if (hasReferenceOptions && primaryOption.side === 'before' && !afterOption && centerOption) {
      selectedOptions.push(centerOption)
    }

    if (hasReferenceOptions && primaryOption.side === 'after' && !beforeOption && centerOption) {
      selectedOptions.push(centerOption)
    }
  }

  if (!selectedOptions.length && centerOption) {
    selectedOptions.push(centerOption)
  }

  const guides: SpacingGuide[] = []
  const seenGuideKeys = new Set<string>()
  for (const option of selectedOptions) {
    pushUniqueSpacingGuide({
      guides,
      seenGuideKeys,
      guide: option.guide
    })
  }

  return {
    delta: primaryOption.delta,
    guides,
    context: resolveSpacingContextFromOption({
      option: primaryOption
    })
  }
}

/**
 * Подбирает дельту для центрального равноудалённого прилипания на сетке шага.
 */
const resolveCenteredEqualSpacing = ({
  activeStart,
  activeEnd,
  targetGap,
  beforeEdge,
  afterEdge,
  threshold,
  step
}: {
  activeStart: number
  activeEnd: number
  targetGap: number
  beforeEdge: number
  afterEdge: number
  threshold: number
  step: number
}): EqualSpacingCandidate | null => {
  const rawDelta = targetGap - (activeStart - beforeEdge)
  const snappedDelta = snapToStep({ value: rawDelta, step })
  const stepCount = Math.max(1, Math.ceil(threshold / Math.max(step, 1)))

  let bestCandidate: EqualSpacingCandidate | null = null

  for (let offset = -stepCount; offset <= stepCount; offset += 1) {
    const delta = snappedDelta + (offset * step)
    const adjustedStart = activeStart + delta
    const adjustedEnd = activeEnd + delta
    const gapBefore = adjustedStart - beforeEdge
    const gapAfter = afterEdge - adjustedEnd

    const {
      displayDistanceDiff: distanceDiff,
      commonDisplayDistance: commonDistance
    } = resolveCommonDisplayDistance({
      firstDistance: gapBefore,
      secondDistance: gapAfter
    })
    if (distanceDiff > MAX_DISPLAY_DISTANCE_DIFF) continue

    const nearestDiff = Math.max(
      Math.abs(gapBefore - targetGap),
      Math.abs(gapAfter - targetGap)
    )
    if (nearestDiff > threshold) continue

    const equalDiff = Math.abs(gapBefore - gapAfter)
    const deltaDiff = Math.abs(delta - rawDelta)
    const score = equalDiff + (distanceDiff * 0.5) + (deltaDiff * 0.001)

    if (!bestCandidate || score < bestCandidate.diff) {
      bestCandidate = {
        delta,
        distance: commonDistance,
        diff: score,
        activeStart: adjustedEnd,
        activeEnd: adjustedEnd + commonDistance
      }
    }
  }

  return bestCandidate
}

/**
 * Возвращает отображаемое расстояние для гайда только при консистентном display-gap.
 */
const resolveGuideDisplayDistance = ({
  currentGap,
  referenceGap
}: {
  currentGap: number
  referenceGap: number
}): number | null => {
  const {
    secondDisplayDistance: referenceDisplayDistance,
    displayDistanceDiff
  } = resolveCommonDisplayDistance({
    firstDistance: currentGap,
    secondDistance: referenceGap
  })

  if (displayDistanceDiff > MAX_DISPLAY_DISTANCE_DIFF) return null

  return referenceDisplayDistance
}

/**
 * Ищет ближайшую линию привязки по одной оси.
 */
export const findAxisSnap = ({
  anchors,
  positions,
  threshold
}: {
  anchors: number[]
  positions: number[]
  threshold: number
}): { delta: number; guidePosition: number | null } => {
  let nearestDelta = 0
  let nearestDistance = threshold + 1
  let guidePosition: number | null = null

  for (const position of positions) {
    for (const anchor of anchors) {
      const distance = Math.abs(anchor - position)

      if (distance > threshold || distance >= nearestDistance) continue

      nearestDelta = anchor - position
      nearestDistance = distance
      guidePosition = anchor
    }
  }

  return {
    delta: nearestDelta,
    guidePosition
  }
}

/**
 * Считает дельту сдвига и список направляющих для текущего объекта.
 */
export const calculateSnap = ({
  activeBounds,
  threshold,
  anchors
}: {
  activeBounds: Bounds
  threshold: number
  anchors: AnchorBuckets
}): { deltaX: number; deltaY: number; guides: GuideLine[] } => {
  const { left, right, centerX, top, bottom, centerY } = activeBounds

  const verticalSnap = findAxisSnap({
    anchors: anchors.vertical,
    positions: [left, centerX, right],
    threshold
  })
  const horizontalSnap = findAxisSnap({
    anchors: anchors.horizontal,
    positions: [top, centerY, bottom],
    threshold
  })

  const guides: GuideLine[] = []

  if (verticalSnap.guidePosition !== null) {
    guides.push({
      type: 'vertical',
      position: verticalSnap.guidePosition
    })
  }

  if (horizontalSnap.guidePosition !== null) {
    guides.push({
      type: 'horizontal',
      position: horizontalSnap.guidePosition
    })
  }

  return {
    deltaX: verticalSnap.delta,
    deltaY: horizontalSnap.delta,
    guides
  }
}

/**
 * Ищет подходящий вариант равноудалённого прилипания по вертикали.
 */
export const calculateVerticalSpacing = ({
  activeBounds,
  candidates,
  threshold,
  patterns,
  previousContext = null,
  switchDistance = 0
}: {
  activeBounds: Bounds
  candidates: Bounds[]
  threshold: number
  patterns: SpacingPattern[]
  previousContext?: SpacingSelectionContext | null
  switchDistance?: number
}): { delta: number; guides: SpacingGuide[]; context: SpacingSelectionContext | null } => {
  const {
    centerX,
    top: activeTop,
    bottom: activeBottom,
    left: activeLeft,
    right: activeRight
  } = activeBounds

  const aligned: Bounds[] = []
  for (const candidate of candidates) {
    const {
      left,
      right
    } = candidate

    const overlap = getAxisOverlap({
      firstStart: left,
      firstEnd: right,
      secondStart: activeLeft,
      secondEnd: activeRight
    })
    if (overlap > 0) {
      aligned.push(candidate)
    }
  }

  if (!aligned.length) {
    return { delta: 0, guides: [], context: null }
  }

  const items: SpacingItem[] = []
  for (const bounds of aligned) {
    items.push({ bounds, isActive: false })
  }
  items.push({ bounds: activeBounds, isActive: true })

  sortSpacingItems({ items, axis: 'top' })

  const activeIndex = findActiveItemIndex({ items })
  if (activeIndex === -1) {
    return { delta: 0, guides: [], context: null }
  }

  const options: SpacingOption[] = []
  const height = activeBottom - activeTop
  const prevIndex = findNeighborIndex({
    items,
    index: activeIndex,
    axis: 'vertical',
    direction: 'prev'
  })
  const nextIndex = findNeighborIndex({
    items,
    index: activeIndex,
    axis: 'vertical',
    direction: 'next'
  })
  const prev = prevIndex === null ? null : items[prevIndex]
  const next = nextIndex === null ? null : items[nextIndex]

  if (prev && next) {
    const { bounds: prevBounds } = prev
    const { bounds: nextBounds } = next
    const { bottom: prevBottom } = prevBounds
    const { top: nextTop } = nextBounds
    const totalGap = nextTop - prevBottom
    const availableSpace = totalGap - height

    if (availableSpace >= 0) {
      const idealGap = availableSpace / 2
      const desiredGap = snapToStep({ value: idealGap, step: MOVE_SNAP_STEP })
      const gapTop = activeTop - prevBottom
      const gapBottom = nextTop - activeBottom
      const diffTop = Math.abs(gapTop - desiredGap)
      const diffBottom = Math.abs(gapBottom - desiredGap)
      const diff = Math.max(diffTop, diffBottom)

      if (diff <= threshold) {
        const centered = resolveCenteredEqualSpacing({
          activeStart: activeTop,
          activeEnd: activeBottom,
          targetGap: desiredGap,
          beforeEdge: prevBottom,
          afterEdge: nextTop,
          threshold,
          step: MOVE_SNAP_STEP
        })

        if (centered) {
          const {
            delta,
            distance,
            diff: centeredDiff,
            activeStart: centeredActiveStart,
            activeEnd: centeredActiveEnd
          } = centered

          const guide: SpacingGuide = {
            type: 'vertical',
            axis: centerX,
            refStart: prevBottom,
            refEnd: prevBottom + distance,
            activeStart: centeredActiveStart,
            activeEnd: centeredActiveEnd,
            distance
          }

          options.push({
            delta,
            guide,
            diff: centeredDiff,
            side: 'center',
            kind: 'center',
            contextDistance: 0
          })
        }
      }
    }
  }

  let gapAbove: number | null = null
  let gapBelow: number | null = null
  let prevBounds: Bounds | null = null
  let nextBounds: Bounds | null = null

  if (prev) {
    prevBounds = prev.bounds
    const { bottom: prevBottom } = prevBounds
    const gapValue = activeTop - prevBottom
    if (gapValue >= 0) {
      gapAbove = gapValue
    }
  }

  if (next) {
    nextBounds = next.bounds
    const { top: nextTop } = nextBounds
    const gapValue = nextTop - activeBottom
    if (gapValue >= 0) {
      gapBelow = gapValue
    }
  }

  for (const pattern of patterns) {
    const {
      axis: refAxis,
      start: refStart,
      end: refEnd,
      distance: refDistance
    } = pattern

    const isRefAligned = isStepAligned({ value: refDistance, step: MOVE_SNAP_STEP })

    if (!isRefAligned) continue

    const isAxisAligned = isPatternAxisAlignedWithActiveRange({
      patternAxis: refAxis,
      activeRangeStart: activeLeft,
      activeRangeEnd: activeRight,
      tolerance: threshold
    })

    if (!isAxisAligned) continue

    const side = resolveReferencePatternSide({
      patternStart: refStart,
      patternEnd: refEnd,
      activeStart: activeTop,
      activeEnd: activeBottom
    })
    if (!side) continue

    if (gapAbove !== null && prevBounds && side === 'before') {
      const diff = Math.abs(gapAbove - refDistance)
      if (diff <= threshold) {
        const rawDelta = refDistance - gapAbove
        const delta = snapToStep({ value: rawDelta, step: MOVE_SNAP_STEP })
        const adjustedTop = activeTop + delta
        const { bottom: prevBottom } = prevBounds
        const adjustedGap = adjustedTop - prevBottom
        const postDiff = Math.abs(adjustedGap - refDistance)

        if (postDiff > threshold) continue
        const distance = resolveGuideDisplayDistance({
          currentGap: adjustedGap,
          referenceGap: refDistance
        })
        if (distance === null) continue
        const guide: SpacingGuide = {
          type: 'vertical',
          axis: centerX,
          refStart,
          refEnd,
          activeStart: prevBottom,
          activeEnd: adjustedTop,
          distance
        }

        options.push({
          delta,
          guide,
          diff: postDiff,
          side: 'before',
          kind: 'reference',
          contextDistance: activeTop - refEnd
        })
      }
    }

    if (gapBelow !== null && nextBounds && side === 'after') {
      const diff = Math.abs(gapBelow - refDistance)
      if (diff <= threshold) {
        const rawDelta = gapBelow - refDistance
        const delta = snapToStep({ value: rawDelta, step: MOVE_SNAP_STEP })
        const adjustedBottom = activeBottom + delta
        const { top: nextTop } = nextBounds
        const adjustedGap = nextTop - adjustedBottom
        const postDiff = Math.abs(adjustedGap - refDistance)

        if (postDiff > threshold) continue
        const distance = resolveGuideDisplayDistance({
          currentGap: adjustedGap,
          referenceGap: refDistance
        })
        if (distance === null) continue
        const guide: SpacingGuide = {
          type: 'vertical',
          axis: centerX,
          refStart,
          refEnd,
          activeStart: adjustedBottom,
          activeEnd: nextTop,
          distance
        }

        options.push({
          delta,
          guide,
          diff: postDiff,
          side: 'after',
          kind: 'reference',
          contextDistance: refStart - activeBottom
        })
      }
    }
  }

  return resolveSpacingResult({
    options,
    previousContext,
    switchDistance
  })
}

/**
 * Ищет подходящий вариант равноудалённого прилипания по горизонтали.
 */
export const calculateHorizontalSpacing = ({
  activeBounds,
  candidates,
  threshold,
  patterns,
  previousContext = null,
  switchDistance = 0
}: {
  activeBounds: Bounds
  candidates: Bounds[]
  threshold: number
  patterns: SpacingPattern[]
  previousContext?: SpacingSelectionContext | null
  switchDistance?: number
}): { delta: number; guides: SpacingGuide[]; context: SpacingSelectionContext | null } => {
  const {
    centerY,
    left: activeLeft,
    right: activeRight,
    top: activeTop,
    bottom: activeBottom
  } = activeBounds

  const aligned: Bounds[] = []
  for (const candidate of candidates) {
    const {
      top,
      bottom
    } = candidate

    const overlap = getAxisOverlap({
      firstStart: top,
      firstEnd: bottom,
      secondStart: activeTop,
      secondEnd: activeBottom
    })
    if (overlap > 0) {
      aligned.push(candidate)
    }
  }

  if (!aligned.length) {
    return { delta: 0, guides: [], context: null }
  }

  const items: SpacingItem[] = []
  for (const bounds of aligned) {
    items.push({ bounds, isActive: false })
  }
  items.push({ bounds: activeBounds, isActive: true })

  sortSpacingItems({ items, axis: 'left' })

  const activeIndex = findActiveItemIndex({ items })
  if (activeIndex === -1) {
    return { delta: 0, guides: [], context: null }
  }

  const options: SpacingOption[] = []
  const width = activeRight - activeLeft
  const prevIndex = findNeighborIndex({
    items,
    index: activeIndex,
    axis: 'horizontal',
    direction: 'prev'
  })
  const nextIndex = findNeighborIndex({
    items,
    index: activeIndex,
    axis: 'horizontal',
    direction: 'next'
  })
  const prev = prevIndex === null ? null : items[prevIndex]
  const next = nextIndex === null ? null : items[nextIndex]

  if (prev && next) {
    const { bounds: prevBounds } = prev
    const { bounds: nextBounds } = next
    const { right: prevRight } = prevBounds
    const { left: nextLeft } = nextBounds
    const totalGap = nextLeft - prevRight
    const availableSpace = totalGap - width

    if (availableSpace >= 0) {
      const idealGap = availableSpace / 2
      const desiredGap = snapToStep({ value: idealGap, step: MOVE_SNAP_STEP })
      const gapLeft = activeLeft - prevRight
      const gapRight = nextLeft - activeRight
      const diffLeft = Math.abs(gapLeft - desiredGap)
      const diffRight = Math.abs(gapRight - desiredGap)
      const diff = Math.max(diffLeft, diffRight)

      if (diff <= threshold) {
        const centered = resolveCenteredEqualSpacing({
          activeStart: activeLeft,
          activeEnd: activeRight,
          targetGap: desiredGap,
          beforeEdge: prevRight,
          afterEdge: nextLeft,
          threshold,
          step: MOVE_SNAP_STEP
        })

        if (centered) {
          const {
            delta,
            distance,
            diff: centeredDiff,
            activeStart: centeredActiveStart,
            activeEnd: centeredActiveEnd
          } = centered

          const guide: SpacingGuide = {
            type: 'horizontal',
            axis: centerY,
            refStart: prevRight,
            refEnd: prevRight + distance,
            activeStart: centeredActiveStart,
            activeEnd: centeredActiveEnd,
            distance
          }

          options.push({
            delta,
            guide,
            diff: centeredDiff,
            side: 'center',
            kind: 'center',
            contextDistance: 0
          })
        }
      }
    }
  }

  let gapLeft: number | null = null
  let gapRight: number | null = null
  let prevBounds: Bounds | null = null
  let nextBounds: Bounds | null = null

  if (prev) {
    prevBounds = prev.bounds
    const { right: prevRight } = prevBounds
    const gapValue = activeLeft - prevRight
    if (gapValue >= 0) {
      gapLeft = gapValue
    }
  }

  if (next) {
    nextBounds = next.bounds
    const { left: nextLeft } = nextBounds
    const gapValue = nextLeft - activeRight
    if (gapValue >= 0) {
      gapRight = gapValue
    }
  }

  for (const pattern of patterns) {
    const {
      axis: refAxis,
      start: refStart,
      end: refEnd,
      distance: refDistance
    } = pattern

    const isRefAligned = isStepAligned({ value: refDistance, step: MOVE_SNAP_STEP })

    if (!isRefAligned) continue

    const isAxisAligned = isPatternAxisAlignedWithActiveRange({
      patternAxis: refAxis,
      activeRangeStart: activeTop,
      activeRangeEnd: activeBottom,
      tolerance: threshold
    })

    if (!isAxisAligned) continue

    const side = resolveReferencePatternSide({
      patternStart: refStart,
      patternEnd: refEnd,
      activeStart: activeLeft,
      activeEnd: activeRight
    })
    if (!side) continue

    if (gapLeft !== null && prevBounds && side === 'before') {
      const diff = Math.abs(gapLeft - refDistance)
      if (diff <= threshold) {
        const rawDelta = refDistance - gapLeft
        const delta = snapToStep({ value: rawDelta, step: MOVE_SNAP_STEP })
        const adjustedLeft = activeLeft + delta
        const { right: prevRight } = prevBounds
        const adjustedGap = adjustedLeft - prevRight
        const postDiff = Math.abs(adjustedGap - refDistance)

        if (postDiff > threshold) continue
        const distance = resolveGuideDisplayDistance({
          currentGap: adjustedGap,
          referenceGap: refDistance
        })
        if (distance === null) continue
        const guide: SpacingGuide = {
          type: 'horizontal',
          axis: centerY,
          refStart,
          refEnd,
          activeStart: prevRight,
          activeEnd: adjustedLeft,
          distance
        }

        options.push({
          delta,
          guide,
          diff: postDiff,
          side: 'before',
          kind: 'reference',
          contextDistance: activeLeft - refEnd
        })
      }
    }

    if (gapRight !== null && nextBounds && side === 'after') {
      const diff = Math.abs(gapRight - refDistance)
      if (diff <= threshold) {
        const rawDelta = gapRight - refDistance
        const delta = snapToStep({ value: rawDelta, step: MOVE_SNAP_STEP })
        const adjustedRight = activeRight + delta
        const { left: nextLeft } = nextBounds
        const adjustedGap = nextLeft - adjustedRight
        const postDiff = Math.abs(adjustedGap - refDistance)

        if (postDiff > threshold) continue
        const distance = resolveGuideDisplayDistance({
          currentGap: adjustedGap,
          referenceGap: refDistance
        })
        if (distance === null) continue
        const guide: SpacingGuide = {
          type: 'horizontal',
          axis: centerY,
          refStart,
          refEnd,
          activeStart: adjustedRight,
          activeEnd: nextLeft,
          distance
        }

        options.push({
          delta,
          guide,
          diff: postDiff,
          side: 'after',
          kind: 'reference',
          contextDistance: refStart - activeRight
        })
      }
    }
  }

  return resolveSpacingResult({
    options,
    previousContext,
    switchDistance
  })
}

/**
 * Считает дельту для равноудалённого прилипания и набор направляющих интервалов.
 */
export const calculateSpacingSnap = ({
  activeBounds,
  candidates,
  threshold,
  spacingPatterns,
  previousContexts,
  switchDistance = 0
}: {
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
    activeBounds,
    candidates,
    threshold,
    patterns: spacingPatterns.vertical,
    previousContext: previousVerticalContext,
    switchDistance
  })
  const horizontalResult = calculateHorizontalSpacing({
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
