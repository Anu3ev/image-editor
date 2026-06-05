import type {
  FabricObject,
  Transform
} from 'fabric'

import type { CropFrameResizeTarget } from './crop-frame'

/**
 * Fabric action-имена, которые означают resize crop frame.
 */
const CROP_FRAME_RESIZE_ACTIONS = ['scale', 'scaleX', 'scaleY'] as readonly string[]

/**
 * Fabric control-ключи, которые означают resize crop frame.
 */
const CROP_FRAME_RESIZE_CONTROL_KEYS = ['tl', 'tr', 'bl', 'br', 'ml', 'mr', 'mt', 'mb'] as readonly string[]

/**
 * Возвращает фактический resize-режим crop frame с учётом transient live override и Shift.
 */
export function resolveCropFrameResizePreserveAspectRatio({
  target,
  shiftKey = false
}: {
  target: FabricObject
  shiftKey?: boolean
}): boolean {
  const cropTarget = target as CropFrameResizeTarget
  const activeResizePreserveAspectRatio = cropTarget.cropActiveResizePreserveAspectRatio

  if (typeof activeResizePreserveAspectRatio === 'boolean') {
    return activeResizePreserveAspectRatio
  }

  const preserveAspectRatio = cropTarget.preserveAspectRatio ?? true
  if (!shiftKey) return preserveAspectRatio

  return !preserveAspectRatio
}

/**
 * Возвращает true, если Fabric transform относится к resize crop frame.
 */
export function isCropFrameResizeTransform({
  transform
}: {
  transform?: Transform | null
}): boolean {
  if (!transform) return false

  const { action, corner } = transform

  if (action && CROP_FRAME_RESIZE_ACTIONS.includes(action)) return true
  if (corner && CROP_FRAME_RESIZE_CONTROL_KEYS.includes(corner)) return true

  return false
}
