import { emitCanvasEvent } from '../../../../test-utils/canvas/events'
import {
  createImageScaleMouseMoveEvent,
  createImageScaleStartEvent,
  createImageScaleStepEvent
} from '../../../../test-utils/snapping/image-scale-snapping-controller'
import {
  createImageScaleRoutingSetup,
  type ImageScaleRoutingSetup
} from '../../../../test-utils/snapping/image-scale-routing'
import { seedVisibleSnappingState } from '../../../../test-utils/snapping/snapping-lifecycle'

/** События окна, которые прерывают скейлинг изображения. */
const INTERRUPTED_SCALE_EVENTS = [
  {
    event: 'pointercancel',
    forwardsEvent: true
  },
  {
    event: 'touchcancel',
    forwardsEvent: true
  },
  {
    event: 'blur',
    forwardsEvent: false
  }
] as const

let setup: ImageScaleRoutingSetup

beforeEach(() => {
  setup = createImageScaleRoutingSetup()
})

afterEach(() => {
  if (setup) setup.manager.destroy()
  jest.restoreAllMocks()
})

it('поддержанный object:scaling обрабатывается один раз и не входит в legacy', () => {
  const startGestureMock = jest.spyOn(
    setup.state.imageScaleSnappingController,
    'startGesture'
  )
  const startEvent = createImageScaleStartEvent({ harness: setup.image })
  emitCanvasEvent({
    canvas: setup.canvas,
    event: 'mouse:down',
    payload: startEvent
  })

  const scaleEvent = createImageScaleStepEvent({
    harness: setup.image,
    marker: new MouseEvent('pointermove'),
    multiplier: 1.08
  })
  emitCanvasEvent({
    canvas: setup.canvas,
    event: 'object:scaling',
    payload: scaleEvent
  })

  expect(startGestureMock).toHaveReturnedWith(true)
  expect(setup.legacyRouteMock).not.toHaveBeenCalled()
  expect(setup.image.target.scaleX).toBeCloseTo(1.08, 9)
  expect(setup.image.transform.actionPerformed).toBe(true)
})

it('неподдержанный object:scaling передаётся в legacy ровно один раз', () => {
  setup.image.target.skewX = 10
  setup.legacyRouteMock.mockReturnValue(null)
  const startGestureMock = jest.spyOn(
    setup.state.imageScaleSnappingController,
    'startGesture'
  )
  const startEvent = createImageScaleStartEvent({ harness: setup.image })
  emitCanvasEvent({
    canvas: setup.canvas,
    event: 'mouse:down',
    payload: startEvent
  })

  const scaleEvent = createImageScaleStepEvent({
    harness: setup.image,
    marker: new MouseEvent('pointermove'),
    multiplier: 1.08
  })
  emitCanvasEvent({
    canvas: setup.canvas,
    event: 'object:scaling',
    payload: scaleEvent
  })

  expect(startGestureMock).toHaveReturnedWith(false)
  expect(setup.legacyRouteMock).toHaveBeenCalledTimes(1)
  expect(setup.legacyRouteMock).toHaveBeenCalledWith({ event: scaleEvent })
  expect(setup.image.transform.actionPerformed).toBe(false)
})

it('mouse:move применяет новый pointer-step, если Fabric не отправил object:scaling', () => {
  const startEvent = createImageScaleStartEvent({ harness: setup.image })
  emitCanvasEvent({
    canvas: setup.canvas,
    event: 'mouse:down',
    payload: startEvent
  })

  const scaleEvent = createImageScaleMouseMoveEvent({
    harness: setup.image,
    marker: new MouseEvent('pointermove'),
    multipliers: { x: 1.08, y: 1 }
  })
  emitCanvasEvent({
    canvas: setup.canvas,
    event: 'mouse:move',
    payload: scaleEvent
  })

  expect(setup.image.target.scaleX).toBeCloseTo(1.08, 9)
  expect(setup.image.setMock).toHaveBeenCalledTimes(1)
  expect(setup.image.setPositionByOriginMock).toHaveBeenCalledTimes(1)
  expect(setup.legacyRouteMock).not.toHaveBeenCalled()
})

it('один native marker не применяется и не публикуется повторно между двумя canvas events', () => {
  const startEvent = createImageScaleStartEvent({ harness: setup.image })
  emitCanvasEvent({
    canvas: setup.canvas,
    event: 'mouse:down',
    payload: startEvent
  })

  const publishGuidesMock = jest.spyOn(setup.manager, 'publishVerifiedScaleGuides')
  const scaleEvent = createImageScaleStepEvent({
    harness: setup.image,
    marker: new MouseEvent('pointermove'),
    multiplier: 1.08
  })
  emitCanvasEvent({
    canvas: setup.canvas,
    event: 'object:scaling',
    payload: scaleEvent
  })
  emitCanvasEvent({
    canvas: setup.canvas,
    event: 'mouse:move',
    payload: scaleEvent
  })

  expect(setup.image.setMock).toHaveBeenCalledTimes(1)
  expect(setup.image.setPositionByOriginMock).toHaveBeenCalledTimes(1)
  expect(publishGuidesMock).toHaveBeenCalledTimes(1)
  expect(setup.legacyRouteMock).not.toHaveBeenCalled()
})

it('Shift на боковой ручке очищает scale-гайды и не вмешивается в Fabric skew', () => {
  const startEvent = createImageScaleStartEvent({ harness: setup.image })
  emitCanvasEvent({
    canvas: setup.canvas,
    event: 'mouse:down',
    payload: startEvent
  })
  seedVisibleSnappingState({ state: setup.state })
  setup.image.target.skewY = 12

  const scaleEvent = createImageScaleMouseMoveEvent({
    harness: setup.image,
    marker: new MouseEvent('pointermove', { shiftKey: true }),
    multipliers: { x: 1.08, y: 1 }
  })
  emitCanvasEvent({
    canvas: setup.canvas,
    event: 'mouse:move',
    payload: scaleEvent
  })

  expect(setup.state.activeGuides).toEqual([])
  expect(setup.state.activeSpacingGuides).toEqual([])
  expect(setup.image.target.skewY).toBe(12)
  expect(setup.image.target.scaleX).toBe(1)
  expect(setup.image.setMock).not.toHaveBeenCalled()
})

it('при ошибке шага очищает сессию, направляющие и кеш целей', () => {
  const startEvent = createImageScaleStartEvent({ harness: setup.image })
  emitCanvasEvent({ canvas: setup.canvas, event: 'mouse:down', payload: startEvent })
  seedVisibleSnappingState({ state: setup.state })
  setup.image.setMock.mockImplementationOnce(() => {
    throw new Error('Ошибка применения плана')
  })

  expect(() => emitCanvasEvent({
    canvas: setup.canvas,
    event: 'object:scaling',
    payload: createImageScaleStepEvent({
      harness: setup.image,
      marker: new MouseEvent('pointermove')
    })
  })).toThrow('Ошибка применения плана')
  expect(setup.state.activeGuides).toEqual([])
  expect(setup.state.activeSpacingGuides).toEqual([])
  expect(setup.state.anchors).toEqual({ vertical: [], horizontal: [] })
})

it('mouseup завершает скейлинг изображения без повторного завершения Fabric transform', () => {
  const startEvent = createImageScaleStartEvent({ harness: setup.image })
  emitCanvasEvent({
    canvas: setup.canvas,
    event: 'mouse:down',
    payload: startEvent
  })
  seedVisibleSnappingState({ state: setup.state })

  emitCanvasEvent({ canvas: setup.canvas, event: 'mouse:up' })

  expect(setup.canvas.endCurrentTransform).not.toHaveBeenCalled()
  expect(setup.state.activeGuides).toEqual([])
  expect(setup.state.activeSpacingGuides).toEqual([])
  expect(setup.state.anchors).toEqual({ vertical: [], horizontal: [] })
})

it.each(INTERRUPTED_SCALE_EVENTS)(
  '$event завершает преобразование Fabric и очищает временные данные прилипания',
  ({ event, forwardsEvent }) => {
    const startEvent = createImageScaleStartEvent({ harness: setup.image })
    emitCanvasEvent({
      canvas: setup.canvas,
      event: 'mouse:down',
      payload: startEvent
    })
    seedVisibleSnappingState({ state: setup.state })
    const cancellationEvent = new Event(event)

    window.dispatchEvent(cancellationEvent)

    expect(setup.canvas.endCurrentTransform).toHaveBeenCalledTimes(1)
    expect(setup.canvas.endCurrentTransform).toHaveBeenCalledWith(
      forwardsEvent ? cancellationEvent : undefined
    )
    expect(setup.state.activeGuides).toEqual([])
    expect(setup.state.activeSpacingGuides).toEqual([])
    expect(setup.state.anchors).toEqual({ vertical: [], horizontal: [] })
  }
)

it('обработчики object:scaling и mouse:move навешиваются и снимаются симметрично', () => {
  expect(setup.canvas.on).toHaveBeenCalledWith('object:scaling', expect.any(Function))
  expect(setup.canvas.on).toHaveBeenCalledWith('mouse:move', expect.any(Function))

  const startEvent = createImageScaleStartEvent({ harness: setup.image })
  emitCanvasEvent({
    canvas: setup.canvas,
    event: 'mouse:down',
    payload: startEvent
  })
  const finishGestureMock = jest.spyOn(
    setup.state.imageScaleSnappingController,
    'finishGesture'
  )
  seedVisibleSnappingState({ state: setup.state })

  setup.manager.destroy()

  expect(finishGestureMock).toHaveBeenCalledTimes(1)
  expect(setup.state.activeGuides).toEqual([])
  expect(setup.canvas.off).toHaveBeenCalledWith('object:scaling', expect.any(Function))
  expect(setup.canvas.off).toHaveBeenCalledWith('mouse:move', expect.any(Function))
})
