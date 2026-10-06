import type {
  ShapeAddParams,
  ShapePresetKey,
  TextAddParams
} from '../../types'

/** Shape preset for opacity e2e scenarios. */
export const SHAPE_OPACITY_PRESET: ShapePresetKey = 'square'

/** Text inside the shape for testing shape and text opacity. */
export const SHAPE_OPACITY_TEXT = 'TEST'

/** Default opacity that should apply to both the shape and its text. */
export const SHAPE_OPACITY_VALUE = 0.3

/** Opacity that should apply only to the shape. */
export const SHAPE_SHAPE_ONLY_OPACITY_VALUE = 0.4

/** Shape-group ID for testing active-selection opacity. */
export const SHAPE_ACTIVE_SELECTION_OPACITY_SHAPE_ID = 'shape-active-selection-opacity-shape'

/** Standalone-text ID for testing active-selection opacity. */
export const SHAPE_ACTIVE_SELECTION_OPACITY_TEXT_ID = 'shape-active-selection-opacity-text'

/** Opacity applied to all objects in the active selection. */
export const SHAPE_ACTIVE_SELECTION_OPACITY_VALUE = 0.45

/** Shape group for testing active-selection opacity. */
export const SHAPE_ACTIVE_SELECTION_OPACITY_SHAPE_ADD_PARAMS = {
  presetKey: SHAPE_OPACITY_PRESET,
  options: {
    id: SHAPE_ACTIVE_SELECTION_OPACITY_SHAPE_ID,
    left: 170,
    top: 150,
    width: 180,
    height: 120,
    text: SHAPE_OPACITY_TEXT,
    textStyle: {
      fontSize: 48
    }
  }
} satisfies ShapeAddParams

/** Standalone text for testing active-selection opacity. */
export const SHAPE_ACTIVE_SELECTION_OPACITY_TEXT_ADD_PARAMS = {
  id: SHAPE_ACTIVE_SELECTION_OPACITY_TEXT_ID,
  left: 430,
  top: 150,
  width: 180,
  fontSize: 48,
  text: 'TEXT'
} satisfies TextAddParams

/** Shape preset for the demo scenario with opacity controls. */
export const SHAPE_DEMO_OPACITY_PRESET: ShapePresetKey = 'square'

/** Demo opacity-control slider value as a percentage. */
export const SHAPE_DEMO_OPACITY_PERCENT = 40

/** Expected opacity of a new shape from the demo controls. */
export const SHAPE_DEMO_OPACITY_VALUE = SHAPE_DEMO_OPACITY_PERCENT / 100
