import type {
  ShapeScaleSide,
  ShapeScaleCorner
} from '../../types'

/** Allowed dimension-rounding error in the DOM indicator. */
export const OBJECT_SIZE_INDICATOR_TOLERANCE = 1

/** Indicator test case for scaling a shape with a side handle. */
export interface ShapeSizeIndicatorSideCase {
  title: string
  side: ShapeScaleSide
  scale: number
}

/** Indicator test case for scaling a shape with a corner handle. */
export interface ShapeSizeIndicatorCornerCase {
  title: string
  corner: Extract<ShapeScaleCorner, 'tl' | 'tr' | 'bl' | 'br'>
  scaleX: number
  scaleY: number
}

/** Shape side handles where Fabric changes only one axis and the origin depends on the side. */
export const SHAPE_SIZE_INDICATOR_SIDE_CASES: ShapeSizeIndicatorSideCase[] = [
  {
    title: 'при скейлинге фигуры вправо показывает текущие размеры',
    side: 'right',
    scale: 1.22
  },
  {
    title: 'при скейлинге фигуры влево показывает текущие размеры',
    side: 'left',
    scale: 1.18
  },
  {
    title: 'при скейлинге фигуры вниз показывает текущие размеры',
    side: 'bottom',
    scale: 1.2
  },
  {
    title: 'при скейлинге фигуры вверх показывает текущие размеры',
    side: 'top',
    scale: 1.16
  }
]

/** Shape corner handles where Fabric changes both axes and the origin depends on the corner. */
export const SHAPE_SIZE_INDICATOR_CORNER_CASES: ShapeSizeIndicatorCornerCase[] = [
  {
    title: 'при скейлинге фигуры из правого нижнего угла показывает текущие размеры',
    corner: 'br',
    scaleX: 1.22,
    scaleY: 1.18
  },
  {
    title: 'при скейлинге фигуры из правого верхнего угла показывает текущие размеры',
    corner: 'tr',
    scaleX: 1.18,
    scaleY: 1.2
  },
  {
    title: 'при скейлинге фигуры из левого нижнего угла показывает текущие размеры',
    corner: 'bl',
    scaleX: 1.2,
    scaleY: 1.16
  },
  {
    title: 'при скейлинге фигуры из левого верхнего угла показывает текущие размеры',
    corner: 'tl',
    scaleX: 1.16,
    scaleY: 1.18
  }
]
