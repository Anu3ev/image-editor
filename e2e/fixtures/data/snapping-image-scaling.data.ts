import type { ImageScaleControl } from '../../types'

/** Image dimensions for real-pointer width-change scenarios. */
export const SNAPPING_IMAGE_SCALE_SIZE = {
  width: 80,
  height: 50
}

/** Fraction of the initial size the handle travels toward the reference guide. */
export const SNAPPING_IMAGE_SCALE_CONTROL_GROWTH = 0.2

/** Reference-geometry side to which the handle should snap. */
export type ImageScaleGuideSide = 'left' | 'right' | 'top' | 'bottom'

/** One user scaling scenario using a standard image handle. */
export type ImageScaleControlCase = Readonly<{
  control: ImageScaleControl
  fixedControl: ImageScaleControl
  title: string
  xGuide?: Extract<ImageScaleGuideSide, 'left' | 'right'>
  yGuide?: Extract<ImageScaleGuideSide, 'top' | 'bottom'>
}>

/** All standard Image handles and their corresponding fixed points. */
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

/** ID of a narrow shape with competing vertical guides. */
export const SNAPPING_IMAGE_SCALE_REFERENCE_ID = 'image-scale-reference'

/** Distance to the reference shape in screen pixels. */
export const SNAPPING_IMAGE_SCALE_REFERENCE_GAP_PX = 40

/** Reference-shape width in screen pixels. */
export const SNAPPING_IMAGE_SCALE_REFERENCE_WIDTH_PX = 8

/** Pointer offsets for successive steps within the snap-hold zone. */
export const SNAPPING_IMAGE_SCALE_HOLD_OFFSETS_PX = [1, 2, 3] as const

/** Distance beyond the reference shape where no suitable guide remains. */
export const SNAPPING_IMAGE_SCALE_RELEASE_OFFSET_PX = 12

/** Tolerance of Fabric control geometry relative to the pointer in viewport pixels. */
export const SNAPPING_IMAGE_SCALE_POINTER_TOLERANCE_PX = 1.5
