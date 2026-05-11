import type { ShapeAddAtBoundsParams } from '../../types'
import {
  SHAPE_PROPORTIONAL_TEXT_FONT_SIZE,
  SHAPE_PROPORTIONAL_THREE_WORD_WRAP_SCENARIO,
  SHAPE_PROPORTIONAL_TWO_WORD_WRAP_SCENARIO
} from './shape-scaling.data'

export const SHAPE_MULTI_SCALING_LEFT_OPTIONS = {
  id: 'shape-multi-scaling-left',
  left: 120,
  top: 120,
  width: 220,
  height: 220,
  text: 'Active text',
  textStyle: {
    fontSize: 48
  }
}

export const SHAPE_MULTI_SCALING_RIGHT_OPTIONS = {
  id: 'shape-multi-scaling-right',
  left: 420,
  top: 120,
  width: 220,
  height: 220,
  text: 'Active text',
  textStyle: {
    fontSize: 48
  }
}

export const SHAPE_MULTI_SCALING_SHORT_LEFT_OPTIONS = {
  id: 'shape-multi-scaling-short-left',
  left: 120,
  top: 260,
  width: 220,
  height: 120,
  text: 'TEST',
  textStyle: {
    fontSize: 48
  }
}

export const SHAPE_MULTI_SCALING_TALL_RIGHT_OPTIONS = {
  id: 'shape-multi-scaling-tall-right',
  left: 420,
  top: 120,
  width: 220,
  height: 260,
  text: 'TEST',
  textStyle: {
    fontSize: 48
  }
}

export const SHAPE_MULTI_SCALING_SCALE_X = 0.55

export const SHAPE_MULTI_SCALING_EXPAND_SCALE_X = 1.85

export const SHAPE_MULTI_SCALING_EXPAND_SCALE_Y = 1.85

export const SHAPE_MULTI_SCALING_SCALE_Y = 0.55

export const SHAPE_MULTI_SCALING_EDITED_TEXT = 'Active text Active text Active text Active text'

export const SHAPE_ACTIVE_SELECTION_WORD_WRAP_LEFT_OPTIONS = {
  id: 'shape-active-selection-word-wrap-left',
  left: 120,
  top: 120,
  width: 220,
  height: 220,
  text: SHAPE_PROPORTIONAL_TWO_WORD_WRAP_SCENARIO.text,
  textStyle: {
    fontSize: SHAPE_PROPORTIONAL_TEXT_FONT_SIZE
  }
} satisfies ShapeAddAtBoundsParams['options']

export const SHAPE_ACTIVE_SELECTION_WORD_WRAP_RIGHT_OPTIONS = {
  id: 'shape-active-selection-word-wrap-right',
  left: 420,
  top: 120,
  width: 220,
  height: 220,
  text: SHAPE_PROPORTIONAL_THREE_WORD_WRAP_SCENARIO.text,
  textStyle: {
    fontSize: SHAPE_PROPORTIONAL_TEXT_FONT_SIZE
  }
} satisfies ShapeAddAtBoundsParams['options']

export const SHAPE_MULTI_SCALING_TOLERANCE = {
  mouseupJump: 1.5
}
