import type { CropControlKey } from '../../types'

/** Image dimensions from the user's image-crop indicator scenario. */
export const FREE_RESIZE_INDICATOR_SOURCE_IMAGE_SIZE = {
  width: 1000,
  height: 667
} as const

/** Artboard dimensions from the user's canvas-crop scenario. */
export const FREE_RESIZE_INDICATOR_MONTAGE_SIZE = 512

/** Crop-area dimensions after snapping the right and top sides to the canvas center. */
export const FREE_RESIZE_INDICATOR_CENTER_GUIDE_SIZE = FREE_RESIZE_INDICATOR_MONTAGE_SIZE / 2

/** Small screen-space drag within the snapping threshold after snapping to a center guide. */
export const FREE_RESIZE_INDICATOR_INSIDE_SNAP_SCREEN_PIXELS = 4

/** Additional drag beyond the source boundary to ensure the control reaches the clamp. */
export const FREE_RESIZE_INDICATOR_BOUNDARY_OVERSHOOT_PIXELS = 120

/** Sequences for stretching the crop area to the full image width. */
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
