import { Rect } from 'fabric'

import type { ObjectBounds } from '../../../src/editor/utils/geometry'
import { CropFrame } from '../../../src/editor/crop-manager/domain/crop-frame'

/** Source bounds тестового изображения после пересчёта в scene-пиксели. */
export const SOURCE_BOUNDS = {
  left: 0,
  top: 0,
  right: 342,
  bottom: 342,
  centerX: 171,
  centerY: 171
} as const

/** Source bounds прямоугольного изображения 1000x667 после scale 0.512 и округления source guides. */
export const RECTANGULAR_SOURCE_BOUNDS = {
  left: 0,
  top: 0,
  right: 512,
  bottom: 342,
  centerX: 256,
  centerY: 171
} as const

/** Внешние source-границы, которые test fixture может проверить без отдельной placement-модели. */
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

/** Параметры crop-рамки с размером в пикселях источника. */
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

/** Создаёт source-объект с явными snapping-bounds для crop-frame тестов. */
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

/** Создаёт crop-рамку с управляемыми границами и размером в пикселях источника. */
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

/** Возвращает display-size так, как его показывает object size indicator. */
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
