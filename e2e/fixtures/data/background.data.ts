/** Цветовой фон для проверки синхронизации с монтажной областью. */
export const BACKGROUND_COLOR = '#dfe9f8'

/** Параметры линейного градиента для проверки синхронизации с монтажной областью. */
export const BACKGROUND_LINEAR_GRADIENT = {
  angle: 38,
  startColor: '#0f4c81',
  endColor: '#ffd166'
} as const

/** Увеличенное разрешение монтажной области для фоновых сценариев. */
export const BACKGROUND_UPDATED_RESOLUTION = {
  width: 720,
  height: 420
} as const

/** Портретное разрешение монтажной области для проверки cover-фона. */
export const BACKGROUND_IMAGE_UPDATED_RESOLUTION = {
  width: 360,
  height: 640
} as const

const BACKGROUND_IMAGE_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="600" viewBox="0 0 1200 600">
  <rect width="1200" height="600" fill="#103c7a"/>
  <circle cx="280" cy="280" r="180" fill="#f4d35e"/>
  <rect x="620" y="140" width="420" height="320" rx="48" fill="#7bdff2"/>
</svg>
`

/** SVG data URL для сценариев фонового изображения. */
export const BACKGROUND_IMAGE_SOURCE = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(BACKGROUND_IMAGE_SVG)}`
