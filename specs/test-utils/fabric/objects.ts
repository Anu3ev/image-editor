import {
  ActiveSelection,
  Group
} from 'fabric'

/**
 * Создаёт базовый fabric-like object с clone/set/setCoords контрактом для юнит-тестов.
 */
export const createMockFabricObject = (props: any = {}) => {
  const mockObject = {
    type: 'object',
    id: 'mock-object',
    left: 0,
    top: 0,
    locked: false,
    evented: true,
    ...props,
    clone: jest.fn().mockImplementation(async() => {
      const cloned = { ...mockObject, ...JSON.parse(JSON.stringify(props)) }
      cloned.set = jest.fn().mockImplementation((newProps) => {
        Object.assign(cloned, newProps)
      })
      cloned.setCoords = jest.fn()
      cloned.toObject = jest.fn().mockReturnValue({ ...props })
      cloned.toCanvasElement = jest.fn().mockReturnValue({
        toDataURL: () => 'data:image/png;base64,mockData'
      })
      return cloned
    }),
    set: jest.fn().mockImplementation((newProps) => {
      Object.assign(mockObject, newProps)
    }),
    setCoords: jest.fn(),
    toObject: jest.fn().mockReturnValue(props),
    toCanvasElement: jest.fn().mockReturnValue({
      toDataURL: () => 'data:image/png;base64,mockData'
    })
  }
  return mockObject
}

/**
 * Создаёт мок ActiveSelection с тем же контрактом clone/set/forEachObject,
 * который используется production-кодом при работе с выделением.
 */
export const createMockActiveSelection = (objects: any[], props: any = {}) => {
  const mockSelection = new ActiveSelection(objects, props) as any

  mockSelection.clone = jest.fn().mockImplementation(async() => {
    const clonedObjects = objects.map((object) => {
      const clonedObject = { ...object }

      clonedObject.set = jest.fn().mockImplementation((newProps) => {
        Object.assign(clonedObject, newProps)
      })
      clonedObject.setCoords = jest.fn()

      return clonedObject
    })
    const clonedProps = JSON.parse(JSON.stringify(props))
    const cloned = new ActiveSelection(clonedObjects, clonedProps) as any
    cloned.set = jest.fn().mockImplementation((newProps) => {
      Object.assign(cloned, newProps)
    })
    cloned.setCoords = jest.fn()
    cloned.forEachObject = jest.fn().mockImplementation((callback) => {
      clonedObjects.forEach(callback)
    })
    cloned.toObject = jest.fn().mockReturnValue(clonedProps)
    cloned.toCanvasElement = jest.fn().mockReturnValue({
      toDataURL: () => 'data:image/png;base64,mockData'
    })
    return cloned
  })

  mockSelection.set = jest.fn().mockImplementation((newProps) => {
    Object.assign(mockSelection, newProps)
  })
  mockSelection.setCoords = jest.fn()

  mockSelection.toObject = jest.fn().mockReturnValue(props)
  mockSelection.toCanvasElement = jest.fn().mockReturnValue({
    toDataURL: () => 'data:image/png;base64,mockData'
  })

  mockSelection.forEachObject = jest.fn().mockImplementation((callback) => {
    objects.forEach(callback)
  })

  return mockSelection
}

/**
 * Создаёт Group на реальном mock-классе Fabric, чтобы тесты не расходились
 * с runtime-контрактом контейнера объектов.
 */
export const createMockGroup = (objects: any[] = [], props: any = {}) => {
  const mockGroup = new Group(objects, {
    id: props.id || 'mock-group',
    left: props.left || 0,
    top: props.top || 0,
    width: props.width || 100,
    height: props.height || 100,
    ...props
  })

  return mockGroup
}

/**
 * Создаёт ClipboardEvent-подобный объект с настраиваемым clipboardData.
 */
export const createMockClipboardEvent = (data: any = {}) => ({
  clipboardData: {
    items: data.items || [],
    getData: data.getData || jest.fn().mockReturnValue(''),
    ...data
  }
} as ClipboardEvent)

/**
 * Возвращает объект, который падает на clone().
 * Нужен для негативных сценариев clipboard/history.
 */
export const createFailingMockObject = (errorMessage = 'Mock clone failed') => {
  const mockObject = createMockFabricObject({ type: 'rect', id: 'failing-object' })
  mockObject.clone.mockRejectedValue(new Error(errorMessage))
  return mockObject
}

/**
 * Возвращает ClipboardEvent без clipboardData для fail-fast сценариев.
 */
export const createEmptyClipboardEvent = () => ({
  clipboardData: null
} as any as ClipboardEvent)
