import ObjectSizeIndicatorManager from '../../../src/editor/ui/object-size-indicator'
import CursorIndicator from '../../../src/editor/ui/cursor-indicator'
import { createManagerTestMocks } from '../editor/manager-test-mocks'

/** CSS-класс тестового cursor indicator. */
export const TEST_CURSOR_INDICATOR_CLASS = 'test-cursor-indicator'

/** DOMRect-подобные размеры элемента для jsdom. */
export interface ElementBoundsStub {
  left?: number
  top?: number
  width?: number
  height?: number
}

/** Минимальный target для проверки индикатора размеров объекта. */
export interface ObjectSizeIndicatorTargetStub {
  id: string
  locked?: boolean
  lockScalingX?: boolean
  lockScalingY?: boolean
  getScaledWidth: jest.Mock<number, []>
  getScaledHeight: jest.Mock<number, []>
}

/** Минимальная форма Fabric transform event, нужная ObjectSizeIndicatorManager. */
export interface ObjectSizeTransformEventStub {
  e: MouseEvent
  transform: {
    target?: ObjectSizeIndicatorTargetStub
  }
}

/** Минимальная форма Fabric mouse:move event, нужная ObjectSizeIndicatorManager. */
export interface ObjectSizeMouseMoveEventStub {
  e: MouseEvent
}

/** Fixture для CursorIndicator unit-тестов. */
export interface CursorIndicatorTestFixture {
  indicator: CursorIndicator
  parent: HTMLElement
}

/** Fixture для ObjectSizeIndicatorManager unit-тестов. */
export interface ObjectSizeIndicatorManagerTestFixture {
  manager: ObjectSizeIndicatorManager
  mockCanvas: ReturnType<typeof createManagerTestMocks>['mockCanvas']
  mockEditor: ReturnType<typeof createManagerTestMocks>['mockEditor']
  target: ObjectSizeIndicatorTargetStub
}

/** Создаёт DOMRect-совместимый объект для jsdom. */
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

/** Подменяет getBoundingClientRect у DOM-элемента. */
export const mockElementBounds = ({
  element,
  bounds
}: {
  element: Element
  bounds: ElementBoundsStub
}): void => {
  jest.spyOn(element, 'getBoundingClientRect').mockReturnValue(createBoundsStub(bounds))
}

/** Создаёт CursorIndicator с управляемыми размерами parent и самого индикатора. */
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

/** Создаёт target с управляемыми scaled-размерами. */
export const createObjectSizeIndicatorTarget = ({
  id = 'test-object',
  width = 120,
  height = 80,
  locked = false,
  lockScalingX = false,
  lockScalingY = false
}: {
  id?: string
  width?: number
  height?: number
  locked?: boolean
  lockScalingX?: boolean
  lockScalingY?: boolean
} = {}): ObjectSizeIndicatorTargetStub => ({
  id,
  locked,
  lockScalingX,
  lockScalingY,
  getScaledWidth: jest.fn(() => width),
  getScaledHeight: jest.fn(() => height)
})

/** Создаёт ObjectSizeIndicatorManager с минимальными editor/canvas mocks. */
export const createObjectSizeIndicatorManagerFixture = ({
  width,
  height
}: {
  width?: number
  height?: number
} = {}): ObjectSizeIndicatorManagerTestFixture => {
  const {
    mockCanvas,
    mockEditor
  } = createManagerTestMocks()
  mockEditor.options.showObjectSizeOnScale = true

  const target = createObjectSizeIndicatorTarget({ width, height })
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

/** Возвращает первый обработчик canvas-события или падает, если его нет. */
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

/** Создаёт событие Fabric object:scaling/object:resizing для ObjectSizeIndicatorManager. */
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

/** Создаёт событие Fabric mouse:move для ObjectSizeIndicatorManager. */
export const createObjectSizeMouseMoveEvent = ({
  clientX = 200,
  clientY = 140
}: {
  clientX?: number
  clientY?: number
} = {}): ObjectSizeMouseMoveEventStub => ({
  e: new MouseEvent('mousemove', { clientX, clientY })
})
