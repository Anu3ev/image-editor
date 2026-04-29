import type {
  ShapeAddAtBoundsParams,
  TextAddParams
} from '../../types'

export const ACTIVE_SELECTION_MINIMUM_SIZE = 1
export const ACTIVE_SELECTION_MINIMUM_SIZE_TOLERANCE = 1.5

export const ACTIVE_SELECTION_FLIP_TEXT_LEFT_OPTIONS = {
  id: 'active-selection-flip-text-left',
  left: 120,
  top: 120,
  width: 140,
  text: 'TEST',
  fontSize: 36,
  autoExpand: false
} satisfies TextAddParams

export const ACTIVE_SELECTION_FLIP_TEXT_RIGHT_OPTIONS = {
  id: 'active-selection-flip-text-right',
  left: 360,
  top: 120,
  width: 140,
  text: 'TEST',
  fontSize: 36,
  autoExpand: false
} satisfies TextAddParams

export const ACTIVE_SELECTION_FLIP_SHAPE_LEFT_OPTIONS = {
  id: 'active-selection-flip-shape-left',
  left: 120,
  top: 120,
  width: 160,
  height: 160,
  text: 'TEST',
  textStyle: {
    fontSize: 36
  }
} satisfies ShapeAddAtBoundsParams['options']

export const ACTIVE_SELECTION_FLIP_SHAPE_RIGHT_OPTIONS = {
  id: 'active-selection-flip-shape-right',
  left: 360,
  top: 120,
  width: 160,
  height: 160,
  text: 'TEST',
  textStyle: {
    fontSize: 36
  }
} satisfies ShapeAddAtBoundsParams['options']
