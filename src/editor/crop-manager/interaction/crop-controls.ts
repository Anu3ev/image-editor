/* eslint-disable no-use-before-define -- Public control setup remains below the Fabric transform helpers. */
import {
  Control,
  controlsUtils,
  type FabricObject,
  type Rect,
  type Transform
} from 'fabric'

import {
  MAX_CROP_FRAME_HEIGHT,
  MAX_CROP_FRAME_WIDTH,
  MIN_CROP_FRAME_HEIGHT,
  MIN_CROP_FRAME_WIDTH
} from '../domain/crop-geometry'
import { getCropFrameSourceSize } from '../domain/crop-frame-size'
import { resolveCropFrameResizePreserveAspectRatio } from '../domain/crop-resize-mode'

/**
 * Tolerance for comparing client pointer coordinates within a single Fabric transform session.
 */
const POINTER_POSITION_EPSILON = 0.001

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
interface CropScaleTransform extends Transform {
  signX?: number
  signY?: number
}

/**
 * The crop frame stores the source scale so that the crop size limits are measured in source pixels.
 */
type CropFrameScaleTarget = Rect & {
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

  if (!target.lockScalingX) {
    target.set('scaleX', resolveAxisScale({ transform, axis: 'x', localPoint }))
  }
  if (!target.lockScalingY) {
    target.set('scaleY', resolveAxisScale({ transform, axis: 'y', localPoint }))
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

  target.set(axis === 'x' ? 'scaleX' : 'scaleY', resolveAxisScale({ transform, axis, localPoint }))
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

  const axisScale = resolveAxisScale({
    transform,
    axis,
    localPoint
  })
  const originalAxisScale = axis === 'x'
    ? transform.original.scaleX
    : transform.original.scaleY
  const proportionalScale = originalAxisScale > 0
    ? axisScale / originalAxisScale
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
 * Returns the scale along one axis, accounting for the crop size limits and crossing the origin.
 * The source bounds are applied afterwards by CropManager, around the fixed point of the gesture.
 */
function resolveAxisScale({
  transform,
  axis,
  localPoint
}: {
  transform: CropScaleTransform
  axis: CropScaleAxis
  localPoint: { x: number; y: number }
}): number {
  const { target } = transform
  const dimensions = getCropScaleDimensions({ target })
  const limits = getCropScaleLimits({ target })
  const currentScale = axis === 'x'
    ? target.scaleX ?? 1
    : target.scaleY ?? 1
  const pointValue = axis === 'x' ? localPoint.x : localPoint.y
  const dimension = axis === 'x' ? dimensions.x : dimensions.y
  const minimumScale = axis === 'x' ? limits.minScaleX : limits.minScaleY
  const maximumScale = axis === 'x' ? limits.maxScaleX : limits.maxScaleY

  if (hasScaleOriginCrossed({ transform, axis, localPoint })) return minimumScale

  const pointerScale = Math.abs(((pointValue || 0) * currentScale) / dimension)
  const nextScale = isCenteredTransform({ transform }) ? pointerScale * 2 : pointerScale

  return clampNumber({
    value: nextScale,
    min: minimumScale,
    max: maximumScale
  })
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
 * Constrains proportional scaling with a single multiplier to the crop size limits, preserving the aspect ratio.
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
  const maxScale = Math.max(minScale, cropSizeMaxScale)
  const nextScale = forceMinimum
    ? minScale
    : clampNumber({
      value: scale,
      min: minScale,
      max: maxScale
    })
  const scaleX = transform.original.scaleX * nextScale
  const scaleY = transform.original.scaleY * nextScale

  return {
    scaleX,
    scaleY
  }
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
