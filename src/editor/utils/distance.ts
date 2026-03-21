/**
 * Нормализует расстояние для отображения в пикселях, округляя до ближайшего целого.
 */
export const resolveDisplayDistance = ({
  distance
}: {
  distance: number
}): number => {
  if (!Number.isFinite(distance)) return 0

  return Math.round(Math.max(0, distance))
}

/**
 * Максимально допустимая разница между display-расстояниями,
 * при которой их можно считать эквивалентными для UI.
 */
export const MAX_DISPLAY_DISTANCE_DIFF = 1

export type CommonDisplayDistance = {
  firstDisplayDistance: number
  secondDisplayDistance: number
  displayDistanceDiff: number
  commonDisplayDistance: number
}

/**
 * Сравнивает два расстояния в display-пикселях и возвращает общее значение для интерфейса.
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
