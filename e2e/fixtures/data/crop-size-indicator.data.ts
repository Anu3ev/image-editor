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

/** Вертикальный drag внутри snap-порога для проверки ручного resize из угла. */
export const STRICT_FREE_CROP_INSIDE_SNAP_DRAG_PIXELS = 2

/** Размер изображения для проверки image crop у границ source. */
export const EDGE_IMAGE_CROP_SOURCE_SIZE = {
  width: 1000,
  height: 667
} as const

/** Квадратная crop-область, ограниченная высотой тестового изображения. */
export const EDGE_IMAGE_CROP_SQUARE_SIZE = 667

/** Небольшой drag внутри snap-порога для proportional image crop у границы source. */
export const EDGE_IMAGE_CROP_INSIDE_SNAP_DRAG_PIXELS = 1

/** Число live-шагов для медленного resize внутри snap-порога. */
export const EDGE_IMAGE_CROP_SLOW_SNAP_STEPS = 80

/** Небольшой экранный drag внутри snap-порога для proportional image crop у границы source. */
export const EDGE_IMAGE_CROP_INSIDE_SNAP_SCREEN_PIXELS = 1

/** Размер crop-области после уменьшения квадратного image crop до серединных guide source. */
export const EDGE_IMAGE_CROP_MIDDLE_GUIDE_SIZE = Math.round(EDGE_IMAGE_CROP_SQUARE_SIZE / 2)

const EDGE_IMAGE_CROP_ASPECT_MIDDLE_GUIDE_HEIGHT = EDGE_IMAGE_CROP_SOURCE_SIZE.height / 2

/** Размер пропорционального image crop после прилипания верхней стороны к середине source. */
export const EDGE_IMAGE_CROP_ASPECT_MIDDLE_GUIDE_SIZE = {
  height: Math.round(EDGE_IMAGE_CROP_ASPECT_MIDDLE_GUIDE_HEIGHT),
  width: Math.round(
    (EDGE_IMAGE_CROP_SOURCE_SIZE.width * EDGE_IMAGE_CROP_ASPECT_MIDDLE_GUIDE_HEIGHT)
    / EDGE_IMAGE_CROP_SOURCE_SIZE.height
  )
} as const

const EDGE_IMAGE_CROP_ASPECT_VERTICAL_MIDDLE_GUIDE_WIDTH = EDGE_IMAGE_CROP_SOURCE_SIZE.width / 2

/** Размер индикатора после прилипания левой стороны к вертикальной середине source. */
export const EDGE_IMAGE_CROP_ASPECT_VERTICAL_MIDDLE_GUIDE_INDICATOR_SIZE = {
  width: EDGE_IMAGE_CROP_ASPECT_VERTICAL_MIDDLE_GUIDE_WIDTH,
  height: Math.round(
    (EDGE_IMAGE_CROP_SOURCE_SIZE.height * EDGE_IMAGE_CROP_ASPECT_VERTICAL_MIDDLE_GUIDE_WIDTH)
    / EDGE_IMAGE_CROP_SOURCE_SIZE.width
  )
} as const

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

/** Угловые resize-сценарии без сохранения пропорций около snap-порога. */
export const FREE_CROP_CORNER_SNAP_AXIS_CASES = [
  {
    control: 'tr',
    title: 'при уменьшении высоты из правого верхнего угла',
    sizeProperty: 'height',
    directionMultiplier: -1
  },
  {
    control: 'tr',
    title: 'при увеличении высоты из правого верхнего угла',
    sizeProperty: 'height',
    directionMultiplier: 1
  },
  {
    control: 'tr',
    title: 'при уменьшении ширины из правого верхнего угла',
    sizeProperty: 'width',
    directionMultiplier: -1
  },
  {
    control: 'tr',
    title: 'при увеличении ширины из правого верхнего угла',
    sizeProperty: 'width',
    directionMultiplier: 1
  }
] as const satisfies ReadonlyArray<{
  control: CropControlKey
  title: string
  sizeProperty: 'width' | 'height'
  directionMultiplier: -1 | 1
}>

/** Угловые controls для вертикального resize без overflow и без сохранения пропорций. */
export const STRICT_FREE_CROP_VERTICAL_SNAP_CORNER_CASES = [
  {
    control: 'tl',
    title: 'левого верхнего угла',
    shrinkDeltaY: 1
  },
  {
    control: 'tr',
    title: 'правого верхнего угла',
    shrinkDeltaY: 1
  },
  {
    control: 'bl',
    title: 'левого нижнего угла',
    shrinkDeltaY: -1
  },
  {
    control: 'br',
    title: 'правого нижнего угла',
    shrinkDeltaY: -1
  }
] as const satisfies ReadonlyArray<{
  control: CropControlKey
  title: string
  shrinkDeltaY: -1 | 1
}>

/** Угловые resize-сценарии proportional image crop у правой границы source. */
export const EDGE_IMAGE_CROP_BOUNDARY_DRAG_CASES = [
  {
    control: 'tl',
    title: 'левого верхнего угла',
    directionTitle: 'внутрь source',
    deltaX: 1,
    deltaY: 1
  },
  {
    control: 'tl',
    title: 'левого верхнего угла',
    directionTitle: 'наружу source',
    deltaX: -1,
    deltaY: -1
  },
  {
    control: 'tr',
    title: 'правого верхнего угла',
    directionTitle: 'внутрь source',
    deltaX: -1,
    deltaY: 1
  },
  {
    control: 'tr',
    title: 'правого верхнего угла',
    directionTitle: 'наружу source',
    deltaX: 1,
    deltaY: -1
  },
  {
    control: 'bl',
    title: 'левого нижнего угла',
    directionTitle: 'внутрь source',
    deltaX: 1,
    deltaY: -1
  },
  {
    control: 'bl',
    title: 'левого нижнего угла',
    directionTitle: 'наружу source',
    deltaX: -1,
    deltaY: 1
  },
  {
    control: 'br',
    title: 'правого нижнего угла',
    directionTitle: 'внутрь source',
    deltaX: -1,
    deltaY: -1
  },
  {
    control: 'br',
    title: 'правого нижнего угла',
    directionTitle: 'наружу source',
    deltaX: 1,
    deltaY: 1
  }
] as const satisfies ReadonlyArray<{
  control: CropControlKey
  title: string
  directionTitle: string
  deltaX: -1 | 1
  deltaY: -1 | 1
}>

/** Осевые drag-сценарии из углов proportional image crop у правой границы source. */
export const EDGE_IMAGE_CROP_AXIS_BOUNDARY_DRAG_CASES = [
  {
    control: 'tl',
    title: 'левого верхнего угла',
    directionTitle: 'по ширине наружу source',
    deltaX: -1,
    deltaY: 0
  },
  {
    control: 'tl',
    title: 'левого верхнего угла',
    directionTitle: 'по высоте наружу source',
    deltaX: 0,
    deltaY: -1
  },
  {
    control: 'tr',
    title: 'правого верхнего угла',
    directionTitle: 'по ширине наружу source',
    deltaX: 1,
    deltaY: 0
  },
  {
    control: 'tr',
    title: 'правого верхнего угла',
    directionTitle: 'по высоте наружу source',
    deltaX: 0,
    deltaY: -1
  },
  {
    control: 'bl',
    title: 'левого нижнего угла',
    directionTitle: 'по ширине наружу source',
    deltaX: -1,
    deltaY: 0
  },
  {
    control: 'bl',
    title: 'левого нижнего угла',
    directionTitle: 'по высоте наружу source',
    deltaX: 0,
    deltaY: 1
  },
  {
    control: 'br',
    title: 'правого нижнего угла',
    directionTitle: 'по ширине наружу source',
    deltaX: 1,
    deltaY: 0
  },
  {
    control: 'br',
    title: 'правого нижнего угла',
    directionTitle: 'по высоте наружу source',
    deltaX: 0,
    deltaY: 1
  }
] as const satisfies ReadonlyArray<{
  control: CropControlKey
  title: string
  directionTitle: string
  deltaX: -1 | 0 | 1
  deltaY: -1 | 0 | 1
}>

/** Угловые resize-сценарии proportional image crop до серединных guide source. */
export const EDGE_IMAGE_CROP_MIDDLE_GUIDE_DRAG_CASES = [
  {
    control: 'tl',
    title: 'левого верхнего угла',
    deltaX: 1,
    deltaY: 1
  },
  {
    control: 'tr',
    title: 'правого верхнего угла',
    deltaX: -1,
    deltaY: 1
  },
  {
    control: 'bl',
    title: 'левого нижнего угла',
    deltaX: 1,
    deltaY: -1
  },
  {
    control: 'br',
    title: 'правого нижнего угла',
    deltaX: -1,
    deltaY: -1
  }
] as const satisfies ReadonlyArray<{
  control: CropControlKey
  title: string
  deltaX: -1 | 1
  deltaY: -1 | 1
}>
