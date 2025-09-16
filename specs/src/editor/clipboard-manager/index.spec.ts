import {
  createManagerTestMocks,
  createMockFabricObject,
  createMockActiveSelection,
  createMockClipboardEvent,
  setupBrowserMocks,
  mockQuerySelector
} from '../../../test-utils/editor-helpers'
import ClipboardManager from '../../../../src/editor/clipboard-manager'

describe('ClipboardManager', () => {
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
      const mockObject = createMockFabricObject({
        type: 'rect',
        id: 'original-rect',
        left: 100,
        top: 50
      })
      mockCanvas.getActiveObject.mockReturnValue(mockObject)

      const result = await clipboardManager.copyPaste()

      expect(result).toBe(true)
      expect(mockCanvas.add).toHaveBeenCalled()
      expect(mockCanvas.setActiveObject).toHaveBeenCalled()
      expect(mockCanvas.fire).toHaveBeenCalledWith('editor:object-duplicated', {
        object: expect.objectContaining({
          left: 110, // +10 смещение
          top: 60 // +10 смещение
        })
      })
    })

    it('должен создать копию SVG объекта', async() => {
      const mockSvgObject = createMockFabricObject({
        type: 'path',
        id: 'original-svg',
        left: 50,
        top: 25
      })
      mockCanvas.getActiveObject.mockReturnValue(mockSvgObject)

      const result = await clipboardManager.copyPaste(mockSvgObject)

      expect(result).toBe(true)
      expect(mockCanvas.add).toHaveBeenCalled()
      expect(mockCanvas.fire).toHaveBeenCalledWith('editor:object-duplicated', {
        object: expect.objectContaining({
          left: 60,
          top: 35
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
        createMockFabricObject({ type: 'path', id: 'svg-1' }),
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
      const mockClipboardObject = createMockFabricObject({
        type: 'rect',
        id: 'clipboard-rect',
        left: 50,
        top: 25
      })
      clipboardManager.clipboard = mockClipboardObject

      const result = await clipboardManager.paste()

      expect(result).toBe(true)
      expect(mockCanvas.discardActiveObject).toHaveBeenCalled()
      expect(mockCanvas.add).toHaveBeenCalled()
      expect(mockCanvas.setActiveObject).toHaveBeenCalled()
      expect(mockCanvas.fire).toHaveBeenCalledWith('editor:object-pasted', {
        object: expect.objectContaining({
          left: 60,
          top: 35
        })
      })
    })

    it('должен вставить SVG объект из внутреннего буфера', async() => {
      const mockSvgObject = createMockFabricObject({
        type: 'path',
        id: 'clipboard-svg',
        left: 100,
        top: 200
      })
      clipboardManager.clipboard = mockSvgObject

      const result = await clipboardManager.paste()

      expect(result).toBe(true)
      expect(mockCanvas.add).toHaveBeenCalled()
      expect(mockCanvas.fire).toHaveBeenCalledWith('editor:object-pasted', {
        object: expect.objectContaining({
          left: 110,
          top: 210
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
        createMockFabricObject({ type: 'path', id: 'group-svg' }),
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
        setTimeout(() => resolve(undefined), 10)
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
        setTimeout(() => resolve(undefined), 10)
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
        setTimeout(() => resolve(undefined), 10)
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
  })
})
