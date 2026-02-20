/**
 * Нормализует расстояние для отображения в пикселях, скрывая субпиксельные артефакты.
 */
export const resolveDisplayDistance = ({
  distance
}: {
  distance: number
}): number => {
  if (!Number.isFinite(distance)) return 0

  const normalizedDistance = Math.max(0, distance)
  const epsilon = 0.000001

  return Math.floor(normalizedDistance + epsilon)
}
