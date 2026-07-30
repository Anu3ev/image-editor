import type { ImageScaleControl } from '../../types'

/** Размер изображения для real-pointer сценариев изменения ширины. */
export const SNAPPING_IMAGE_SCALE_SIZE = {
  width: 80,
  height: 50
}

/** Доля исходного размера, на которую ручка уходит к reference guide. */
export const SNAPPING_IMAGE_SCALE_CONTROL_GROWTH = 0.2

/** Сторона reference geometry, к которой должна прилипнуть ручка. */
export type ImageScaleGuideSide = 'left' | 'right' | 'top' | 'bottom'

/** Один пользовательский сценарий scale через стандартную ручку изображения. */
export type ImageScaleControlCase = Readonly<{
  control: ImageScaleControl
  fixedControl: ImageScaleControl
  title: string
  xGuide?: Extract<ImageScaleGuideSide, 'left' | 'right'>
  yGuide?: Extract<ImageScaleGuideSide, 'top' | 'bottom'>
}>

/** Все стандартные ручки Image и соответствующие им неподвижные точки. */
export const SNAPPING_IMAGE_SCALE_CONTROL_CASES: readonly ImageScaleControlCase[] = [
  {
    control: 'tl',
    fixedControl: 'br',
    title: 'при скейлинге за левый верхний угол прилипает по обеим осям',
    xGuide: 'left',
    yGuide: 'top'
  },
  {
    control: 'mt',
    fixedControl: 'mb',
    title: 'при скейлинге за верхнюю ручку прилипает верхней границей',
    yGuide: 'top'
  },
  {
    control: 'tr',
    fixedControl: 'bl',
    title: 'при скейлинге за правый верхний угол прилипает по обеим осям',
    xGuide: 'right',
    yGuide: 'top'
  },
  {
    control: 'ml',
    fixedControl: 'mr',
    title: 'при скейлинге за левую ручку прилипает левой границей',
    xGuide: 'left'
  },
  {
    control: 'mr',
    fixedControl: 'ml',
    title: 'при скейлинге за правую ручку прилипает правой границей',
    xGuide: 'right'
  },
  {
    control: 'bl',
    fixedControl: 'tr',
    title: 'при скейлинге за левый нижний угол прилипает по обеим осям',
    xGuide: 'left',
    yGuide: 'bottom'
  },
  {
    control: 'mb',
    fixedControl: 'mt',
    title: 'при скейлинге за нижнюю ручку прилипает нижней границей',
    yGuide: 'bottom'
  },
  {
    control: 'br',
    fixedControl: 'tl',
    title: 'при скейлинге за правый нижний угол прилипает по обеим осям',
    xGuide: 'right',
    yGuide: 'bottom'
  }
]

/** Идентификатор узкого шейпа с конкурирующими вертикальными направляющими. */
export const SNAPPING_IMAGE_SCALE_REFERENCE_ID = 'image-scale-reference'

/** Расстояние до reference-шейпа в экранных пикселях. */
export const SNAPPING_IMAGE_SCALE_REFERENCE_GAP_PX = 40

/** Ширина reference-шейпа в экранных пикселях. */
export const SNAPPING_IMAGE_SCALE_REFERENCE_WIDTH_PX = 8

/** Смещения указателя для последовательных шагов внутри зоны удержания. */
export const SNAPPING_IMAGE_SCALE_HOLD_OFFSETS_PX = [1, 2, 3] as const

/** Расстояние после reference-шейпа, на котором уже нет подходящей направляющей. */
export const SNAPPING_IMAGE_SCALE_RELEASE_OFFSET_PX = 12

/** Допуск Fabric control geometry относительно указателя в viewport-пикселях. */
export const SNAPPING_IMAGE_SCALE_POINTER_TOLERANCE_PX = 1.5
