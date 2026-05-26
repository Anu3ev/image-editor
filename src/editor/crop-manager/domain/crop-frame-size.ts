import type { FabricObject } from 'fabric'

import type { CropSize } from '../types'

/**
 * Crop frame хранит scale источника, чтобы считать отображаемый размер в source-пикселях.
 */
interface CropFrameSizeTarget extends FabricObject {
  cropSourceScaleX?: number
  cropSourceScaleY?: number
}

/**
 * Возвращает размер crop frame в локальных пикселях источника без stroke.
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
