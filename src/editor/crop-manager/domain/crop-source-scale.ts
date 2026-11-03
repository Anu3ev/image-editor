/* eslint-disable no-use-before-define -- Keep the public domain function above the private helper. */
import type {
  FabricObject,
  Transform
} from 'fabric'

import type {
  CropRect,
  CropSize
} from '../types'

/**
 * Source size tolerance within which the frame is considered to have reached the boundary.
 */
const SOURCE_BOUNDARY_SIZE_EPSILON = 1

/**
 * Which side of the crop rect stays fixed during source-bound scaling.
 */
export type CropSourceScaleAnchor = 'min' | 'center' | 'max'

/** Source with flip flags, if the current CropFrame is associated with a source. */
type CropScaleAnchorSource = Pick<FabricObject, 'flipX' | 'flipY'>

/** Part of the Fabric transform that determines the fixed side during resizing. */
type CropScaleAnchorTransform = Pick<Transform, 'corner' | 'originX' | 'originY'>

/** Visually fixed sides for each crop area handle. */
const CROP_CONTROL_VISUAL_ANCHORS: {
  [control: string]: {
    x?: CropSourceScaleAnchor
    y?: CropSourceScaleAnchor
  }
} = {
  tl: { x: 'max', y: 'max' },
  tr: { x: 'min', y: 'max' },
  bl: { x: 'max', y: 'min' },
  br: { x: 'min', y: 'min' },
  ml: { x: 'max' },
  mr: { x: 'min' },
  mt: { y: 'max' },
  mb: { y: 'min' }
}

/** Visually fixed sides for the Fabric origin on each axis. */
const CROP_ORIGIN_VISUAL_ANCHORS: {
  x: { [origin: string]: CropSourceScaleAnchor }
  y: { [origin: string]: CropSourceScaleAnchor }
} = {
  x: { left: 'min', center: 'center', right: 'max', 0: 'min', 0.5: 'center', 1: 'max' },
  y: { top: 'min', center: 'center', bottom: 'max', 0: 'min', 0.5: 'center', 1: 'max' }
}

/**
 * Returns the fixed side of the resize in local source coordinates.
 */
export function resolveCropSourceScaleAnchor({
  source,
  transform,
  axis
}: {
  source?: CropScaleAnchorSource | null
  transform: CropScaleAnchorTransform
  axis: 'x' | 'y'
}): CropSourceScaleAnchor {
  const visualAnchor = resolveCropVisualScaleAnchor({ transform, axis })
  const sourceFlipped = axis === 'x' ? source?.flipX === true : source?.flipY === true

  if (!sourceFlipped || visualAnchor === 'center') return visualAnchor

  return visualAnchor === 'min' ? 'max' : 'min'
}

/**
 * Parameters for calculating the maximum independent scale along one axis within the source.
 */
type ResolveCropSourceAxisScaleLimitParams = {
  sourceSize: CropSize
  startRect: CropRect
  axis: 'x' | 'y'
  anchor: CropSourceScaleAnchor
}

/**
 * Returns the visually fixed side of the resize before conversion to source coordinates.
 */
function resolveCropVisualScaleAnchor({
  transform,
  axis
}: {
  transform: CropScaleAnchorTransform
  axis: 'x' | 'y'
}): CropSourceScaleAnchor {
  const { corner } = transform
  const origin = axis === 'x' ? transform.originX : transform.originY
  const originAnchor = CROP_ORIGIN_VISUAL_ANCHORS[axis][String(origin)]
  if (originAnchor === 'center') return originAnchor

  const controlAnchor = CROP_CONTROL_VISUAL_ANCHORS[corner]?.[axis]
  if (controlAnchor) return controlAnchor

  return originAnchor ?? 'center'
}

/**
 * Returns the maximum axis multiplier that keeps the frame within the source.
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
 * Returns true if the crop rect already spans the full source length in displayed pixels.
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
 * Returns the source length along the specified axis.
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
 * Returns the rect length along the specified axis.
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
 * Returns the maximum size along the axis, accounting for the fixed anchor.
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
 * Returns the source boundary value without the tiny gap left by the previous live resize.
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
