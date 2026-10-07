/** Square-image dimensions for testing the crop area's visible aspect ratio. */
export const CROP_SQUARE_IMAGE_SIZE = {
  width: 2000,
  height: 2000
} as const

/** Square aspect ratio selected by the user for the crop area. */
export const CROP_SQUARE_ASPECT_RATIO = {
  width: 1,
  height: 1
} as const

/** Fraction of the original image height after scaling with the bottom handle. */
export const CROP_IMAGE_HEIGHT_SCALE_RATIO = 0.6
