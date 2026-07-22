import { CENTERING_STEP } from './constants'
import {
  MAX_DISPLAY_DISTANCE_DIFF,
  resolveCommonDisplayDistance,
  resolveDisplayDistance
} from '../utils/distance'
import type {
  Bounds,
  SpacingGuide,
  SpacingPattern
} from './types'

/** Объект в отсортированном списке соседей с признаком активного объекта. */
type SpacingItem = {
  bounds: Bounds
  isActive: boolean
}

/** Выбор интервала, сохраняемый между последовательными событиями перемещения. */
export type SpacingSelectionContext = {
  side: 'before' | 'center' | 'after'
  kind: 'reference' | 'center'
  distance: number
}

/** Сохранённый выбор интервалов для обеих осей. */
export type SpacingContextByAxis = {
  vertical: SpacingSelectionContext | null
  horizontal: SpacingSelectionContext | null
}

/** Положение активного интервала относительно выбранного образца расстояния. */
type SpacingOptionSide = SpacingSelectionContext['side']

/** Источник варианта: существующий интервал или центр между соседями. */
type SpacingOptionKind = SpacingSelectionContext['kind']

/** Один допустимый вариант равноудалённого прилипания. */
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
 * Возвращает начальную и конечную координаты по выбранной оси.
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
 * Сортирует элементы на месте по выбранной оси.
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

/** Результат подбора позиции между двумя соседними объектами. */
type EqualSpacingCandidate = {
  delta: number
  distance: number
  diff: number
  activeStart: number
  activeEnd: number
}

/** Ось, вдоль которой сравниваются интервалы. */
type SpacingAxis = SpacingGuide['type']

/** Ближайшие непересекающиеся соседи активного объекта. */
type SpacingNeighbors = {
  before: Bounds | null
  after: Bounds | null
}

/** Геометрия объекта в координатах выбранной оси. */
type AxisSpacingGeometry = {
  start: number
  end: number
  crossStart: number
  crossEnd: number
  guideAxis: number
}

/** Параметры расчёта равноудалённости по одной оси. */
type CalculateAxisSpacingParams = {
  activeBounds: Bounds
  candidates: Bounds[]
  threshold: number
  patterns: SpacingPattern[]
  previousContext?: SpacingSelectionContext | null
  switchDistance?: number
  axis: SpacingAxis
}

/** Публичные параметры расчёта равноудалённости по вертикали или горизонтали. */
type CalculateSpacingParams = {
  activeBounds: Bounds
  candidates: Bounds[]
  threshold: number
  patterns: SpacingPattern[]
  previousContext?: SpacingSelectionContext | null
  switchDistance?: number
}

/** Результат расчёта равноудалённости по одной оси. */
type SpacingCalculationResult = {
  delta: number
  guides: SpacingGuide[]
  context: SpacingSelectionContext | null
}

/** Кандидат для прилипания к существующему интервалу. */
type ReferenceSpacingCandidate = {
  delta: number
  distance: number
  diff: number
  adjustedStart: number
  adjustedEnd: number
}

/** Параметры проверки одного существующего интервала. */
type ResolveReferenceSpacingOptionParams = {
  activeBounds: Bounds
  neighbors: SpacingNeighbors
  pattern: SpacingPattern
  axis: SpacingAxis
  threshold: number
}

/** Данные для создания варианта по существующему интервалу. */
type ReferenceSpacingOptionContext = {
  active: AxisSpacingGeometry
  neighbor: AxisSpacingGeometry
  pattern: SpacingPattern
  candidate: ReferenceSpacingCandidate
  axis: SpacingAxis
  side: Exclude<SpacingOptionSide, 'center'>
}

/**
 * Проверяет, проходит ли линия исходного интервала вдоль активного объекта.
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
 * Определяет, с какой стороны активного объекта находится исходный интервал.
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
 * Проверяет, что два варианта дают одинаковое смещение и отображаемое расстояние.
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
 * Выбирает вариант с минимальным расхождением расстояния и меньшим смещением.
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
 * Проверяет, относится ли следующий вариант к более близкому окружению объекта.
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
 * Оставляет ближайший существующий интервал с каждой стороны, чтобы убрать варианты с разницей в 1 px.
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
 * Возвращает лучший вариант с выбранной стороны, совместимый с основным вариантом.
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
 * Сохраняет выбранный вариант, чтобы удерживать его на следующих шагах.
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
 * Проверяет, соответствует ли вариант ранее сохранённому выбору.
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
 * Находит вариант прилипания, соответствующий ранее сохранённому выбору.
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
 * Возвращает основной вариант с учётом порога переключения между интервалами.
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
 * Добавляет направляющую без дублей по геометрии и расстоянию.
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
 * Выбирает интервалы, совместимые с основным вариантом прилипания.
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

/** Возвращает уникальные направляющие для выбранных вариантов прилипания. */
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

/**
 * Формирует направляющие равноудалённости, не смешивая разные расстояния.
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
    })
  }
}

/** Возвращает границы объекта в координатах выбранной оси. */
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

/** Проверяет перекрытие объектов на перпендикулярной оси. */
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

/** Ищет ближайших соседей активного объекта на выбранной оси. */
const resolveSpacingNeighbors = ({
  activeBounds,
  candidates,
  axis
}: {
  activeBounds: Bounds
  candidates: Bounds[]
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

/** Подбирает позицию между соседями на сетке с шагом 0,5 px. */
const resolveCenteredEqualSpacing = ({
  activeStart,
  activeEnd,
  beforeEdge,
  afterEdge,
  threshold
}: {
  activeStart: number
  activeEnd: number
  beforeEdge: number
  afterEdge: number
  threshold: number
}): EqualSpacingCandidate | null => {
  const rawDelta = ((beforeEdge + afterEdge) - (activeStart + activeEnd)) / 2
  const snappedDelta = snapToStep({ value: rawDelta, step: CENTERING_STEP })
  const stepCount = Math.max(1, Math.ceil(threshold / CENTERING_STEP) + 1)
  let bestCandidate: EqualSpacingCandidate | null = null

  for (let offset = -stepCount; offset <= stepCount; offset += 1) {
    const delta = snappedDelta + (offset * CENTERING_STEP)
    const adjustedStart = activeStart + delta
    const adjustedEnd = activeEnd + delta
    const gapBefore = adjustedStart - beforeEdge
    const gapAfter = afterEdge - adjustedEnd
    if (gapBefore < 0 || gapAfter < 0) continue
    if (Math.abs(delta) > threshold) continue

    const display = resolveCommonDisplayDistance({
      firstDistance: gapBefore,
      secondDistance: gapAfter
    })
    if (display.displayDistanceDiff !== 0) continue

    const score = Math.abs(gapBefore - gapAfter) + (Math.abs(delta - rawDelta) * 0.001)
    if (bestCandidate && score >= bestCandidate.diff) continue

    bestCandidate = {
      delta,
      distance: display.commonDisplayDistance,
      diff: score,
      activeStart: adjustedStart,
      activeEnd: adjustedEnd
    }
  }

  return bestCandidate
}

/** Формирует вариант прилипания по центру между двумя соседями. */
const resolveCenteredSpacingOption = ({
  activeBounds,
  neighbors,
  axis,
  threshold
}: {
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
    contextDistance: 0
  }
}

/** Подбирает позицию для совпадения с существующим отображаемым интервалом. */
const resolveReferenceSpacingCandidate = ({
  currentGap,
  referenceGap,
  gapDirection,
  activeStart,
  activeEnd,
  threshold
}: {
  currentGap: number
  referenceGap: number
  gapDirection: 1 | -1
  activeStart: number
  activeEnd: number
  threshold: number
}): ReferenceSpacingCandidate | null => {
  if (currentGap < 0 || Math.abs(currentGap - referenceGap) > threshold) return null

  const rawDelta = (referenceGap - currentGap) / gapDirection
  const snappedDelta = snapToStep({ value: rawDelta, step: CENTERING_STEP })
  const stepCount = Math.max(1, Math.ceil(threshold / CENTERING_STEP) + 1)
  const referenceDistance = resolveDisplayDistance({ distance: referenceGap })
  let bestCandidate: ReferenceSpacingCandidate | null = null

  for (let offset = -stepCount; offset <= stepCount; offset += 1) {
    const delta = snappedDelta + (offset * CENTERING_STEP)
    const adjustedGap = currentGap + (delta * gapDirection)
    if (adjustedGap < 0 || Math.abs(delta) > threshold) continue

    const diff = Math.abs(adjustedGap - referenceGap)
    if (diff > threshold) continue
    if (resolveDisplayDistance({ distance: adjustedGap }) !== referenceDistance) continue

    const score = diff + (Math.abs(delta - rawDelta) * 0.001)
    if (bestCandidate && score >= bestCandidate.diff) continue

    bestCandidate = {
      delta,
      distance: referenceDistance,
      diff: score,
      adjustedStart: activeStart + delta,
      adjustedEnd: activeEnd + delta
    }
  }

  return bestCandidate
}

/** Создаёт вариант прилипания и направляющую для проверенного интервала. */
const createReferenceSpacingOption = ({
  active,
  neighbor,
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
    contextDistance
  }
}

/** Проверяет и формирует вариант прилипания к одному существующему интервалу. */
const resolveReferenceSpacingOption = ({
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
    pattern,
    candidate,
    axis,
    side
  })
}

/** Собирает все допустимые варианты равноудалённости по одной оси. */
const resolveAxisSpacingOptions = ({
  activeBounds,
  neighbors,
  patterns,
  axis,
  threshold
}: {
  activeBounds: Bounds
  neighbors: SpacingNeighbors
  patterns: SpacingPattern[]
  axis: SpacingAxis
  threshold: number
}): SpacingOption[] => {
  const options: SpacingOption[] = []
  const centeredOption = resolveCenteredSpacingOption({ activeBounds, neighbors, axis, threshold })
  if (centeredOption) options.push(centeredOption)

  for (const pattern of patterns) {
    const option = resolveReferenceSpacingOption({
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

/** Считает равноудалённость по одной оси. */
const calculateAxisSpacing = ({
  activeBounds,
  candidates,
  threshold,
  patterns,
  previousContext = null,
  switchDistance = 0,
  axis
}: CalculateAxisSpacingParams): SpacingCalculationResult => {
  const neighbors = resolveSpacingNeighbors({ activeBounds, candidates, axis })
  if (!neighbors) return { delta: 0, guides: [], context: null }

  const options = resolveAxisSpacingOptions({
    activeBounds,
    neighbors,
    patterns,
    axis,
    threshold
  })

  return resolveSpacingResult({ options, previousContext, switchDistance })
}

/** Ищет подходящий вариант равноудалённого прилипания по вертикали. */
export const calculateVerticalSpacing = (
  params: CalculateSpacingParams
): SpacingCalculationResult => calculateAxisSpacing({ ...params, axis: 'vertical' })

/** Ищет подходящий вариант равноудалённого прилипания по горизонтали. */
export const calculateHorizontalSpacing = (
  params: CalculateSpacingParams
): SpacingCalculationResult => calculateAxisSpacing({ ...params, axis: 'horizontal' })

/**
 * Считает смещение для равноудалённого прилипания и набор направляющих интервалов.
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
