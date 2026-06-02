import { Rect } from 'fabric'

import type { ObjectBounds } from '../../../src/editor/utils/geometry'

type SourceScaledRect = Rect & {
  cropSourceScaleX: number
  cropSourceScaleY: number
  getObjectDisplaySize(): { width: number; height: number }
  getObjectSnappingBounds(): ObjectBounds
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
  top = 0
}: {
  width: number
  height: number
  scaleX: number
  scaleY: number
  sourceScaleX: number
  sourceScaleY: number
  left?: number
  top?: number
}): SourceScaledRect {
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
