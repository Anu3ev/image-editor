/** Узкий viewport браузера для сценариев ресайза окна. */
export const BROWSER_RESIZE_NARROW_VIEWPORT = {
  width: 960,
  height: 640
} as const

/** Широкий viewport браузера для сценариев ресайза окна. */
export const BROWSER_RESIZE_WIDE_VIEWPORT = {
  width: 1520,
  height: 920
} as const

/** Допуск для проверки привязки объектов к монтажной области после ресайза окна. */
export const BROWSER_RESIZE_TOLERANCE = 1

/** Допуск для сценариев cover-фона после ресайза окна. */
export const BROWSER_RESIZE_COVER_TOLERANCE = 1.5

/** Допуск для проверки центрирования монтажной области после ресайза окна. */
export const BROWSER_RESIZE_CENTER_TOLERANCE = 2
