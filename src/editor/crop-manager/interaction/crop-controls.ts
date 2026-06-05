/* eslint-disable no-use-before-define -- Public control setup остаётся ниже helper'ов Fabric transform. */
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
import type { CropFrameResizeTarget } from '../domain/crop-frame'
import { getCropFrameSourceSize } from '../domain/crop-frame-size'
import {
  resolveCropProportionalSourceScaleLimit,
  resolveCropSourceAxisScaleLimit,
  type CropSourceScaleAnchor
} from '../domain/crop-source-scale'
import type {
  CropRect,
  CropSize
} from '../types'

/**
 * Допуск сравнения client pointer-координат внутри одной Fabric transform-сессии.
 */
const POINTER_POSITION_EPSILON = 0.001

/**
 * Допуск source-зазора, при котором live resize уже считается дошедшим до source-границы.
 */
const SOURCE_BOUNDARY_SCALE_GAP_PIXELS = 1

/**
 * Микродопуск для source-зазора после пересчёта scale между canvas и source.
 */
const SOURCE_BOUNDARY_SCALE_GAP_EPSILON = 0.000001

/**
 * Допуск сравнения scale-значений, рассчитанных из разных coordinate-system слоёв.
 */
const SCALE_COMPARISON_EPSILON = 0.000000001

/**
 * Угловые controls, которые отвечают за диагональный resize crop frame.
 */
const CROP_CORNER_CONTROL_KEYS = ['tl', 'tr', 'bl', 'br'] as const

/**
 * Боковые controls, которые отвечают за горизонтальный и вертикальный resize crop frame.
 */
const CROP_SIDE_CONTROL_KEYS = ['ml', 'mr', 'mt', 'mb'] as const

/**
 * Scale, на котором resize уже упёрся в source.
 */
type CropSourceBoundScale = {
  scaleX: number
  scaleY: number
}

/**
 * Transform с сохранённым стартовым знаком стороны во время scale.
 */
type CropScaleTransform = Transform & {
  signX?: number
  signY?: number
  cropSourceScaleBounds?: CropSourceScaleBounds | null
  cropSourceScaleClamped?: boolean
  cropSourceBoundScale?: CropSourceBoundScale | null
  cropSourceScaleAnchorX?: CropSourceScaleAnchor
  cropSourceScaleAnchorY?: CropSourceScaleAnchor
  cropSourceScalePreserveAspectRatio?: boolean
}

/**
 * Crop frame хранит scale источника, чтобы live resize ограничивался в source-пикселях.
 */
type CropFrameScaleTarget = Rect & {
  cropSource?: FabricObject | null
  cropAllowFrameOverflow?: boolean
  cropSourceScaleX?: number
  cropSourceScaleY?: number
}

/**
 * Source-границы resize, зафиксированные на старте Fabric transform.
 */
type CropSourceScaleBounds = {
  sourceSize: CropSize
  startRect: CropRect
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
 * Результат расчёта scale одной оси.
 */
type CropAxisScaleResult = {
  scale: number
  sourceClamped: boolean
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
 * Возвращает scale одной оси с учётом min/max и перелёта через origin.
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
 * Сбрасывает transient source-bound флаг перед новым free scale-step.
 */
function resetSourceBoundScale({ transform }: { transform: CropScaleTransform }): void {
  transform.cropSourceScaleClamped = false
  transform.cropSourceBoundScale = null
  transform.cropSourceScaleAnchorX = undefined
  transform.cropSourceScaleAnchorY = undefined
  transform.cropSourceScalePreserveAspectRatio = undefined
}

/**
 * Запоминает target scale, который уже упёрся в source-границу.
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
  transform.cropSourceScaleAnchorX = getTransformAnchorX({ transform })
  transform.cropSourceScaleAnchorY = getTransformAnchorY({ transform })
  transform.cropSourceBoundScale = {
    scaleX: target.scaleX ?? 1,
    scaleY: target.scaleY ?? 1
  }
}

/**
 * Возвращает true, если scale реально дошёл до source maximum из меньшего размера.
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
 * Дотягивает scale до source maximum, если pointer остановился в пределах видимого source-пикселя.
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
 * Возвращает максимальный scale одной оси с учётом crop-size и source-границ.
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
 * Возвращает максимальный scale одной оси, при котором frame остаётся внутри source.
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
      transform,
      axis
    })
  })

  return Math.abs(originalScale) * sourceScaleLimit
}

/**
 * Возвращает расстояние между двумя scale-значениями в source-пикселях выбранной оси.
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
    transform.cropSourceScaleAnchorX = getTransformAnchorX({ transform })
    transform.cropSourceScaleAnchorY = getTransformAnchorY({ transform })
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
 * Возвращает максимальный proportional multiplier, при котором frame остаётся внутри source.
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
    anchorX: getTransformAnchorX({ transform }),
    anchorY: getTransformAnchorY({ transform })
  })
}

/**
 * Возвращает source-границы resize или null для режима allow overflow.
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
 * Возвращает fixed anchor по указанной оси для текущего Fabric transform.
 */
function getTransformAxisAnchor({
  transform,
  axis
}: {
  transform: Transform
  axis: CropScaleAxis
}): CropSourceScaleAnchor {
  if (axis === 'x') return getTransformAnchorX({ transform })

  return getTransformAnchorY({ transform })
}

/**
 * Возвращает fixed anchor по горизонтали для текущего Fabric transform.
 */
function getTransformAnchorX({ transform }: { transform: Transform }): CropSourceScaleAnchor {
  if (transform.corner === 'tl' || transform.corner === 'bl' || transform.corner === 'ml') {
    return 'max'
  }
  if (transform.corner === 'tr' || transform.corner === 'br' || transform.corner === 'mr') {
    return 'min'
  }

  if (transform.originX === 'left' || transform.originX === 0) return 'min'
  if (transform.originX === 'right' || transform.originX === 1) return 'max'

  return 'center'
}

/**
 * Возвращает fixed anchor по вертикали для текущего Fabric transform.
 */
function getTransformAnchorY({ transform }: { transform: Transform }): CropSourceScaleAnchor {
  if (transform.corner === 'tl' || transform.corner === 'tr' || transform.corner === 'mt') {
    return 'max'
  }
  if (transform.corner === 'bl' || transform.corner === 'br' || transform.corner === 'mb') {
    return 'min'
  }

  if (transform.originY === 'top' || transform.originY === 0) return 'min'
  if (transform.originY === 'bottom' || transform.originY === 1) return 'max'

  return 'center'
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
