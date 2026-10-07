import type { ShapeAddParams } from '../../types'

/** Base shape for text auto-expansion e2e scenarios. */
export const SHAPE_AUTO_EXPAND_BASE_OPTIONS: NonNullable<ShapeAddParams['options']> = {
  width: 220,
  height: 220,
  text: '',
  textStyle: {
    fontSize: 72
  }
}

/** New base width after explicitly updating the shape dimensions. */
export const SHAPE_AUTO_EXPAND_UPDATED_WIDTH = 280

/** Manual shape-expansion factor for width scaling. */
export const SHAPE_AUTO_EXPAND_RESIZE_SCALE_X = 1.6

/** Short text that should fit without shrinking the shape. */
export const SHAPE_AUTO_EXPAND_SHORT_TEXT = 'T'

/** Text that should remain on one line during auto-expansion. */
export const SHAPE_AUTO_EXPAND_LONG_TEXT = 'TEST TEST'

/** Longer text for testing expansion and subsequent shrinkage. */
export const SHAPE_AUTO_EXPAND_LONGER_TEXT = 'TEST TEST TEST'

/** Very long text for scenarios with an already expanded manual base. */
export const SHAPE_AUTO_EXPAND_VERY_LONG_TEXT = 'TEST TEST TEST TEST'

/** Base width for atomic-update scenarios with an explicit manual base. */
export const SHAPE_AUTO_EXPAND_ATOMIC_UPDATE_WIDTH = 220

const SHAPE_AUTO_EXPAND_LIMIT_TEXT_FRAGMENT = 'один два три четыре пять шесть семь восемь девять десять '

/** Very long text that should reach the artboard width limit. */
export const SHAPE_AUTO_EXPAND_LIMIT_TEXT = SHAPE_AUTO_EXPAND_LIMIT_TEXT_FRAGMENT.repeat(10).trim()

/** Reduced artboard resolution for testing the maximum shape-width limit. */
export const SHAPE_AUTO_EXPAND_LIMIT_RESOLUTION = {
  width: 320,
  height: 480
}

/** Input sequence near the line-wrap boundary. */
export const SHAPE_AUTO_EXPAND_TYPING_SEQUENCE = [
  'TEST',
  'TEST T',
  'TEST TE',
  'TEST TES',
  'TEST TEST'
]

/** Input sequence for arrow-up-fat near the line-wrap boundary. */
export const SHAPE_AUTO_EXPAND_ARROW_UP_FAT_TYPING_SEQUENCE = [
  'TEST',
  'TEST ',
  'TEST X'
]

/** Tolerance for shape-width comparisons in e2e tests. */
export const SHAPE_AUTO_EXPAND_WIDTH_TOLERANCE = 2
