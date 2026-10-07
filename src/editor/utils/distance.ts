/**
 * Rounds a finite distance for display and stops the calculation if the geometry is invalid.
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
 * Maximum difference between two labels for the distances to be considered equal.
 */
export const MAX_DISPLAY_DISTANCE_DIFF = 0

/** Rounded values of two distances and the result of comparing them for the UI. */
export type CommonDisplayDistance = {
  firstDisplayDistance: number
  secondDisplayDistance: number
  displayDistanceDiff: number
  commonDisplayDistance: number
}

/**
 * Compares two rounded distance labels and returns their common value for the UI.
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
