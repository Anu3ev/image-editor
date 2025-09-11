import { CanvasOptions, ActiveSelection } from 'fabric'
import { ImageEditor } from '../../src/editor'

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
  scaleType: 'contain'
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
    clear: jest.fn(),
    add: jest.fn(),
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
      zoom: jest.fn(),
      resetObject: jest.fn(),
      resetZoom: jest.fn(),
      resetObjects: jest.fn(),
      calculateAndApplyDefaultZoom: jest.fn()
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
    montageArea: {
      width: 400,
      height: 300,
      left: 100,
      top: 50,
      set: jest.fn(),
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
    })
  }

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
      style: {}
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
      const cloned = { ...mockObject, ...props }
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
    const cloned = new ActiveSelection(objects, props) as any
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
