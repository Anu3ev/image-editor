import { Rect } from 'fabric'

import type { ObjectBounds } from '../../../src/editor/utils/geometry'

/** Rect fixture, который имитирует crop frame с display-size в source-пикселях. */
type SourceScaledRect = Rect & {
  cropSource?: Rect | null
  cropSourceScaleX: number
  cropSourceScaleY: number
  getObjectDisplaySize(): { width: number; height: number }
  getObjectSnappingBounds(): ObjectBounds
}

/** Параметры создания Rect, чей display-size считается в source-пикселях. */
type SourceScaledRectParams = {
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

/** Создаёт Rect, чей display-size считается в source-пикселях. */
export function createSourceScaledRect({
  width,
  height,
  scaleX,
  scaleY,
  sourceScaleX,
  sourceScaleY,
  left = 0,
  top = 0,
  sourceBounds
}: SourceScaledRectParams): SourceScaledRect {
  const target = new Rect({
    left,
    top,
    width,
    height,
    scaleX,
    scaleY,
    originX: 'left',
    originY: 'top',
    strokeWidth: 0
  }) as SourceScaledRect

  target.cropSourceScaleX = sourceScaleX
  target.cropSourceScaleY = sourceScaleY
  target.cropSource = sourceBounds ? createSourceBoundsRect({ bounds: sourceBounds }) : null
  target.getObjectDisplaySize = () => {
    return {
      width: Math.max(1, (target.width * Math.abs(target.scaleX ?? 1)) / sourceScaleX),
      height: Math.max(1, (target.height * Math.abs(target.scaleY ?? 1)) / sourceScaleY)
    }
  }
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
  target: SourceScaledRect
}): { width: number; height: number } {
  const size = target.getObjectDisplaySize()

  return {
    width: Math.round(size.width),
    height: Math.round(size.height)
  }
}
