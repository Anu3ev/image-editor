import type { CropControlKey } from '../../types'

/** Размер монтажной области, который используется в демо по умолчанию. */
export const DEFAULT_MONTAGE_SIZE = 512

/** Стартовый размер crop-области для сценария растягивания до монтажной области. */
export const SMALLER_CROP_SIZE = 400

/** Размер crop-области, до которого пользователь растягивает область в live-сценарии. */
export const LARGER_CROP_TARGET_SIZE = 513

/** Размер crop-области, до которого пользователь уменьшает область в live-сценарии. */
export const SHRUNK_CROP_TARGET_SIZE = 372

/** Размер монтажной области для проверки поведения около snap-порога. */
export const SNAP_THRESHOLD_MONTAGE_SIZE = 1024

/** Размер, который находится внутри snap-порога от края монтажной области. */
export const CROP_SIZE_INSIDE_SNAP_THRESHOLD = 1023

/** Snap-порог SnappingManager в экранных пикселях. */
export const SNAP_THRESHOLD_SCREEN_PIXELS = 5

/** Дополнительный отступ за snap-порогом, чтобы drag гарантированно вышел из прилипания. */
export const SNAP_RELEASE_MARGIN_IN_SOURCE_PIXELS = 2

/** Размеры монтажной области, на которых полный crop не должен терять пиксель. */
export const FULL_CROP_MONTAGE_SIZES = [
  {
    width: 1027,
    height: 1027
  },
  {
    width: 767,
    height: 768
  },
  {
    width: 1024,
    height: 1025
  },
  {
    width: 2048,
    height: 2049
  }
] as const

/** Угловые controls для проверки выхода полного crop из snap-порога. */
export const FULL_CROP_SNAP_THRESHOLD_CORNER_CASES = [
  {
    control: 'tl',
    title: 'левого верхнего угла'
  },
  {
    control: 'tr',
    title: 'правого верхнего угла'
  },
  {
    control: 'bl',
    title: 'левого нижнего угла'
  },
  {
    control: 'br',
    title: 'правого нижнего угла'
  }
] as const satisfies ReadonlyArray<{
  control: CropControlKey
  title: string
}>

/** Боковые controls для проверки выхода полного crop из snap-порога по одной оси. */
export const FULL_CROP_SNAP_THRESHOLD_SIDE_CASES = [
  {
    control: 'ml',
    title: 'левой стороны',
    axis: 'horizontal'
  },
  {
    control: 'mr',
    title: 'правой стороны',
    axis: 'horizontal'
  },
  {
    control: 'mt',
    title: 'верхней стороны',
    axis: 'vertical'
  },
  {
    control: 'mb',
    title: 'нижней стороны',
    axis: 'vertical'
  }
] as const satisfies ReadonlyArray<{
  control: CropControlKey
  title: string
  axis: 'horizontal' | 'vertical'
}>