import type { SelectionControlKey } from '../../models/selection/selection-scaling-session'

/** Грань общего выделения, которая может совпасть с опорной направляющей. */
export type ActiveSelectionScaleEdge = 'bottom' | 'left' | 'right' | 'top'

/** Одна стандартная ручка и ожидаемые подвижные и неподвижные грани. */
export type ActiveSelectionScaleControlCase = Readonly<{
  changesHeight: boolean
  changesWidth: boolean
  control: SelectionControlKey
  fixedEdges: readonly ActiveSelectionScaleEdge[]
  horizontalGuide?: Extract<ActiveSelectionScaleEdge, 'left' | 'right'>
  oppositeControl: SelectionControlKey
  outwardDeltaX: number
  outwardDeltaY: number
  title: string
  verticalGuide?: Extract<ActiveSelectionScaleEdge, 'bottom' | 'top'>
}>

/** Все восемь стандартных ручек общего выделения. */
export const ACTIVE_SELECTION_SCALE_CONTROL_CASES: readonly ActiveSelectionScaleControlCase[] = Object.freeze([
  {
    changesHeight: false,
    changesWidth: true,
    control: 'ml',
    fixedEdges: ['right'],
    horizontalGuide: 'left',
    oppositeControl: 'mr',
    outwardDeltaX: -24,
    outwardDeltaY: 0,
    title: 'левая боковая ручка'
  },
  {
    changesHeight: false,
    changesWidth: true,
    control: 'mr',
    fixedEdges: ['left'],
    horizontalGuide: 'right',
    oppositeControl: 'ml',
    outwardDeltaX: 24,
    outwardDeltaY: 0,
    title: 'правая боковая ручка'
  },
  {
    changesHeight: true,
    changesWidth: false,
    control: 'mt',
    fixedEdges: ['bottom'],
    oppositeControl: 'mb',
    outwardDeltaX: 0,
    outwardDeltaY: -24,
    title: 'верхняя боковая ручка',
    verticalGuide: 'top'
  },
  {
    changesHeight: true,
    changesWidth: false,
    control: 'mb',
    fixedEdges: ['top'],
    oppositeControl: 'mt',
    outwardDeltaX: 0,
    outwardDeltaY: 24,
    title: 'нижняя боковая ручка',
    verticalGuide: 'bottom'
  },
  {
    changesHeight: true,
    changesWidth: true,
    control: 'tl',
    fixedEdges: ['right', 'bottom'],
    horizontalGuide: 'left',
    oppositeControl: 'br',
    outwardDeltaX: -24,
    outwardDeltaY: -24,
    title: 'левая верхняя ручка',
    verticalGuide: 'top'
  },
  {
    changesHeight: true,
    changesWidth: true,
    control: 'tr',
    fixedEdges: ['left', 'bottom'],
    horizontalGuide: 'right',
    oppositeControl: 'bl',
    outwardDeltaX: 24,
    outwardDeltaY: -24,
    title: 'правая верхняя ручка',
    verticalGuide: 'top'
  },
  {
    changesHeight: true,
    changesWidth: true,
    control: 'bl',
    fixedEdges: ['right', 'top'],
    horizontalGuide: 'left',
    oppositeControl: 'tr',
    outwardDeltaX: -24,
    outwardDeltaY: 24,
    title: 'левая нижняя ручка',
    verticalGuide: 'bottom'
  },
  {
    changesHeight: true,
    changesWidth: true,
    control: 'br',
    fixedEdges: ['left', 'top'],
    horizontalGuide: 'right',
    oppositeControl: 'tl',
    outwardDeltaX: 24,
    outwardDeltaY: 24,
    title: 'правая нижняя ручка',
    verticalGuide: 'bottom'
  }
])

/** Видимые ручки смешанного выделения с текстом. */
export const MIXED_SELECTION_SCALE_CONTROL_CASES = Object.freeze(
  ACTIVE_SELECTION_SCALE_CONTROL_CASES.filter(({ control }) => {
    return control !== 'mr' && control !== 'mt' && control !== 'mb'
  })
)

/** Допуск на округление координат реального указателя. */
export const ROTATED_SHAPE_SELECTION_GEOMETRY_TOLERANCE = 1
