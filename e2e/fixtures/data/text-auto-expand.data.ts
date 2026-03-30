import type { TextAddParams } from '../../types'

/** Допуск для проверок геометрии autoExpand-сценариев. */
export const TEXT_AUTO_EXPAND_TOLERANCE = {
  geometry: 1.5
}

/** Вертикальный сдвиг для multi-object autoExpand-сценариев. */
export const TEXT_AUTO_EXPAND_STACK_OFFSET = 80

/** Базовый текстовый объект для сценариев с autoExpand по умолчанию. */
export const TEXT_AUTO_EXPAND_BASE_OPTIONS: TextAddParams = {
  text: 'Текст',
  width: 140,
  fontSize: 24
}

/** Длинный текст, который должен уместиться в одну строку после авторасширения. */
export const TEXT_AUTO_EXPAND_EDITING_TEXT = 'один два три четыре пять шесть'

/** Ещё более длинный текст для повторной проверки после redo. */
export const TEXT_AUTO_EXPAND_LONGER_TEXT = 'один два три четыре пять шесть семь восемь девять'

/** Длинный текст, который должен уткнуться в ширину монтажной области и начать переноситься. */
export const TEXT_AUTO_EXPAND_LIMIT_TEXT = 'один два три четыре пять шесть семь восемь девять десять '.repeat(10).trim()

/** Базовый текстовый объект для скейлинга после упора в ширину монтажной области. */
export const TEXT_AUTO_EXPAND_LIMIT_BASE_OPTIONS: TextAddParams = {
  text: 'Текст',
  width: 120,
  fontSize: 32
}

/** Параметры объекта для проверки авторасширения при увеличении размера шрифта. */
export const TEXT_AUTO_EXPAND_FONT_BASE_OPTIONS: TextAddParams = {
  text: 'Заголовок',
  width: 100,
  fontSize: 24
}

/** Целевой размер шрифта для проверки роста ширины через updateText. */
export const TEXT_AUTO_EXPAND_GROWN_FONT_SIZE = 54

/** Уменьшенное разрешение montage area для сценария с ограничением максимальной ширины. */
export const TEXT_AUTO_EXPAND_LIMIT_RESOLUTION = {
  width: 320,
  height: 480
}
