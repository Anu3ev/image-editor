import type { ShapeAddParams } from '../../types'

/** Базовые размеры и текст фигуры для сценариев изменения размера текста. */
export const SHAPE_TEXT_LAYOUT_BASE_OPTIONS: NonNullable<ShapeAddParams['options']> = {
  width: 180,
  height: 180,
  text: 'TEST',
  textStyle: {
    fontSize: 48
  }
}

/** Позиция первой фигуры в сравнительных сценариях изменения размера текста. */
export const SHAPE_TEXT_LAYOUT_FIRST_POSITION = {
  left: 180,
  top: 220
}

/** Позиция второй фигуры в сравнительных сценариях изменения размера текста. */
export const SHAPE_TEXT_LAYOUT_SECOND_POSITION = {
  left: 460,
  top: 220
}

/** Размер шрифта, при котором текст начинает переноситься и фигура растёт по высоте. */
export const SHAPE_TEXT_LAYOUT_WRAP_FONT_SIZE = 96

/** Размер шрифта для сравнения поведения с выделенной фигурой и в режиме редактирования текста. */
export const SHAPE_TEXT_LAYOUT_COMPARISON_FONT_SIZE = 200

/** Размер шрифта, при котором фигура начинает расти по ширине. */
export const SHAPE_TEXT_LAYOUT_EXPAND_FONT_SIZE = 360
