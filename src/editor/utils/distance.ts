/**
 * Rounds a finite distance for display and stops the calculation if the geometry is invalid.
 */
import { english, type Translate } from '../i18n'

export const resolveDisplayDistance = ({
  t = english,
  distance
}: {
  t?: Translate
  distance: number
}): number => {
  if (!Number.isFinite(distance)) {
    throw new Error(t('geometry.errors.nonFiniteDisplayDistance'))
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
  t = english,
  firstDistance,
  secondDistance
}: {
  t?: Translate
  firstDistance: number
  secondDistance: number
}): CommonDisplayDistance => {
  const firstDisplayDistance = resolveDisplayDistance({ t, distance: firstDistance })
  const secondDisplayDistance = resolveDisplayDistance({ t, distance: secondDistance })
  const displayDistanceDiff = Math.abs(firstDisplayDistance - secondDisplayDistance)
  const commonDisplayDistance = Math.max(firstDisplayDistance, secondDisplayDistance)

  return {
    firstDisplayDistance,
    secondDisplayDistance,
    displayDistanceDiff,
    commonDisplayDistance
  }
}
