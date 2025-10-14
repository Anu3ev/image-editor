import { ActiveSelection } from 'fabric'
import {
  createManagerTestMocks,
  createMockFabricObject,
  createMockActiveSelection,
  createMockClipboardEvent,
  createFailingMockObject,
  createEmptyClipboardEvent,
  setupBrowserMocks,
  mockQuerySelector
} from '../../../test-utils/editor-helpers'
import ClipboardManager from '../../../../src/editor/clipboard-manager'

describe('ClipboardManager', () => {
  const ASYNC_DELAY = 10
  const OBJECT_OFFSET = 10
  let mockEditor: any
  let clipboardManager: ClipboardManager
  let mockCanvas: any

  beforeEach(() => {
    // Устанавливаем глобальные моки браузерных API
    setupBrowserMocks()

    const mocks = createManagerTestMocks()
    mockEditor = mocks.mockEditor
    mockCanvas = mocks.mockCanvas

    clipboardManager = new ClipboardManager({ editor: mockEditor })

    // Очищаем все моки
    jest.clearAllMocks()
  })

  describe('constructor', () => {
    it('должен инициализировать ClipboardManager с правильными параметрами', () => {
      expect(clipboardManager.editor).toBe(mockEditor)
      expect(clipboardManager.clipboard).toBeNull()
    })
  })

  describe('copy', () => {
    it('должен скопировать активный объект в буфер обмена', async() => {
      const mockObject = createMockFabricObject({ type: 'rect', id: 'test-object' })
      mockCanvas.getActiveObject.mockReturnValue(mockObject)

      clipboardManager.copy()

      // Ждем завершения асинхронного клонирования
      await new Promise(process.nextTick)

      expect(clipboardManager.clipboard).toBeTruthy()
      expect(mockCanvas.fire).toHaveBeenCalledWith('editor:object-copied', {
        object: expect.any(Object)
      })
    })

    it('не должен копировать заблокированный объект', () => {
      const mockObject = createMockFabricObject({ type: 'rect', locked: true })
      mockCanvas.getActiveObject.mockReturnValue(mockObject)

      clipboardManager.copy()

      expect(clipboardManager.clipboard).toBeNull()
      expect(mockCanvas.fire).not.toHaveBeenCalled()
    })

    it('не должен копировать если нет активного объекта', () => {
      mockCanvas.getActiveObject.mockReturnValue(null)

      clipboardManager.copy()

      expect(clipboardManager.clipboard).toBeNull()
      expect(mockCanvas.fire).not.toHaveBeenCalled()
    })
  })

  describe('copyPaste', () => {
    it('должен создать копию обычного объекта', async() => {
      const left = 100
      const top = 50

      const mockObject = createMockFabricObject({
        type: 'rect',
        id: 'original-rect',
        left,
        top
      })
      mockCanvas.getActiveObject.mockReturnValue(mockObject)

      const result = await clipboardManager.copyPaste()

      expect(result).toBe(true)
      expect(mockCanvas.add).toHaveBeenCalled()
      expect(mockCanvas.setActiveObject).toHaveBeenCalled()
      expect(mockCanvas.fire).toHaveBeenCalledWith('editor:object-duplicated', {
        object: expect.objectContaining({
          left: left + OBJECT_OFFSET,
          top: top + OBJECT_OFFSET
        })
      })
    })

    it('должен создать копию SVG объекта', async() => {
      const left = 50
      const top = 25

      const mockSvgObject = createMockFabricObject({
        type: 'group',
        format: 'svg',
        id: 'original-svg',
        left,
        top
      })
      mockCanvas.getActiveObject.mockReturnValue(mockSvgObject)

      const result = await clipboardManager.copyPaste(mockSvgObject)

      expect(result).toBe(true)
      expect(mockCanvas.add).toHaveBeenCalled()
      expect(mockCanvas.fire).toHaveBeenCalledWith('editor:object-duplicated', {
        object: expect.objectContaining({
          left: left + OBJECT_OFFSET,
          top: top + OBJECT_OFFSET
        })
      })
    })

    it('должен создать копию группы объектов', async() => {
      const mockObjects = [
        createMockFabricObject({ type: 'rect', id: 'rect-1' }),
        createMockFabricObject({ type: 'circle', id: 'circle-1' })
      ]
      const mockGroup = createMockActiveSelection(mockObjects, { left: 100, top: 100 })
      mockCanvas.getActiveObject.mockReturnValue(mockGroup)

      const result = await clipboardManager.copyPaste()

      expect(result).toBe(true)
      expect(mockCanvas.discardActiveObject).toHaveBeenCalled()
      expect(mockCanvas.fire).toHaveBeenCalledWith('editor:object-duplicated', {
        object: expect.any(Object)
      })
    })

    it('должен создать копию группы объектов содержащих SVG', async() => {
      const mockObjects = [
        createMockFabricObject({ type: 'group', format: 'svg', id: 'svg-1' }),
        createMockFabricObject({ type: 'rect', id: 'rect-1' })
      ]
      const mockGroup = createMockActiveSelection(mockObjects, { left: 150, top: 75 })

      const result = await clipboardManager.copyPaste(mockGroup)

      expect(result).toBe(true)
      expect(mockCanvas.discardActiveObject).toHaveBeenCalled()
      expect(mockCanvas.fire).toHaveBeenCalledWith('editor:object-duplicated', {
        object: expect.any(Object)
      })
    })

    it('не должен создавать копию заблокированного объекта', async() => {
      const mockObject = createMockFabricObject({ type: 'rect', locked: true })
      mockCanvas.getActiveObject.mockReturnValue(mockObject)

      const result = await clipboardManager.copyPaste()

      expect(result).toBe(false)
      expect(mockCanvas.add).not.toHaveBeenCalled()
    })
  })

  describe('paste', () => {
    it('должен вставить обычный объект из внутреннего буфера', async() => {
      const left = 50
      const top = 25

      const mockClipboardObject = createMockFabricObject({
        type: 'rect',
        id: 'clipboard-rect',
        left,
        top
      })
      clipboardManager.clipboard = mockClipboardObject

      const result = await clipboardManager.paste()

      expect(result).toBe(true)
      expect(mockCanvas.discardActiveObject).toHaveBeenCalled()
      expect(mockCanvas.add).toHaveBeenCalled()
      expect(mockCanvas.setActiveObject).toHaveBeenCalled()
      expect(mockCanvas.fire).toHaveBeenCalledWith('editor:object-pasted', {
        object: expect.objectContaining({
          left: left + OBJECT_OFFSET,
          top: top + OBJECT_OFFSET
        })
      })
    })

    it('должен вставить SVG объект из внутреннего буфера', async() => {
      const left = 100
      const top = 200

      const mockSvgObject = createMockFabricObject({
        type: 'group',
        format: 'svg',
        id: 'clipboard-svg',
        left,
        top
      })
      clipboardManager.clipboard = mockSvgObject

      const result = await clipboardManager.paste()

      expect(result).toBe(true)
      expect(mockCanvas.add).toHaveBeenCalled()
      expect(mockCanvas.fire).toHaveBeenCalledWith('editor:object-pasted', {
        object: expect.objectContaining({
          left: left + OBJECT_OFFSET,
          top: top + OBJECT_OFFSET
        })
      })
    })

    it('должен вставить группу объектов из внутреннего буфера', async() => {
      const mockObjects = [
        createMockFabricObject({ type: 'rect', id: 'group-rect' }),
        createMockFabricObject({ type: 'circle', id: 'group-circle' })
      ]
      const mockGroup = createMockActiveSelection(mockObjects, { left: 150, top: 100 })
      clipboardManager.clipboard = mockGroup

      const result = await clipboardManager.paste()

      expect(result).toBe(true)
      expect(mockCanvas.discardActiveObject).toHaveBeenCalled()
      // Для ActiveSelection используется специальная логика добавления
      expect(mockEditor.historyManager.suspendHistory).toHaveBeenCalled()
      expect(mockEditor.historyManager.resumeHistory).toHaveBeenCalled()
      expect(mockCanvas.fire).toHaveBeenCalledWith('editor:object-pasted', {
        object: expect.any(Object)
      })
    })

    it('должен вставить группу объектов содержащих SVG из внутреннего буфера', async() => {
      const mockObjects = [
        createMockFabricObject({ type: 'group', format: 'svg', id: 'group-svg' }),
        createMockFabricObject({ type: 'rect', id: 'group-rect' })
      ]
      const mockGroup = createMockActiveSelection(mockObjects, { left: 200, top: 150 })
      clipboardManager.clipboard = mockGroup

      const result = await clipboardManager.paste()

      expect(result).toBe(true)
      expect(mockCanvas.discardActiveObject).toHaveBeenCalled()
      expect(mockEditor.historyManager.suspendHistory).toHaveBeenCalled()
      expect(mockEditor.historyManager.resumeHistory).toHaveBeenCalled()
      expect(mockCanvas.fire).toHaveBeenCalledWith('editor:object-pasted', {
        object: expect.any(Object)
      })
    })

    it('должен обработать вставку ActiveSelection и установить уникальные id', async() => {
      const mockObjects = [
        createMockFabricObject({ type: 'rect', id: 'original-rect', left: 50, top: 50 }),
        createMockFabricObject({ type: 'circle', id: 'original-circle', left: 100, top: 100 }),
        createMockFabricObject({ type: 'text', id: 'original-text', left: 150, top: 150 })
      ]
      const mockGroup = createMockActiveSelection(mockObjects, { left: 100, top: 100 })
      clipboardManager.clipboard = mockGroup

      const result = await clipboardManager.paste()

      expect(result).toBe(true)

      // Проверяем, что объекты были добавлены на canvas через специальную логику для ActiveSelection
      expect(mockCanvas.discardActiveObject).toHaveBeenCalled()
      expect(mockEditor.historyManager.suspendHistory).toHaveBeenCalled()
      expect(mockEditor.historyManager.resumeHistory).toHaveBeenCalled()

      // Проверяем, что добавлено нужное количество объектов
      expect(mockCanvas.add).toHaveBeenCalledTimes(mockObjects.length)

      // Проверяем вызов события
      expect(mockCanvas.fire).toHaveBeenCalledWith('editor:object-pasted', {
        object: expect.any(ActiveSelection)
      })
    })

    it('должен обработать copyPaste для ActiveSelection и установить уникальные id', async() => {
      const mockObjects = [
        createMockFabricObject({ type: 'rect', id: 'original-rect', left: 75, top: 75 }),
        createMockFabricObject({ type: 'circle', id: 'original-circle', left: 125, top: 125 })
      ]
      const mockGroup = createMockActiveSelection(mockObjects, { left: 150, top: 100 })
      mockCanvas.getActiveObject.mockReturnValue(mockGroup)

      const result = await clipboardManager.copyPaste()

      expect(result).toBe(true)

      // Проверяем, что были вызваны нужные методы для ActiveSelection
      expect(mockCanvas.discardActiveObject).toHaveBeenCalled()
      expect(mockEditor.historyManager.suspendHistory).toHaveBeenCalled()
      expect(mockEditor.historyManager.resumeHistory).toHaveBeenCalled()

      // Проверяем, что добавлено нужное количество объектов
      expect(mockCanvas.add).toHaveBeenCalledTimes(mockObjects.length)

      // Проверяем вызов события
      expect(mockCanvas.fire).toHaveBeenCalledWith('editor:object-duplicated', {
        object: expect.any(ActiveSelection)
      })
    })

    it('не должен вставлять если буфер пустой', async() => {
      clipboardManager.clipboard = null

      const result = await clipboardManager.paste()

      expect(result).toBe(false)
      expect(mockCanvas.add).not.toHaveBeenCalled()
      expect(mockCanvas.fire).not.toHaveBeenCalled()
    })
  })

  // Тесты комбинированных сценариев
  describe('комбинированные сценарии копирования и вставки', () => {
    it('должен корректно работать: копирование внутри редактора -> вставка извне -> вставка изнутри', async() => {
      // 1. Копируем объект внутри редактора
      const internalObject = createMockFabricObject({ type: 'rect', id: 'internal-rect' })
      mockCanvas.getActiveObject.mockReturnValue(internalObject)
      clipboardManager.copy()

      await new Promise(process.nextTick) // Ждем асинхронного клонирования

      expect(clipboardManager.clipboard).toBeTruthy()

      // 2. Имитируем вставку извне (изображение из системного буфера)
      const mockImage = createMockFabricObject({ type: 'image', id: 'external-image' })
      mockEditor.imageManager.importImage.mockResolvedValue({
        image: mockImage
      })

      const clipboardEvent = createMockClipboardEvent({
        items: [{ type: 'image/png', getAsFile: () => new Blob() }]
      })

      await clipboardManager.handlePasteEvent(clipboardEvent)
      // Даем время на FileReader
      await new Promise((resolve) => {
        setTimeout(() => resolve(undefined), ASYNC_DELAY)
      })

      expect(mockEditor.imageManager.importImage).toHaveBeenCalledWith({
        source: expect.any(String),
        fromClipboard: true
      })

      expect(mockCanvas.fire).toHaveBeenCalledWith('editor:object-pasted', {
        object: mockImage
      })

      // 3. Вставляем внутренний объект
      const result = await clipboardManager.paste()

      expect(result).toBe(true)
      expect(mockCanvas.fire).toHaveBeenCalledWith('editor:object-pasted', {
        object: expect.any(Object)
      })
    })

    it('должен корректно работать: копирование извне -> копирование внутри -> вставка внутреннего объекта', async() => {
      // 1. Вставляем изображение извне (симулируем что уже было скопировано извне)
      mockEditor.imageManager.importImage.mockResolvedValue({
        image: createMockFabricObject({ type: 'image', id: 'external-image' })
      })

      const clipboardEvent = createMockClipboardEvent({
        items: [{ type: 'image/jpeg', getAsFile: () => new Blob() }]
      })

      await clipboardManager.handlePasteEvent(clipboardEvent)

      // 2. Копируем объект внутри редактора (должен перезаписать внутренний буфер)
      const internalObject = createMockFabricObject({ type: 'circle', id: 'internal-circle' })
      mockCanvas.getActiveObject.mockReturnValue(internalObject)
      clipboardManager.copy()

      await new Promise(process.nextTick)

      // 3. Вставляем - должен вставиться внутренний объект, а не внешний
      const result = await clipboardManager.paste()

      expect(result).toBe(true)
      expect(mockCanvas.fire).toHaveBeenCalledWith('editor:object-pasted', {
        object: expect.any(Object)
      })
    })
  })

  describe('handlePasteEvent', () => {
    it('должен обработать вставку изображения из системного буфера обмена', async() => {
      const mockImage = createMockFabricObject({ type: 'image', id: 'pasted-image' })
      mockEditor.imageManager.importImage.mockResolvedValue({
        image: mockImage
      })

      const clipboardEvent = createMockClipboardEvent({
        items: [{
          type: 'image/png',
          getAsFile: () => new Blob(['fake image'], { type: 'image/png' })
        }]
      })

      await clipboardManager.handlePasteEvent(clipboardEvent)
      // Даем время на выполнение FileReader
      await new Promise((resolve) => {
        setTimeout(() => resolve(undefined), ASYNC_DELAY)
      })

      expect(mockEditor.imageManager.importImage).toHaveBeenCalledWith({
        source: expect.stringContaining('data:image/png;base64,'),
        fromClipboard: true
      })

      expect(mockCanvas.fire).toHaveBeenCalledWith('editor:object-pasted', {
        object: mockImage
      })
    })

    it('должен обработать вставку HTML с изображением', async() => {
      const mockImage = createMockFabricObject({ type: 'image', id: 'html-image' })
      mockEditor.imageManager.importImage.mockResolvedValue({
        image: mockImage
      })

      const mockImg = { src: 'https://example.com/image.jpg' }
      mockQuerySelector.mockReturnValue(mockImg)

      const getDataMock = jest.fn().mockImplementation((type) => {
        if (type === 'text/html') {
          return '<img src="https://example.com/image.jpg" alt="test">'
        }
        return ''
      })

      const clipboardEvent = createMockClipboardEvent({
        items: [{
          type: 'text/html',
          getAsFile: () => null // HTML элементы не возвращают файл
        }],
        getData: getDataMock
      })

      await clipboardManager.handlePasteEvent(clipboardEvent)

      // Даем время на асинхронное выполнение _handleImageImport
      await new Promise((resolve) => {
        setTimeout(() => resolve(undefined), ASYNC_DELAY)
      })

      expect(mockEditor.imageManager.importImage).toHaveBeenCalledWith({
        source: 'https://example.com/image.jpg',
        fromClipboard: true
      })

      expect(mockCanvas.fire).toHaveBeenCalledWith('editor:object-pasted', {
        object: mockImage
      })
    })

    it('должен использовать внутренний буфер при наличии текста с префиксом редактора', async() => {
      const mockObject = createMockFabricObject({ type: 'rect' })
      clipboardManager.clipboard = mockObject

      const clipboardEvent = createMockClipboardEvent({
        getData: jest.fn().mockImplementation((type) => {
          if (type === 'text/plain') {
            return 'application/image-editor:{"type":"rect"}'
          }
          return ''
        })
      })

      await clipboardManager.handlePasteEvent(clipboardEvent)

      expect(mockCanvas.fire).toHaveBeenCalledWith('editor:object-pasted', {
        object: expect.any(Object)
      })
    })

    it('должен использовать внутренний буфер когда clipboardData пустой', async() => {
      const mockObject = createMockFabricObject({ type: 'rect' })
      clipboardManager.clipboard = mockObject

      const emptyEvent = createEmptyClipboardEvent()
      await clipboardManager.handlePasteEvent(emptyEvent)

      expect(mockCanvas.fire).toHaveBeenCalledWith('editor:object-pasted', {
        object: expect.any(Object)
      })
    })

    it('должен делать fallback к paste() когда HTML не содержит изображений', async() => {
      const mockObject = createMockFabricObject({ type: 'rect' })
      clipboardManager.clipboard = mockObject

      const clipboardEvent = createMockClipboardEvent({
        items: [{ type: 'text/html', getAsFile: () => null }],
        getData: jest.fn().mockImplementation((type) => {
          if (type === 'text/html') return '<p>Some text without images</p>'
          return ''
        })
      })

      mockQuerySelector.mockReturnValue(null) // Нет img элементов

      await clipboardManager.handlePasteEvent(clipboardEvent)

      expect(mockCanvas.fire).toHaveBeenCalledWith('editor:object-pasted', {
        object: expect.any(Object)
      })
    })
  })

  // Тесты обработки ошибок
  describe('error handling', () => {
    it('должен обработать ошибку клонирования при копировании', async() => {
      const failingObject = createFailingMockObject('Clone error in copy')
      mockCanvas.getActiveObject.mockReturnValue(failingObject)

      clipboardManager.copy()
      await new Promise(process.nextTick)

      expect(clipboardManager.clipboard).toBeNull()
      expect(mockEditor.errorManager.emitError).toHaveBeenCalledWith({
        origin: 'ClipboardManager',
        method: '_cloneToInternalClipboard',
        code: 'CLONE_FAILED',
        message: 'Ошибка клонирования объекта для внутреннего буфера',
        data: expect.any(Error)
      })
    })

    it('должен обработать ошибку клонирования при вставке', async() => {
      const failingObject = createFailingMockObject('Clone error in paste')
      clipboardManager.clipboard = failingObject

      const result = await clipboardManager.paste()

      expect(result).toBe(false)
      expect(mockEditor.errorManager.emitError).toHaveBeenCalledWith({
        origin: 'ClipboardManager',
        method: 'paste',
        code: 'PASTE_FAILED',
        message: 'Ошибка вставки объекта',
        data: expect.any(Error)
      })
    })

    it('должен обработать ошибку клонирования в copyPaste', async() => {
      const failingObject = createFailingMockObject('Clone error in copyPaste')
      mockCanvas.getActiveObject.mockReturnValue(failingObject)

      const result = await clipboardManager.copyPaste()

      expect(result).toBe(false)
      expect(mockEditor.errorManager.emitError).toHaveBeenCalledWith({
        origin: 'ClipboardManager',
        method: 'copyPaste',
        code: 'COPY_PASTE_FAILED',
        message: 'Ошибка создания копии объекта',
        data: expect.any(Error)
      })
    })

    it('должен обработать ошибку импорта изображения', async() => {
      mockEditor.imageManager.importImage.mockRejectedValue(new Error('Import failed'))

      const clipboardEvent = createMockClipboardEvent({
        items: [{ type: 'image/png', getAsFile: () => new Blob() }]
      })

      await clipboardManager.handlePasteEvent(clipboardEvent)
      await new Promise((resolve) => setTimeout(resolve, ASYNC_DELAY))

      expect(mockEditor.errorManager.emitError).toHaveBeenCalledWith({
        origin: 'ClipboardManager',
        method: 'handlePasteEvent',
        code: 'PASTE_IMAGE_FAILED',
        message: 'Ошибка вставки изображения из буфера обмена',
        data: expect.any(Error)
      })
    })

    it('должен обработать ошибку импорта HTML изображения', async() => {
      mockEditor.imageManager.importImage.mockRejectedValue(new Error('HTML import failed'))

      const mockImg = { src: 'https://example.com/image.jpg' }
      mockQuerySelector.mockReturnValue(mockImg)

      const clipboardEvent = createMockClipboardEvent({
        items: [{ type: 'text/html', getAsFile: () => null }],
        getData: jest.fn().mockImplementation((type) => {
          if (type === 'text/html') return '<img src="https://example.com/image.jpg" alt="test">'
          return ''
        })
      })

      await clipboardManager.handlePasteEvent(clipboardEvent)
      await new Promise((resolve) => setTimeout(resolve, ASYNC_DELAY))

      expect(mockEditor.errorManager.emitError).toHaveBeenCalledWith({
        origin: 'ClipboardManager',
        method: 'handlePasteEvent',
        code: 'PASTE_HTML_IMAGE_FAILED',
        message: 'Ошибка вставки изображения из HTML',
        data: expect.any(Error)
      })
    })
  })
})
