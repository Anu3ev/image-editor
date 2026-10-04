import { Rect } from 'fabric'

import { CropFrame } from '../../../../src/editor/crop-manager/domain/crop-frame'
import { resolveCropScaleUpdatePlan } from '../../../../src/editor/crop-manager/snapping/crop-scale-plan'
import {
  createAxisSnapResult,
  createScalingBounds
} from '../../../test-utils/snapping/snapping-scaling'

it('crop удерживает исходный пропорциональный масштаб возле внутренних направляющих', () => {
  const plan = resolveCropScaleUpdatePlan({
    target: new CropFrame({
      showGrid: false,
      source: new Rect({ width: 200, height: 100 }),
      width: 100,
      height: 50
    }),
    bounds: createScalingBounds({
      left: 0,
      top: 0,
      width: 99,
      height: 49.5
    }),
    originX: 'left',
    originY: 'top',
    scaleX: 0.99,
    scaleY: 0.99,
    originalScaleX: 1,
    originalScaleY: 1,
    shouldUseUniformScaleSnap: true,
    verticalSnap: createAxisSnapResult({
      edge: 'right',
      position: 99,
      guidePosition: 100
    }),
    horizontalSnap: createAxisSnapResult({
      edge: 'bottom',
      position: 49.5,
      guidePosition: 50
    })
  })

  expect(plan).not.toBeNull()
  if (!plan) {
    throw new Error('Scale plan для удержания исходного source-scaled размера должен существовать')
  }

  expect(plan.snapGuards).toEqual([
    {
      type: 'vertical',
      edge: 'right',
      position: 100
    },
    {
      type: 'horizontal',
      edge: 'bottom',
      position: 50
    }
  ])
  expect(plan.nextScaleX).toBeCloseTo(1, 5)
  expect(plan.nextScaleY).toBeCloseTo(1, 5)
})

it('crop не возвращается к исходному масштабу, если он уже далеко от направляющей', () => {
  const plan = resolveCropScaleUpdatePlan({
    target: new CropFrame({
      showGrid: false,
      source: new Rect({ width: 200, height: 100 }),
      width: 100,
      height: 50
    }),
    bounds: createScalingBounds({
      left: 0,
      top: 0,
      width: 98,
      height: 49
    }),
    originX: 'left',
    originY: 'top',
    scaleX: 0.98,
    scaleY: 0.98,
    originalScaleX: 1.03,
    originalScaleY: 1.03,
    shouldUseUniformScaleSnap: true,
    verticalSnap: createAxisSnapResult({
      edge: 'right',
      position: 98,
      guidePosition: 100
    }),
    horizontalSnap: createAxisSnapResult({
      edge: 'bottom',
      position: 49,
      guidePosition: 50
    })
  })

  expect(plan).not.toBeNull()
  if (!plan) {
    throw new Error('Scale plan для source-scaled crop frame должен существовать')
  }

  expect(plan.nextScaleX).toBeCloseTo(1, 5)
  expect(plan.nextScaleY).toBeCloseTo(1, 5)
  expect(plan.nextScaleX).not.toBeCloseTo(1.03, 5)
  expect(plan.nextScaleY).not.toBeCloseTo(1.03, 5)
})
