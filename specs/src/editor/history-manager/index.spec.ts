import { nanoid } from 'nanoid'
import type { CanvasFullState } from '../../../../src/editor/history-manager'
import { createHistoryManagerTestSetup } from '../../../test-utils/editor-helpers'

const createState = (overrides: Partial<CanvasFullState> = {}): CanvasFullState => ({
  clipPath: null,
  width: 800,
  height: 600,
  version: '5.0.0',
  objects: [],
  ...overrides
})

describe('HistoryManager', () => {
  const mockNanoid = nanoid as jest.MockedFunction<typeof nanoid>
  let consoleSpies: jest.SpyInstance[]

  beforeAll(() => {
    consoleSpies = [
      jest.spyOn(console, 'log').mockImplementation(() => undefined),
      jest.spyOn(console, 'warn').mockImplementation(() => undefined),
      jest.spyOn(console, 'time').mockImplementation(() => undefined),
      jest.spyOn(console, 'timeEnd').mockImplementation(() => undefined)
    ]
  })

  afterAll(() => {
    consoleSpies.forEach((spy) => spy.mockRestore())
  })

  beforeEach(() => {
    jest.clearAllMocks()
    mockNanoid.mockImplementation(() => 'patch-id')
  })

  describe('constructor и базовые аксессоры', () => {
    it('инициализирует менеджер с корректными значениями', () => {
      const { historyManager, mockEditor } = createHistoryManagerTestSetup({ maxHistoryLength: 10 })

      expect(historyManager.editor).toBe(mockEditor)
      expect(historyManager.canvas).toBe(mockEditor.canvas)
      expect(historyManager.baseState).toBeNull()
      expect(historyManager.patches).toHaveLength(0)
      expect(historyManager.currentIndex).toBe(0)
      expect(historyManager.maxHistoryLength).toBe(10)
      expect(historyManager.hasUnsavedChanges()).toBe(false)
      expect(historyManager.getCurrentChangePosition()).toBe(0)

      expect((historyManager as any).diffPatcher).toBeDefined()
    })

    it('управляет пропуском истории через suspend/resume', () => {
      const { historyManager } = createHistoryManagerTestSetup()

      expect(historyManager.skipHistory).toBe(false)
      historyManager.suspendHistory()
      expect(historyManager.skipHistory).toBe(true)
      historyManager.resumeHistory()
      expect(historyManager.skipHistory).toBe(false)
      historyManager.resumeHistory() // повторный вызов не должен сделать счётчик отрицательным
      expect(historyManager.skipHistory).toBe(false)
    })
  })

  describe('saveState и getFullState', () => {
    it('сохраняет базовое состояние и добавляет диффы', () => {
      const { historyManager, mockCanvas } = createHistoryManagerTestSetup()
      const baseState = createState({
        objects: [
          { id: 'montage-area', type: 'rect' },
          { id: 'object-1', left: 0, top: 0 }
        ] as any[]
      })
      const updatedState = createState({
        objects: [
          { id: 'montage-area', type: 'rect' },
          { id: 'object-1', left: 25, top: 0 }
        ] as any[]
      })

      mockCanvas.toDatalessObject
        .mockReturnValueOnce(baseState)
        .mockReturnValueOnce(updatedState)

      historyManager.saveState()

      expect(historyManager.baseState).toEqual(baseState)
      expect(historyManager.patches).toHaveLength(0)
      expect(historyManager.totalChangesCount).toBe(0)

      historyManager.saveState()

      expect(historyManager.patches).toHaveLength(1)
      expect(historyManager.currentIndex).toBe(1)
      expect(historyManager.totalChangesCount).toBe(1)
      expect(historyManager.getFullState()).toEqual(updatedState)
      expect(mockNanoid).toHaveBeenCalledTimes(1)
    })

    it('не добавляет дифф если состояние не изменилось', () => {
      const { historyManager, mockCanvas } = createHistoryManagerTestSetup()
      const baseState = createState({
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

    it('не сохраняет состояние когда история приостановлена', () => {
      const { historyManager, mockCanvas } = createHistoryManagerTestSetup()
      historyManager.suspendHistory()

      historyManager.saveState()

      expect(mockCanvas.toDatalessObject).not.toHaveBeenCalled()
      expect(historyManager.baseState).toBeNull()
      historyManager.resumeHistory()
    })

    it('удаляет redo-ветку после отката и сохранения нового состояния', async() => {
      const { historyManager, mockCanvas } = createHistoryManagerTestSetup()
      const state1 = createState({
        objects: [{ id: 'object-1', left: 0 }] as any[]
      })
      const state2 = createState({
        objects: [{ id: 'object-1', left: 50 }] as any[]
      })
      const state3 = createState({
        objects: [{ id: 'object-1', left: 100 }] as any[]
      })
      const state4 = createState({
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

      historyManager.saveState()
      historyManager.saveState()
      historyManager.saveState()

      expect(historyManager.patches.map((patch) => patch.id)).toEqual(['patch-1', 'patch-2'])
      expect(historyManager.currentIndex).toBe(2)

      await historyManager.undo()
      expect(historyManager.currentIndex).toBe(1)

      mockCanvas.toDatalessObject.mockReturnValueOnce(state4)
      historyManager.saveState()

      expect(historyManager.patches.map((patch) => patch.id)).toEqual(['patch-1', 'patch-3'])
      expect(historyManager.currentIndex).toBe(2)
      expect(historyManager.totalChangesCount).toBe(2)
      expect(historyManager.hasUnsavedChanges()).toBe(true)
      expect(historyManager.lastPatch?.id).toBe('patch-3')
    })

    it('сдвигает базовое состояние при превышении лимита истории', () => {
      const { historyManager, mockCanvas } = createHistoryManagerTestSetup({ maxHistoryLength: 2 })
      const state1 = createState({ objects: [{ id: 'object-1', left: 0 }] as any[] })
      const state2 = createState({ objects: [{ id: 'object-1', left: 10 }] as any[] })
      const state3 = createState({ objects: [{ id: 'object-1', left: 20 }] as any[] })
      const state4 = createState({ objects: [{ id: 'object-1', left: 30 }] as any[] })

      mockNanoid
        .mockReturnValueOnce('patch-1')
        .mockReturnValueOnce('patch-2')
        .mockReturnValueOnce('patch-3')

      mockCanvas.toDatalessObject
        .mockReturnValueOnce(state1)
        .mockReturnValueOnce(state2)
        .mockReturnValueOnce(state3)
        .mockReturnValueOnce(state4)

      historyManager.saveState()
      historyManager.saveState()
      historyManager.saveState()
      historyManager.saveState()

      expect(historyManager.baseState).toEqual(state2)
      expect(historyManager.patches).toHaveLength(2)
      expect(historyManager.baseStateChangesCount).toBe(1)
      expect(historyManager.getFullState()).toEqual(state4)
      expect(historyManager.getCurrentChangePosition()).toBe(3)
    })

    it('lastPatch возвращает последний дифф', () => {
      const { historyManager, mockCanvas } = createHistoryManagerTestSetup()
      const baseState = createState()
      const nextState = createState({
        objects: [{ id: 'object-1', left: 10 }] as any[]
      })

      mockNanoid.mockReturnValueOnce('patch-last')
      mockCanvas.toDatalessObject
        .mockReturnValueOnce(baseState)
        .mockReturnValueOnce(nextState)

      historyManager.saveState()
      historyManager.saveState()

      expect(historyManager.lastPatch).toEqual(expect.objectContaining({ id: 'patch-last' }))
    })
  })

  describe('loadStateFromFullState', () => {
    it('сериализует customData, обновляет overlay и фон', async() => {
      const { historyManager, mockEditor } = createHistoryManagerTestSetup()
      const state = createState({
        width: 1024,
        height: 768,
        objects: [
          { id: 'montage-area', type: 'rect' },
          { id: 'overlay-mask', type: 'rect', visible: true },
          { id: 'object-1', customData: { foo: 'bar' } },
          { id: 'background', type: 'rect', backgroundType: 'color' }
        ] as any[]
      })

      await historyManager.loadStateFromFullState(state)

      expect(mockEditor.canvas.loadFromJSON).toHaveBeenCalled()
      expect(mockEditor.canvasManager.updateCanvas).toHaveBeenCalled()
      expect(mockEditor.interactionBlocker.overlayMask).toEqual(expect.objectContaining({
        id: 'overlay-mask',
        visible: false
      }))
      expect(mockEditor.backgroundManager.removeBackground).not.toHaveBeenCalled()
      expect(mockEditor.backgroundManager.backgroundObject).toEqual(expect.objectContaining({ id: 'background' }))

      const loadedObjects = mockEditor.canvas.getObjects()
      const loadedObject = loadedObjects.find((obj: any) => obj.id === 'object-1')
      expect(loadedObject?.customData).toEqual({ foo: 'bar' })
      expect(mockEditor.canvas.fire).toHaveBeenCalledWith('editor:history-state-loaded', expect.objectContaining({
        fullState: expect.any(Object),
        currentIndex: historyManager.currentIndex
      }))
    })

    it('удаляет фон если объект отсутствует в состоянии', async() => {
      const { historyManager, mockEditor } = createHistoryManagerTestSetup()
      const state = createState({
        objects: [
          { id: 'montage-area', type: 'rect' }
        ] as any[]
      })

      await historyManager.loadStateFromFullState(state)

      expect(mockEditor.backgroundManager.removeBackground).toHaveBeenCalledWith({ withoutSave: true })
    })
  })

  describe('undo/redo', () => {
    it('ничего не делает если undo вызывается без истории', async() => {
      const { historyManager, mockEditor } = createHistoryManagerTestSetup()
      const loadSpy = jest.spyOn(historyManager, 'loadStateFromFullState')

      await historyManager.undo()

      expect(loadSpy).not.toHaveBeenCalled()
      expect(mockEditor.canvas.fire).not.toHaveBeenCalledWith('editor:undo', expect.anything())
      loadSpy.mockRestore()
    })

    it('возвращает предыдущее состояние и генерирует события', async() => {
      const { historyManager, mockCanvas } = createHistoryManagerTestSetup()
      const baseState = createState({
        objects: [
          { id: 'montage-area', type: 'rect' },
          { id: 'background', type: 'rect', backgroundType: 'color' }
        ] as any[]
      })
      const nextState = createState({
        objects: [
          { id: 'montage-area', type: 'rect' },
          { id: 'background', type: 'rect', backgroundType: 'color' },
          { id: 'object-1', left: 10 }
        ] as any[]
      })

      mockCanvas.toDatalessObject
        .mockReturnValueOnce(baseState)
        .mockReturnValueOnce(nextState)

      historyManager.saveState()
      historyManager.saveState()

      await historyManager.undo()

      expect(historyManager.currentIndex).toBe(0)
      expect(historyManager.totalChangesCount).toBe(0)
      expect(mockCanvas.fire).toHaveBeenCalledWith('editor:undo', expect.objectContaining({
        currentIndex: 0
      }))
      expect(mockCanvas.fire).toHaveBeenCalledWith('editor:history-state-loaded', expect.objectContaining({
        fullState: expect.any(Object)
      }))
    })

    it('повторяет действие и генерирует событие redo', async() => {
      const { historyManager, mockCanvas } = createHistoryManagerTestSetup()
      const baseState = createState({
        objects: [
          { id: 'montage-area', type: 'rect' }
        ] as any[]
      })
      const nextState = createState({
        objects: [
          { id: 'montage-area', type: 'rect' },
          { id: 'object-1', left: 10 }
        ] as any[]
      })

      mockCanvas.toDatalessObject
        .mockReturnValueOnce(baseState)
        .mockReturnValueOnce(nextState)

      historyManager.saveState()
      historyManager.saveState()

      await historyManager.undo()
      await historyManager.redo()

      expect(historyManager.currentIndex).toBe(1)
      expect(historyManager.totalChangesCount).toBe(1)
      expect(mockCanvas.fire).toHaveBeenCalledWith('editor:redo', expect.objectContaining({
        currentIndex: 1
      }))
    })

    it('ничего не делает если redo вызывается без доступных состояний', async() => {
      const { historyManager, mockEditor } = createHistoryManagerTestSetup()
      const loadSpy = jest.spyOn(historyManager, 'loadStateFromFullState')

      await historyManager.redo()

      expect(loadSpy).not.toHaveBeenCalled()
      expect(mockEditor.canvas.fire).not.toHaveBeenCalledWith('editor:redo', expect.anything())
      loadSpy.mockRestore()
    })

    it('пропускает undo/redo когда история приостановлена', async() => {
      const { historyManager, mockCanvas } = createHistoryManagerTestSetup()
      const baseState = createState()
      const nextState = createState({
        objects: [{ id: 'object-1', left: 5 }] as any[]
      })

      mockCanvas.toDatalessObject
        .mockReturnValueOnce(baseState)
        .mockReturnValueOnce(nextState)

      historyManager.saveState()
      historyManager.saveState()

      const loadSpy = jest.spyOn(historyManager, 'loadStateFromFullState')
      historyManager.suspendHistory()

      await historyManager.undo()
      await historyManager.redo()

      expect(loadSpy).not.toHaveBeenCalled()
      expect(mockCanvas.fire).not.toHaveBeenCalledWith('editor:undo', expect.anything())
      expect(mockCanvas.fire).not.toHaveBeenCalledWith('editor:redo', expect.anything())

      historyManager.resumeHistory()
      loadSpy.mockRestore()
    })
  })
})
