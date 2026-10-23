import type { CropControlKey } from '../../types'

/** Source skews at which cropping retains its previous transformation path. */
export const CROP_SOURCE_SKEW_CASES = [
  { title: 'горизонтальный наклон', skewX: 12, skewY: 0 },
  { title: 'вертикальный наклон', skewX: 0, skewY: -8 }
] as const

/** Source skews for strict crop: each axis on its own and both together. */
export const STRICT_CROP_SOURCE_SKEWS = [
  { skewX: 12, skewY: 0 },
  { skewX: 0, skewY: -8 },
  { skewX: 12, skewY: -8 }
] as const

/** Free-ratio sizes on a skewed source where only one axis overflows and the other must keep its size. */
export const STRICT_CROP_SINGLE_AXIS_OVERFLOW_CASES = [
  { sourceSkew: { skewX: 12, skewY: 0 }, size: { width: 1000, height: 300 }, keptAxis: 'height' },
  { sourceSkew: { skewX: 0, skewY: -8 }, size: { width: 400, height: 667 }, keptAxis: 'width' }
] as const

/** Rotated and skewed source, where the source constraint is neither axis-aligned nor rectangular. */
export const ROTATED_CROP_SOURCE_SKEW = { skewX: 12, skewY: 0, angle: 20 } as const

/** Skew so steep that the overflowing axis cannot fit the source on its own. */
export const STEEP_CROP_SOURCE_SKEW = { skewX: 60, skewY: 0 } as const

/** Stretch direction and fixed point for every crop handle. */
export const CROP_GEOMETRY_RESIZE_CASES = [
  { control: 'ml', title: 'слева', x: -1, y: 0, fixedX: 1, fixedY: 0.5 },
  { control: 'mr', title: 'справа', x: 1, y: 0, fixedX: 0, fixedY: 0.5 },
  { control: 'mt', title: 'сверху', x: 0, y: -1, fixedX: 0.5, fixedY: 1 },
  { control: 'mb', title: 'снизу', x: 0, y: 1, fixedX: 0.5, fixedY: 0 },
  { control: 'tl', title: 'за левый верхний угол', x: -1, y: -1, fixedX: 1, fixedY: 1 },
  { control: 'tr', title: 'за правый верхний угол', x: 1, y: -1, fixedX: 0, fixedY: 1 },
  { control: 'bl', title: 'за левый нижний угол', x: -1, y: 1, fixedX: 1, fixedY: 0 },
  { control: 'br', title: 'за правый нижний угол', x: 1, y: 1, fixedX: 0, fixedY: 0 }
] as const

/** Side handles: movement toward the center of a 1000×667 source and the microstep direction. */
export const CROP_SIDE_SCALING_CASES = [
  { control: 'ml', fixedControl: 'mr', title: 'слева', deltaX: 500, deltaY: 0, x: 1, y: 0 },
  { control: 'mr', fixedControl: 'ml', title: 'справа', deltaX: -500, deltaY: 0, x: -1, y: 0 },
  { control: 'mt', fixedControl: 'mb', title: 'сверху', deltaX: 0, deltaY: 333.5, x: 0, y: 1 },
  { control: 'mb', fixedControl: 'mt', title: 'снизу', deltaX: 0, deltaY: -333.5, x: 0, y: -1 }
] as const satisfies ReadonlyArray<{
  control: CropControlKey
  fixedControl: CropControlKey
  title: string
  deltaX: number
  deltaY: number
  x: number
  y: number
}>
