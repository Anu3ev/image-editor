import type { ObjectTargetParams } from './editor.types'
import type { SnappingObjectSnapshot } from './snapping.types'

/** Стандартная ручка изменения размера Fabric image. */
export type ImageScaleControl =
  | 'tl'
  | 'mt'
  | 'tr'
  | 'ml'
  | 'mr'
  | 'bl'
  | 'mb'
  | 'br'

/** Точка геометрии изображения в координатах canvas-сцены. */
export interface ImageScalePoint {
  x: number
  y: number
}

/** Клавиши-модификаторы реального pointer-жеста изменения размера изображения. */
export interface ImageScaleModifiers {
  altKey?: boolean
  ctrlKey?: boolean
  shiftKey?: boolean
}

/** Параметры начала изменения размера изображения через конкретную ручку. */
export interface ImageScaleStartParams extends ObjectTargetParams, ImageScaleModifiers {
  control: ImageScaleControl
}

/** Параметры движения активной ручки в viewport-пикселях. */
export interface ImageScaleMoveByParams extends ImageScaleModifiers {
  deltaX: number
  deltaY: number
  pointerSteps?: number
}

/** Параметры движения активной ручки к точке canvas-сцены. */
export interface ImageScaleMoveToParams extends ImageScaleModifiers {
  point: ImageScalePoint
  pointerSteps?: number
}

/** Геометрия image-объекта и его стандартных controls во время scale-жеста. */
export interface ImageScaleSnapshot extends SnappingObjectSnapshot {
  centerPoint: ImageScalePoint
  controlPoints: Record<ImageScaleControl, ImageScalePoint>
  skewX: number
  skewY: number
}
