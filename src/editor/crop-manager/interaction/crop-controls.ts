/* eslint-disable no-use-before-define -- Public control setup остаётся ниже helper'ов Fabric transform. */
import {
  Control,
  controlsUtils,
  type FabricObject,
  type Transform
} from 'fabric'

import {
  MAX_CROP_FRAME_HEIGHT,
  MAX_CROP_FRAME_WIDTH,
  MIN_CROP_FRAME_HEIGHT,
  MIN_CROP_FRAME_WIDTH
} from '../domain/crop-geometry'
import type { CropFrameResizeTarget } from '../domain/crop-frame'
import { getCropFrameSourceSize } from '../domain/crop-frame-size'

/**
 * Допуск сравнения client pointer-координат внутри одной Fabric transform-сессии.
 */
const POINTER_POSITION_EPSILON = 0.001

/**
 * Угловые controls, которые отвечают за диагональный resize crop frame.
 */
const CROP_CORNER_CONTROL_KEYS = ['tl', 'tr', 'bl', 'br'] as const

/**
 * Боковые controls, которые отвечают за горизонтальный и вертикальный resize crop frame.
 */
const CROP_SIDE_CONTROL_KEYS = ['ml', 'mr', 'mt', 'mb'] as const

/**
 * Transform с сохранённым стартовым знаком стороны во время scale.
 */
type CropScaleTransform = Transform & {
  signX?: number
  signY?: number
}

/**
 * Crop frame хранит scale источника, чтобы live resize ограничивался в source-пикселях.
 */
type CropFrameScaleTarget = FabricObject & {
  cropSourceScaleX?: number
  cropSourceScaleY?: number
}

/**
 * Control с маркером, что он уже настроен для crop mode.
 */
type CropResizeControl = Control & {
  cropResizeControl?: boolean
}

/**
 * Scale-границы frame в координатах Fabric target.
 */
type CropScaleLimits = {
  minScaleX: number
  maxScaleX: number
  minScaleY: number
  maxScaleY: number
}

/**
 * Размеры crop frame в его локальной geometry без stroke.
 */
type CropScaleDimensions = {
  x: number
  y: number
}

/**
 * Ось бокового resize.
 */
type CropScaleAxis = 'x' | 'y'

/**
 * Action names side-resize crop control-ов без переключения в skew.
 */
type CropSideScaleActionName = 'scaleX' | 'scaleY'

/**
 * Стартовые знаки control относительно центра crop frame.
 */
type CropScaleSigns = {
  signX: number
  signY: number
}

/**
 * Боковые control-ключи crop frame.
 */
type CropSideControlKey = typeof CROP_SIDE_CONTROL_KEYS[number]

/**
 * Cursor для side resize crop frame.
 */
const CROP_SIDE_RESIZE_CURSOR_BY_KEY: Record<CropSideControlKey, string> = {
  ml: 'w-resize',
  mr: 'e-resize',
  mt: 'n-resize',
  mb: 's-resize'
}

/**
 * Возвращает true, если transform масштабируется относительно центра.
 */
function isCenteredTransform({ transform }: { transform: Transform }): boolean {
  const { originX, originY } = transform

  return (originX === 'center' || originX === 0.5) && (originY === 'center' || originY === 0.5)
}

/**
 * Выполняет свободный resize frame по двум осям независимо.
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
 * Выполняет пропорциональный resize frame с live-ограничением размера.
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

  applyProportionalCornerScale({
    transform: cropTransform,
    localPoint
  })

  return currentScaleX !== target.scaleX || currentScaleY !== target.scaleY
}

/**
 * Выполняет resize frame по одной боковой оси.
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
 * Выполняет proportional resize frame через боковой control.
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
 * Возвращает true, если drag-control получил событие без фактического движения pointer.
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
 * Возвращает обе scale-оси к значениям на старте Fabric transform.
 */
function restoreOriginalScale({ transform }: { transform: CropScaleTransform }): void {
  transform.target.set({
    scaleX: transform.original.scaleX,
    scaleY: transform.original.scaleY
  })
}

/**
 * Возвращает одну scale-ось к значению на старте Fabric transform.
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
 * Сохраняет исходные стороны scale transform.
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
 * Возвращает стартовые знаки control относительно центра frame.
 */
function getControlScaleSigns({ controlKey }: { controlKey: string }): CropScaleSigns {
  return {
    signX: getControlScaleSignX({ controlKey }),
    signY: getControlScaleSignY({ controlKey })
  }
}

/**
 * Возвращает стартовый X-знак control.
 */
function getControlScaleSignX({ controlKey }: { controlKey: string }): number {
  if (controlKey === 'tl' || controlKey === 'bl' || controlKey === 'ml') {
    return -1
  }

  return 1
}

/**
 * Возвращает стартовый Y-знак control.
 */
function getControlScaleSignY({ controlKey }: { controlKey: string }): number {
  if (controlKey === 'tl' || controlKey === 'tr' || controlKey === 'mt') {
    return -1
  }

  return 1
}

/**
 * Применяет free scale к target с учётом запрета flip.
 */
function applyFreeCornerScale({
  transform,
  localPoint
}: {
  transform: CropScaleTransform
  localPoint: { x: number; y: number }
}): void {
  const { target } = transform
  const scaleX = resolveAxisScale({
    transform,
    axis: 'x',
    localPoint
  })
  const scaleY = resolveAxisScale({
    transform,
    axis: 'y',
    localPoint
  })

  if (!target.lockScalingX) {
    target.set('scaleX', scaleX)
  }
  if (!target.lockScalingY) {
    target.set('scaleY', scaleY)
  }
}

/**
 * Применяет resize по одной боковой оси.
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

  const scale = resolveAxisScale({
    transform,
    axis,
    localPoint
  })

  if (axis === 'x') {
    target.set('scaleX', scale)
    return
  }

  target.set('scaleY', scale)
}

/**
 * Применяет proportional resize через боковой control.
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
 * Возвращает scale одной оси с учётом min/max и перелёта через origin.
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

  if (hasScaleOriginCrossed({ transform, axis, localPoint })) {
    return minimumScale
  }

  let nextScale = Math.abs(((pointValue || 0) * currentScale) / dimension)

  if (isCenteredTransform({ transform })) {
    nextScale *= 2
  }

  return clampNumber({
    value: nextScale,
    min: minimumScale,
    max: maximumScale
  })
}

/**
 * Применяет proportional scale к target с учётом min/max crop-размера.
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
 * Считает proportional scale multiplier по той же модели, что Fabric scalingEqually.
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
 * Возвращает стартовую дистанцию pointer от transform origin.
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
 * Возвращает scale-размеры crop frame без stroke, потому что stroke не входит в crop result.
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
 * Ограничивает proportional scale единым multiplier, чтобы пропорции не ломались.
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
  const maxScale = Math.min(
    MAX_CROP_FRAME_WIDTH / startSize.width,
    MAX_CROP_FRAME_HEIGHT / startSize.height
  )
  const nextScale = forceMinimum
    ? minScale
    : clampNumber({
      value: scale,
      min: minScale,
      max: maxScale
    })

  return {
    scaleX: transform.original.scaleX * nextScale,
    scaleY: transform.original.scaleY * nextScale
  }
}

/**
 * Возвращает допустимые scale-границы Fabric target для crop-размеров.
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
 * Возвращает true, если pointer перелетел через origin по заданной оси.
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
 * Возвращает true, если proportional resize перелетел через origin хотя бы по одной оси.
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
 * Возвращает true, если текущий resize должен сохранять пропорции.
 */
function shouldPreserveCropFrameAspectRatioOnResize({
  eventData,
  target
}: {
  eventData: { shiftKey?: boolean }
  target: FabricObject
}): boolean {
  const cropTarget = target as CropFrameResizeTarget
  const preserveAspectRatio = cropTarget.preserveAspectRatio ?? true

  if (!eventData.shiftKey) return preserveAspectRatio

  return !preserveAspectRatio
}

/**
 * Создаёт action handler для resize из угла с поддержкой инверсии по Shift.
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
 * Создаёт action handler для бокового resize с поддержкой сохранения пропорций.
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

/**
 * Создаёт crop resize control.
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
 * Возвращает стабильный resize cursor для бокового crop-control.
 */
function getCropSideResizeCursor({ controlKey }: { controlKey: CropSideControlKey }): string {
  return CROP_SIDE_RESIZE_CURSOR_BY_KEY[controlKey]
}

/**
 * Возвращает resize action name для бокового crop-control.
 */
function getCropSideScaleActionName({ axis }: { axis: CropScaleAxis }): CropSideScaleActionName {
  if (axis === 'x') return 'scaleX'

  return 'scaleY'
}

/**
 * Настраивает resize crop frame.
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
