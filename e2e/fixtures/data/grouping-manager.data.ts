import type { ShapeAddAtBoundsParams } from '../../types'

type GroupingResizeShapeSeed = {
  id: string
  leftOffset: number
  topOffset: number
  width: number
  height: number
  text: string
}

type GroupingHorizontalEditingScenario = {
  title: string
  side: 'left' | 'right'
  scaleX: number
  targetShapeId: string
}

type GroupingVerticalMoveScenario = {
  title: string
  side: 'top' | 'bottom'
  scaleY: number
  targetShapeId: string
  moveLeftOffset: number
  moveTopOffset: number
}

export const GROUPING_LEFT_SHAPE_ID = 'group-resize-left-shape'
export const GROUPING_RIGHT_SHAPE_ID = 'group-resize-right-shape'
export const GROUPING_EDITED_TEXT = 'TEXT'
export const GROUPING_SIZE_TOLERANCE = 1.5
export const GROUPING_RESIZE_DELTA = 10

export const GROUPING_SHAPE_SEEDS: GroupingResizeShapeSeed[] = [
  {
    id: GROUPING_LEFT_SHAPE_ID,
    leftOffset: 80,
    topOffset: 120,
    width: 120,
    height: 120,
    text: 'TEST'
  },
  {
    id: GROUPING_RIGHT_SHAPE_ID,
    leftOffset: 260,
    topOffset: 120,
    width: 120,
    height: 120,
    text: 'TEST'
  }
]

export const GROUPING_HORIZONTAL_UNGROUP_EDITING_SCENARIOS: GroupingHorizontalEditingScenario[] = [
  {
    title: 'после сужения группы справа и ungroup шейп не теряет ширину при редактировании',
    side: 'right',
    scaleX: 0.72,
    targetShapeId: GROUPING_RIGHT_SHAPE_ID
  },
  {
    title: 'после сужения группы слева и ungroup шейп не теряет ширину при редактировании',
    side: 'left',
    scaleX: 0.72,
    targetShapeId: GROUPING_LEFT_SHAPE_ID
  }
]

export const GROUPING_VERTICAL_UNGROUP_MOVE_SCENARIOS: GroupingVerticalMoveScenario[] = [
  {
    title: 'после сужения группы сверху и ungroup шейп не теряет высоту при перетаскивании',
    side: 'top',
    scaleY: 0.74,
    targetShapeId: GROUPING_LEFT_SHAPE_ID,
    moveLeftOffset: 24,
    moveTopOffset: 42
  },
  {
    title: 'после сужения группы снизу и ungroup шейп не теряет высоту при перетаскивании',
    side: 'bottom',
    scaleY: 0.74,
    targetShapeId: GROUPING_RIGHT_SHAPE_ID,
    moveLeftOffset: -24,
    moveTopOffset: -42
  }
]

export const resolveGroupingShapeOptions = ({
  montageLeft,
  montageTop,
  shape
}: {
  montageLeft: number
  montageTop: number
  shape: GroupingResizeShapeSeed
}): ShapeAddAtBoundsParams['options'] => {
  return {
    id: shape.id,
    left: montageLeft + shape.leftOffset,
    top: montageTop + shape.topOffset,
    width: shape.width,
    height: shape.height,
    text: shape.text
  }
}
