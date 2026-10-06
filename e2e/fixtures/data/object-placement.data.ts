/** Base shape options for e2e scenarios that change the artboard. */
export const CANVAS_RESOLUTION_SHAPE_OPTIONS = {
  id: 'canvas-resolution-shape',
  left: 40,
  top: 56,
  originX: 'left',
  originY: 'top',
  width: 160,
  height: 120,
  fill: '#c8d0e0'
} as const

/** Base text options for e2e scenarios that change the artboard. */
export const CANVAS_RESOLUTION_TEXT_OPTIONS = {
  id: 'canvas-resolution-text',
  text: 'Текст для проверки позиции',
  left: 220,
  top: 104,
  originX: 'left',
  originY: 'top',
  fontSize: 48
} as const

/** New artboard width for testing reposition-safe width resize. */
export const CANVAS_RESOLUTION_UPDATED_WIDTH = 640

/** New artboard height for testing reposition-safe height resize. */
export const CANVAS_RESOLUTION_UPDATED_HEIGHT = 384

/** Increased artboard resolution for testing zoom recalculation. */
export const CANVAS_RESOLUTION_LARGE_SIZE = {
  width: 700,
  height: 680
} as const

/** Shape options where left/top represent the top-left point. */
export const SHAPE_LEFT_TOP_ADD_OPTIONS = {
  id: 'shape-placement-left-top',
  left: 96,
  top: 84,
  originX: 'left',
  originY: 'top',
  width: 180,
  height: 120,
  fill: '#d8d2c0'
} as const

/** Shape options anchored at the bottom-right corner. */
export const SHAPE_RIGHT_BOTTOM_ADD_OPTIONS = {
  id: 'shape-placement-right-bottom',
  left: 360,
  top: 280,
  originX: 'right',
  originY: 'bottom',
  width: 150,
  height: 96,
  fill: '#f0c090'
} as const

/** Text options anchored at the bottom-right corner. */
export const TEXT_RIGHT_BOTTOM_ADD_OPTIONS = {
  id: 'text-placement-right-bottom',
  text: 'Исходный текст',
  left: 380,
  top: 260,
  originX: 'right',
  originY: 'bottom',
  fontSize: 48
} as const

/** Text options for testing position after diagonal scaling. */
export const TEXT_AFTER_DIAGONAL_SCALE_ADD_OPTIONS = {
  id: 'text-position-after-diagonal-scale',
  text: 'Новый текст',
  left: 96,
  top: 104,
  originX: 'left',
  originY: 'top',
  width: 240,
  autoExpand: true,
  fontSize: 48
} as const

/** Background for testing text positioning after diagonal scaling. */
export const TEXT_AFTER_DIAGONAL_SCALE_BACKGROUND_STYLE = {
  backgroundColor: '#f3efe0'
} as const

/** Top padding for testing position after diagonal scaling. */
export const TEXT_AFTER_DIAGONAL_SCALE_PADDING_TOP = 50

/** Right padding for testing position after diagonal scaling. */
export const TEXT_AFTER_DIAGONAL_SCALE_PADDING_RIGHT = 50

/** Style for testing text updates without shifting the bottom-right corner. */
export const TEXT_RIGHT_BOTTOM_UPDATED_STYLE = {
  fontSize: 84,
  bold: true
} as const

/** Longer text for testing input without shifting the bottom-right corner. */
export const TEXT_RIGHT_BOTTOM_EDITED_TEXT = 'Более длинный текст для проверки позиции'
