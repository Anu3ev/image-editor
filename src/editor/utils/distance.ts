/**
 * Округляет конечное расстояние для отображения и завершает расчёт при невалидной геометрии.
 */
export const resolveDisplayDistance = ({
  distance
}: {
  distance: number
}): number => {
  if (!Number.isFinite(distance)) {
    throw new Error('Display distance must be finite')
  }

  return Math.round(Math.max(0, distance))
}

/**
 * Максимальная разница между двумя подписями, при которой расстояния считаются равными.
 */
export const MAX_DISPLAY_DISTANCE_DIFF = 0

/** Округлённые значения двух расстояний и результат их сравнения для интерфейса. */
export type CommonDisplayDistance = {
  firstDisplayDistance: number
  secondDisplayDistance: number
  displayDistanceDiff: number
  commonDisplayDistance: number
}

/**
 * Сравнивает две округлённые подписи расстояния и возвращает общее значение для интерфейса.
 */
export const resolveCommonDisplayDistance = ({
  firstDistance,
  secondDistance
}: {
  firstDistance: number
  secondDistance: number
}): CommonDisplayDistance => {
  const firstDisplayDistance = resolveDisplayDistance({ distance: firstDistance })
  const secondDisplayDistance = resolveDisplayDistance({ distance: secondDistance })
  const displayDistanceDiff = Math.abs(firstDisplayDistance - secondDisplayDistance)
  const commonDisplayDistance = Math.max(firstDisplayDistance, secondDisplayDistance)

  return {
    firstDisplayDistance,
    secondDisplayDistance,
    displayDistanceDiff,
    commonDisplayDistance
  }
}
