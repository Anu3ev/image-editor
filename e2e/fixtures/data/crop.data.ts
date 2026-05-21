import {
  CANVAS_MAX_HEIGHT,
  CANVAS_MAX_WIDTH,
  CANVAS_MIN_HEIGHT,
  CANVAS_MIN_WIDTH
} from '../../../src/editor/constants'

/**
 * Минимальный размер crop-области, который должен соблюдаться во время live resize.
 */
export const CROP_MIN_SIZE = {
  width: CANVAS_MIN_WIDTH,
  height: CANVAS_MIN_HEIGHT
}

/**
 * Максимальный размер crop-области, который должен соблюдаться во время live resize.
 */
export const CROP_MAX_SIZE = {
  width: CANVAS_MAX_WIDTH,
  height: CANVAS_MAX_HEIGHT
}

/**
 * Угловые controls crop-области для проверки диагонального resize.
 */
export const CROP_CORNER_CASES = [
  {
    control: 'tl',
    title: 'левого верхнего угла',
    direction: 'both'
  },
  {
    control: 'tr',
    title: 'правого верхнего угла',
    direction: 'both'
  },
  {
    control: 'bl',
    title: 'левого нижнего угла',
    direction: 'both'
  },
  {
    control: 'br',
    title: 'правого нижнего угла',
    direction: 'both'
  }
] as const

/**
 * Боковые controls crop-области для проверки горизонтального и вертикального resize.
 */
export const CROP_SIDE_CASES = [
  {
    control: 'ml',
    title: 'левой стороны',
    direction: 'horizontal'
  },
  {
    control: 'mr',
    title: 'правой стороны',
    direction: 'horizontal'
  },
  {
    control: 'mt',
    title: 'верхней стороны',
    direction: 'vertical'
  },
  {
    control: 'mb',
    title: 'нижней стороны',
    direction: 'vertical'
  }
] as const

/**
 * Все resize-controls crop-области для проверки быстрого shrink через opposite side.
 */
export const CROP_RESIZE_CASES = [
  ...CROP_CORNER_CASES,
  ...CROP_SIDE_CASES
] as const
