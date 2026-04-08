import type {
  ShapeAddParams,
  ShapePaddingParams,
  ShapeScaleSide
} from '../../types'

export const SHAPE_PADDING_BASE_OPTIONS: NonNullable<ShapeAddParams['options']> = {
  id: 'shape-padding-base',
  width: 220,
  height: 160,
  shapeTextAutoExpand: false,
  text: 'TEST TEST',
  textStyle: {
    fontSize: 48
  }
}

export const SHAPE_PADDING_INITIAL: ShapePaddingParams = {
  top: 2,
  right: 4,
  bottom: 6,
  left: 8
}

export const SHAPE_PADDING_NORMALIZED_INPUT: ShapePaddingParams = {
  top: 10.9,
  right: -3,
  bottom: 4.2,
  left: 7.8
}

export const SHAPE_PADDING_NORMALIZED_RESULT = {
  top: 10,
  right: 0,
  bottom: 4,
  left: 7
}

export const SHAPE_PADDING_UPDATED_RIGHT_INPUT = 19.7

export const SHAPE_PADDING_UPDATED_RIGHT_RESULT = 19

export const SHAPE_PADDING_TOO_LARGE_RIGHT = 500

export const SHAPE_PADDING_HISTORY_UPDATED: ShapePaddingParams = {
  top: 12,
  right: 34,
  bottom: 5,
  left: 7
}

export const SHAPE_PADDING_SCALING_OPTIONS: NonNullable<ShapeAddParams['options']> = {
  id: 'shape-padding-scaling',
  width: 260,
  height: 180,
  shapeTextAutoExpand: false,
  text: 'TEST TEST',
  textStyle: {
    fontSize: 48
  },
  textPadding: {
    top: 0,
    right: 60,
    bottom: 0,
    left: 30
  }
}

export interface ShapePaddingDirectionalScalingScenario {
  title: string
  side: ShapeScaleSide
  axis: 'horizontal' | 'vertical'
  expectWrap: boolean
  steps: number[]
  options: NonNullable<ShapeAddParams['options']>
}

const SHAPE_PADDING_HORIZONTAL_SCALING_STEPS = [
  0.88,
  0.74,
  0.6,
  0.48,
  0.38,
  0.3
]

const SHAPE_PADDING_VERTICAL_SCALING_STEPS = [
  0.88,
  0.74,
  0.6,
  0.48,
  0.36,
  0.28
]

export const SHAPE_PADDING_DIRECTIONAL_SCALING_SCENARIOS: ShapePaddingDirectionalScalingScenario[] = [
  {
    title: 'справа',
    side: 'right',
    axis: 'horizontal',
    expectWrap: true,
    steps: SHAPE_PADDING_HORIZONTAL_SCALING_STEPS,
    options: {
      id: 'shape-padding-live-scaling-right',
      width: 260,
      height: 180,
      shapeTextAutoExpand: false,
      text: 'TEST',
      textStyle: {
        fontSize: 48
      },
      textPadding: {
        top: 0,
        right: 118,
        bottom: 0,
        left: 0
      }
    }
  },
  {
    title: 'снизу',
    side: 'bottom',
    axis: 'vertical',
    expectWrap: false,
    steps: SHAPE_PADDING_VERTICAL_SCALING_STEPS,
    options: {
      id: 'shape-padding-live-scaling-bottom',
      width: 260,
      height: 180,
      shapeTextAutoExpand: false,
      text: 'TEST',
      textStyle: {
        fontSize: 48
      },
      textPadding: {
        top: 0,
        right: 0,
        bottom: 92,
        left: 0
      }
    }
  },
  {
    title: 'слева',
    side: 'left',
    axis: 'horizontal',
    expectWrap: true,
    steps: SHAPE_PADDING_HORIZONTAL_SCALING_STEPS,
    options: {
      id: 'shape-padding-live-scaling-left',
      width: 260,
      height: 180,
      shapeTextAutoExpand: false,
      text: 'TEST',
      textStyle: {
        fontSize: 48
      },
      textPadding: {
        top: 0,
        right: 0,
        bottom: 0,
        left: 118
      }
    }
  },
  {
    title: 'сверху',
    side: 'top',
    axis: 'vertical',
    expectWrap: false,
    steps: SHAPE_PADDING_VERTICAL_SCALING_STEPS,
    options: {
      id: 'shape-padding-live-scaling-top',
      width: 260,
      height: 180,
      shapeTextAutoExpand: false,
      text: 'TEST',
      textStyle: {
        fontSize: 48
      },
      textPadding: {
        top: 92,
        right: 0,
        bottom: 0,
        left: 0
      }
    }
  }
]
