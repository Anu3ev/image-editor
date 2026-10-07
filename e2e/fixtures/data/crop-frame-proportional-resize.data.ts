import type { CropControlKey } from '../../types'

type MontageCenterGuideAlignment = {
  horizontalEdge: 'left' | 'right'
  verticalEdge: 'top' | 'bottom'
}

/** Source-image dimensions for the proportional-crop regression at the center guides. */
export const PROPORTIONAL_CENTER_GUIDE_IMAGE_SIZE = {
  width: 1000,
  height: 667
} as const

/** Crop-area dimensions before moving to the artboard's center guides. */
export const PROPORTIONAL_CENTER_GUIDE_CROP_SIZE = {
  width: 430,
  height: 287
} as const

/** Small drag in source pixels that should remain within the snapping threshold. */
export const PROPORTIONAL_CENTER_GUIDE_HOLD_DRAG_PIXELS = 4

/** Drag in source pixels that should bring the crop area to the source boundary. */
export const PROPORTIONAL_CENTER_GUIDE_BOUNDARY_DRAG_PIXELS = 180

/** Number of live steps in a slow drag toward the source boundary. */
export const PROPORTIONAL_CENTER_GUIDE_SLOW_BOUNDARY_STEPS = 80

/** Proportional-crop corners that should not change size at the artboard's center guides. */
export const PROPORTIONAL_CENTER_GUIDE_HOLD_CASES = [
  {
    title: 'при малом скейлинге из левого верхнего угла у левой и верхней направляющей оставляет прежний размер',
    control: 'tl',
    alignedEdges: {
      horizontalEdge: 'left',
      verticalEdge: 'top'
    },
    deltaX: -1,
    deltaY: -1
  },
  {
    title: 'при малом скейлинге из правого верхнего угла у правой и верхней направляющей оставляет прежний размер',
    control: 'tr',
    alignedEdges: {
      horizontalEdge: 'right',
      verticalEdge: 'top'
    },
    deltaX: 1,
    deltaY: -1
  },
  {
    title: 'при малом скейлинге из левого нижнего угла у левой и нижней направляющей оставляет прежний размер',
    control: 'bl',
    alignedEdges: {
      horizontalEdge: 'left',
      verticalEdge: 'bottom'
    },
    deltaX: -1,
    deltaY: 1
  },
  {
    title: 'при малом скейлинге из правого нижнего угла у правой и нижней направляющей оставляет прежний размер',
    control: 'br',
    alignedEdges: {
      horizontalEdge: 'right',
      verticalEdge: 'bottom'
    },
    deltaX: 1,
    deltaY: 1
  }
] as const satisfies ReadonlyArray<{
  title: string
  control: CropControlKey
  alignedEdges: MontageCenterGuideAlignment
  deltaX: -1 | 1
  deltaY: -1 | 1
}>
