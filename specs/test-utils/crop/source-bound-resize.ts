import { CropFrame } from '../../../src/editor/crop-manager/domain/crop-frame'
import type { CropSourceBoundTransform } from '../../../src/editor/crop-manager/interaction/crop-resize.types'
import { createActiveCropManager } from './manager'
import { createCropTransform } from './interaction'

/** Creates a 50×50 crop within a 100×100 source and a top-right corner gesture. */
export function createSourceBoundResize() {
  const context = createActiveCropManager({ showDimmedArea: false })
  const { frame } = context.session
  if (!(frame instanceof CropFrame)) throw new Error('Resize требует CropFrame')
  frame.set({ left: 0, top: 0, originX: 'center', originY: 'center', scaleX: 1, scaleY: 1 })
  /** In this fixture, the center point is already expressed using the required origin. */
  frame.translateToOriginPoint = (point, originX, originY) => {
    if (originX !== 'center' || originY !== 'center') throw new Error('Fixture поддерживает только центр рамки')
    return point
  }
  const transform: CropSourceBoundTransform = createCropTransform({ frame, action: 'scale' })
  transform.cropSourceScaleBounds = {
    sourceSize: { width: 100, height: 100 },
    startRect: { left: -25, top: -25, width: 50, height: 50 }
  }

  return { ...context, frame, transform }
}
