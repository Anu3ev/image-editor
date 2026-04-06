import type { ShapeAddParams } from '../../types'

/** Базовая фигура для e2e-сценариев замены пресета. */
export const SHAPE_REPLACE_BASE_OPTIONS: NonNullable<ShapeAddParams['options']> = {
  width: 220,
  height: 220,
  text: 'TEST',
  textStyle: {
    fontSize: 32
  }
}

/** Длинный текст, который должен заметно расширять фигуру после замены пресета. */
export const SHAPE_REPLACE_EXPANDING_TEXT = 'TEST TEST TEST TEST TEST TEST'

/** Допуск для сравнений размеров и пропорций в replace-сценариях. */
export const SHAPE_REPLACE_TOLERANCE = 2

/** Ожидаемое соотношение сторон для пресета arrow-up. */
export const SHAPE_REPLACE_ARROW_UP_RATIO = 28 / 36
