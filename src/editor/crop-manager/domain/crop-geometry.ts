/* eslint-disable no-use-before-define -- Keep public functions above private helpers. */
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
import type { ObjectBounds } from '../../utils/geometry'

/**
 * Minimum crop frame width in local source coordinates.
 */
export const MIN_CROP_FRAME_WIDTH = CANVAS_MIN_WIDTH

/**
 * Minimum crop frame height in local source coordinates.
 */
export const MIN_CROP_FRAME_HEIGHT = CANVAS_MIN_HEIGHT

/**
 * Maximum crop frame width in local source coordinates.
 */
export const MAX_CROP_FRAME_WIDTH = CANVAS_MAX_WIDTH

/**
 * Maximum crop frame height in local source coordinates.
 */
export const MAX_CROP_FRAME_HEIGHT = CANVAS_MAX_HEIGHT

/**
 * Minimum square crop frame size for backward compatibility.
 */
export const MIN_CROP_FRAME_SIZE = MIN_CROP_FRAME_WIDTH

/**
 * Returns the crop frame size based on an explicit size, aspect ratio, or full source size.
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
 * Converts the visible aspect ratio of the crop area to local image coordinates.
 */
export function resolveImageCropSourceAspectRatio({
  source,
  aspectRatio
}: {
  source: Pick<FabricObject, 'scaleX' | 'scaleY'>
  aspectRatio: CropAspectRatio
}): CropAspectRatio {
  const scaleX = Math.abs(source.scaleX ?? 1)
  const scaleY = Math.abs(source.scaleY ?? 1)

  return {
    width: aspectRatio.width / scaleX,
    height: aspectRatio.height / scaleY
  }
}

/**
 * Returns the local size of the crop mode source.
 */
export function getSourceSize({ source }: { source: FabricObject }): CropSize {
  return {
    width: source.width,
    height: source.height
  }
}

/** Returns the crop frame or source content bounds in scene coordinates, without the stroke. */
export function getCropObjectSceneBounds({ object }: { object: FabricObject }): ObjectBounds {
  const matrix = object.calcTransformMatrix()
  const halfWidth = object.width / 2
  const halfHeight = object.height / 2
  const points = [
    new Point(-halfWidth, -halfHeight),
    new Point(halfWidth, -halfHeight),
    new Point(halfWidth, halfHeight),
    new Point(-halfWidth, halfHeight)
  ].map((point) => point.transform(matrix))
  const { left, top, width, height } = getBoundsFromPoints({ points })

  return {
    left,
    right: left + width,
    top,
    bottom: top + height,
    centerX: left + (width / 2),
    centerY: top + (height / 2)
  }
}

/**
 * Returns the crop frame rect in local source coordinates.
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
 * Constrains the frame to the bounds of the crop mode source.
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
 * Constrains a fixed-aspect-ratio frame to the source bounds while preserving its current aspect ratio.
 */
export function clampCropFrameToSourcePreservingAspectRatio({
  source,
  frame
}: {
  source: FabricObject
  frame: Rect
}): void {
  shrinkFrameToSourcePreservingAspectRatio({
    source,
    frame
  })
  moveFrameInsideSource({
    source,
    frame
  })
}

/**
 * Returns the bounds of a set of points.
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
 * Returns the crop frame corners, excluding the stroke.
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
 * Finds the largest size with the specified aspect ratio that fits inside the source.
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
 * Constrains the explicit size to the source dimensions.
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
 * Shrinks the frame if it exceeds the source size.
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
 * Shrinks the frame by a uniform scale factor if a fixed-aspect-ratio resize exceeds the source bounds.
 */
function shrinkFrameToSourcePreservingAspectRatio({
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
  const scaleRatio = Math.min(widthRatio, heightRatio)

  if (scaleRatio < 1) {
    frame.set({
      scaleX: (frame.scaleX ?? 1) * scaleRatio,
      scaleY: (frame.scaleY ?? 1) * scaleRatio
    })
  }

  frame.setCoords()
}

/**
 * Moves the frame back inside the source without changing its size.
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
  const localCenter = getCropRectCenter({ rect })
  const localOffset = getCropSourceClampOffset({
    rect,
    sourceSize
  })

  const nextCenter = new Point(
    localCenter.x + localOffset.x,
    localCenter.y + localOffset.y
  ).transform(source.calcTransformMatrix())

  frame.setPositionByOrigin(nextCenter, 'center', 'center')
  frame.setCoords()
}

/**
 * Returns the center of the crop rect.
 */
function getCropRectCenter({ rect }: { rect: CropRect }): Point {
  return new Point(
    rect.left + rect.width / 2,
    rect.top + rect.height / 2
  )
}

/**
 * Calculates the offset needed to move the crop area inside the source in source pixels without modifying objects.
 */
export function getCropSourceClampOffset({
  rect,
  sourceSize
}: {
  rect: CropRect
  sourceSize: CropSize
}): Point {
  const sourceLeft = -sourceSize.width / 2
  const sourceTop = -sourceSize.height / 2
  const sourceRight = sourceSize.width / 2
  const sourceBottom = sourceSize.height / 2
  let offsetX = 0
  let offsetY = 0

  if (rect.left < sourceLeft) {
    offsetX = sourceLeft - rect.left
  }
  if (rect.left + rect.width > sourceRight) {
    offsetX = sourceRight - rect.left - rect.width
  }
  if (rect.top < sourceTop) {
    offsetY = sourceTop - rect.top
  }
  if (rect.top + rect.height > sourceBottom) {
    offsetY = sourceBottom - rect.top - rect.height
  }

  return new Point(offsetX, offsetY)
}

/**
 * Clamps a number to a range.
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
