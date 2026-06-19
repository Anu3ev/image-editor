import type { CropControlKey } from '../../types'

/** Размер изображения из пользовательского сценария индикатора image crop. */
export const FREE_RESIZE_INDICATOR_SOURCE_IMAGE_SIZE = {
  width: 1000,
  height: 667
} as const

/** Размер монтажной области из пользовательского сценария canvas crop. */
export const FREE_RESIZE_INDICATOR_MONTAGE_SIZE = 512

/** Размер crop-области после прилипания правой и верхней сторон к середине canvas. */
export const FREE_RESIZE_INDICATOR_CENTER_GUIDE_SIZE = FREE_RESIZE_INDICATOR_MONTAGE_SIZE / 2

/** Небольшой экранный drag внутри snap-порога после прилипания к серединному guide. */
export const FREE_RESIZE_INDICATOR_INSIDE_SNAP_SCREEN_PIXELS = 4

/** Дополнительный drag за source-границу, чтобы control гарантированно уткнулся в clamp. */
export const FREE_RESIZE_INDICATOR_BOUNDARY_OVERSHOOT_PIXELS = 120

/** Порядки растягивания crop-области до полной ширины изображения. */
export const FREE_RESIZE_INDICATOR_FULL_WIDTH_CASES = [
  {
    title: 'слева, затем справа',
    firstControl: 'ml',
    firstBoundary: 'left',
    secondControl: 'mr'
  },
  {
    title: 'справа, затем слева',
    firstControl: 'mr',
    firstBoundary: 'right',
    secondControl: 'ml'
  }
] as const satisfies ReadonlyArray<{
  title: string
  firstControl: CropControlKey
  firstBoundary: 'left' | 'right'
  secondControl: CropControlKey
}>
