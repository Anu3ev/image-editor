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
 * Какая сторона crop rect остаётся неподвижной во время source-bound scale.
 */
export type CropSourceScaleAnchor = 'min' | 'center' | 'max'

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

  if (anchor === 'min') return sourceEnd - rectStart
  if (anchor === 'max') return rectEnd - sourceStart

  return Math.min(
    rectCenter - sourceStart,
    sourceEnd - rectCenter
  ) * 2
}
