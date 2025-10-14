/**
 * Стили для индикатора угла поворота (используем kebab-case для setProperty)
 */
export const ANGLE_INDICATOR_STYLES = {
  position: 'absolute',
  display: 'none',
  background: '#2B2D33',
  color: '#fff',
  padding: '4px 8px',
  'border-radius': '4px',
  'font-size': '12px',
  'font-weight': '500',
  'font-family': 'system-ui, -apple-system, sans-serif',
  'z-index': '1000',
  'pointer-events': 'none',
  'white-space': 'nowrap',
  'box-shadow': '0 2px 8px rgba(0, 0, 0, 0.2)'
} as const

/**
 * Смещение индикатора относительно курсора
 */
export const OFFSET_X = 16
export const OFFSET_Y = 16

/**
 * CSS класс для индикатора
 */
export const ANGLE_INDICATOR_CLASS = 'fabric-editor-angle-indicator'
