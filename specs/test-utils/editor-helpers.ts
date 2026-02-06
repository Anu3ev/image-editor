import { CanvasOptions, ActiveSelection, Group, Point, Textbox } from 'fabric'
import { ImageEditor } from '../../src/editor'
import HistoryManager from '../../src/editor/history-manager'
import TextManager from '../../src/editor/text-manager'
import FontManager from '../../src/editor/font-manager'
import { BackgroundTextbox } from '../../src/editor/text-manager/background-textbox'
import type { EditorFontDefinition } from '../../src/editor/types/font'

export type AnyFn = (...args: any[]) => any

/**
 * Делает устойчивую сериализацию значения с сортировкой ключей объектов.
 * @param value - значение для сериализации
 */
const stableStringify = ({ value }: { value: unknown }): string => {
  /**
   * Нормализует значение для стабильной сериализации.
   * @param value - исходное значение
   */
  const normalizeValue = ({ value: rawValue }: { value: unknown }): unknown => {
    if (Array.isArray(rawValue)) {
      const normalizedArray: unknown[] = []

      for (let index = 0; index < rawValue.length; index += 1) {
        normalizedArray.push(normalizeValue({ value: rawValue[index] }))
      }

      return normalizedArray
    }

    if (rawValue && typeof rawValue === 'object') {
      const normalizedObject: Record<string, unknown> = {}
      const keys = Object.keys(rawValue).sort()

      for (let index = 0; index < keys.length; index += 1) {
        const key = keys[index]
        normalizedObject[key] = normalizeValue({
          value: (rawValue as Record<string, unknown>)[key]
        })
      }

      return normalizedObject
    }

    return rawValue
  }

  return JSON.stringify(normalizeValue({ value }))
}

export const createSimpleDiffPatcher = () => ({
  diff: jest.fn((prev: any, next: any) => {
    if (typeof next === 'undefined') return null

    const clone = JSON.parse(JSON.stringify(next))
    const prevStr = stableStringify({ value: prev })
    const nextStr = stableStringify({ value: clone })
    if (prevStr === nextStr) return null

    return { next: clone }
  }),
  patch: jest.fn((state: any, diff: any) => {
    if (!diff) {
      return JSON.parse(JSON.stringify(state))
    }
    return JSON.parse(JSON.stringify(diff.next))
  }),
  clone: jest.fn(),
  unpatch: jest.fn()
})

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
      scheduleSaveState: jest.fn(),
      flushPendingSave: jest.fn(),
      beginAction: jest.fn(),
      endAction: jest.fn(),
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
    objectLockManager: {
      lockObject: jest.fn()
    },
    textManager: {
      isTextEditingActive: false
    },
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
    prepareInitialState: jest.fn().mockImplementation(async({ state }) => state),
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

// Создаёт примитивный FabricObject-стаб с управляемыми координатами.
export const createBoundsObject = ({
  left,
  top,
  width,
  height,
  id
}: {
  left: number
  top: number
  width: number
  height: number
  id?: string
}) => {
  const obj: any = {
    left,
    top,
    width,
    height,
    id,
    visible: true,
    set: jest.fn((props: Partial<{ left: number; top: number; width: number; height: number }>) => {
      Object.assign(obj, props)
    }),
    setCoords: jest.fn(),
    getBoundingRect: jest.fn(() => ({
      left: obj.left ?? 0,
      top: obj.top ?? 0,
      width: obj.width ?? 0,
      height: obj.height ?? 0
    }))
  }

  return obj
}

// Контекст для тестов SnappingManager c нужными моками канваса и редактора.
export const createSnappingTestContext = () => {
  const objects: any[] = []

  const selectionContext = {
    save: jest.fn(),
    restore: jest.fn(),
    transform: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    quadraticCurveTo: jest.fn(),
    closePath: jest.fn(),
    stroke: jest.fn(),
    setLineDash: jest.fn(),
    fillText: jest.fn(),
    fill: jest.fn(),
    fillStyle: '',
    font: '',
    textAlign: 'center' as CanvasTextAlign,
    textBaseline: 'middle' as CanvasTextBaseline,
    lineWidth: 0,
    strokeStyle: '',
    measureText: jest.fn(() => ({ width: 10 }))
  }

  const canvas = {
    ...createCanvasStub(),
    requestRenderAll: jest.fn(),
    getZoom: jest.fn().mockReturnValue(1),
    getSelectionContext: jest.fn(() => selectionContext),
    clearContext: jest.fn(),
    contextTop: {},
    forEachObject: jest.fn((cb: (obj: any) => void) => {
      objects.forEach(cb)
    })
  }

  const montageArea = createBoundsObject({
    left: 0,
    top: 0,
    width: 400,
    height: 300,
    id: 'montage-area'
  })

  const editor = {
    ...createEditorStub(),
    canvas,
    montageArea
  }

  return {
    editor,
    canvas,
    objects
  }
}

export const setActiveObjects = (canvas: any, objects: any[]) => {
  canvas.getActiveObjects.mockReturnValue(objects)
  canvas.getActiveObject.mockReturnValue(objects[0] ?? null)
}

export const attachToolbarMock = (editor: any) => {
  const toolbar = {
    hideTemporarily: jest.fn(),
    showAfterTemporary: jest.fn()
  }
  editor.toolbar = toolbar
  return toolbar
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
    toDatalessObject: jest.fn().mockImplementation(() => ({
      clipPath: null,
      width: currentWidth,
      height: currentHeight,
      version: '5.0.0',
      objects: JSON.parse(JSON.stringify(objects))
    })),
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
    add: jest.fn((obj: any) => {
      objects = [...objects, obj]
    }),
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
  const simpleDiffPatcher = createSimpleDiffPatcher()

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

const serializeTextboxState = (textbox: Textbox) => ({
  type: 'textbox',
  id: textbox.id,
  selectable: textbox.selectable,
  evented: textbox.evented,
  backgroundId: textbox.backgroundId,
  customData: textbox.customData,
  backgroundType: textbox.backgroundType,
  format: textbox.format,
  text: textbox.text,
  textCaseRaw: textbox.textCaseRaw,
  uppercase: textbox.uppercase,
  fontFamily: textbox.fontFamily,
  fontSize: textbox.fontSize,
  fontWeight: textbox.fontWeight,
  fontStyle: textbox.fontStyle,
  underline: textbox.underline,
  linethrough: textbox.linethrough,
  textAlign: textbox.textAlign,
  fill: textbox.fill,
  stroke: textbox.stroke,
  strokeWidth: textbox.strokeWidth,
  opacity: textbox.opacity,
  left: textbox.left,
  top: textbox.top,
  width: textbox.width,
  height: textbox.height,
  angle: textbox.angle,
  scaleX: textbox.scaleX,
  scaleY: textbox.scaleY,
  originX: textbox.originX,
  originY: textbox.originY,
  locked: textbox.locked,
  lockMovementX: textbox.lockMovementX,
  lockMovementY: textbox.lockMovementY,
  lockRotation: textbox.lockRotation,
  lockScalingX: textbox.lockScalingX,
  lockScalingY: textbox.lockScalingY,
  lockSkewingX: textbox.lockSkewingX,
  lockSkewingY: textbox.lockSkewingY,
  styles: (() => {
    if (typeof textbox.__getCharStyles !== 'function') return undefined
    const charStyles = textbox.__getCharStyles()
    if (!charStyles || typeof charStyles !== 'object') return undefined
    return JSON.parse(JSON.stringify(charStyles))
  })()
})

export type TextManagerTestSetupOptions = {
  fonts?: EditorFontDefinition[]
  maxHistoryLength?: number
}

export type TextManagerTestSetupResult = {
  editor: any
  canvas: any
  historyManager: HistoryManager
  textManager: TextManager
  getObjects: () => Textbox[]
}

export const createTextManagerTestSetup = (
  options: TextManagerTestSetupOptions = {}
): TextManagerTestSetupResult => {
  const {
    fonts = [{
      family: 'Roboto',
      source: '/fonts/roboto.woff2'
    }],
    maxHistoryLength = 10
  } = options

  const handlers: Record<string, AnyFn[]> = {}
  let objects: Textbox[] = []
  let activeObject: Textbox | null = null

  const dispatch = (event: string, payload: any) => {
    const registered = handlers[event]
    if (!registered) return
    registered.forEach((handler) => handler(payload))
  }

  const fireMock = jest.fn((event: string, payload: any) => {
    dispatch(event, payload)
  })

  const canvas = {
    clipPath: null,
    on: jest.fn((event: string, handler: AnyFn) => {
      handlers[event] = handlers[event] || []
      handlers[event]!.push(handler)
    }),
    off: jest.fn((event: string, handler: AnyFn) => {
      const registered = handlers[event]
      if (!registered) return
      handlers[event] = registered.filter((item) => item !== handler)
    }),
    add: jest.fn((textbox: Textbox) => {
      objects.push(textbox)
      activeObject = textbox
      dispatch('object:added', { target: textbox })
    }),
    remove: jest.fn((textbox: Textbox) => {
      objects = objects.filter((item) => item !== textbox)
      dispatch('object:removed', { target: textbox })
    }),
    centerObject: jest.fn((textbox: Textbox) => {
      if (textbox.left === undefined) textbox.left = 400
      if (textbox.top === undefined) textbox.top = 300
    }),
    setActiveObject: jest.fn((textbox: Textbox) => {
      activeObject = textbox
    }),
    discardActiveObject: jest.fn(() => {
      if (activeObject && (activeObject as any).type === 'activeSelection') {
        const selection = activeObject as unknown as ActiveSelection
        const objects = selection.getObjects()
        const { scaleX = 1, scaleY = 1 } = selection

        objects.forEach((obj: any) => {
          const currentScaleX = obj.scaleX ?? 1
          const currentScaleY = obj.scaleY ?? 1

          obj.scaleX = currentScaleX * scaleX
          obj.scaleY = currentScaleY * scaleY
        })
      }
      activeObject = null
    }),
    getActiveObject: jest.fn(() => activeObject),
    requestRenderAll: jest.fn(),
    fire: fireMock,
    getObjects: jest.fn(() => [...objects]),
    getWidth: jest.fn(() => 800),
    getHeight: jest.fn(() => 600),
    renderAll: jest.fn(),
    setDimensions: jest.fn(),
    setViewportTransform: jest.fn(),
    toDatalessObject: jest.fn(() => ({
      version: '5.0.0',
      width: 800,
      height: 600,
      clipPath: null,
      objects: objects.map((textbox) => serializeTextboxState(textbox))
    })),
    loadFromJSON: jest.fn(async(
      state: any,
      reviver?: (serializedObj: any, fabricObject: any) => void
    ) => {
      const serializedObjects = state?.objects ?? []
      objects = serializedObjects.map((data: any) => {
        const textbox = new Textbox(data.text ?? '', data)
        if (typeof data.textCaseRaw !== 'undefined') {
          textbox.textCaseRaw = data.textCaseRaw
        }
        if (typeof data.uppercase !== 'undefined') {
          textbox.uppercase = data.uppercase
        }
        if (reviver) {
          reviver(data, textbox as any)
        }
        return textbox
      })
      activeObject = objects[objects.length - 1] ?? null
    })
  } as any

  const editor = {
    canvas,
    options: {
      fonts,
      maxHistoryLength
    },
    canvasManager: {
      updateCanvas: jest.fn()
    },
    interactionBlocker: {
      overlayMask: null,
      refresh: jest.fn(),
      isBlocked: false
    },
    backgroundManager: {
      backgroundObject: null,
      removeBackground: jest.fn(),
      refresh: jest.fn()
    },
    montageArea: {
      id: 'montage-area',
      width: 400,
      height: 300,
      left: 200,
      top: 150,
      setCoords: jest.fn(),
      getBoundingRect: jest.fn(() => ({
        left: 0,
        top: 0,
        width: 400,
        height: 300
      }))
    },
    errorManager: {
      emitError: jest.fn()
    },
    snappingManager: {
      applyTextResizingSnap: jest.fn()
    }
  } as any

  const historyManager = new HistoryManager({ editor })
  historyManager.diffPatcher = createSimpleDiffPatcher() as any
  editor.historyManager = historyManager

  const textManager = new TextManager({ editor })

  return {
    editor,
    canvas,
    historyManager,
    textManager,
    getObjects: () => [...objects]
  }
}

export type FontManagerTestSetupOptions = {
  fonts?: EditorFontDefinition[]
  existingFontFaces?: Array<Record<string, any>>
}

export const createFontManagerTestSetup = (
  options: FontManagerTestSetupOptions = {}
) => {
  const {
    fonts = [],
    existingFontFaces = []
  } = options

  const appendedNodes: Element[] = []
  const originalAppendChild = document.head.appendChild.bind(document.head)
  const appendChildSpy = jest
    .spyOn(document.head, 'appendChild')
    .mockImplementation((node: any) => {
      appendedNodes.push(node as Element)
      return originalAppendChild(node)
    })

  const fontSet = {
    add: jest.fn(),
    forEach: jest.fn((callback: (fontFace: any) => void) => {
      existingFontFaces.forEach((fontFace) => callback(fontFace))
    })
  }

  const originalFontSet = (document as any).fonts
  Object.defineProperty(document, 'fonts', {
    configurable: true,
    value: fontSet
  })

  const fontManager = new FontManager(fonts)
  const originalFontFace = (global as any).FontFace

  const restore = () => {
    appendChildSpy.mockRestore()
    appendedNodes.forEach((node) => {
      if (node.parentNode) {
        node.parentNode.removeChild(node)
      }
    })
    if (originalFontSet !== undefined) {
      Object.defineProperty(document, 'fonts', {
        configurable: true,
        value: originalFontSet
      })
    } else {
      delete (document as any).fonts
    }
    if (originalFontFace === undefined) {
      delete (global as any).FontFace
    } else {
      (global as any).FontFace = originalFontFace
    }
  }

  const setFontFaceMock = (implementation?: any) => {
    if (implementation === undefined) {
      delete (global as any).FontFace
    } else {
      (global as any).FontFace = implementation
    }
  }

  return {
    fontManager,
    appendChildSpy,
    fontSet,
    styleElements: appendedNodes,
    restore,
    setFontFaceMock
  }
}

export const resetFontManagerRegistry = () => {
  const registry = (FontManager as any).registeredFontKeys as Set<string> | undefined
  if (registry && typeof registry.clear === 'function') {
    registry.clear()
    return
  }
  (FontManager as any).registeredFontKeys = new Set<string>()
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

export const createMockGroup = (objects: any[] = [], props: any = {}) => {
  // Используем реальный класс Group из мока
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

/**
 * Создаёт минимальный мок CanvasRenderingContext2D для рендера.
 */
export const createMockContext = (): CanvasRenderingContext2D => {
  const ctx: any = {
    save: jest.fn(),
    restore: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    quadraticCurveTo: jest.fn(),
    closePath: jest.fn(),
    fill: jest.fn(),
    _fillStyle: undefined as string | undefined
  }

  Object.defineProperty(ctx, 'fillStyle', {
    get: () => ctx._fillStyle,
    set: (value) => {
      ctx._fillStyle = value
    }
  })

  return ctx as CanvasRenderingContext2D
}

/**
 * Добавляет недостающие методы в mock-классы Fabric для тестов.
 */
export const ensureFabricHelpers = (): void => {
  const { prototype: pointPrototype } = Point
  if (!pointPrototype.scalarAdd) {
    pointPrototype.scalarAdd = function addScalar(value: number) {
      return new Point(this.x + value, this.y + value)
    }
  }

  const { prototype: textboxPrototype } = Textbox
  if (!textboxPrototype.toObject) {
    textboxPrototype.toObject = function toObject() {
      const { constructor } = this as any
      return { ...this, type: constructor?.type ?? 'textbox' }
    }
  }
}

/**
 * Создаёт BackgroundTextbox с переопределённым чтением стилей для декораций.
 */
export const createDecorationTextbox = ({
  stroke = '#ff0000',
  strokeWidth = 2,
  fill = '#000000'
}: {
  stroke?: string | null
  strokeWidth?: number
  fill?: string
} = {}) => {
  const textbox = new BackgroundTextbox('Test')
  const state = {
    stroke,
    strokeWidth,
    fill
  }
  const textboxAny = textbox as any

  textboxAny.getValueOfPropertyAt = (
    _lineIndex: number,
    _charIndex: number,
    property: string
  ) => {
    const {
      strokeWidth: currentStrokeWidth,
      stroke: currentStroke,
      fill: currentFill
    } = state

    if (property === 'strokeWidth') return currentStrokeWidth
    if (property === 'stroke') return currentStroke
    if (property === 'fill') return currentFill
    return undefined
  }

  return { textbox, state }
}

/**
 * Готовит BackgroundTextbox и контекст для проверки цветов декораций.
 */
export const createDecorationRenderSetup = ({
  text,
  type,
  strokeByIndex,
  strokeWidth = 2,
  fill = '#000000'
}: {
  text: string
  type: 'underline' | 'linethrough'
  strokeByIndex: string[]
  strokeWidth?: number
  fill?: string
}) => {
  const textbox = new BackgroundTextbox(text, { fontSize: 10, lineHeight: 1 })
  const chars = text.split('')
  const { length: charsLength } = chars
  const charBounds: Array<{
    left: number
    width: number
    kernedWidth: number
    height: number
    deltaY: number
  }> = []
  for (let index = 0; index < charsLength; index += 1) {
    charBounds.push({
      left: index * 10,
      width: 10,
      kernedWidth: 10,
      height: 10,
      deltaY: 0
    })
  }

  const textboxAny = textbox as any
  textboxAny._textLines = [chars]
  textboxAny.__charBounds = [charBounds]
  textboxAny.offsets = { underline: 0, linethrough: 0, overline: 0 }
  textboxAny._fontSizeFraction = 0
  textboxAny.direction = 'ltr'
  textboxAny.width = charsLength * 10
  textboxAny._getWidthOfCharSpacing = () => 0
  textboxAny._getLineLeftOffset = () => 0
  textboxAny._getTopOffset = () => 0
  textboxAny._getLeftOffset = () => 0
  textboxAny.getHeightOfLine = () => 10
  textboxAny.getHeightOfChar = () => 10
  textboxAny._removeShadow = jest.fn()
  textboxAny[type] = true

  const { length: strokeByIndexLength } = strokeByIndex
  const fallbackStrokeIndex = Math.max(strokeByIndexLength - 1, 0)

  textboxAny.getValueOfPropertyAt = (
    _lineIndex: number,
    charIndex: number,
    property: string
  ) => {
    if (property === type) return true
    if (property === 'textDecorationThickness') return 100
    if (property === 'deltaY') return 0
    if (property === 'strokeWidth') return strokeWidth
    if (property === 'stroke') {
      const strokeAtIndex = strokeByIndex[charIndex]
      const fallbackStroke = strokeByIndex[fallbackStrokeIndex]
      return strokeAtIndex ?? fallbackStroke
    }
    if (property === 'fill') return fill
    return undefined
  }

  const ctx = createMockContext()
  const fillStyles: string[] = []
  ctx.fillRect = function fillRect() {
    fillStyles.push(ctx.fillStyle as string)
  }

  return { textbox, ctx, fillStyles }
}

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
