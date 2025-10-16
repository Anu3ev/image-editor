import { Group, ActiveSelection } from 'fabric'
import {
  createManagerTestMocks,
  createMockFabricObject,
  createMockActiveSelection,
  createMockGroup
} from '../../../test-utils/editor-helpers'
import GroupingManager from '../../../../src/editor/grouping-manager'

describe('GroupingManager', () => {
  let mockEditor: any
  let groupingManager: GroupingManager
  let mockCanvas: any
  let mockHistoryManager: any

  beforeEach(() => {
    const mocks = createManagerTestMocks()
    mockEditor = mocks.mockEditor
    mockCanvas = mocks.mockCanvas
    mockHistoryManager = mockEditor.historyManager

    groupingManager = new GroupingManager({ editor: mockEditor })

    jest.clearAllMocks()
  })

  describe('constructor', () => {
    it('должен инициализировать GroupingManager с правильными параметрами', () => {
      expect(groupingManager.editor).toBe(mockEditor)
    })
  })

  describe('_getObjectsToGroup (приватный метод)', () => {
    it('должен вернуть массив объектов, если передан непустой массив', () => {
      const mockRect = createMockFabricObject({ type: 'rect', id: 'rect-1' })
      const mockCircle = createMockFabricObject({ type: 'circle', id: 'circle-1' })

      const result = (groupingManager as any)._getObjectsToGroup([mockRect, mockCircle])

      expect(result).toEqual([mockRect, mockCircle])
    })

    it('должен вернуть null, если передан пустой массив', () => {
      const result = (groupingManager as any)._getObjectsToGroup([])

      expect(result).toBeNull()
    })

    it('должен вернуть объекты из ActiveSelection, если он передан', () => {
      const mockRect = createMockFabricObject({ type: 'rect', id: 'rect-1' })
      const mockCircle = createMockFabricObject({ type: 'circle', id: 'circle-1' })
      const mockSelection = createMockActiveSelection([mockRect, mockCircle])

      const result = (groupingManager as any)._getObjectsToGroup(mockSelection)

      expect(result).toEqual([mockRect, mockCircle])
    })

    it('должен вернуть объекты из текущего активного объекта (ActiveSelection)', () => {
      const mockRect = createMockFabricObject({ type: 'rect', id: 'rect-1' })
      const mockCircle = createMockFabricObject({ type: 'circle', id: 'circle-1' })
      const mockSelection = createMockActiveSelection([mockRect, mockCircle])
      mockCanvas.getActiveObject.mockReturnValue(mockSelection)

      const result = (groupingManager as any)._getObjectsToGroup()

      expect(result).toEqual([mockRect, mockCircle])
    })

    it('должен вернуть null, если активный объект не ActiveSelection', () => {
      const mockRect = createMockFabricObject({ type: 'rect', id: 'rect-1' })
      mockCanvas.getActiveObject.mockReturnValue(mockRect)

      const result = (groupingManager as any)._getObjectsToGroup()

      expect(result).toBeNull()
    })

    it('должен вернуть null, если нет активного объекта', () => {
      mockCanvas.getActiveObject.mockReturnValue(null)

      const result = (groupingManager as any)._getObjectsToGroup()

      expect(result).toBeNull()
    })
  })

  describe('_getGroupsToUngroup (приватный метод)', () => {
    it('должен вернуть массив групп из массива объектов', () => {
      const mockGroup1 = createMockGroup([], { id: 'group-1' })
      const mockRect = createMockFabricObject({ type: 'rect', id: 'rect-1' })
      const mockGroup2 = createMockGroup([], { id: 'group-2' })

      const result = (groupingManager as any)._getGroupsToUngroup([mockGroup1, mockRect, mockGroup2])

      expect(result).toHaveLength(2)
      expect(result).toContain(mockGroup1)
      expect(result).toContain(mockGroup2)
    })

    it('должен вернуть null, если в массиве нет групп', () => {
      const mockRect = createMockFabricObject({ type: 'rect', id: 'rect-1' })
      const mockCircle = createMockFabricObject({ type: 'circle', id: 'circle-1' })

      const result = (groupingManager as any)._getGroupsToUngroup([mockRect, mockCircle])

      expect(result).toBeNull()
    })

    it('должен вернуть группы из ActiveSelection', () => {
      const mockGroup1 = createMockGroup([], { id: 'group-1' })
      const mockRect = createMockFabricObject({ type: 'rect', id: 'rect-1' })
      const mockGroup2 = createMockGroup([], { id: 'group-2' })
      const mockSelection = createMockActiveSelection([mockGroup1, mockRect, mockGroup2])

      const result = (groupingManager as any)._getGroupsToUngroup(mockSelection)

      expect(result).toHaveLength(2)
      expect(result).toContain(mockGroup1)
      expect(result).toContain(mockGroup2)
    })

    it('должен вернуть null, если в ActiveSelection нет групп', () => {
      const mockRect = createMockFabricObject({ type: 'rect', id: 'rect-1' })
      const mockCircle = createMockFabricObject({ type: 'circle', id: 'circle-1' })
      const mockSelection = createMockActiveSelection([mockRect, mockCircle])

      const result = (groupingManager as any)._getGroupsToUngroup(mockSelection)

      expect(result).toBeNull()
    })

    it('должен вернуть массив с одной группой, если передана одна Group', () => {
      const mockGroup = createMockGroup([], { id: 'group-1' })

      const result = (groupingManager as any)._getGroupsToUngroup(mockGroup)

      expect(result).toEqual([mockGroup])
    })

    it('должен вернуть группы из текущего ActiveSelection на canvas', () => {
      const mockGroup1 = createMockGroup([], { id: 'group-1' })
      const mockGroup2 = createMockGroup([], { id: 'group-2' })
      const mockSelection = createMockActiveSelection([mockGroup1, mockGroup2])
      mockCanvas.getActiveObject.mockReturnValue(mockSelection)

      const result = (groupingManager as any)._getGroupsToUngroup()

      expect(result).toEqual([mockGroup1, mockGroup2])
    })

    it('должен вернуть массив с текущей группой на canvas', () => {
      const mockGroup = createMockGroup([], { id: 'group-1' })
      mockCanvas.getActiveObject.mockReturnValue(mockGroup)

      const result = (groupingManager as any)._getGroupsToUngroup()

      expect(result).toEqual([mockGroup])
    })

    it('должен вернуть null, если нет активного объекта', () => {
      mockCanvas.getActiveObject.mockReturnValue(null)

      const result = (groupingManager as any)._getGroupsToUngroup()

      expect(result).toBeNull()
    })
  })

  describe('group', () => {
    it('должен сгруппировать массив объектов', () => {
      const mockRect = createMockFabricObject({ type: 'rect', id: 'rect-1' })
      const mockCircle = createMockFabricObject({ type: 'circle', id: 'circle-1' })

      const result = groupingManager.group({ target: [mockRect, mockCircle] })

      expect(result).not.toBeNull()
      expect(result?.group).toBeDefined()
      expect(result?.group.id).toMatch(/^group-/)
      expect(result?.withoutSave).toBe(false)
      expect(mockHistoryManager.suspendHistory).toHaveBeenCalled()
      expect(mockCanvas.remove).toHaveBeenCalledTimes(2)
      expect(mockCanvas.remove).toHaveBeenCalledWith(mockRect)
      expect(mockCanvas.remove).toHaveBeenCalledWith(mockCircle)
      expect(mockCanvas.add).toHaveBeenCalledWith(result?.group)
      expect(mockCanvas.setActiveObject).toHaveBeenCalledWith(result?.group)
      expect(mockCanvas.requestRenderAll).toHaveBeenCalled()
      expect(mockCanvas.fire).toHaveBeenCalledWith('editor:objects-grouped', {
        group: result?.group,
        withoutSave: false
      })
      expect(mockHistoryManager.resumeHistory).toHaveBeenCalled()
      expect(mockHistoryManager.saveState).toHaveBeenCalled()
    })

    it('должен сгруппировать объекты из ActiveSelection', () => {
      const mockRect = createMockFabricObject({ type: 'rect', id: 'rect-1' })
      const mockCircle = createMockFabricObject({ type: 'circle', id: 'circle-1' })
      const mockSelection = createMockActiveSelection([mockRect, mockCircle])

      const result = groupingManager.group({ target: mockSelection })

      expect(result).not.toBeNull()
      expect(result?.group).toBeDefined()
      expect(mockCanvas.remove).toHaveBeenCalledTimes(2)
      expect(mockCanvas.add).toHaveBeenCalledWith(result?.group)
      expect(mockCanvas.setActiveObject).toHaveBeenCalledWith(result?.group)
    })

    it('должен сгруппировать текущее выделение (без target)', () => {
      const mockRect = createMockFabricObject({ type: 'rect', id: 'rect-1' })
      const mockCircle = createMockFabricObject({ type: 'circle', id: 'circle-1' })
      const mockSelection = createMockActiveSelection([mockRect, mockCircle])
      mockCanvas.getActiveObject.mockReturnValue(mockSelection)

      const result = groupingManager.group()

      expect(result).not.toBeNull()
      expect(result?.group).toBeDefined()
      expect(mockCanvas.remove).toHaveBeenCalledTimes(2)
      expect(mockCanvas.add).toHaveBeenCalledWith(result?.group)
    })

    it('должен создать группу с уникальным ID', () => {
      const mockRect = createMockFabricObject({ type: 'rect', id: 'rect-1' })
      const mockCircle = createMockFabricObject({ type: 'circle', id: 'circle-1' })

      const result = groupingManager.group({ target: [mockRect, mockCircle] })

      expect(result?.group.id).toMatch(/^group-[a-zA-Z0-9_-]+$/)
    })

    it('НЕ должен сохранять состояние, если withoutSave=true', () => {
      const mockRect = createMockFabricObject({ type: 'rect', id: 'rect-1' })

      const result = groupingManager.group({ target: [mockRect], withoutSave: true })

      expect(result).not.toBeNull()
      expect(result?.withoutSave).toBe(true)
      expect(mockHistoryManager.suspendHistory).toHaveBeenCalled()
      expect(mockHistoryManager.resumeHistory).toHaveBeenCalled()
      expect(mockHistoryManager.saveState).not.toHaveBeenCalled()
    })

    it('должен вернуть null, если нет объектов для группировки', () => {
      const result = groupingManager.group({ target: [] })

      expect(result).toBeNull()
      expect(mockHistoryManager.suspendHistory).not.toHaveBeenCalled()
      expect(mockCanvas.remove).not.toHaveBeenCalled()
      expect(mockCanvas.add).not.toHaveBeenCalled()
    })

    it('должен вернуть null, если нет активного объекта', () => {
      mockCanvas.getActiveObject.mockReturnValue(null)

      const result = groupingManager.group()

      expect(result).toBeNull()
      expect(mockHistoryManager.suspendHistory).not.toHaveBeenCalled()
    })

    it('должен вызвать resumeHistory даже при ошибке', () => {
      const mockRect = createMockFabricObject({ type: 'rect', id: 'rect-1' })
      mockCanvas.add.mockImplementation(() => {
        throw new Error('test error')
      })

      expect(() => {
        groupingManager.group({ target: [mockRect] })
      }).toThrow('test error')

      expect(mockHistoryManager.suspendHistory).toHaveBeenCalled()
      expect(mockHistoryManager.resumeHistory).toHaveBeenCalled()
    })
  })

  describe('ungroup', () => {
    it('должен разгруппировать одну группу', () => {
      const mockRect = createMockFabricObject({ type: 'rect', id: 'rect-1' })
      const mockCircle = createMockFabricObject({ type: 'circle', id: 'circle-1' })
      const mockGroup = createMockGroup([mockRect, mockCircle], { id: 'group-1' })
      const removeAllSpy = jest.spyOn(mockGroup, 'removeAll')

      const result = groupingManager.ungroup({ target: mockGroup })

      expect(result).not.toBeNull()
      expect(result?.selection).toBeDefined()
      expect(result?.ungroupedObjects).toEqual([mockRect, mockCircle])
      expect(result?.withoutSave).toBe(false)
      expect(mockHistoryManager.suspendHistory).toHaveBeenCalled()
      expect(removeAllSpy).toHaveBeenCalled()
      expect(mockCanvas.remove).toHaveBeenCalledWith(mockGroup)
      expect(mockCanvas.add).toHaveBeenCalledTimes(2)
      expect(mockCanvas.add).toHaveBeenCalledWith(mockRect)
      expect(mockCanvas.add).toHaveBeenCalledWith(mockCircle)
      expect(mockCanvas.setActiveObject).toHaveBeenCalledWith(result?.selection)
      expect(mockCanvas.requestRenderAll).toHaveBeenCalled()
      expect(mockCanvas.fire).toHaveBeenCalledWith('editor:objects-ungrouped', expect.objectContaining({
        selection: result?.selection,
        ungroupedObjects: [mockRect, mockCircle],
        withoutSave: false
      }))
      expect(mockHistoryManager.resumeHistory).toHaveBeenCalled()
      expect(mockHistoryManager.saveState).toHaveBeenCalled()
    })

    it('должен разгруппировать массив групп', () => {
      const mockRect1 = createMockFabricObject({ type: 'rect', id: 'rect-1' })
      const mockRect2 = createMockFabricObject({ type: 'rect', id: 'rect-2' })
      const mockCircle1 = createMockFabricObject({ type: 'circle', id: 'circle-1' })
      const mockCircle2 = createMockFabricObject({ type: 'circle', id: 'circle-2' })
      const mockGroup1 = createMockGroup([mockRect1, mockCircle1], { id: 'group-1' })
      const mockGroup2 = createMockGroup([mockRect2, mockCircle2], { id: 'group-2' })
      const removeAll1Spy = jest.spyOn(mockGroup1, 'removeAll')
      const removeAll2Spy = jest.spyOn(mockGroup2, 'removeAll')

      const result = groupingManager.ungroup({ target: [mockGroup1, mockGroup2] })

      expect(result).not.toBeNull()
      expect(result?.ungroupedObjects).toHaveLength(4)
      expect(result?.ungroupedObjects).toContain(mockRect1)
      expect(result?.ungroupedObjects).toContain(mockCircle1)
      expect(result?.ungroupedObjects).toContain(mockRect2)
      expect(result?.ungroupedObjects).toContain(mockCircle2)
      expect(removeAll1Spy).toHaveBeenCalled()
      expect(removeAll2Spy).toHaveBeenCalled()
      expect(mockCanvas.remove).toHaveBeenCalledWith(mockGroup1)
      expect(mockCanvas.remove).toHaveBeenCalledWith(mockGroup2)
      expect(mockCanvas.add).toHaveBeenCalledTimes(4)
    })

    it('должен разгруппировать группы из ActiveSelection', () => {
      const mockRect1 = createMockFabricObject({ type: 'rect', id: 'rect-1' })
      const mockRect2 = createMockFabricObject({ type: 'rect', id: 'rect-2' })
      const mockGroup1 = createMockGroup([mockRect1], { id: 'group-1' })
      const mockGroup2 = createMockGroup([mockRect2], { id: 'group-2' })
      const mockSelection = createMockActiveSelection([mockGroup1, mockGroup2])
      const removeAll1Spy = jest.spyOn(mockGroup1, 'removeAll')
      const removeAll2Spy = jest.spyOn(mockGroup2, 'removeAll')

      const result = groupingManager.ungroup({ target: mockSelection })

      expect(result).not.toBeNull()
      expect(result?.ungroupedObjects).toHaveLength(2)
      expect(removeAll1Spy).toHaveBeenCalled()
      expect(removeAll2Spy).toHaveBeenCalled()
    })

    it('должен разгруппировать текущую группу (без target)', () => {
      const mockRect = createMockFabricObject({ type: 'rect', id: 'rect-1' })
      const mockGroup = createMockGroup([mockRect], { id: 'group-1' })
      mockCanvas.getActiveObject.mockReturnValue(mockGroup)
      const removeAllSpy = jest.spyOn(mockGroup, 'removeAll')

      const result = groupingManager.ungroup()

      expect(result).not.toBeNull()
      expect(result?.ungroupedObjects).toEqual([mockRect])
      expect(removeAllSpy).toHaveBeenCalled()
      expect(mockCanvas.remove).toHaveBeenCalledWith(mockGroup)
    })

    it('должен разгруппировать группы из текущего ActiveSelection', () => {
      const mockRect1 = createMockFabricObject({ type: 'rect', id: 'rect-1' })
      const mockRect2 = createMockFabricObject({ type: 'rect', id: 'rect-2' })
      const mockGroup1 = createMockGroup([mockRect1], { id: 'group-1' })
      const mockGroup2 = createMockGroup([mockRect2], { id: 'group-2' })
      const mockSelection = createMockActiveSelection([mockGroup1, mockGroup2])
      mockCanvas.getActiveObject.mockReturnValue(mockSelection)
      const removeAll1Spy = jest.spyOn(mockGroup1, 'removeAll')
      const removeAll2Spy = jest.spyOn(mockGroup2, 'removeAll')

      const result = groupingManager.ungroup()

      expect(result).not.toBeNull()
      expect(result?.ungroupedObjects).toHaveLength(2)
      expect(removeAll1Spy).toHaveBeenCalled()
      expect(removeAll2Spy).toHaveBeenCalled()
    })

    it('НЕ должен сохранять состояние, если withoutSave=true', () => {
      const mockRect = createMockFabricObject({ type: 'rect', id: 'rect-1' })
      const mockGroup = createMockGroup([mockRect], { id: 'group-1' })

      const result = groupingManager.ungroup({ target: mockGroup, withoutSave: true })

      expect(result).not.toBeNull()
      expect(result?.withoutSave).toBe(true)
      expect(mockHistoryManager.suspendHistory).toHaveBeenCalled()
      expect(mockHistoryManager.resumeHistory).toHaveBeenCalled()
      expect(mockHistoryManager.saveState).not.toHaveBeenCalled()
    })

    it('должен вернуть null, если нет групп для разгруппировки', () => {
      const mockRect = createMockFabricObject({ type: 'rect', id: 'rect-1' })
      const mockCircle = createMockFabricObject({ type: 'circle', id: 'circle-1' })

      const result = groupingManager.ungroup({ target: [mockRect, mockCircle] })

      expect(result).toBeNull()
      expect(mockHistoryManager.suspendHistory).not.toHaveBeenCalled()
      expect(mockCanvas.remove).not.toHaveBeenCalled()
      expect(mockCanvas.add).not.toHaveBeenCalled()
    })

    it('должен вернуть null, если активный объект не группа', () => {
      const mockRect = createMockFabricObject({ type: 'rect', id: 'rect-1' })
      mockCanvas.getActiveObject.mockReturnValue(mockRect)

      const result = groupingManager.ungroup()

      expect(result).toBeNull()
      expect(mockHistoryManager.suspendHistory).not.toHaveBeenCalled()
    })

    it('должен вызвать resumeHistory даже при ошибке', () => {
      const mockRect = createMockFabricObject({ type: 'rect', id: 'rect-1' })
      const mockGroup = createMockGroup([mockRect], { id: 'group-1' })
      jest.spyOn(mockGroup, 'removeAll').mockImplementation(() => {
        throw new Error('test error')
      })

      expect(() => {
        groupingManager.ungroup({ target: mockGroup })
      }).toThrow('test error')

      expect(mockHistoryManager.suspendHistory).toHaveBeenCalled()
      expect(mockHistoryManager.resumeHistory).toHaveBeenCalled()
    })
  })
})
