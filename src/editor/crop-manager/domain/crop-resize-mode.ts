import type {
  FabricObject,
  Transform
} from 'fabric'

import type { CropFrameResizeTarget } from './crop-frame'

/**
 * Fabric action names that indicate a crop frame resize.
 */
const CROP_FRAME_RESIZE_ACTIONS = ['scale', 'scaleX', 'scaleY'] as readonly string[]

/**
 * Fabric control keys that indicate a crop frame resize.
 */
const CROP_FRAME_RESIZE_CONTROL_KEYS = ['tl', 'tr', 'bl', 'br', 'ml', 'mr', 'mt', 'mb'] as readonly string[]

/**
 * Returns the effective crop frame resize mode, accounting for the transient live override and Shift.
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
 * Returns true if the Fabric transform is a crop frame resize.
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
