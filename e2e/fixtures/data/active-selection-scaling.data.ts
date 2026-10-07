import type { SelectionControlKey } from '../../types'

/** Active-selection edge that can align with a reference guide. */
export type ActiveSelectionScaleEdge = 'bottom' | 'left' | 'right' | 'top'

/** One standard handle and the expected moving and fixed edges. */
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

/** All eight standard active-selection handles. */
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

/** Six handles available to an active selection whose geometry is determined by standalone text objects. */
export const ACTIVE_SELECTION_TEXT_SCALE_CONTROL_CASES = Object.freeze(
  ACTIVE_SELECTION_SCALE_CONTROL_CASES.filter(({ control }) => {
    return control !== 'mt' && control !== 'mb'
  })
)

/** Two text objects with different geometry for testing collective scaling. */
export const ACTIVE_SELECTION_TEXT_SCALE_SEEDS = Object.freeze([
  Object.freeze({
    leftOffset: 95,
    topOffset: 105,
    options: Object.freeze({
      id: 'active-selection-text-first',
      text: 'Первый текст с переносом строк',
      width: 150,
      fontSize: 30,
      autoExpand: false,
      paddingLeft: 8,
      paddingRight: 12,
      radiusTopLeft: 6,
      radiusBottomRight: 10
    })
  }),
  Object.freeze({
    leftOffset: 275,
    topOffset: 205,
    options: Object.freeze({
      id: 'active-selection-text-second',
      text: 'Второй текст',
      width: 125,
      fontSize: 36,
      autoExpand: false,
      paddingTop: 5,
      paddingBottom: 9,
      radiusTopRight: 7,
      radiusBottomLeft: 11
    })
  })
])

/** Visible handles of a mixed selection containing text. */
export const MIXED_SELECTION_SCALE_CONTROL_CASES = Object.freeze(
  ACTIVE_SELECTION_SCALE_CONTROL_CASES.filter(({ control }) => {
    return control !== 'mr' && control !== 'mt' && control !== 'mb'
  })
)

/** Tolerance for rounding real pointer coordinates. */
export const ROTATED_SHAPE_SELECTION_GEOMETRY_TOLERANCE = 1
