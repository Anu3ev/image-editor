import type { GradientBackground } from '../background-manager'

/**
 * Переводит координаты градиента в угол в градусах.
 */
export const coordsToAngle = ({
  x1,
  y1,
  x2,
  y2
}: {
  x1: number
  y1: number
  x2: number
  y2: number
}): number => {
  const angleRad = Math.atan2(y2 - y1, x2 - x1)
  const angleDeg = (angleRad * 180) / Math.PI
  return (angleDeg + 360) % 360
}

/**
 * Преобразует fabric-градиент в структуру, понятную менеджеру фона.
 */
export const convertGradientToOptions = (fill: unknown): GradientBackground | null => {
  if (!fill || typeof fill !== 'object') return null

  const { type, coords, colorStops } = fill as {
    type?: unknown
    coords?: Record<string, unknown>
    colorStops?: Array<{ offset?: unknown; color?: unknown }>
  }

  const stops = Array.isArray(colorStops) ? colorStops : []
  const firstStop = stops[0]
  const lastStop = stops[stops.length - 1]

  const startColor = typeof firstStop?.color === 'string' ? firstStop.color : undefined
  const endColor = typeof lastStop?.color === 'string' ? lastStop.color : startColor
  const startPosition = typeof firstStop?.offset === 'number' ? firstStop.offset * 100 : undefined
  const endPosition = typeof lastStop?.offset === 'number' ? lastStop.offset * 100 : undefined

  if (!startColor || !endColor || !coords) return null

  if (type === 'linear') {
    const { x1, y1, x2, y2 } = coords

    if (
      typeof x1 === 'number'
      && typeof y1 === 'number'
      && typeof x2 === 'number'
      && typeof y2 === 'number'
    ) {
      const angle = coordsToAngle({ x1, y1, x2, y2 })

      return {
        type: 'linear' as const,
        angle,
        startColor,
        endColor,
        startPosition,
        endPosition
      }
    }
  }

  if (type === 'radial') {
    const { x1, y1, r2 } = coords

    if (
      typeof x1 === 'number'
      && typeof y1 === 'number'
      && typeof r2 === 'number'
    ) {
      return {
        type: 'radial' as const,
        centerX: x1 * 100,
        centerY: y1 * 100,
        radius: r2 * 100,
        startColor,
        endColor,
        startPosition,
        endPosition
      }
    }
  }

  return null
}
