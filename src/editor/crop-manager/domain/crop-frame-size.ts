import type { FabricObject } from 'fabric'

import type { CropSize } from '../types'

/**
 * The crop frame stores the source scale to calculate its displayed size in source pixels.
 */
interface CropFrameSizeTarget extends FabricObject {
  cropSourceScaleX?: number
  cropSourceScaleY?: number
}

/**
 * Returns the crop frame size in local source pixels, excluding the stroke.
 */
export function getCropFrameSourceSize({
  frame,
  scaleX = frame.scaleX ?? 1,
  scaleY = frame.scaleY ?? 1
}: {
  frame: CropFrameSizeTarget
  scaleX?: number
  scaleY?: number
}): CropSize {
  const sourceScaleX = Math.abs(frame.cropSourceScaleX ?? 1) || 1
  const sourceScaleY = Math.abs(frame.cropSourceScaleY ?? 1) || 1

  return {
    width: Math.max(1, (frame.width * Math.abs(scaleX)) / sourceScaleX),
    height: Math.max(1, (frame.height * Math.abs(scaleY)) / sourceScaleY)
  }
}
