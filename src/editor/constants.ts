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

/**
 * Префикс для данных в буфере обмена
 */
export const CLIPBOARD_DATA_PREFIX = 'application/image-editor:'
/**
 * Ключи объекта, которые нужно сохранить при клонировании объекта для отправки в буфер обмена
 */
export const CLIPBOARD_CLONE_OBJECT_KEYS = ['format', 'uppercase', 'textCaseRaw']

/**
 * Задержка перед сохранением в истории изменений текста в текстовом объекте
 */
export const TEXT_EDITING_DEBOUNCE_MS = 50
