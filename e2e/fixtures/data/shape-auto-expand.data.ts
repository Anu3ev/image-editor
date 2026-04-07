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

/** Базовая ширина для atomic update-сценариев с явной ручной базой. */
export const SHAPE_AUTO_EXPAND_ATOMIC_UPDATE_WIDTH = 220

const SHAPE_AUTO_EXPAND_LIMIT_TEXT_FRAGMENT = 'один два три четыре пять шесть семь восемь девять десять '

/** Очень длинный текст, который должен упереться в ширину монтажной области. */
export const SHAPE_AUTO_EXPAND_LIMIT_TEXT = SHAPE_AUTO_EXPAND_LIMIT_TEXT_FRAGMENT.repeat(10).trim()

/** Уменьшенное разрешение монтажной области для проверки упора в максимальную ширину фигуры. */
export const SHAPE_AUTO_EXPAND_LIMIT_RESOLUTION = {
  width: 320,
  height: 480
}

/** Последовательность ввода около границы переноса строки. */
export const SHAPE_AUTO_EXPAND_TYPING_SEQUENCE = [
  'TEST',
  'TEST T',
  'TEST TE',
  'TEST TES',
  'TEST TEST'
]

/** Последовательность ввода для arrow-up-fat около границы переноса строки. */
export const SHAPE_AUTO_EXPAND_ARROW_UP_FAT_TYPING_SEQUENCE = [
  'TEST',
  'TEST ',
  'TEST X'
]

/** Допуск для сравнений ширины shape в e2e. */
export const SHAPE_AUTO_EXPAND_WIDTH_TOLERANCE = 2
