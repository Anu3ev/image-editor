import type {
  ShapeAddParams,
  ShapeStrokeParams
} from '../../types'

export const SHAPE_STROKE_BASE_OPTIONS: NonNullable<ShapeAddParams['options']> = {
  width: 200,
  height: 320,
  shapeTextAutoExpand: false,
  text: 'TEST',
  textStyle: {
    fontSize: 72
  }
}

export const SHAPE_STROKE_STYLE: Required<Pick<ShapeStrokeParams, 'stroke' | 'strokeWidth'>> = {
  stroke: '#00ff00',
  strokeWidth: 10
}

export const SHAPE_STROKE_SAFE_AREA_TOLERANCE = 1.5
