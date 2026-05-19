import { nanoid } from 'nanoid'
import { createHistoryManagerTestSetup } from '../../../test-utils/history/manager-setup'
import {
  createSnapshotShapeGroup,
  createSnapshotTextObject,
  serializeSnapshotShapeGroupState
} from '../../../test-utils/history/snapshot-fixtures'
import { createHistoryState } from './history-manager.spec-utils'

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

    mockEditor.textManager.isTextEditingActive = true

    setCanvasObjects([{
      id: 'text-1',
      type: 'textbox',
      text: 'до редактирования',
      locked: false
    }] as any[])
    historyManager.saveState()

    setCanvasObjects([{
      id: 'text-1',
      type: 'textbox',
      text: 'после редактирования',
      locked: false
    }] as any[])
    historyManager.stageCurrentStateForPendingSave({ reason: 'text-edit' })
    historyManager.scheduleSaveState({
      delayMs: 100,
      reason: 'text-edit'
    })

    setCanvasObjects([{
      id: 'text-1',
      type: 'textbox',
      text: 'после редактирования',
      locked: true
    }] as any[])
    historyManager.saveState()

    expect(historyManager.currentIndex).toBe(2)
    expect(historyManager.totalChangesCount).toBe(2)
    expect(mockEditor.textManager.isTextEditingActive).toBe(false)

    await historyManager.undo()

    expect(getCanvasObjects()[0]).toEqual(expect.objectContaining({
      text: 'после редактирования',
      locked: false
    }))

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

    mockEditor.textManager.isTextEditingActive = true

    setCanvasObjects([{
      id: 'text-1',
      type: 'textbox',
      text: 'до редактирования'
    }] as any[])
    historyManager.saveState()

    setCanvasObjects([{
      id: 'text-1',
      type: 'textbox',
      text: 'после редактирования'
    }] as any[])
    historyManager.stageCurrentStateForPendingSave({ reason: 'text-edit' })
    historyManager.scheduleSaveState({
      delayMs: 100,
      reason: 'text-edit'
    })

    const didFlush = historyManager.flushPendingSave({ reason: 'text-edit' })

    expect(didFlush).toBe(true)
    expect(historyManager.currentIndex).toBe(1)
    expect(historyManager.totalChangesCount).toBe(1)
    expect(mockEditor.textManager.isTextEditingActive).toBe(false)
    expect(getCanvasObjects()[0]).toEqual(expect.objectContaining({
      text: 'после редактирования'
    }))

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

    mockEditor.textManager.isTextEditingActive = true

    setCanvasObjects([{
      id: 'text-1',
      type: 'textbox',
      text: 'до редактирования'
    }] as any[])
    historyManager.saveState()

    setCanvasObjects([{
      id: 'text-1',
      type: 'textbox',
      text: 'после редактирования'
    }] as any[])
    historyManager.stageCurrentStateForPendingSave({ reason: 'text-edit' })
    historyManager.scheduleSaveState({
      delayMs: 100,
      reason: 'text-edit'
    })

    setCanvasObjects([])
    historyManager.saveState()

    expect(historyManager.currentIndex).toBe(2)
    expect(historyManager.totalChangesCount).toBe(2)
    expect(mockEditor.textManager.isTextEditingActive).toBe(false)

    await historyManager.undo()

    expect(getCanvasObjects()[0]).toEqual(expect.objectContaining({
      text: 'после редактирования'
    }))

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

    await historyManager.undo()

    expect(historyManager.currentIndex).toBe(currentIndex)
    expect(historyManager.totalChangesCount).toBe(totalChangesCount)
    expect(getCanvasObjects()[0]?.left).toBe(10)
    expect(mockCanvas.fire).not.toHaveBeenCalledWith('editor:undo', expect.anything())
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

    mockCanvas.toDatalessObject
      .mockReturnValueOnce(baseState)
      .mockReturnValueOnce(nextState)
      .mockReturnValueOnce(nextState)
      .mockReturnValueOnce(baseState)

    historyManager.saveState()
    historyManager.saveState()

    expect(historyManager.currentIndex).toBe(1)
    expect(historyManager.totalChangesCount).toBe(1)

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
  })

  it('поддерживает множественные undo', async() => {
    const { historyManager, mockCanvas } = createHistoryManagerTestSetup()
    const state1 = createHistoryState({ objects: [{ id: 'obj-1', left: 0 }] as any[] })
    const state2 = createHistoryState({ objects: [{ id: 'obj-1', left: 10 }] as any[] })
    const state3 = createHistoryState({ objects: [{ id: 'obj-1', left: 20 }] as any[] })

    mockCanvas.toDatalessObject
      .mockReturnValueOnce(state1)
      .mockReturnValueOnce(state2)
      .mockReturnValueOnce(state3)
      .mockReturnValueOnce(state3)
      .mockReturnValueOnce(state2)
      .mockReturnValueOnce(state1)
      .mockReturnValueOnce(state2)

    historyManager.saveState()
    historyManager.saveState()
    historyManager.saveState()

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

    mockCanvas.toDatalessObject
      .mockReturnValueOnce(baseState)
      .mockReturnValueOnce(nextState)
      .mockReturnValueOnce(nextState)
      .mockReturnValueOnce(baseState)

    historyManager.saveState()
    historyManager.saveState()
    mockEditor.montageArea.width = 600
    mockEditor.montageArea.height = 300

    jest.clearAllMocks()

    await historyManager.undo()

    expect(mockEditor.zoomManager.calculateAndApplyDefaultZoom).toHaveBeenCalledTimes(1)
    expect(mockEditor.zoomManager.updateDefaultZoom).not.toHaveBeenCalled()
    expect(mockEditor.canvasManager.refreshMontageDerivedState).toHaveBeenCalledTimes(1)
    expect(mockEditor.canvasManager.updateCanvas).not.toHaveBeenCalled()
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

    mockCanvas.toDatalessObject
      .mockReturnValueOnce(baseState)
      .mockReturnValueOnce(nextState)
      .mockReturnValueOnce(nextState)
      .mockReturnValueOnce(baseState)

    historyManager.saveState()
    historyManager.saveState()

    await historyManager.undo()

    expect(historyManager.currentIndex).toBe(0)
    expect(historyManager.totalChangesCount).toBe(0)

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
  })

  it('поддерживает множественные redo', async() => {
    const { historyManager, mockCanvas } = createHistoryManagerTestSetup()
    const state1 = createHistoryState({ objects: [{ id: 'obj-1', left: 0 }] as any[] })
    const state2 = createHistoryState({ objects: [{ id: 'obj-1', left: 10 }] as any[] })
    const state3 = createHistoryState({ objects: [{ id: 'obj-1', left: 20 }] as any[] })

    mockCanvas.toDatalessObject
      .mockReturnValueOnce(state1)
      .mockReturnValueOnce(state2)
      .mockReturnValueOnce(state3)
      .mockReturnValueOnce(state3)
      .mockReturnValueOnce(state2)
      .mockReturnValueOnce(state1)
      .mockReturnValueOnce(state2)

    historyManager.saveState()
    historyManager.saveState()
    historyManager.saveState()

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

    mockCanvas.toDatalessObject.mockImplementation(() => createHistoryState({
      objects: [serializeSnapshotShapeGroupState({
        group,
        text
      })] as any[]
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

    loadSpy.mockRestore()
  })

  it('ничего не делает если currentIndex уже на максимуме', async() => {
    const { historyManager, mockCanvas } = createHistoryManagerTestSetup()
    const state1 = createHistoryState()
    const state2 = createHistoryState({ objects: [{ id: 'obj-1' }] as any[] })

    mockCanvas.toDatalessObject
      .mockReturnValueOnce(state1)
      .mockReturnValueOnce(state2)
      .mockReturnValueOnce(state2)

    historyManager.saveState()
    historyManager.saveState()

    const loadSpy = jest.spyOn(historyManager, 'loadStateFromFullState')
    const initialIndex = historyManager.currentIndex

    await historyManager.redo()

    expect(loadSpy).not.toHaveBeenCalled()
    expect(historyManager.currentIndex).toBe(initialIndex)

    loadSpy.mockRestore()
  })

  it('пропускает undo/redo когда история приостановлена', async() => {
    const { historyManager, mockCanvas } = createHistoryManagerTestSetup()
    const baseState = createHistoryState()
    const nextState = createHistoryState({
      objects: [{ id: 'object-1', left: 5 }] as any[]
    })

    mockCanvas.toDatalessObject
      .mockReturnValueOnce(baseState)
      .mockReturnValueOnce(nextState)

    historyManager.saveState()
    historyManager.saveState()

    const initialIndex = historyManager.currentIndex
    const loadSpy = jest.spyOn(historyManager, 'loadStateFromFullState')

    historyManager.suspendHistory()

    await historyManager.undo()
    await historyManager.redo()

    expect(loadSpy).not.toHaveBeenCalled()
    expect(historyManager.currentIndex).toBe(initialIndex)
    expect(mockCanvas.fire).not.toHaveBeenCalledWith('editor:undo', expect.anything())
    expect(mockCanvas.fire).not.toHaveBeenCalledWith('editor:redo', expect.anything())

    historyManager.resumeHistory()
    loadSpy.mockRestore()
  })

  it('обрабатывает ошибки при undo и вызывает errorManager', async() => {
    const { historyManager, mockCanvas, mockEditor } = createHistoryManagerTestSetup()
    const baseState = createHistoryState()
    const nextState = createHistoryState({ objects: [{ id: 'obj-1' }] as any[] })

    mockCanvas.toDatalessObject
      .mockReturnValueOnce(baseState)
      .mockReturnValueOnce(nextState)

    historyManager.saveState()
    historyManager.saveState()

    const error = new Error('Test undo error')
    const loadSpy = jest.spyOn(historyManager, 'loadStateFromFullState')
      .mockRejectedValueOnce(error)

    await historyManager.undo()

    expect(mockEditor.errorManager.emitError).toHaveBeenCalledWith({
      origin: 'HistoryManager',
      method: 'undo',
      code: 'UNDO_ERROR',
      message: 'Ошибка отмены действия',
      data: error
    })

    loadSpy.mockRestore()
  })

  it('обрабатывает ошибки при redo и вызывает errorManager', async() => {
    const { historyManager, mockCanvas, mockEditor } = createHistoryManagerTestSetup()
    const baseState = createHistoryState()
    const nextState = createHistoryState({ objects: [{ id: 'obj-1' }] as any[] })

    mockCanvas.toDatalessObject
      .mockReturnValueOnce(baseState)
      .mockReturnValueOnce(nextState)

    historyManager.saveState()
    historyManager.saveState()

    await historyManager.undo()

    const error = new Error('Test redo error')
    const loadSpy = jest.spyOn(historyManager, 'loadStateFromFullState')
      .mockRejectedValueOnce(error)

    await historyManager.redo()

    expect(mockEditor.errorManager.emitError).toHaveBeenCalledWith({
      origin: 'HistoryManager',
      method: 'redo',
      code: 'REDO_ERROR',
      message: 'Ошибка повтора действия',
      data: error
    })

    loadSpy.mockRestore()
  })

  it('resumeHistory вызывается в finally блоке даже при ошибках в undo', async() => {
    const { historyManager, mockCanvas } = createHistoryManagerTestSetup()
    const baseState = createHistoryState()
    const nextState = createHistoryState({ objects: [{ id: 'obj-1' }] as any[] })

    mockCanvas.toDatalessObject
      .mockReturnValueOnce(baseState)
      .mockReturnValueOnce(nextState)

    historyManager.saveState()
    historyManager.saveState()

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
    const baseState = createHistoryState()
    const nextState = createHistoryState({ objects: [{ id: 'obj-1' }] as any[] })

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
