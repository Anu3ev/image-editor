import type { SelectionControlKey } from '../../models/selection/selection-scaling-session'

/** Грань общего выделения, которая может совпасть с опорной направляющей. */
export type ActiveSelectionScaleEdge = 'bottom' | 'left' | 'right' | 'top'

/** Одна стандартная ручка и ожидаемые подвижные и неподвижные грани. */
export type ActiveSelectionScaleControlCase = Readonly<{
  control: SelectionControlKey
  fixedEdges: readonly ActiveSelectionScaleEdge[]
  horizontalGuide?: Extract<ActiveSelectionScaleEdge, 'left' | 'right'>
  title: string
  verticalGuide?: Extract<ActiveSelectionScaleEdge, 'bottom' | 'top'>
}>

/** Все восемь стандартных ручек общего выделения. */
export const ACTIVE_SELECTION_SCALE_CONTROL_CASES: readonly ActiveSelectionScaleControlCase[] = Object.freeze([
  {
    control: 'ml',
    fixedEdges: ['right'],
    horizontalGuide: 'left',
    title: 'левая боковая ручка'
  },
  {
    control: 'mr',
    fixedEdges: ['left'],
    horizontalGuide: 'right',
    title: 'правая боковая ручка'
  },
  {
    control: 'mt',
    fixedEdges: ['bottom'],
    title: 'верхняя боковая ручка',
    verticalGuide: 'top'
  },
  {
    control: 'mb',
    fixedEdges: ['top'],
    title: 'нижняя боковая ручка',
    verticalGuide: 'bottom'
  },
  {
    control: 'tl',
    fixedEdges: ['right', 'bottom'],
    horizontalGuide: 'left',
    title: 'левая верхняя ручка',
    verticalGuide: 'top'
  },
  {
    control: 'tr',
    fixedEdges: ['left', 'bottom'],
    horizontalGuide: 'right',
    title: 'правая верхняя ручка',
    verticalGuide: 'top'
  },
  {
    control: 'bl',
    fixedEdges: ['right', 'top'],
    horizontalGuide: 'left',
    title: 'левая нижняя ручка',
    verticalGuide: 'bottom'
  },
  {
    control: 'br',
    fixedEdges: ['left', 'top'],
    horizontalGuide: 'right',
    title: 'правая нижняя ручка',
    verticalGuide: 'bottom'
  }
])
