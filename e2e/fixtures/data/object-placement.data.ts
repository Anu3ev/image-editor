/** Базовые параметры фигуры для e2e-сценариев с изменением монтажной области. */
export const CANVAS_RESOLUTION_SHAPE_OPTIONS = {
  id: 'canvas-resolution-shape',
  left: 40,
  top: 56,
  originX: 'left',
  originY: 'top',
  width: 160,
  height: 120,
  fill: '#c8d0e0'
} as const

/** Базовые параметры текста для e2e-сценариев с изменением монтажной области. */
export const CANVAS_RESOLUTION_TEXT_OPTIONS = {
  id: 'canvas-resolution-text',
  text: 'Текст для проверки позиции',
  left: 220,
  top: 104,
  originX: 'left',
  originY: 'top',
  fontSize: 48
} as const

/** Новая ширина монтажной области для проверки reposition-safe resize по ширине. */
export const CANVAS_RESOLUTION_UPDATED_WIDTH = 640

/** Новая высота монтажной области для проверки reposition-safe resize по высоте. */
export const CANVAS_RESOLUTION_UPDATED_HEIGHT = 384

/** Увеличенное разрешение монтажной области для проверки пересчёта zoom. */
export const CANVAS_RESOLUTION_LARGE_SIZE = {
  width: 700,
  height: 680
} as const

/** Параметры фигуры, у которой left/top трактуются как левая верхняя точка. */
export const SHAPE_LEFT_TOP_ADD_OPTIONS = {
  id: 'shape-placement-left-top',
  left: 96,
  top: 84,
  originX: 'left',
  originY: 'top',
  width: 180,
  height: 120,
  fill: '#d8d2c0'
} as const

/** Параметры фигуры с привязкой по правому нижнему углу. */
export const SHAPE_RIGHT_BOTTOM_ADD_OPTIONS = {
  id: 'shape-placement-right-bottom',
  left: 360,
  top: 280,
  originX: 'right',
  originY: 'bottom',
  width: 150,
  height: 96,
  fill: '#f0c090'
} as const

/** Параметры текста с привязкой по правому нижнему углу. */
export const TEXT_RIGHT_BOTTOM_ADD_OPTIONS = {
  id: 'text-placement-right-bottom',
  text: 'Исходный текст',
  left: 380,
  top: 260,
  originX: 'right',
  originY: 'bottom',
  fontSize: 48
} as const

/** Стиль для проверки update текста без сдвига правого нижнего угла. */
export const TEXT_RIGHT_BOTTOM_UPDATED_STYLE = {
  fontSize: 84,
  bold: true
} as const

/** Более длинный текст для проверки ввода без сдвига правого нижнего угла. */
export const TEXT_RIGHT_BOTTOM_EDITED_TEXT = 'Более длинный текст для проверки позиции'
