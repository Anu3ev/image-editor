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
