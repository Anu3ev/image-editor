import { CanvasOptions } from 'fabric'
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
      handlers[evt] = handlers[evt].filter(h => h !== fn)
    }),
    set: jest.fn(),
    setCursor: jest.fn(),
    requestRenderAll: jest.fn(),
    setViewportTransform: jest.fn(),
    discardActiveObject: jest.fn(),
    setActiveObject: jest.fn(),
    viewportTransform: [1, 0, 0, 1, 0, 0] as any,
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
      undo: jest.fn().mockResolvedValue(undefined),
      redo: jest.fn().mockResolvedValue(undefined)
    },
    interactionBlocker: {
      isBlocked: false,
      overlayMask: null as any,
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
      resetObject: jest.fn()
    },
    layerManager: { bringToFront: jest.fn() },
    selectionManager: { selectAll: jest.fn() },
    deletionManager: { deleteSelectedObjects: jest.fn() },
    clipboardManager: { copy: jest.fn(), handlePasteEvent: jest.fn() },
    errorManager: { emitWarning: jest.fn() }
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
    importImage: jest.fn().mockResolvedValue(undefined)
  } as any

  editor.historyManager = {
    loadStateFromFullState: jest.fn(),
    saveState: jest.fn()
  } as any

  // Приватные методы, которые вызываются в init
  ;(editor as any)['_createMontageArea'] = jest.fn()
  ;(editor as any)['_createClippingArea'] = jest.fn()

  return editor
}
