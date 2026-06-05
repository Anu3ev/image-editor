/* eslint-disable no-use-before-define -- Публичную domain-функцию держим выше private helper. */
import type {
  CropRect,
  CropSize
} from '../types'

/**
 * Допуск source-размера, при котором frame уже считается упёртым в границу.
 */
const SOURCE_BOUNDARY_SIZE_EPSILON = 1

/**
 * Допуск сравнения source scale-limit из разных осей.
 */
const SOURCE_SCALE_LIMIT_EPSILON = 0.000000001

/**
 * Какая сторона crop rect остаётся неподвижной во время source-bound scale.
 */
export type CropSourceScaleAnchor = 'min' | 'center' | 'max'

/**
 * Source-bound snap plan для proportional resize.
 */
export type CropProportionalSourceSnapPlan = {
  scale: number
  rect: CropRect
}

/**
 * Параметры расчёта максимального независимого scale по одной оси внутри source.
 */
type ResolveCropSourceAxisScaleLimitParams = {
  sourceSize: CropSize
  startRect: CropRect
  axis: 'x' | 'y'
  anchor: CropSourceScaleAnchor
}

/**
 * Параметры расчёта максимального proportional scale внутри source.
 */
type ResolveCropProportionalSourceScaleLimitParams = {
  sourceSize: CropSize
  startRect: CropRect
  anchorX: CropSourceScaleAnchor
  anchorY: CropSourceScaleAnchor
}

/**
 * Scale-limit одной source-оси для snap-plan.
 */
type CropSourceAxisSnapLimit = {
  sizeLimit: number
  scale: number
}

/**
 * Возвращает максимальный proportional multiplier, при котором frame остаётся внутри source.
 */
export function resolveCropProportionalSourceScaleLimit({
  sourceSize,
  startRect,
  anchorX,
  anchorY
}: ResolveCropProportionalSourceScaleLimitParams): number {
  const startWidth = Math.max(1, startRect.width)
  const startHeight = Math.max(1, startRect.height)

  if (isSourceAxisVisiblyFilled({
    sourceSize,
    rect: startRect,
    axis: 'x'
  })) return 1

  if (isSourceAxisVisiblyFilled({
    sourceSize,
    rect: startRect,
    axis: 'y'
  })) return 1

  const widthLimit = resolveAnchoredSourceSizeLimit({
    sourceSize,
    rect: startRect,
    axis: 'x',
    anchor: anchorX
  })
  const heightLimit = resolveAnchoredSourceSizeLimit({
    sourceSize,
    rect: startRect,
    axis: 'y',
    anchor: anchorY
  })

  const anchoredMaxScale = Math.min(
    widthLimit / startWidth,
    heightLimit / startHeight
  )
  const sourceSizeMaxScale = Math.min(
    sourceSize.width / startWidth,
    sourceSize.height / startHeight
  )
  const maxScale = Math.min(anchoredMaxScale, sourceSizeMaxScale)
  const remainingGrowth = (maxScale - 1) * Math.min(startWidth, startHeight)

  if (remainingGrowth <= SOURCE_BOUNDARY_SIZE_EPSILON) return 1

  return Math.max(1, maxScale)
}

/**
 * Возвращает proportional source-bound snap-plan в округляемых source-пикселях.
 */
export function resolveCropProportionalSourceSnapPlan({
  sourceSize,
  startRect,
  anchorX,
  anchorY
}: ResolveCropProportionalSourceScaleLimitParams): CropProportionalSourceSnapPlan | null {
  const startWidth = Math.max(1, startRect.width)
  const startHeight = Math.max(1, startRect.height)

  if (isSourceAxisVisiblyFilled({
    sourceSize,
    rect: startRect,
    axis: 'x'
  })) return null

  if (isSourceAxisVisiblyFilled({
    sourceSize,
    rect: startRect,
    axis: 'y'
  })) return null

  const widthLimit = resolveCropSourceAxisSnapLimit({
    sourceSize,
    startRect,
    axis: 'x',
    anchor: anchorX
  })
  const heightLimit = resolveCropSourceAxisSnapLimit({
    sourceSize,
    startRect,
    axis: 'y',
    anchor: anchorY
  })
  const scale = Math.max(1, Math.min(widthLimit.scale, heightLimit.scale))
  const remainingGrowth = (scale - 1) * Math.min(startWidth, startHeight)

  if (remainingGrowth <= SOURCE_BOUNDARY_SIZE_EPSILON) return null

  return {
    scale,
    rect: resolveCropProportionalSourceSnapRect({
      sourceSize,
      startRect,
      anchorX,
      anchorY,
      widthLimit,
      heightLimit,
      scale
    })
  }
}

/**
 * Возвращает максимальный axis multiplier, при котором frame остаётся внутри source.
 */
export function resolveCropSourceAxisScaleLimit({
  sourceSize,
  startRect,
  axis,
  anchor
}: ResolveCropSourceAxisScaleLimitParams): number {
  const startLength = Math.max(1, getRectAxisLength({
    rect: startRect,
    axis
  }))

  if (isSourceAxisVisiblyFilled({
    sourceSize,
    rect: startRect,
    axis
  })) return 1

  const anchoredSizeLimit = resolveAnchoredSourceSizeLimit({
    sourceSize,
    rect: startRect,
    axis,
    anchor
  })
  const sourceSizeLimit = getSourceAxisLength({
    sourceSize,
    axis
  })
  const maxScale = Math.min(anchoredSizeLimit, sourceSizeLimit) / startLength
  const remainingGrowth = (maxScale - 1) * startLength

  if (remainingGrowth <= SOURCE_BOUNDARY_SIZE_EPSILON) return 1

  return Math.max(1, maxScale)
}

/**
 * Возвращает rounded source-limit одной оси для source-bound snap-plan.
 */
function resolveCropSourceAxisSnapLimit({
  sourceSize,
  startRect,
  axis,
  anchor
}: ResolveCropSourceAxisScaleLimitParams): CropSourceAxisSnapLimit {
  const sourceLength = getSourceAxisLength({
    sourceSize,
    axis
  })
  const startLength = Math.max(1, getRectAxisLength({
    rect: startRect,
    axis
  }))
  const rawSizeLimit = resolveAnchoredSourceSizeLimit({
    sourceSize,
    rect: startRect,
    axis,
    anchor
  })
  const sizeLimit = Math.min(sourceLength, Math.max(1, Math.round(rawSizeLimit)))

  return {
    sizeLimit,
    scale: sizeLimit / startLength
  }
}

/**
 * Материализует source-rect для rounded proportional source-bound snap-plan.
 */
function resolveCropProportionalSourceSnapRect({
  sourceSize,
  startRect,
  anchorX,
  anchorY,
  widthLimit,
  heightLimit,
  scale
}: {
  sourceSize: CropSize
  startRect: CropRect
  anchorX: CropSourceScaleAnchor
  anchorY: CropSourceScaleAnchor
  widthLimit: CropSourceAxisSnapLimit
  heightLimit: CropSourceAxisSnapLimit
  scale: number
}): CropRect {
  const width = startRect.width * scale
  const height = startRect.height * scale

  return {
    left: resolveCropSourceSnapRectStart({
      sourceSize,
      startRect,
      axis: 'x',
      anchor: anchorX,
      nextLength: width,
      shouldSnapToSource: isScaleLimitActive({
        scale,
        limit: widthLimit.scale
      })
    }),
    top: resolveCropSourceSnapRectStart({
      sourceSize,
      startRect,
      axis: 'y',
      anchor: anchorY,
      nextLength: height,
      shouldSnapToSource: isScaleLimitActive({
        scale,
        limit: heightLimit.scale
      })
    }),
    width,
    height
  }
}

/**
 * Возвращает start source-rect для обычного anchor или snapped source-boundary.
 */
function resolveCropSourceSnapRectStart({
  sourceSize,
  startRect,
  axis,
  anchor,
  nextLength,
  shouldSnapToSource
}: {
  sourceSize: CropSize
  startRect: CropRect
  axis: 'x' | 'y'
  anchor: CropSourceScaleAnchor
  nextLength: number
  shouldSnapToSource: boolean
}): number {
  const sourceLength = getSourceAxisLength({
    sourceSize,
    axis
  })
  const sourceStart = -sourceLength / 2
  const sourceEnd = sourceLength / 2
  const start = axis === 'x' ? startRect.left : startRect.top
  const length = getRectAxisLength({
    rect: startRect,
    axis
  })

  if (!shouldSnapToSource) {
    return resolveAnchoredRectStart({
      start,
      length,
      nextLength,
      anchor
    })
  }

  if (anchor === 'min') return sourceEnd - nextLength
  if (anchor === 'max') return sourceStart

  return sourceStart + ((sourceLength - nextLength) / 2)
}

/**
 * Возвращает true, если выбранный scale упёрся в limit этой оси.
 */
function isScaleLimitActive({
  scale,
  limit
}: {
  scale: number
  limit: number
}): boolean {
  return Math.abs(scale - limit) <= SOURCE_SCALE_LIMIT_EPSILON
}

/**
 * Возвращает anchored start без source-boundary snap.
 */
function resolveAnchoredRectStart({
  start,
  length,
  nextLength,
  anchor
}: {
  start: number
  length: number
  nextLength: number
  anchor: CropSourceScaleAnchor
}): number {
  if (anchor === 'min') return start
  if (anchor === 'max') return start + length - nextLength

  return start + ((length - nextLength) / 2)
}

/**
 * Возвращает true, если crop rect уже занимает всю source-длину в отображаемых пикселях.
 */
function isSourceAxisVisiblyFilled({
  sourceSize,
  rect,
  axis
}: {
  sourceSize: CropSize
  rect: CropRect
  axis: 'x' | 'y'
}): boolean {
  const sourceLength = getSourceAxisLength({
    sourceSize,
    axis
  })
  const rectLength = getRectAxisLength({
    rect,
    axis
  })

  return Math.round(rectLength) >= Math.round(sourceLength)
}

/**
 * Возвращает длину source по указанной оси.
 */
function getSourceAxisLength({
  sourceSize,
  axis
}: {
  sourceSize: CropSize
  axis: 'x' | 'y'
}): number {
  return axis === 'x' ? sourceSize.width : sourceSize.height
}

/**
 * Возвращает длину rect по указанной оси.
 */
function getRectAxisLength({
  rect,
  axis
}: {
  rect: CropRect
  axis: 'x' | 'y'
}): number {
  return axis === 'x' ? rect.width : rect.height
}

/**
 * Возвращает максимальный размер вдоль оси с учётом fixed anchor.
 */
function resolveAnchoredSourceSizeLimit({
  sourceSize,
  rect,
  axis,
  anchor
}: {
  sourceSize: CropSize
  rect: CropRect
  axis: 'x' | 'y'
  anchor: CropSourceScaleAnchor
}): number {
  const sourceLength = axis === 'x' ? sourceSize.width : sourceSize.height
  const rectStart = axis === 'x' ? rect.left : rect.top
  const rectLength = axis === 'x' ? rect.width : rect.height
  const sourceStart = -sourceLength / 2
  const sourceEnd = sourceLength / 2
  const rectEnd = rectStart + rectLength
  const rectCenter = rectStart + (rectLength / 2)

  if (anchor === 'min') {
    const fixedStart = snapSourceBoundaryValue({
      value: rectStart,
      boundary: sourceStart
    })

    return sourceEnd - fixedStart
  }
  if (anchor === 'max') {
    const fixedEnd = snapSourceBoundaryValue({
      value: rectEnd,
      boundary: sourceEnd
    })

    return fixedEnd - sourceStart
  }

  return Math.min(
    rectCenter - sourceStart,
    sourceEnd - rectCenter
  ) * 2
}

/**
 * Возвращает source-boundary значение без микрозазора от предыдущего live resize.
 */
function snapSourceBoundaryValue({
  value,
  boundary
}: {
  value: number
  boundary: number
}): number {
  if (Math.abs(value - boundary) <= SOURCE_BOUNDARY_SIZE_EPSILON) {
    return boundary
  }

  return value
}
