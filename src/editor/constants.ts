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
 * Коэффициент для расчёта диапазона плавного центрирования viewport.
 * Определяет на каком расстоянии от defaultZoom начинается плавное центрирование.
 * Например, при 0.5: центрирование начинается при zoom = defaultZoom * 1.5
*/
export const VIEWPORT_CENTERING_TRANSITION_FACTOR = 0.5
