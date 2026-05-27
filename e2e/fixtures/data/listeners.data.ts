import type { ShapeAddAtBoundsParams } from '../../types'

export const LISTENERS_DUPLICATE_HOTKEY_SHAPE_ID = 'duplicate-hotkey-shape'
export const LISTENERS_CUT_HOTKEY_SHAPE_ID = 'cut-hotkey-shape'

export const LISTENERS_HOTKEY_SHAPE_SIZE = {
  width: 96,
  height: 72
} satisfies Pick<ShapeAddAtBoundsParams['options'], 'width' | 'height'>

export const LISTENERS_DUPLICATE_HOTKEY_SHAPE_OFFSET = {
  left: 80,
  top: 80
} as const

export const LISTENERS_CUT_HOTKEY_SHAPE_OFFSET = {
  left: 160,
  top: 120
} as const

export const LISTENERS_CLIPBOARD_OFFSET = 10

export const LISTENERS_EDGE_ZOOM_MONTAGE_RESOLUTION = {
  width: 4096,
  height: 4096
} as const

export const LISTENERS_EDGE_ZOOM_SHAPE_ID = 'edge-zoom-pan-shape'

export const LISTENERS_EDGE_ZOOM_SHAPE_SIZE = {
  width: 2400,
  height: 2400
} satisfies Pick<ShapeAddAtBoundsParams['options'], 'width' | 'height'>

export const LISTENERS_EDGE_ZOOM_TEXT = 'TEST'

export const LISTENERS_EDGE_ZOOM_TEXT_FONT_SIZE = 720

export const LISTENERS_EDGE_ZOOM_VIEWPORT_RIGHT_INSET = 16

export const LISTENERS_EDGE_ZOOM_DELTA_Y = -240

export const LISTENERS_EDGE_ZOOM_WHEEL_STEPS = 24

export const LISTENERS_EDGE_ZOOM_SCROLL_DELTA_Y = 48
