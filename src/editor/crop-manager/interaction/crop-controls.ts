/* eslint-disable no-use-before-define -- Public control setup remains below the Fabric transform helpers. */
import {
  Control,
  controlsUtils,
  type FabricObject,
  type Rect,
  type Transform
} from 'fabric'

import {
  getCropRectInSource,
  getSourceSize,
  MAX_CROP_FRAME_HEIGHT,
  MAX_CROP_FRAME_WIDTH,
  MIN_CROP_FRAME_HEIGHT,
  MIN_CROP_FRAME_WIDTH
} from '../domain/crop-geometry'
import { getCropFrameSourceSize } from '../domain/crop-frame-size'
import { resolveCropFrameResizePreserveAspectRatio } from '../domain/crop-resize-mode'
import {
  resolveCropProportionalSourceScaleLimit,
  resolveCropSourceScaleAnchor,
  resolveCropSourceAxisScaleLimit,
  type CropSourceScaleAnchor
} from '../domain/crop-source-scale'
import type { CropSourceBoundTransform, CropSourceScaleBounds } from './crop-resize.types'

/**
 * Tolerance for comparing client pointer coordinates within a single Fabric transform session.
 */
const POINTER_POSITION_EPSILON = 0.001

/**
 * Source gap tolerance within which a live resize is considered to have reached the source boundary.
 */
const SOURCE_BOUNDARY_SCALE_GAP_PIXELS = 1

/**
 * Small tolerance for the source gap after converting scale between canvas and source coordinates.
 */
const SOURCE_BOUNDARY_SCALE_GAP_EPSILON = 0.000001

/**
 * Tolerance for comparing scale values calculated in different coordinate system layers.
 */
const SCALE_COMPARISON_EPSILON = 0.000000001

/**
 * Corner controls responsible for diagonal crop frame resizing.
 */
const CROP_CORNER_CONTROL_KEYS = ['tl', 'tr', 'bl', 'br'] as const

/**
 * Side controls responsible for horizontal and vertical crop frame resizing.
 */
const CROP_SIDE_CONTROL_KEYS = ['ml', 'mr', 'mt', 'mb'] as const

/**
 * Transform that retains the initial side sign during scaling.
 */
interface CropScaleTransform extends CropSourceBoundTransform {
  signX?: number
  signY?: number
}

/**
 * The crop frame stores the source scale so that live resizing can be constrained in source pixels.
 */
type CropFrameScaleTarget = Rect & {
  cropSource?: FabricObject | null
  cropAllowFrameOverflow?: boolean
  cropSourceScaleX?: number
  cropSourceScaleY?: number
}

/**
 * Control with a marker indicating that it has already been configured for crop mode.
 */
type CropResizeControl = Control & {
  cropResizeControl?: boolean
}

/**
 * Frame scale limits in Fabric target coordinates.
 */
type CropScaleLimits = {
  minScaleX: number
  maxScaleX: number
  minScaleY: number
  maxScaleY: number
}

/**
 * Crop frame dimensions in its local geometry, excluding the stroke.
 */
type CropScaleDimensions = {
  x: number
  y: number
}

/**
 * Result of calculating the scale along one axis.
 */
type CropAxisScaleResult = {
  scale: number
  sourceClamped: boolean
}

/**
 * Axis of a side resize.
 */
type CropScaleAxis = 'x' | 'y'

/**
 * Action names for side-resize crop controls without switching to skew.
 */
type CropSideScaleActionName = 'scaleX' | 'scaleY'

/**
 * Initial control signs relative to the center of the crop frame.
 */
type CropScaleSigns = {
  signX: number
  signY: number
}

/**
 * Side control keys for the crop frame.
 */
type CropSideControlKey = typeof CROP_SIDE_CONTROL_KEYS[number]

/**
 * Cursor for resizing the crop frame from the side.
 */
const CROP_SIDE_RESIZE_CURSOR_BY_KEY: Record<CropSideControlKey, string> = {
  ml: 'w-resize',
  mr: 'e-resize',
  mt: 'n-resize',
  mb: 's-resize'
}

/**
 * Returns true if the transform scales relative to the center.
 */
function isCenteredTransform({ transform }: { transform: Transform }): boolean {
  const { originX, originY } = transform

  return (originX === 'center' || originX === 0.5) && (originY === 'center' || originY === 0.5)
}

/**
 * Performs a free frame resize independently along both axes.
 */
function scaleCropFrameFromCorner({
  transform,
  x,
  y
}: {
  transform: Transform
  x: number
  y: number
}): boolean {
  const cropTransform = transform as CropScaleTransform
  const { target } = cropTransform
  const { scaleX: currentScaleX = 1, scaleY: currentScaleY = 1 } = target
  if (isPointerAtTransformStart({
    transform: cropTransform,
    x,
    y
  })) {
    restoreOriginalScale({ transform: cropTransform })

    return true
  }

  const localPoint = controlsUtils.getLocalPoint(
    cropTransform,
    cropTransform.originX,
    cropTransform.originY,
    x,
    y
  )
  setInitialScaleSigns({ transform: cropTransform })

  applyFreeCornerScale({
    transform: cropTransform,
    localPoint
  })

  return currentScaleX !== target.scaleX || currentScaleY !== target.scaleY
}

/**
 * Performs a proportional frame resize with live size constraints.
 */
function scaleCropFrameProportionallyFromCorner({
  transform,
  x,
  y
}: {
  transform: Transform
  x: number
  y: number
}): boolean {
  const cropTransform = transform as CropScaleTransform
  const { target } = cropTransform
  const { scaleX: currentScaleX = 1, scaleY: currentScaleY = 1 } = target
  const pointerAtStart = isPointerAtTransformStart({
    transform: cropTransform,
    x,
    y
  })

  if (pointerAtStart) {
    restoreOriginalScale({ transform: cropTransform })

    return true
  }

  const localPoint = controlsUtils.getLocalPoint(
    cropTransform,
    cropTransform.originX,
    cropTransform.originY,
    x,
    y
  )
  setInitialScaleSigns({ transform: cropTransform })

  applyProportionalCornerScale({
    transform: cropTransform,
    localPoint
  })

  return currentScaleX !== target.scaleX || currentScaleY !== target.scaleY
}

/**
 * Resizes the frame along one side axis.
 */
function scaleCropFrameFromSide({
  transform,
  axis,
  x,
  y
}: {
  transform: Transform
  axis: CropScaleAxis
  x: number
  y: number
}): boolean {
  const cropTransform = transform as CropScaleTransform
  const { target } = cropTransform
  const currentScale = axis === 'x'
    ? target.scaleX ?? 1
    : target.scaleY ?? 1
  if (isPointerAtTransformStart({
    transform: cropTransform,
    x,
    y
  })) {
    restoreOriginalScaleForAxis({
      transform: cropTransform,
      axis
    })

    return true
  }

  const localPoint = controlsUtils.getLocalPoint(
    cropTransform,
    cropTransform.originX,
    cropTransform.originY,
    x,
    y
  )

  setInitialScaleSigns({ transform: cropTransform })
  applySideScale({
    transform: cropTransform,
    axis,
    localPoint
  })

  if (axis === 'x') return currentScale !== target.scaleX

  return currentScale !== target.scaleY
}

/**
 * Performs a proportional frame resize using a side control.
 */
function scaleCropFrameProportionallyFromSide({
  transform,
  axis,
  x,
  y
}: {
  transform: Transform
  axis: CropScaleAxis
  x: number
  y: number
}): boolean {
  const cropTransform = transform as CropScaleTransform
  const { target } = cropTransform
  const { scaleX: currentScaleX = 1, scaleY: currentScaleY = 1 } = target

  if (isPointerAtTransformStart({
    transform: cropTransform,
    x,
    y
  })) {
    restoreOriginalScale({ transform: cropTransform })

    return true
  }

  const localPoint = controlsUtils.getLocalPoint(
    cropTransform,
    cropTransform.originX,
    cropTransform.originY,
    x,
    y
  )

  setInitialScaleSigns({ transform: cropTransform })
  applyProportionalSideScale({
    transform: cropTransform,
    axis,
    localPoint
  })

  return currentScaleX !== target.scaleX || currentScaleY !== target.scaleY
}

/**
 * Returns true if the drag control received an event without any actual pointer movement.
 */
function isPointerAtTransformStart({
  transform,
  x,
  y
}: {
  transform: Transform
  x: number
  y: number
}): boolean {
  return Math.abs(x - transform.ex) <= POINTER_POSITION_EPSILON
    && Math.abs(y - transform.ey) <= POINTER_POSITION_EPSILON
}

/**
 * Restores the scale on both axes to the values at the start of the Fabric transform.
 */
function restoreOriginalScale({ transform }: { transform: CropScaleTransform }): void {
  transform.target.set({
    scaleX: transform.original.scaleX,
    scaleY: transform.original.scaleY
  })
}

/**
 * Restores the scale on one axis to the value at the start of the Fabric transform.
 */
function restoreOriginalScaleForAxis({
  transform,
  axis
}: {
  transform: CropScaleTransform
  axis: CropScaleAxis
}): void {
  if (axis === 'x') {
    transform.target.set('scaleX', transform.original.scaleX)
    return
  }

  transform.target.set('scaleY', transform.original.scaleY)
}

/**
 * Saves the initial sides of the scale transform.
 */
function setInitialScaleSigns({
  transform
}: {
  transform: CropScaleTransform
}): void {
  const {
    signX,
    signY
  } = getControlScaleSigns({ controlKey: transform.corner })

  if (transform.signX === undefined) {
    transform.signX = signX
  }
  if (transform.signY === undefined) {
    transform.signY = signY
  }
}

/**
 * Returns the initial control signs relative to the center of the frame.
 */
function getControlScaleSigns({ controlKey }: { controlKey: string }): CropScaleSigns {
  return {
    signX: getControlScaleSignX({ controlKey }),
    signY: getControlScaleSignY({ controlKey })
  }
}

/**
 * Returns the initial X sign of the control.
 */
function getControlScaleSignX({ controlKey }: { controlKey: string }): number {
  if (controlKey === 'tl' || controlKey === 'bl' || controlKey === 'ml') {
    return -1
  }

  return 1
}

/**
 * Returns the initial Y sign of the control.
 */
function getControlScaleSignY({ controlKey }: { controlKey: string }): number {
  if (controlKey === 'tl' || controlKey === 'tr' || controlKey === 'mt') {
    return -1
  }

  return 1
}

/**
 * Applies free scaling to the target while respecting the flip restriction.
 */
function applyFreeCornerScale({
  transform,
  localPoint
}: {
  transform: CropScaleTransform
  localPoint: { x: number; y: number }
}): void {
  const { target } = transform
  resetSourceBoundScale({ transform })

  const scaleXResult = resolveAxisScale({
    transform,
    axis: 'x',
    localPoint
  })
  const scaleYResult = resolveAxisScale({
    transform,
    axis: 'y',
    localPoint
  })

  if (!target.lockScalingX) {
    target.set('scaleX', scaleXResult.scale)
  }
  if (!target.lockScalingY) {
    target.set('scaleY', scaleYResult.scale)
  }

  if (scaleXResult.sourceClamped || scaleYResult.sourceClamped) {
    rememberSourceBoundScale({
      transform,
      preserveAspectRatio: false
    })
  }
}

/**
 * Applies a resize along one side axis.
 */
function applySideScale({
  transform,
  axis,
  localPoint
}: {
  transform: CropScaleTransform
  axis: CropScaleAxis
  localPoint: { x: number; y: number }
}): void {
  const { target } = transform
  if (axis === 'x' && target.lockScalingX) return
  if (axis === 'y' && target.lockScalingY) return

  resetSourceBoundScale({ transform })

  const scaleResult = resolveAxisScale({
    transform,
    axis,
    localPoint
  })

  if (axis === 'x') {
    target.set('scaleX', scaleResult.scale)
  } else {
    target.set('scaleY', scaleResult.scale)
  }

  if (scaleResult.sourceClamped) {
    rememberSourceBoundScale({
      transform,
      preserveAspectRatio: false
    })
  }
}

/**
 * Applies a proportional resize using a side control.
 */
function applyProportionalSideScale({
  transform,
  axis,
  localPoint
}: {
  transform: CropScaleTransform
  axis: CropScaleAxis
  localPoint: { x: number; y: number }
}): void {
  const { target } = transform
  if (target.lockScalingX || target.lockScalingY) return

  const axisScaleResult = resolveAxisScale({
    transform,
    axis,
    localPoint,
    constrainToSource: false
  })
  const originalAxisScale = axis === 'x'
    ? transform.original.scaleX
    : transform.original.scaleY
  const proportionalScale = originalAxisScale > 0
    ? axisScaleResult.scale / originalAxisScale
    : 1
  const clampedScale = clampProportionalScale({
    target,
    transform,
    scale: proportionalScale,
    forceMinimum: hasScaleOriginCrossed({
      transform,
      axis,
      localPoint
    })
  })

  target.set('scaleX', clampedScale.scaleX)
  target.set('scaleY', clampedScale.scaleY)
}

/**
 * Returns the scale along one axis, accounting for min/max limits and crossing the origin.
 */
function resolveAxisScale({
  transform,
  axis,
  localPoint,
  constrainToSource = true
}: {
  transform: CropScaleTransform
  axis: CropScaleAxis
  localPoint: { x: number; y: number }
  constrainToSource?: boolean
}): CropAxisScaleResult {
  const { target } = transform
  const dimensions = getCropScaleDimensions({ target })
  const limits = getCropScaleLimits({ target })
  const currentScale = axis === 'x'
    ? target.scaleX ?? 1
    : target.scaleY ?? 1
  const originalScale = axis === 'x'
    ? transform.original.scaleX
    : transform.original.scaleY
  const pointValue = axis === 'x' ? localPoint.x : localPoint.y
  const dimension = axis === 'x' ? dimensions.x : dimensions.y
  const minimumScale = axis === 'x' ? limits.minScaleX : limits.minScaleY
  const sourceMaximumScale = constrainToSource
    ? getSourceAxisMaximumScale({
      target,
      transform,
      axis
    })
    : null
  const maximumScale = resolveAxisMaximumScale({
    axis,
    limits,
    sourceMaximumScale
  })

  if (hasScaleOriginCrossed({ transform, axis, localPoint })) {
    return {
      scale: minimumScale,
      sourceClamped: false
    }
  }

  let nextScale = Math.abs(((pointValue || 0) * currentScale) / dimension)

  if (isCenteredTransform({ transform })) {
    nextScale *= 2
  }

  const clampedScale = clampNumber({
    value: nextScale,
    min: minimumScale,
    max: maximumScale
  })
  const scale = snapAxisScaleToSourceMaximum({
    target,
    axis,
    scale: clampedScale,
    maximumScale,
    sourceMaximumScale
  })

  return {
    scale,
    sourceClamped: isAxisScaleSourceClamped({
      scale,
      maximumScale,
      sourceMaximumScale,
      originalScale
    })
  }
}

/**
 * Resets the transient source-bound flag before a new free scale step.
 */
function resetSourceBoundScale({ transform }: { transform: CropScaleTransform }): void {
  transform.cropSourceScaleClamped = false
  transform.cropSourceBoundScale = null
  transform.cropSourceScaleAnchorX = undefined
  transform.cropSourceScaleAnchorY = undefined
  transform.cropSourceScalePreserveAspectRatio = undefined
}

/**
 * Remembers the target scale that has already reached the source boundary.
 */
function rememberSourceBoundScale({
  transform,
  preserveAspectRatio
}: {
  transform: CropScaleTransform
  preserveAspectRatio: boolean
}): void {
  const { target } = transform

  transform.cropSourceScaleClamped = true
  transform.cropSourceScalePreserveAspectRatio = preserveAspectRatio
  transform.cropSourceScaleAnchorX = getTransformAxisAnchor({
    target,
    transform,
    axis: 'x'
  })
  transform.cropSourceScaleAnchorY = getTransformAxisAnchor({
    target,
    transform,
    axis: 'y'
  })
  transform.cropSourceBoundScale = {
    scaleX: target.scaleX ?? 1,
    scaleY: target.scaleY ?? 1
  }
}

/**
 * Returns true if the scale actually reached the source maximum from a smaller size.
 */
function isAxisScaleSourceClamped({
  scale,
  maximumScale,
  sourceMaximumScale,
  originalScale
}: {
  scale: number
  maximumScale: number
  sourceMaximumScale: number | null
  originalScale: number
}): boolean {
  if (sourceMaximumScale === null) return false
  if (Math.abs(maximumScale - sourceMaximumScale) > SCALE_COMPARISON_EPSILON) return false
  if (Math.abs(scale - sourceMaximumScale) > SCALE_COMPARISON_EPSILON) return false

  return Math.abs(Math.abs(originalScale) - sourceMaximumScale) > SCALE_COMPARISON_EPSILON
}

/**
 * Extends the scale to the source maximum if the pointer stopped within one visible source pixel.
 */
function snapAxisScaleToSourceMaximum({
  target,
  axis,
  scale,
  maximumScale,
  sourceMaximumScale
}: {
  target: FabricObject
  axis: CropScaleAxis
  scale: number
  maximumScale: number
  sourceMaximumScale: number | null
}): number {
  if (sourceMaximumScale === null) return scale
  if (Math.abs(maximumScale - sourceMaximumScale) > SCALE_COMPARISON_EPSILON) return scale

  const sourcePixelGap = getAxisScaleSourcePixelGap({
    target,
    axis,
    fromScale: scale,
    toScale: sourceMaximumScale
  })

  if (sourcePixelGap <= SOURCE_BOUNDARY_SCALE_GAP_PIXELS + SOURCE_BOUNDARY_SCALE_GAP_EPSILON) {
    return sourceMaximumScale
  }

  return scale
}

/**
 * Returns the maximum scale along one axis, accounting for crop size and source bounds.
 */
function resolveAxisMaximumScale({
  axis,
  limits,
  sourceMaximumScale
}: {
  axis: CropScaleAxis
  limits: CropScaleLimits
  sourceMaximumScale: number | null
}): number {
  const minimumScale = axis === 'x' ? limits.minScaleX : limits.minScaleY
  const cropSizeMaximumScale = axis === 'x' ? limits.maxScaleX : limits.maxScaleY

  if (sourceMaximumScale === null) return cropSizeMaximumScale

  return Math.max(
    minimumScale,
    Math.min(cropSizeMaximumScale, sourceMaximumScale)
  )
}

/**
 * Returns the maximum scale along one axis that keeps the frame within the source.
 */
function getSourceAxisMaximumScale({
  target,
  transform,
  axis
}: {
  target: FabricObject
  transform: CropScaleTransform
  axis: CropScaleAxis
}): number | null {
  const bounds = getSourceScaleBounds({
    target,
    transform
  })
  if (!bounds) return null

  const originalScale = axis === 'x'
    ? transform.original.scaleX
    : transform.original.scaleY
  const sourceScaleLimit = resolveCropSourceAxisScaleLimit({
    sourceSize: bounds.sourceSize,
    startRect: bounds.startRect,
    axis,
    anchor: getTransformAxisAnchor({
      target,
      transform,
      axis
    })
  })

  return Math.abs(originalScale) * sourceScaleLimit
}

/**
 * Returns the distance between two scale values in source pixels along the selected axis.
 */
function getAxisScaleSourcePixelGap({
  target,
  axis,
  fromScale,
  toScale
}: {
  target: FabricObject
  axis: CropScaleAxis
  fromScale: number
  toScale: number
}): number {
  const cropTarget = target as CropFrameScaleTarget
  const sourceScale = axis === 'x'
    ? Math.abs(cropTarget.cropSourceScaleX ?? 1) || 1
    : Math.abs(cropTarget.cropSourceScaleY ?? 1) || 1
  const targetLength = axis === 'x'
    ? target.width
    : target.height

  return (Math.abs(toScale - fromScale) * Math.max(1, targetLength)) / sourceScale
}

/**
 * Applies proportional scaling to the target, accounting for the min/max crop size.
 */
function applyProportionalCornerScale({
  transform,
  localPoint
}: {
  transform: CropScaleTransform
  localPoint: { x: number; y: number }
}): void {
  const { target } = transform
  if (target.lockScalingX || target.lockScalingY) return

  const dimensions = getCropScaleDimensions({ target })
  const scale = getProportionalScale({
    transform,
    localPoint,
    dimensions
  })
  const clampedScale = clampProportionalScale({
    target,
    transform,
    scale,
    forceMinimum: hasProportionalScaleOriginCrossed({
      transform,
      localPoint
    })
  })

  target.set('scaleX', clampedScale.scaleX)
  target.set('scaleY', clampedScale.scaleY)
}

/**
 * Calculates the proportional scale multiplier using the same model as Fabric scalingEqually.
 */
function getProportionalScale({
  transform,
  localPoint,
  dimensions
}: {
  transform: CropScaleTransform
  localPoint: { x: number; y: number }
  dimensions: { x: number; y: number }
}): number {
  const gestureScale = 'gestureScale' in transform && typeof transform.gestureScale === 'number'
    ? transform.gestureScale
    : null

  if (gestureScale !== null) return gestureScale

  const distance = Math.abs(localPoint.x) + Math.abs(localPoint.y)
  const originalDistance = getOriginalCornerDistance({ transform, dimensions })
  let scale = originalDistance > 0 ? distance / originalDistance : 1

  if (isCenteredTransform({ transform })) {
    scale *= 2
  }

  return scale
}

/**
 * Returns the initial distance of the pointer from the transform origin.
 */
function getOriginalCornerDistance({
  transform,
  dimensions
}: {
  transform: CropScaleTransform
  dimensions: { x: number; y: number }
}): number {
  const { target, original } = transform
  const currentScaleX = target.scaleX ?? 1
  const currentScaleY = target.scaleY ?? 1

  return Math.abs((dimensions.x * original.scaleX) / currentScaleX)
    + Math.abs((dimensions.y * original.scaleY) / currentScaleY)
}

/**
 * Returns the crop frame scaling dimensions without the stroke, because the stroke is not part of the crop result.
 */
function getCropScaleDimensions({ target }: { target: FabricObject }): CropScaleDimensions {
  const scaleX = Math.abs(target.scaleX ?? 1)
  const scaleY = Math.abs(target.scaleY ?? 1)

  return {
    x: Math.max(1, target.width * scaleX),
    y: Math.max(1, target.height * scaleY)
  }
}

/**
 * Constrains proportional scaling with a single multiplier to preserve the aspect ratio.
 */
function clampProportionalScale({
  target,
  transform,
  scale,
  forceMinimum
}: {
  target: FabricObject
  transform: CropScaleTransform
  scale: number
  forceMinimum: boolean
}): { scaleX: number; scaleY: number } {
  const startSize = getCropFrameSourceSize({
    frame: target,
    scaleX: transform.original.scaleX,
    scaleY: transform.original.scaleY
  })
  const minScale = Math.max(
    MIN_CROP_FRAME_WIDTH / startSize.width,
    MIN_CROP_FRAME_HEIGHT / startSize.height
  )
  const cropSizeMaxScale = Math.min(
    MAX_CROP_FRAME_WIDTH / startSize.width,
    MAX_CROP_FRAME_HEIGHT / startSize.height
  )
  const sourceMaxScale = getProportionalSourceMaxScale({
    target,
    transform
  })
  const maxScale = Math.max(
    minScale,
    Math.min(cropSizeMaxScale, sourceMaxScale ?? cropSizeMaxScale)
  )
  transform.cropSourceScaleClamped = !forceMinimum && scale > maxScale
  transform.cropSourceScalePreserveAspectRatio = transform.cropSourceScaleClamped
  let nextScale = minScale

  if (!forceMinimum) {
    nextScale = clampNumber({
      value: scale,
      min: minScale,
      max: maxScale
    })
  }

  const scaleX = transform.original.scaleX * nextScale
  const scaleY = transform.original.scaleY * nextScale

  if (transform.cropSourceScaleClamped) {
    transform.cropSourceScaleAnchorX = getTransformAxisAnchor({
      target,
      transform,
      axis: 'x'
    })
    transform.cropSourceScaleAnchorY = getTransformAxisAnchor({
      target,
      transform,
      axis: 'y'
    })
    transform.cropSourceBoundScale = {
      scaleX,
      scaleY
    }
  } else {
    transform.cropSourceBoundScale = null
    transform.cropSourceScaleAnchorX = undefined
    transform.cropSourceScaleAnchorY = undefined
    transform.cropSourceScalePreserveAspectRatio = undefined
  }

  return {
    scaleX,
    scaleY
  }
}

/**
 * Returns the maximum proportional multiplier that keeps the frame within the source.
 */
function getProportionalSourceMaxScale({
  target,
  transform
}: {
  target: FabricObject
  transform: CropScaleTransform
}): number | null {
  const bounds = getSourceScaleBounds({
    target,
    transform
  })
  if (!bounds) return null

  return resolveCropProportionalSourceScaleLimit({
    sourceSize: bounds.sourceSize,
    startRect: bounds.startRect,
    anchorX: getTransformAxisAnchor({ target, transform, axis: 'x' }),
    anchorY: getTransformAxisAnchor({ target, transform, axis: 'y' })
  })
}

/**
 * Returns the source bounds for resizing, or null in allow overflow mode.
 */
function getSourceScaleBounds({
  target,
  transform
}: {
  target: FabricObject
  transform: CropScaleTransform
}): CropSourceScaleBounds | null {
  if (transform.cropSourceScaleBounds !== undefined) {
    return transform.cropSourceScaleBounds
  }

  const cropTarget = target as CropFrameScaleTarget
  if (cropTarget.cropAllowFrameOverflow !== false || !cropTarget.cropSource) {
    transform.cropSourceScaleBounds = null

    return null
  }

  transform.cropSourceScaleBounds = {
    sourceSize: getSourceSize({ source: cropTarget.cropSource }),
    startRect: getCropRectInSource({
      source: cropTarget.cropSource,
      frame: cropTarget
    })
  }

  return transform.cropSourceScaleBounds
}

/**
 * Returns the fixed anchor along the specified axis for the current Fabric transform.
 */
function getTransformAxisAnchor({
  target,
  transform,
  axis
}: {
  target: FabricObject
  transform: Transform
  axis: CropScaleAxis
}): CropSourceScaleAnchor {
  const source = (target as CropFrameScaleTarget).cropSource

  return resolveCropSourceScaleAnchor({ source, transform, axis })
}

/**
 * Returns the allowed scale limits of the Fabric target for the crop dimensions.
 */
function getCropScaleLimits({ target }: { target: FabricObject }): CropScaleLimits {
  const cropTarget = target as CropFrameScaleTarget
  const sourceScaleX = Math.abs(cropTarget.cropSourceScaleX ?? 1) || 1
  const sourceScaleY = Math.abs(cropTarget.cropSourceScaleY ?? 1) || 1
  const width = Math.max(1, target.width)
  const height = Math.max(1, target.height)

  return {
    minScaleX: (MIN_CROP_FRAME_WIDTH * sourceScaleX) / width,
    maxScaleX: (MAX_CROP_FRAME_WIDTH * sourceScaleX) / width,
    minScaleY: (MIN_CROP_FRAME_HEIGHT * sourceScaleY) / height,
    maxScaleY: (MAX_CROP_FRAME_HEIGHT * sourceScaleY) / height
  }
}

/**
 * Returns true if the pointer crossed the origin along the specified axis.
 */
function hasScaleOriginCrossed({
  transform,
  axis,
  localPoint
}: {
  transform: CropScaleTransform
  axis: CropScaleAxis
  localPoint: { x: number; y: number }
}): boolean {
  const { target } = transform
  if (!target.lockScalingFlip) return false

  const initialSign = axis === 'x'
    ? transform.signX ?? 1
    : transform.signY ?? 1
  const pointValue = axis === 'x' ? localPoint.x : localPoint.y
  const nextSign = Math.sign(pointValue || initialSign)

  return initialSign !== nextSign
}

/**
 * Returns true if the proportional resize crossed the origin along at least one axis.
 */
function hasProportionalScaleOriginCrossed({
  transform,
  localPoint
}: {
  transform: CropScaleTransform
  localPoint: { x: number; y: number }
}): boolean {
  return hasScaleOriginCrossed({
    transform,
    axis: 'x',
    localPoint
  }) || hasScaleOriginCrossed({
    transform,
    axis: 'y',
    localPoint
  })
}

/**
 * Returns true if the current resize should preserve the aspect ratio.
 */
function shouldPreserveCropFrameAspectRatioOnResize({
  eventData,
  target
}: {
  eventData: { shiftKey?: boolean }
  target: FabricObject
}): boolean {
  return resolveCropFrameResizePreserveAspectRatio({
    target,
    shiftKey: eventData.shiftKey
  })
}

/**
 * Creates an action handler for corner resizing with support for inversion via Shift.
 */
function createCropCornerScalingActionHandler(): NonNullable<Control['actionHandler']> {
  const freeScaleHandler = controlsUtils.wrapWithFireEvent(
    'scaling',
    controlsUtils.wrapWithFixedAnchor((_eventData, transform, x, y) => {
      return scaleCropFrameFromCorner({
        transform,
        x,
        y
      })
    })
  )
  const proportionalScaleHandler = controlsUtils.wrapWithFireEvent(
    'scaling',
    controlsUtils.wrapWithFixedAnchor((_eventData, transform, x, y) => {
      return scaleCropFrameProportionallyFromCorner({
        transform,
        x,
        y
      })
    })
  )

  return (eventData, transform, x, y) => {
    const shouldPreserveAspectRatio = shouldPreserveCropFrameAspectRatioOnResize({
      eventData,
      target: transform.target
    })

    if (!shouldPreserveAspectRatio) {
      return freeScaleHandler(eventData, transform, x, y)
    }

    return proportionalScaleHandler(eventData, transform, x, y)
  }
}

/**
 * Creates an action handler for side resizing with support for aspect ratio preservation.
 */
function createCropSideScalingActionHandler({
  axis
}: {
  axis: CropScaleAxis
}): NonNullable<Control['actionHandler']> {
  const freeScaleHandler = controlsUtils.wrapWithFireEvent(
    'scaling',
    controlsUtils.wrapWithFixedAnchor((_eventData, transform, x, y) => {
      return scaleCropFrameFromSide({
        transform,
        axis,
        x,
        y
      })
    })
  )
  const proportionalScaleHandler = controlsUtils.wrapWithFireEvent(
    'scaling',
    controlsUtils.wrapWithFixedAnchor((_eventData, transform, x, y) => {
      return scaleCropFrameProportionallyFromSide({
        transform,
        axis,
        x,
        y
      })
    })
  )

  return (eventData, transform, x, y) => {
    const shouldPreserveAspectRatio = shouldPreserveCropFrameAspectRatioOnResize({
      eventData,
      target: transform.target
    })

    if (!shouldPreserveAspectRatio) {
      return freeScaleHandler(eventData, transform, x, y)
    }

    return proportionalScaleHandler(eventData, transform, x, y)
  }
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

/**
 * Creates a crop resize control.
 */
function createCropResizeControl({
  control,
  actionHandler,
  cursorStyleHandler,
  getActionName
}: {
  control: Control
  actionHandler: NonNullable<Control['actionHandler']>
  cursorStyleHandler?: Control['cursorStyleHandler']
  getActionName?: Control['getActionName']
}): Control {
  const controlOptions = {
    ...control,
    actionHandler
  }

  if (cursorStyleHandler) {
    Object.assign(controlOptions, {
      cursorStyleHandler
    })
  }

  if (getActionName) {
    Object.assign(controlOptions, {
      getActionName
    })
  }

  const nextControl = new Control(controlOptions)
  const cropControl = nextControl as CropResizeControl

  cropControl.cropResizeControl = true

  return cropControl
}

/**
 * Returns a stable resize cursor for a side crop control.
 */
function getCropSideResizeCursor({ controlKey }: { controlKey: CropSideControlKey }): string {
  return CROP_SIDE_RESIZE_CURSOR_BY_KEY[controlKey]
}

/**
 * Returns the resize action name for a side crop control.
 */
function getCropSideScaleActionName({ axis }: { axis: CropScaleAxis }): CropSideScaleActionName {
  if (axis === 'x') return 'scaleX'

  return 'scaleY'
}

/**
 * Configures crop frame resizing.
 */
export function applyCropResizeControls({ target }: { target: FabricObject }): void {
  const nextControls = { ...target.controls }
  let hasControlChange = false
  const cornerActionHandler = createCropCornerScalingActionHandler()
  const horizontalActionHandler = createCropSideScalingActionHandler({ axis: 'x' })
  const verticalActionHandler = createCropSideScalingActionHandler({ axis: 'y' })

  CROP_CORNER_CONTROL_KEYS.forEach((key) => {
    const control = target.controls[key] as CropResizeControl | undefined
    if (!control) return
    if (control.cropResizeControl) return

    nextControls[key] = createCropResizeControl({
      control,
      actionHandler: cornerActionHandler
    })
    hasControlChange = true
  })

  CROP_SIDE_CONTROL_KEYS.forEach((key) => {
    const control = target.controls[key] as CropResizeControl | undefined
    if (!control) return
    if (control.cropResizeControl) return

    const isHorizontalControl = key === 'ml' || key === 'mr'
    const actionHandler = isHorizontalControl
      ? horizontalActionHandler
      : verticalActionHandler
    const axis = isHorizontalControl ? 'x' : 'y'

    nextControls[key] = createCropResizeControl({
      control,
      actionHandler,
      cursorStyleHandler: () => getCropSideResizeCursor({ controlKey: key }),
      getActionName: () => getCropSideScaleActionName({ axis })
    })
    hasControlChange = true
  })

  if (!hasControlChange) return

  target.controls = nextControls
}
