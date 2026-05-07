/* eslint-disable max-len */
export type MultilineArrowSingleShapeScenario =
  | {
    title: string
    axis: 'horizontal'
    edge: 'left' | 'right'
  }
  | {
    title: string
    axis: 'diagonal'
    corner: 'tr' | 'br'
  }

export type MultilineArrowSelectionScenario =
  | {
    title: string
    axis: 'horizontal'
  }
  | {
    title: string
    axis: 'vertical'
  }
  | {
    title: string
    axis: 'diagonal'
    corner: 'tr' | 'br'
  }

export const MULTILINE_ARROW_TEXT = 'TEST\nTEST\nTEST\nTEST'
export const MULTILINE_ARROW_SCALE_CYCLES = 10
export const MULTILINE_ARROW_EXPAND_BASE_SCALE = 1.12
export const MULTILINE_ARROW_EXPAND_SCALE_STEP = 0.02
export const MULTILINE_ARROW_SELECTION_MINIMUM_SIZE = 20
export const MULTILINE_ARROW_SINGLE_SHAPE_ID = 'multiline-arrow-scaling-shape'
export const MULTILINE_ARROW_SINGLE_SHAPE_BOUNDS = {
  leftOffset: 120,
  topOffset: 120,
  width: 280,
  height: 220
}
export const MULTILINE_ARROW_SELECTION_SHAPES = [
  {
    id: 'multiline-arrow-selection-first',
    leftOffset: 100,
    topOffset: 120,
    width: 260,
    height: 220
  },
  {
    id: 'multiline-arrow-selection-second',
    leftOffset: 430,
    topOffset: 240,
    width: 260,
    height: 220
  }
] as const

export const MULTILINE_ARROW_SINGLE_SHAPE_SCENARIOS = [
  {
    title: 'если в одном drag несколько раз сузить multiline arrow-right-fat справа до упора, шейп и текст каждый раз остаются в той же геометрии',
    axis: 'horizontal',
    edge: 'right'
  },
  {
    title: 'если в одном drag несколько раз сузить multiline arrow-right-fat слева до упора, шейп и текст каждый раз остаются в той же геометрии',
    axis: 'horizontal',
    edge: 'left'
  },
  {
    title: 'если в одном drag несколько раз уменьшить multiline arrow-right-fat по диагонали из правого нижнего угла до упора, шейп и текст не прыгают',
    axis: 'diagonal',
    corner: 'br'
  },
  {
    title: 'если в одном drag несколько раз уменьшить multiline arrow-right-fat по диагонали из правого верхнего угла до упора, шейп и текст не прыгают',
    axis: 'diagonal',
    corner: 'tr'
  }
] as const satisfies readonly MultilineArrowSingleShapeScenario[]

export const MULTILINE_ARROW_SELECTION_SCENARIOS = [
  {
    title: 'если в одном drag несколько раз сузить общее выделение справа до упора, обе multiline arrow-right-fat остаются в той же геометрии',
    axis: 'horizontal'
  },
  {
    title: 'если в одном drag несколько раз вернуть общее выделение сверху до упора, обе multiline arrow-right-fat остаются в той же геометрии',
    axis: 'vertical'
  },
  {
    title: 'если в одном drag несколько раз уменьшить общее выделение по диагонали из правого нижнего угла до упора, обе multiline arrow-right-fat не прыгают',
    axis: 'diagonal',
    corner: 'br'
  },
  {
    title: 'если в одном drag несколько раз уменьшить общее выделение по диагонали из правого верхнего угла до упора, обе multiline arrow-right-fat не прыгают',
    axis: 'diagonal',
    corner: 'tr'
  }
] as const satisfies readonly MultilineArrowSelectionScenario[]
