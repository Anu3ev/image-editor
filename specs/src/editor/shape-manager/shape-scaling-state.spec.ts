import { Canvas } from 'fabric'
import ShapeScalingController from '../../../../src/editor/shape-manager/scaling/shape-scaling-controller'
import type { ShapeGroup } from '../../../../src/editor/shape-manager/types'
import { createShapeScaleInteractionHarness } from '../../../test-utils/shape/scale-interaction'

it('при очистке scale state снимает флаг заблокированного преобразования', () => {
  const canvas: Canvas = Object.create(Canvas.prototype)
  const controller = new ShapeScalingController({ canvas })
  const { target } = createShapeScaleInteractionHarness()
  const group = target as ShapeGroup
  group.shapeScalingNoopTransform = true

  controller.clearState({ group })

  expect(group.shapeScalingNoopTransform).toBe(false)
  expect(() => controller.clearState({ group })).not.toThrow()
})
