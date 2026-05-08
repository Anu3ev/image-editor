import type { ShapeScaleCorner } from '../../types'

type DiagonalShapeScaleCorner = Extract<ShapeScaleCorner, 'tl' | 'tr' | 'bl' | 'br'>

export type EmptyShapeProportionalScalingCornerCase = {
  corner: DiagonalShapeScaleCorner
  title: string
}

export const EMPTY_SHAPE_PROPORTIONAL_SCALING_CORNERS = [
  {
    corner: 'br',
    title: 'за правый нижний угол'
  },
  {
    corner: 'tr',
    title: 'за правый верхний угол'
  },
  {
    corner: 'tl',
    title: 'за левый верхний угол'
  },
  {
    corner: 'bl',
    title: 'за левый нижний угол'
  }
] satisfies EmptyShapeProportionalScalingCornerCase[]

export const EMPTY_SHAPE_PROPORTIONAL_REVERSE_DRAG = {
  corner: 'br',
  expandedScale: 0.9
} satisfies {
  corner: DiagonalShapeScaleCorner
  expandedScale: number
}
