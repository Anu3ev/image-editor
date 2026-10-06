/** Tolerance for subpixel edge drift around a guide after Fabric resizing. */
export const SNAP_GUARD_POSITION_EPSILON = 0.1

/** Edge held by a guide during the current resize. */
export type ScalingStepSnapGuard = {
  type: 'vertical' | 'horizontal'
  edge: 'left' | 'right' | 'top' | 'bottom'
  position: number
}

/** Minimum bounds shape that can be checked against a snap guard. */
export interface SnapGuardBounds {
  left: number
  right: number
  top: number
  bottom: number
}

/** Returns the distance from the held bounds edge to the guide. */
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

/** Checks the held bounds edge against the guide after rounding. */
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

/** Checks whether the held bounds edge is exactly on the guide after rounding. */
export function isBoundsOnSnapGuide({
  bounds,
  snapGuard
}: {
  bounds: SnapGuardBounds
  snapGuard: ScalingStepSnapGuard
}): boolean {
  return getBoundsSnapGuardDistance({ bounds, snapGuard }) <= SNAP_GUARD_POSITION_EPSILON
}
