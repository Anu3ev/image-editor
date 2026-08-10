import { emitCanvasEvent } from '../../../../test-utils/canvas/events'
import {
  createActiveSelectionMovementLifecycleSetup,
  createMovementSnappingLifecycleSetup,
  seedVisibleSnappingState
} from '../../../../test-utils/snapping/snapping-lifecycle'

/** События canvas, которые завершают текущее перемещение с прилипанием. */
const CANVAS_TERMINAL_EVENTS = [
  'mouse:up',
  'selection:created',
  'selection:updated',
  'selection:cleared'
] as const

/** События окна, которые прерывают текущее перемещение с прилипанием. */
const WINDOW_TERMINAL_EVENTS = [
  'pointercancel',
  'touchcancel',
  'blur'
] as const

it('новый mouse:down очищает направляющие и кеш предыдущего перемещения', () => {
  const {
    manager,
    canvas,
    state,
    activeTarget,
    startGestureMock
  } = createMovementSnappingLifecycleSetup()
  emitCanvasEvent({
    canvas,
    event: 'mouse:down',
    payload: { target: activeTarget, transform: { action: 'drag' } }
  })
  seedVisibleSnappingState({ state })

  emitCanvasEvent({
    canvas,
    event: 'mouse:down',
    payload: { target: activeTarget, transform: { action: 'drag' } }
  })

  expect(startGestureMock).toHaveBeenCalledTimes(2)
  expect(startGestureMock).toHaveBeenLastCalledWith({ target: activeTarget })
  expect(state.activeGuides).toEqual([])
  expect(state.activeSpacingGuides).toEqual([])
  expect(state.anchors.vertical).not.toContain(100)
  expect(state.anchors.horizontal).not.toContain(80)

  manager.destroy()
})

it.each(CANVAS_TERMINAL_EVENTS)('%s завершает перемещение и очищает видимые направляющие', (event) => {
  const {
    manager,
    canvas,
    state,
    activeTarget,
    finishGestureMock
  } = createMovementSnappingLifecycleSetup()
  emitCanvasEvent({
    canvas,
    event: 'mouse:down',
    payload: { target: activeTarget, transform: { action: 'drag' } }
  })
  seedVisibleSnappingState({ state })

  emitCanvasEvent({ canvas, event })

  expect(finishGestureMock).toHaveBeenCalledTimes(1)
  expect(state.activeGuides).toEqual([])
  expect(state.activeSpacingGuides).toEqual([])
  expect(state.anchors).toEqual({ vertical: [], horizontal: [] })

  manager.destroy()
})

it.each(WINDOW_TERMINAL_EVENTS)('%s прерывает перемещение и очищает направляющие', (event) => {
  const {
    manager,
    canvas,
    state,
    activeTarget,
    finishGestureMock
  } = createMovementSnappingLifecycleSetup()
  emitCanvasEvent({
    canvas,
    event: 'mouse:down',
    payload: { target: activeTarget, transform: { action: 'drag' } }
  })
  seedVisibleSnappingState({ state })

  window.dispatchEvent(new Event(event))

  expect(finishGestureMock).toHaveBeenCalledTimes(1)
  expect(state.activeGuides).toEqual([])
  expect(state.activeSpacingGuides).toEqual([])
  expect(state.anchors).toEqual({ vertical: [], horizontal: [] })

  manager.destroy()
})

it('удаление активного объекта завершает его перемещение', () => {
  const {
    manager,
    canvas,
    state,
    activeTarget,
    finishGestureMock,
    finishGestureForTargetMock
  } = createMovementSnappingLifecycleSetup()
  emitCanvasEvent({
    canvas,
    event: 'mouse:down',
    payload: { target: activeTarget, transform: { action: 'drag' } }
  })
  seedVisibleSnappingState({ state })

  emitCanvasEvent({
    canvas,
    event: 'object:removed',
    payload: { target: activeTarget }
  })

  expect(finishGestureMock).toHaveBeenCalledTimes(1)
  expect(finishGestureForTargetMock).toHaveBeenCalledWith({ target: activeTarget })
  expect(state.activeGuides).toEqual([])
  expect(state.activeSpacingGuides).toEqual([])
  expect(state.anchors).toEqual({ vertical: [], horizontal: [] })

  manager.destroy()
})

it('удаление дочернего объекта завершает перемещение общего выделения', () => {
  const {
    activeTarget,
    canvas,
    children,
    manager,
    state
  } = createActiveSelectionMovementLifecycleSetup()
  const [firstChild, secondChild] = children

  expect(firstChild).toBeDefined()
  expect(secondChild).toBeDefined()
  if (!firstChild || !secondChild) {
    throw new Error('Для проверки завершения нужны два дочерних объекта общего выделения')
  }

  emitCanvasEvent({
    canvas,
    event: 'mouse:down',
    payload: { target: activeTarget, transform: { action: 'drag' } }
  })
  seedVisibleSnappingState({ state })

  emitCanvasEvent({
    canvas,
    event: 'object:removed',
    payload: { target: secondChild }
  })

  expect(state.activeGuides).toEqual([])
  expect(state.activeSpacingGuides).toEqual([])
  expect(state.anchors).toEqual({ vertical: [], horizontal: [] })
  expect(state.movementSnappingController.finishGestureForTarget({ target: firstChild })).toBe(false)

  manager.destroy()
})

it('удаление другого объекта не прерывает активное перемещение', () => {
  const {
    manager,
    canvas,
    state,
    activeTarget,
    finishGestureMock,
    finishGestureForTargetMock
  } = createMovementSnappingLifecycleSetup()
  emitCanvasEvent({
    canvas,
    event: 'mouse:down',
    payload: { target: activeTarget, transform: { action: 'drag' } }
  })
  seedVisibleSnappingState({ state })

  const otherTarget = {}
  emitCanvasEvent({
    canvas,
    event: 'object:removed',
    payload: { target: otherTarget }
  })

  expect(finishGestureMock).not.toHaveBeenCalled()
  expect(finishGestureForTargetMock).toHaveBeenCalledWith({ target: otherTarget })
  expect(state.activeGuides).toHaveLength(1)
  expect(state.activeSpacingGuides).toHaveLength(1)
  expect(state.anchors).toEqual({ vertical: [100], horizontal: [80] })

  manager.destroy()
})

describe('уничтожение SnappingManager во время перемещения объекта', () => {
  it('destroy очищает временное состояние и снимает обработчики событий canvas и окна', () => {
    const addEventListenerSpy = jest.spyOn(window, 'addEventListener')
    const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener')

    try {
      const {
        manager,
        canvas,
        state,
        activeTarget,
        finishGestureMock
      } = createMovementSnappingLifecycleSetup()
      emitCanvasEvent({
        canvas,
        event: 'mouse:down',
        payload: { target: activeTarget, transform: { action: 'drag' } }
      })
      seedVisibleSnappingState({ state })

      manager.destroy()

      expect(finishGestureMock).toHaveBeenCalledTimes(1)
      expect(state.activeGuides).toEqual([])
      expect(canvas.off).toHaveBeenCalledWith('object:removed', expect.any(Function))
      expect(canvas.off).toHaveBeenCalledWith('selection:created', expect.any(Function))
      expect(removeEventListenerSpy).toHaveBeenCalledWith('pointercancel', expect.any(Function))
      expect(removeEventListenerSpy).toHaveBeenCalledWith('touchcancel', expect.any(Function))
      expect(removeEventListenerSpy).toHaveBeenCalledWith('blur', expect.any(Function))

      finishGestureMock.mockClear()
      emitCanvasEvent({ canvas, event: 'selection:created' })
      window.dispatchEvent(new Event('pointercancel'))

      expect(finishGestureMock).not.toHaveBeenCalled()
      expect(addEventListenerSpy).toHaveBeenCalledWith('pointercancel', expect.any(Function))
    } finally {
      addEventListenerSpy.mockRestore()
      removeEventListenerSpy.mockRestore()
    }
  })
})
