/** Базовые размеры тестового изображения для e2e-сценариев. */
export const IMAGE_BASE_SIZE = {
  width: 333,
  height: 222
}

/** Дробный коэффициент скейлинга изображения, на котором раньше всплывала проблема с позиционированием. */
export const IMAGE_SCALING_FACTOR = 0.337

/** Допуск для e2e-проверок позиции и геометрии изображения. */
export const IMAGE_TOLERANCE = {
  position: 1.5,
  geometry: 2
}
