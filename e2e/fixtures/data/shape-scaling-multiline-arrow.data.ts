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

/** Сценарии повторного уменьшения одного шейпа с многострочным текстом. */
export const MULTILINE_ARROW_SINGLE_SHAPE_SCENARIOS = [
  {
    title: 'при повторном сужении шейпа arrow-right-fat справа до упора в рамках одного жеста шейп и текст сохраняют геометрию',
    axis: 'horizontal',
    edge: 'right'
  },
  {
    title: 'при повторном сужении шейпа arrow-right-fat слева до упора в рамках одного жеста шейп и текст сохраняют геометрию',
    axis: 'horizontal',
    edge: 'left'
  },
  {
    title: 'при повторном уменьшении шейпа arrow-right-fat из правого нижнего угла до упора в рамках одного жеста шейп и текст не смещаются',
    axis: 'diagonal',
    corner: 'br'
  },
  {
    title: 'при повторном уменьшении шейпа arrow-right-fat из правого верхнего угла до упора в рамках одного жеста шейп и текст не смещаются',
    axis: 'diagonal',
    corner: 'tr'
  }
] as const satisfies readonly MultilineArrowSingleShapeScenario[]

/** Сценарии повторного уменьшения общего выделения из двух шейпов. */
export const MULTILINE_ARROW_SELECTION_SCENARIOS = [
  {
    title: 'при повторном сужении общего выделения справа до упора в рамках одного жеста оба шейпа arrow-right-fat сохраняют геометрию',
    axis: 'horizontal'
  },
  {
    title: 'при повторном уменьшении общего выделения сверху до упора в рамках одного жеста оба шейпа arrow-right-fat сохраняют геометрию',
    axis: 'vertical'
  },
  {
    title: 'при повторном уменьшении общего выделения из правого нижнего угла до упора в рамках одного жеста оба шейпа arrow-right-fat не смещаются',
    axis: 'diagonal',
    corner: 'br'
  },
  {
    title: 'при повторном уменьшении общего выделения из правого верхнего угла до упора в рамках одного жеста оба шейпа arrow-right-fat не смещаются',
    axis: 'diagonal',
    corner: 'tr'
  }
] as const satisfies readonly MultilineArrowSelectionScenario[]
