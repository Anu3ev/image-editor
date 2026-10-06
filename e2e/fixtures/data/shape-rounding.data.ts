import type { ShapeAddParams } from '../../types'

/** Non-proportional rectangle with manual dimensions for corner-rounding regression scenarios. */
export const SHAPE_ROUNDING_MANUAL_SIZE_OPTIONS: NonNullable<ShapeAddParams['options']> = {
  width: 260,
  height: 140,
  text: '5.4\nBluetooth',
  shapeTextAutoExpand: false,
  rounding: 25,
  textStyle: {
    fontSize: 32
  }
}

/** New rounding value for testing that the change does not collapse the shape. */
export const SHAPE_ROUNDING_UPDATED_VALUE = 28

/** Tolerance for comparing shape geometry before and after changing the rounding. */
export const SHAPE_ROUNDING_SIZE_TOLERANCE = 2
