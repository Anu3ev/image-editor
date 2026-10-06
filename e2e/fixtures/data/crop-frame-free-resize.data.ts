import type { CropControlKey } from '../../types'

/** Image dimensions from the user's free-resize scenario at the source boundary. */
export const FREE_RESIZE_SOURCE_BOUNDARY_IMAGE_SIZE = {
  width: 1000,
  height: 667
} as const

/** Crop-frame dimensions from the user's free-resize scenario at the source boundary. */
export const FREE_RESIZE_SOURCE_BOUNDARY_CROP_SIZE = {
  width: 511,
  height: 302
} as const

/** Additional drag beyond the source boundary after first reaching it. */
export const FREE_RESIZE_SOURCE_BOUNDARY_EXTRA_DRAG_PIXELS = 80

/** Tolerance for comparing source pixels after real pointer events. */
export const FREE_RESIZE_SOURCE_PIXEL_TOLERANCE = 2

/** Side controls for testing free resize at each source boundary. */
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
