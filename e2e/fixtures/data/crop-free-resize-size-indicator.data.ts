import type { CropControlKey } from '../../types'

/** Размер изображения из пользовательского сценария индикатора image crop. */
export const FREE_RESIZE_INDICATOR_SOURCE_IMAGE_SIZE = {
  width: 1000,
  height: 667
} as const

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
