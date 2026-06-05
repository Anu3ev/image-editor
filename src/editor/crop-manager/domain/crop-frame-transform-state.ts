import {
  Point,
  type FabricObject,
  type Rect
} from 'fabric'

import type {
  CropFrameTransformState,
  CropRect
} from '../types'

/**
 * Scale crop frame, который нужно восстановить вместе с позицией.
 */
type CropFrameScaleState = {
  scaleX: number
  scaleY: number
}

/**
 * Возвращает frame geometry, материализованную из source-rect.
 */
export function getCropFrameTransformStateFromSourceRect({
  source,
  frame,
  rect,
  scale
}: {
  source: FabricObject
  frame: Rect
  rect: CropRect
  scale: CropFrameScaleState
}): CropFrameTransformState {
  const center = new Point(
    rect.left + (rect.width / 2),
    rect.top + (rect.height / 2)
  ).transform(source.calcTransformMatrix())
  const position = frame.translateToOriginPoint(
    center,
    frame.originX,
    frame.originY
  )

  return {
    left: position.x,
    top: position.y,
    scaleX: scale.scaleX,
    scaleY: scale.scaleY
  }
}

/**
 * Возвращает geometry crop frame, достаточную для восстановления live resize.
 */
export function getCropFrameTransformState({
  frame
}: {
  frame: Rect
}): CropFrameTransformState {
  return {
    left: frame.left,
    top: frame.top,
    scaleX: frame.scaleX ?? 1,
    scaleY: frame.scaleY ?? 1
  }
}

/**
 * Восстанавливает geometry crop frame внутри текущей live resize-сессии.
 */
export function applyCropFrameTransformState({
  frame,
  state
}: {
  frame: Rect
  state: CropFrameTransformState
}): void {
  frame.set({
    left: state.left,
    top: state.top,
    scaleX: state.scaleX,
    scaleY: state.scaleY
  })
  frame.setCoords()
}
