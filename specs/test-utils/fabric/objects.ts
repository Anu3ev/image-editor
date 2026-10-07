import {
  ActiveSelection,
  Group
} from 'fabric'

/**
 * Returns a deep copy of customData if the object stores it as a plain object.
 */
const cloneCustomData = (object: any) => {
  if (!object.customData || typeof object.customData !== 'object') {
    return object.customData
  }

  return JSON.parse(JSON.stringify(object.customData))
}

/**
 * Creates a basic Fabric-like object with a clone/set/setCoords contract for unit tests.
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
      cloned.customData = cloneCustomData(mockObject)
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
 * Creates an ActiveSelection mock with the same clone/set/forEachObject contract
 * used by production code when working with selections.
 */
export const createMockActiveSelection = (objects: any[], props: any = {}) => {
  const mockSelection = new ActiveSelection(objects, props) as any

  mockSelection.clone = jest.fn().mockImplementation(async() => {
    const clonedObjects = objects.map((object) => {
      const clonedObject = {
        ...object,
        customData: cloneCustomData(object)
      }

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
 * Creates a Group using the actual Fabric mock class so tests stay consistent
 * with the object container's runtime contract.
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
 * Creates a ClipboardEvent-like object with configurable clipboardData.
 */
export const createMockClipboardEvent = (data: any = {}) => ({
  clipboardData: {
    items: data.items || [],
    getData: data.getData || jest.fn().mockReturnValue(''),
    ...data
  }
} as ClipboardEvent)

/**
 * Returns an object that fails on clone().
 * Used for negative clipboard/history scenarios.
 */
export const createFailingMockObject = (errorMessage = 'Mock clone failed') => {
  const mockObject = createMockFabricObject({ type: 'rect', id: 'failing-object' })
  mockObject.clone.mockRejectedValue(new Error(errorMessage))
  return mockObject
}

/**
 * Returns a ClipboardEvent without clipboardData for fail-fast scenarios.
 */
export const createEmptyClipboardEvent = () => ({
  clipboardData: null
} as any as ClipboardEvent)
