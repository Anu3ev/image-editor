import { CanvasOptions, ActiveSelection } from 'fabric'
import { ImageEditor } from '../../src/editor'
import HistoryManager from '../../src/editor/history-manager'

export type AnyFn = (...args: any[]) => any

// Базовые опции и хелпер полной конфигурации
export const basicOptions: Partial<CanvasOptions> = {
  editorContainerWidth: '800px',
  editorContainerHeight: '600px',
  canvasWrapperWidth: '700px',
  canvasWrapperHeight: '500px',
  canvasCSSWidth: '700px',
  canvasCSSHeight: '500px',
  montageAreaWidth: 400,
  montageAreaHeight: 300,
  scaleType: 'contain',
  showRotationAngle: false
}

export const createFullOptions = (partialOptions: Partial<CanvasOptions> = {}): CanvasOptions => ({
  ...basicOptions,
  ...partialOptions
} as CanvasOptions)

// Лёгкий стаб Canvas для юнит-тестов слушателей
export const createCanvasStub = () => {
  const handlers: Record<string, AnyFn[]> = {}
  const canvas = {
    on: jest.fn((evt: string, fn: AnyFn) => {
      handlers[evt] = handlers[evt] || []
      handlers[evt].push(fn)
    }),
    off: jest.fn((evt: string, fn: AnyFn) => {
      if (!handlers[evt]) return
      handlers[evt] = handlers[evt].filter((h) => h !== fn)
    }),
    set: jest.fn(),
    setCursor: jest.fn(),
    requestRenderAll: jest.fn(),
    setViewportTransform: jest.fn(),
    discardActiveObject: jest.fn(),
    getActiveObject: jest.fn(),
    getActiveObjects: jest.fn().mockReturnValue([]),
    setActiveObject: jest.fn(),
    viewportTransform: [1, 0, 0, 1, 0, 0] as any,
    getWidth: jest.fn().mockReturnValue(800),
    getHeight: jest.fn().mockReturnValue(600),
    getZoom: jest.fn().mockReturnValue(1),
    setDimensions: jest.fn(),
    fire: jest.fn(),
    renderAll: jest.fn(),
    centerObject: jest.fn(),
    zoomToPoint: jest.fn(),
    getCenterPoint: jest.fn().mockReturnValue({ x: 400, y: 300 }),
    getPointer: jest.fn().mockReturnValue({ x: 0, y: 0 }),
    clear: jest.fn(),
    add: jest.fn(),
    remove: jest.fn(),
    getObjects: jest.fn().mockReturnValue([]),
    clipPath: {
      set: jest.fn()
    },
    editorContainer: null as HTMLElement | null,
    wrapperEl: {
      parentNode: null as HTMLElement | null,
      style: {}
    },
    lowerCanvasEl: { style: {} },
    upperCanvasEl: { style: {} },
    __handlers: handlers
  }
  return canvas as any
}

// Стаб редактора для Listeners (без реального ImageEditor)
export const createEditorStub = () => {
  const canvas = createCanvasStub()
  return {
    canvas,
    historyManager: {
      skipHistory: false,
      saveState: jest.fn(),
      suspendHistory: jest.fn(),
      resumeHistory: jest.fn(),
      undo: jest.fn().mockResolvedValue(undefined),
      redo: jest.fn().mockResolvedValue(undefined)
    },
    interactionBlocker: {
      isBlocked: false,
      overlayMask: { id: 'overlay-mask' } as any,
      refresh: jest.fn()
    },
    canvasManager: {
      updateCanvas: jest.fn(),
      getObjects: jest.fn().mockReturnValue([
        { set: jest.fn() },
        { set: jest.fn() }
      ])
    },
    transformManager: {
      resetObject: jest.fn(),
      resetObjects: jest.fn(),
      fitObject: jest.fn()
    },
    zoomManager: {
      zoom: jest.fn(),
      setZoom: jest.fn(),
      handleMouseWheelZoom: jest.fn(),
      resetZoom: jest.fn(),
      calculateAndApplyDefaultZoom: jest.fn(),
      defaultZoom: 0.8,
      minZoom: 0.1,
      maxZoom: 2
    },
    panConstraintManager: {
      updateBounds: jest.fn(),
      getPanBounds: jest.fn().mockReturnValue({ minX: 0, maxX: 0, minY: 0, maxY: 0, canPan: true }),
      isPanAllowed: jest.fn().mockReturnValue(true),
      constrainPan: jest.fn((x, y) => ({ x, y })),
      getCurrentOffset: jest.fn().mockReturnValue({ x: 0, y: 0 })
    },
    layerManager: { bringToFront: jest.fn() },
    selectionManager: { selectAll: jest.fn() },
    deletionManager: { deleteSelectedObjects: jest.fn() },
    clipboardManager: { copy: jest.fn(), handlePasteEvent: jest.fn() },
    errorManager: {
      emitWarning: jest.fn(),
      emitError: jest.fn()
    },
    imageManager: {
      calculateScaleFactor: jest.fn().mockReturnValue(1),
      importImage: jest.fn()
    },
    backgroundManager: {
      backgroundObject: null,
      refresh: jest.fn()
    },
    shapeManager: {
      addRectangle: jest.fn()
    },
    montageArea: {
      width: 400,
      height: 300,
      left: 100,
      top: 50,
      set: jest.fn(),
      setCoords: jest.fn(),
      id: 'montage-area'
    },
    options: {
      editorContainer: null as HTMLElement | null,
      canvasBackstoreWidth: null,
      canvasBackstoreHeight: null,
      montageAreaWidth: 400,
      montageAreaHeight: 300,
      defaultScale: 0.8,
      minZoom: 0.1,
      maxZoom: 2,
      scaleType: 'contain'
    }
  } as any
}

// Хелпер для тестов ImageEditor: создаёт инстанс и подставляет моки менеджеров
export const createEditorWithMocks = (options: Partial<CanvasOptions> = {}) => {
  const fullOptions = createFullOptions(options)

  // Создаём редактор без вызова init в конструкторе
  const initSpy = jest.spyOn(ImageEditor.prototype, 'init').mockImplementation()
  const editor = new ImageEditor('test-canvas', fullOptions)
  initSpy.mockRestore()

  // Настройка моков менеджеров
  editor.canvasManager = {
    setEditorContainerWidth: jest.fn(),
    setEditorContainerHeight: jest.fn(),
    setCanvasWrapperWidth: jest.fn(),
    setCanvasWrapperHeight: jest.fn(),
    setCanvasCSSWidth: jest.fn(),
    setCanvasCSSHeight: jest.fn(),
    setDefaultScale: jest.fn()
  } as any

  editor.imageManager = {
    importImage: jest.fn().mockResolvedValue(undefined),
    calculateScaleFactor: jest.fn().mockReturnValue(1)
  } as any

  editor.historyManager = {
    loadStateFromFullState: jest.fn(),
    saveState: jest.fn(),
    suspendHistory: jest.fn(),
    resumeHistory: jest.fn()
  } as any

  editor.backgroundManager = {
    backgroundObject: null,
    refresh: jest.fn()
  } as any;

  editor.shapeManager = {
    addRectangle: jest.fn()
  } as any;

  editor.panConstraintManager = {
    updateBounds: jest.fn(),
    getPanBounds: jest.fn().mockReturnValue({ minX: 0, maxX: 0, minY: 0, maxY: 0, canPan: true }),
    isPanAllowed: jest.fn().mockReturnValue(true),
    constrainPan: jest.fn((x, y) => ({ x, y })),
    getCurrentOffset: jest.fn().mockReturnValue({ x: 0, y: 0 })
  } as any;

  editor.zoomManager = {
    calculateAndApplyDefaultZoom: jest.fn(),
    resetZoom: jest.fn(),
    setZoom: jest.fn(),
    zoom: jest.fn(),
    defaultZoom: 0.8,
    minZoom: 0.1,
    maxZoom: 2
  } as any;

  // Приватные методы, которые вызываются в init
  (editor as any)['_createMontageArea'] = jest.fn();
  (editor as any)['_createClippingArea'] = jest.fn()

  return editor
}

// Хелпер для создания мокированного DOM контейнера
export const createMockContainer = (width = 800, height = 600): HTMLElement => {
  const container = document.createElement('div')
  Object.defineProperty(container, 'clientWidth', { value: width, writable: true })
  Object.defineProperty(container, 'clientHeight', { value: height, writable: true })
  return container
}

// Создание canvas мока с реалистичным поведением для тестов слоёв
export const createLayerAwareCanvasMock = () => {
  let objects: any[] = []

  const canvas = {
    ...createCanvasStub(),

    // Реалистичное управление объектами
    getObjects: jest.fn(() => [...objects]),
    setObjects: (newObjects: any[]) => {
      objects = [...newObjects]
    },
    add: jest.fn((obj: any) => {
      objects.push(obj)
    }),
    remove: jest.fn((obj: any) => {
      const index = objects.indexOf(obj)
      if (index > -1) {
        objects.splice(index, 1)
      }
    }),

    // Реалистичные методы перемещения слоёв
    bringObjectToFront: jest.fn((obj: any) => {
      const index = objects.indexOf(obj)
      if (index > -1) {
        objects.splice(index, 1)
        objects.push(obj)
      }
    }),

    bringObjectForward: jest.fn((obj: any) => {
      const index = objects.indexOf(obj)
      if (index > -1 && index < objects.length - 1) {
        objects.splice(index, 1)
        objects.splice(index + 1, 0, obj)
      }
    }),

    sendObjectToBack: jest.fn((obj: any) => {
      const index = objects.indexOf(obj)
      if (index > -1) {
        objects.splice(index, 1)
        objects.unshift(obj)
      }
    }),

    sendObjectBackwards: jest.fn((obj: any) => {
      const index = objects.indexOf(obj)
      if (index > 0) {
        objects.splice(index, 1)
        objects.splice(index - 1, 0, obj)
      }
    }),

    // Метод для перемещения объекта на конкретную позицию
    moveObjectTo: jest.fn((obj: any, targetIndex: number) => {
      const currentIndex = objects.indexOf(obj)
      if (currentIndex > -1) {
        objects.splice(currentIndex, 1)
        objects.splice(targetIndex, 0, obj)
      }
    }),

    // Метод для получения индекса объекта
    indexOf: jest.fn((obj: any) => objects.indexOf(obj)),

    // Дополнительные методы для BackgroundManager тестов
    insertAt: jest.fn((obj: any, index: number) => {
      objects.splice(index, 0, obj)
    }),

    // Методы для работы с активными объектами
    getActiveObject: jest.fn(() => null), // По умолчанию нет активного объекта
    getActiveObjects: jest.fn(() => []) // По умолчанию нет активных объектов
  }

  // Добавляем метод для тестов чтобы напрямую очистить объекты
  canvas.clear = jest.fn(() => {
    objects = []
  })

  return canvas as any
}

// Хелпер для создания тестовых объектов для layer-тестов
export const createTestObjects = (ids: number[]) => ids.map((id) => ({ id: `obj${id}` })) as any[]

// Хелпер для получения порядка объектов из canvas
export const getObjectOrder = (objects: any[]) => objects.map((obj) => parseInt(obj.id.replace('obj', '')))

// Хелпер для создания полного набора моков для тестов менеджеров
export const createManagerTestMocks = (containerWidth = 800, containerHeight = 600, options: { withLayerAwareCanvas?: boolean } = {}) => {
  const mockContainer = createMockContainer(containerWidth, containerHeight)

  const mockMontageArea = {
    width: 400,
    height: 300,
    left: 100,
    top: 50,
    set: jest.fn(),
    setCoords: jest.fn(),
    getBoundingRect: jest.fn().mockReturnValue({
      left: 100,
      top: 50,
      width: 400,
      height: 300
    }),
    id: 'montage-area'
  }

  // Создаём обычный или layer-aware canvas в зависимости от опций
  const baseCanvas = options.withLayerAwareCanvas
    ? createLayerAwareCanvasMock()
    : createCanvasStub()

  const mockCanvas = {
    ...baseCanvas,
    editorContainer: mockContainer,
    wrapperEl: {
      parentNode: mockContainer,
      style: {},
      appendChild: jest.fn(),
      getBoundingClientRect: jest.fn().mockReturnValue({
        left: 0,
        top: 0,
        width: containerWidth,
        height: containerHeight
      })
    }
  }

  const mockEditor = {
    ...createEditorStub(),
    canvas: mockCanvas,
    montageArea: mockMontageArea,
    options: {
      ...createEditorStub().options,
      editorContainer: mockContainer
    }
  }

  return {
    mockContainer,
    mockMontageArea,
    mockCanvas,
    mockEditor
  }
}

export type HistoryManagerTestSetupOptions = {
  maxHistoryLength?: number
  initialCanvasWidth?: number
  initialCanvasHeight?: number
}

export const createHistoryManagerTestSetup = (
  options: HistoryManagerTestSetupOptions = {}
) => {
  const {
    maxHistoryLength = 5,
    initialCanvasWidth = 800,
    initialCanvasHeight = 600
  } = options

  let currentWidth = initialCanvasWidth
  let currentHeight = initialCanvasHeight
  let objects: any[] = []

  const mockCanvas = {
    toDatalessObject: jest.fn(),
    loadFromJSON: jest.fn().mockImplementation(
      async(state: any, reviver?: (serializedObj: any, fabricObject: any) => void) => {
        const serializedObjects = state?.objects || []
        objects = serializedObjects.map((serializedObj: any) => {
          const fabricObject = { ...serializedObj }
          if (reviver) {
            reviver(serializedObj, fabricObject)
          }
          return fabricObject
        })

        if (typeof state?.width === 'number') {
          currentWidth = state.width
        }
        if (typeof state?.height === 'number') {
          currentHeight = state.height
        }
      }
    ),
    getObjects: jest.fn(() => objects),
    getWidth: jest.fn(() => currentWidth),
    getHeight: jest.fn(() => currentHeight),
    fire: jest.fn(),
    renderAll: jest.fn(),
    requestRenderAll: jest.fn(),
    enableRetinaScaling: false,
    viewportTransform: [1, 0, 0, 1, 0, 0] as any
  } as any

  Object.defineProperty(mockCanvas, 'width', {
    get: () => currentWidth,
    configurable: true
  })

  Object.defineProperty(mockCanvas, 'height', {
    get: () => currentHeight,
    configurable: true
  })

  const mockEditor = {
    canvas: mockCanvas,
    canvasManager: {
      updateCanvas: jest.fn()
    },
    interactionBlocker: {
      overlayMask: { id: 'overlay-mask', visible: true } as any,
      refresh: jest.fn()
    },
    backgroundManager: {
      removeBackground: jest.fn(),
      backgroundObject: null,
      refresh: jest.fn()
    },
    montageArea: {
      id: 'montage-area',
      width: 400,
      height: 300
    } as any,
    errorManager: {
      emitError: jest.fn()
    },
    options: {
      maxHistoryLength
    }
  } as any

  const historyManager = new HistoryManager({ editor: mockEditor as any })
  const simpleDiffPatcher = {
    diff: jest.fn((prev: any, next: any) => {
      const prevStr = JSON.stringify(prev)
      const nextStr = JSON.stringify(next)
      if (prevStr === nextStr) {
        return null
      }
      return { next: JSON.parse(nextStr) }
    }),
    patch: jest.fn((state: any, diff: any) => {
      if (!diff) {
        return JSON.parse(JSON.stringify(state))
      }
      return JSON.parse(JSON.stringify(diff.next))
    }),
    clone: jest.fn(),
    unpatch: jest.fn()
  }

  historyManager.diffPatcher = simpleDiffPatcher as any

  return {
    historyManager,
    mockEditor,
    mockCanvas,
    getCanvasObjects: () => objects,
    setCanvasObjects: (nextObjects: any[]) => {
      objects = nextObjects
    },
    setCanvasSize: (width: number, height: number) => {
      currentWidth = width
      currentHeight = height
    }
  }
}

// Функции для создания мок-объектов fabric для тестов
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
      // Глубокое копирование для избежания shared references
      const cloned = { ...mockObject, ...JSON.parse(JSON.stringify(props)) }
      // Создаем новый мок для клонированного объекта
      cloned.set = jest.fn().mockImplementation((newProps) => {
        Object.assign(cloned, newProps)
      })
      cloned.toObject = jest.fn().mockReturnValue({ ...props })
      cloned.toCanvasElement = jest.fn().mockReturnValue({
        toDataURL: () => 'data:image/png;base64,mockData'
      })
      return cloned
    }),
    set: jest.fn().mockImplementation((newProps) => {
      Object.assign(mockObject, newProps)
    }),
    toObject: jest.fn().mockReturnValue(props),
    toCanvasElement: jest.fn().mockReturnValue({
      toDataURL: () => 'data:image/png;base64,mockData'
    })
  }
  return mockObject
}

export const createMockActiveSelection = (objects: any[], props: any = {}) => {
  const mockSelection = new ActiveSelection(objects, props) as any

  // Добавляем методы моков
  mockSelection.clone = jest.fn().mockImplementation(async() => {
    // Глубокое копирование для избежания shared references
    const clonedObjects = objects.map(obj => ({ ...obj }))
    const clonedProps = JSON.parse(JSON.stringify(props))
    const cloned = new ActiveSelection(clonedObjects, clonedProps) as any
    cloned.set = jest.fn().mockImplementation((newProps) => {
      Object.assign(cloned, newProps)
    })
    return cloned
  })

  mockSelection.set = jest.fn().mockImplementation((newProps) => {
    Object.assign(mockSelection, newProps)
  })

  mockSelection.toObject = jest.fn().mockReturnValue(props)
  mockSelection.toCanvasElement = jest.fn().mockReturnValue({
    toDataURL: () => 'data:image/png;base64,mockData'
  })

  mockSelection.forEachObject = jest.fn().mockImplementation((callback) => {
    objects.forEach(callback)
  })

  return mockSelection
}

export const createMockClipboardEvent = (data: any = {}) => ({
  clipboardData: {
    items: data.items || [],
    getData: data.getData || jest.fn().mockReturnValue(''),
    ...data
  }
} as ClipboardEvent)

// Хелперы для создания failing моков
export const createFailingMockObject = (errorMessage = 'Mock clone failed') => {
  const mockObject = createMockFabricObject({ type: 'rect', id: 'failing-object' })
  mockObject.clone.mockRejectedValue(new Error(errorMessage))
  return mockObject
}

export const createEmptyClipboardEvent = () => ({
  clipboardData: null
} as any as ClipboardEvent)

// Хелперы для создания мок объектов фона
export const createMockBackgroundRect = (props: any = {}) => ({
  ...createMockFabricObject({
    type: 'rect',
    id: 'background',
    backgroundType: 'color',
    backgroundId: `background-${Math.random().toString(36).slice(2, 7)}`,
    fill: '#ffffff',
    selectable: false,
    evented: false,
    ...props
  }),
  getBoundingRect: jest.fn().mockReturnValue({
    left: props.left || 100,
    top: props.top || 50,
    width: props.width || 400,
    height: props.height || 300
  })
})

export const createMockBackgroundImage = (props: any = {}) => ({
  ...createMockFabricObject({
    type: 'image',
    id: 'background',
    backgroundType: 'image',
    backgroundId: `background-${Math.random().toString(36).slice(2, 7)}`,
    selectable: false,
    evented: false,
    ...props
  }),
  getBoundingRect: jest.fn().mockReturnValue({
    left: props.left || 100,
    top: props.top || 50,
    width: props.width || 400,
    height: props.height || 300
  })
})

// Глобальные моки браузерных API для тестов буфера обмена
export const mockNavigatorClipboard = {
  writeText: jest.fn(),
  write: jest.fn(),
  readText: jest.fn()
}

export const mockClipboardItem = jest.fn().mockImplementation((data) => ({
  types: Object.keys(data),
  getType: jest.fn()
}))

// Мок FileReader для тестов с файлами из буфера обмена
export class MockFileReader {
  result: string | null = null

  onload: ((event: any) => void) | null = null

  readAsDataURL(_blob: Blob): void {
    setTimeout(() => {
      this.result = 'data:image/png;base64,mockBase64Data'
      if (this.onload) {
        this.onload({ target: this })
      }
    }, 0)
  }
}

// Мок DOMParser для HTML буфера обмена
export const mockQuerySelector = jest.fn()
export const mockDOMParser = {
  parseFromString: jest.fn().mockReturnValue({
    querySelector: mockQuerySelector
  })
}

// Мок atob для декодирования base64
export const mockAtob = jest.fn().mockImplementation((_base64: string) => 'mock-binary-data')

// Мок Blob для создания файлов
export const mockBlob = jest.fn().mockImplementation((data, options) => ({
  type: options?.type || 'application/octet-stream',
  size: 100
}))

// Функция для установки всех глобальных моков браузерных API
export const setupBrowserMocks = () => {
  Object.defineProperty(global, 'navigator', {
    value: { clipboard: mockNavigatorClipboard },
    writable: true
  })

  Object.defineProperty(global, 'ClipboardItem', {
    value: mockClipboardItem,
    writable: true
  })

  Object.defineProperty(global, 'FileReader', {
    value: MockFileReader,
    writable: true
  })

  Object.defineProperty(global, 'DOMParser', {
    value: jest.fn().mockImplementation(() => mockDOMParser),
    writable: true
  })

  Object.defineProperty(global, 'atob', {
    value: mockAtob,
    writable: true
  })

  Object.defineProperty(global, 'Blob', {
    value: mockBlob,
    writable: true
  })
}
