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

/** Короткий следующий ввод после замены, который не должен схлопывать фигуру обратно. */
export const SHAPE_REPLACE_FOLLOW_UP_TEXT = 'TEST X'

/** Следующий ввод после замены при выключенном авторасширении, который должен переноситься внутри фигуры. */
export const SHAPE_REPLACE_DISABLED_FOLLOW_UP_TEXT = 'TEST TEST TEST TEST'

const SHAPE_REPLACE_LIMIT_TEXT_FRAGMENT = 'один два три четыре пять шесть семь восемь девять десять '

/** Очень длинный текст для сценария, где replace-шейп упирается в ширину монтажной области. */
export const SHAPE_REPLACE_LIMIT_TEXT = SHAPE_REPLACE_LIMIT_TEXT_FRAGMENT.repeat(10).trim()

/** Уменьшенное разрешение монтажной области для replace-сценариев с верхней границей по ширине. */
export const SHAPE_REPLACE_LIMIT_RESOLUTION = {
  width: 320,
  height: 480
}

/** Размер шрифта для style-change после replace. */
export const SHAPE_REPLACE_STYLE_FONT_SIZE = 96

/** Коэффициент ручного расширения фигуры перед следующей заменой. */
export const SHAPE_REPLACE_RESIZE_SCALE_X = 1.6

/** Допуск для сравнений размеров и пропорций в replace-сценариях. */
export const SHAPE_REPLACE_TOLERANCE = 2

/** Ожидаемое соотношение сторон для пресета arrow-up. */
export const SHAPE_REPLACE_ARROW_UP_RATIO = 28 / 36
