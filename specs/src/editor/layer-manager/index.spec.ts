import { ActiveSelection } from 'fabric'
import LayerManager from '../../../../src/editor/layer-manager'
import { createManagerTestMocks } from '../../../test-utils/editor-helpers'

describe('LayerManager', () => {
  let mockEditor: any
  let layerManager: LayerManager
  let mockCanvas: any
  let mockMontageArea: any
  let mockOverlayMask: any

  beforeEach(() => {
    const mocks = createManagerTestMocks()
    mockMontageArea = mocks.mockMontageArea
    mockCanvas = mocks.mockCanvas
    mockEditor = mocks.mockEditor

    // Добавляем overlayMask для тестов sendToBack/sendBackwards
    mockOverlayMask = { id: 'overlay-mask', set: jest.fn() }
    mockEditor.interactionBlocker.overlayMask = mockOverlayMask

    layerManager = new LayerManager({ editor: mockEditor })

    // Добавляем методы canvas для работы со слоями
    mockCanvas.bringObjectToFront = jest.fn()
    mockCanvas.bringObjectForward = jest.fn()
    mockCanvas.sendObjectToBack = jest.fn()
    mockCanvas.sendObjectBackwards = jest.fn()
  })

  describe('constructor', () => {
    it('должен инициализировать LayerManager с ссылкой на редактор', () => {
      expect(layerManager.editor).toBe(mockEditor)
    })
  })

  describe('bringToFront', () => {
    it('должен поднять одиночный объект на передний план', () => {
      const mockObject = { id: 'test-object' } as any
      mockCanvas.getActiveObject.mockReturnValue(mockObject)

      layerManager.bringToFront()

      expect(mockEditor.historyManager.suspendHistory).toHaveBeenCalled()
      expect(mockCanvas.bringObjectToFront).toHaveBeenCalledWith(mockObject)
      expect(mockCanvas.renderAll).toHaveBeenCalled()
      expect(mockEditor.historyManager.resumeHistory).toHaveBeenCalled()
      expect(mockEditor.historyManager.saveState).toHaveBeenCalled()
      expect(mockCanvas.fire).toHaveBeenCalledWith('editor:object-bring-to-front', {
        object: mockObject,
        withoutSave: undefined
      })
    })

    it('должен поднять переданный объект на передний план', () => {
      const mockObject = { id: 'test-object' } as any

      layerManager.bringToFront(mockObject)

      expect(mockCanvas.bringObjectToFront).toHaveBeenCalledWith(mockObject)
      expect(mockCanvas.fire).toHaveBeenCalledWith('editor:object-bring-to-front', {
        object: mockObject,
        withoutSave: undefined
      })
    })

    it('не должен делать ничего если нет активного объекта', () => {
      mockCanvas.getActiveObject.mockReturnValue(null)

      layerManager.bringToFront()

      expect(mockCanvas.bringObjectToFront).not.toHaveBeenCalled()
      expect(mockCanvas.fire).not.toHaveBeenCalled()
    })

    it('не должен сохранять состояние при withoutSave: true', () => {
      const mockObject = { id: 'test-object' } as any
      mockCanvas.getActiveObject.mockReturnValue(mockObject)

      layerManager.bringToFront(undefined, { withoutSave: true })

      expect(mockEditor.historyManager.saveState).not.toHaveBeenCalled()
      expect(mockCanvas.fire).toHaveBeenCalledWith('editor:object-bring-to-front', {
        object: mockObject,
        withoutSave: true
      })
    })
  })

  describe('sendToBack', () => {
    it('должен отправить одиночный объект на задний план и сохранить служебные элементы внизу', () => {
      const mockObject = { id: 'test-object' } as any
      mockCanvas.getActiveObject.mockReturnValue(mockObject)

      layerManager.sendToBack()

      expect(mockEditor.historyManager.suspendHistory).toHaveBeenCalled()
      expect(mockCanvas.sendObjectToBack).toHaveBeenCalledWith(mockObject)

      // Проверяем что служебные элементы отправляются в самый низ
      expect(mockCanvas.sendObjectToBack).toHaveBeenCalledWith(mockMontageArea)
      expect(mockCanvas.sendObjectToBack).toHaveBeenCalledWith(mockOverlayMask)

      expect(mockCanvas.renderAll).toHaveBeenCalled()
      expect(mockEditor.historyManager.resumeHistory).toHaveBeenCalled()
      expect(mockEditor.historyManager.saveState).toHaveBeenCalled()
      expect(mockCanvas.fire).toHaveBeenCalledWith('editor:object-send-to-back', {
        object: mockObject,
        withoutSave: undefined
      })
    })

    it('должен работать без overlayMask', () => {
      mockEditor.interactionBlocker.overlayMask = null
      const mockObject = { id: 'test-object' } as any
      mockCanvas.getActiveObject.mockReturnValue(mockObject)

      layerManager.sendToBack()

      expect(mockCanvas.sendObjectToBack).toHaveBeenCalledWith(mockObject)
      expect(mockCanvas.sendObjectToBack).toHaveBeenCalledWith(mockMontageArea)
      // overlayMask не должен вызываться если его нет
      expect(mockCanvas.sendObjectToBack).not.toHaveBeenCalledWith(mockOverlayMask)
    })
  })

  describe('bringForward', () => {
    it('должен поднять одиночный объект на один уровень вверх', () => {
      const mockObject = { id: 'test-object' } as any
      mockCanvas.getActiveObject.mockReturnValue(mockObject)

      layerManager.bringForward()

      expect(mockEditor.historyManager.suspendHistory).toHaveBeenCalled()
      expect(mockCanvas.bringObjectForward).toHaveBeenCalledWith(mockObject)
      expect(mockCanvas.renderAll).toHaveBeenCalled()
      expect(mockEditor.historyManager.resumeHistory).toHaveBeenCalled()
      expect(mockEditor.historyManager.saveState).toHaveBeenCalled()
      expect(mockCanvas.fire).toHaveBeenCalledWith('editor:object-bring-forward', {
        object: mockObject,
        withoutSave: undefined
      })
    })

    it('не должен делать ничего если нет активного объекта', () => {
      mockCanvas.getActiveObject.mockReturnValue(null)

      layerManager.bringForward()

      expect(mockCanvas.bringObjectForward).not.toHaveBeenCalled()
      expect(mockCanvas.fire).not.toHaveBeenCalled()
    })
  })

  describe('sendBackwards', () => {
    it('должен отправить одиночный объект на один уровень вниз и сохранить служебные элементы внизу', () => {
      const mockObject = { id: 'test-object' } as any
      mockCanvas.getActiveObject.mockReturnValue(mockObject)

      layerManager.sendBackwards()

      expect(mockEditor.historyManager.suspendHistory).toHaveBeenCalled()
      expect(mockCanvas.sendObjectBackwards).toHaveBeenCalledWith(mockObject)

      // Проверяем что служебные элементы отправляются в самый низ
      expect(mockCanvas.sendObjectToBack).toHaveBeenCalledWith(mockMontageArea)
      expect(mockCanvas.sendObjectToBack).toHaveBeenCalledWith(mockOverlayMask)

      expect(mockCanvas.renderAll).toHaveBeenCalled()
      expect(mockEditor.historyManager.resumeHistory).toHaveBeenCalled()
      expect(mockEditor.historyManager.saveState).toHaveBeenCalled()
      expect(mockCanvas.fire).toHaveBeenCalledWith('editor:object-send-backwards', {
        object: mockObject,
        withoutSave: undefined
      })
    })
  })

  describe('сложные сценарии перемещения слоев', () => {
    it('bringForward должен использовать специальную логику для ActiveSelection', () => {
      const obj1 = { id: 'obj1' } as any
      const obj2 = { id: 'obj2' } as any
      const activeSelection = new ActiveSelection([obj1, obj2], {}) as any
      mockCanvas.getActiveObject.mockReturnValue(activeSelection)

      // Мокаем getObjects для canvas
      mockCanvas.getObjects.mockReturnValue([
        { id: 'other1' }, obj1, { id: 'other2' }, obj2, { id: 'other3' }
      ])

      layerManager.bringForward()

      expect(mockCanvas.fire).toHaveBeenCalledWith('editor:object-bring-forward', {
        object: activeSelection,
        withoutSave: undefined
      })
    })

    it('sendBackwards должен использовать специальную логику для ActiveSelection', () => {
      const obj1 = { id: 'obj1' } as any
      const obj2 = { id: 'obj2' } as any
      const activeSelection = new ActiveSelection([obj1, obj2], {}) as any
      mockCanvas.getActiveObject.mockReturnValue(activeSelection)

      // Мокаем getObjects для canvas
      mockCanvas.getObjects.mockReturnValue([
        { id: 'other1' }, obj1, { id: 'other2' }, obj2, { id: 'other3' }
      ])

      layerManager.sendBackwards()

      expect(mockCanvas.fire).toHaveBeenCalledWith('editor:object-send-backwards', {
        object: activeSelection,
        withoutSave: undefined
      })
    })

    it('bringForward [5,6] boundary case: работает с объектами сверху', () => {
      const objects = [
        { id: 'obj1' }, { id: 'obj2' }, { id: 'obj3' },
        { id: 'obj4' }, { id: 'obj5' }, { id: 'obj6' }
      ] as any[]

      mockCanvas.getObjects.mockReturnValue(objects)

      const selectedObjects = [objects[4], objects[5]] // obj5, obj6 - самые верхние
      const activeSelection = new ActiveSelection(selectedObjects, {}) as any
      mockCanvas.getActiveObject.mockReturnValue(activeSelection)

      layerManager.bringForward()

      // Должен быть вызван fire с проверкой границ
      expect(mockCanvas.fire).toHaveBeenCalledWith('editor:object-bring-forward', {
        object: activeSelection,
        withoutSave: undefined
      })
    })

    it('sendBackwards [1,2] boundary case: работает с объектами снизу', () => {
      const objects = [
        { id: 'obj1' }, { id: 'obj2' }, { id: 'obj3' },
        { id: 'obj4' }, { id: 'obj5' }, { id: 'obj6' }
      ] as any[]

      mockCanvas.getObjects.mockReturnValue(objects)

      const selectedObjects = [objects[0], objects[1]] // obj1, obj2 - самые нижние
      const activeSelection = new ActiveSelection(selectedObjects, {}) as any
      mockCanvas.getActiveObject.mockReturnValue(activeSelection)

      layerManager.sendBackwards()

      // Должен быть вызван fire с проверкой границ
      expect(mockCanvas.fire).toHaveBeenCalledWith('editor:object-send-backwards', {
        object: activeSelection,
        withoutSave: undefined
      })
    })
  })

  describe('граничные случаи', () => {
    it('должен обрабатывать пустой canvas', () => {
      mockCanvas.getObjects.mockReturnValue([])
      mockCanvas.getActiveObject.mockReturnValue(null)

      layerManager.bringForward()

      expect(mockCanvas.bringObjectForward).not.toHaveBeenCalled()
      expect(mockCanvas.fire).not.toHaveBeenCalled()
    })

    it('должен обрабатывать ActiveSelection с одним объектом', () => {
      const obj = { id: 'obj1' } as any
      const activeSelection = new ActiveSelection([obj], {}) as any
      mockCanvas.getActiveObject.mockReturnValue(activeSelection)
      mockCanvas.getObjects.mockReturnValue([obj])

      layerManager.bringForward()

      expect(mockCanvas.fire).toHaveBeenCalledWith('editor:object-bring-forward', {
        object: activeSelection,
        withoutSave: undefined
      })
    })

    it('должен корректно работать с withoutSave флагом', () => {
      const mockObject = { id: 'test-object' } as any
      mockCanvas.getActiveObject.mockReturnValue(mockObject)

      layerManager.sendBackwards(undefined, { withoutSave: true })

      expect(mockEditor.historyManager.saveState).not.toHaveBeenCalled()
      expect(mockCanvas.fire).toHaveBeenCalledWith('editor:object-send-backwards', {
        object: mockObject,
        withoutSave: true
      })
    })
  })
})
