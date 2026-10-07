import ObjectSizeIndicatorManager from '../../../src/editor/ui/object-size-indicator'
import CursorIndicator from '../../../src/editor/ui/cursor-indicator'
import { createManagerTestMocks } from '../editor/manager-test-mocks'

/** CSS class of the test cursor indicator. */
export const TEST_CURSOR_INDICATOR_CLASS = 'test-cursor-indicator'

/** DOMRect-like element dimensions for jsdom. */
export interface ElementBoundsStub {
  left?: number
  top?: number
  width?: number
  height?: number
}

/** Minimal target for testing the object size indicator. */
export interface ObjectSizeIndicatorTargetStub {
  id: string
  locked?: boolean
  lockScalingX?: boolean
  lockScalingY?: boolean
  getScaledWidth: jest.Mock<number, []>
  getScaledHeight: jest.Mock<number, []>
  getObjectDisplaySize?: jest.Mock<{ width: number; height: number }, []>
}

/** Minimal shape of the Fabric transform event required by ObjectSizeIndicatorManager. */
export interface ObjectSizeTransformEventStub {
  e: MouseEvent
  transform: {
    target?: ObjectSizeIndicatorTargetStub
  }
}

/** Minimal shape of the Fabric mouse:move event required by ObjectSizeIndicatorManager. */
export interface ObjectSizeMouseMoveEventStub {
  e: MouseEvent
}

/** Fixture for CursorIndicator unit tests. */
export interface CursorIndicatorTestFixture {
  indicator: CursorIndicator
  parent: HTMLElement
}

/** Touch-like point for CursorIndicator unit checks. */
export interface CursorIndicatorTouchPointStub {
  clientX: number
  clientY: number
}

/** Fixture for ObjectSizeIndicatorManager unit tests. */
export interface ObjectSizeIndicatorManagerTestFixture {
  manager: ObjectSizeIndicatorManager
  mockCanvas: ReturnType<typeof createManagerTestMocks>['mockCanvas']
  mockEditor: ReturnType<typeof createManagerTestMocks>['mockEditor']
  target: ObjectSizeIndicatorTargetStub
}

/** Creates a DOMRect-compatible object for jsdom. */
export const createBoundsStub = ({
  left = 0,
  top = 0,
  width = 0,
  height = 0
}: ElementBoundsStub = {}): DOMRect => ({
  left,
  top,
  width,
  height,
  right: left + width,
  bottom: top + height,
  x: left,
  y: top,
  toJSON: () => ({})
} as DOMRect)

/** Replaces getBoundingClientRect on a DOM element. */
export const mockElementBounds = ({
  element,
  bounds
}: {
  element: Element
  bounds: ElementBoundsStub
}): void => {
  jest.spyOn(element, 'getBoundingClientRect').mockReturnValue(createBoundsStub(bounds))
}

/** Creates a CursorIndicator with controllable parent and indicator dimensions. */
export const createCursorIndicatorFixture = ({
  parentBounds,
  indicatorBounds
}: {
  parentBounds?: ElementBoundsStub
  indicatorBounds?: ElementBoundsStub
} = {}): CursorIndicatorTestFixture => {
  const parent = document.createElement('div')
  document.body.appendChild(parent)
  mockElementBounds({
    element: parent,
    bounds: parentBounds ?? { left: 100, top: 50, width: 800, height: 600 }
  })

  const indicator = new CursorIndicator({
    parent,
    className: TEST_CURSOR_INDICATOR_CLASS
  })
  mockElementBounds({
    element: indicator.el,
    bounds: indicatorBounds ?? { width: 50, height: 30 }
  })

  return {
    indicator,
    parent
  }
}

/** Creates a minimal TouchList-compatible stub. */
export const createTouchListStub = (
  points: CursorIndicatorTouchPointStub[]
): TouchList => ({
  length: points.length,
  item: (index: number) => points[index] ?? null
} as unknown as TouchList)

/** Creates a TouchEvent-compatible stub for CursorIndicator unit checks. */
export const createCursorTouchEventStub = ({
  touches = [],
  changedTouches = []
}: {
  touches?: CursorIndicatorTouchPointStub[]
  changedTouches?: CursorIndicatorTouchPointStub[]
} = {}): TouchEvent => ({
  touches: createTouchListStub(touches),
  changedTouches: createTouchListStub(changedTouches)
} as unknown as TouchEvent)

/** Creates a target with controllable scaled dimensions. */
export const createObjectSizeIndicatorTarget = ({
  id = 'test-object',
  width = 120,
  height = 80,
  indicatorSize,
  locked = false,
  lockScalingX = false,
  lockScalingY = false
}: {
  id?: string
  width?: number
  height?: number
  indicatorSize?: { width: number; height: number }
  locked?: boolean
  lockScalingX?: boolean
  lockScalingY?: boolean
} = {}): ObjectSizeIndicatorTargetStub => {
  const target: ObjectSizeIndicatorTargetStub = {
    id,
    locked,
    lockScalingX,
    lockScalingY,
    getScaledWidth: jest.fn(() => width),
    getScaledHeight: jest.fn(() => height)
  }

  if (indicatorSize) {
    target.getObjectDisplaySize = jest.fn(() => indicatorSize)
  }

  return target
}

/** Creates an ObjectSizeIndicatorManager with minimal editor/canvas mocks. */
export const createObjectSizeIndicatorManagerFixture = ({
  width,
  height,
  indicatorSize
}: {
  width?: number
  height?: number
  indicatorSize?: { width: number; height: number }
} = {}): ObjectSizeIndicatorManagerTestFixture => {
  const {
    mockCanvas,
    mockEditor
  } = createManagerTestMocks()
  mockEditor.options.showObjectSizeOnScale = true

  const target = createObjectSizeIndicatorTarget({ width, height, indicatorSize })
  const manager = new ObjectSizeIndicatorManager({ editor: mockEditor })
  mockElementBounds({
    element: manager.el,
    bounds: { width: 140, height: 24 }
  })

  return {
    manager,
    mockCanvas,
    mockEditor,
    target
  }
}

/** Returns the first canvas event handler or fails if none exists. */
export const getCanvasHandler = <Event>(
  canvas: { __handlers: Record<string, Array<(event: Event) => void>> },
  eventName: string
): ((event: Event) => void) => {
  const handler = canvas.__handlers[eventName]?.[0]

  if (!handler) {
    throw new Error(`canvas handler "${eventName}" должен быть зарегистрирован`)
  }

  return handler
}

/** Creates a Fabric object:scaling/object:resizing event for ObjectSizeIndicatorManager. */
export const createObjectSizeTransformEvent = ({
  target,
  clientX = 200,
  clientY = 140
}: {
  target?: ObjectSizeIndicatorTargetStub
  clientX?: number
  clientY?: number
}): ObjectSizeTransformEventStub => ({
  e: new MouseEvent('mousemove', { clientX, clientY }),
  transform: {
    target
  }
})

/** Creates a Fabric mouse:move event for ObjectSizeIndicatorManager. */
export const createObjectSizeMouseMoveEvent = ({
  clientX = 200,
  clientY = 140
}: {
  clientX?: number
  clientY?: number
} = {}): ObjectSizeMouseMoveEventStub => ({
  e: new MouseEvent('mousemove', { clientX, clientY })
})
