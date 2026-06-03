import type { CropControlKey } from '../../types'

/** Размер изображения из пользовательского сценария свободного resize у source-границы. */
export const FREE_RESIZE_SOURCE_BOUNDARY_IMAGE_SIZE = {
  width: 1000,
  height: 667
} as const

/** Размер crop frame из пользовательского сценария свободного resize у source-границы. */
export const FREE_RESIZE_SOURCE_BOUNDARY_CROP_SIZE = {
  width: 511,
  height: 302
} as const

/** Дополнительный drag за source-границу после первого упора. */
export const FREE_RESIZE_SOURCE_BOUNDARY_EXTRA_DRAG_PIXELS = 80

/** Допуск сравнения source-пикселей после реальных pointer events. */
export const FREE_RESIZE_SOURCE_PIXEL_TOLERANCE = 2

/** Side-controls для проверки свободного resize у source-границы по каждой стороне. */
export const FREE_RESIZE_SOURCE_BOUNDARY_SIDE_CASES = [
  {
    control: 'mt',
    sideTitle: 'верхней стороны',
    blockedGrowthTitle: 'вниз'
  },
  {
    control: 'mb',
    sideTitle: 'нижней стороны',
    blockedGrowthTitle: 'вверх'
  },
  {
    control: 'ml',
    sideTitle: 'левой стороны',
    blockedGrowthTitle: 'вправо'
  },
  {
    control: 'mr',
    sideTitle: 'правой стороны',
    blockedGrowthTitle: 'влево'
  }
] as const satisfies ReadonlyArray<{
  control: CropControlKey
  sideTitle: string
  blockedGrowthTitle: string
}>
