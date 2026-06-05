import type { CropControlKey } from '../../types'

type MontageCenterGuideAlignment = {
  horizontalEdge: 'left' | 'right'
  verticalEdge: 'top' | 'bottom'
}

/** Размер исходного изображения для proportional crop regression у центральных guide. */
export const PROPORTIONAL_CENTER_GUIDE_IMAGE_SIZE = {
  width: 1000,
  height: 667
} as const

/** Размер crop-области перед переносом к центральным guide монтажной области. */
export const PROPORTIONAL_CENTER_GUIDE_CROP_SIZE = {
  width: 430,
  height: 287
} as const

/** Небольшой drag в source-пикселях, который должен остаться внутри snap-порога. */
export const PROPORTIONAL_CENTER_GUIDE_HOLD_DRAG_PIXELS = 4

/** Drag в source-пикселях, который должен довести crop-область до source-границы. */
export const PROPORTIONAL_CENTER_GUIDE_BOUNDARY_DRAG_PIXELS = 180

/** Число live-шагов медленного drag к source-границе. */
export const PROPORTIONAL_CENTER_GUIDE_SLOW_BOUNDARY_STEPS = 80

/** Углы proportional crop, которые не должны менять размер у центральных guide монтажной области. */
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
