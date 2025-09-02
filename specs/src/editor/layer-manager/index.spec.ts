import { ActiveSelection } from 'fabric'
import LayerManager from '../../../../src/editor/layer-manager'
import { createManagerTestMocks, createTestObjects, getObjectOrder } from '../../../test-utils/editor-helpers'

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
    it('должен поднять активный объект на передний план', () => {
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

    it('должен поднять переданный в качестве аргумента объект на передний план', () => {
      const mockObject = { id: 'test-object' } as any

      layerManager.bringToFront(mockObject)

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

      expect(mockEditor.historyManager.suspendHistory).toHaveBeenCalled()
      expect(mockCanvas.bringObjectToFront).toHaveBeenCalledWith(mockObject)
      expect(mockCanvas.renderAll).toHaveBeenCalled()
      expect(mockEditor.historyManager.resumeHistory).toHaveBeenCalled()
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

    it('не должен делать ничего если объект не передан и нет активного объекта', () => {
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

  // Тесты с детальной проверкой порядка слоёв
  describe('Детальные тесты порядка слоёв', () => {
    let realisticMocks: any
    let realisticLayerManager: LayerManager

    beforeEach(() => {
      // Используем общие хелперы с layer-aware canvas
      realisticMocks = createManagerTestMocks(800, 600, { withLayerAwareCanvas: true })
      realisticLayerManager = new LayerManager({ editor: realisticMocks.mockEditor })
    })

    // Данные для параметризованных тестов - упрощённые кейсы для одиночных объектов
    const layerTestCases = [
      {
        name: 'bringForward одиночного объекта из середины',
        initialOrder: [1, 2, 3, 4, 5, 6],
        selection: [3], // только obj3
        method: 'bringForward' as const,
        expectedOrder: [1, 2, 4, 3, 5, 6] // obj3 поднялся на одну позицию
      },
      {
        name: 'sendBackwards одиночного объекта из середины',
        initialOrder: [1, 2, 3, 4, 5, 6],
        selection: [4], // только obj4
        method: 'sendBackwards' as const,
        expectedOrder: [1, 2, 4, 3, 5, 6] // obj4 опустился на одну позицию
      },
      {
        name: 'bringForward объекта сверху (boundary case)',
        initialOrder: [1, 2, 3, 4, 5, 6],
        selection: [6], // obj6 уже сверху
        method: 'bringForward' as const,
        expectedOrder: [1, 2, 3, 4, 5, 6] // Не должен двигаться
      },
      {
        name: 'sendBackwards объекта снизу (boundary case)',
        initialOrder: [1, 2, 3, 4, 5, 6],
        selection: [1], // obj1 уже снизу
        method: 'sendBackwards' as const,
        expectedOrder: [1, 2, 3, 4, 5, 6] // Не должен двигаться
      }
    ]

    describe.each(layerTestCases)('Кейс: $name', ({ name, initialOrder, selection, method, expectedOrder }) => {
      it(`должен правильно изменить порядок слоёв: ${name}`, () => {
        // Подготавливаем объекты в нужном порядке
        const objects = createTestObjects(initialOrder)
        realisticMocks.mockCanvas.setObjects(objects)

        // Находим выбранный объект (только один для простоты)
        const selectedObject = objects.find((obj) => obj.id === `obj${selection[0]}`)
        realisticMocks.mockCanvas.getActiveObject.mockReturnValue(selectedObject)

        // Выполняем операцию
        realisticLayerManager[method]()

        // Проверяем результирующий порядок
        const resultOrder = getObjectOrder(realisticMocks.mockCanvas.getObjects())
        expect(resultOrder).toEqual(expectedOrder)

        // Проверяем что события правильно срабатывают
        const expectedEventName = method === 'bringForward' ? 'editor:object-bring-forward' : 'editor:object-send-backwards'
        expect(realisticMocks.mockCanvas.fire).toHaveBeenCalledWith(expectedEventName, {
          object: selectedObject,
          withoutSave: undefined
        })
      })
    })

    it('bringToFront должен поднимать все выбранные объекты наверх', () => {
      const objects = createTestObjects([1, 2, 3, 4, 5, 6])
      realisticMocks.mockCanvas.setObjects(objects)

      // Выбираем obj2 и obj4
      const selectedObjects = [objects[1], objects[3]] as any[] // obj2, obj4
      const activeSelection = new ActiveSelection(selectedObjects, {}) as any
      realisticMocks.mockCanvas.getActiveObject.mockReturnValue(activeSelection)

      realisticLayerManager.bringToFront()

      // obj2 и obj4 должны быть сверху: [1, 3, 5, 6, 2, 4]
      const resultOrder = getObjectOrder(realisticMocks.mockCanvas.getObjects())
      expect(resultOrder).toEqual([1, 3, 5, 6, 2, 4])
    })

    it('sendToBack должен отправлять объекты вниз и сохранять служебные элементы внизу', () => {
      const objects = createTestObjects([1, 2, 3, 4, 5, 6])
      realisticMocks.mockCanvas.setObjects(objects)

      // Выбираем obj3 и obj5
      const selectedObjects = [objects[2], objects[4]] as any[] // obj3, obj5
      const activeSelection = new ActiveSelection(selectedObjects, {}) as any
      realisticMocks.mockCanvas.getActiveObject.mockReturnValue(activeSelection)

      realisticLayerManager.sendToBack()

      // Проверяем что метод был вызван правильно
      expect(realisticMocks.mockCanvas.fire).toHaveBeenCalledWith('editor:object-send-to-back', {
        object: activeSelection,
        withoutSave: undefined
      })

      // Проверяем что sendObjectToBack был вызван для каждого выбранного объекта
      expect(realisticMocks.mockCanvas.sendObjectToBack).toHaveBeenCalledWith(objects[4]) // obj5 сначала
      expect(realisticMocks.mockCanvas.sendObjectToBack).toHaveBeenCalledWith(objects[2]) // obj3 потом
    })

    // Отдельные тесты для ActiveSelection (множественное выделение)
    describe('ActiveSelection (множественное выделение)', () => {
      it('bringForward должен использовать специальную логику для множественного выделения', () => {
        const objects = createTestObjects([1, 2, 3, 4, 5, 6])
        realisticMocks.mockCanvas.setObjects(objects)

        const selectedObjects = [objects[1], objects[4]] as any[] // obj2, obj5
        const activeSelection = new ActiveSelection(selectedObjects, {}) as any
        realisticMocks.mockCanvas.getActiveObject.mockReturnValue(activeSelection)

        realisticLayerManager.bringForward()

        // Проверяем что событие срабатывает для ActiveSelection
        expect(realisticMocks.mockCanvas.fire).toHaveBeenCalledWith('editor:object-bring-forward', {
          object: activeSelection,
          withoutSave: undefined
        })
      })

      it('sendBackwards должен использовать специальную логику для множественного выделения', () => {
        const objects = createTestObjects([1, 2, 3, 4, 5, 6])
        realisticMocks.mockCanvas.setObjects(objects)

        const selectedObjects = [objects[1], objects[4]] as any[] // obj2, obj5
        const activeSelection = new ActiveSelection(selectedObjects, {}) as any
        realisticMocks.mockCanvas.getActiveObject.mockReturnValue(activeSelection)

        realisticLayerManager.sendBackwards()

        // Проверяем что событие срабатывает для ActiveSelection
        expect(realisticMocks.mockCanvas.fire).toHaveBeenCalledWith('editor:object-send-backwards', {
          object: activeSelection,
          withoutSave: undefined
        })
      })
    })
  })
})
