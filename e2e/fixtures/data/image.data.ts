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

/** Размер монтажной области для проверки JPEG-экспорта. */
export const IMAGE_EXPORT_MONTAGE_SIZE = {
  width: 128,
  height: 128
}

/** Заливка, у которой легко заметить осветление edge-пикселей при лишнем clipPath. */
export const IMAGE_EXPORT_EDGE_FILL = '#4a90e2'

/** Максимальное расхождение edge-пикселя и внутреннего пикселя после JPEG-кодирования. */
export const IMAGE_EXPORT_EDGE_COLOR_TOLERANCE = 8

/** Объект, который целиком находится вне монтажной области и не должен попасть в экспорт. */
export const IMAGE_OUTSIDE_MONTAGE_OBJECT = {
  width: 32,
  height: 32,
  left: -48,
  top: 24
}

/** Нижняя граница белого пикселя после JPEG-кодирования. */
export const IMAGE_EXPORT_WHITE_PIXEL_MIN_CHANNEL = 245
