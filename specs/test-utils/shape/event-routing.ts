import { Rect } from 'fabric'
import SelectionManager from '../../../src/editor/selection-manager'
import ShapeEventController from '../../../src/editor/shape-manager/events/shape-event-controller'
import { ShapeGroupObject } from '../../../src/editor/shape-manager/domain/shape-group'
import { createMockCanvas } from './factories'

/** Window events whose handlers are checked in ShapeEventController tests. */
export type ShapeEventWindowEventName = 'pointercancel' | 'touchcancel' | 'blur'

/** Observable ShapeEventController dependencies for testing event routing. */
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
  shouldSkipShapeSelectionScaleCommitMock: jest.MockedFunction<
    SelectionManager['shouldSkipShapeSelectionScaleCommit']
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

/** SelectionManager and its observable handlers for shape event routing. */
type ShapeSelectionRoutingHarness = Pick<
  ShapeEventRoutingHarness,
  | 'commitShapeSelectionScaleMock'
  | 'handleShapeSelectionScaleStepMock'
  | 'shouldSkipShapeSelectionScaleCommitMock'
> & Readonly<{
  selectionManager: SelectionManager
}>

/** Creates a SelectionManager with observable shape-scaling handlers. */
function createShapeSelectionRoutingHarness(): ShapeSelectionRoutingHarness {
  const selectionManager: SelectionManager = Object.create(SelectionManager.prototype)
  const handleShapeSelectionScaleStepMock: ShapeEventRoutingHarness['handleShapeSelectionScaleStepMock'] = jest.fn<
    ReturnType<SelectionManager['handleShapeSelectionScaleStep']>,
    Parameters<SelectionManager['handleShapeSelectionScaleStep']>
  >(() => false)
  const commitShapeSelectionScaleMock: ShapeEventRoutingHarness['commitShapeSelectionScaleMock'] = jest.fn<
    ReturnType<SelectionManager['commitShapeSelectionScale']>,
    Parameters<SelectionManager['commitShapeSelectionScale']>
  >(() => false)
  const shouldSkipShapeSelectionScaleCommitMock:
    ShapeEventRoutingHarness['shouldSkipShapeSelectionScaleCommitMock'] = jest.fn<
      ReturnType<SelectionManager['shouldSkipShapeSelectionScaleCommit']>,
      Parameters<SelectionManager['shouldSkipShapeSelectionScaleCommit']>
    >(() => false)

  selectionManager.handleShapeSelectionScaleStep = handleShapeSelectionScaleStepMock
  selectionManager.commitShapeSelectionScale = commitShapeSelectionScaleMock
  selectionManager.shouldSkipShapeSelectionScaleCommit = shouldSkipShapeSelectionScaleCommitMock

  return {
    selectionManager,
    handleShapeSelectionScaleStepMock,
    commitShapeSelectionScaleMock,
    shouldSkipShapeSelectionScaleCommitMock
  }
}

/** Creates an observable scaling dependency for ShapeEventController. */
function createShapeEventScalingController(): ShapeEventRoutingHarness['scalingController'] {
  return {
    handleObjectScaling: jest.fn(),
    handleCanvasMouseMove: jest.fn(),
    handleObjectModified: jest.fn(),
    clearActiveSelectionState: jest.fn(),
    clearState: jest.fn(),
    commitActiveSelectionGroupScaling: jest.fn(() => true),
    resolveActiveSelectionCommittedScale: jest.fn(() => ({
      preserveSceneGeometryOnCommit: false,
      scaleX: 1,
      scaleY: 1
    }))
  }
}

/** Creates a ShapeEventController and connects it to the prepared test dependencies. */
function createBoundShapeEventController({
  canvas,
  selectionManager,
  scalingController,
  editingController,
  lifecycleController
}: {
  canvas: ShapeEventRoutingHarness['canvas']
  selectionManager: SelectionManager
  scalingController: ShapeEventRoutingHarness['scalingController']
  editingController: ShapeEventRoutingHarness['editingController']
  lifecycleController: ShapeEventRoutingHarness['lifecycleController']
}): ShapeEventController {
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

  return controller
}

/** Returns the registered ShapeEventController window event handler. */
export function getRequiredShapeWindowListener({
  addEventListenerSpy,
  eventName
}: {
  addEventListenerSpy: jest.SpyInstance
  eventName: ShapeEventWindowEventName
}): EventListener {
  const registration = addEventListenerSpy.mock.calls.find(([currentName]) => currentName === eventName)
  const listener = registration?.[1]
  if (typeof listener !== 'function') {
    throw new Error(`Для ${eventName} должен быть зарегистрирован обработчик`)
  }

  return listener
}

/** Creates an isolated ShapeEventController with observable dependencies. */
export function createShapeEventRoutingHarness(): ShapeEventRoutingHarness {
  const canvas = createMockCanvas()
  const child = new Rect({
    width: 20,
    height: 20
  })
  const group = new ShapeGroupObject([child], {})
  const secondGroup = new ShapeGroupObject([new Rect({ width: 30, height: 30 })], {})
  const selectionHarness = createShapeSelectionRoutingHarness()
  const scalingController = createShapeEventScalingController()
  const editingController = {
    handleMouseDown: jest.fn()
  }
  const lifecycleController = {
    beginResize: jest.fn(),
    captureResizeStart: jest.fn(),
    clearResizeStarts: jest.fn(),
    finishResize: jest.fn()
  }
  const controller = createBoundShapeEventController({
    canvas,
    selectionManager: selectionHarness.selectionManager,
    scalingController,
    editingController,
    lifecycleController
  })

  return {
    canvas,
    child,
    controller,
    editingController,
    commitShapeSelectionScaleMock: selectionHarness.commitShapeSelectionScaleMock,
    group,
    lifecycleController,
    handleShapeSelectionScaleStepMock: selectionHarness.handleShapeSelectionScaleStepMock,
    scalingController,
    shouldSkipShapeSelectionScaleCommitMock: selectionHarness.shouldSkipShapeSelectionScaleCommitMock,
    secondGroup
  }
}
