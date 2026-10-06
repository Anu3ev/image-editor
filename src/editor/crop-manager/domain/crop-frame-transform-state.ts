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
 * Crop frame scale to restore along with its position.
 */
type CropFrameScaleState = {
  scaleX: number
  scaleY: number
}

/**
 * Returns frame geometry materialized from the source rect.
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
 * Returns enough crop frame geometry to restore a live resize.
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
 * Restores crop frame geometry within the current live resize session.
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
