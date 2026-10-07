/**
 * Maximum shape-rounding value in the public shape API.
 */
export const MAX_SHAPE_ROUNDING = 100

/**
 * Normalizes shape rounding to the stable 0..100 range.
 */
export function normalizeShapeRounding({
  rounding
}: {
  rounding?: number
}): number {
  if (typeof rounding !== 'number' || !Number.isFinite(rounding)) {
    return 0
  }

  return Math.min(MAX_SHAPE_ROUNDING, Math.max(0, rounding))
}

/**
 * Converts shape rounding from the 0..100 range to a 0..1 ratio.
 */
export function resolveShapeRoundingRatio({
  rounding
}: {
  rounding?: number
}): number {
  return normalizeShapeRounding({ rounding }) / MAX_SHAPE_ROUNDING
}
