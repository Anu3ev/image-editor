/** Размер квадратного изображения для проверки видимых пропорций crop-области. */
export const CROP_SQUARE_IMAGE_SIZE = {
  width: 2000,
  height: 2000
} as const

/** Квадратная пропорция, выбранная пользователем для crop-области. */
export const CROP_SQUARE_ASPECT_RATIO = {
  width: 1,
  height: 1
} as const

/** Доля исходной высоты изображения после скейлинга за нижнюю ручку. */
export const CROP_IMAGE_HEIGHT_SCALE_RATIO = 0.6
