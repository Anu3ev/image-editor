import type { ShapeAddParams } from '../../types'

/** Base shape dimensions and text for text-size-change scenarios. */
export const SHAPE_TEXT_LAYOUT_BASE_OPTIONS: NonNullable<ShapeAddParams['options']> = {
  width: 180,
  height: 180,
  text: 'TEST',
  textStyle: {
    fontSize: 48
  }
}

/** First shape's position in comparative text-size-change scenarios. */
export const SHAPE_TEXT_LAYOUT_FIRST_POSITION = {
  left: 180,
  top: 220
}

/** Second shape's position in comparative text-size-change scenarios. */
export const SHAPE_TEXT_LAYOUT_SECOND_POSITION = {
  left: 460,
  top: 220
}

/** Font size at which text begins wrapping and the shape grows taller. */
export const SHAPE_TEXT_LAYOUT_WRAP_FONT_SIZE = 96

/** Font size for comparing behavior with a selected shape and in text-editing mode. */
export const SHAPE_TEXT_LAYOUT_COMPARISON_FONT_SIZE = 200

/** Font size at which the shape starts growing wider. */
export const SHAPE_TEXT_LAYOUT_EXPAND_FONT_SIZE = 360
