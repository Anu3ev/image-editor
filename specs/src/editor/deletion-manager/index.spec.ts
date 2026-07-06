import DeletionManager from '../../../../src/editor/deletion-manager'
import { createManagerTestMocks } from '../../../test-utils/editor/manager-test-mocks'
import { createMockFabricObject, createMockGroup } from '../../../test-utils/fabric/objects'

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

  it('не удаляет объект, запрещённый правилом удаления, и сообщает о пропуске', () => {
    const protectedObject = createMockFabricObject({
      type: 'image',
      id: 'protected-object'
    })

    mockEditor.options.canDeleteObject = jest.fn(() => false)
    mockCanvas.getActiveObjects.mockReturnValue([protectedObject])

    const result = deletionManager.deleteSelectedObjects()

    expect(result).toBeNull()
    expect(mockCanvas.remove).not.toHaveBeenCalled()
    expect(mockEditor.textManager.exitActiveTextEditing).not.toHaveBeenCalled()
    expect(mockEditor.historyManager.saveState).not.toHaveBeenCalled()
    expect(mockCanvas.fire).toHaveBeenCalledWith('editor:objects-delete-skipped', {
      skippedObjects: [protectedObject],
      requestedObjects: [protectedObject],
      withoutSave: false
    })
    expect(mockCanvas.fire).not.toHaveBeenCalledWith('editor:objects-deleted', expect.any(Object))
  })

  it('при массовом удалении удаляет разрешённые объекты и сообщает о запрещённых', () => {
    const removableObject = createMockFabricObject({
      type: 'rect',
      id: 'removable-object'
    })
    const protectedObject = createMockFabricObject({
      type: 'image',
      id: 'protected-object'
    })

    mockEditor.options.canDeleteObject = jest.fn((object) => object !== protectedObject)
    mockCanvas.getActiveObjects.mockReturnValue([removableObject, protectedObject])

    const result = deletionManager.deleteSelectedObjects()

    expect(result).toEqual({
      objects: [removableObject],
      withoutSave: false
    })
    expect(mockCanvas.remove).toHaveBeenCalledWith(removableObject)
    expect(mockCanvas.remove).not.toHaveBeenCalledWith(protectedObject)
    expect(mockEditor.historyManager.saveState).toHaveBeenCalledTimes(1)
    expect(mockCanvas.fire).toHaveBeenCalledWith('editor:objects-delete-skipped', {
      skippedObjects: [protectedObject],
      requestedObjects: [removableObject, protectedObject],
      withoutSave: false
    })
    expect(mockCanvas.fire).toHaveBeenCalledWith('editor:objects-deleted', {
      objects: [removableObject],
      withoutSave: false
    })
  })

  it('удаляет запрещённый объект при явном обходе правила удаления', () => {
    const protectedObject = createMockFabricObject({
      type: 'image',
      id: 'protected-object'
    })
    const canDeleteObject = jest.fn(() => false)

    mockEditor.options.canDeleteObject = canDeleteObject

    const result = deletionManager.deleteSelectedObjects({
      objects: [protectedObject],
      ignoreDeleteGuard: true
    })

    expect(result).toEqual({
      objects: [protectedObject],
      withoutSave: false
    })
    expect(canDeleteObject).not.toHaveBeenCalled()
    expect(mockCanvas.remove).toHaveBeenCalledWith(protectedObject)
    expect(mockEditor.historyManager.saveState).toHaveBeenCalledTimes(1)
    expect(mockCanvas.fire).not.toHaveBeenCalledWith('editor:objects-delete-skipped', expect.any(Object))
  })

  it('при удалении группы оставляет запрещённые дочерние объекты', () => {
    const protectedChild = createMockFabricObject({
      type: 'image',
      id: 'protected-child'
    })
    const removableChild = createMockFabricObject({
      type: 'rect',
      id: 'removable-child'
    })
    const groupToDelete = createMockGroup([protectedChild, removableChild], {
      id: 'mixed-group'
    })

    mockEditor.options.canDeleteObject = jest.fn((object) => object !== protectedChild)
    mockCanvas.getActiveObjects.mockReturnValue([groupToDelete])
    mockEditor.groupingManager.ungroup.mockReturnValue({
      ungroupedObjects: [protectedChild, removableChild]
    })

    const result = deletionManager.deleteSelectedObjects()

    expect(mockEditor.groupingManager.ungroup).toHaveBeenCalledWith({
      target: groupToDelete,
      withoutSave: true
    })
    expect(mockCanvas.remove).toHaveBeenCalledWith(removableChild)
    expect(mockCanvas.remove).not.toHaveBeenCalledWith(protectedChild)
    expect(result).toEqual({
      objects: [groupToDelete, removableChild],
      withoutSave: false
    })
    expect(mockCanvas.fire).toHaveBeenCalledWith('editor:objects-delete-skipped', {
      skippedObjects: [protectedChild],
      requestedObjects: [groupToDelete],
      withoutSave: false
    })
  })
})
