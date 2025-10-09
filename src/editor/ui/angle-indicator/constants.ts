/**
 * Стили для индикатора угла поворота
 */
export const ANGLE_INDICATOR_STYLES = {
  position: 'absolute',
  display: 'none',
  background: '#2B2D33',
  color: '#fff',
  padding: '4px 8px',
  borderRadius: '4px',
  fontSize: '12px',
  fontWeight: '500',
  fontFamily: 'system-ui, -apple-system, sans-serif',
  zIndex: '1000',
  pointerEvents: 'none',
  whiteSpace: 'nowrap',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
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
