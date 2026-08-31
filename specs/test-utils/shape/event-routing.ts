import { Rect } from 'fabric'
import SelectionManager from '../../../src/editor/selection-manager'
import ShapeEventController from '../../../src/editor/shape-manager/events/shape-event-controller'
import { ShapeGroupObject } from '../../../src/editor/shape-manager/domain/shape-group'
import { createMockCanvas } from './factories'

/** События окна, обработчики которых проверяются в тестах ShapeEventController. */
export type ShapeEventWindowEventName = 'pointercancel' | 'touchcancel' | 'blur'

/** Наблюдаемые зависимости ShapeEventController для проверки маршрутизации событий. */
export type ShapeEventRoutingHarness = Readonly<{
  canvas: ReturnType<typeof createMockCanvas>
  child: Rect
  controller: ShapeEventController
  editingController: {
    handleMouseDown: jest.Mock
  }
  group: ShapeGroupObject
  secondGroup: ShapeGroupObject
  lifecycleController: {
    beginResize: jest.Mock
    captureResizeStart: jest.Mock
    clearResizeStarts: jest.Mock
    finishResize: jest.Mock
  }
  handleShapeSelectionScaleStepMock: jest.MockedFunction<
    SelectionManager['handleShapeSelectionScaleStep']
  >
  commitShapeSelectionScaleMock: jest.MockedFunction<
    SelectionManager['commitShapeSelectionScale']
  >
  scalingController: {
    handleObjectScaling: jest.Mock
    handleCanvasMouseMove: jest.Mock
    handleObjectModified: jest.Mock
    clearActiveSelectionState: jest.Mock
    clearState: jest.Mock
    commitActiveSelectionGroupScaling: jest.Mock
    resolveActiveSelectionCommittedScale: jest.Mock
  }
}>

/** Возвращает обязательный обработчик window-события из вызовов addEventListener. */
export function getRequiredShapeWindowListener({
  addEventListenerSpy,
  eventName
}: {
  addEventListenerSpy: jest.SpyInstance
  eventName: ShapeEventWindowEventName
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
export function createShapeEventRoutingHarness(): ShapeEventRoutingHarness {
  const canvas = createMockCanvas()
  const child = new Rect({
    width: 20,
    height: 20
  })
  const group = new ShapeGroupObject([child], {})
  const secondGroup = new ShapeGroupObject([new Rect({ width: 30, height: 30 })], {})
  const selectionManager: SelectionManager = Object.create(SelectionManager.prototype)
  const handleShapeSelectionScaleStepMock: ShapeEventRoutingHarness['handleShapeSelectionScaleStepMock'] = jest.fn<
    ReturnType<SelectionManager['handleShapeSelectionScaleStep']>,
    Parameters<SelectionManager['handleShapeSelectionScaleStep']>
  >(() => false)
  const commitShapeSelectionScaleMock: ShapeEventRoutingHarness['commitShapeSelectionScaleMock'] = jest.fn<
    ReturnType<SelectionManager['commitShapeSelectionScale']>,
    Parameters<SelectionManager['commitShapeSelectionScale']>
  >(() => false)

  selectionManager.handleShapeSelectionScaleStep = handleShapeSelectionScaleStepMock
  selectionManager.commitShapeSelectionScale = commitShapeSelectionScaleMock
  const scalingController = {
    handleObjectScaling: jest.fn(),
    handleCanvasMouseMove: jest.fn(),
    handleObjectModified: jest.fn(),
    clearActiveSelectionState: jest.fn(),
    clearState: jest.fn(),
    commitActiveSelectionGroupScaling: jest.fn(() => true),
    resolveActiveSelectionCommittedScale: jest.fn(() => ({ scaleX: 1, scaleY: 1 }))
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
      editor: {
        canvas,
        canvasManager: {
          applyObjectPlacement: jest.fn(),
          getObjectPlacement: jest.fn(() => ({
            left: 0,
            top: 0,
            originX: 'center',
            originY: 'center'
          }))
        },
        selectionManager
      },
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

  return {
    canvas,
    child,
    controller,
    editingController,
    commitShapeSelectionScaleMock,
    group,
    lifecycleController,
    handleShapeSelectionScaleStepMock,
    scalingController,
    secondGroup
  }
}
