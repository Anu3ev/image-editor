/**
 * Максимальное значение скругления фигуры в публичном shape API.
 */
export const MAX_SHAPE_ROUNDING = 100

/**
 * Нормализует степень скругления фигуры в стабильный диапазон 0..100.
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
 * Переводит степень скругления фигуры из диапазона 0..100 в ratio 0..1.
 */
export function resolveShapeRoundingRatio({
  rounding
}: {
  rounding?: number
}): number {
  return normalizeShapeRounding({ rounding }) / MAX_SHAPE_ROUNDING
}
