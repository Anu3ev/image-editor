/**
 * Базовые inline-стили для индикаторов, которые показываются рядом с указателем.
 */
export const CURSOR_INDICATOR_STYLES = {
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
 * Горизонтальный отступ индикатора от указателя в пикселях.
 */
export const CURSOR_INDICATOR_OFFSET_X = 16

/**
 * Вертикальный отступ индикатора от указателя в пикселях.
 */
export const CURSOR_INDICATOR_OFFSET_Y = 16
