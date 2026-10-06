import { ActiveSelection } from 'fabric'
import LayerManager from '../../../../src/editor/layer-manager'
import { createManagerTestMocks } from '../../../test-utils/editor/manager-test-mocks'
import { createTestObjects, getObjectOrder } from '../../../test-utils/managers/layer'

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

    // Add overlayMask for sendToBack/sendBackwards tests
    mockOverlayMask = { id: 'overlay-mask', set: jest.fn() }
    mockEditor.interactionBlocker.overlayMask = mockOverlayMask

    layerManager = new LayerManager({ editor: mockEditor })

    // Add canvas methods for working with layers
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

      expect(mockEditor.textManager.exitActiveTextEditing).toHaveBeenCalledTimes(1)
      expect(mockEditor.textManager.exitActiveTextEditing.mock.invocationCallOrder[0]).toBeLessThan(
        mockCanvas.bringObjectToFront.mock.invocationCallOrder[0]
      )
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

      expect(mockEditor.textManager.exitActiveTextEditing).not.toHaveBeenCalled()
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

      expect(mockEditor.textManager.exitActiveTextEditing).toHaveBeenCalledTimes(1)
      expect(mockEditor.historyManager.suspendHistory).toHaveBeenCalled()
      expect(mockCanvas.sendObjectToBack).toHaveBeenCalledWith(mockObject)

      // Check that internal elements are sent to the very bottom
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
      // sendObjectToBack should not be called for an absent overlayMask
      expect(mockCanvas.sendObjectToBack).not.toHaveBeenCalledWith(mockOverlayMask)
    })
  })

  describe('bringForward', () => {
    it('должен поднять одиночный объект на один уровень вверх', () => {
      const mockObject = { id: 'test-object' } as any
      mockCanvas.getActiveObject.mockReturnValue(mockObject)

      layerManager.bringForward()

      expect(mockEditor.textManager.exitActiveTextEditing).toHaveBeenCalledTimes(1)
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

      expect(mockEditor.textManager.exitActiveTextEditing).toHaveBeenCalledTimes(1)
      expect(mockEditor.historyManager.suspendHistory).toHaveBeenCalled()
      expect(mockCanvas.sendObjectBackwards).toHaveBeenCalledWith(mockObject)

      // Check that internal elements are sent to the very bottom
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

      // Mock getObjects for the canvas
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

      // Mock getObjects for the canvas
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

      const selectedObjects = [objects[4], objects[5]] // obj5 and obj6 are at the very top
      const activeSelection = new ActiveSelection(selectedObjects, {}) as any
      mockCanvas.getActiveObject.mockReturnValue(activeSelection)

      layerManager.bringForward()

      // fire should be called with a bounds check
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

      const selectedObjects = [objects[0], objects[1]] // obj1 and obj2 are at the very bottom
      const activeSelection = new ActiveSelection(selectedObjects, {}) as any
      mockCanvas.getActiveObject.mockReturnValue(activeSelection)

      layerManager.sendBackwards()

      // fire should be called with a bounds check
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

  // Tests with detailed layer-order checks
  describe('Детальные тесты порядка слоёв', () => {
    let realisticMocks: any
    let realisticLayerManager: LayerManager

    beforeEach(() => {
      // Use shared helpers with a layer-aware canvas
      realisticMocks = createManagerTestMocks(800, 600, { withLayerAwareCanvas: true })
      realisticLayerManager = new LayerManager({ editor: realisticMocks.mockEditor })
    })

    // Data for parameterized tests: simplified cases for individual objects
    const layerTestCases = [
      {
        name: 'bringForward одиночного объекта из середины',
        initialOrder: [1, 2, 3, 4, 5, 6],
        selection: [3], // obj3 only
        method: 'bringForward' as const,
        expectedOrder: [1, 2, 4, 3, 5, 6] // obj3 moved up one position
      },
      {
        name: 'sendBackwards одиночного объекта из середины',
        initialOrder: [1, 2, 3, 4, 5, 6],
        selection: [4], // obj4 only
        method: 'sendBackwards' as const,
        expectedOrder: [1, 2, 4, 3, 5, 6] // obj4 moved down one position
      },
      {
        name: 'bringForward объекта сверху (boundary case)',
        initialOrder: [1, 2, 3, 4, 5, 6],
        selection: [6], // obj6 is already at the top
        method: 'bringForward' as const,
        expectedOrder: [1, 2, 3, 4, 5, 6] // Should not move
      },
      {
        name: 'sendBackwards объекта снизу (boundary case)',
        initialOrder: [1, 2, 3, 4, 5, 6],
        selection: [1], // obj1 is already at the bottom
        method: 'sendBackwards' as const,
        expectedOrder: [1, 2, 3, 4, 5, 6] // Should not move
      }
    ]

    describe.each(layerTestCases)('Кейс: $name', ({ name, initialOrder, selection, method, expectedOrder }) => {
      it(`должен правильно изменить порядок слоёв: ${name}`, () => {
        // Prepare objects in the required order
        const objects = createTestObjects(initialOrder)
        realisticMocks.mockCanvas.setObjects(objects)

        // Find the selected object (just one, for simplicity)
        const selectedObject = objects.find((obj) => obj.id === `obj${selection[0]}`)
        realisticMocks.mockCanvas.getActiveObject.mockReturnValue(selectedObject)

        // Perform the operation
        realisticLayerManager[method]()

        // Check the resulting order
        const resultOrder = getObjectOrder(realisticMocks.mockCanvas.getObjects())
        expect(resultOrder).toEqual(expectedOrder)

        // Check that events fire correctly
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

      // Select obj2 and obj4
      const selectedObjects = [objects[1], objects[3]] as any[] // obj2, obj4
      const activeSelection = new ActiveSelection(selectedObjects, {}) as any
      realisticMocks.mockCanvas.getActiveObject.mockReturnValue(activeSelection)

      realisticLayerManager.bringToFront()

      // obj2 and obj4 should be at the top: [1, 3, 5, 6, 2, 4]
      const resultOrder = getObjectOrder(realisticMocks.mockCanvas.getObjects())
      expect(resultOrder).toEqual([1, 3, 5, 6, 2, 4])
    })

    it('sendToBack должен отправлять объекты вниз и сохранять служебные элементы внизу', () => {
      const objects = createTestObjects([1, 2, 3, 4, 5, 6])
      realisticMocks.mockCanvas.setObjects(objects)

      // Select obj3 and obj5
      const selectedObjects = [objects[2], objects[4]] as any[] // obj3, obj5
      const activeSelection = new ActiveSelection(selectedObjects, {}) as any
      realisticMocks.mockCanvas.getActiveObject.mockReturnValue(activeSelection)

      realisticLayerManager.sendToBack()

      // Check that the method was called correctly
      expect(realisticMocks.mockCanvas.fire).toHaveBeenCalledWith('editor:object-send-to-back', {
        object: activeSelection,
        withoutSave: undefined
      })

      // Check that sendObjectToBack was called for each selected object
      expect(realisticMocks.mockCanvas.sendObjectToBack).toHaveBeenCalledWith(objects[4]) // obj5 first
      expect(realisticMocks.mockCanvas.sendObjectToBack).toHaveBeenCalledWith(objects[2]) // obj3 next
    })

    // Separate tests for ActiveSelection (multi-object selection)
    describe('ActiveSelection (множественное выделение)', () => {
      it('bringForward должен использовать специальную логику для множественного выделения', () => {
        const objects = createTestObjects([1, 2, 3, 4, 5, 6])
        realisticMocks.mockCanvas.setObjects(objects)

        const selectedObjects = [objects[1], objects[4]] as any[] // obj2, obj5
        const activeSelection = new ActiveSelection(selectedObjects, {}) as any
        realisticMocks.mockCanvas.getActiveObject.mockReturnValue(activeSelection)

        realisticLayerManager.bringForward()

        // Check that the event fires for ActiveSelection
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

        // Check that the event fires for ActiveSelection
        expect(realisticMocks.mockCanvas.fire).toHaveBeenCalledWith('editor:object-send-backwards', {
          object: activeSelection,
          withoutSave: undefined
        })
      })
    })
  })
})
