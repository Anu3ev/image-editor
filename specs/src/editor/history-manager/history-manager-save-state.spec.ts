import { nanoid } from 'nanoid'
import { prepareStatesForDiff } from '../../../../src/editor/history-manager/diff-normalization'
import { createHistoryManagerTestSetup } from '../../../test-utils/history/manager-setup'
import {
  createSnapshotShapeGroup,
  createSnapshotTextObject,
  serializeSnapshotShapeGroupState
} from '../../../test-utils/history/snapshot-fixtures'
import { createHistoryState } from './history-manager.spec-utils'

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

    expect(historyManager.patches).toHaveLength(0)
    expect(historyManager.currentIndex).toBe(0)
    expect(historyManager.totalChangesCount).toBe(0)
    expect(historyManager.hasUnsavedChanges()).toBe(false)
  })

  it('игнорирует изменения размеров канваса без изменения монтажной области', () => {
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
      id: 'montage-area',
      type: 'rect',
      width: 400,
      height: 300,
      left: 100,
      top: 50
    }
    const baseState = createHistoryState({
      width: 800,
      height: 600,
      objects: [baseMontageArea] as any[]
    })
    const nextState = createHistoryState({
      width: 900,
      height: 700,
      objects: [nextMontageArea] as any[]
    })
    const { toDatalessObject } = mockCanvas

    toDatalessObject
      .mockReturnValueOnce(baseState)
      .mockReturnValueOnce(nextState)

    historyManager.saveState()
    historyManager.saveState()

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
      id: 'montage-area',
      type: 'rect',
      width: 450,
      height: 300,
      left: 100,
      top: 50
    }
    const baseState = createHistoryState({
      width: 800,
      height: 600,
      objects: [baseMontageArea] as any[]
    })
    const nextState = createHistoryState({
      width: 900,
      height: 700,
      objects: [nextMontageArea] as any[]
    })
    const { toDatalessObject } = mockCanvas

    toDatalessObject
      .mockReturnValueOnce(baseState)
      .mockReturnValueOnce(nextState)

    historyManager.saveState()
    historyManager.saveState()

    const { patches, totalChangesCount } = historyManager

    expect(patches).toHaveLength(1)
    expect(totalChangesCount).toBe(1)
  })

  it('сохраняет scene translation как реальное изменение состояния', () => {
    const { historyManager, mockCanvas } = createHistoryManagerTestSetup()
    const baseState = createHistoryState({
      clipPath: {
        left: 100,
        top: 50
      },
      objects: [
        {
          id: 'montage-area',
          type: 'rect',
          width: 400,
          height: 300,
          left: 100,
          top: 50
        },
        {
          id: 'object-1',
          left: 200,
          top: 100
        }
      ] as any[]
    })
    const nextState = createHistoryState({
      clipPath: {
        left: 120,
        top: 70
      },
      objects: [
        {
          id: 'montage-area',
          type: 'rect',
          width: 400,
          height: 300,
          left: 120,
          top: 70
        },
        {
          id: 'object-1',
          left: 220,
          top: 120
        }
      ] as any[]
    })
    const { toDatalessObject } = mockCanvas

    toDatalessObject
      .mockReturnValueOnce(baseState)
      .mockReturnValueOnce(nextState)

    historyManager.saveState()
    historyManager.saveState()

    const { patches } = historyManager

    expect(patches).toHaveLength(1)
  })

  it('сохраняет дифф если при смещении есть реальные изменения объекта', () => {
    const { historyManager, mockCanvas } = createHistoryManagerTestSetup()
    const baseState = createHistoryState({
      clipPath: {
        left: 100,
        top: 50
      },
      objects: [
        {
          id: 'montage-area',
          type: 'rect',
          width: 400,
          height: 300,
          left: 100,
          top: 50
        },
        {
          id: 'object-1',
          left: 200,
          top: 100
        }
      ] as any[]
    })
    const nextState = createHistoryState({
      clipPath: {
        left: 120,
        top: 70
      },
      objects: [
        {
          id: 'montage-area',
          type: 'rect',
          width: 400,
          height: 300,
          left: 120,
          top: 70
        },
        {
          id: 'object-1',
          left: 230,
          top: 125
        }
      ] as any[]
    })
    const { toDatalessObject } = mockCanvas

    toDatalessObject
      .mockReturnValueOnce(baseState)
      .mockReturnValueOnce(nextState)

    historyManager.saveState()
    historyManager.saveState()

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
    const { toDatalessObject } = mockCanvas

    toDatalessObject
      .mockReturnValueOnce(baseState)
      .mockReturnValueOnce(nextState)

    historyManager.saveState()
    historyManager.saveState()

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
    const { toDatalessObject } = mockCanvas

    toDatalessObject
      .mockReturnValueOnce(baseState)
      .mockReturnValueOnce(nextState)

    historyManager.saveState()
    historyManager.saveState()

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

    setCanvasObjects([textbox])

    mockCanvas.toDatalessObject.mockImplementation(() => createHistoryState({
      objects: [{
        id: 'text-1',
        type: 'textbox',
        lockMovementX: textbox.lockMovementX,
        lockMovementY: textbox.lockMovementY
      }] as any[]
    }))

    historyManager.saveState()

    const savedTextbox = historyManager.baseState?.objects?.[0] as any
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

    setCanvasObjects([textbox])

    mockCanvas.toDatalessObject.mockImplementation(() => createHistoryState({
      objects: [{
        id: 'text-2',
        type: 'textbox',
        lockMovementX: textbox.lockMovementX,
        lockMovementY: textbox.lockMovementY
      }] as any[]
    }))

    historyManager.saveState()

    const savedTextbox = historyManager.baseState?.objects?.[0] as any
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

    mockCanvas.toDatalessObject.mockImplementation(() => createHistoryState({
      objects: [serializeSnapshotShapeGroupState({
        group,
        text
      })] as any[]
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
    const state1 = createHistoryState({
      objects: [{ id: 'object-1', left: 0 }] as any[]
    })
    const state2 = createHistoryState({
      objects: [{ id: 'object-1', left: 50 }] as any[]
    })
    const state3 = createHistoryState({
      objects: [{ id: 'object-1', left: 100 }] as any[]
    })
    const state4 = createHistoryState({
      objects: [{ id: 'object-1', left: 150 }] as any[]
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

    mockCanvas.toDatalessObject.mockReturnValueOnce(state4)
    historyManager.saveState()

    // После saveState patch-2 должен быть удален и заменен на patch-3
    expect(historyManager.patches.map((patch) => patch.id)).toEqual(['patch-1', 'patch-3'])
    expect(historyManager.currentIndex).toBe(2)
    expect(historyManager.totalChangesCount).toBe(2)
    expect(historyManager.hasUnsavedChanges()).toBe(true)
    expect(historyManager.lastPatch?.id).toBe('patch-3')
  })

  it('сдвигает базовое состояние при превышении лимита истории', () => {
    const { historyManager, mockCanvas } = createHistoryManagerTestSetup({ maxHistoryLength: 2 })
    const state1 = createHistoryState({ objects: [{ id: 'object-1', left: 0 }] as any[] })
    const state2 = createHistoryState({ objects: [{ id: 'object-1', left: 10 }] as any[] })
    const state3 = createHistoryState({ objects: [{ id: 'object-1', left: 20 }] as any[] })
    const state4 = createHistoryState({ objects: [{ id: 'object-1', left: 30 }] as any[] })

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
    const state2 = createHistoryState({ objects: [{ id: 'object-1', left: 10 }] as any[] })

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
