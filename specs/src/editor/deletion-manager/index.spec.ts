import DeletionManager from '../../../../src/editor/deletion-manager'
import {
  createManagerTestMocks,
  createMockFabricObject,
  createMockGroup
} from '../../../test-utils/editor-helpers'

describe('DeletionManager', () => {
  let deletionManager: DeletionManager
  let mockCanvas: any
  let mockEditor: any

  beforeEach(() => {
    const mocks = createManagerTestMocks()

    mockCanvas = mocks.mockCanvas
    mockEditor = mocks.mockEditor
    mockEditor.groupingManager = {
      ungroup: jest.fn()
    }
    deletionManager = new DeletionManager({ editor: mockEditor })
  })

  it('при удалении с сохранением сначала завершает редактирование текста, а потом удаляет объект', () => {
    const objectToDelete = {
      id: 'object-1',
      locked: false
    } as any

    mockCanvas.getActiveObjects.mockReturnValue([objectToDelete])

    const result = deletionManager.deleteSelectedObjects()

    expect(mockEditor.textManager.exitActiveTextEditing).toHaveBeenCalledTimes(1)
    expect(mockCanvas.remove).toHaveBeenCalledWith(objectToDelete)
    expect(mockEditor.textManager.exitActiveTextEditing.mock.invocationCallOrder[0]).toBeLessThan(
      mockCanvas.remove.mock.invocationCallOrder[0]
    )
    expect(mockEditor.historyManager.saveState).toHaveBeenCalledTimes(1)
    expect(result).toEqual({
      objects: [objectToDelete],
      withoutSave: false
    })
  })

  it('при удалении без сохранения не завершает редактирование текста отдельно', () => {
    const objectToDelete = {
      id: 'object-1',
      locked: false
    } as any

    mockCanvas.getActiveObjects.mockReturnValue([objectToDelete])

    const result = deletionManager.deleteSelectedObjects({
      withoutSave: true
    })

    expect(mockEditor.textManager.exitActiveTextEditing).not.toHaveBeenCalled()
    expect(mockCanvas.remove).toHaveBeenCalledWith(objectToDelete)
    expect(mockEditor.historyManager.saveState).not.toHaveBeenCalled()
    expect(result).toEqual({
      objects: [objectToDelete],
      withoutSave: true
    })
  })

  it('при удалении группы разгруппировывает её через groupingManager и удаляет дочерние объекты', () => {
    const childRect = createMockFabricObject({
      type: 'rect',
      id: 'child-rect'
    })
    const childCircle = createMockFabricObject({
      type: 'circle',
      id: 'child-circle'
    })
    const groupToDelete = createMockGroup([], {
      id: 'group-1'
    })

    mockCanvas.getActiveObjects.mockReturnValue([groupToDelete])
    mockEditor.groupingManager.ungroup.mockReturnValue({
      ungroupedObjects: [childRect, childCircle]
    })

    const result = deletionManager.deleteSelectedObjects()

    expect(mockEditor.groupingManager.ungroup).toHaveBeenCalledWith({
      target: groupToDelete,
      withoutSave: true
    })
    expect(mockCanvas.remove).toHaveBeenCalledWith(childRect)
    expect(mockCanvas.remove).toHaveBeenCalledWith(childCircle)
    expect(mockEditor.historyManager.saveState).toHaveBeenCalledTimes(1)
    expect(result).toEqual({
      objects: [groupToDelete, childRect, childCircle],
      withoutSave: false
    })
  })
})
