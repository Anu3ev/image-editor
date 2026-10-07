import type { TextAddParams } from '../../types'

/** Tolerance for geometry checks in autoExpand scenarios. */
export const TEXT_AUTO_EXPAND_TOLERANCE = {
  geometry: 1.5
}

/** Vertical offset for multi-object autoExpand scenarios. */
export const TEXT_AUTO_EXPAND_STACK_OFFSET = 80

/** Base text object for scenarios with default autoExpand. */
export const TEXT_AUTO_EXPAND_BASE_OPTIONS: TextAddParams = {
  text: 'Текст',
  width: 140,
  fontSize: 24
}

/** Long text that should fit on one line after auto-expansion. */
export const TEXT_AUTO_EXPAND_EDITING_TEXT = 'один два три четыре пять шесть'

/** Even longer text for another check after redo. */
export const TEXT_AUTO_EXPAND_LONGER_TEXT = 'один два три четыре пять шесть семь восемь девять'

/** Long text that should reach the artboard width limit and start wrapping. */
export const TEXT_AUTO_EXPAND_LIMIT_TEXT = 'один два три четыре пять шесть семь восемь девять десять '.repeat(10).trim()

/** Base text object for scaling after reaching the artboard width limit. */
export const TEXT_AUTO_EXPAND_LIMIT_BASE_OPTIONS: TextAddParams = {
  text: 'Текст',
  width: 120,
  fontSize: 32
}

/** Object options for testing auto-expansion when increasing font size. */
export const TEXT_AUTO_EXPAND_FONT_BASE_OPTIONS: TextAddParams = {
  text: 'Заголовок',
  width: 100,
  fontSize: 24
}

/** Target font size for testing width growth through updateText. */
export const TEXT_AUTO_EXPAND_GROWN_FONT_SIZE = 54

/** Reduced artboard resolution for the maximum-width constraint scenario. */
export const TEXT_AUTO_EXPAND_LIMIT_RESOLUTION = {
  width: 320,
  height: 480
}
