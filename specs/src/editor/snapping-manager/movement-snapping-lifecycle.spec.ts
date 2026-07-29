import { emitCanvasEvent } from '../../../test-utils/canvas/events'
import {
  createMovementSnappingLifecycleSetup,
  seedVisibleSnappingState
} from '../../../test-utils/managers/snapping-lifecycle'

/** Canvas-события, которые завершают текущий snapping interaction. */
const CANVAS_TERMINAL_EVENTS = [
  'mouse:up',
  'selection:created',
  'selection:updated',
  'selection:cleared'
] as const

/** Window-события, которые прерывают текущий snapping interaction. */
const WINDOW_TERMINAL_EVENTS = [
  'pointercancel',
  'touchcancel',
  'blur'
] as const

it('новый mousedown очищает направляющие и кеш предыдущего interaction', () => {
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
    payload: { target: activeTarget }
  })
  seedVisibleSnappingState({ state })

  emitCanvasEvent({
    canvas,
    event: 'mouse:down',
    payload: { target: activeTarget }
  })

  expect(startGestureMock).toHaveBeenCalledTimes(2)
  expect(state.activeMovementSnappingTarget).toBe(activeTarget)
  expect(state.activeGuides).toEqual([])
  expect(state.activeSpacingGuides).toEqual([])
  expect(state.anchors.vertical).not.toContain(100)
  expect(state.anchors.horizontal).not.toContain(80)

  manager.destroy()
})

it.each(CANVAS_TERMINAL_EVENTS)('%s очищает movement-сессию и видимые направляющие', (event) => {
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
    payload: { target: activeTarget }
  })
  seedVisibleSnappingState({ state })

  emitCanvasEvent({ canvas, event })

  expect(finishGestureMock).toHaveBeenCalledTimes(1)
  expect(state.activeMovementSnappingTarget).toBeNull()
  expect(state.activeGuides).toEqual([])
  expect(state.activeSpacingGuides).toEqual([])
  expect(state.anchors).toEqual({ vertical: [], horizontal: [] })

  manager.destroy()
})

it.each(WINDOW_TERMINAL_EVENTS)('%s прерывает movement-сессию и очищает направляющие', (event) => {
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
    payload: { target: activeTarget }
  })
  seedVisibleSnappingState({ state })

  window.dispatchEvent(new Event(event))

  expect(finishGestureMock).toHaveBeenCalledTimes(1)
  expect(state.activeMovementSnappingTarget).toBeNull()
  expect(state.activeGuides).toEqual([])
  expect(state.activeSpacingGuides).toEqual([])
  expect(state.anchors).toEqual({ vertical: [], horizontal: [] })

  manager.destroy()
})

it('удаление активного изображения завершает его movement-сессию', () => {
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
    payload: { target: activeTarget }
  })
  seedVisibleSnappingState({ state })

  emitCanvasEvent({
    canvas,
    event: 'object:removed',
    payload: { target: activeTarget }
  })

  expect(finishGestureMock).toHaveBeenCalledTimes(1)
  expect(state.activeMovementSnappingTarget).toBeNull()
  expect(state.activeGuides).toEqual([])
  expect(state.activeSpacingGuides).toEqual([])
  expect(state.anchors).toEqual({ vertical: [], horizontal: [] })

  manager.destroy()
})

it('удаление другого объекта не прерывает movement активного изображения', () => {
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
    payload: { target: activeTarget }
  })
  seedVisibleSnappingState({ state })

  emitCanvasEvent({
    canvas,
    event: 'object:removed',
    payload: { target: {} }
  })

  expect(finishGestureMock).not.toHaveBeenCalled()
  expect(state.activeMovementSnappingTarget).toBe(activeTarget)
  expect(state.activeGuides).toHaveLength(1)
  expect(state.activeSpacingGuides).toHaveLength(1)
  expect(state.anchors).toEqual({ vertical: [100], horizontal: [80] })

  manager.destroy()
})

describe('уничтожение SnappingManager во время перемещения изображения', () => {
  it('destroy очищает interaction и симметрично снимает canvas и window listeners', () => {
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
        payload: { target: activeTarget }
      })
      seedVisibleSnappingState({ state })

      manager.destroy()

      expect(finishGestureMock).toHaveBeenCalledTimes(1)
      expect(state.activeMovementSnappingTarget).toBeNull()
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
