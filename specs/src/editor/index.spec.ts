import { Canvas, Pattern, Point } from 'fabric'
import { nanoid } from 'nanoid'
import { ImageEditor } from '../../../src/editor'
import initEditor from '../../../src/main'
import FontManager from '../../../src/editor/font-manager'
import { addRectangleToCanvas } from '../../../src/editor/utils/primitive-shapes'
import { basicOptions, createFullOptions } from '../../test-utils/editor/options'
import { createEditorWithMocks } from '../../test-utils/editor/editor-with-mocks'

// Мокируем сторонние зависимости редактора (не fabric)
jest.mock('nanoid')
jest.mock('../../../src/editor/listeners')
jest.mock('../../../src/editor/module-loader')
jest.mock('../../../src/editor/worker-manager')
jest.mock('../../../src/editor/customized-controls')
jest.mock('../../../src/editor/ui/toolbar-manager')
jest.mock('../../../src/editor/ui/viewport-scrollbar-manager')
jest.mock('../../../src/editor/history-manager')
jest.mock('../../../src/editor/image-manager', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    importImage: jest.fn().mockResolvedValue(undefined),
    prepareSerializedImageSources: jest.fn().mockImplementation(async({ state }) => state),
    calculateScaleFactor: jest.fn().mockReturnValue(1),
    revokeBlobUrls: jest.fn(),
    destroy: jest.fn()
  }))
}))
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
jest.mock('../../../src/editor/utils/primitive-shapes', () => ({
  addRectangleToCanvas: jest.fn()
}))

describe('ImageEditor', () => {
  // Моки для зависимостей
  const mockNanoid = nanoid as jest.MockedFunction<typeof nanoid>
  const mockRect = {}
  const addRectangleToCanvasMock = addRectangleToCanvas as jest.Mock

  // Базовые опции/хелперы теперь импортируются из test-utils/editor/options и test-utils/editor/editor-with-mocks

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

  describe('жизненный цикл инициализации', () => {
    afterEach(() => {
      jest.restoreAllMocks()
    })

    it('отклоняет ready при ошибке загрузки и освобождает созданные ресурсы', async() => {
      const failure = new Error('Canvas setup failed')
      jest.spyOn(FontManager.prototype, 'loadFonts').mockRejectedValue(failure)
      const destroy = jest.spyOn(ImageEditor.prototype, 'destroy')
      const editor = new ImageEditor('test-canvas', createFullOptions())

      await expect(editor.ready).rejects.toBe(failure)
      expect(destroy).toHaveBeenCalledTimes(1)
      await expect(editor.init()).rejects.toThrow(/destroyed/i)
    })

    it('переиспользует одну инициализацию при повторных вызовах init', async() => {
      const callback = jest.fn()
      const editor = createEditorWithMocks({ _onReadyCallback: callback })
      const first = editor.init()
      expect(editor.init()).toBe(first)
      await first
      expect(editor.init()).toBe(first)
      expect(callback).toHaveBeenCalledTimes(1)
    })

    it('отклоняет инициализацию при уничтожении во время загрузки шрифтов', async() => {
      let finishFonts!: () => void
      jest.spyOn(FontManager.prototype, 'loadFonts').mockImplementation(() => new Promise((resolve) => {
        finishFonts = resolve
      }))
      const callback = jest.fn()
      const editor = createEditorWithMocks({
        initialImage: { source: 'test-image.jpg' },
        _onReadyCallback: callback
      })
      const initialization = editor.init()
      const assertion = expect(initialization).rejects.toThrow(/destroyed/i)
      editor.destroy()
      await assertion
      finishFonts()
      await Promise.resolve()
      await Promise.resolve()

      expect(editor.imageManager.importImage).not.toHaveBeenCalled()
      expect(editor.historyManager.saveState).not.toHaveBeenCalled()
      expect(callback).not.toHaveBeenCalled()
    })

    it('позволяет создать редактор заново после уничтожения без устаревших ресурсов', async() => {
      document.body.innerHTML = '<div id="lifecycle-host"></div>'
      const callback = jest.fn()
      const first = await initEditor('lifecycle-host', {
        ...createFullOptions(), showObjectSizeOnScale: false, _onReadyCallback: callback
      })
      const firstListeners = first.listeners
      expect(document.querySelectorAll('#lifecycle-host canvas')).toHaveLength(1)
      expect(window['lifecycle-host']).toBe(first)

      first.destroy()
      first.destroy()
      expect(firstListeners.destroy).toHaveBeenCalledTimes(1)
      expect(document.querySelectorAll('#lifecycle-host canvas')).toHaveLength(0)
      expect(window['lifecycle-host']).toBeUndefined()

      const second = await initEditor('lifecycle-host', {
        ...createFullOptions(), showObjectSizeOnScale: false, _onReadyCallback: callback
      })
      expect(second).not.toBe(first)
      expect(window['lifecycle-host']).toBe(second)
      expect(document.querySelectorAll('#lifecycle-host canvas')).toHaveLength(1)
      expect(callback).toHaveBeenCalledTimes(2)
      second.destroy()
      document.body.innerHTML = ''
    })

    it.each(['заменена', 'удалена'])('допускает повторное создание, когда глобальная ссылка %s', async(mode) => {
      document.body.innerHTML = '<div id="lifecycle-host"></div>'
      const options = { ...createFullOptions(), showObjectSizeOnScale: false }
      const first = await initEditor('lifecycle-host', options)
      const createdCanvas = document.getElementById('lifecycle-host-canvas')!
      const foreignRegistration = { id: 'foreign' }
      if (mode === 'заменена') {
        window['lifecycle-host'] = foreignRegistration
      } else {
        delete window['lifecycle-host']
      }

      first.destroy()
      first.destroy()

      expect(createdCanvas.isConnected).toBe(false)
      expect(window['lifecycle-host']).toBe(mode === 'заменена' ? foreignRegistration : undefined)
      const second = await initEditor('lifecycle-host', options)
      expect(window['lifecycle-host']).toBe(second)
      expect(document.querySelectorAll('#lifecycle-host canvas')).toHaveLength(1)
      second.destroy()
      document.body.innerHTML = ''
    })

    it('освобождает исходную регистрацию и canvas после изменения id контейнера', async() => {
      document.body.innerHTML = '<div id="lifecycle-host"></div>'
      const options = { ...createFullOptions(), showObjectSizeOnScale: false }
      const first = await initEditor('lifecycle-host', options)
      const host = document.getElementById('lifecycle-host')!
      const createdCanvas = document.getElementById('lifecycle-host-canvas')!
      const foreignRegistration = { id: 'foreign' }
      host.id = 'renamed-host'
      window['renamed-host'] = foreignRegistration

      first.destroy()

      expect(createdCanvas.isConnected).toBe(false)
      expect(window['lifecycle-host']).toBeUndefined()
      expect(window['renamed-host']).toBe(foreignRegistration)
      const second = await initEditor('renamed-host', options)
      expect(window['renamed-host']).toBe(second)
      expect(document.querySelectorAll('#renamed-host canvas')).toHaveLength(1)
      second.destroy()
      document.body.innerHTML = ''
    })

    it('не восстанавливает состояние после уничтожения во время подготовки изображений', async() => {
      let completePreparation!: (state: object) => void
      const ImageManagerMock = jest.requireMock('../../../src/editor/image-manager').default as jest.Mock
      const revokeBlobUrls = jest.fn()
      ImageManagerMock.mockImplementationOnce(() => ({
        prepareSerializedImageSources: jest.fn(() => new Promise((resolve) => { completePreparation = resolve })),
        revokeBlobUrls,
        destroy: jest.fn()
      }))
      const callback = jest.fn()
      const editor = createEditorWithMocks({ initialState: {}, _onReadyCallback: callback })
      const initialization = editor.init()
      const assertion = expect(initialization).rejects.toThrow(/destroyed/i)
      await Promise.resolve()
      editor.destroy()
      await assertion
      completePreparation({ objects: [] })
      await Promise.resolve()
      await Promise.resolve()

      expect(editor.historyManager.loadStateFromFullState).not.toHaveBeenCalled()
      expect(editor.historyManager.saveState).not.toHaveBeenCalled()
      expect(revokeBlobUrls).toHaveBeenCalled()
      expect(callback).not.toHaveBeenCalled()
    })

    it('отклоняет инициализацию при уничтожении редактора в колбэке готовности', async() => {
      const editor = createEditorWithMocks({ _onReadyCallback: (readyEditor) => readyEditor.destroy() })
      await expect(editor.init()).rejects.toThrow(/destroyed/i)
      expect(editor.workerManager.terminate).toHaveBeenCalledTimes(1)
    })

    it('отклоняет инициализацию и освобождает ресурсы при ошибке колбэка готовности', async() => {
      const failure = new Error('Host callback failed')
      const editor = createEditorWithMocks({ _onReadyCallback: () => { throw failure } })
      const cleanup = jest.spyOn(editor, 'destroy')

      await expect(editor.init()).rejects.toBe(failure)
      expect(cleanup).toHaveBeenCalledTimes(1)
      expect(editor.workerManager.terminate).toHaveBeenCalledTimes(1)
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
          withoutSave: true,
          customData: { exampleKey: 'exampleValue' }
        }
      })

      await editor.init()

      expect(editor.imageManager.importImage).toHaveBeenCalledWith({
        source: 'test-image.jpg',
        scale: 'contain',
        withoutSave: true,
        customData: { exampleKey: 'exampleValue' }
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
        initialState: { test: 'state' }
      })

      await editor.init()

      expect(editor.historyManager.loadStateFromFullState).toHaveBeenCalledWith({ test: 'state' })
    })

    it('должен подготовить initialState через imageManager.prepareSerializedImageSources перед загрузкой в историю', async() => {
      const initialState = { test: 'state' }
      const preparedState = { prepared: true }

      const ImageManagerMock = jest.requireMock('../../../src/editor/image-manager').default as jest.Mock
      const prepareSerializedImageSources = jest.fn().mockResolvedValue(preparedState)

      ImageManagerMock.mockImplementationOnce(() => ({
        importImage: jest.fn().mockResolvedValue(undefined),
        prepareSerializedImageSources,
        calculateScaleFactor: jest.fn().mockReturnValue(1),
        revokeBlobUrls: jest.fn(),
        destroy: jest.fn()
      }))

      const HistoryManagerMock = jest.requireMock('../../../src/editor/history-manager').default as jest.Mock
      const loadStateFromFullState = jest.fn().mockResolvedValue(undefined)
      const suspendHistory = jest.fn()
      const resumeHistory = jest.fn()
      const saveState = jest.fn()

      HistoryManagerMock.mockImplementationOnce(() => ({
        loadStateFromFullState,
        suspendHistory,
        resumeHistory,
        saveState
      }))

      const editor = createEditorWithMocks({ initialState })
      await editor.init()

      expect(prepareSerializedImageSources).toHaveBeenCalledWith({ state: initialState })
      expect(loadStateFromFullState).toHaveBeenCalledWith(preparedState)
      expect(suspendHistory).toHaveBeenCalled()
      expect(resumeHistory).toHaveBeenCalled()
    })

    it('должен делать fallback на initialImage, если загрузка initialState завершилась ошибкой', async() => {
      const initialState = { test: 'state' }
      const loadError = new Error('load failed')

      const ImageManagerMock = jest.requireMock('../../../src/editor/image-manager').default as jest.Mock
      const importImage = jest.fn().mockResolvedValue(undefined)
      const prepareSerializedImageSources = jest.fn().mockResolvedValue(initialState)

      ImageManagerMock.mockImplementationOnce(() => ({
        importImage,
        prepareSerializedImageSources,
        calculateScaleFactor: jest.fn().mockReturnValue(1),
        revokeBlobUrls: jest.fn(),
        destroy: jest.fn()
      }))

      const HistoryManagerMock = jest.requireMock('../../../src/editor/history-manager').default as jest.Mock
      const suspendHistory = jest.fn()
      const resumeHistory = jest.fn()
      const saveState = jest.fn()

      HistoryManagerMock.mockImplementationOnce(() => ({
        loadStateFromFullState: jest.fn().mockRejectedValue(loadError),
        suspendHistory,
        resumeHistory,
        saveState
      }))

      const ErrorManagerMock = jest.requireMock('../../../src/editor/error-manager').default as jest.Mock
      const emitError = jest.fn()

      ErrorManagerMock.mockImplementationOnce(() => ({
        emitError,
        emitWarning: jest.fn(),
        cleanBuffer: jest.fn()
      }))

      const editor = createEditorWithMocks({
        initialState,
        scaleType: 'contain',
        initialImage: { source: 'test-image.jpg' }
      })

      await editor.init()

      expect(prepareSerializedImageSources).toHaveBeenCalledWith({ state: initialState })
      expect(importImage).toHaveBeenCalledWith({
        source: 'test-image.jpg',
        scale: 'image-contain',
        withoutSave: true
      })

      expect(emitError).toHaveBeenCalledWith(expect.objectContaining({
        origin: 'ImageEditor',
        method: 'init',
        code: 'INITIAL_STATE_LOAD_FAILED'
      }))

      expect(suspendHistory).toHaveBeenCalled()
      expect(resumeHistory).toHaveBeenCalled()
    })

    it('не должен импортировать initialImage, если initialState загрузился успешно', async() => {
      const initialState = { test: 'state' }

      const ImageManagerMock = jest.requireMock('../../../src/editor/image-manager').default as jest.Mock
      const importImage = jest.fn().mockResolvedValue(undefined)
      const prepareSerializedImageSources = jest.fn().mockResolvedValue(initialState)

      ImageManagerMock.mockImplementationOnce(() => ({
        importImage,
        prepareSerializedImageSources,
        calculateScaleFactor: jest.fn().mockReturnValue(1),
        revokeBlobUrls: jest.fn(),
        destroy: jest.fn()
      }))

      const HistoryManagerMock = jest.requireMock('../../../src/editor/history-manager').default as jest.Mock
      const loadStateFromFullState = jest.fn().mockResolvedValue(undefined)

      HistoryManagerMock.mockImplementationOnce(() => ({
        loadStateFromFullState,
        suspendHistory: jest.fn(),
        resumeHistory: jest.fn(),
        saveState: jest.fn()
      }))

      const editor = createEditorWithMocks({
        initialState,
        initialImage: { source: 'test-image.jpg' }
      })

      await editor.init()

      expect(loadStateFromFullState).toHaveBeenCalledWith(initialState)
      expect(importImage).not.toHaveBeenCalled()
    })

    it('не должен делать fallback на initialImage, если initialState загрузился с ошибкой и initialImage не задан', async() => {
      const initialState = { test: 'state' }
      const loadError = new Error('load failed')

      const ImageManagerMock = jest.requireMock('../../../src/editor/image-manager').default as jest.Mock
      const importImage = jest.fn().mockResolvedValue(undefined)
      const prepareSerializedImageSources = jest.fn().mockResolvedValue(initialState)

      ImageManagerMock.mockImplementationOnce(() => ({
        importImage,
        prepareSerializedImageSources,
        calculateScaleFactor: jest.fn().mockReturnValue(1),
        revokeBlobUrls: jest.fn(),
        destroy: jest.fn()
      }))

      const HistoryManagerMock = jest.requireMock('../../../src/editor/history-manager').default as jest.Mock
      const suspendHistory = jest.fn()
      const resumeHistory = jest.fn()

      HistoryManagerMock.mockImplementationOnce(() => ({
        loadStateFromFullState: jest.fn().mockRejectedValue(loadError),
        suspendHistory,
        resumeHistory,
        saveState: jest.fn()
      }))

      const ErrorManagerMock = jest.requireMock('../../../src/editor/error-manager').default as jest.Mock
      const emitError = jest.fn()

      ErrorManagerMock.mockImplementationOnce(() => ({
        emitError,
        emitWarning: jest.fn(),
        cleanBuffer: jest.fn()
      }))

      const editor = createEditorWithMocks({ initialState })
      await editor.init()

      expect(importImage).not.toHaveBeenCalled()
      expect(emitError).toHaveBeenCalledWith(expect.objectContaining({
        code: 'INITIAL_STATE_LOAD_FAILED'
      }))
      expect(suspendHistory).toHaveBeenCalled()
      expect(resumeHistory).toHaveBeenCalled()
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
      const mockImageDestroy = jest.fn()
      const mockCleanBuffer = jest.fn()
      const mockShapeDestroy = jest.fn()
      const mockTextDestroy = jest.fn()
      const mockSnappingDestroy = jest.fn()

      const editor = {
        listeners: { destroy: mockDestroy },
        shapeManager: { destroy: mockShapeDestroy },
        textManager: { destroy: mockTextDestroy },
        snappingManager: { destroy: mockSnappingDestroy },
        toolbar: { destroy: mockDestroy },
        selectionManager: { destroy: mockDestroy },
        canvas: { dispose: mockDispose },
        workerManager: { terminate: mockTerminate },
        imageManager: { destroy: mockImageDestroy },
        errorManager: { cleanBuffer: mockCleanBuffer },
        destroy: ImageEditor.prototype.destroy
      } as unknown as ImageEditor

      editor.destroy()

      expect(mockDestroy).toHaveBeenCalledTimes(3) // listeners + toolbar + selectionManager
      expect(mockShapeDestroy).toHaveBeenCalledTimes(1)
      expect(mockTextDestroy).toHaveBeenCalledTimes(1)
      expect(mockSnappingDestroy).toHaveBeenCalledTimes(1)
      expect(mockTextDestroy.mock.invocationCallOrder[0]).toBeLessThan(
        mockSnappingDestroy.mock.invocationCallOrder[0]
      )
      expect(mockDispose).toHaveBeenCalled()
      expect(mockTerminate).toHaveBeenCalled()
      expect(mockImageDestroy).toHaveBeenCalled()
      expect(mockCleanBuffer).toHaveBeenCalled()
    })
  })

  describe('_createMontageArea (приватный метод)', () => {
    it('создает прямоугольник с ожидаемыми параметрами через addRectangleToCanvas', () => {
      const initSpy = jest.spyOn(ImageEditor.prototype, 'init').mockResolvedValue()
      const editor = new ImageEditor('test-canvas', createFullOptions())
      const editorWithCanvas = editor as any
      editorWithCanvas.canvas = new Canvas('test-canvas', {}) as any
      addRectangleToCanvasMock.mockReturnValue(mockRect)
      initSpy.mockRestore()

      editorWithCanvas._createMontageArea()

      expect(addRectangleToCanvasMock).toHaveBeenCalledWith({
        canvas: editorWithCanvas.canvas,
        centerPoint: new Point(
          basicOptions.montageAreaWidth / 2,
          basicOptions.montageAreaHeight / 2
        ),
        options: expect.objectContaining({
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
        flags: { withoutSelection: true }
      })
      expect(editor.montageArea).toBe(mockRect)
    })
  })

  describe('_createClippingArea (приватный метод)', () => {
    it('создает clipPath через addRectangleToCanvas с ожидаемыми параметрами', () => {
      const initSpy = jest.spyOn(ImageEditor.prototype, 'init').mockResolvedValue()
      const editor = new ImageEditor('test-canvas', createFullOptions())
      const editorWithCanvas = editor as any

      // Устанавливаем canvas
      editorWithCanvas.canvas = new Canvas('test-canvas', {}) as any

      addRectangleToCanvasMock.mockReturnValue(mockRect)
      initSpy.mockRestore()
      editorWithCanvas._createClippingArea()

      expect(addRectangleToCanvasMock).toHaveBeenCalledWith({
        canvas: editorWithCanvas.canvas,
        centerPoint: new Point(
          basicOptions.montageAreaWidth / 2,
          basicOptions.montageAreaHeight / 2
        ),
        options: expect.objectContaining({
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
        flags: { withoutSelection: true, withoutAdding: true }
      })
      expect((editor.canvas as any).clipPath).toBe(mockRect)
    })
  })
})
