import { Rect } from 'fabric'

import TextActiveSelectionScalingController from '../../../../../src/editor/text-manager/scaling/active-selection-scaling-controller'
import {
  createImageTextActiveSelectionScaleHarness,
  createTextActiveSelectionScaleHarness
} from '../../../../test-utils/selection/active-selection-scale-interaction'

afterEach(jest.restoreAllMocks)

it('принимает общее выделение из двух канонических отдельных текстов', () => {
  const harness = createTextActiveSelectionScaleHarness()
  const controller = new TextActiveSelectionScalingController({
    canvas: harness.editor.canvas,
    canvasManager: harness.editor.canvasManager
  })

  expect(controller.supportsScaling({ selection: harness.target })).toBe(true)
  expect(harness.target.getObjects()).toEqual(harness.children)
  expect(harness.children.every((text) => text.group === harness.target)).toBe(true)
})

it('начинает и очищает измерительную сессию для поддерживаемой ручки', () => {
  const harness = createTextActiveSelectionScaleHarness()
  const controller = new TextActiveSelectionScalingController({
    canvas: harness.editor.canvas,
    canvasManager: harness.editor.canvasManager
  })

  expect(controller.beginScaling({
    projection: harness.projection,
    selection: harness.target,
    transform: harness.transform
  })).toBe(true)
  expect(() => controller.beginScaling({
    projection: harness.projection,
    selection: harness.target,
    transform: harness.transform
  })).toThrow('Сессия скейлинга выделения с текстом уже начата')
  expect(controller.clearScaling({ selection: harness.target })).toBe(true)
  expect(controller.clearScaling({ selection: harness.target })).toBe(false)
})

it('применяет измеренное состояние к текстам и временной рамке', () => {
  const harness = createTextActiveSelectionScaleHarness()
  const controller = new TextActiveSelectionScalingController({
    canvas: harness.editor.canvas,
    canvasManager: harness.editor.canvasManager
  })
  expect(controller.beginScaling({
    projection: harness.projection,
    selection: harness.target,
    transform: harness.transform
  })).toBe(true)

  const measurement = controller.measureScale({
    mode: 'horizontal',
    multipliers: { x: 1.2, y: 1 },
    selection: harness.target
  })
  const applied = controller.applyScalePreview({ measurement, selection: harness.target })

  expect(applied).toEqual(measurement.multipliers)
  expect(harness.target.scaleX).toBeCloseTo(measurement.frame.scaleX, 9)
  expect(harness.target.scaleY).toBeCloseTo(measurement.frame.scaleY, 9)
  expect(harness.children[0].scaleX).toBeCloseTo(1 / measurement.frame.scaleX, 9)
  expect(harness.children[1].scaleX).toBeCloseTo(1 / measurement.frame.scaleX, 9)
  expect(harness.editor.canvas.requestRenderAll).toHaveBeenCalledTimes(1)
})

it('фиксирует применённую геометрию в текстах и восстанавливает рамку со scale 1', () => {
  const harness = createTextActiveSelectionScaleHarness()
  const controller = new TextActiveSelectionScalingController({
    canvas: harness.editor.canvas,
    canvasManager: harness.editor.canvasManager
  })
  expect(controller.beginScaling({
    projection: harness.projection,
    selection: harness.target,
    transform: harness.transform
  })).toBe(true)
  const measurement = controller.measureScale({
    mode: 'horizontal',
    multipliers: { x: 1.2, y: 1 },
    selection: harness.target
  })
  controller.applyScalePreview({ measurement, selection: harness.target })

  expect(controller.commitScaling({
    selection: harness.target,
    transform: harness.transform
  })).toBe(true)

  const restoredSelection = harness.editor.canvas.getActiveObject()

  expect(restoredSelection).not.toBe(harness.target)
  expect(restoredSelection).toBeInstanceOf(harness.target.constructor)
  expect(restoredSelection?.scaleX).toBe(1)
  expect(restoredSelection?.scaleY).toBe(1)
  expect(harness.children.every((text) => text.scaleX === 1 && text.scaleY === 1)).toBe(true)
  expect(controller.clearScaling({ selection: harness.target })).toBe(false)
})

it('оставляет отдельно повёрнутый текст на прежнем пути', () => {
  const harness = createTextActiveSelectionScaleHarness()
  const controller = new TextActiveSelectionScalingController({
    canvas: harness.editor.canvas,
    canvasManager: harness.editor.canvasManager
  })
  harness.children[0].set({ angle: 12 })

  expect(controller.supportsScaling({ selection: harness.target })).toBe(false)
  expect(harness.children[0].angle).toBe(12)
  expect(harness.children[1].angle ?? 0).toBe(0)
})

it('принимает выделение из канонических изображения и текста', () => {
  const harness = createImageTextActiveSelectionScaleHarness()
  const controller = new TextActiveSelectionScalingController({
    canvas: harness.editor.canvas,
    canvasManager: harness.editor.canvasManager
  })

  expect(controller.supportsScaling({ selection: harness.target })).toBe(true)
  expect(harness.target.getObjects()).toEqual([harness.image, harness.text])
  expect(harness.image.parent).toBeUndefined()
})

it('оставляет состав с повёрнутым изображением на прежнем пути', () => {
  const harness = createImageTextActiveSelectionScaleHarness({ imageAngle: 12 })
  const controller = new TextActiveSelectionScalingController({
    canvas: harness.editor.canvas,
    canvasManager: harness.editor.canvasManager
  })

  expect(controller.supportsScaling({ selection: harness.target })).toBe(false)
  expect(harness.image.angle).toBe(12)
  expect(harness.image.group).toBe(harness.target)
})

it('оставляет состав с отражённым изображением на прежнем пути', () => {
  const harness = createImageTextActiveSelectionScaleHarness({ imageFlipX: true })
  const controller = new TextActiveSelectionScalingController({
    canvas: harness.editor.canvas,
    canvasManager: harness.editor.canvasManager
  })

  expect(controller.supportsScaling({ selection: harness.target })).toBe(false)
  expect(harness.image.flipX).toBe(true)
  expect(harness.image.group).toBe(harness.target)
})

it('оставляет выделение с шейпом и текстом на прежней логике скейлинга', () => {
  const harness = createTextActiveSelectionScaleHarness()
  const controller = new TextActiveSelectionScalingController({
    canvas: harness.editor.canvas,
    canvasManager: harness.editor.canvasManager
  })
  const shape = new Rect({ width: 40, height: 30 })
  jest.spyOn(harness.target, 'getObjects').mockReturnValue([harness.children[0], shape])

  expect(controller.supportsScaling({ selection: harness.target })).toBe(false)
  expect(harness.target.getObjects()).toHaveLength(2)
  expect(harness.target.getObjects()[1]).toBe(shape)
})

it('оставляет выделение из одного текста на прежнем пути', () => {
  const harness = createTextActiveSelectionScaleHarness()
  const controller = new TextActiveSelectionScalingController({
    canvas: harness.editor.canvas,
    canvasManager: harness.editor.canvasManager
  })
  jest.spyOn(harness.target, 'getObjects').mockReturnValue([harness.children[0]])

  expect(controller.supportsScaling({ selection: harness.target })).toBe(false)
  expect(harness.target.getObjects()).toEqual([harness.children[0]])
})
