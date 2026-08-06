import {
  ActiveSelection,
  Rect
} from 'fabric'
import ShapeEventController from '../../../../src/editor/shape-manager/events/shape-event-controller'
import { ShapeGroupObject } from '../../../../src/editor/shape-manager/domain/shape-group'
import ShapeScaleInteractionController from '../../../../src/editor/shape-manager/scaling/shape-scale-interaction-controller'
import { getRequiredCanvasHandler } from '../../../test-utils/canvas/handlers'
import { createMockCanvas } from '../../../test-utils/shape/factories'

/** Canvas-события, на которые ShapeEventController должен подписываться и от которых должен отписываться. */
const SHAPE_CANVAS_EVENT_NAMES = Object.freeze([
  'object:scaling',
  'object:modified',
  'mouse:move',
  'mouse:down',
  'mouse:up',
  'object:removed',
  'selection:created',
  'selection:updated',
  'selection:cleared',
  'text:editing:entered',
  'text:editing:exited',
  'text:changed',
  'editor:before:text-updated',
  'editor:text-updated'
] as const)

/** Контроллеры, которые afterEach должен освободить после каждого теста. */
const routingControllers = new Set<ShapeEventController>()

/** Возвращает обязательный обработчик window-события из вызовов addEventListener. */
function getRequiredWindowListener({
  addEventListenerSpy,
  eventName
}: {
  addEventListenerSpy: jest.SpyInstance
  eventName: 'pointercancel' | 'touchcancel' | 'blur'
}): EventListenerOrEventListenerObject {
  const registration = addEventListenerSpy.mock.calls.find(([currentName]) => currentName === eventName)
  const listener = registration?.[1]
  const isListenerObject = typeof listener === 'object'
    && listener !== null
    && typeof listener.handleEvent === 'function'

  if (typeof listener !== 'function' && !isListenerObject) {
    throw new Error(`Для ${eventName} должен быть зарегистрирован обработчик`)
  }

  return listener
}

/** Создаёт изолированный ShapeEventController с наблюдаемыми зависимостями. */
function createRoutingHarness() {
  const canvas = createMockCanvas()
  const child = new Rect({
    width: 20,
    height: 20
  })
  const group = new ShapeGroupObject([child], {})
  const scalingController = {
    handleObjectScaling: jest.fn(),
    handleCanvasMouseMove: jest.fn(),
    handleObjectModified: jest.fn(),
    clearState: jest.fn()
  }
  const editingController = {
    handleMouseDown: jest.fn()
  }
  const lifecycleController = {
    beginResize: jest.fn(),
    captureResizeStart: jest.fn(),
    clearResizeStarts: jest.fn(),
    finishResize: jest.fn()
  }
  const controller = new ShapeEventController({
    dependencies: {
      editor: { canvas },
      scalingController,
      editingController,
      lifecycleController,
      layoutController: {},
      textNodeController: {
        isInternalUpdate: jest.fn()
      },
      editingPlacements: new WeakMap()
    } as never
  })

  controller.bind()
  routingControllers.add(controller)

  return {
    canvas,
    child,
    controller,
    editingController,
    group,
    lifecycleController,
    scalingController
  }
}

afterEach(() => {
  routingControllers.forEach((controller) => controller.destroy())
  routingControllers.clear()
  jest.restoreAllMocks()
})

it('подписывается на все canvas- и window-события и снимает те же обработчики', () => {
  const addEventListenerSpy = jest.spyOn(window, 'addEventListener')
  const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener')
  const harness = createRoutingHarness()
  const pointerCancelListener = getRequiredWindowListener({
    addEventListenerSpy,
    eventName: 'pointercancel'
  })
  const blurListener = getRequiredWindowListener({
    addEventListenerSpy,
    eventName: 'blur'
  })
  const touchCancelListener = getRequiredWindowListener({
    addEventListenerSpy,
    eventName: 'touchcancel'
  })

  harness.controller.destroy()

  expect(harness.canvas.on).toHaveBeenCalledTimes(SHAPE_CANVAS_EVENT_NAMES.length)
  expect(harness.canvas.off).toHaveBeenCalledTimes(SHAPE_CANVAS_EVENT_NAMES.length)
  for (const eventName of SHAPE_CANVAS_EVENT_NAMES) {
    const handler = getRequiredCanvasHandler({ canvas: harness.canvas, eventName })
    expect(harness.canvas.off).toHaveBeenCalledWith(eventName, handler)
  }
  expect(addEventListenerSpy).toHaveBeenCalledTimes(3)
  expect(removeEventListenerSpy).toHaveBeenCalledTimes(3)
  expect(removeEventListenerSpy).toHaveBeenCalledWith('pointercancel', pointerCancelListener)
  expect(removeEventListenerSpy).toHaveBeenCalledWith('touchcancel', touchCancelListener)
  expect(removeEventListenerSpy).toHaveBeenCalledWith('blur', blurListener)
})

it('находит затронутый шейп по группе, дочернему узлу и ActiveSelection без дубликатов', () => {
  const harness = createRoutingHarness()
  const mouseDownHandler = getRequiredCanvasHandler({
    canvas: harness.canvas,
    eventName: 'mouse:down'
  })

  mouseDownHandler({ target: harness.group })

  expect(harness.lifecycleController.captureResizeStart).toHaveBeenCalledTimes(1)
  expect(harness.lifecycleController.captureResizeStart).toHaveBeenLastCalledWith({
    group: harness.group
  })

  harness.lifecycleController.captureResizeStart.mockClear()
  mouseDownHandler({ target: harness.child })

  expect(harness.lifecycleController.captureResizeStart).toHaveBeenCalledTimes(1)
  expect(harness.lifecycleController.captureResizeStart).toHaveBeenLastCalledWith({
    group: harness.group
  })

  harness.lifecycleController.captureResizeStart.mockClear()
  const selection = new ActiveSelection([harness.group])
  mouseDownHandler({
    target: selection,
    subTargets: [harness.child, harness.group]
  })

  expect(harness.lifecycleController.captureResizeStart).toHaveBeenCalledTimes(1)
  expect(harness.lifecycleController.captureResizeStart).toHaveBeenLastCalledWith({
    group: harness.group
  })
})

it('сохраняет порядок начала и завершения жеста скейлинга', () => {
  const beginGestureSpy = jest
    .spyOn(ShapeScaleInteractionController.prototype, 'beginGesture')
    .mockReturnValue(true)
  const finishGestureSpy = jest
    .spyOn(ShapeScaleInteractionController.prototype, 'finishGesture')
    .mockImplementation(() => {})
  const destroySpy = jest
    .spyOn(ShapeScaleInteractionController.prototype, 'destroy')
    .mockImplementation(() => {})
  const harness = createRoutingHarness()
  const event = {
    target: harness.group,
    e: new Event('pointerdown'),
    pointer: { x: 12, y: 18 },
    scenePoint: { x: 12, y: 18 }
  }

  getRequiredCanvasHandler({ canvas: harness.canvas, eventName: 'mouse:down' })(event)
  getRequiredCanvasHandler({ canvas: harness.canvas, eventName: 'mouse:up' })({})
  harness.controller.destroy()

  expect(beginGestureSpy).toHaveBeenCalledWith(event)
  expect(harness.lifecycleController.captureResizeStart.mock.invocationCallOrder[0]).toBeLessThan(
    beginGestureSpy.mock.invocationCallOrder[0]
  )
  expect(beginGestureSpy.mock.invocationCallOrder[0]).toBeLessThan(
    harness.editingController.handleMouseDown.mock.invocationCallOrder[0]
  )
  expect(finishGestureSpy.mock.invocationCallOrder[0]).toBeLessThan(
    harness.lifecycleController.clearResizeStarts.mock.invocationCallOrder[0]
  )
  expect(destroySpy).toHaveBeenCalledTimes(1)
  expect(destroySpy.mock.invocationCallOrder[0]).toBeLessThan(
    harness.canvas.off.mock.invocationCallOrder[0]
  )
})

it('не обрабатывает шаг повторно, если контроллер жеста уже его принял', () => {
  const handleObjectScalingSpy = jest
    .spyOn(ShapeScaleInteractionController.prototype, 'handleObjectScaling')
    .mockReturnValue(true)
  const handleCanvasMouseMoveSpy = jest
    .spyOn(ShapeScaleInteractionController.prototype, 'handleCanvasMouseMove')
    .mockReturnValue(true)
  const harness = createRoutingHarness()
  const event = {
    target: harness.group,
    e: new Event('pointermove'),
    pointer: { x: 24, y: 36 },
    scenePoint: { x: 24, y: 36 },
    transform: { actionPerformed: true }
  }

  getRequiredCanvasHandler({ canvas: harness.canvas, eventName: 'object:scaling' })(event)
  getRequiredCanvasHandler({ canvas: harness.canvas, eventName: 'mouse:move' })(event)

  expect(handleObjectScalingSpy).toHaveBeenCalledWith(event)
  expect(handleCanvasMouseMoveSpy).toHaveBeenCalledWith(event)
  expect(harness.lifecycleController.beginResize).toHaveBeenCalledTimes(2)
  expect(harness.scalingController.handleObjectScaling).not.toHaveBeenCalled()
  expect(harness.scalingController.handleCanvasMouseMove).not.toHaveBeenCalled()
})

it('начинает resize при первом изменении геометрии из mouse:move', () => {
  const handleCanvasMouseMoveSpy = jest
    .spyOn(ShapeScaleInteractionController.prototype, 'handleCanvasMouseMove')
    .mockReturnValue(true)
  const harness = createRoutingHarness()
  const event = {
    target: harness.group,
    e: new Event('pointermove'),
    pointer: { x: 24, y: 36 },
    scenePoint: { x: 24, y: 36 },
    transform: { actionPerformed: true }
  }

  getRequiredCanvasHandler({ canvas: harness.canvas, eventName: 'mouse:move' })(event)

  expect(handleCanvasMouseMoveSpy).toHaveBeenCalledWith(event)
  expect(harness.lifecycleController.beginResize).toHaveBeenCalledTimes(1)
  expect(harness.scalingController.handleCanvasMouseMove).not.toHaveBeenCalled()
})

it('не начинает resize из mouse:move, если геометрия не изменилась', () => {
  jest
    .spyOn(ShapeScaleInteractionController.prototype, 'handleCanvasMouseMove')
    .mockReturnValue(true)
  const harness = createRoutingHarness()
  const event = {
    target: harness.group,
    e: new Event('pointermove'),
    transform: { actionPerformed: false }
  }

  getRequiredCanvasHandler({ canvas: harness.canvas, eventName: 'mouse:move' })(event)

  expect(harness.lifecycleController.beginResize).not.toHaveBeenCalled()
  expect(harness.scalingController.handleCanvasMouseMove).not.toHaveBeenCalled()
})

it('передаёт неподдержанный шаг обычной обработке скейлинга', () => {
  jest
    .spyOn(ShapeScaleInteractionController.prototype, 'handleObjectScaling')
    .mockReturnValue(false)
  jest
    .spyOn(ShapeScaleInteractionController.prototype, 'handleCanvasMouseMove')
    .mockReturnValue(false)
  const harness = createRoutingHarness()
  const event = {
    target: harness.group,
    e: new Event('pointermove')
  }

  getRequiredCanvasHandler({ canvas: harness.canvas, eventName: 'object:scaling' })(event)
  getRequiredCanvasHandler({ canvas: harness.canvas, eventName: 'mouse:move' })(event)

  expect(harness.scalingController.handleObjectScaling).toHaveBeenCalledWith(event)
  expect(harness.scalingController.handleCanvasMouseMove).toHaveBeenCalledWith(event)
})

it('не фиксирует остаточный scale шейпа после обычного перемещения', () => {
  const harness = createRoutingHarness()
  const event = {
    target: harness.group,
    transform: {
      action: 'drag'
    }
  }

  getRequiredCanvasHandler({ canvas: harness.canvas, eventName: 'object:modified' })(event)

  expect(harness.scalingController.handleObjectModified).not.toHaveBeenCalled()
  expect(harness.lifecycleController.finishResize).toHaveBeenCalledWith({ group: harness.group })
})

it('завершает жест скейлинга при любом изменении selection', () => {
  const finishGestureSpy = jest
    .spyOn(ShapeScaleInteractionController.prototype, 'finishGesture')
    .mockImplementation(() => {})
  const harness = createRoutingHarness()
  const selectionEvents = ['selection:created', 'selection:updated', 'selection:cleared'] as const

  for (const eventName of selectionEvents) {
    getRequiredCanvasHandler({ canvas: harness.canvas, eventName })({})
  }

  expect(finishGestureSpy).toHaveBeenCalledTimes(selectionEvents.length)
  expect(harness.lifecycleController.clearResizeStarts).toHaveBeenCalledTimes(selectionEvents.length)
})

it('завершает жест скейлинга только при удалении активного Shape', () => {
  const finishGestureForTargetSpy = jest
    .spyOn(ShapeScaleInteractionController.prototype, 'finishGestureForTarget')
    .mockReturnValueOnce(false)
    .mockReturnValueOnce(true)
  const harness = createRoutingHarness()
  const unrelatedTarget = {}
  const activeTarget = {}
  const removeHandler = getRequiredCanvasHandler({
    canvas: harness.canvas,
    eventName: 'object:removed'
  })

  removeHandler({ target: unrelatedTarget })
  removeHandler({ target: activeTarget })

  expect(finishGestureForTargetSpy).toHaveBeenNthCalledWith(1, { target: unrelatedTarget })
  expect(finishGestureForTargetSpy).toHaveBeenNthCalledWith(2, { target: activeTarget })
  expect(harness.lifecycleController.clearResizeStarts).toHaveBeenCalledTimes(1)
})

it('при pointercancel, touchcancel и blur прерывает Fabric transform и очищает начальные состояния resize', () => {
  const interruptGestureSpy = jest
    .spyOn(ShapeScaleInteractionController.prototype, 'interruptGesture')
    .mockReturnValue(true)
  const harness = createRoutingHarness()
  const pointerCancelEvent = new Event('pointercancel')
  const touchCancelEvent = new Event('touchcancel')

  window.dispatchEvent(pointerCancelEvent)
  window.dispatchEvent(touchCancelEvent)
  window.dispatchEvent(new Event('blur'))

  expect(interruptGestureSpy).toHaveBeenCalledTimes(3)
  expect(interruptGestureSpy).toHaveBeenNthCalledWith(1, { event: pointerCancelEvent })
  expect(interruptGestureSpy).toHaveBeenNthCalledWith(2, { event: touchCancelEvent })
  expect(interruptGestureSpy).toHaveBeenNthCalledWith(3)
  expect(harness.lifecycleController.clearResizeStarts).toHaveBeenCalledTimes(3)
})
