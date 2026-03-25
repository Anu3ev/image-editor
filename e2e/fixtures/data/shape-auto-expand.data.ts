import type { ShapeAddParams } from '../../types'

/** Базовая фигура для e2e-сценариев авторасширения текста. */
export const SHAPE_AUTO_EXPAND_BASE_OPTIONS: NonNullable<ShapeAddParams['options']> = {
  width: 220,
  height: 220,
  text: '',
  textStyle: {
    fontSize: 72
  }
}

/** Новая базовая ширина после явного обновления размеров фигуры. */
export const SHAPE_AUTO_EXPAND_UPDATED_WIDTH = 280

/** Коэффициент ручного расширения фигуры через скейлинг по ширине. */
export const SHAPE_AUTO_EXPAND_RESIZE_SCALE_X = 1.6

/** Короткий текст, который должен умещаться без сужения фигуры. */
export const SHAPE_AUTO_EXPAND_SHORT_TEXT = 'T'

/** Текст, который при авторасширении должен оставаться в одну строку. */
export const SHAPE_AUTO_EXPAND_LONG_TEXT = 'TEST TEST'

/** Более длинный текст для проверки расширения и обратного сужения. */
export const SHAPE_AUTO_EXPAND_LONGER_TEXT = 'TEST TEST TEST'

/** Очень длинный текст для сценариев с уже расширенной ручной базой. */
export const SHAPE_AUTO_EXPAND_VERY_LONG_TEXT = 'TEST TEST TEST TEST'

/** Последовательность ввода около границы переноса строки. */
export const SHAPE_AUTO_EXPAND_TYPING_SEQUENCE = [
  'TEST',
  'TEST T',
  'TEST TE',
  'TEST TES',
  'TEST TEST'
]

/** Допуск для сравнений ширины shape в e2e. */
export const SHAPE_AUTO_EXPAND_WIDTH_TOLERANCE = 2
