/* eslint-disable no-use-before-define -- Публичные функции держим выше private helpers. */
import {
  Point,
  util,
  type FabricObject,
  type Rect
} from 'fabric'

import {
  CANVAS_MAX_HEIGHT,
  CANVAS_MAX_WIDTH,
  CANVAS_MIN_HEIGHT,
  CANVAS_MIN_WIDTH
} from '../../constants'
import type {
  CropAspectRatio,
  CropRect,
  CropSize
} from '../types'

/**
 * Минимальная ширина crop frame в локальных координатах источника.
 */
export const MIN_CROP_FRAME_WIDTH = CANVAS_MIN_WIDTH

/**
 * Минимальная высота crop frame в локальных координатах источника.
 */
export const MIN_CROP_FRAME_HEIGHT = CANVAS_MIN_HEIGHT

/**
 * Максимальная ширина crop frame в локальных координатах источника.
 */
export const MAX_CROP_FRAME_WIDTH = CANVAS_MAX_WIDTH

/**
 * Максимальная высота crop frame в локальных координатах источника.
 */
export const MAX_CROP_FRAME_HEIGHT = CANVAS_MAX_HEIGHT

/**
 * Минимальный квадратный размер crop frame для обратной совместимости.
 */
export const MIN_CROP_FRAME_SIZE = MIN_CROP_FRAME_WIDTH

/**
 * Возвращает размер crop frame по explicit size, aspect ratio или полному размеру источника.
 */
export function resolveCropSize({
  sourceSize,
  size,
  aspectRatio,
  allowOverflow
}: {
  sourceSize: CropSize
  size?: CropSize
  aspectRatio?: CropAspectRatio
  allowOverflow: boolean
}): CropSize {
  if (size) {
    return clampCropSize({
      size,
      sourceSize,
      allowOverflow
    })
  }

  if (aspectRatio) {
    return resolveAspectRatioSize({
      aspectRatio,
      sourceSize
    })
  }

  return {
    width: sourceSize.width,
    height: sourceSize.height
  }
}

/**
 * Возвращает локальный size источника crop mode.
 */
export function getSourceSize({ source }: { source: FabricObject }): CropSize {
  return {
    width: source.width,
    height: source.height
  }
}

/**
 * Возвращает crop rect frame в локальных координатах источника.
 */
export function getCropRectInSource({
  source,
  frame
}: {
  source: FabricObject
  frame: Rect
}): CropRect {
  const sourceMatrix = source.calcTransformMatrix()
  const inverseSourceMatrix = util.invertTransform(sourceMatrix)
  const frameMatrix = frame.calcTransformMatrix()
  const localPoints = getFrameLocalCorners({ frame }).map((point) => {
    return point.transform(frameMatrix).transform(inverseSourceMatrix)
  })

  return getBoundsFromPoints({ points: localPoints })
}

/**
 * Ограничивает frame границами источника crop mode.
 */
export function clampCropFrameToSource({
  source,
  frame
}: {
  source: FabricObject
  frame: Rect
}): void {
  shrinkFrameToSource({
    source,
    frame
  })
  moveFrameInsideSource({
    source,
    frame
  })
}

/**
 * Возвращает bounds по набору точек.
 */
function getBoundsFromPoints({ points }: { points: Point[] }): CropRect {
  const left = Math.min(...points.map((point) => point.x))
  const top = Math.min(...points.map((point) => point.y))
  const right = Math.max(...points.map((point) => point.x))
  const bottom = Math.max(...points.map((point) => point.y))

  return {
    left,
    top,
    width: right - left,
    height: bottom - top
  }
}

/**
 * Возвращает углы crop frame без учёта stroke.
 */
function getFrameLocalCorners({ frame }: { frame: Rect }): Point[] {
  const halfWidth = frame.width / 2
  const halfHeight = frame.height / 2

  return [
    new Point(-halfWidth, -halfHeight),
    new Point(halfWidth, -halfHeight),
    new Point(halfWidth, halfHeight),
    new Point(-halfWidth, halfHeight)
  ]
}

/**
 * Подбирает максимальный размер внутри источника с заданной пропорцией.
 */
function resolveAspectRatioSize({
  sourceSize,
  aspectRatio
}: {
  sourceSize: CropSize
  aspectRatio: CropAspectRatio
}): CropSize {
  const sourceRatio = sourceSize.width / sourceSize.height
  const requestedRatio = aspectRatio.width / aspectRatio.height

  if (requestedRatio >= sourceRatio) {
    return {
      width: sourceSize.width,
      height: sourceSize.width / requestedRatio
    }
  }

  return {
    width: sourceSize.height * requestedRatio,
    height: sourceSize.height
  }
}

/**
 * Ограничивает explicit size размерами источника.
 */
function clampCropSize({
  size,
  sourceSize,
  allowOverflow
}: {
  size: CropSize
  sourceSize: CropSize
  allowOverflow: boolean
}): CropSize {
  const maxWidth = allowOverflow
    ? MAX_CROP_FRAME_WIDTH
    : Math.min(sourceSize.width, MAX_CROP_FRAME_WIDTH)
  const maxHeight = allowOverflow
    ? MAX_CROP_FRAME_HEIGHT
    : Math.min(sourceSize.height, MAX_CROP_FRAME_HEIGHT)

  if (allowOverflow) {
    return {
      width: clampNumber({
        value: size.width,
        min: MIN_CROP_FRAME_WIDTH,
        max: maxWidth
      }),
      height: clampNumber({
        value: size.height,
        min: MIN_CROP_FRAME_HEIGHT,
        max: maxHeight
      })
    }
  }

  return {
    width: clampNumber({
      value: size.width,
      min: MIN_CROP_FRAME_WIDTH,
      max: maxWidth
    }),
    height: clampNumber({
      value: size.height,
      min: MIN_CROP_FRAME_HEIGHT,
      max: maxHeight
    })
  }
}

/**
 * Уменьшает frame, если он стал больше источника.
 */
function shrinkFrameToSource({
  source,
  frame
}: {
  source: FabricObject
  frame: Rect
}): void {
  const rect = getCropRectInSource({
    source,
    frame
  })
  const sourceSize = getSourceSize({ source })
  const widthRatio = sourceSize.width / Math.max(rect.width, MIN_CROP_FRAME_WIDTH)
  const heightRatio = sourceSize.height / Math.max(rect.height, MIN_CROP_FRAME_HEIGHT)

  if (widthRatio < 1) {
    frame.set({ scaleX: (frame.scaleX ?? 1) * widthRatio })
  }
  if (heightRatio < 1) {
    frame.set({ scaleY: (frame.scaleY ?? 1) * heightRatio })
  }

  frame.setCoords()
}

/**
 * Двигает frame обратно внутрь источника без изменения его размера.
 */
function moveFrameInsideSource({
  source,
  frame
}: {
  source: FabricObject
  frame: Rect
}): void {
  const rect = getCropRectInSource({
    source,
    frame
  })
  const sourceSize = getSourceSize({ source })
  const sourceBounds = getCenteredSourceBounds({ sourceSize })
  const localCenter = getCropRectCenter({ rect })
  const localOffset = getLocalClampOffset({
    rect,
    sourceBounds
  })

  const nextCenter = new Point(
    localCenter.x + localOffset.x,
    localCenter.y + localOffset.y
  ).transform(source.calcTransformMatrix())

  frame.setPositionByOrigin(nextCenter, 'center', 'center')
  frame.setCoords()
}

/**
 * Возвращает bounds источника в его локальной системе координат.
 */
function getCenteredSourceBounds({ sourceSize }: { sourceSize: CropSize }): CropRect {
  return {
    left: -sourceSize.width / 2,
    top: -sourceSize.height / 2,
    width: sourceSize.width,
    height: sourceSize.height
  }
}

/**
 * Возвращает центр crop rect.
 */
function getCropRectCenter({ rect }: { rect: CropRect }): Point {
  return new Point(
    rect.left + rect.width / 2,
    rect.top + rect.height / 2
  )
}

/**
 * Считает локальный offset, который возвращает rect внутрь source bounds.
 */
function getLocalClampOffset({
  rect,
  sourceBounds
}: {
  rect: CropRect
  sourceBounds: CropRect
}): Point {
  const sourceRight = sourceBounds.left + sourceBounds.width
  const sourceBottom = sourceBounds.top + sourceBounds.height
  let offsetX = 0
  let offsetY = 0

  if (rect.left < sourceBounds.left) {
    offsetX = sourceBounds.left - rect.left
  }
  if (rect.left + rect.width > sourceRight) {
    offsetX = sourceRight - rect.left - rect.width
  }
  if (rect.top < sourceBounds.top) {
    offsetY = sourceBounds.top - rect.top
  }
  if (rect.top + rect.height > sourceBottom) {
    offsetY = sourceBottom - rect.top - rect.height
  }

  return new Point(offsetX, offsetY)
}

/**
 * Ограничивает число диапазоном.
 */
function clampNumber({
  value,
  min,
  max
}: {
  value: number
  min: number
  max: number
}): number {
  return Math.max(min, Math.min(max, value))
}
