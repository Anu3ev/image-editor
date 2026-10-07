import { Rect } from 'fabric'

import type { ObjectBounds } from '../../../src/editor/utils/geometry'
import { CropFrame } from '../../../src/editor/crop-manager/domain/crop-frame'

/** Source bounds of the test image after conversion to scene pixels. */
export const SOURCE_BOUNDS = {
  left: 0,
  top: 0,
  right: 342,
  bottom: 342,
  centerX: 171,
  centerY: 171
} as const

/** Source bounds of a 1000x667 rectangular image after scaling by 0.512 and rounding the source guides. */
export const RECTANGULAR_SOURCE_BOUNDS = {
  left: 0,
  top: 0,
  right: 512,
  bottom: 342,
  centerX: 256,
  centerY: 171
} as const

/** Outer source bounds that the test fixture can check without a separate placement model. */
export const SOURCE_BOUNDARY_GUIDE_CASES = [
  {
    title: 'нижней границы source',
    snapGuard: {
      type: 'horizontal',
      edge: 'bottom',
      position: SOURCE_BOUNDS.bottom
    }
  },
  {
    title: 'правой границы source',
    snapGuard: {
      type: 'vertical',
      edge: 'right',
      position: SOURCE_BOUNDS.right
    }
  }
] as const

/** Crop frame parameters with dimensions in source pixels. */
type SourceScaledCropFrameParams = {
  width: number
  height: number
  scaleX: number
  scaleY: number
  sourceScaleX: number
  sourceScaleY: number
  left?: number
  top?: number
  sourceBounds?: ObjectBounds
}

/** Creates a source object with explicit snapping bounds for crop-frame tests. */
function createSourceBoundsRect({ bounds }: { bounds: ObjectBounds }): Rect {
  const source = new Rect({
    left: bounds.left,
    top: bounds.top,
    width: bounds.right - bounds.left,
    height: bounds.bottom - bounds.top,
    strokeWidth: 0
  })

  source.getObjectSnappingBounds = () => bounds

  return source
}

/** Creates a crop frame with controllable bounds and dimensions in source pixels. */
export function createSourceScaledCropFrame({
  width,
  height,
  scaleX,
  scaleY,
  sourceScaleX,
  sourceScaleY,
  left = 0,
  top = 0,
  sourceBounds
}: SourceScaledCropFrameParams): CropFrame {
  const target = new CropFrame({
    left,
    top,
    width,
    height,
    scaleX,
    scaleY,
    originX: 'left',
    originY: 'top',
    strokeWidth: 0,
    showGrid: false,
    sourceScaleX,
    sourceScaleY,
    source: sourceBounds ? createSourceBoundsRect({ bounds: sourceBounds }) : undefined
  })
  target.getObjectSnappingBounds = () => {
    const boundsLeft = target.left ?? 0
    const boundsTop = target.top ?? 0
    const boundsWidth = Math.round(target.width * Math.abs(target.scaleX ?? 1))
    const boundsHeight = Math.round(target.height * Math.abs(target.scaleY ?? 1))

    return {
      left: boundsLeft,
      top: boundsTop,
      right: boundsLeft + boundsWidth,
      bottom: boundsTop + boundsHeight,
      centerX: boundsLeft + (boundsWidth / 2),
      centerY: boundsTop + (boundsHeight / 2)
    }
  }
  target.setCoords()

  return target
}

/** Returns the display size as shown by the object size indicator. */
export function getRoundedDisplaySize({
  target
}: {
  target: CropFrame
}): { width: number; height: number } {
  const size = target.getObjectDisplaySize()

  return {
    width: Math.round(size.width),
    height: Math.round(size.height)
  }
}
