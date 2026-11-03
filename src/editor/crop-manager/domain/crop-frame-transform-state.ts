import type { Rect } from 'fabric'

import type { CropFrameTransformState } from '../types'

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
