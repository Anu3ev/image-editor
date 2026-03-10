import type { ShapeScaleStepParams } from '../../types'

export const SHAPE_SCALING_STROKE_WIDTH = 12

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
