import { ActiveSelection } from 'fabric'
import { createManagerTestMocks } from '../../../test-utils/editor/manager-test-mocks'
import {
  createMockFabricObject,
  createMockActiveSelection,
  createMockClipboardEvent,
  createFailingMockObject,
  createEmptyClipboardEvent
} from '../../../test-utils/fabric/objects'
import { setupBrowserMocks, mockQuerySelector } from '../../../test-utils/browser/clipboard-globals'
import {
  createMockShapeNode,
  createMockShapeTextbox
} from '../../../test-utils/shape/factories'
import { installExternalImagePastePendingDefer } from '../../../test-utils/managers/clipboard'
import { enableCanvasFireHandlers } from '../../../test-utils/canvas/events'
import ClipboardManager from '../../../../src/editor/clipboard-manager'
import { CLIPBOARD_CLONE_OBJECT_KEYS } from '../../../../src/editor/constants'
import { ShapeGroupObject } from '../../../../src/editor/shape-manager/domain/shape-group'

type ClipboardTextObject = {
  text?: string
  textCaseRaw?: string
  uppercase?: boolean
}

type AddedCanvasObject = {
  id?: string
  evented?: boolean
} & ClipboardTextObject

describe('ClipboardManager', () => {
  const ASYNC_DELAY = 10
  const OBJECT_OFFSET = 10
  let mockEditor: any
  let clipboardManager: ClipboardManager
  let mockCanvas: any
  let commitStandaloneTextScaleMock: jest.Mock
  let commitRehydratedShapeLayoutMock: jest.Mock

  beforeEach(() => {
    // Устанавливаем глобальные моки браузерных API
    setupBrowserMocks()

    const mocks = createManagerTestMocks()
    mockEditor = mocks.mockEditor
    mockCanvas = mocks.mockCanvas
    commitStandaloneTextScaleMock = mockEditor.textManager.commitStandaloneTextScale as jest.Mock
    commitRehydratedShapeLayoutMock = mockEditor.shapeManager.commitRehydratedShapeLayout as jest.Mock

    clipboardManager = new ClipboardManager({ editor: mockEditor })

    // Очищаем все моки
    jest.clearAllMocks()
  })

  describe('constructor', () => {
    it('должен инициализировать ClipboardManager с правильными параметрами', () => {
      expect(clipboardManager.editor).toBe(mockEditor)
      expect(clipboardManager.clipboard).toBeNull()
    })

    it('список свойств для clipboard cloning включает режим авторасширения текста у фигуры', () => {
      expect(CLIPBOARD_CLONE_OBJECT_KEYS).toContain('shapeTextAutoExpand')
    })

    it('список свойств для clipboard cloning не включает временную wrap policy текста у фигуры', () => {
      expect(CLIPBOARD_CLONE_OBJECT_KEYS).not.toContain('shapeTextWrapPolicy')
    })

    it('список свойств для clipboard cloning включает replacement box фигуры', () => {
      expect(CLIPBOARD_CLONE_OBJECT_KEYS).toContain('shapeReplaceBoxWidth')
      expect(CLIPBOARD_CLONE_OBJECT_KEYS).toContain('shapeReplaceBoxHeight')
    })

    it('список свойств для clipboard cloning включает id объектов', () => {
      expect(CLIPBOARD_CLONE_OBJECT_KEYS).toContain('id')
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

  describe('cut', () => {
    it('вырезает активный объект только после копирования во внутренний буфер', async() => {
      const mockObject = createMockFabricObject({ type: 'rect', id: 'cut-rect' })
      mockCanvas.getActiveObject.mockReturnValue(mockObject)
      mockEditor.deletionManager.deleteSelectedObjects.mockReturnValue({
        objects: [mockObject],
        withoutSave: false
      })

      const result = await clipboardManager.cut()

      expect(result).toBe(true)
      expect(clipboardManager.clipboard).toBeTruthy()
      expect(mockCanvas.fire).toHaveBeenCalledWith('editor:object-copied', {
        object: expect.any(Object)
      })
      expect(mockEditor.deletionManager.deleteSelectedObjects).toHaveBeenCalledWith({
        objects: [mockObject]
      })
      expect(mockCanvas.fire.mock.invocationCallOrder[0]).toBeLessThan(
        mockEditor.deletionManager.deleteSelectedObjects.mock.invocationCallOrder[0]
      )
    })

    it('вырезает все объекты из текущего выделения', async() => {
      const selectedObjects = [
        createMockFabricObject({ type: 'rect', id: 'cut-rect-1' }),
        createMockFabricObject({ type: 'circle', id: 'cut-circle-1' })
      ]
      const selection = createMockActiveSelection(selectedObjects, { left: 100, top: 100 })
      mockCanvas.getActiveObject.mockReturnValue(selection)
      mockEditor.deletionManager.deleteSelectedObjects.mockReturnValue({
        objects: selectedObjects,
        withoutSave: false
      })

      const result = await clipboardManager.cut()

      expect(result).toBe(true)
      expect(clipboardManager.clipboard).toBeTruthy()
      expect(mockEditor.deletionManager.deleteSelectedObjects).toHaveBeenCalledWith({
        objects: selectedObjects
      })
      expect(mockCanvas.fire).toHaveBeenCalledWith('editor:object-copied', {
        object: expect.any(ActiveSelection)
      })
    })

    it('не вырезает заблокированный объект', async() => {
      const mockObject = createMockFabricObject({ type: 'rect', locked: true })
      mockCanvas.getActiveObject.mockReturnValue(mockObject)

      const result = await clipboardManager.cut()

      expect(result).toBe(false)
      expect(clipboardManager.clipboard).toBeNull()
      expect(mockEditor.deletionManager.deleteSelectedObjects).not.toHaveBeenCalled()
      expect(mockCanvas.fire).not.toHaveBeenCalled()
    })

    it('не удаляет объект если копирование во внутренний буфер упало', async() => {
      const failingObject = createFailingMockObject('Clone error in cut')
      mockCanvas.getActiveObject.mockReturnValue(failingObject)

      const result = await clipboardManager.cut()

      expect(result).toBe(false)
      expect(clipboardManager.clipboard).toBeNull()
      expect(mockEditor.deletionManager.deleteSelectedObjects).not.toHaveBeenCalled()
      expect(mockEditor.errorManager.emitError).toHaveBeenCalledWith({
        origin: 'ClipboardManager',
        method: '_cloneToInternalClipboard',
        code: 'CLONE_FAILED',
        message: 'Ошибка клонирования объекта для внутреннего буфера',
        data: expect.any(Error)
      })
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
        targetObject: mockObject,
        clonedObject: expect.objectContaining({
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
        targetObject: mockSvgObject,
        clonedObject: expect.objectContaining({
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
        targetObject: mockGroup,
        clonedObject: expect.any(Object)
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
        targetObject: mockGroup,
        clonedObject: expect.any(Object)
      })
    })

    it('не должен создавать копию заблокированного объекта', async() => {
      const mockObject = createMockFabricObject({ type: 'rect', locked: true })
      mockCanvas.getActiveObject.mockReturnValue(mockObject)

      const result = await clipboardManager.copyPaste()

      expect(result).toBe(false)
      expect(mockCanvas.add).not.toHaveBeenCalled()
    })

    it('дублирует текст с уже актуальным размером после прошлых трансформаций', async() => {
      const textbox = createMockFabricObject({
        type: 'textbox',
        id: 'scaled-text',
        left: 40,
        top: 20,
        scaleX: 1.4,
        scaleY: 0.8
      })
      mockCanvas.getActiveObject.mockReturnValue(textbox)

      const result = await clipboardManager.copyPaste()

      expect(result).toBe(true)
      expect(commitStandaloneTextScaleMock).toHaveBeenCalledWith({
        target: expect.objectContaining({
          type: 'textbox'
        })
      })
      expect(commitStandaloneTextScaleMock.mock.invocationCallOrder[0]).toBeLessThan(
        mockCanvas.add.mock.invocationCallOrder[0]
      )
    })

    it('дублирует группу с текстом уже в итоговом размере', async() => {
      const selection = createMockActiveSelection([
        createMockFabricObject({
          type: 'textbox',
          id: 'text-1',
          left: 40,
          top: 20,
          scaleX: 1.4,
          scaleY: 0.8
        }),
        createMockFabricObject({
          type: 'rect',
          id: 'rect-1',
          left: 80,
          top: 20
        })
      ], {
        left: 100,
        top: 80
      })
      mockCanvas.getActiveObject.mockReturnValue(selection)

      const result = await clipboardManager.copyPaste()

      expect(result).toBe(true)
      expect(commitStandaloneTextScaleMock).toHaveBeenCalledWith({
        target: expect.objectContaining({
          type: 'textbox'
        })
      })
      expect(commitStandaloneTextScaleMock.mock.invocationCallOrder[0]).toBeLessThan(
        mockCanvas.add.mock.invocationCallOrder[0]
      )
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
        fromInternalClipboard: true,
        clipboardObject: mockClipboardObject,
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
        fromInternalClipboard: true,
        clipboardObject: mockSvgObject,
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
        fromInternalClipboard: true,
        clipboardObject: mockGroup,
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
        fromInternalClipboard: true,
        clipboardObject: mockGroup,
        object: expect.any(Object)
      })
    })

    it('вставляет выделение с новыми id у всех объектов', async() => {
      const mockObjects = [
        createMockFabricObject({ type: 'rect', id: 'original-rect', left: 50, top: 50 }),
        createMockFabricObject({ type: 'circle', id: 'original-circle', left: 100, top: 100 }),
        createMockFabricObject({ type: 'text', id: 'original-text', left: 150, top: 150 })
      ]
      const mockGroup = createMockActiveSelection(mockObjects, { left: 100, top: 100 })
      clipboardManager.clipboard = mockGroup

      const result = await clipboardManager.paste()

      expect(result).toBe(true)
      expect(mockCanvas.discardActiveObject).toHaveBeenCalled()
      expect(mockEditor.historyManager.suspendHistory).toHaveBeenCalled()
      expect(mockEditor.historyManager.resumeHistory).toHaveBeenCalled()
      expect(mockCanvas.add).toHaveBeenCalledTimes(mockObjects.length)

      const addedObjects = (mockCanvas.add.mock.calls as Array<[AddedCanvasObject]>).map(([object]) => object)
      const addedIds = addedObjects.map((object) => object.id)

      expect(addedIds).toHaveLength(mockObjects.length)
      expect(new Set(addedIds).size).toBe(mockObjects.length)
      expect(addedIds).not.toContain('original-rect')
      expect(addedIds).not.toContain('original-circle')
      expect(addedIds).not.toContain('original-text')
      addedObjects.forEach((object) => {
        expect(object.evented).toBe(true)
      })
      expect(mockCanvas.fire).toHaveBeenCalledWith('editor:object-pasted', {
        fromInternalClipboard: true,
        clipboardObject: mockGroup,
        object: expect.any(ActiveSelection)
      })
    })

    it('вставляет шейп из внутреннего буфера без потери свойств группы', async() => {
      const sourceShape = createMockShapeNode({ id: 'source-shape' })
      const sourceText = createMockShapeTextbox({ text: 'source text' })
      sourceText.set({ id: 'source-text' })
      const pastedShape = createMockShapeNode({ id: 'pasted-shape' })
      const pastedText = createMockShapeTextbox({ text: 'pasted text' })
      pastedText.set({ id: 'pasted-text' })
      const sourceGroup = new ShapeGroupObject([
        sourceShape as never,
        sourceText
      ], {
        id: 'source-group',
        left: 10,
        top: 20,
        shapePresetKey: 'square'
      })
      const pastedGroup = new ShapeGroupObject([
        pastedShape as never,
        pastedText
      ], {
        id: 'pasted-group',
        left: 10,
        top: 20,
        shapePresetKey: 'square'
      })

      sourceGroup.clone = jest.fn().mockResolvedValue(pastedGroup) as never
      clipboardManager.clipboard = sourceGroup

      const result = await clipboardManager.paste()

      expect(mockEditor.errorManager.emitError).not.toHaveBeenCalled()
      expect(result).toBe(true)
      expect(mockCanvas.add).toHaveBeenCalledWith(pastedGroup)
      expect(pastedGroup.shapeComposite).toBe(true)
      expect(pastedGroup.interactive).toBe(true)
      expect(pastedGroup.subTargetCheck).toBe(true)
      expect(pastedGroup.id).toEqual(expect.any(String))
      expect(pastedGroup.id).not.toBe('pasted-group')
      expect(pastedShape.id).toEqual(expect.any(String))
      expect(pastedShape.id).not.toBe('pasted-shape')
      expect(pastedText.id).toEqual(expect.any(String))
      expect(pastedText.id).not.toBe('pasted-text')
      expect(commitRehydratedShapeLayoutMock).toHaveBeenCalledWith({
        target: pastedGroup
      })
      expect(commitRehydratedShapeLayoutMock.mock.invocationCallOrder[0]).toBeLessThan(
        mockCanvas.add.mock.invocationCallOrder[0]
      )
      expect(mockCanvas.fire).toHaveBeenCalledWith('editor:object-pasted', {
        fromInternalClipboard: true,
        clipboardObject: sourceGroup,
        object: pastedGroup
      })
    })

    it('дублирует выделение с новыми id у всех объектов', async() => {
      const mockObjects = [
        createMockFabricObject({ type: 'rect', id: 'original-rect', left: 75, top: 75 }),
        createMockFabricObject({ type: 'circle', id: 'original-circle', left: 125, top: 125 })
      ]
      const mockGroup = createMockActiveSelection(mockObjects, { left: 150, top: 100 })
      mockCanvas.getActiveObject.mockReturnValue(mockGroup)

      const result = await clipboardManager.copyPaste()

      expect(result).toBe(true)
      expect(mockCanvas.discardActiveObject).toHaveBeenCalled()
      expect(mockEditor.historyManager.suspendHistory).toHaveBeenCalled()
      expect(mockEditor.historyManager.resumeHistory).toHaveBeenCalled()
      expect(mockCanvas.add).toHaveBeenCalledTimes(mockObjects.length)

      const addedObjects = (mockCanvas.add.mock.calls as Array<[AddedCanvasObject]>).map(([object]) => object)
      const addedIds = addedObjects.map((object) => object.id)

      expect(addedIds).toHaveLength(mockObjects.length)
      expect(new Set(addedIds).size).toBe(mockObjects.length)
      expect(addedIds).not.toContain('original-rect')
      expect(addedIds).not.toContain('original-circle')
      addedObjects.forEach((object) => {
        expect(object.evented).toBe(true)
      })
      expect(mockCanvas.fire).toHaveBeenCalledWith('editor:object-duplicated', {
        targetObject: mockGroup,
        clonedObject: expect.any(ActiveSelection)
      })
    })

    it('не должен вставлять если буфер пустой', async() => {
      clipboardManager.clipboard = null

      const result = await clipboardManager.paste()

      expect(result).toBe(false)
      expect(mockCanvas.add).not.toHaveBeenCalled()
      expect(mockCanvas.fire).not.toHaveBeenCalled()
    })

    it('вставляет текст из буфера с уже актуальным размером после прошлых трансформаций', async() => {
      clipboardManager.clipboard = createMockFabricObject({
        type: 'textbox',
        id: 'clipboard-text',
        left: 60,
        top: 30,
        scaleX: 0.7,
        scaleY: 1.2
      })

      const result = await clipboardManager.paste()

      expect(result).toBe(true)
      expect(commitStandaloneTextScaleMock).toHaveBeenCalledWith({
        target: expect.objectContaining({
          type: 'textbox'
        })
      })
      expect(commitStandaloneTextScaleMock.mock.invocationCallOrder[0]).toBeLessThan(
        mockCanvas.add.mock.invocationCallOrder[0]
      )
    })

    it('вставляет группу с текстом уже в итоговом размере', async() => {
      clipboardManager.clipboard = createMockActiveSelection([
        createMockFabricObject({
          type: 'textbox',
          id: 'text-1',
          left: 40,
          top: 20,
          scaleX: 0.7,
          scaleY: 1.2
        }),
        createMockFabricObject({
          type: 'rect',
          id: 'rect-1',
          left: 90,
          top: 20
        })
      ], {
        left: 120,
        top: 90
      })

      const result = await clipboardManager.paste()

      expect(result).toBe(true)
      expect(commitStandaloneTextScaleMock).toHaveBeenCalledWith({
        target: expect.objectContaining({
          type: 'textbox'
        })
      })
      expect(commitStandaloneTextScaleMock.mock.invocationCallOrder[0]).toBeLessThan(
        mockCanvas.add.mock.invocationCallOrder[0]
      )
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
        fromInternalClipboard: false,
        imageSource: expect.any(String),
        object: mockImage
      })

      // 3. Вставляем внутренний объект
      const result = await clipboardManager.paste()

      expect(result).toBe(true)
      expect(mockCanvas.fire).toHaveBeenCalledWith('editor:object-pasted', {
        fromInternalClipboard: true,
        clipboardObject: clipboardManager.clipboard,
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
        fromInternalClipboard: true,
        clipboardObject: clipboardManager.clipboard,
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
      await new Promise<void>((resolve) => {
        setTimeout(() => resolve(), ASYNC_DELAY)
      })

      expect(mockEditor.imageManager.importImage).toHaveBeenCalledWith({
        source: expect.stringContaining('data:image/png;base64,'),
        fromClipboard: true
      })

      expect(mockCanvas.fire).toHaveBeenCalledWith('editor:object-pasted', {
        fromInternalClipboard: false,
        imageSource: expect.stringContaining('data:image/png;base64,'),
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
      await new Promise<void>((resolve) => {
        setTimeout(() => resolve(), ASYNC_DELAY)
      })

      expect(mockEditor.imageManager.importImage).toHaveBeenCalledWith({
        source: 'https://example.com/image.jpg',
        fromClipboard: true
      })

      expect(mockCanvas.fire).toHaveBeenCalledWith('editor:object-pasted', {
        fromInternalClipboard: false,
        imageSource: 'https://example.com/image.jpg',
        object: mockImage
      })
    })

    it('должен отложить вставку внешнего изображения и прокинуть customData в importImage', async() => {
      enableCanvasFireHandlers(mockCanvas)
      const { getControls, getImageSource } = installExternalImagePastePendingDefer(mockCanvas)

      const mockImage = createMockFabricObject({ type: 'image', id: 'deferred-image' })
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

      await new Promise<void>((resolve) => {
        setTimeout(() => resolve(), ASYNC_DELAY)
      })

      // Вставка отложена, пока не вызван resolve
      expect(getImageSource()).toEqual(expect.stringContaining('data:image/png;base64,'))
      expect(mockEditor.imageManager.importImage).not.toHaveBeenCalled()

      const controls = getControls()
      expect(controls).toBeTruthy()

      const customData = { uploadedAssetId: 'asset-123', meta: { a: 1 } }
      controls?.resolve({ customData })

      await new Promise(process.nextTick)

      expect(mockEditor.imageManager.importImage).toHaveBeenCalledWith({
        source: expect.stringContaining('data:image/png;base64,'),
        fromClipboard: true,
        customData
      })

      expect(mockCanvas.fire).toHaveBeenCalledWith('editor:object-pasted', {
        fromInternalClipboard: false,
        imageSource: expect.stringContaining('data:image/png;base64,'),
        object: mockImage
      })
    })

    it('должен прокинуть importOptions в imageManager.importImage при отложенной вставке', async() => {
      enableCanvasFireHandlers(mockCanvas)
      const { getControls } = installExternalImagePastePendingDefer(mockCanvas)

      const mockImage = createMockFabricObject({ type: 'image', id: 'deferred-image-opts' })
      mockEditor.imageManager.importImage.mockResolvedValue({ image: mockImage })

      const clipboardEvent = createMockClipboardEvent({
        items: [{
          type: 'image/png',
          getAsFile: () => new Blob(['fake image'], { type: 'image/png' })
        }]
      })

      await clipboardManager.handlePasteEvent(clipboardEvent)
      await new Promise<void>((resolve) => {
        setTimeout(() => resolve(), ASYNC_DELAY)
      })

      const controls = getControls()
      expect(controls).toBeTruthy()

      const customData = { uploaded: true }
      const importOptions = { withoutSelection: true, scale: 'image-cover' }
      controls?.resolve({
        ...importOptions,
        customData
      })

      await new Promise(process.nextTick)

      expect(mockEditor.imageManager.importImage).toHaveBeenCalledWith({
        source: expect.stringContaining('data:image/png;base64,'),
        fromClipboard: true,
        customData,
        ...importOptions
      })
    })

    it('должен позволить отклонить отложенную вставку внешнего изображения', async() => {
      enableCanvasFireHandlers(mockCanvas)
      const { getControls } = installExternalImagePastePendingDefer(mockCanvas)

      const clipboardEvent = createMockClipboardEvent({
        items: [{ type: 'image/png', getAsFile: () => new Blob(['fake image'], { type: 'image/png' }) }]
      })

      await clipboardManager.handlePasteEvent(clipboardEvent)
      await new Promise<void>((resolve) => {
        setTimeout(() => resolve(), ASYNC_DELAY)
      })

      const controls = getControls()
      expect(controls).toBeTruthy()

      controls?.reject(new Error('Cancelled by user'))

      await new Promise<void>((resolve) => {
        setTimeout(() => resolve(), 0)
      })

      expect(mockEditor.imageManager.importImage).not.toHaveBeenCalled()
      expect(mockEditor.errorManager.emitError).toHaveBeenCalledWith({
        origin: 'ClipboardManager',
        method: '_handleImageImport',
        code: 'EXTERNAL_PASTE_DEFERRED_REJECTED',
        message: 'Вставка изображения из буфера обмена была отменена или завершилась ошибкой',
        data: { error: expect.any(Error) }
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

      await new Promise(process.nextTick)

      expect(mockCanvas.fire).toHaveBeenCalledWith('editor:object-pasted', {
        fromInternalClipboard: true,
        clipboardObject: mockObject,
        object: expect.any(Object)
      })
    })

    it('должен использовать внутренний буфер когда clipboardData пустой', async() => {
      const mockObject = createMockFabricObject({ type: 'rect' })
      clipboardManager.clipboard = mockObject

      const emptyEvent = createEmptyClipboardEvent()
      await clipboardManager.handlePasteEvent(emptyEvent)

      await new Promise(process.nextTick)

      expect(mockCanvas.fire).toHaveBeenCalledWith('editor:object-pasted', {
        fromInternalClipboard: true,
        clipboardObject: mockObject,
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

      await new Promise(process.nextTick)

      expect(mockCanvas.fire).toHaveBeenCalledWith('editor:object-pasted', {
        fromInternalClipboard: true,
        clipboardObject: mockObject,
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
      await new Promise<void>((resolve) => {
        setTimeout(() => resolve(), ASYNC_DELAY)
      })

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
      await new Promise<void>((resolve) => {
        setTimeout(() => resolve(), ASYNC_DELAY)
      })

      expect(mockEditor.errorManager.emitError).toHaveBeenCalledWith({
        origin: 'ClipboardManager',
        method: 'handlePasteEvent',
        code: 'PASTE_HTML_IMAGE_FAILED',
        message: 'Ошибка вставки изображения из HTML',
        data: expect.any(Error)
      })
    })
  })

  describe('копирование текстовых объектов с кастомными свойствами', () => {
    it('shapeTextAutoExpand корректно копируется во внутренний буфер фигуры', async() => {
      const shapeGroup = createMockFabricObject({
        type: 'shape-group',
        id: 'shape-1',
        shapeComposite: true,
        shapeTextAutoExpand: false
      })

      mockCanvas.getActiveObject.mockReturnValue(shapeGroup)

      clipboardManager.copy()
      await new Promise(process.nextTick)

      expect(clipboardManager.clipboard).toBeTruthy()
      expect(clipboardManager.clipboard?.shapeTextAutoExpand).toBe(false)
    })

    it('replacement box корректно копируется во внутренний буфер фигуры', async() => {
      const shapeGroup = createMockFabricObject({
        type: 'shape-group',
        id: 'shape-1',
        shapeComposite: true,
        shapeReplaceBoxWidth: 260,
        shapeReplaceBoxHeight: 180
      })

      mockCanvas.getActiveObject.mockReturnValue(shapeGroup)

      clipboardManager.copy()
      await new Promise(process.nextTick)

      expect(clipboardManager.clipboard).toBeTruthy()
      expect(clipboardManager.clipboard?.shapeReplaceBoxWidth).toBe(260)
      expect(clipboardManager.clipboard?.shapeReplaceBoxHeight).toBe(180)
    })

    describe('textCaseRaw и uppercase при копировании', () => {
      it('textCaseRaw корректно копируется в клон', async() => {
        const textbox = createMockFabricObject({
          type: 'textbox',
          id: 'text-1',
          text: 'TEST',
          textCaseRaw: 'test',
          uppercase: true
        })

        mockCanvas.getActiveObject.mockReturnValue(textbox)

        clipboardManager.copy()
        await new Promise(process.nextTick)

        const clipboardText = clipboardManager.clipboard as ClipboardTextObject | null

        expect(clipboardManager.clipboard).toBeTruthy()
        expect(clipboardText?.textCaseRaw).toBe('test')
      })

      it('uppercase корректно копируется в клон', async() => {
        const textbox = createMockFabricObject({
          type: 'textbox',
          id: 'text-2',
          text: 'UPPERCASED',
          textCaseRaw: 'uppercased',
          uppercase: true
        })

        mockCanvas.getActiveObject.mockReturnValue(textbox)

        clipboardManager.copy()
        await new Promise(process.nextTick)

        const clipboardText = clipboardManager.clipboard as ClipboardTextObject | null

        expect(clipboardManager.clipboard).toBeTruthy()
        expect(clipboardText?.uppercase).toBe(true)
      })

      it('после редактирования текста копирование работает', async() => {
        const textbox = createMockFabricObject({
          type: 'textbox',
          id: 'text-3',
          text: 'Измененный текст',
          textCaseRaw: 'измененный текст',
          uppercase: false
        })

        mockCanvas.getActiveObject.mockReturnValue(textbox)

        clipboardManager.copy()
        await new Promise(process.nextTick)

        const clipboardText = clipboardManager.clipboard as ClipboardTextObject | null

        expect(clipboardManager.clipboard).toBeTruthy()
        expect(clipboardText?.text).toBe('Измененный текст')
        expect(clipboardText?.textCaseRaw).toBe('измененный текст')
      })
    })

    describe('полный workflow: создать → редактировать → скопировать → вставить', () => {
      it('вставленный текст совпадает с отредактированным', async() => {
        const editedText = 'Отредактированный текст'

        const textbox = createMockFabricObject({
          type: 'textbox',
          id: 'text-4',
          text: editedText,
          textCaseRaw: editedText.toLowerCase(),
          uppercase: false,
          left: 100,
          top: 100
        })

        mockCanvas.getActiveObject.mockReturnValue(textbox)

        clipboardManager.copy()
        await new Promise(process.nextTick)

        const clipboardText = clipboardManager.clipboard as ClipboardTextObject | null

        expect(clipboardText?.text).toBe(editedText)
        expect(clipboardText?.textCaseRaw).toBe(editedText.toLowerCase())

        const result = await clipboardManager.paste()

        expect(result).toBe(true)
        expect(mockCanvas.add).toHaveBeenCalled()

        const addedObject = mockCanvas.add.mock.calls[0][0] as AddedCanvasObject
        expect(addedObject.text).toBe(editedText)
        expect(addedObject.textCaseRaw).toBe(editedText.toLowerCase())
      })

      it('вставленный объект имеет те же кастомные свойства', async() => {
        const textbox = createMockFabricObject({
          type: 'textbox',
          id: 'text-5',
          text: 'UPPERCASE TEXT',
          textCaseRaw: 'uppercase text',
          uppercase: true,
          left: 50,
          top: 50
        })

        mockCanvas.getActiveObject.mockReturnValue(textbox)

        clipboardManager.copy()
        await new Promise(process.nextTick)

        const result = await clipboardManager.paste()

        expect(result).toBe(true)

        const addedObject = mockCanvas.add.mock.calls[0][0]
        expect(addedObject.uppercase).toBe(true)
        expect(addedObject.textCaseRaw).toBe('uppercase text')
        expect(addedObject.text).toBe('UPPERCASE TEXT')
      })
    })
  })
})
