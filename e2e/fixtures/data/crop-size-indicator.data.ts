import type { CropControlKey } from '../../types'

/** Default artboard dimensions used in the demo. */
export const DEFAULT_MONTAGE_SIZE = 512

/** Initial crop-area dimensions for the scenario that stretches it to the artboard. */
export const SMALLER_CROP_SIZE = 400

/** Crop-area dimensions the user stretches the area to in the live scenario. */
export const LARGER_CROP_TARGET_SIZE = 513

/** Crop-area dimensions the user shrinks the area to in the live scenario. */
export const SHRUNK_CROP_TARGET_SIZE = 372

/** Artboard dimensions for testing behavior near the snapping threshold. */
export const SNAP_THRESHOLD_MONTAGE_SIZE = 1024

/** Size within the snapping threshold of the artboard edge. */
export const CROP_SIZE_INSIDE_SNAP_THRESHOLD = 1023

/** SnappingManager snapping threshold in screen pixels. */
export const SNAP_THRESHOLD_SCREEN_PIXELS = 5

/** Additional margin beyond the snapping threshold to ensure the drag releases the snap. */
export const SNAP_RELEASE_MARGIN_IN_SOURCE_PIXELS = 2

/** Vertical drag within the snapping threshold for testing manual corner resize. */
export const STRICT_FREE_CROP_INSIDE_SNAP_DRAG_PIXELS = 2

/** Image dimensions for testing image cropping at the source boundaries. */
export const EDGE_IMAGE_CROP_SOURCE_SIZE = {
  width: 1000,
  height: 667
} as const

/** Square crop area constrained by the test image's height. */
export const EDGE_IMAGE_CROP_SQUARE_SIZE = 667

/** Small drag within the snapping threshold for proportional image cropping at the source boundary. */
export const EDGE_IMAGE_CROP_INSIDE_SNAP_DRAG_PIXELS = 1

/** Number of live steps for slow resizing within the snapping threshold. */
export const EDGE_IMAGE_CROP_SLOW_SNAP_STEPS = 80

/** Small screen-space drag within the snapping threshold for proportional image cropping at the source boundary. */
export const EDGE_IMAGE_CROP_INSIDE_SNAP_SCREEN_PIXELS = 1

/** Crop-area dimensions after shrinking a square image crop to the source's center guides. */
export const EDGE_IMAGE_CROP_MIDDLE_GUIDE_SIZE = Math.round(EDGE_IMAGE_CROP_SQUARE_SIZE / 2)

const EDGE_IMAGE_CROP_ASPECT_MIDDLE_GUIDE_HEIGHT = EDGE_IMAGE_CROP_SOURCE_SIZE.height / 2

/** Proportional image-crop dimensions after snapping the top side to the source center. */
export const EDGE_IMAGE_CROP_ASPECT_MIDDLE_GUIDE_SIZE = {
  height: Math.round(EDGE_IMAGE_CROP_ASPECT_MIDDLE_GUIDE_HEIGHT),
  width: Math.round(
    (EDGE_IMAGE_CROP_SOURCE_SIZE.width * EDGE_IMAGE_CROP_ASPECT_MIDDLE_GUIDE_HEIGHT)
    / EDGE_IMAGE_CROP_SOURCE_SIZE.height
  )
} as const

const EDGE_IMAGE_CROP_ASPECT_VERTICAL_MIDDLE_GUIDE_WIDTH = EDGE_IMAGE_CROP_SOURCE_SIZE.width / 2

/** Indicator dimensions after snapping the left side to the source's vertical centerline. */
export const EDGE_IMAGE_CROP_ASPECT_VERTICAL_MIDDLE_GUIDE_INDICATOR_SIZE = {
  width: EDGE_IMAGE_CROP_ASPECT_VERTICAL_MIDDLE_GUIDE_WIDTH,
  height: Math.round(
    (EDGE_IMAGE_CROP_SOURCE_SIZE.height * EDGE_IMAGE_CROP_ASPECT_VERTICAL_MIDDLE_GUIDE_WIDTH)
    / EDGE_IMAGE_CROP_SOURCE_SIZE.width
  )
} as const

/** Artboard dimensions at which a full crop must not lose a pixel. */
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

/** Corner controls for testing a full crop leaving the snapping threshold. */
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

/** Side controls for testing a full crop leaving the snapping threshold along one axis. */
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

/** Corner-resize scenarios without preserving the aspect ratio near the snapping threshold. */
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

/** Corner controls for vertical resize without overflow or aspect-ratio preservation. */
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

/** Corner-resize scenarios for proportional image cropping at the right source boundary. */
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

/** Axis-aligned drag scenarios from proportional image-crop corners at the right source boundary. */
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

/** Corner-resize scenarios for proportional image cropping to the source's center guides. */
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
