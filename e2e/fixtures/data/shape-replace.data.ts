import type { ShapeAddParams } from '../../types'

/** Base shape for preset-replacement e2e scenarios. */
export const SHAPE_REPLACE_BASE_OPTIONS: NonNullable<ShapeAddParams['options']> = {
  width: 220,
  height: 220,
  text: 'TEST',
  textStyle: {
    fontSize: 32
  }
}

/** Long text that should noticeably expand the shape after preset replacement. */
export const SHAPE_REPLACE_EXPANDING_TEXT = 'TEST TEST TEST TEST TEST TEST'

/** Short follow-up input after replacement that must not collapse the shape back. */
export const SHAPE_REPLACE_FOLLOW_UP_TEXT = 'TEST X'

/** Follow-up input after replacement with auto-expansion disabled that should wrap inside the shape. */
export const SHAPE_REPLACE_DISABLED_FOLLOW_UP_TEXT = 'TEST TEST TEST TEST'

const SHAPE_REPLACE_LIMIT_TEXT_FRAGMENT = 'один два три четыре пять шесть семь восемь девять десять '

/** Very long text for a scenario where the replacement shape reaches the artboard width limit. */
export const SHAPE_REPLACE_LIMIT_TEXT = SHAPE_REPLACE_LIMIT_TEXT_FRAGMENT.repeat(10).trim()

/** Reduced artboard resolution for replacement scenarios with an upper width limit. */
export const SHAPE_REPLACE_LIMIT_RESOLUTION = {
  width: 320,
  height: 480
}

/** Font size for a style change after replacement. */
export const SHAPE_REPLACE_STYLE_FONT_SIZE = 96

/** Manual shape-expansion factor before the next replacement. */
export const SHAPE_REPLACE_RESIZE_SCALE_X = 1.6

/** Tolerance for dimension and aspect-ratio comparisons in replacement scenarios. */
export const SHAPE_REPLACE_TOLERANCE = 2

/** Expected aspect ratio of the arrow-up preset. */
export const SHAPE_REPLACE_ARROW_UP_RATIO = 28 / 36
