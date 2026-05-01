import {
  Canvas,
  Point,
  Transform,
  type FabricObject
} from 'fabric'
import type {
  ShapeGroup,
  ShapeScalingState,
  ShapeTransformOriginX,
  ShapeTransformOriginY
} from '../types'

type ShapeTransformOriginalNumberKey = 'left' | 'top' | 'scaleX' | 'scaleY'

type ShapeScalingPointerEvent = Event | MouseEvent | PointerEvent | TouchEvent

/**
 * Возвращает числовое значение из transform.original, если оно доступно.
 */
export const resolveShapeTransformOriginalNumber = ({
  transform,
  key
}: {
  transform?: Transform | null
  key: ShapeTransformOriginalNumberKey
}): number | null => {
  const original = transform?.original
  if (!original || typeof original !== 'object') return null

  const value = original[key]
  if (typeof value !== 'number' || !Number.isFinite(value)) return null

  return value
}

/**
 * Нормализует horizontal origin-значение transform.
 */
export const resolveShapeTransformOriginXValue = ({
  value
}: {
  value: unknown
}): ShapeTransformOriginX | null => {
  if (value === 'left' || value === 'center' || value === 'right') {
    return value
  }

  if (typeof value === 'number' && Number.isFinite(value)) return value

  return null
}

/**
 * Нормализует vertical origin-значение transform.
 */
export const resolveShapeTransformOriginYValue = ({
  value
}: {
  value: unknown
}): ShapeTransformOriginY | null => {
  if (value === 'top' || value === 'center' || value === 'bottom') {
    return value
  }

  if (typeof value === 'number' && Number.isFinite(value)) return value

  return null
}

/**
 * Возвращает, какие оси реально участвуют в текущем scale-transform.
 */
export const resolveShapeScaleActionAxes = ({
  transform
}: {
  transform?: Transform | null
}): {
  canScaleWidth: boolean
  canScaleHeight: boolean
  isCornerScaleAction: boolean
  isVerticalOnlyScale: boolean
} => {
  const action = transform?.action ?? ''
  const corner = typeof transform?.corner === 'string' ? transform.corner : ''
  const isCornerScaleAction = corner === 'tl'
    || corner === 'tr'
    || corner === 'bl'
    || corner === 'br'
  const isHorizontalScaleAction = action === 'scaleX' || corner === 'ml' || corner === 'mr'
  const isVerticalScaleAction = action === 'scaleY' || corner === 'mt' || corner === 'mb'
  const canScaleWidth = isHorizontalScaleAction || isCornerScaleAction
  const canScaleHeight = isVerticalScaleAction || isCornerScaleAction

  return {
    canScaleWidth,
    canScaleHeight,
    isCornerScaleAction,
    isVerticalOnlyScale: canScaleHeight && !canScaleWidth
  }
}

/**
 * Пересчитывает pointer из canvas-события в локальные координаты активного scale-transform.
 */
export const resolveScaleLocalPointerForTransform = ({
  event,
  target,
  transform,
  canvas
}: {
  event?: ShapeScalingPointerEvent
  target: FabricObject
  transform: Transform
  canvas: Canvas
}): Point | null => {
  if (!event) return null

  const resolvedCanvas = target.canvas ?? canvas
  const pointer = resolvedCanvas.getScenePoint(event as MouseEvent | PointerEvent | TouchEvent)
  const centerPoint = target.getRelativeCenterPoint()
  const originPoint = target.translateToGivenOrigin(
    centerPoint,
    'center',
    'center',
    transform.originX,
    transform.originY
  )
  const angle = target.angle ?? 0
  const normalizedPointer = angle === 0
    ? pointer
    : pointer.rotate((-angle * Math.PI) / 180, centerPoint)
  const localPoint = normalizedPointer.subtract(originPoint)
  const control = target.controls[transform.corner]
  const zoom = resolvedCanvas.getZoom() || 1
  const padding = (target.padding ?? 0) / zoom

  if (localPoint.x >= padding) {
    localPoint.x -= padding
  }
  if (localPoint.x <= -padding) {
    localPoint.x += padding
  }
  if (localPoint.y >= padding) {
    localPoint.y -= padding
  }
  if (localPoint.y <= -padding) {
    localPoint.y += padding
  }

  localPoint.x -= control?.offsetX ?? 0
  localPoint.y -= control?.offsetY ?? 0

  return localPoint
}

/**
 * Возвращает anchor-точку активного transform в координатах canvas.
 */
export const resolveShapeScalingAnchorPoint = ({
  group,
  originX,
  originY
}: {
  group: ShapeGroup
  originX: ShapeTransformOriginX | null
  originY: ShapeTransformOriginY | null
}): Point | null => {
  if (originX === null || originY === null) return null

  const groupWithTransformApi = group as ShapeGroup & {
    getRelativeCenterPoint?: () => Point
    translateToOriginPoint?: (
      point: Point,
      nextOriginX: ShapeTransformOriginX,
      nextOriginY: ShapeTransformOriginY
    ) => Point
  }
  const centerPoint = typeof groupWithTransformApi.getRelativeCenterPoint === 'function'
    ? groupWithTransformApi.getRelativeCenterPoint()
    : group.getCenterPoint()

  if (typeof groupWithTransformApi.translateToOriginPoint !== 'function') {
    return centerPoint
  }

  return groupWithTransformApi.translateToOriginPoint(centerPoint, originX, originY)
}

/**
 * Возвращает true, если transform origin изменился относительно старта текущего drag.
 */
export const isShapeTransformOriginChanged = ({
  state,
  transform
}: {
  state: ShapeScalingState
  transform?: Transform | null
}): boolean => {
  if (!transform) return false
  if (state.startTransformOriginX === null && state.startTransformOriginY === null) return false

  const originX = resolveShapeTransformOriginXValue({
    value: transform.originX
  })
  const originY = resolveShapeTransformOriginYValue({
    value: transform.originY
  })

  return originX !== state.startTransformOriginX || originY !== state.startTransformOriginY
}

/**
 * Возвращает true, если active corner изменился относительно старта текущего drag.
 */
export const isShapeTransformCornerChanged = ({
  state,
  transform
}: {
  state: ShapeScalingState
  transform?: Transform | null
}): boolean => {
  if (!transform) return false
  if (!state.startTransformCorner) return false

  return transform.corner !== state.startTransformCorner
}
