import type { ShapeAddParams } from '../../types'

/** Непропорциональный прямоугольник с ручными размерами для regression-сценариев скругления. */
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

/** Новое значение скругления для проверки что изменение не схлопывает фигуру. */
export const SHAPE_ROUNDING_UPDATED_VALUE = 28

/** Допуск для сравнения геометрии фигуры до и после изменения скругления. */
export const SHAPE_ROUNDING_SIZE_TOLERANCE = 2
