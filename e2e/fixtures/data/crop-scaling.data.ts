import type { CropControlKey } from '../../types'

/** Source rotations at which cropping retains its previous transformation path. */
export const CROP_SOURCE_SKEW_CASES = [
  { title: 'горизонтальный наклон', skewX: 12, skewY: 0 },
  { title: 'вертикальный наклон', skewX: 0, skewY: -8 }
] as const

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
