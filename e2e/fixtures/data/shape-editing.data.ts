import type {
  ShapeAddParams,
  ShapePresetKey
} from '../../types'

export const SHAPE_EDITING_POINTER_PRIMARY_PRESET: ShapePresetKey = 'arrow-up-down'

export const SHAPE_EDITING_POINTER_PRIMARY_OPTIONS: NonNullable<ShapeAddParams['options']> = {
  id: 'shape-editing-pointer-primary',
  left: 340,
  top: 260,
  width: 320,
  height: 180,
  shapeTextAutoExpand: false,
  text: 'Alpha Beta Gamma',
  textStyle: {
    fontSize: 42
  }
}

export const SHAPE_EDITING_POINTER_SECONDARY_PRESET: ShapePresetKey = 'square'

export const SHAPE_EDITING_POINTER_SECONDARY_OPTIONS: NonNullable<ShapeAddParams['options']> = {
  id: 'shape-editing-pointer-secondary',
  left: 104,
  top: 104,
  width: 120,
  height: 120,
  shapeTextAutoExpand: false,
  text: 'Вторая фигура',
  textStyle: {
    fontSize: 36
  }
}
