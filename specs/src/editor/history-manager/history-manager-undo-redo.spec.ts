import { nanoid } from 'nanoid'
import { createHistoryManagerTestSetup } from '../../../test-utils/history/manager-setup'
import {
  createSnapshotShapeGroupHistoryState,
  createSnapshotShapeGroup,
  createSnapshotTextObject
} from '../../../test-utils/history/snapshot-fixtures'
import {
  createHistoryState,
  createObjectPresenceHistoryStates,
  saveHistoryStates,
  saveThreeObjectLeftHistorySteps,
  setTextboxState,
  startTextboxEditHistory
} from '../../../test-utils/history/state-fixtures'

jest.mock('nanoid')

describe('undo/redo', () => {
  const mockNanoid = nanoid as jest.MockedFunction<typeof nanoid>

  beforeEach(() => {
    jest.clearAllMocks()
    mockNanoid.mockImplementation(() => 'patch-id')
  })

  it('сохраняет введённый текст отдельным шагом перед следующим действием над объектом', async() => {
    const {
      historyManager,
      getCanvasObjects,
      setCanvasObjects,
      mockEditor
    } = createHistoryManagerTestSetup()

    startTextboxEditHistory({
      historyManager,
      setCanvasObjects,
      textManager: mockEditor.textManager,
      initialText: 'до редактирования',
      editedText: 'после редактирования',
      locked: false
    })

    setTextboxState({
      setCanvasObjects,
      text: 'после редактирования',
      locked: true
    })
    historyManager.saveState()

    expect(historyManager.currentIndex).toBe(2)
    expect(historyManager.totalChangesCount).toBe(2)
    expect(mockEditor.textManager.isTextEditingActive).toBe(false)

    await historyManager.undo()

    expect(getCanvasObjects()[0]).toMatchObject({
      text: 'после редактирования',
      locked: false
    })

    await historyManager.undo()

    expect(getCanvasObjects()[0]).toEqual(expect.objectContaining({
      text: 'до редактирования',
      locked: false
    }))
  })

  it('не дублирует history-шаг после выхода из редактирования, если новых изменений не было', () => {
    const {
      historyManager,
      getCanvasObjects,
      setCanvasObjects,
      mockEditor
    } = createHistoryManagerTestSetup()

    startTextboxEditHistory({
      historyManager,
      setCanvasObjects,
      textManager: mockEditor.textManager,
      initialText: 'до редактирования',
      editedText: 'после редактирования'
    })

    const didFlush = historyManager.flushPendingSave({ reason: 'text-edit' })

    expect(didFlush).toBe(true)
    expect(historyManager.currentIndex).toBe(1)
    expect(historyManager.totalChangesCount).toBe(1)
    expect(mockEditor.textManager.isTextEditingActive).toBe(false)
    expect(getCanvasObjects()[0]).toMatchObject({
      text: 'после редактирования'
    })

    historyManager.saveState()

    expect(historyManager.currentIndex).toBe(1)
    expect(historyManager.totalChangesCount).toBe(1)
  })

  it('сохраняет введённый текст отдельным шагом перед удалением объекта', async() => {
    const {
      historyManager,
      getCanvasObjects,
      setCanvasObjects,
      mockEditor
    } = createHistoryManagerTestSetup()

    startTextboxEditHistory({
      historyManager,
      setCanvasObjects,
      textManager: mockEditor.textManager,
      initialText: 'до редактирования',
      editedText: 'после редактирования'
    })

    setCanvasObjects([])
    historyManager.saveState()

    expect({
      currentIndex: historyManager.currentIndex,
      totalChangesCount: historyManager.totalChangesCount,
      isTextEditingActive: mockEditor.textManager.isTextEditingActive
    }).toEqual({
      currentIndex: 2,
      totalChangesCount: 2,
      isTextEditingActive: false
    })

    await historyManager.undo()

    expect(getCanvasObjects()[0]).toMatchObject({
      text: 'после редактирования'
    })

    await historyManager.undo()

    expect(getCanvasObjects()[0]).toEqual(expect.objectContaining({
      text: 'до редактирования'
    }))
  })

  it('ничего не делает если undo вызывается без истории', async() => {
    const { historyManager, mockEditor } = createHistoryManagerTestSetup()
    const loadSpy = jest.spyOn(historyManager, 'loadStateFromFullState')

    await historyManager.undo()

    expect(loadSpy).not.toHaveBeenCalled()
    expect(mockEditor.canvas.fire).not.toHaveBeenCalledWith('editor:undo', expect.anything())
    expect(mockEditor.canvas.fire).not.toHaveBeenCalledWith('editor:history-changed', expect.anything())

    loadSpy.mockRestore()
  })

  it('отменяет активное действие и не изменяет историю', async() => {
    const {
      historyManager,
      getCanvasObjects,
      setCanvasObjects,
      mockCanvas
    } = createHistoryManagerTestSetup()

    setCanvasObjects([{ id: 'object-1', type: 'rect', left: 0 }] as any[])
    historyManager.saveState()

    setCanvasObjects([{ id: 'object-1', type: 'rect', left: 10 }] as any[])
    historyManager.saveState()

    const { currentIndex, totalChangesCount } = historyManager

    historyManager.beginAction({ reason: 'object-transform' })

    setCanvasObjects([{ id: 'object-1', type: 'rect', left: 20 }] as any[])

    mockCanvas.fire.mockClear()
    await historyManager.undo()

    expect(historyManager.currentIndex).toBe(currentIndex)
    expect(historyManager.totalChangesCount).toBe(totalChangesCount)
    expect(getCanvasObjects()[0]?.left).toBe(10)
    expect(mockCanvas.fire).not.toHaveBeenCalledWith('editor:undo', expect.anything())
    expect(mockCanvas.fire).not.toHaveBeenCalledWith('editor:history-changed', expect.anything())
  })

  it('undo фиксирует отложенное сохранение перед откатом', async() => {
    const {
      historyManager,
      getCanvasObjects,
      setCanvasObjects
    } = createHistoryManagerTestSetup()

    setCanvasObjects([{ id: 'object-1', type: 'rect', left: 0 }] as any[])
    historyManager.saveState()

    setCanvasObjects([{ id: 'object-1', type: 'rect', left: 10 }] as any[])

    const saveSpy = jest.spyOn(historyManager, 'saveState')
    saveSpy.mockClear()

    historyManager.scheduleSaveState({
      delayMs: 100,
      reason: 'object-modified'
    })

    await historyManager.undo()

    expect(saveSpy).toHaveBeenCalledTimes(1)
    expect(getCanvasObjects()[0]?.left).toBe(0)

    saveSpy.mockRestore()
  })

  it('ничего не делает если currentIndex уже равен 0', async() => {
    const { historyManager, mockCanvas } = createHistoryManagerTestSetup()
    const baseState = createHistoryState()

    mockCanvas.toDatalessObject.mockReturnValueOnce(baseState)
    historyManager.saveState()

    const loadSpy = jest.spyOn(historyManager, 'loadStateFromFullState')

    await historyManager.undo()

    expect(loadSpy).not.toHaveBeenCalled()
    expect(historyManager.currentIndex).toBe(0)
    expect(mockCanvas.fire).not.toHaveBeenCalledWith('editor:history-changed', expect.anything())

    loadSpy.mockRestore()
  })

  it('возвращает предыдущее состояние и генерирует события', async() => {
    const { historyManager, mockCanvas } = createHistoryManagerTestSetup()
    const baseState = createHistoryState({
      objects: [
        { id: 'montage-area', type: 'rect' },
        { id: 'background', type: 'rect', backgroundType: 'color' }
      ] as any[]
    })
    const nextState = createHistoryState({
      objects: [
        { id: 'montage-area', type: 'rect' },
        { id: 'background', type: 'rect', backgroundType: 'color' },
        { id: 'object-1', left: 10 }
      ] as any[]
    })

    saveHistoryStates({
      historyManager,
      mockCanvas,
      states: [baseState, nextState]
    })
    mockCanvas.toDatalessObject
      .mockReturnValueOnce(nextState)
      .mockReturnValueOnce(baseState)

    expect(historyManager.currentIndex).toBe(1)
    expect(historyManager.totalChangesCount).toBe(1)

    mockCanvas.fire.mockClear()
    await historyManager.undo()

    expect(historyManager.currentIndex).toBe(0)
    expect(historyManager.totalChangesCount).toBe(0)
    expect(mockCanvas.fire).toHaveBeenCalledWith('editor:undo', expect.objectContaining({
      currentIndex: 0,
      totalChangesCount: 0,
      baseStateChangesCount: 0,
      patchesCount: 1,
      patches: expect.any(Array)
    }))
    expect(mockCanvas.fire).toHaveBeenCalledWith('editor:history-state-loaded', expect.objectContaining({
      fullState: expect.any(Object)
    }))
    expect(mockCanvas.fire).toHaveBeenCalledWith('editor:history-changed', {
      action: 'undo',
      currentIndex: 0,
      totalChangesCount: 0,
      baseStateChangesCount: 0,
      patchesCount: 1,
      canUndo: false,
      canRedo: true,
      hasUnsavedChanges: false,
      currentChangePosition: 0
    })
  })

  it('поддерживает множественные undo', async() => {
    const { historyManager, mockCanvas } = createHistoryManagerTestSetup()
    saveThreeObjectLeftHistorySteps({
      historyManager,
      mockCanvas,
      leftValues: [0, 10, 20]
    })

    expect(historyManager.currentIndex).toBe(2)

    await historyManager.undo()
    expect(historyManager.currentIndex).toBe(1)

    await historyManager.undo()
    expect(historyManager.currentIndex).toBe(0)
  })

  it('undo после изменения resolution пересчитывает defaultZoom', async() => {
    const { historyManager, mockCanvas, mockEditor } = createHistoryManagerTestSetup()
    const baseState = createHistoryState({
      width: 800,
      height: 600,
      objects: [
        { id: 'montage-area', type: 'rect', width: 400, height: 300 }
      ] as any[]
    })
    const nextState = createHistoryState({
      width: 800,
      height: 600,
      objects: [
        { id: 'montage-area', type: 'rect', width: 600, height: 300 }
      ] as any[]
    })

    saveHistoryStates({
      historyManager,
      mockCanvas,
      states: [baseState, nextState]
    })
    mockCanvas.toDatalessObject
      .mockReturnValueOnce(nextState)
      .mockReturnValueOnce(baseState)
    mockEditor.montageArea.width = 600
    mockEditor.montageArea.height = 300

    jest.clearAllMocks()

    await historyManager.undo()

    const { zoomManager, canvasManager } = mockEditor

    expect({
      defaultZoomRecalculations: zoomManager.calculateAndApplyDefaultZoom.mock.calls.length,
      defaultZoomUpdates: zoomManager.updateDefaultZoom.mock.calls.length,
      montageDerivedRefreshes: canvasManager.refreshMontageDerivedState.mock.calls.length,
      canvasUpdates: canvasManager.updateCanvas.mock.calls.length
    }).toEqual({
      defaultZoomRecalculations: 1,
      defaultZoomUpdates: 0,
      montageDerivedRefreshes: 1,
      canvasUpdates: 0
    })
  })

  it('повторяет действие и генерирует событие redo', async() => {
    const { historyManager, mockCanvas } = createHistoryManagerTestSetup()
    const baseState = createHistoryState({
      objects: [
        { id: 'montage-area', type: 'rect' }
      ] as any[]
    })
    const nextState = createHistoryState({
      objects: [
        { id: 'montage-area', type: 'rect' },
        { id: 'object-1', left: 10 }
      ] as any[]
    })

    saveHistoryStates({
      historyManager,
      mockCanvas,
      states: [baseState, nextState]
    })
    mockCanvas.toDatalessObject
      .mockReturnValueOnce(nextState)
      .mockReturnValueOnce(baseState)

    await historyManager.undo()

    expect(historyManager.currentIndex).toBe(0)
    expect(historyManager.totalChangesCount).toBe(0)

    mockCanvas.fire.mockClear()
    await historyManager.redo()

    expect(historyManager.currentIndex).toBe(1)
    expect(historyManager.totalChangesCount).toBe(1)
    expect(mockCanvas.fire).toHaveBeenCalledWith('editor:redo', expect.objectContaining({
      currentIndex: 1,
      totalChangesCount: 1,
      baseStateChangesCount: 0,
      patchesCount: 1,
      patches: expect.any(Array)
    }))
    expect(mockCanvas.fire).toHaveBeenCalledWith('editor:history-changed', {
      action: 'redo',
      currentIndex: 1,
      totalChangesCount: 1,
      baseStateChangesCount: 0,
      patchesCount: 1,
      canUndo: true,
      canRedo: false,
      hasUnsavedChanges: true,
      currentChangePosition: 1
    })
  })

  it('поддерживает множественные redo', async() => {
    const { historyManager, mockCanvas } = createHistoryManagerTestSetup()
    saveThreeObjectLeftHistorySteps({
      historyManager,
      mockCanvas,
      leftValues: [0, 10, 20]
    })

    await historyManager.undo()
    await historyManager.undo()

    expect(historyManager.currentIndex).toBe(0)

    await historyManager.redo()
    expect(historyManager.currentIndex).toBe(1)

    await historyManager.redo()
    expect(historyManager.currentIndex).toBe(2)
  })

  it('undo и redo после редактирования текста shape не делают группу невыделяемой', async() => {
    const {
      historyManager,
      mockCanvas,
      getCanvasObjects,
      setCanvasObjects
    } = createHistoryManagerTestSetup()
    const text = createSnapshotTextObject({
      id: 'shape-text-1',
      text: 'shape text',
      selectable: false,
      evented: false
    })
    const group = createSnapshotShapeGroup({
      id: 'shape-1',
      childObjects: [text],
      selectable: true,
      evented: true,
      lockMovementX: false,
      lockMovementY: false
    })

    setCanvasObjects([group])

    mockCanvas.toDatalessObject.mockImplementation(() => createSnapshotShapeGroupHistoryState({
      group,
      text
    }))

    historyManager.saveState()

    text.text = 'shape text updated'

    historyManager.saveState()

    await historyManager.undo()

    const [groupAfterUndo] = getCanvasObjects() as Array<Record<string, unknown>>

    expect(groupAfterUndo.selectable).toBe(true)
    expect(groupAfterUndo.evented).toBe(true)
    expect(groupAfterUndo.lockMovementX).toBe(false)
    expect(groupAfterUndo.lockMovementY).toBe(false)

    await historyManager.redo()

    const [groupAfterRedo] = getCanvasObjects() as Array<Record<string, unknown>>
    const [textAfterRedo] = groupAfterRedo.objects as Array<Record<string, unknown>>

    expect(groupAfterRedo.selectable).toBe(true)
    expect(groupAfterRedo.evented).toBe(true)
    expect(groupAfterRedo.lockMovementX).toBe(false)
    expect(groupAfterRedo.lockMovementY).toBe(false)
    expect(textAfterRedo.selectable).toBe(false)
    expect(textAfterRedo.evented).toBe(false)
    expect(textAfterRedo.lockMovementX).toBe(false)
    expect(textAfterRedo.lockMovementY).toBe(false)
  })

  it('ничего не делает если redo вызывается без доступных состояний', async() => {
    const { historyManager, mockEditor } = createHistoryManagerTestSetup()
    const loadSpy = jest.spyOn(historyManager, 'loadStateFromFullState')

    await historyManager.redo()

    expect(loadSpy).not.toHaveBeenCalled()
    expect(mockEditor.canvas.fire).not.toHaveBeenCalledWith('editor:redo', expect.anything())
    expect(mockEditor.canvas.fire).not.toHaveBeenCalledWith('editor:history-changed', expect.anything())

    loadSpy.mockRestore()
  })

  it('ничего не делает если currentIndex уже на максимуме', async() => {
    const { historyManager, mockCanvas } = createHistoryManagerTestSetup()
    const [state1, state2] = createObjectPresenceHistoryStates()

    saveHistoryStates({
      historyManager,
      mockCanvas,
      states: [state1, state2]
    })

    const loadSpy = jest.spyOn(historyManager, 'loadStateFromFullState')
    const initialIndex = historyManager.currentIndex

    mockCanvas.fire.mockClear()
    await historyManager.redo()

    expect(loadSpy).not.toHaveBeenCalled()
    expect(historyManager.currentIndex).toBe(initialIndex)
    expect(mockCanvas.fire).not.toHaveBeenCalledWith('editor:history-changed', expect.anything())

    loadSpy.mockRestore()
  })

  it('пропускает undo/redo когда история приостановлена', async() => {
    const { historyManager, mockCanvas } = createHistoryManagerTestSetup()
    const baseState = createHistoryState()
    const nextState = createHistoryState({
      objects: [{ id: 'object-1', left: 5 }] as any[]
    })

    saveHistoryStates({
      historyManager,
      mockCanvas,
      states: [baseState, nextState]
    })

    const initialIndex = historyManager.currentIndex
    const loadSpy = jest.spyOn(historyManager, 'loadStateFromFullState')

    historyManager.suspendHistory()

    mockCanvas.fire.mockClear()
    await historyManager.undo()
    await historyManager.redo()

    expect(loadSpy).not.toHaveBeenCalled()
    expect(historyManager.currentIndex).toBe(initialIndex)
    expect(mockCanvas.fire).not.toHaveBeenCalledWith('editor:undo', expect.anything())
    expect(mockCanvas.fire).not.toHaveBeenCalledWith('editor:redo', expect.anything())
    expect(mockCanvas.fire).not.toHaveBeenCalledWith('editor:history-changed', expect.anything())

    historyManager.resumeHistory()
    loadSpy.mockRestore()
  })

  it('обрабатывает ошибки при undo и вызывает errorManager', async() => {
    const { historyManager, mockCanvas, mockEditor } = createHistoryManagerTestSetup()
    const [baseState, nextState] = createObjectPresenceHistoryStates()

    saveHistoryStates({
      historyManager,
      mockCanvas,
      states: [baseState, nextState]
    })

    const error = new Error('Test undo error')
    const loadSpy = jest.spyOn(historyManager, 'loadStateFromFullState')
      .mockRejectedValueOnce(error)

    mockCanvas.fire.mockClear()
    await historyManager.undo()

    expect(mockEditor.errorManager.emitError).toHaveBeenCalledWith({
      origin: 'HistoryManager',
      method: 'undo',
      code: 'UNDO_ERROR',
      message: 'Ошибка отмены действия',
      data: error
    })
    expect(mockCanvas.fire).not.toHaveBeenCalledWith('editor:history-changed', expect.anything())

    loadSpy.mockRestore()
  })

  it('обрабатывает ошибки при redo и вызывает errorManager', async() => {
    const { historyManager, mockCanvas, mockEditor } = createHistoryManagerTestSetup()
    const [baseState, nextState] = createObjectPresenceHistoryStates()

    saveHistoryStates({
      historyManager,
      mockCanvas,
      states: [baseState, nextState]
    })

    await historyManager.undo()

    const error = new Error('Test redo error')
    const loadSpy = jest.spyOn(historyManager, 'loadStateFromFullState')
      .mockRejectedValueOnce(error)

    mockCanvas.fire.mockClear()
    await historyManager.redo()

    expect(mockEditor.errorManager.emitError).toHaveBeenCalledWith({
      origin: 'HistoryManager',
      method: 'redo',
      code: 'REDO_ERROR',
      message: 'Ошибка повтора действия',
      data: error
    })
    expect(mockCanvas.fire).not.toHaveBeenCalledWith('editor:history-changed', expect.anything())

    loadSpy.mockRestore()
  })

  it('resumeHistory вызывается в finally блоке даже при ошибках в undo', async() => {
    const { historyManager, mockCanvas } = createHistoryManagerTestSetup()
    const [baseState, nextState] = createObjectPresenceHistoryStates()

    saveHistoryStates({
      historyManager,
      mockCanvas,
      states: [baseState, nextState]
    })

    const resumeSpy = jest.spyOn(historyManager, 'resumeHistory')
    const loadSpy = jest.spyOn(historyManager, 'loadStateFromFullState')
      .mockRejectedValueOnce(new Error('Test error'))

    await historyManager.undo()

    expect(resumeSpy).toHaveBeenCalled()

    loadSpy.mockRestore()
    resumeSpy.mockRestore()
  })

  it('resumeHistory вызывается в finally блоке даже при ошибках в redo', async() => {
    const { historyManager, mockCanvas } = createHistoryManagerTestSetup()
    const [baseState, nextState] = createObjectPresenceHistoryStates()

    mockCanvas.toDatalessObject
      .mockReturnValueOnce(baseState)
      .mockReturnValueOnce(nextState)

    historyManager.saveState()
    historyManager.saveState()

    await historyManager.undo()

    const resumeSpy = jest.spyOn(historyManager, 'resumeHistory')
    const loadSpy = jest.spyOn(historyManager, 'loadStateFromFullState')
      .mockRejectedValueOnce(new Error('Test error'))

    await historyManager.redo()

    expect(resumeSpy).toHaveBeenCalled()

    loadSpy.mockRestore()
    resumeSpy.mockRestore()
  })
})
