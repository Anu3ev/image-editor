/** Допуск subpixel-дрейфа грани вокруг guide после Fabric resize. */
export const SNAP_GUARD_POSITION_EPSILON = 0.1

/** Допуск удержания crop frame у guide, рядом с которым начался live scale. */
export const SOURCE_SCALED_GUIDE_HOLD_EPSILON = 1

/** Грань, которую guide удерживает во время текущего resize. */
export type ScalingStepSnapGuard = {
  type: 'vertical' | 'horizontal'
  edge: 'left' | 'right' | 'top' | 'bottom'
  position: number
}

/** Минимальная форма bounds, которую можно проверять относительно snap guard. */
export interface SnapGuardBounds {
  left: number
  right: number
  top: number
  bottom: number
}

/** Возвращает расстояние удерживаемой грани bounds до guide. */
export function getBoundsSnapGuardDistance({
  bounds,
  snapGuard
}: {
  bounds: SnapGuardBounds
  snapGuard: ScalingStepSnapGuard
}): number {
  const { edge, position } = snapGuard

  if (edge === 'left') return Math.abs(bounds.left - position)
  if (edge === 'right') return Math.abs(bounds.right - position)
  if (edge === 'top') return Math.abs(bounds.top - position)

  return Math.abs(bounds.bottom - position)
}

/** Проверяет удерживаемую грань bounds относительно guide после округления. */
export function isBoundsInsideSnapGuard({
  bounds,
  snapGuard
}: {
  bounds: SnapGuardBounds
  snapGuard: ScalingStepSnapGuard
}): boolean {
  const { edge, position } = snapGuard

  if (edge === 'left') return bounds.left >= position - SNAP_GUARD_POSITION_EPSILON
  if (edge === 'right') return bounds.right <= position + SNAP_GUARD_POSITION_EPSILON
  if (edge === 'top') return bounds.top >= position - SNAP_GUARD_POSITION_EPSILON

  return bounds.bottom <= position + SNAP_GUARD_POSITION_EPSILON
}

/** Проверяет, стоит ли удерживаемая грань bounds ровно на guide после округления. */
export function isBoundsOnSnapGuide({
  bounds,
  snapGuard
}: {
  bounds: SnapGuardBounds
  snapGuard: ScalingStepSnapGuard
}): boolean {
  return getBoundsSnapGuardDistance({ bounds, snapGuard }) <= SNAP_GUARD_POSITION_EPSILON
}
