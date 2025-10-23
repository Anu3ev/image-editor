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
 * Скорость адаптивного центрирования при появлении пустого пространства (в процентах).
 * Значение от 0 до 100.
 *
 * Физический смысл: какой процент пути до центра проходится за один шаг зума.
 *
 * Диапазон: 0 - 100
 * - 0 = нет центрирования
 * - 1-2 = очень медленное центрирование, едва заметное
 * - 3-5 = мягкое центрирование (рекомендуется для комфортной работы)
 * - 10 = среднее центрирование
 * - 20+ = быстрое центрирование, может быть заметен рывок
 *
 * Примеры:
 * - ADAPTIVE_CENTERING_SPEED = 3: за каждый шаг зума viewport смещается на 3% ближе к центру
 * - ADAPTIVE_CENTERING_SPEED = 10: за 10 шагов зума viewport пройдёт ~65% пути к центру
 * - ADAPTIVE_CENTERING_SPEED = 50: за 2 шага зума viewport почти полностью центрируется
 */
export const ADAPTIVE_CENTERING_SPEED = 5

/**
 * Множитель ускорения центрирования при увеличении пустого пространства.
 * Значение от 1.0 до 10.0.
 *
 * Физический смысл: во сколько раз увеличивается скорость центрирования,
 * когда пустое пространство занимает 100% вьюпорта.
 *
 * Диапазон: 1.0 - 10.0
 * - 1.0 = нет ускорения, скорость всегда постоянная
 * - 1.5 = небольшое ускорение (50% прирост скорости)
 * - 2.0 = умеренное ускорение (рекомендуется, в 2 раза быстрее)
 * - 5.0 = сильное ускорение (в 5 раз быстрее)
 * - 10.0 = очень сильное ускорение, "магнитная" подтяжка к центру
 *
 * Примеры при ADAPTIVE_CENTERING_SPEED = 3:
 * - ADAPTIVE_CENTERING_ACCELERATION = 1.0: скорость всегда 3%, не зависит от пустого пространства
 * - ADAPTIVE_CENTERING_ACCELERATION = 2.0: скорость от 3% (нет пустоты) до 6% (полный viewport пустоты)
 * - ADAPTIVE_CENTERING_ACCELERATION = 5.0: скорость от 3% (нет пустоты) до 15% (полный viewport пустоты)
 *
 * Формула: finalSpeed = ADAPTIVE_CENTERING_SPEED × (1 + (ADAPTIVE_CENTERING_ACCELERATION - 1) × emptySpaceRatio²)
 */
export const ADAPTIVE_CENTERING_ACCELERATION = 2.0
