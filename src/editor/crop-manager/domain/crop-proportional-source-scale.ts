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
 * Какая сторона crop rect остаётся неподвижной во время proportional scale.
 */
export type CropProportionalSourceScaleAnchor = 'min' | 'center' | 'max'

/**
 * Параметры расчёта максимального proportional scale внутри source.
 */
type ResolveCropProportionalSourceScaleLimitParams = {
  sourceSize: CropSize
  startRect: CropRect
  anchorX: CropProportionalSourceScaleAnchor
  anchorY: CropProportionalSourceScaleAnchor
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
  const sourceLength = axis === 'x' ? sourceSize.width : sourceSize.height
  const rectLength = axis === 'x' ? rect.width : rect.height

  return Math.round(rectLength) >= Math.round(sourceLength)
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
  anchor: CropProportionalSourceScaleAnchor
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
