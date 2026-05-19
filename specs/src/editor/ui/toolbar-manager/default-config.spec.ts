import defaultConfig from '../../../../../src/editor/ui/toolbar-manager/default-config'
import { createManagerTestMocks } from '../../../../test-utils/editor/manager-test-mocks'
import {
  createMockActiveSelection,
  createMockFabricObject
} from '../../../../test-utils/fabric/objects'

describe('ToolbarManager default delete handler', () => {
  it('при массовом выделении передаёт в удаление все объекты из activeSelection', () => {
    const { mockEditor } = createManagerTestMocks()
    const deleteSelectedObjectsMock = mockEditor.deletionManager.deleteSelectedObjects as jest.Mock
    const firstObject = createMockFabricObject({
      id: 'toolbar-delete-first'
    })
    const secondObject = createMockFabricObject({
      id: 'toolbar-delete-second'
    })
    const selection = createMockActiveSelection([firstObject, secondObject])

    defaultConfig.handlers.delete(mockEditor, selection)

    expect(selection.getObjects()).toEqual([firstObject, secondObject])
    expect(deleteSelectedObjectsMock).toHaveBeenCalledTimes(1)
    expect(deleteSelectedObjectsMock).toHaveBeenCalledWith({
      objects: [firstObject, secondObject]
    })
  })

  it('без target использует текущее выделение canvas через DeletionManager', () => {
    const { mockEditor } = createManagerTestMocks()
    const deleteSelectedObjectsMock = mockEditor.deletionManager.deleteSelectedObjects as jest.Mock

    defaultConfig.handlers.delete(mockEditor)

    expect(deleteSelectedObjectsMock).toHaveBeenCalledTimes(1)
    expect(deleteSelectedObjectsMock).toHaveBeenCalledWith()
  })

  it('для обычного объекта передаёт в удаление только этот объект', () => {
    const { mockEditor } = createManagerTestMocks()
    const deleteSelectedObjectsMock = mockEditor.deletionManager.deleteSelectedObjects as jest.Mock
    const targetObject = createMockFabricObject({
      id: 'toolbar-delete-target'
    })

    defaultConfig.handlers.delete(mockEditor, targetObject)

    expect(targetObject.id).toBe('toolbar-delete-target')
    expect(deleteSelectedObjectsMock).toHaveBeenCalledTimes(1)
    expect(deleteSelectedObjectsMock).toHaveBeenCalledWith({
      objects: [targetObject]
    })
  })
})
