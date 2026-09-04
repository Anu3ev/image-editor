import { Rect } from 'fabric'

import {
  createActiveSelectionScaleMouseMoveEvent,
  createActiveSelectionScaleStartEvent,
  createImageTextActiveSelectionScaleHarness,
  createTextActiveSelectionScaleHarness,
  getRequiredActiveSelectionBounds
} from '../../../../test-utils/selection/active-selection-scale-interaction'

afterEach(jest.restoreAllMocks)

it('начинает общую сессию для выделения из отдельных текстов', () => {
  const harness = createTextActiveSelectionScaleHarness({ controlKey: 'mr' })
  const event = createActiveSelectionScaleStartEvent({ harness })

  expect(harness.controller.startGesture({ event })).toBe(true)
  expect(harness.supportsShapeSelectionMock).toHaveBeenCalledWith({ selection: harness.target })
  expect(harness.supportsTextSelectionMock).toHaveBeenCalledWith({ selection: harness.target })
  expect(harness.beginTextSelectionScalingMock).toHaveBeenCalledWith({
    projection: expect.any(Object),
    selection: harness.target,
    transform: harness.transform
  })
  expect(harness.captureEnvironmentMock).toHaveBeenCalledWith({
    activeObject: harness.target,
    targetEdges: ['right']
  })
})

it('начинает общую сессию для выделения из изображения и текста', () => {
  const harness = createImageTextActiveSelectionScaleHarness()

  expect(harness.controller.startGesture({
    event: createActiveSelectionScaleStartEvent({ harness })
  })).toBe(true)
  expect(harness.beginTextSelectionScalingMock).toHaveBeenCalledWith({
    projection: expect.any(Object),
    selection: harness.target,
    transform: harness.transform
  })
  expect(harness.controller.finishGestureForTarget({ target: harness.image })).toBe(true)
  expect(harness.clearTextSelectionScalingMock).toHaveBeenCalledWith({ selection: harness.target })
})

it('принимает рассчитанные положение и масштаб изображения в составе с текстом', () => {
  const harness = createImageTextActiveSelectionScaleHarness()
  const applyTextPreview = harness.applyTextSelectionPreviewMock.getMockImplementation()
  if (!applyTextPreview) throw new Error('Тестовый TextManager должен применять измеренную геометрию')
  const initialWidth = harness.image.width
  const initialHeight = harness.image.height

  harness.applyTextSelectionPreviewMock.mockImplementation((options) => {
    const result = applyTextPreview(options)
    harness.image.set({ left: 18, top: 24, scaleX: 1.15, scaleY: 1 })

    return result
  })

  expect(harness.controller.startGesture({
    event: createActiveSelectionScaleStartEvent({ harness })
  })).toBe(true)
  expect(harness.controller.handleCanvasMouseMove({
    event: createActiveSelectionScaleMouseMoveEvent({
      harness,
      marker: new MouseEvent('pointermove'),
      multipliers: { x: 1.15, y: 1 }
    })
  })).toBe(true)
  expect(harness.image.width).toBe(initialWidth)
  expect(harness.image.height).toBe(initialHeight)
  expect(harness.publishGuidesMock).toHaveBeenLastCalledWith({ guides: [] })
})

it('измеряет и применяет текстовый шаг через TextManager', () => {
  const harness = createTextActiveSelectionScaleHarness({ controlKey: 'mr' })
  const marker = new MouseEvent('pointermove')

  expect(harness.controller.startGesture({
    event: createActiveSelectionScaleStartEvent({ harness })
  })).toBe(true)
  expect(harness.controller.handleCanvasMouseMove({
    event: createActiveSelectionScaleMouseMoveEvent({
      harness,
      marker,
      multipliers: { x: 1.15, y: 1 }
    })
  })).toBe(true)

  const measurement = harness.measureTextSelectionScaleMock.mock.results[0]?.value
  if (!measurement) throw new Error('TextManager должен вернуть измерение текущего шага')

  const bounds = getRequiredActiveSelectionBounds({ target: harness.target })

  expect(harness.measureTextSelectionScaleMock).toHaveBeenCalledWith({
    mode: 'horizontal',
    multipliers: expect.objectContaining({ x: expect.closeTo(1.15, 9), y: 1 }),
    selection: harness.target
  })
  expect(harness.resolveTextSelectionScaleStepMock).toHaveBeenCalledWith(expect.objectContaining({
    mode: 'horizontal',
    pointerMeasurement: measurement,
    selection: harness.target
  }))
  expect(harness.applyTextSelectionPreviewMock).toHaveBeenCalledWith({
    measurement,
    selection: harness.target
  })
  expect(bounds.left).toBeCloseTo(harness.baselineBounds.left, 9)
  expect(bounds.right).toBeCloseTo(measurement.bounds.right, 9)
  expect(harness.markHandledMock).toHaveBeenCalledWith({ marker })
  expect(harness.publishGuidesMock).toHaveBeenCalledWith({ guides: [] })
})

it('защищает фиксацию текстов до завершения общей сессии', () => {
  const harness = createTextActiveSelectionScaleHarness()

  expect(harness.controller.startGesture({
    event: createActiveSelectionScaleStartEvent({ harness })
  })).toBe(true)
  expect(harness.controller.beginTextSelectionCommit({ selection: harness.target })).toBe(true)
  expect(harness.controller.finishTextSelectionCommit({ selection: harness.target })).toBe(true)
  expect(harness.publishGuidesMock).toHaveBeenLastCalledWith({ guides: [] })
  expect(harness.controller.finishGesture()).toBe(false)
})

it('оставляет неподдерживаемое выделение из текстов на прежнем пути', () => {
  const harness = createTextActiveSelectionScaleHarness({ supported: false })

  expect(harness.controller.startGesture({
    event: createActiveSelectionScaleStartEvent({ harness })
  })).toBe(false)
  expect(harness.supportsTextSelectionMock).toHaveBeenCalledWith({ selection: harness.target })
  expect(harness.beginTextSelectionScalingMock).not.toHaveBeenCalled()
  expect(harness.captureEnvironmentMock).not.toHaveBeenCalled()
  expect(harness.publishGuidesMock).not.toHaveBeenCalled()
})

it.each(['mt', 'mb'] as const)(
  'оставляет скрытую ручку %s выделения из текстов на прежнем пути',
  (controlKey) => {
    const harness = createTextActiveSelectionScaleHarness({ controlKey })

    expect(harness.controller.startGesture({
      event: createActiveSelectionScaleStartEvent({ harness })
    })).toBe(false)
    expect(harness.supportsTextSelectionMock).toHaveBeenCalledWith({ selection: harness.target })
    expect(harness.beginTextSelectionScalingMock).not.toHaveBeenCalled()
    expect(harness.captureEnvironmentMock).not.toHaveBeenCalled()
  }
)

it('оставляет выделение с шейпом и текстом на прежней логике скейлинга', () => {
  const harness = createTextActiveSelectionScaleHarness()
  const shape = new Rect({ width: 40, height: 30 })
  jest.spyOn(harness.target, 'getObjects').mockReturnValue([harness.children[0], shape])
  harness.supportsTextSelectionMock.mockReturnValue(false)

  expect(harness.controller.startGesture({
    event: createActiveSelectionScaleStartEvent({ harness })
  })).toBe(false)
  expect(harness.supportsShapeSelectionMock).toHaveBeenCalledWith({ selection: harness.target })
  expect(harness.supportsTextSelectionMock).toHaveBeenCalledWith({ selection: harness.target })
  expect(harness.beginTextSelectionScalingMock).not.toHaveBeenCalled()
  expect(harness.captureEnvironmentMock).not.toHaveBeenCalled()
})

it('при отмене указателя очищает измерения TextManager и завершает преобразование', () => {
  const harness = createTextActiveSelectionScaleHarness()
  const event = new Event('pointercancel') as PointerEvent

  expect(harness.controller.startGesture({
    event: createActiveSelectionScaleStartEvent({ harness })
  })).toBe(true)
  expect(harness.controller.interruptGesture({ event })).toBe(true)
  expect(harness.clearTextSelectionScalingMock).toHaveBeenCalledWith({ selection: harness.target })
  expect(harness.endCurrentTransformMock).toHaveBeenCalledWith(event)
  expect(harness.publishGuidesMock).toHaveBeenLastCalledWith({ guides: [] })
  expect(harness.controller.finishGesture()).toBe(false)
})

it('при нажатии Shift после изменения размера фиксирует последний текстовый шаг', () => {
  const harness = createTextActiveSelectionScaleHarness({ controlKey: 'mr' })
  const scaleMarker = new MouseEvent('pointermove')
  const skewMarker = new MouseEvent('pointermove', { shiftKey: true })
  const hasAppliedScaleMock = jest
    .spyOn(harness.editor.textManager, 'hasAppliedActiveSelectionScale')
    .mockReturnValue(true)
  const restoreScaleMock = jest
    .spyOn(harness.editor.textManager, 'restoreActiveSelectionScalePreview')
    .mockReturnValue(true)
  harness.endCurrentTransformMock.mockImplementation(() => {
    expect(harness.controller.beginTextSelectionCommit({ selection: harness.target })).toBe(true)
    expect(harness.controller.finishTextSelectionCommit({ selection: harness.target })).toBe(true)
  })

  expect(harness.controller.startGesture({
    event: createActiveSelectionScaleStartEvent({ harness })
  })).toBe(true)
  expect(harness.controller.handleCanvasMouseMove({
    event: createActiveSelectionScaleMouseMoveEvent({
      harness,
      marker: scaleMarker,
      multipliers: { x: 1.15, y: 1 }
    })
  })).toBe(true)
  expect(harness.controller.handleCanvasMouseMove({
    event: createActiveSelectionScaleMouseMoveEvent({
      harness,
      marker: skewMarker,
      multipliers: { x: 1.2, y: 1 }
    })
  })).toBe(true)

  expect(hasAppliedScaleMock).toHaveBeenCalledWith({ selection: harness.target })
  expect(restoreScaleMock).toHaveBeenCalledWith({ selection: harness.target })
  expect(harness.endCurrentTransformMock).toHaveBeenCalledWith(skewMarker)
  expect(harness.publishGuidesMock).toHaveBeenLastCalledWith({ guides: [] })
})

it('при удалении дочернего текста очищает его активную сессию', () => {
  const harness = createTextActiveSelectionScaleHarness()

  expect(harness.controller.startGesture({
    event: createActiveSelectionScaleStartEvent({ harness })
  })).toBe(true)
  expect(harness.controller.finishGestureForTarget({ target: harness.children[0] })).toBe(true)
  expect(harness.clearTextSelectionScalingMock).toHaveBeenCalledWith({ selection: harness.target })
  expect(harness.publishGuidesMock).toHaveBeenLastCalledWith({ guides: [] })
  expect(harness.controller.finishGesture()).toBe(false)
})
