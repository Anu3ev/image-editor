import {
  Point,
  util,
  type ActiveSelection,
  type Transform
} from 'fabric'
import type { ShapeGroup } from '../types'
import { SHAPE_SCALING_SCALE_EPSILON } from './shape-scaling-layout'
import {
  resolveShapeTransformOriginXValue,
  resolveShapeTransformOriginYValue
} from './shape-scaling-transform'

/** Допуск проверки канонической геометрии повёрнутого шейпа. */
const ROTATED_SHAPE_GEOMETRY_EPSILON = 0.000000001

/** Проверяет, что число совпадает с нулём в пределах допуска геометрии. */
function isApproximatelyZero(value: number): boolean {
  return Math.abs(value) <= ROTATED_SHAPE_GEOMETRY_EPSILON
}

/** Проверяет канонический масштаб, наклон и отражение дочернего шейпа. */
function hasCanonicalShapeTransform({ group }: { group: ShapeGroup }): boolean {
  const affineOffsets = [
    (group.scaleX ?? 1) - 1,
    (group.scaleY ?? 1) - 1,
    group.skewX ?? 0,
    group.skewY ?? 0
  ]

  return affineOffsets.every(isApproximatelyZero) && !group.flipX && !group.flipY
}

/** Проверяет, что временная рамка не содержит наклона или отражения. */
function hasSupportedSelectionTransform({
  selection
}: {
  selection: ActiveSelection
}): boolean {
  const skew = [selection.skewX ?? 0, selection.skewY ?? 0]

  return skew.every(isApproximatelyZero) && !selection.flipX && !selection.flipY
}

/** Неизменяемая геометрия повёрнутого шейпа в локальной плоскости общего выделения. */
export type RotatedActiveSelectionShapeGeometry = Readonly<{
  angle: number
  center: Point
}>

/** Преобразование, которое остаётся на восстановленной рамке общего выделения. */
export type ActiveSelectionTransformState = Readonly<{
  angle: number
  flipX: boolean
  flipY: boolean
  scaleX: number
  scaleY: number
  skewX: number
  skewY: number
}>

/** Размер и положение рамки общего выделения после применения последнего кадра скейлинга. */
export type ActiveSelectionCommittedFrame = Readonly<{
  center: Point
  height: number
  transformState: ActiveSelectionTransformState
  width: number
}>

/** Сохраняет последнее видимое состояние рамки до переноса масштаба в дочерние объекты. */
export function captureActiveSelectionCommittedFrame({
  selection
}: {
  selection: ActiveSelection
}): ActiveSelectionCommittedFrame {
  const center = selection.getCenterPoint()
  const width = selection.width * Math.abs(selection.scaleX ?? 1)
  const height = selection.height * Math.abs(selection.scaleY ?? 1)

  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error('Размер восстановленной рамки общего выделения должен быть положительным и конечным')
  }
  if (!Number.isFinite(center.x) || !Number.isFinite(center.y)) {
    throw new Error('Центр восстановленной рамки общего выделения должен состоять из конечных координат')
  }

  return {
    center,
    height,
    transformState: {
      angle: selection.angle ?? 0,
      flipX: Boolean(selection.flipX),
      flipY: Boolean(selection.flipY),
      scaleX: 1,
      scaleY: 1,
      skewX: selection.skewX ?? 0,
      skewY: selection.skewY ?? 0
    },
    width
  }
}

/**
 * Возвращает геометрию канонического повёрнутого шейпа, которому нужна компенсация
 * неравномерного масштаба общего выделения.
 */
export function captureRotatedActiveSelectionShapeGeometry({
  group,
  selection
}: {
  group: ShapeGroup
  selection: ActiveSelection
}): RotatedActiveSelectionShapeGeometry | null {
  const angle = group.angle ?? 0
  if (isApproximatelyZero(angle)) return null
  if (!hasCanonicalShapeTransform({ group })) return null
  if (!hasSupportedSelectionTransform({ selection })) return null

  const center = group.getRelativeCenterPoint()
  if (!Number.isFinite(angle)) throw new Error('Угол повёрнутого шейпа должен быть конечным')
  if (!Number.isFinite(center.x) || !Number.isFinite(center.y)) {
    throw new Error('Центр повёрнутого шейпа должен состоять из конечных координат')
  }

  return { angle, center }
}

/**
 * Компенсирует преобразование общего выделения так, чтобы шейп сохранял собственный угол
 * и получал уже рассчитанные канонические размеры без наклона в координатах сцены.
 */
export function applyRotatedActiveSelectionShapeGeometry({
  geometry,
  group,
  selection
}: {
  geometry: RotatedActiveSelectionShapeGeometry
  group: ShapeGroup
  selection: ActiveSelection
}): void {
  const selectionMatrix = selection.calcTransformMatrix()
  const sceneCenter = geometry.center.transform(selectionMatrix)
  const sceneAngle = (selection.angle ?? 0) + geometry.angle
  const sceneMatrix = util.composeMatrix({
    angle: sceneAngle,
    translateX: sceneCenter.x,
    translateY: sceneCenter.y
  })
  const localMatrix = util.multiplyTransformMatrices(
    util.invertTransform(selectionMatrix),
    sceneMatrix
  )

  if (!Number.isFinite(sceneCenter.x) || !Number.isFinite(sceneCenter.y)) {
    throw new Error('Итоговый центр повёрнутого шейпа должен состоять из конечных координат')
  }
  if (!localMatrix.every(Number.isFinite)) {
    throw new Error('Компенсирующая матрица повёрнутого шейпа должна состоять из конечных значений')
  }

  util.applyTransformToObject(group, localMatrix)
  group.setCoords()
}

/** Применяет ограниченный масштаб к рамке и сохраняет неподвижную точку текущего жеста. */
export function applyActiveSelectionScale({
  scaleX,
  scaleY,
  selection,
  transform
}: {
  scaleX: number
  scaleY: number
  selection: ActiveSelection
  transform: Transform
}): void {
  const currentScaleX = Math.abs(selection.scaleX ?? 1) || 1
  const currentScaleY = Math.abs(selection.scaleY ?? 1) || 1
  const hasScaleChange = Math.abs(currentScaleX - scaleX) > SHAPE_SCALING_SCALE_EPSILON
    || Math.abs(currentScaleY - scaleY) > SHAPE_SCALING_SCALE_EPSILON

  if (!hasScaleChange) return

  const originX = resolveShapeTransformOriginXValue({ value: transform.originX })
  const originY = resolveShapeTransformOriginYValue({ value: transform.originY })
  const anchorPoint = originX !== null && originY !== null
    ? selection.getPositionByOrigin(originX, originY)
    : null

  selection.set({
    flipX: false,
    flipY: false,
    scaleX,
    scaleY
  })

  if (anchorPoint && originX !== null && originY !== null) {
    selection.setPositionByOrigin(anchorPoint, originX, originY)
  }

  selection.setCoords()
}
