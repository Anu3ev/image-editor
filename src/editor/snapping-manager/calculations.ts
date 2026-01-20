import { MOVE_SNAP_STEP } from './constants'
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

type NeighborGap = {
  beforeIndex: number
  afterIndex: number
  start: number
  end: number
  distance: number
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

  return Math.round(value / step) * step
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

  return snappedValue === value
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

/**
 * Собирает положительные зазоры между соседними элементами на выбранной оси.
 */
const collectNeighborGaps = ({
  items,
  axis
}: {
  items: SpacingItem[]
  axis: 'horizontal' | 'vertical'
}): NeighborGap[] => {
  const gaps: NeighborGap[] = []
  const isVertical = axis === 'vertical'

  for (let index = 0; index < items.length - 1; index += 1) {
    const { bounds: beforeBounds } = items[index]
    const { bounds: afterBounds } = items[index + 1]
    const start = isVertical ? beforeBounds.bottom : beforeBounds.right
    const end = isVertical ? afterBounds.top : afterBounds.left
    const distance = end - start

    if (distance < 0) continue

    gaps.push({
      beforeIndex: index,
      afterIndex: index + 1,
      start,
      end,
      distance
    })
  }

  return gaps
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
  patterns: _patterns
}: {
  activeBounds: Bounds
  candidates: Bounds[]
  threshold: number
  patterns: SpacingPattern[]
}): { delta: number; guide: SpacingGuide | null } => {
  const {
    centerX,
    top: activeTop,
    bottom: activeBottom,
    left: activeLeft,
    right: activeRight
  } = activeBounds

  const aligned: Bounds[] = []
  for (const bounds of candidates) {
    const { left, right } = bounds
    const overlap = Math.min(right, activeRight) - Math.max(left, activeLeft)
    if (overlap > 0) {
      aligned.push(bounds)
    }
  }

  if (!aligned.length) {
    return { delta: 0, guide: null }
  }

  const items: SpacingItem[] = []
  for (const bounds of aligned) {
    items.push({ bounds, isActive: false })
  }
  items.push({ bounds: activeBounds, isActive: true })

  sortSpacingItems({ items, axis: 'top' })

  const activeIndex = findActiveItemIndex({ items })
  if (activeIndex === -1) {
    return { delta: 0, guide: null }
  }

  const options: Array<{ delta: number; guide: SpacingGuide; diff: number }> = []
  const height = activeBottom - activeTop
  const prev = items[activeIndex - 1]
  const next = items[activeIndex + 1]

  if (prev && next) {
    const { bounds: prevBounds } = prev
    const { bounds: nextBounds } = next
    const { bottom: prevBottom } = prevBounds
    const { top: nextTop } = nextBounds
    const totalGap = nextTop - prevBottom
    const availableSpace = totalGap - height

    if (availableSpace >= 0) {
      const idealGap = availableSpace / 2
      const isAligned = isStepAligned({ value: idealGap, step: MOVE_SNAP_STEP })

      if (isAligned) {
        const desiredGap = snapToStep({ value: idealGap, step: MOVE_SNAP_STEP })
        const gapTop = activeTop - prevBottom
        const gapBottom = nextTop - activeBottom
        const diffTop = Math.abs(gapTop - desiredGap)
        const diffBottom = Math.abs(gapBottom - desiredGap)
        const diff = Math.max(diffTop, diffBottom)

        if (diff <= threshold) {
          const delta = desiredGap - gapTop
          const isDeltaAligned = isStepAligned({ value: delta, step: MOVE_SNAP_STEP })

          if (isDeltaAligned) {
            const adjustedBottom = activeBottom + delta
            const guide: SpacingGuide = {
              type: 'vertical',
              axis: centerX,
              refStart: prevBottom,
              refEnd: prevBottom + desiredGap,
              activeStart: adjustedBottom,
              activeEnd: adjustedBottom + desiredGap,
              distance: desiredGap
            }

            options.push({ delta, guide, diff })
          }
        }
      }
    }
  }

  const neighborGaps = collectNeighborGaps({ items, axis: 'vertical' })
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

  for (const gap of neighborGaps) {
    const {
      beforeIndex,
      afterIndex,
      start: refStart,
      end: refEnd,
      distance: refDistance
    } = gap

    if (beforeIndex === activeIndex || afterIndex === activeIndex) continue

    const isRefAligned = isStepAligned({ value: refDistance, step: MOVE_SNAP_STEP })

    if (!isRefAligned) continue

    if (gapAbove !== null && prevBounds) {
      const diff = Math.abs(gapAbove - refDistance)
      if (diff <= threshold) {
        const delta = refDistance - gapAbove
        const isDeltaAligned = isStepAligned({ value: delta, step: MOVE_SNAP_STEP })

        if (!isDeltaAligned) continue
        const adjustedTop = activeTop + delta
        const { bottom: prevBottom } = prevBounds
        const guide: SpacingGuide = {
          type: 'vertical',
          axis: centerX,
          refStart,
          refEnd,
          activeStart: prevBottom,
          activeEnd: adjustedTop,
          distance: refDistance
        }

        options.push({ delta, guide, diff })
      }
    }

    if (gapBelow !== null && nextBounds) {
      const diff = Math.abs(gapBelow - refDistance)
      if (diff <= threshold) {
        const delta = gapBelow - refDistance
        const isDeltaAligned = isStepAligned({ value: delta, step: MOVE_SNAP_STEP })

        if (!isDeltaAligned) continue
        const adjustedBottom = activeBottom + delta
        const { top: nextTop } = nextBounds
        const guide: SpacingGuide = {
          type: 'vertical',
          axis: centerX,
          refStart,
          refEnd,
          activeStart: adjustedBottom,
          activeEnd: nextTop,
          distance: refDistance
        }

        options.push({ delta, guide, diff })
      }
    }
  }

  if (!options.length) {
    return { delta: 0, guide: null }
  }

  let bestOption = options[0]
  for (let index = 1; index < options.length; index += 1) {
    const option = options[index]
    if (option.diff < bestOption.diff) {
      bestOption = option
    }
  }

  return {
    delta: bestOption.delta,
    guide: bestOption.guide
  }
}

/**
 * Ищет подходящий вариант равноудалённого прилипания по горизонтали.
 */
export const calculateHorizontalSpacing = ({
  activeBounds,
  candidates,
  threshold,
  patterns: _patterns
}: {
  activeBounds: Bounds
  candidates: Bounds[]
  threshold: number
  patterns: SpacingPattern[]
}): { delta: number; guide: SpacingGuide | null } => {
  const {
    centerY,
    left: activeLeft,
    right: activeRight,
    top: activeTop,
    bottom: activeBottom
  } = activeBounds

  const aligned: Bounds[] = []
  for (const bounds of candidates) {
    const { top, bottom } = bounds
    const overlap = Math.min(bottom, activeBottom) - Math.max(top, activeTop)
    if (overlap > 0) {
      aligned.push(bounds)
    }
  }

  if (!aligned.length) {
    return { delta: 0, guide: null }
  }

  const items: SpacingItem[] = []
  for (const bounds of aligned) {
    items.push({ bounds, isActive: false })
  }
  items.push({ bounds: activeBounds, isActive: true })

  sortSpacingItems({ items, axis: 'left' })

  const activeIndex = findActiveItemIndex({ items })
  if (activeIndex === -1) {
    return { delta: 0, guide: null }
  }

  const options: Array<{ delta: number; guide: SpacingGuide; diff: number }> = []
  const width = activeRight - activeLeft
  const prev = items[activeIndex - 1]
  const next = items[activeIndex + 1]

  if (prev && next) {
    const { bounds: prevBounds } = prev
    const { bounds: nextBounds } = next
    const { right: prevRight } = prevBounds
    const { left: nextLeft } = nextBounds
    const totalGap = nextLeft - prevRight
    const availableSpace = totalGap - width

    if (availableSpace >= 0) {
      const idealGap = availableSpace / 2
      const isAligned = isStepAligned({ value: idealGap, step: MOVE_SNAP_STEP })

      if (isAligned) {
        const desiredGap = snapToStep({ value: idealGap, step: MOVE_SNAP_STEP })
        const gapLeft = activeLeft - prevRight
        const gapRight = nextLeft - activeRight
        const diffLeft = Math.abs(gapLeft - desiredGap)
        const diffRight = Math.abs(gapRight - desiredGap)
        const diff = Math.max(diffLeft, diffRight)

        if (diff <= threshold) {
          const delta = desiredGap - gapLeft
          const isDeltaAligned = isStepAligned({ value: delta, step: MOVE_SNAP_STEP })

          if (isDeltaAligned) {
            const adjustedRight = activeRight + delta
            const guide: SpacingGuide = {
              type: 'horizontal',
              axis: centerY,
              refStart: prevRight,
              refEnd: prevRight + desiredGap,
              activeStart: adjustedRight,
              activeEnd: adjustedRight + desiredGap,
              distance: desiredGap
            }

            options.push({ delta, guide, diff })
          }
        }
      }
    }
  }

  const neighborGaps = collectNeighborGaps({ items, axis: 'horizontal' })
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

  for (const gap of neighborGaps) {
    const {
      beforeIndex,
      afterIndex,
      start: refStart,
      end: refEnd,
      distance: refDistance
    } = gap

    if (beforeIndex === activeIndex || afterIndex === activeIndex) continue

    const isRefAligned = isStepAligned({ value: refDistance, step: MOVE_SNAP_STEP })

    if (!isRefAligned) continue

    if (gapLeft !== null && prevBounds) {
      const diff = Math.abs(gapLeft - refDistance)
      if (diff <= threshold) {
        const delta = refDistance - gapLeft
        const isDeltaAligned = isStepAligned({ value: delta, step: MOVE_SNAP_STEP })

        if (!isDeltaAligned) continue
        const adjustedLeft = activeLeft + delta
        const { right: prevRight } = prevBounds
        const guide: SpacingGuide = {
          type: 'horizontal',
          axis: centerY,
          refStart,
          refEnd,
          activeStart: prevRight,
          activeEnd: adjustedLeft,
          distance: refDistance
        }

        options.push({ delta, guide, diff })
      }
    }

    if (gapRight !== null && nextBounds) {
      const diff = Math.abs(gapRight - refDistance)
      if (diff <= threshold) {
        const delta = gapRight - refDistance
        const isDeltaAligned = isStepAligned({ value: delta, step: MOVE_SNAP_STEP })

        if (!isDeltaAligned) continue
        const adjustedRight = activeRight + delta
        const { left: nextLeft } = nextBounds
        const guide: SpacingGuide = {
          type: 'horizontal',
          axis: centerY,
          refStart,
          refEnd,
          activeStart: adjustedRight,
          activeEnd: nextLeft,
          distance: refDistance
        }

        options.push({ delta, guide, diff })
      }
    }
  }

  if (!options.length) {
    return { delta: 0, guide: null }
  }

  let bestOption = options[0]
  for (let index = 1; index < options.length; index += 1) {
    const option = options[index]
    if (option.diff < bestOption.diff) {
      bestOption = option
    }
  }

  return {
    delta: bestOption.delta,
    guide: bestOption.guide
  }
}

/**
 * Считает дельту для равноудалённого прилипания и набор направляющих интервалов.
 */
export const calculateSpacingSnap = ({
  activeBounds,
  candidates,
  threshold,
  spacingPatterns
}: {
  activeBounds: Bounds
  candidates: Bounds[]
  threshold: number
  spacingPatterns: { vertical: SpacingPattern[]; horizontal: SpacingPattern[] }
}): { deltaX: number; deltaY: number; guides: SpacingGuide[] } => {
  const verticalResult = calculateVerticalSpacing({
    activeBounds,
    candidates,
    threshold,
    patterns: spacingPatterns.vertical
  })
  const horizontalResult = calculateHorizontalSpacing({
    activeBounds,
    candidates,
    threshold,
    patterns: spacingPatterns.horizontal
  })

  const guides: SpacingGuide[] = []
  if (verticalResult.guide) {
    guides.push(verticalResult.guide)
  }
  if (horizontalResult.guide) {
    guides.push(horizontalResult.guide)
  }

  return {
    deltaX: horizontalResult.delta,
    deltaY: verticalResult.delta,
    guides
  }
}
