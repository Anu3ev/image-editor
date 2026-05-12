import type {
  ShapePresetKey,
  ShapeScaleCorner,
  ShapeScaleStepParams
} from '../../types'
import { SHAPE_PRESETS } from '../../../src/editor/shape-manager/domain/shape-presets'

type DiagonalShapeScaleCorner = Extract<ShapeScaleCorner, 'tl' | 'tr' | 'bl' | 'br'>

export type ShapeProportionalScalingCornerCase = {
  corner: DiagonalShapeScaleCorner
  title: string
}

export type ShapeProportionalWordWrapScenario = {
  title: string
  text: string
  expectWrap: boolean
  expectedMinimumLines: string[]
  exactMinimumCorners?: DiagonalShapeScaleCorner[]
}

export const SHAPE_SCALING_STROKE_WIDTH = 12

export const SHAPE_PROPORTIONAL_SCALING_CYCLES = 4

export const SHAPE_PROPORTIONAL_EXPAND_BASE_SCALE = 1.12

export const SHAPE_PROPORTIONAL_EXPAND_SCALE_STEP = 0.02

export const SHAPE_PROPORTIONAL_TEXT_FONT_SIZE = 48

export const SHAPE_PROPORTIONAL_MINIMUM_TARGET_SIZE = 1

export const SHAPE_PROPORTIONAL_SCALING_CORNERS = [
  {
    corner: 'br',
    title: 'из правого нижнего угла'
  },
  {
    corner: 'tr',
    title: 'из правого верхнего угла'
  },
  {
    corner: 'tl',
    title: 'из левого верхнего угла'
  },
  {
    corner: 'bl',
    title: 'из левого нижнего угла'
  }
] satisfies ShapeProportionalScalingCornerCase[]

export const SHAPE_PROPORTIONAL_SINGLE_WORD_WRAP_SCENARIO: ShapeProportionalWordWrapScenario = {
  title: 'одного слова',
  text: 'TEST',
  expectWrap: false,
  expectedMinimumLines: ['TEST']
}

export const SHAPE_PROPORTIONAL_TWO_WORD_WRAP_SCENARIO: ShapeProportionalWordWrapScenario = {
  title: 'двух слов',
  text: 'TEST TEST',
  expectWrap: true,
  expectedMinimumLines: ['TEST', 'TEST']
}

export const SHAPE_PROPORTIONAL_THREE_WORD_WRAP_SCENARIO: ShapeProportionalWordWrapScenario = {
  title: 'трёх слов',
  text: 'TEST TEST TEST',
  expectWrap: true,
  expectedMinimumLines: ['TEST TEST', 'TEST']
}

export const SHAPE_PROPORTIONAL_WORD_WRAP_SCENARIOS: ShapeProportionalWordWrapScenario[] = [
  SHAPE_PROPORTIONAL_SINGLE_WORD_WRAP_SCENARIO,
  SHAPE_PROPORTIONAL_TWO_WORD_WRAP_SCENARIO,
  SHAPE_PROPORTIONAL_THREE_WORD_WRAP_SCENARIO
]

export const SHAPE_PROPORTIONAL_MULTI_WORD_WRAP_SCENARIOS: ShapeProportionalWordWrapScenario[] = [
  SHAPE_PROPORTIONAL_TWO_WORD_WRAP_SCENARIO,
  SHAPE_PROPORTIONAL_THREE_WORD_WRAP_SCENARIO
]

export const SHAPE_PROPORTIONAL_WORD_WRAP_PRESET_KEYS = Object.keys(SHAPE_PRESETS) as ShapePresetKey[]

export const SHAPE_SCALING_LIVE_REVERSE_STEPS: Array<Pick<ShapeScaleStepParams, 'scaleX' | 'scaleY'>> = [
  {
    scaleX: 1.55,
    scaleY: 1.55
  },
  {
    scaleX: 0.82,
    scaleY: 0.82
  },
  {
    scaleX: 1.37,
    scaleY: 1.37
  },
  {
    scaleX: 0.74,
    scaleY: 0.74
  },
  {
    scaleX: 1.28,
    scaleY: 1.28
  }
]

export const SHAPE_SCALING_TOLERANCE = {
  anchor: 1.2,
  bbox: 8,
  direction: 0.6,
  mouseupJump: 1.2
}
