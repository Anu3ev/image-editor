/** Размер изображения из сценария скейлинга crop-области после флипа. */
export const CROP_FLIPPED_IMAGE_SIZE = {
  width: 2048,
  height: 1210
} as const

/** Уменьшение crop-области из правого верхнего угла в пикселях изображения. */
export const CROP_FLIPPED_IMAGE_RESIZE = {
  control: 'tr',
  deltaX: -320,
  deltaY: 190
} as const

/** Варианты флипа изображения для проверки направления скейлинга crop-области. */
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
