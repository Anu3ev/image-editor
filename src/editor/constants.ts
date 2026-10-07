import { OBJECT_STATE_SERIALIZATION_PROPS } from './object-serialization'

// Minimum and maximum zoom
export const MIN_ZOOM = 0.1
export const MAX_ZOOM = 2

// Zoom step
export const DEFAULT_ZOOM_RATIO = 0.1

// Rotation button step
export const DEFAULT_ROTATE_RATIO = 90

// Minimum and maximum canvas dimensions
export const CANVAS_MIN_WIDTH = 16
export const CANVAS_MIN_HEIGHT = 16
export const CANVAS_MAX_WIDTH = 4096
export const CANVAS_MAX_HEIGHT = 4096

/**
 * Prefix for clipboard data
 */
export const CLIPBOARD_DATA_PREFIX = 'application/image-editor:'
/**
 * Object keys to preserve when cloning an object for the clipboard
 */
export const CLIPBOARD_CLONE_OBJECT_KEYS = [
  'id',
  ...OBJECT_STATE_SERIALIZATION_PROPS
]

/**
 * Delay before saving text changes in a text object to history
 */
export const TEXT_EDITING_DEBOUNCE_MS = 50
