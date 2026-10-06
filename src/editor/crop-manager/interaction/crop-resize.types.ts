import type { BasicTransformEvent, ModifiedEvent, TPointerEvent, Transform } from 'fabric'

import type { CropRect, CropSize } from '../types'
import type { CropSourceScaleAnchor } from '../domain/crop-source-scale'

/** Crop area scale constrained to the source image bounds. */
export interface CropSourceBoundScale {
  scaleX: number
  scaleY: number
}

/** Immutable source and crop area bounds at the start of the Fabric transform. */
export interface CropSourceScaleBounds {
  sourceSize: CropSize
  startRect: CropRect
}

/** Temporary legacy source-bound resize data shared by the handles and CropManager. */
export interface CropSourceBoundTransform extends Transform {
  cropSourceScaleBounds?: CropSourceScaleBounds | null
  cropSourceScaleClamped?: boolean
  cropSourceBoundScale?: CropSourceBoundScale | null
  cropSourceScaleAnchorX?: CropSourceScaleAnchor
  cropSourceScaleAnchorY?: CropSourceScaleAnchor
  cropSourceScalePreserveAspectRatio?: boolean
}

/** Crop area change with the current temporary Fabric transform. */
export type CropFrameChangeEvent = (BasicTransformEvent<TPointerEvent> | ModifiedEvent<TPointerEvent>) & {
  transform?: CropSourceBoundTransform
}
