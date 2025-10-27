import { Canvas, Pattern } from 'fabric'
import { nanoid } from 'nanoid'
import { ImageEditor } from '../../../src/editor'
import { basicOptions, createFullOptions, createEditorWithMocks } from '../../test-utils/editor-helpers'

// Мокируем сторонние зависимости редактора (не fabric)
jest.mock('nanoid')
jest.mock('../../../src/editor/listeners')
jest.mock('../../../src/editor/module-loader')
jest.mock('../../../src/editor/worker-manager')
jest.mock('../../../src/editor/customized-controls')
jest.mock('../../../src/editor/ui/toolbar-manager')
jest.mock('../../../src/editor/history-manager')
jest.mock('../../../src/editor/image-manager')
jest.mock('../../../src/editor/canvas-manager')
jest.mock('../../../src/editor/transform-manager')
jest.mock('../../../src/editor/interaction-blocker')
jest.mock('../../../src/editor/layer-manager')
jest.mock('../../../src/editor/shape-manager')
jest.mock('../../../src/editor/clipboard-manager')
jest.mock('../../../src/editor/object-lock-manager')
jest.mock('../../../src/editor/grouping-manager')
jest.mock('../../../src/editor/selection-manager')
jest.mock('../../../src/editor/deletion-manager')
jest.mock('../../../src/editor/error-manager')
jest.mock('../../../src/editor/zoom-manager')

describe('ImageEditor', () => {
  // Моки для зависимостей
  const mockNanoid = nanoid as jest.MockedFunction<typeof nanoid>
  const mockRect = {}

  // Базовые опции/хелперы теперь импортируются из test-utils/editor-helpers

  beforeEach(() => {
    jest.clearAllMocks()
    mockNanoid.mockReturnValue('test-id-123')
  })

  describe('constructor', () => {
    let initSpy: jest.SpiedFunction<ImageEditor['init']>

    beforeEach(() => {
      // Изолируем тесты конструктора от побочных эффектов init()
      initSpy = jest.spyOn(ImageEditor.prototype, 'init').mockResolvedValue()
    })

    afterEach(() => {
      initSpy.mockRestore()
    })

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
      const mockCanvas = {
        width: 0,
        height: 0,
        getContext: jest.fn().mockReturnValue({
          fillStyle: '',
          fillRect: jest.fn()
        })
      }
      const createElSpy = jest.spyOn(document, 'createElement').mockImplementation(() => mockCanvas as any)

      // Вызываем приватный статический метод через рефлексию
      const pattern = (ImageEditor as any)._createMosaicPattern()

      expect(document.createElement).toHaveBeenCalledWith('canvas')
      expect(mockCanvas.width).toBe(20)
      expect(mockCanvas.height).toBe(20)
      expect(pattern).toBeInstanceOf(Pattern)

      createElSpy.mockRestore()
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
      const createElSpy = jest.spyOn(document, 'createElement').mockImplementation(() => mockCanvas as any);

      (ImageEditor as any)._createMosaicPattern()

      expect(mockContext.fillRect).toHaveBeenCalledTimes(3)
      expect(mockContext.fillRect).toHaveBeenNthCalledWith(1, 0, 0, 40, 40)
      expect(mockContext.fillRect).toHaveBeenNthCalledWith(2, 0, 0, 10, 10)
      expect(mockContext.fillRect).toHaveBeenNthCalledWith(3, 10, 10, 10, 10)

      createElSpy.mockRestore()
    })
  })

  describe('init', () => {
    beforeEach(() => {
      // Добавляем реальный canvas в jsdom, чтобы fabric.Canvas корректно инициализировался
      document.body.innerHTML = '<canvas id="test-canvas"></canvas>'
    })

    afterEach(() => {
      document.body.innerHTML = ''
    })

    it('должен инициализировать компоненты и вызвать приватные методы', async() => {
      const editor = createEditorWithMocks()
      const spyMontage = jest.spyOn(editor as any, '_createMontageArea')
      const spyClip = jest.spyOn(editor as any, '_createClippingArea')

      await editor.init()

      expect(spyMontage).toHaveBeenCalled()
      expect(spyClip).toHaveBeenCalled()
    })

    it('должен настроить размеры канваса', async() => {
      const editor = createEditorWithMocks()

      await editor.init()

      expect(editor.canvasManager.setEditorContainerWidth).toHaveBeenCalledWith(basicOptions.editorContainerWidth)
      expect(editor.canvasManager.setEditorContainerHeight).toHaveBeenCalledWith(basicOptions.editorContainerHeight)
      expect(editor.canvasManager.setCanvasWrapperWidth).toHaveBeenCalledWith(basicOptions.canvasWrapperWidth)
      expect(editor.canvasManager.setCanvasWrapperHeight).toHaveBeenCalledWith(basicOptions.canvasWrapperHeight)
      expect(editor.canvasManager.setCanvasCSSWidth).toHaveBeenCalledWith(basicOptions.canvasCSSWidth)
      expect(editor.canvasManager.setCanvasCSSHeight).toHaveBeenCalledWith(basicOptions.canvasCSSHeight)
    })

    it('должен импортировать начальное изображение если оно предоставлено', async() => {
      const editor = createEditorWithMocks({
        initialImage: {
          source: 'test-image.jpg',
          scale: 'contain',
          withoutSave: true
        }
      })

      await editor.init()

      expect(editor.imageManager.importImage).toHaveBeenCalledWith({
        source: 'test-image.jpg',
        scale: 'contain',
        withoutSave: true
      })
    })

    it('должен обновить канвас и установить масштаб по умолчанию', async() => {
      const editor = createEditorWithMocks()

      await editor.init()

      expect(editor.canvasManager.updateCanvas).toHaveBeenCalledWith()
      expect(editor.zoomManager.calculateAndApplyDefaultZoom).toHaveBeenCalled()
    })

    it('должен загрузить начальное состояние если оно предоставлено', async() => {
      const editor = createEditorWithMocks({
        initialStateJSON: { test: 'state' }
      })

      await editor.init()

      expect(editor.historyManager.loadStateFromFullState).toHaveBeenCalledWith({ test: 'state' })
    })

    it('должен вызвать колбэк готовности если он предоставлен', async() => {
      const mockCallback = jest.fn()
      const editor = createEditorWithMocks({
        _onReadyCallback: mockCallback
      })

      await editor.init()

      expect(mockCallback).toHaveBeenCalledWith(editor)
    })

    it('должен испускать событие editor:ready', async() => {
      const editor = createEditorWithMocks()
      const fireSpy = jest.spyOn(Canvas.prototype as any, 'fire')

      await editor.init()

      expect(fireSpy).toHaveBeenCalledWith('editor:ready', editor)
      fireSpy.mockRestore()
    })

    it('должен сохранить состояние в историю', async() => {
      const editor = createEditorWithMocks()

      await editor.init()

      expect(editor.historyManager.saveState).toHaveBeenCalled()
    })
  })

  describe('destroy', () => {
    it('должен правильно очищать все ресурсы', () => {
      // Создаем минимальную версию редактора только с нужными компонентами
      const mockDestroy = jest.fn()
      const mockDispose = jest.fn()
      const mockTerminate = jest.fn()
      const mockRevokeBlobUrls = jest.fn()
      const mockCleanBuffer = jest.fn()

      const editor = {
        listeners: { destroy: mockDestroy },
        toolbar: { destroy: mockDestroy },
        canvas: { dispose: mockDispose },
        workerManager: { worker: { terminate: mockTerminate } },
        imageManager: { revokeBlobUrls: mockRevokeBlobUrls },
        errorManager: { cleanBuffer: mockCleanBuffer },
        destroy: ImageEditor.prototype.destroy
      } as unknown as ImageEditor

      editor.destroy()

      expect(mockDestroy).toHaveBeenCalledTimes(2) // listeners + toolbar
      expect(mockDispose).toHaveBeenCalled()
      expect(mockTerminate).toHaveBeenCalled()
      expect(mockRevokeBlobUrls).toHaveBeenCalled()
      expect(mockCleanBuffer).toHaveBeenCalled()
    })
  })

  describe('_createMontageArea (приватный метод)', () => {
    it('создает прямоугольник с ожидаемыми параметрами через ShapeManager', () => {
      const editor = new ImageEditor('test-canvas', createFullOptions())

      // Мокируем только метод ShapeManager.addRectangle
      const mockAddRectangle = jest.fn().mockReturnValue(mockRect)
      editor.shapeManager = {
        addRectangle: mockAddRectangle
      } as any;
      (editor as any)._createMontageArea()

      expect(mockAddRectangle).toHaveBeenCalledWith(
        expect.objectContaining({
          width: basicOptions.montageAreaWidth,
          height: basicOptions.montageAreaHeight,
          selectable: false,
          hasBorders: false,
          hasControls: false,
          evented: false,
          id: 'montage-area',
          originX: 'center',
          originY: 'center',
          stroke: null,
          strokeWidth: 0,
          objectCaching: false,
          noScaleCache: true
        }),
        { withoutSelection: true }
      )
      expect(editor.montageArea).toBe(mockRect)
    })
  })

  describe('_createClippingArea (приватный метод)', () => {
    it('создает clipPath через ShapeManager с ожидаемыми параметрами', () => {
      const editor = new ImageEditor('test-canvas', createFullOptions());

      // Устанавливаем canvas
      (editor as any).canvas = new Canvas('test-canvas', {}) as any

      // Мокируем только метод ShapeManager.addRectangle
      const mockAddRectangle = jest.fn().mockReturnValue(mockRect)
      editor.shapeManager = {
        addRectangle: mockAddRectangle
      } as any;
      (editor as any)._createClippingArea()

      expect(mockAddRectangle).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'area-clip',
          width: basicOptions.montageAreaWidth,
          height: basicOptions.montageAreaHeight,
          selectable: false,
          evented: false,
          originX: 'center',
          originY: 'center',
          stroke: null,
          strokeWidth: 0,
          hasBorders: false,
          hasControls: false
        }),
        { withoutSelection: true, withoutAdding: true }
      )
      expect((editor.canvas as any).clipPath).toBe(mockRect)
    })
  })
})
