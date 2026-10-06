/** Image dimensions from the crop-area scaling scenario after flipping. */
export const CROP_FLIPPED_IMAGE_SIZE = {
  width: 2048,
  height: 1210
} as const

/** Crop-area shrinkage from the top-right corner in image pixels. */
export const CROP_FLIPPED_IMAGE_RESIZE = {
  control: 'tr',
  deltaX: -320,
  deltaY: 190
} as const

/** Image-flip variants for testing the crop-area scaling direction. */
export const CROP_FLIPPED_IMAGE_CASES = [
  {
    axis: 'x',
    title: 'после горизонтального флипа уменьшает crop-область из правого верхнего угла'
  },
  {
    axis: 'y',
    title: 'после вертикального флипа уменьшает crop-область из правого верхнего угла'
  }
] as const
