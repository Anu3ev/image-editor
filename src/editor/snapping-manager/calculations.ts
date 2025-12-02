import type { AnchorBuckets, Bounds, GuideLine, SpacingGuide } from './types'

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
  threshold
}: {
  activeBounds: Bounds
  candidates: Bounds[]
  threshold: number
}): { delta: number; guide: SpacingGuide | null } => {
  const {
    centerX,
    top: activeTop,
    bottom: activeBottom
  } = activeBounds

  const aligned = candidates.filter((bounds) => Math.abs(bounds.centerX - centerX) <= threshold)

  if (!aligned.length) {
    return { delta: 0, guide: null }
  }

  const items = [
    ...aligned.map((bounds) => ({ bounds, isActive: false })),
    { bounds: activeBounds, isActive: true }
  ]

  items.sort((a, b) => a.bounds.top - b.bounds.top)

  const activeIndex = items.findIndex((item) => item.isActive)
  if (activeIndex === -1) {
    return { delta: 0, guide: null }
  }

  const prev = items[activeIndex - 1]
  const prevPrev = items[activeIndex - 2]
  const next = items[activeIndex + 1]
  const nextNext = items[activeIndex + 2]
  const options: Array<{ delta: number; guide: SpacingGuide; diff: number }> = []
  const height = activeBottom - activeTop

  if (prev && prevPrev) {
    const { bounds: prevBounds } = prev
    const { bounds: prevPrevBounds } = prevPrev
    const gapRef = prevBounds.top - prevPrevBounds.bottom
    const gapActive = activeTop - prevBounds.bottom
    const diff = Math.abs(gapActive - gapRef)

    if (diff <= threshold) {
      const delta = gapRef - gapActive
      const adjustedTop = activeTop + delta
      const guide: SpacingGuide = {
        type: 'vertical',
        axis: centerX,
        refStart: prevPrevBounds.bottom,
        refEnd: prevBounds.top,
        activeStart: prevBounds.bottom,
        activeEnd: adjustedTop,
        distance: gapRef
      }

      options.push({ delta, guide, diff })
    }
  }

  if (next && nextNext) {
    const { bounds: nextBounds } = next
    const { bounds: nextNextBounds } = nextNext
    const gapRef = nextNextBounds.top - nextBounds.bottom
    const gapActive = nextBounds.top - activeBottom
    const diff = Math.abs(gapActive - gapRef)

    if (diff <= threshold) {
      const delta = gapActive - gapRef
      const adjustedBottom = activeBottom + delta
      const guide: SpacingGuide = {
        type: 'vertical',
        axis: centerX,
        refStart: nextBounds.bottom,
        refEnd: nextNextBounds.top,
        activeStart: adjustedBottom,
        activeEnd: nextBounds.top,
        distance: gapRef
      }

      options.push({ delta, guide, diff })
    }
  }

  if (prev && next) {
    const { bounds: prevBounds } = prev
    const { bounds: nextBounds } = next
    const totalGap = nextBounds.top - prevBounds.bottom
    const availableSpace = totalGap - height

    if (availableSpace >= 0) {
      const desiredGap = availableSpace / 2
      const gapTop = activeTop - prevBounds.bottom
      const gapBottom = nextBounds.top - activeBottom
      const diffTop = Math.abs(gapTop - desiredGap)
      const diffBottom = Math.abs(gapBottom - desiredGap)
      const diff = Math.max(diffTop, diffBottom)

      if (diff <= threshold) {
        const delta = desiredGap - gapTop
        const adjustedBottom = activeBottom + delta
        const guide: SpacingGuide = {
          type: 'vertical',
          axis: centerX,
          refStart: prevBounds.bottom,
          refEnd: prevBounds.bottom + desiredGap,
          activeStart: adjustedBottom,
          activeEnd: adjustedBottom + desiredGap,
          distance: desiredGap
        }

        options.push({ delta, guide, diff })
      }
    }
  }

  if (!options.length) {
    return { delta: 0, guide: null }
  }

  const bestOption = options.reduce((current, option) => {
    if (option.diff < current.diff) return option
    return current
  }, options[0])

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
  threshold
}: {
  activeBounds: Bounds
  candidates: Bounds[]
  threshold: number
}): { delta: number; guide: SpacingGuide | null } => {
  const {
    centerY,
    left: activeLeft,
    right: activeRight
  } = activeBounds

  const aligned = candidates.filter((bounds) => Math.abs(bounds.centerY - centerY) <= threshold)

  if (!aligned.length) {
    return { delta: 0, guide: null }
  }

  const items = [
    ...aligned.map((bounds) => ({ bounds, isActive: false })),
    { bounds: activeBounds, isActive: true }
  ]

  items.sort((a, b) => a.bounds.left - b.bounds.left)

  const activeIndex = items.findIndex((item) => item.isActive)
  if (activeIndex === -1) {
    return { delta: 0, guide: null }
  }

  const prev = items[activeIndex - 1]
  const prevPrev = items[activeIndex - 2]
  const next = items[activeIndex + 1]
  const nextNext = items[activeIndex + 2]
  const options: Array<{ delta: number; guide: SpacingGuide; diff: number }> = []
  const width = activeRight - activeLeft

  if (prev && prevPrev) {
    const { bounds: prevBounds } = prev
    const { bounds: prevPrevBounds } = prevPrev
    const gapRef = prevBounds.left - prevPrevBounds.right
    const gapActive = activeLeft - prevBounds.right
    const diff = Math.abs(gapActive - gapRef)

    if (diff <= threshold) {
      const delta = gapRef - gapActive
      const adjustedLeft = activeLeft + delta
      const guide: SpacingGuide = {
        type: 'horizontal',
        axis: centerY,
        refStart: prevPrevBounds.right,
        refEnd: prevBounds.left,
        activeStart: prevBounds.right,
        activeEnd: adjustedLeft,
        distance: gapRef
      }

      options.push({ delta, guide, diff })
    }
  }

  if (next && nextNext) {
    const { bounds: nextBounds } = next
    const { bounds: nextNextBounds } = nextNext
    const gapRef = nextNextBounds.left - nextBounds.right
    const gapActive = nextBounds.left - activeRight
    const diff = Math.abs(gapActive - gapRef)

    if (diff <= threshold) {
      const delta = gapActive - gapRef
      const adjustedRight = activeRight + delta
      const guide: SpacingGuide = {
        type: 'horizontal',
        axis: centerY,
        refStart: nextBounds.right,
        refEnd: nextNextBounds.left,
        activeStart: adjustedRight,
        activeEnd: nextBounds.left,
        distance: gapRef
      }

      options.push({ delta, guide, diff })
    }
  }

  if (prev && next) {
    const { bounds: prevBounds } = prev
    const { bounds: nextBounds } = next
    const totalGap = nextBounds.left - prevBounds.right
    const availableSpace = totalGap - width

    if (availableSpace >= 0) {
      const desiredGap = availableSpace / 2
      const gapLeft = activeLeft - prevBounds.right
      const gapRight = nextBounds.left - activeRight
      const diffLeft = Math.abs(gapLeft - desiredGap)
      const diffRight = Math.abs(gapRight - desiredGap)
      const diff = Math.max(diffLeft, diffRight)

      if (diff <= threshold) {
        const delta = desiredGap - gapLeft
        const adjustedRight = activeRight + delta
        const guide: SpacingGuide = {
          type: 'horizontal',
          axis: centerY,
          refStart: prevBounds.right,
          refEnd: prevBounds.right + desiredGap,
          activeStart: adjustedRight,
          activeEnd: adjustedRight + desiredGap,
          distance: desiredGap
        }

        options.push({ delta, guide, diff })
      }
    }
  }

  if (!options.length) {
    return { delta: 0, guide: null }
  }

  const bestOption = options.reduce((current, option) => {
    if (option.diff < current.diff) return option
    return current
  }, options[0])

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
  threshold
}: {
  activeBounds: Bounds
  candidates: Bounds[]
  threshold: number
}): { deltaX: number; deltaY: number; guides: SpacingGuide[] } => {
  const verticalResult = calculateVerticalSpacing({
    activeBounds,
    candidates,
    threshold
  })
  const horizontalResult = calculateHorizontalSpacing({
    activeBounds,
    candidates,
    threshold
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
