import type { BasicTransformEvent, ModifiedEvent, TPointerEvent, Transform } from 'fabric'

import type { CropRect, CropSize } from '../types'
import type { CropSourceScaleAnchor } from '../domain/crop-source-scale'

/** Масштаб crop-области, ограниченный границами исходного изображения. */
export interface CropSourceBoundScale {
  scaleX: number
  scaleY: number
}

/** Неизменяемые границы источника и crop-области в начале преобразования Fabric. */
export interface CropSourceScaleBounds {
  sourceSize: CropSize
  startRect: CropRect
}

/** Временные данные прежнего source-bound resize, общие для ручек и CropManager. */
export interface CropSourceBoundTransform extends Transform {
  cropSourceScaleBounds?: CropSourceScaleBounds | null
  cropSourceScaleClamped?: boolean
  cropSourceBoundScale?: CropSourceBoundScale | null
  cropSourceScaleAnchorX?: CropSourceScaleAnchor
  cropSourceScaleAnchorY?: CropSourceScaleAnchor
  cropSourceScalePreserveAspectRatio?: boolean
}

/** Изменение crop-области с текущим временным преобразованием Fabric. */
export type CropFrameChangeEvent = (BasicTransformEvent<TPointerEvent> | ModifiedEvent<TPointerEvent>) & {
  transform?: CropSourceBoundTransform
}
