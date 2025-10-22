// Минимальный и максимальный зум
export const MIN_ZOOM = 0.1
export const MAX_ZOOM = 2

// Шаг для зума
export const DEFAULT_ZOOM_RATIO = 0.1

// Шаг для кнопок поворота
export const DEFAULT_ROTATE_RATIO = 90

// Минимальные и максимальные размеры канваса
export const CANVAS_MIN_WIDTH = 16
export const CANVAS_MIN_HEIGHT = 16
export const CANVAS_MAX_WIDTH = 4096
export const CANVAS_MAX_HEIGHT = 4096

export const CLIPBOARD_DATA_PREFIX = 'application/image-editor:'

/**
 * Абсолютное значение диапазона зума для плавного центрирования viewport.
 * Центрирование будет активно в диапазоне [defaultZoom, defaultZoom + CENTERING_RANGE]
 * Например, при defaultZoom=0.118 и CENTERING_RANGE=0.20:
 * - Центрирование работает при zoom от 0.118 до 0.318
*/
export const VIEWPORT_CENTERING_RANGE = 0.2
