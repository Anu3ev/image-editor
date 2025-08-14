import { Canvas, Pattern, Rect, CanvasOptions } from 'fabric'
import { nanoid } from 'nanoid'
import { ImageEditor } from '../../src/editor'

// Мокируем сторонние зависимости редактора (не fabric)
jest.mock('nanoid')
jest.mock('../../src/editor/listeners')
jest.mock('../../src/editor/module-loader')
jest.mock('../../src/editor/worker-manager')
jest.mock('../../src/editor/customized-controls')
jest.mock('../../src/editor/ui/toolbar-manager')
jest.mock('../../src/editor/history-manager')
jest.mock('../../src/editor/image-manager')
jest.mock('../../src/editor/canvas-manager')
jest.mock('../../src/editor/transform-manager')
jest.mock('../../src/editor/interaction-blocker')
jest.mock('../../src/editor/layer-manager')
jest.mock('../../src/editor/shape-manager')
jest.mock('../../src/editor/clipboard-manager')
jest.mock('../../src/editor/object-lock-manager')
jest.mock('../../src/editor/grouping-manager')
jest.mock('../../src/editor/selection-manager')
jest.mock('../../src/editor/deletion-manager')
jest.mock('../../src/editor/error-manager')

describe('ImageEditor', () => {
  // Моки для зависимостей
  const mockNanoid = nanoid as jest.MockedFunction<typeof nanoid>
  const mockRect = {}

  // Базовые опции для тестов
  const basicOptions: Partial<CanvasOptions> = {
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

  // Хелпер для создания полных опций
  const createFullOptions = (partialOptions: Partial<CanvasOptions> = {}): CanvasOptions => ({
    ...basicOptions,
    ...partialOptions
  } as CanvasOptions)

  beforeEach(() => {
    jest.clearAllMocks()
    mockNanoid.mockReturnValue('test-id-123')
  })

  describe('constructor', () => {
    it('должен правильно инициализировать базовые свойства', () => {
      const canvasId = 'test-canvas'
      const options = createFullOptions()
      const editor = new ImageEditor(canvasId, options)

      expect(editor.containerId).toBe(canvasId)
      expect(editor.options).toBe(options)
      expect(editor.editorId).toBe(`${canvasId}-test-id-123`)
      expect(editor.clipboard).toBeNull()
      expect(mockNanoid).toHaveBeenCalledTimes(1)
    })

    it('должен генерировать уникальный editorId', () => {
      mockNanoid.mockReturnValueOnce('first-id').mockReturnValueOnce('second-id')

      const editor1 = new ImageEditor('canvas1', createFullOptions())
      const editor2 = new ImageEditor('canvas2', createFullOptions())

      expect(editor1.editorId).toBe('canvas1-first-id')
      expect(editor2.editorId).toBe('canvas2-second-id')
    })
  })

  describe('_createMosaicPattern (статический метод)', () => {
    it('должен создавать canvas с правильными размерами', () => {
  const mockCreateElement = jest.spyOn(document, 'createElement')
  const mockCanvas = {
        width: 0,
        height: 0,
        getContext: jest.fn().mockReturnValue({
          fillStyle: '',
          fillRect: jest.fn()
        })
      }
  ;(mockCreateElement as unknown as jest.Mock).mockReturnValue(mockCanvas as any)

  // Вызываем приватный статический метод через рефлексию
  const pattern = (ImageEditor as any)._createMosaicPattern()

      expect(mockCreateElement).toHaveBeenCalledWith('canvas')
      expect(mockCanvas.width).toBe(20)
      expect(mockCanvas.height).toBe(20)
  expect(pattern).toBeInstanceOf(Pattern)
    })

    it('должен правильно рисовать мозаичный паттерн', () => {
      const mockContext = {
        fillStyle: '',
        fillRect: jest.fn()
      }
  const mockCanvas = {
        width: 0,
        height: 0,
        getContext: jest.fn().mockReturnValue(mockContext)
      }
  const mockCreateElement = jest.spyOn(document, 'createElement')
  ;(mockCreateElement as unknown as jest.Mock).mockReturnValue(mockCanvas as any)

  ;(ImageEditor as any)._createMosaicPattern()

  expect(mockContext.fillRect).toHaveBeenCalledTimes(3)
      expect(mockContext.fillRect).toHaveBeenNthCalledWith(1, 0, 0, 40, 40)
      expect(mockContext.fillRect).toHaveBeenNthCalledWith(2, 0, 0, 10, 10)
      expect(mockContext.fillRect).toHaveBeenNthCalledWith(3, 10, 10, 10, 10)
    })
  })

  describe('init', () => {
    let editor: ImageEditor

    beforeEach(() => {
      editor = new ImageEditor('test-canvas', createFullOptions())
      // Мокируем приватные методы
      editor['_createMontageArea'] = jest.fn()
      editor['_createClippingArea'] = jest.fn()

      // Мокируем менеджеры и их методы
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
    })

    it('должен инициализировать компоненты и вызвать приватные методы', async () => {
      const spyMontage = jest.spyOn(editor as any, '_createMontageArea')
      const spyClip = jest.spyOn(editor as any, '_createClippingArea')
      await editor.init()
      expect(spyMontage).toHaveBeenCalled()
      expect(spyClip).toHaveBeenCalled()
    })

    it('должен настроить размеры канваса', async () => {
      await editor.init()

      expect(editor.canvasManager.setEditorContainerWidth).toHaveBeenCalledWith(basicOptions.editorContainerWidth)
      expect(editor.canvasManager.setEditorContainerHeight).toHaveBeenCalledWith(basicOptions.editorContainerHeight)
      expect(editor.canvasManager.setCanvasWrapperWidth).toHaveBeenCalledWith(basicOptions.canvasWrapperWidth)
      expect(editor.canvasManager.setCanvasWrapperHeight).toHaveBeenCalledWith(basicOptions.canvasWrapperHeight)
      expect(editor.canvasManager.setCanvasCSSWidth).toHaveBeenCalledWith(basicOptions.canvasCSSWidth)
      expect(editor.canvasManager.setCanvasCSSHeight).toHaveBeenCalledWith(basicOptions.canvasCSSHeight)
    })

    it('должен импортировать начальное изображение если оно было передано в настройках', async () => {
      const optionsWithImage = createFullOptions({
        initialImage: {
          source: 'test-image.jpg',
          scale: 'image-fit',
          withoutSave: true
        }
      })
      const editorWithImage = new ImageEditor('test-canvas', optionsWithImage)
      editorWithImage['_createMontageArea'] = jest.fn()
      editorWithImage['_createClippingArea'] = jest.fn()
      editorWithImage.canvasManager = editor.canvasManager
      editorWithImage.imageManager = editor.imageManager
      editorWithImage.historyManager = editor.historyManager

      await editorWithImage.init()

      expect(editorWithImage.imageManager.importImage).toHaveBeenCalledWith({
        source: 'test-image.jpg',
        scale: 'image-fit',
        withoutSave: true
      })
    })

    it('должен установить масштаб по умолчанию если изображение не было передано в настройках', async () => {
      await editor.init()

      expect(editor.canvasManager.setDefaultScale).toHaveBeenCalledWith({ withoutSave: true })
    })

    it('должен загрузить начальное состояние если оно было передано в настройках', async () => {
      const optionsWithState = createFullOptions({
        initialStateJSON: { test: 'state' }
      })
      const editorWithState = new ImageEditor('test-canvas', optionsWithState)
      editorWithState['_createMontageArea'] = jest.fn()
      editorWithState['_createClippingArea'] = jest.fn()
      editorWithState.canvasManager = editor.canvasManager
      editorWithState.imageManager = editor.imageManager
      editorWithState.historyManager = editor.historyManager

      await editorWithState.init()

      expect(editorWithState.historyManager.loadStateFromFullState).toHaveBeenCalledWith({ test: 'state' })
    })

    it('должен вызвать колбэк готовности если он был передан в настройках', async () => {
      const mockCallback = jest.fn()
      const optionsWithCallback = createFullOptions({
        _onReadyCallback: mockCallback
      })
      const editorWithCallback = new ImageEditor('test-canvas', optionsWithCallback)
      editorWithCallback['_createMontageArea'] = jest.fn()
      editorWithCallback['_createClippingArea'] = jest.fn()
      editorWithCallback.canvasManager = editor.canvasManager
      editorWithCallback.imageManager = editor.imageManager
      editorWithCallback.historyManager = editor.historyManager

      await editorWithCallback.init()

      expect(mockCallback).toHaveBeenCalledWith(editorWithCallback)
    })

    it('должен эмитить событие editor:ready', async () => {
      await editor.init()
      expect((editor.canvas as any).fire).toHaveBeenCalledWith('editor:ready', editor)
    })

    it('должен сохранить состояние в историю', async () => {
      await editor.init()

      expect(editor.historyManager.saveState).toHaveBeenCalled()
    })
  })

  describe('destroy', () => {
    it('должен правильно очищать все ресурсы', () => {
      const editor = new ImageEditor('test-canvas', createFullOptions())

      // Подменяем компоненты на заглушки
      editor.listeners = { destroy: jest.fn() } as any
      editor.toolbar = { destroy: jest.fn() } as any
      // Canvas из минимального fabric mock уже имеет dispose
      ;(editor as any).canvas = new Canvas('test-canvas', {}) as any
      editor.workerManager = { worker: { terminate: jest.fn() } } as any
      editor.imageManager = { revokeBlobUrls: jest.fn() } as any
      editor.errorManager = { cleanBuffer: jest.fn() } as any

      editor.destroy()

      expect(editor.listeners.destroy).toHaveBeenCalled()
      expect(editor.toolbar.destroy).toHaveBeenCalled()
      expect((editor.canvas as any).dispose).toHaveBeenCalled()
      expect(editor.workerManager.worker.terminate).toHaveBeenCalled()
      expect(editor.imageManager.revokeBlobUrls).toHaveBeenCalled()
      expect(editor.errorManager.cleanBuffer).toHaveBeenCalled()
    })
  })

  describe('_createMontageArea (приватный метод)', () => {
    it('создает прямоугольник с ожидаемыми параметрами через ShapeManager', () => {
      const editor = new ImageEditor('test-canvas', createFullOptions())
      editor.shapeManager = {
        addRectangle: jest.fn().mockReturnValue(mockRect)
      } as any

      ;(editor as any)._createMontageArea()

      expect(editor.shapeManager.addRectangle).toHaveBeenCalledWith(
        expect.objectContaining({
          width: basicOptions.montageAreaWidth,
          height: basicOptions.montageAreaHeight,
          selectable: false,
          hasBorders: false,
          hasControls: false,
          evented: false,
          id: 'montage-area',
          originX: 'center',
          originY: 'center'
        }),
        { withoutSelection: true }
      )
      expect(editor.montageArea).toBe(mockRect)
    })
  })

  describe('_createClippingArea (приватный метод)', () => {
    it('создает clipPath через ShapeManager с ожидаемыми параметрами', () => {
      const editor = new ImageEditor('test-canvas', createFullOptions())
      ;(editor as any).canvas = new Canvas('test-canvas', {}) as any
      editor.shapeManager = {
        addRectangle: jest.fn().mockReturnValue(mockRect)
      } as any

      ;(editor as any)._createClippingArea()

      expect(editor.shapeManager.addRectangle).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'area-clip',
          width: basicOptions.montageAreaWidth,
          height: basicOptions.montageAreaHeight,
          selectable: false,
          evented: false,
          originX: 'center',
          originY: 'center'
        }),
        { withoutSelection: true, withoutAdding: true }
      )
      expect((editor.canvas as any).clipPath).toBe(mockRect)
    })
  })
})
