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
 * Relative size of the 2x2 shrink system determinant below which the system counts as singular.
 */
const SINGULAR_SYSTEM_EPSILON = 0.000001

/**
 * Overflow or clamp offset in source pixels below which a frame counts as already inside the source.
 * It absorbs floating-point error, so a repeated clamp of a fitted frame changes neither its size nor position.
 */
export const SOURCE_FIT_EPSILON = 0.000001

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
  const localPoints = mapFramePointsToSource({
    source,
    frame,
    points: getFrameLocalCorners({ frame })
  })

  return getBoundsFromPoints({ points: localPoints })
}

/**
 * Returns true if the frame stays a rectangle aligned with the source axes in source coordinates.
 * Skew on the source or on its parent group turns the frame into a parallelogram there, so limits and fixed sides
 * taken from the frame bounding box in source coordinates no longer describe the frame itself.
 */
export function isFrameRectangularInSource({
  source,
  frame
}: {
  source: FabricObject
  frame: Rect
}): boolean {
  const [origin, alongX, alongY] = mapFramePointsToSource({
    source,
    frame,
    points: [new Point(0, 0), new Point(1, 0), new Point(0, 1)]
  })
  const xAxisDrift = Math.abs(alongX.y - origin.y)
  const yAxisDrift = Math.abs(alongY.x - origin.x)

  return xAxisDrift <= SOURCE_FIT_EPSILON * Math.abs(alongX.x - origin.x)
    && yAxisDrift <= SOURCE_FIT_EPSILON * Math.abs(alongY.y - origin.y)
}

/**
 * Maps points from frame-local coordinates to local source coordinates.
 */
export function mapFramePointsToSource({
  source,
  frame,
  points
}: {
  source: FabricObject
  frame: Rect
  points: Point[]
}): Point[] {
  const frameMatrix = frame.calcTransformMatrix()
  const inverseSourceMatrix = util.invertTransform(source.calcTransformMatrix())

  return points.map((point) => point.transform(frameMatrix).transform(inverseSourceMatrix))
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
 * Shrinks only the overflowing axes of the frame so it fits the source.
 * On a skewed source the frame size on one axis also widens its bounds on the other, so each axis shrinks just
 * enough given the other one. When shrinking only the overflowing axes cannot fit the frame while keeping every
 * shrunk axis at least the minimum crop size, for example under a steep skew, the frame is shrunk
 * proportionally instead.
 */
function shrinkFrameToSource({
  source,
  frame
}: {
  source: FabricObject
  frame: Rect
}): void {
  const shrink = resolvePerAxisShrink({
    extent: getFrameSourceExtent({ source, frame }),
    sourceSize: getSourceSize({ source })
  })

  if (!shrink) {
    shrinkFrameToSourcePreservingAspectRatio({
      source,
      frame
    })
    return
  }

  frame.set({
    scaleX: (frame.scaleX ?? 1) * shrink.x,
    scaleY: (frame.scaleY ?? 1) * shrink.y
  })
  frame.setCoords()
}

/**
 * Frame bounds in source pixels, split by the frame axis that produces them.
 * Scaling the frame by `x` on its X axis multiplies `widthFromX` and `heightFromX` by `x`, and likewise for Y,
 * so `width = widthFromX + widthFromY`. Skew is what makes `widthFromY` and `heightFromX` non-zero.
 */
type CropFrameSourceExtent = {
  widthFromX: number
  widthFromY: number
  heightFromX: number
  heightFromY: number
}

/**
 * Measures how each frame axis contributes to the frame bounds in source pixels.
 */
function getFrameSourceExtent({
  source,
  frame
}: {
  source: FabricObject
  frame: Rect
}): CropFrameSourceExtent {
  const [center, halfX, halfY] = mapFramePointsToSource({
    source,
    frame,
    points: [
      new Point(0, 0),
      new Point(frame.width / 2, 0),
      new Point(0, frame.height / 2)
    ]
  })

  return {
    widthFromX: 2 * Math.abs(halfX.x - center.x),
    widthFromY: 2 * Math.abs(halfY.x - center.x),
    heightFromX: 2 * Math.abs(halfX.y - center.y),
    heightFromY: 2 * Math.abs(halfY.y - center.y)
  }
}

/**
 * Scale multipliers for the crop frame axes.
 */
export type CropAxisShrink = {
  x: number
  y: number
}

/**
 * Returns per-axis scale multipliers that fit the frame into the source while shrinking only overflowing axes,
 * or `null` when no such multipliers keep a shrunk axis at least the minimum crop size.
 */
function resolvePerAxisShrink({
  extent,
  sourceSize
}: {
  extent: CropFrameSourceExtent
  sourceSize: CropSize
}): CropAxisShrink | null {
  const { widthFromX, widthFromY, heightFromX, heightFromY } = extent
  const overflowsWidth = widthFromX + widthFromY - sourceSize.width > SOURCE_FIT_EPSILON
  const overflowsHeight = heightFromX + heightFromY - sourceSize.height > SOURCE_FIT_EPSILON
  if (!overflowsWidth && !overflowsHeight) return { x: 1, y: 1 }

  // With the other axis unchanged, one axis shrinks until both bounds fit: on a skewed source it also narrows
  // the bounds of the other axis. When both axes shrink, both bounds touch the source: a 2x2 linear system.
  const shrinkXOnly = {
    x: Math.min(
      resolveAxisLimit({ available: sourceSize.width - widthFromY, extent: widthFromX }),
      resolveAxisLimit({ available: sourceSize.height - heightFromY, extent: heightFromX })
    ),
    y: 1
  }
  const shrinkYOnly = {
    x: 1,
    y: Math.min(
      resolveAxisLimit({ available: sourceSize.height - heightFromX, extent: heightFromY }),
      resolveAxisLimit({ available: sourceSize.width - widthFromX, extent: widthFromY })
    )
  }
  const determinant = (widthFromX * heightFromY) - (widthFromY * heightFromX)
  const determinantScale = (widthFromX * heightFromY) + (widthFromY * heightFromX)
  const shrinkBoth = Math.abs(determinant) > determinantScale * SINGULAR_SYSTEM_EPSILON
    ? {
      x: ((sourceSize.width * heightFromY) - (widthFromY * sourceSize.height)) / determinant,
      y: ((widthFromX * sourceSize.height) - (sourceSize.width * heightFromX)) / determinant
    }
    : null
  const candidates = [
    overflowsWidth && overflowsHeight ? shrinkBoth : null,
    overflowsWidth ? shrinkXOnly : null,
    overflowsHeight ? shrinkYOnly : null
  ]

  return resolveFittingShrink({ candidates, extent, sourceSize })
}

/**
 * Returns the largest multiplier for one axis contribution that fits the available source length.
 */
function resolveAxisLimit({ available, extent }: { available: number, extent: number }): number {
  if (extent <= 0) return Infinity

  return available / extent
}

/**
 * Returns the first candidate that fits the frame into the source and keeps every shrunk axis at least the
 * minimum crop size. Multipliers above 1 are capped, because a candidate never enlarges the frame.
 */
function resolveFittingShrink({
  candidates,
  extent,
  sourceSize
}: {
  candidates: Array<CropAxisShrink | null>
  extent: CropFrameSourceExtent
  sourceSize: CropSize
}): CropAxisShrink | null {
  for (const candidate of candidates) {
    if (!candidate) continue

    const x = Math.min(1, candidate.x)
    const y = Math.min(1, candidate.y)
    const width = (x * extent.widthFromX) + (y * extent.widthFromY)
    const height = (x * extent.heightFromX) + (y * extent.heightFromY)
    const keepsMinimumWidth = x === 1 || x * extent.widthFromX >= MIN_CROP_FRAME_WIDTH
    const keepsMinimumHeight = y === 1 || y * extent.heightFromY >= MIN_CROP_FRAME_HEIGHT
    const fitsSource = width - sourceSize.width <= SOURCE_FIT_EPSILON
      && height - sourceSize.height <= SOURCE_FIT_EPSILON

    if (keepsMinimumWidth && keepsMinimumHeight && fitsSource) return { x, y }
  }

  return null
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
 * A frame flush with both opposite source edges gets a floating-point offset on every clamp, so an offset within
 * the fit tolerance leaves the frame in place and a repeated clamp, such as the one on mouseup, does not move it.
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

  if (Math.abs(localOffset.x) <= SOURCE_FIT_EPSILON && Math.abs(localOffset.y) <= SOURCE_FIT_EPSILON) {
    frame.setCoords()
    return
  }

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
