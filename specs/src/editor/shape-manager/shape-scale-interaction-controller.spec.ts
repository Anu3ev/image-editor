import { Group } from 'fabric'

import {
  createShapeScaleBeginEvent,
  createShapeScaleBottomGuide,
  createShapeScaleInteractionHarness,
  createShapeScaleMarker,
  createShapeScaleRightGuide,
  createShapeScaleStepEvent,
  getRequiredShapeScaleBounds,
  moveShapeScalePointer,
  setShapeScaleEnvironment
} from '../../../test-utils/shape/scale-interaction'

it('фиксирует окружение в beginGesture и не читает изменённый кандидат во время scale', () => {
  const harness = createShapeScaleInteractionHarness()
  const originalPosition = harness.baselineBounds.right
  const candidate = {
    ...createShapeScaleRightGuide({ harness }),
    position: originalPosition
  } satisfies ReturnType<typeof createShapeScaleRightGuide>
  setShapeScaleEnvironment({
    harness,
    environment: Object.freeze({ candidates: [candidate], zoom: 2 })
  })

  const didBegin = harness.controller.beginGesture(createShapeScaleBeginEvent({ harness }))
  candidate.position += 100
  const marker = createShapeScaleMarker()
  const didHandle = harness.controller.handleObjectScaling(createShapeScaleStepEvent({
    harness,
    marker,
    multipliers: { x: 0.98, y: 0.98 }
  }))

  expect(didBegin).toBe(true)
  expect(didHandle).toBe(true)
  expect(harness.captureEnvironmentMock).toHaveBeenCalledTimes(1)
  expect(harness.captureEnvironmentMock).toHaveBeenCalledWith({
    activeObject: harness.target,
    targetEdges: ['right', 'bottom']
  })
  expect(harness.publishGuidesMock).toHaveBeenCalledWith({
    guides: [{
      axis: 'x',
      edge: 'right',
      position: originalPosition,
      candidateId: 'right-guide',
      category: 'edge',
      snapshotIndex: 0
    }]
  })
})

it('помечает marker и ровно один раз применяет scale перед публикацией подтверждённых guide', () => {
  const harness = createShapeScaleInteractionHarness()
  setShapeScaleEnvironment({
    harness,
    environment: Object.freeze({
      candidates: Object.freeze([
        createShapeScaleRightGuide({ harness }),
        createShapeScaleBottomGuide({ harness })
      ]),
      zoom: 1
    })
  })
  const marker = createShapeScaleMarker()
  const event = createShapeScaleStepEvent({
    harness,
    marker,
    multipliers: { x: 0.98, y: 0.98 }
  })

  expect(harness.controller.beginGesture(createShapeScaleBeginEvent({ harness }))).toBe(true)
  expect(harness.controller.handleObjectScaling(event)).toBe(true)
  expect(harness.claimStepMock).toHaveBeenCalledTimes(1)
  expect(harness.claimStepMock).toHaveBeenCalledWith({ marker })
  expect(harness.materializeMock).toHaveBeenCalledTimes(1)
  expect(harness.materializeMock).toHaveBeenCalledWith({
    target: harness.target,
    transform: harness.transform,
    e: marker
  })
  expect(harness.publishGuidesMock).toHaveBeenCalledTimes(1)
  expect(harness.publishGuidesMock).toHaveBeenCalledWith({
    guides: [
      {
        axis: 'x',
        edge: 'right',
        position: harness.baselineBounds.right,
        candidateId: 'right-guide',
        category: 'edge',
        snapshotIndex: 0
      },
      {
        axis: 'y',
        edge: 'bottom',
        position: harness.baselineBounds.bottom,
        candidateId: 'bottom-guide',
        category: 'edge',
        snapshotIndex: 1
      }
    ]
  })
  expect(harness.claimStepMock.mock.invocationCallOrder[0]).toBeLessThan(
    harness.materializeMock.mock.invocationCallOrder[0]
  )
  expect(harness.materializeMock.mock.invocationCallOrder[0]).toBeLessThan(
    harness.publishGuidesMock.mock.invocationCallOrder[0]
  )
  expect(harness.transform.actionPerformed).toBe(false)
})

it('дедуплицирует один marker между object:scaling и mouse:move', () => {
  const harness = createShapeScaleInteractionHarness()
  const marker = createShapeScaleMarker()
  const scaleEvent = createShapeScaleStepEvent({
    harness,
    marker,
    multipliers: { x: 1.1, y: 1.1 }
  })

  expect(harness.controller.beginGesture(createShapeScaleBeginEvent({ harness }))).toBe(true)
  expect(harness.controller.handleObjectScaling(scaleEvent)).toBe(true)
  expect(harness.controller.handleCanvasMouseMove({
    target: harness.target,
    transform: harness.transform,
    e: marker
  })).toBe(true)
  expect(harness.claimStepMock).toHaveBeenCalledTimes(1)
  expect(harness.materializeMock).toHaveBeenCalledTimes(1)
  expect(harness.publishGuidesMock).toHaveBeenCalledTimes(1)
  expect(harness.transform.actionPerformed).toBe(true)
})

it('с Ctrl не показывает guide и стабилизирует свободную визуальную ширину', () => {
  const harness = createShapeScaleInteractionHarness({ controlKey: 'mr' })
  const rawMultiplier = 1.234
  const rawPointer = moveShapeScalePointer({
    harness,
    multipliers: { x: rawMultiplier, y: 1 }
  })
  setShapeScaleEnvironment({
    harness,
    environment: Object.freeze({
      candidates: [createShapeScaleRightGuide({ harness, position: rawPointer.x })],
      zoom: 1
    })
  })
  const marker = createShapeScaleMarker({ ctrlKey: true })
  const initialWidth = harness.baselineBounds.right - harness.baselineBounds.left

  expect(harness.controller.beginGesture(createShapeScaleBeginEvent({ harness }))).toBe(true)
  expect(harness.controller.handleObjectScaling(createShapeScaleStepEvent({
    harness,
    marker,
    multipliers: { x: rawMultiplier, y: 1 }
  }))).toBe(true)

  const finalBounds = getRequiredShapeScaleBounds({ target: harness.target })
  const finalWidth = finalBounds.right - finalBounds.left

  expect(harness.publishGuidesMock).toHaveBeenCalledWith({ guides: [] })
  expect(finalWidth).toBeCloseTo(Math.round(initialWidth * rawMultiplier), 9)
  expect(harness.target.scaleX).not.toBeCloseTo(rawMultiplier, 9)
  expect(harness.target.scaleY).toBe(1)
})

it('с Shift применяет независимые множители ширины и высоты', () => {
  const harness = createShapeScaleInteractionHarness()
  const marker = createShapeScaleMarker({ shiftKey: true })
  const initialWidth = harness.baselineBounds.right - harness.baselineBounds.left
  const initialHeight = harness.baselineBounds.bottom - harness.baselineBounds.top

  expect(harness.controller.beginGesture(createShapeScaleBeginEvent({ harness }))).toBe(true)
  expect(harness.controller.handleObjectScaling(createShapeScaleStepEvent({
    harness,
    marker,
    multipliers: { x: 1.2, y: 0.75 }
  }))).toBe(true)

  const finalBounds = getRequiredShapeScaleBounds({ target: harness.target })

  expect(finalBounds.right - finalBounds.left).toBeCloseTo(initialWidth * 1.2, 9)
  expect(finalBounds.bottom - finalBounds.top).toBeCloseTo(initialHeight * 0.75, 9)
  expect(harness.target.scaleX).not.toBe(harness.target.scaleY)
  expect(harness.publishGuidesMock).toHaveBeenCalledWith({ guides: [] })
})

it('не перехватывает scale при неподдерживаемом Fabric action', () => {
  const harness = createShapeScaleInteractionHarness()
  harness.transform.action = 'skewX'

  expect(harness.controller.beginGesture(createShapeScaleBeginEvent({ harness }))).toBe(false)
  expect(harness.captureEnvironmentMock).not.toHaveBeenCalled()
  expect(harness.publishGuidesMock).not.toHaveBeenCalled()
  expect(harness.materializeMock).not.toHaveBeenCalled()
})

it('не применяет scale поверх skew боковой ручки при Shift во время жеста', () => {
  const harness = createShapeScaleInteractionHarness({ controlKey: 'mr' })
  const marker = createShapeScaleMarker({ shiftKey: true })
  const event = createShapeScaleStepEvent({
    harness,
    marker,
    multipliers: { x: 1.1, y: 1 }
  })

  expect(harness.controller.beginGesture(createShapeScaleBeginEvent({ harness }))).toBe(true)
  expect(harness.controller.handleCanvasMouseMove(event)).toBe(true)
  expect(harness.claimStepMock).not.toHaveBeenCalled()
  expect(harness.materializeMock).not.toHaveBeenCalled()
  expect(harness.publishGuidesMock).toHaveBeenCalledWith({ guides: [] })
  expect(harness.clearScalingStateMock).toHaveBeenCalledTimes(1)
  expect(harness.clearScalingStateMock).toHaveBeenCalledWith({ group: harness.target })
  expect(harness.controller.handleCanvasMouseMove(event)).toBe(false)
})

it('не перехватывает scale перевёрнутого Shape', () => {
  const harness = createShapeScaleInteractionHarness()
  harness.target.set({ flipX: true })

  expect(harness.controller.beginGesture(createShapeScaleBeginEvent({ harness }))).toBe(false)
  expect(harness.captureEnvironmentMock).not.toHaveBeenCalled()
  expect(harness.publishGuidesMock).not.toHaveBeenCalled()
  expect(harness.materializeMock).not.toHaveBeenCalled()
})

it('не перехватывает scale обычной Fabric group без Shape-контракта', () => {
  const harness = createShapeScaleInteractionHarness()
  harness.transform.target = new Group([])

  expect(harness.controller.beginGesture(createShapeScaleBeginEvent({ harness }))).toBe(false)
  expect(harness.captureEnvironmentMock).not.toHaveBeenCalled()
  expect(harness.materializeMock).not.toHaveBeenCalled()
})

it('не перехватывает scale вложенного Shape и Shape со skew', () => {
  const nested = createShapeScaleInteractionHarness()
  nested.target.group = new Group([])

  expect(nested.controller.beginGesture(createShapeScaleBeginEvent({ harness: nested }))).toBe(false)
  expect(nested.captureEnvironmentMock).not.toHaveBeenCalled()

  const skewed = createShapeScaleInteractionHarness()
  skewed.target.skewX = 5

  expect(skewed.controller.beginGesture(createShapeScaleBeginEvent({ harness: skewed }))).toBe(false)
  expect(skewed.captureEnvironmentMock).not.toHaveBeenCalled()
})

it('не перехватывает scale Shape с заблокированной осью', () => {
  const harness = createShapeScaleInteractionHarness({ controlKey: 'mr' })
  harness.target.set({ lockScalingX: true })

  expect(harness.controller.beginGesture(createShapeScaleBeginEvent({ harness }))).toBe(false)
  expect(harness.captureEnvironmentMock).not.toHaveBeenCalled()
  expect(harness.publishGuidesMock).not.toHaveBeenCalled()
  expect(harness.materializeMock).not.toHaveBeenCalled()
})

it('при пересечении неподвижной точки завершает сессию и возвращает управление старому scaling', () => {
  const harness = createShapeScaleInteractionHarness({ controlKey: 'mr' })
  const marker = createShapeScaleMarker()

  expect(harness.controller.beginGesture(createShapeScaleBeginEvent({ harness }))).toBe(true)
  expect(harness.controller.handleObjectScaling(createShapeScaleStepEvent({
    harness,
    marker,
    multipliers: { x: -0.1, y: 1 }
  }))).toBe(false)
  expect(harness.publishGuidesMock).toHaveBeenCalledTimes(1)
  expect(harness.publishGuidesMock).toHaveBeenCalledWith({ guides: [] })
  expect(harness.claimStepMock).not.toHaveBeenCalled()
  expect(harness.materializeMock).not.toHaveBeenCalled()
  expect(harness.clearScalingStateMock).not.toHaveBeenCalled()
  expect(harness.controller.handleObjectScaling(createShapeScaleStepEvent({
    harness,
    marker: createShapeScaleMarker(),
    multipliers: { x: 0.9, y: 1 }
  }))).toBe(false)
})

it('не применяет uniform scale за неподвижной точкой угловой ручки', () => {
  const harness = createShapeScaleInteractionHarness({ controlKey: 'br' })
  const marker = createShapeScaleMarker()

  expect(harness.controller.beginGesture(createShapeScaleBeginEvent({ harness }))).toBe(true)
  expect(harness.controller.handleCanvasMouseMove(createShapeScaleStepEvent({
    harness,
    marker,
    multipliers: { x: -0.1, y: -0.1 }
  }))).toBe(false)
  expect(harness.claimStepMock).not.toHaveBeenCalled()
  expect(harness.materializeMock).not.toHaveBeenCalled()
  expect(harness.clearScalingStateMock).not.toHaveBeenCalled()
  expect(harness.publishGuidesMock).toHaveBeenCalledWith({ guides: [] })
})

it('при событии другого объекта завершает сессию без частичного apply', () => {
  const harness = createShapeScaleInteractionHarness()
  const otherHarness = createShapeScaleInteractionHarness()

  expect(harness.controller.beginGesture(createShapeScaleBeginEvent({ harness }))).toBe(true)
  expect(harness.controller.handleObjectScaling({
    target: otherHarness.target,
    transform: harness.transform,
    e: createShapeScaleMarker(),
    pointer: harness.pointerStart
  })).toBe(false)
  expect(harness.publishGuidesMock).toHaveBeenCalledTimes(1)
  expect(harness.publishGuidesMock).toHaveBeenCalledWith({ guides: [] })
  expect(harness.clearScalingStateMock).not.toHaveBeenCalled()
  expect(harness.claimStepMock).not.toHaveBeenCalled()
  expect(harness.materializeMock).not.toHaveBeenCalled()
})

it('после ограничения скрывает заблокированную ось, но сохраняет независимую guide', () => {
  const harness = createShapeScaleInteractionHarness()
  setShapeScaleEnvironment({
    harness,
    environment: Object.freeze({
      candidates: Object.freeze([
        createShapeScaleRightGuide({ harness }),
        createShapeScaleBottomGuide({ harness })
      ]),
      zoom: 1
    })
  })
  harness.materializeMock.mockImplementation(({ target, transform }) => {
    if (!target || !transform) throw new Error('Shape materialization event должен содержать target и transform')

    const fixedAnchor = target.getPointByOrigin(transform.originX, transform.originY)
    target.set({ scaleX: 0.97 })
    transform.scaleX = 0.97
    target.setPositionByOrigin(fixedAnchor, transform.originX, transform.originY)
    target.setCoords()
  })
  const marker = createShapeScaleMarker({ shiftKey: true })

  expect(harness.controller.beginGesture(createShapeScaleBeginEvent({ harness }))).toBe(true)
  expect(harness.controller.handleObjectScaling(createShapeScaleStepEvent({
    harness,
    marker,
    multipliers: { x: 0.98, y: 0.98 }
  }))).toBe(true)
  expect(harness.publishGuidesMock).toHaveBeenCalledWith({
    guides: [{
      axis: 'y',
      edge: 'bottom',
      position: harness.baselineBounds.bottom,
      candidateId: 'bottom-guide',
      category: 'edge',
      snapshotIndex: 1
    }]
  })
  expect(harness.target.scaleX).toBe(0.97)
  expect(harness.target.scaleY).toBe(1)
  expect(harness.materializeMock).toHaveBeenCalledTimes(1)
})

it('finishGesture и destroy очищают одну сессию идемпотентно', () => {
  const harness = createShapeScaleInteractionHarness()

  expect(harness.controller.beginGesture(createShapeScaleBeginEvent({ harness }))).toBe(true)

  harness.controller.finishGesture()
  harness.controller.finishGesture()
  harness.controller.destroy()
  harness.controller.destroy()

  expect(harness.publishGuidesMock).toHaveBeenCalledTimes(1)
  expect(harness.publishGuidesMock).toHaveBeenCalledWith({ guides: [] })
  expect(harness.clearScalingStateMock).toHaveBeenCalledTimes(1)
  expect(harness.clearScalingStateMock).toHaveBeenCalledWith({ group: harness.target })
  expect(harness.controller.handleObjectScaling(createShapeScaleStepEvent({
    harness,
    marker: createShapeScaleMarker(),
    multipliers: { x: 0.9, y: 0.9 }
  }))).toBe(false)
  expect(harness.claimStepMock).not.toHaveBeenCalled()
  expect(harness.materializeMock).not.toHaveBeenCalled()
})

it('после fallback без изменения начинает следующий scale с чистого состояния', () => {
  const harness = createShapeScaleInteractionHarness()

  expect(harness.controller.beginGesture(createShapeScaleBeginEvent({ harness }))).toBe(true)
  expect(harness.controller.handleCanvasMouseMove(createShapeScaleStepEvent({
    harness,
    marker: createShapeScaleMarker(),
    multipliers: { x: 1, y: 1 }
  }))).toBe(true)
  expect(harness.transform.actionPerformed).toBe(false)

  harness.controller.finishGesture()
  expect(harness.clearScalingStateMock).toHaveBeenCalledTimes(1)

  expect(harness.controller.beginGesture(createShapeScaleBeginEvent({ harness }))).toBe(true)
  expect(harness.controller.handleObjectScaling(createShapeScaleStepEvent({
    harness,
    marker: createShapeScaleMarker(),
    multipliers: { x: 1.1, y: 1.1 }
  }))).toBe(true)
  expect(harness.transform.actionPerformed).toBe(true)
  expect(harness.materializeMock).toHaveBeenCalledTimes(2)
})

it('interruptGesture завершает Fabric transform и очищает сессию идемпотентно', () => {
  const harness = createShapeScaleInteractionHarness()

  expect(harness.controller.beginGesture(createShapeScaleBeginEvent({ harness }))).toBe(true)
  expect(harness.controller.interruptGesture()).toBe(true)
  expect(harness.controller.interruptGesture()).toBe(false)
  expect(harness.endCurrentTransformMock).toHaveBeenCalledTimes(1)
  expect(harness.endCurrentTransformMock).toHaveBeenCalledWith(undefined)
  expect(harness.clearScalingStateMock).toHaveBeenCalledTimes(1)
  expect(harness.clearScalingStateMock).toHaveBeenCalledWith({ group: harness.target })
  expect(harness.publishGuidesMock).toHaveBeenCalledTimes(1)
  expect(harness.publishGuidesMock).toHaveBeenCalledWith({ guides: [] })
  expect(harness.controller.handleObjectScaling(createShapeScaleStepEvent({
    harness,
    marker: createShapeScaleMarker(),
    multipliers: { x: 0.9, y: 0.9 }
  }))).toBe(false)
})
