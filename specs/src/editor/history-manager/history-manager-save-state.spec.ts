import { nanoid } from 'nanoid'
import { prepareStatesForDiff } from '../../../../src/editor/history-manager/diff-normalization'
import { createHistoryManagerTestSetup } from '../../../test-utils/history/manager-setup'
import {
  createSnapshotShapeGroupHistoryState,
  createSnapshotShapeGroup,
  createSnapshotTextObject
} from '../../../test-utils/history/snapshot-fixtures'
import {
  createHistoryState,
  createMontageAreaHistoryState,
  createObjectLeftHistoryStates,
  createSceneTranslationHistoryState,
  saveHistoryStates,
  saveTextboxLockState
} from '../../../test-utils/history/state-fixtures'

jest.mock('nanoid')

describe('saveState и getFullState', () => {
  const mockNanoid = nanoid as jest.MockedFunction<typeof nanoid>

  beforeEach(() => {
    jest.clearAllMocks()
    mockNanoid.mockImplementation(() => 'patch-id')
  })

  it('сохраняет базовое состояние при первом вызове saveState', () => {
    const { historyManager, mockCanvas } = createHistoryManagerTestSetup()
    const baseState = createHistoryState({
      objects: [
        { id: 'montage-area', type: 'rect' },
        { id: 'object-1', left: 0, top: 0 }
      ] as any[]
    })

    mockCanvas.toDatalessObject.mockReturnValueOnce(baseState)

    historyManager.saveState()

    expect(historyManager.baseState).toEqual(baseState)
    expect(historyManager.patches).toHaveLength(0)
    expect(historyManager.currentIndex).toBe(0)
    expect(historyManager.totalChangesCount).toBe(0)
    expect(historyManager.baseStateChangesCount).toBe(0)
    expect(mockNanoid).not.toHaveBeenCalled()
    expect(mockCanvas.fire).not.toHaveBeenCalledWith('editor:history-changed', expect.anything())
  })

  it('добавляет диффы после установки базового состояния', () => {
    const { historyManager, mockCanvas } = createHistoryManagerTestSetup()
    const baseState = createHistoryState({
      objects: [
        { id: 'montage-area', type: 'rect' },
        { id: 'object-1', left: 0, top: 0 }
      ] as any[]
    })
    const updatedState = createHistoryState({
      objects: [
        { id: 'montage-area', type: 'rect' },
        { id: 'object-1', left: 25, top: 0 }
      ] as any[]
    })

    mockCanvas.toDatalessObject
      .mockReturnValueOnce(baseState)
      .mockReturnValueOnce(updatedState)

    historyManager.saveState()
    historyManager.saveState()

    expect(historyManager.patches).toHaveLength(1)
    expect(historyManager.currentIndex).toBe(1)
    expect(historyManager.totalChangesCount).toBe(1)
    expect(historyManager.getFullState()).toEqual(updatedState)
    expect(mockNanoid).toHaveBeenCalledTimes(1)

    const fireCalls = mockCanvas.fire.mock.calls as Array<[string, unknown?]>
    const historyChangedCalls = fireCalls
      .filter((call) => call[0] === 'editor:history-changed')

    expect(historyChangedCalls).toHaveLength(1)
    expect(historyChangedCalls[0]?.[1]).toEqual({
      action: 'save',
      patchId: 'patch-id',
      currentIndex: 1,
      totalChangesCount: 1,
      baseStateChangesCount: 0,
      patchesCount: 1,
      canUndo: true,
      canRedo: false,
      hasUnsavedChanges: true,
      currentChangePosition: 1
    })
    expect(historyChangedCalls[0]?.[1]).not.toHaveProperty('patches')
    expect(historyChangedCalls[0]?.[1]).not.toHaveProperty('diff')
  })

  it('не добавляет дифф если состояние не изменилось', () => {
    const { historyManager, mockCanvas } = createHistoryManagerTestSetup()
    const baseState = createHistoryState({
      objects: [{ id: 'object-1', left: 0 }] as any[]
    })

    mockCanvas.toDatalessObject
      .mockReturnValueOnce(baseState)
      .mockReturnValueOnce(baseState)

    historyManager.saveState()
    historyManager.saveState()

    expect(historyManager.patches).toHaveLength(0)
    expect(historyManager.totalChangesCount).toBe(0)
    expect(historyManager.hasUnsavedChanges()).toBe(false)
    expect(mockCanvas.fire).not.toHaveBeenCalledWith('editor:history-changed', expect.anything())
  })

  it('не сохраняет состояние если diff есть, но нормализованные состояния равны', () => {
    const { historyManager, mockCanvas } = createHistoryManagerTestSetup()
    const baseObject = { id: 'object-1', left: 0, top: 0 }
    const reorderedObject = { top: 0, left: 0, id: 'object-1' }
    const baseState = createHistoryState({
      objects: [baseObject] as any[]
    })
    const nextState = createHistoryState({
      objects: [reorderedObject] as any[]
    })

    mockCanvas.toDatalessObject
      .mockReturnValueOnce(baseState)
      .mockReturnValueOnce(nextState)

    historyManager.diffPatcher = {
      diff: jest.fn(() => ({ objects: { _t: 'a' } })),
      patch: jest.fn(),
      clone: jest.fn(),
      unpatch: jest.fn()
    } as any

    historyManager.saveState()
    historyManager.saveState()

    expect({
      patchesCount: historyManager.patches.length,
      currentIndex: historyManager.currentIndex,
      totalChangesCount: historyManager.totalChangesCount,
      hasUnsavedChanges: historyManager.hasUnsavedChanges()
    }).toEqual({
      patchesCount: 0,
      currentIndex: 0,
      totalChangesCount: 0,
      hasUnsavedChanges: false
    })
    const eventNames = (mockCanvas.fire.mock.calls as Array<[string, unknown?]>)
      .map((call) => call[0])

    expect(eventNames).not.toContain('editor:history-changed')
  })

  it('игнорирует изменения размеров канваса без изменения монтажной области', () => {
    const { historyManager, mockCanvas } = createHistoryManagerTestSetup()
    const montageArea = {
      id: 'montage-area',
      type: 'rect',
      width: 400,
      height: 300,
      left: 100,
      top: 50
    }
    const baseState = createMontageAreaHistoryState({
      canvasWidth: 800,
      canvasHeight: 600,
      montageArea
    })
    const nextState = createMontageAreaHistoryState({
      canvasWidth: 900,
      canvasHeight: 700,
      montageArea
    })
    saveHistoryStates({
      historyManager,
      mockCanvas,
      states: [baseState, nextState]
    })

    const { patches, totalChangesCount } = historyManager

    expect(patches).toHaveLength(0)
    expect(totalChangesCount).toBe(0)
  })

  it('сохраняет изменения если меняется размер монтажной области', () => {
    const { historyManager, mockCanvas } = createHistoryManagerTestSetup()
    const baseMontageArea = {
      id: 'montage-area',
      type: 'rect',
      width: 400,
      height: 300,
      left: 100,
      top: 50
    }
    const nextMontageArea = {
      ...baseMontageArea,
      width: 450
    }
    const baseState = createMontageAreaHistoryState({
      canvasWidth: 800,
      canvasHeight: 600,
      montageArea: baseMontageArea
    })
    const nextState = createMontageAreaHistoryState({
      canvasWidth: 900,
      canvasHeight: 700,
      montageArea: nextMontageArea
    })
    saveHistoryStates({
      historyManager,
      mockCanvas,
      states: [baseState, nextState]
    })

    const { patches, totalChangesCount } = historyManager

    expect(patches).toHaveLength(1)
    expect(totalChangesCount).toBe(1)
  })

  it('сохраняет scene translation как реальное изменение состояния', () => {
    const { historyManager, mockCanvas } = createHistoryManagerTestSetup()
    const baseState = createSceneTranslationHistoryState({
      clipLeft: 100,
      clipTop: 50,
      objectLeft: 200,
      objectTop: 100
    })
    const nextState = createSceneTranslationHistoryState({
      clipLeft: 120,
      clipTop: 70,
      objectLeft: 220,
      objectTop: 120
    })
    saveHistoryStates({
      historyManager,
      mockCanvas,
      states: [baseState, nextState]
    })

    const { patches } = historyManager

    expect(patches).toHaveLength(1)
  })

  it('сохраняет дифф если при смещении есть реальные изменения объекта', () => {
    const { historyManager, mockCanvas } = createHistoryManagerTestSetup()
    const baseState = createSceneTranslationHistoryState({
      clipLeft: 100,
      clipTop: 50,
      objectLeft: 200,
      objectTop: 100
    })
    const nextState = createSceneTranslationHistoryState({
      clipLeft: 120,
      clipTop: 70,
      objectLeft: 230,
      objectTop: 125
    })
    saveHistoryStates({
      historyManager,
      mockCanvas,
      states: [baseState, nextState]
    })

    const { patches } = historyManager

    expect(patches).toHaveLength(1)
  })

  it('игнорирует изменения backgroundColor если фон отключен', () => {
    const { historyManager, mockCanvas } = createHistoryManagerTestSetup()
    const baseState = createHistoryState({
      objects: [
        {
          id: 'text-1',
          type: 'textbox',
          backgroundOpacity: 0,
          backgroundColor: '#ffffff',
          textBackgroundColor: null
        }
      ] as any[]
    })
    const nextState = createHistoryState({
      objects: [
        {
          id: 'text-1',
          type: 'textbox',
          backgroundOpacity: 0,
          backgroundColor: '#000000',
          textBackgroundColor: ''
        }
      ] as any[]
    })
    saveHistoryStates({
      historyManager,
      mockCanvas,
      states: [baseState, nextState]
    })

    const normalized = prepareStatesForDiff({
      prevState: baseState,
      nextState
    })
    const { prevState: normalizedPrevState, nextState: normalizedNextState } = normalized
    const [prevTextObject] = normalizedPrevState.objects
    const [nextTextObject] = normalizedNextState.objects
    const {
      backgroundColor: prevBackgroundColor,
      textBackgroundColor: prevTextBackgroundColor
    } = prevTextObject as { backgroundColor?: string | null; textBackgroundColor?: string | null }
    const {
      backgroundColor: nextBackgroundColor,
      textBackgroundColor: nextTextBackgroundColor
    } = nextTextObject as { backgroundColor?: string | null; textBackgroundColor?: string | null }

    const { patches } = historyManager

    expect(prevBackgroundColor).toBeNull()
    expect(nextBackgroundColor).toBeNull()
    expect(prevTextBackgroundColor).toBeNull()
    expect(nextTextBackgroundColor).toBeNull()
    expect(patches).toHaveLength(0)
  })

  it('сохраняет изменения backgroundColor если фон включен', () => {
    const { historyManager, mockCanvas } = createHistoryManagerTestSetup()
    const baseState = createHistoryState({
      objects: [
        {
          id: 'text-1',
          type: 'textbox',
          backgroundOpacity: 1,
          backgroundColor: '#ffffff'
        }
      ] as any[]
    })
    const nextState = createHistoryState({
      objects: [
        {
          id: 'text-1',
          type: 'textbox',
          backgroundOpacity: 1,
          backgroundColor: '#000000'
        }
      ] as any[]
    })
    saveHistoryStates({
      historyManager,
      mockCanvas,
      states: [baseState, nextState]
    })

    const { patches } = historyManager

    expect(patches).toHaveLength(1)
  })

  it('сохраняет изменения геометрии системных объектов', () => {
    const { historyManager, mockCanvas } = createHistoryManagerTestSetup()
    const baseState = createHistoryState({
      objects: [
        {
          id: 'montage-area',
          type: 'rect',
          left: 0,
          top: 0,
          width: 400,
          height: 300
        },
        {
          id: 'background',
          type: 'rect',
          left: -10,
          top: -20,
          width: 100,
          height: 100,
          scaleX: 1,
          scaleY: 1
        }
      ] as any[]
    })
    const nextState = createHistoryState({
      objects: [
        {
          id: 'montage-area',
          type: 'rect',
          left: 0,
          top: 0,
          width: 400,
          height: 300
        },
        {
          id: 'background',
          type: 'rect',
          left: -5,
          top: -10,
          width: 100,
          height: 100,
          scaleX: 1,
          scaleY: 1
        }
      ] as any[]
    })
    const { toDatalessObject } = mockCanvas

    toDatalessObject
      .mockReturnValueOnce(baseState)
      .mockReturnValueOnce(nextState)

    historyManager.saveState()
    historyManager.saveState()

    expect(historyManager.patches).toHaveLength(1)
  })

  it('не сохраняет состояние когда история приостановлена', () => {
    const { historyManager, mockCanvas } = createHistoryManagerTestSetup()
    historyManager.suspendHistory()

    historyManager.saveState()

    expect(mockCanvas.toDatalessObject).not.toHaveBeenCalled()
    expect(historyManager.baseState).toBeNull()
    historyManager.resumeHistory()
  })

  it('сбрасывает временные lockMovement флаги у незаблокированных текстов перед сохранением', () => {
    const {
      historyManager,
      mockCanvas,
      setCanvasObjects
    } = createHistoryManagerTestSetup()

    const textbox = {
      id: 'text-1',
      type: 'textbox',
      locked: false,
      lockMovementX: true,
      lockMovementY: true
    }

    const savedTextbox = saveTextboxLockState({
      historyManager,
      mockCanvas,
      setCanvasObjects,
      textbox
    })

    expect(savedTextbox.lockMovementX).toBe(false)
    expect(savedTextbox.lockMovementY).toBe(false)

    expect(textbox.lockMovementX).toBe(true)
    expect(textbox.lockMovementY).toBe(true)
  })

  it('не изменяет lockMovement флаги у действительно заблокированных текстов', () => {
    const {
      historyManager,
      mockCanvas,
      setCanvasObjects
    } = createHistoryManagerTestSetup()

    const textbox = {
      id: 'text-2',
      type: 'textbox',
      locked: true,
      lockMovementX: true,
      lockMovementY: true
    }

    const savedTextbox = saveTextboxLockState({
      historyManager,
      mockCanvas,
      setCanvasObjects,
      textbox
    })

    expect(savedTextbox.lockMovementX).toBe(true)
    expect(savedTextbox.lockMovementY).toBe(true)
  })

  it('не сохраняет временную интерактивность shape-группы во время редактирования текста', () => {
    const {
      historyManager,
      mockCanvas,
      setCanvasObjects
    } = createHistoryManagerTestSetup()
    const text = createSnapshotTextObject({
      id: 'shape-text-1',
      isEditing: true,
      selectable: false,
      evented: false,
      lockMovementX: true,
      lockMovementY: true
    })
    const group = createSnapshotShapeGroup({
      id: 'shape-1',
      childObjects: [text],
      selectable: false,
      evented: true,
      lockMovementX: true,
      lockMovementY: true
    })

    setCanvasObjects([group])

    mockCanvas.toDatalessObject.mockImplementation(() => createSnapshotShapeGroupHistoryState({
      group,
      text
    }))

    historyManager.saveState()

    const [savedGroup] = historyManager.baseState?.objects as Array<Record<string, unknown>>
    const [savedText] = (savedGroup.objects as Array<Record<string, unknown>>)

    expect(savedGroup.selectable).toBe(true)
    expect(savedGroup.lockMovementX).toBe(false)
    expect(savedGroup.lockMovementY).toBe(false)
    expect(savedText.selectable).toBe(false)
    expect(savedText.evented).toBe(false)
    expect(savedText.lockMovementX).toBe(false)
    expect(savedText.lockMovementY).toBe(false)

    expect(group.selectable).toBe(false)
    expect(group.lockMovementX).toBe(true)
    expect(group.lockMovementY).toBe(true)
    expect(text.lockMovementX).toBe(true)
    expect(text.lockMovementY).toBe(true)
  })

  it('удаляет redo-ветку после отката и сохранения нового состояния', async() => {
    const { historyManager, mockCanvas } = createHistoryManagerTestSetup()
    const [state1, state2, state3, state4] = createObjectLeftHistoryStates({
      leftValues: [0, 50, 100, 150]
    })

    mockNanoid
      .mockReturnValueOnce('patch-1')
      .mockReturnValueOnce('patch-2')
      .mockReturnValueOnce('patch-3')

    mockCanvas.toDatalessObject
      .mockReturnValueOnce(state1)
      .mockReturnValueOnce(state2)
      .mockReturnValueOnce(state3)
      .mockReturnValueOnce(state3)
      .mockReturnValueOnce(state4)

    historyManager.saveState() // Базовое состояние
    historyManager.saveState() // patch-1
    historyManager.saveState() // patch-2

    expect(historyManager.patches.map((patch) => patch.id)).toEqual(['patch-1', 'patch-2'])
    expect(historyManager.currentIndex).toBe(2)
    expect(historyManager.totalChangesCount).toBe(2)

    mockCanvas.toDatalessObject.mockReturnValueOnce(state3)
    await historyManager.undo()
    expect(historyManager.currentIndex).toBe(1)
    expect(historyManager.totalChangesCount).toBe(1)

    mockCanvas.fire.mockClear()
    mockCanvas.toDatalessObject.mockReturnValueOnce(state4)
    historyManager.saveState()

    // После saveState patch-2 должен быть удален и заменен на patch-3
    expect(historyManager.patches.map((patch) => patch.id)).toEqual(['patch-1', 'patch-3'])
    expect(historyManager.currentIndex).toBe(2)
    expect(historyManager.totalChangesCount).toBe(2)
    expect(historyManager.hasUnsavedChanges()).toBe(true)
    expect(historyManager.lastPatch?.id).toBe('patch-3')
    expect(mockCanvas.fire).toHaveBeenCalledWith('editor:history-changed', expect.objectContaining({
      action: 'save',
      patchId: 'patch-3',
      currentIndex: 2,
      patchesCount: 2,
      canRedo: false
    }))
  })

  it('сдвигает базовое состояние при превышении лимита истории', () => {
    const { historyManager, mockCanvas } = createHistoryManagerTestSetup({ maxHistoryLength: 2 })
    const [state1, state2, state3, state4] = createObjectLeftHistoryStates({
      leftValues: [0, 10, 20, 30]
    })

    mockNanoid
      .mockReturnValueOnce('patch-1')
      .mockReturnValueOnce('patch-2')
      .mockReturnValueOnce('patch-3')

    mockCanvas.toDatalessObject
      .mockReturnValueOnce(state1)
      .mockReturnValueOnce(state2)
      .mockReturnValueOnce(state3)
      .mockReturnValueOnce(state4)

    historyManager.saveState() // Базовое: state1
    historyManager.saveState() // patch-1: state2
    historyManager.saveState() // patch-2: state3
    historyManager.saveState() // patch-3: state4, сдвиг базового состояния

    expect(historyManager.baseState).toEqual(state2)
    expect(historyManager.patches).toHaveLength(2)
    expect(historyManager.patches.map((p) => p.id)).toEqual(['patch-2', 'patch-3'])
    expect(historyManager.currentIndex).toBe(2)
    expect(historyManager.baseStateChangesCount).toBe(1)
    expect(historyManager.totalChangesCount).toBe(3)
    expect(historyManager.getFullState()).toEqual(state4)
    expect(historyManager.getCurrentChangePosition()).toBe(3)
  })

  it('корректно вычисляет getCurrentChangePosition', () => {
    const { historyManager, mockCanvas } = createHistoryManagerTestSetup()
    const state1 = createHistoryState()
    const [state2] = createObjectLeftHistoryStates({
      leftValues: [10]
    })

    mockCanvas.toDatalessObject
      .mockReturnValueOnce(state1)
      .mockReturnValueOnce(state2)

    expect(historyManager.getCurrentChangePosition()).toBe(0)

    historyManager.saveState()
    expect(historyManager.getCurrentChangePosition()).toBe(0)

    historyManager.saveState()
    expect(historyManager.getCurrentChangePosition()).toBe(1)
  })

  it('корректно работает с пустым состоянием (без объектов)', () => {
    const { historyManager, mockCanvas } = createHistoryManagerTestSetup()
    const emptyState = createHistoryState({ objects: [] })

    mockCanvas.toDatalessObject.mockReturnValueOnce(emptyState)

    historyManager.saveState()

    expect(historyManager.baseState).toEqual(emptyState)
    expect(historyManager.patches).toHaveLength(0)
  })
})
