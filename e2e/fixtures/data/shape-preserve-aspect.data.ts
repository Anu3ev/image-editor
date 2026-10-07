import type { ShapeAddParams, ShapePresetKey } from '../../types'

/** Base options for e2e scenarios that add a shape while preserving its aspect ratio. */
export const SHAPE_PRESERVE_ASPECT_BASE_OPTIONS: NonNullable<ShapeAddParams['options']> = {
  id: 'shape-preserve-aspect',
  width: 220,
  height: 320,
  preserveAspectRatio: true,
  text: 'TEST',
  textStyle: {
    fontSize: 72
  }
}

/** Short follow-up input after adding the shape that must not collapse it. */
export const SHAPE_PRESERVE_ASPECT_FOLLOW_UP_TEXT = 'TEST!'

/** New preset for testing the replace path after the shape grows to fit text. */
export const SHAPE_PRESERVE_ASPECT_REPLACEMENT_PRESET: ShapePresetKey = 'arrow-right'

/** Tolerance for dimension comparisons after the add/edit/replace path. */
export const SHAPE_PRESERVE_ASPECT_TOLERANCE = 2
