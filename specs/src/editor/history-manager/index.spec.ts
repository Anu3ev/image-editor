import { nanoid } from 'nanoid'
import type { CanvasFullState } from '../../../../src/editor/history-manager'
import { createHistoryManagerTestSetup } from '../../../test-utils/editor-helpers'

/**
 * Хелпер для создания состояния канваса
 */
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
      expect(historyManager.totalChangesCount).toBe(0)
      expect(historyManager.baseStateChangesCount).toBe(0)

      expect((historyManager as any).diffPatcher).toBeDefined()
    })

    it('управляет пропуском истории через suspend/resume', () => {
      const { historyManager } = createHistoryManagerTestSetup()

      expect(historyManager.skipHistory).toBe(false)

      historyManager.suspendHistory()
      expect(historyManager.skipHistory).toBe(true)

      historyManager.resumeHistory()
      expect(historyManager.skipHistory).toBe(false)

      // повторный вызов resumeHistory не должен сделать счётчик отрицательным
      historyManager.resumeHistory()
      expect(historyManager.skipHistory).toBe(false)
    })

    it('корректно работает с вложенными вызовами suspend/resume', () => {
      const { historyManager } = createHistoryManagerTestSetup()

      // Первый уровень приостановки
      historyManager.suspendHistory()
      expect(historyManager.skipHistory).toBe(true)

      // Второй уровень приостановки
      historyManager.suspendHistory()
      expect(historyManager.skipHistory).toBe(true)

      // Первый resume - история всё ещё приостановлена
      historyManager.resumeHistory()
      expect(historyManager.skipHistory).toBe(true)

      // Второй resume - история возобновлена
      historyManager.resumeHistory()
      expect(historyManager.skipHistory).toBe(false)
    })

    it('возвращает null для lastPatch когда патчей нет', () => {
      const { historyManager } = createHistoryManagerTestSetup()

      expect(historyManager.lastPatch).toBeNull()
    })

    it('возвращает правильный lastPatch после добавления изменений', () => {
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

      expect(historyManager.lastPatch).toEqual(
        expect.objectContaining({ id: 'patch-last' })
      )
    })
  })

  describe('saveState и getFullState', () => {
    it('сохраняет базовое состояние при первом вызове saveState', () => {
      const { historyManager, mockCanvas } = createHistoryManagerTestSetup()
      const baseState = createState({
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

      historyManager.saveState() // Базовое состояние
      historyManager.saveState() // patch-1
      historyManager.saveState() // patch-2

      expect(historyManager.patches.map((patch) => patch.id)).toEqual(['patch-1', 'patch-2'])
      expect(historyManager.currentIndex).toBe(2)
      expect(historyManager.totalChangesCount).toBe(2)

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
      const state1 = createState()
      const state2 = createState({ objects: [{ id: 'object-1', left: 10 }] as any[] })

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
      const emptyState = createState({ objects: [] })

      mockCanvas.toDatalessObject.mockReturnValueOnce(emptyState)

      historyManager.saveState()

      expect(historyManager.baseState).toEqual(emptyState)
      expect(historyManager.patches).toHaveLength(0)
    })
  })

  describe('loadStateFromFullState', () => {
    it('ничего не делает если состояние равно null или undefined', async() => {
      const { historyManager, mockEditor } = createHistoryManagerTestSetup()

      await historyManager.loadStateFromFullState(null as any)
      await historyManager.loadStateFromFullState(undefined as any)

      expect(mockEditor.canvas.loadFromJSON).not.toHaveBeenCalled()
    })

    it('загружает состояние и корректно восстанавливает объекты', async() => {
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
      expect(mockEditor.canvas.renderAll).toHaveBeenCalled()
      expect(mockEditor.canvas.fire).toHaveBeenCalledWith('editor:history-state-loaded', expect.objectContaining({
        fullState: expect.any(Object),
        currentIndex: historyManager.currentIndex,
        totalChangesCount: historyManager.totalChangesCount,
        baseStateChangesCount: historyManager.baseStateChangesCount,
        patchesCount: historyManager.patches.length,
        patches: historyManager.patches
      }))
    })

    it('сериализует и десериализует customData корректно', async() => {
      const { historyManager, mockEditor } = createHistoryManagerTestSetup()
      const state = createState({
        objects: [
          { id: 'montage-area', type: 'rect' },
          { id: 'object-1', customData: { foo: 'bar', nested: { value: 123 } } }
        ] as any[]
      })

      await historyManager.loadStateFromFullState(state)

      const loadedObjects = mockEditor.canvas.getObjects()
      const loadedObject = loadedObjects.find((obj: any) => obj.id === 'object-1')

      expect(loadedObject?.customData).toEqual({
        foo: 'bar',
        nested: { value: 123 }
      })
    })

    it('восстанавливает overlay и скрывает его', async() => {
      const { historyManager, mockEditor } = createHistoryManagerTestSetup()
      const state = createState({
        objects: [
          { id: 'montage-area', type: 'rect' },
          { id: 'overlay-mask', type: 'rect', visible: true }
        ] as any[]
      })

      await historyManager.loadStateFromFullState(state)

      expect(mockEditor.interactionBlocker.overlayMask).toEqual(expect.objectContaining({
        id: 'overlay-mask',
        visible: false
      }))
    })

    it('восстанавливает фоновый объект', async() => {
      const { historyManager, mockEditor } = createHistoryManagerTestSetup()
      const state = createState({
        objects: [
          { id: 'montage-area', type: 'rect' },
          { id: 'background', type: 'rect', backgroundType: 'color' }
        ] as any[]
      })

      await historyManager.loadStateFromFullState(state)

      expect(mockEditor.backgroundManager.removeBackground).not.toHaveBeenCalled()
      expect(mockEditor.backgroundManager.backgroundObject).toEqual(
        expect.objectContaining({ id: 'background' })
      )
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

    it('обновляет canvas если размеры изменились', async() => {
      const { historyManager, mockEditor } = createHistoryManagerTestSetup({
        initialCanvasWidth: 800,
        initialCanvasHeight: 600
      })
      const state = createState({
        width: 1024,
        height: 768,
        objects: [
          { id: 'montage-area', type: 'rect' }
        ] as any[]
      })

      await historyManager.loadStateFromFullState(state)

      expect(mockEditor.canvasManager.updateCanvas).toHaveBeenCalled()
    })

    it('не обновляет canvas если размеры не изменились', async() => {
      const { historyManager, mockEditor } = createHistoryManagerTestSetup({
        initialCanvasWidth: 800,
        initialCanvasHeight: 600
      })
      const state = createState({
        width: 800,
        height: 600,
        objects: [
          { id: 'overlay-mask', type: 'rect' }
        ] as any[]
      })

      // Очищаем вызовы от предыдущих тестов
      jest.clearAllMocks()

      await historyManager.loadStateFromFullState(state)

      // updateCanvas не должен вызываться, т.к. нет montage-area
      expect(mockEditor.canvasManager.updateCanvas).not.toHaveBeenCalled()
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

    it('ничего не делает если currentIndex уже равен 0', async() => {
      const { historyManager, mockCanvas } = createHistoryManagerTestSetup()
      const baseState = createState()

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
      const state1 = createState({ objects: [{ id: 'obj-1', left: 0 }] as any[] })
      const state2 = createState({ objects: [{ id: 'obj-1', left: 10 }] as any[] })
      const state3 = createState({ objects: [{ id: 'obj-1', left: 20 }] as any[] })

      mockCanvas.toDatalessObject
        .mockReturnValueOnce(state1)
        .mockReturnValueOnce(state2)
        .mockReturnValueOnce(state3)

      historyManager.saveState()
      historyManager.saveState()
      historyManager.saveState()

      expect(historyManager.currentIndex).toBe(2)

      await historyManager.undo()
      expect(historyManager.currentIndex).toBe(1)

      await historyManager.undo()
      expect(historyManager.currentIndex).toBe(0)
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
      const state1 = createState({ objects: [{ id: 'obj-1', left: 0 }] as any[] })
      const state2 = createState({ objects: [{ id: 'obj-1', left: 10 }] as any[] })
      const state3 = createState({ objects: [{ id: 'obj-1', left: 20 }] as any[] })

      mockCanvas.toDatalessObject
        .mockReturnValueOnce(state1)
        .mockReturnValueOnce(state2)
        .mockReturnValueOnce(state3)

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
      const state1 = createState()
      const state2 = createState({ objects: [{ id: 'obj-1' }] as any[] })

      mockCanvas.toDatalessObject
        .mockReturnValueOnce(state1)
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
      const baseState = createState()
      const nextState = createState({
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
      const baseState = createState()
      const nextState = createState({ objects: [{ id: 'obj-1' }] as any[] })

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
      const baseState = createState()
      const nextState = createState({ objects: [{ id: 'obj-1' }] as any[] })

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
      const baseState = createState()
      const nextState = createState({ objects: [{ id: 'obj-1' }] as any[] })

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
      const baseState = createState()
      const nextState = createState({ objects: [{ id: 'obj-1' }] as any[] })

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

  describe('интеграционные сценарии', () => {
    it('сложный сценарий: сохранение, откаты, redo и разветвление истории', async() => {
      const { historyManager, mockCanvas } = createHistoryManagerTestSetup()
      const state1 = createState({ objects: [{ id: 'obj-1', left: 0 }] as any[] })
      const state2 = createState({ objects: [{ id: 'obj-1', left: 10 }] as any[] })
      const state3 = createState({ objects: [{ id: 'obj-1', left: 20 }] as any[] })
      const state4 = createState({ objects: [{ id: 'obj-1', left: 30 }] as any[] })
      const state5 = createState({ objects: [{ id: 'obj-1', left: 15 }] as any[] })

      mockNanoid
        .mockReturnValueOnce('p1')
        .mockReturnValueOnce('p2')
        .mockReturnValueOnce('p3')
        .mockReturnValueOnce('p4')

      mockCanvas.toDatalessObject
        .mockReturnValueOnce(state1)
        .mockReturnValueOnce(state2)
        .mockReturnValueOnce(state3)
        .mockReturnValueOnce(state4)

      // Создаём историю
      historyManager.saveState()
      historyManager.saveState()
      historyManager.saveState()
      historyManager.saveState()

      expect(historyManager.patches.map((p) => p.id)).toEqual(['p1', 'p2', 'p3'])
      expect(historyManager.currentIndex).toBe(3)

      // Откатываемся назад
      await historyManager.undo()
      await historyManager.undo()

      expect(historyManager.currentIndex).toBe(1)

      // Делаем redo
      await historyManager.redo()

      expect(historyManager.currentIndex).toBe(2)

      // Откатываемся снова
      await historyManager.undo()

      expect(historyManager.currentIndex).toBe(1)

      // Создаём разветвление - добавляем новое состояние
      mockCanvas.toDatalessObject.mockReturnValueOnce(state5)
      historyManager.saveState()

      // Старая ветка должна быть удалена
      expect(historyManager.patches.map((p) => p.id)).toEqual(['p1', 'p4'])
      expect(historyManager.currentIndex).toBe(2)
    })

    it('работает корректно при циклических undo/redo', async() => {
      const { historyManager, mockCanvas } = createHistoryManagerTestSetup()
      const state1 = createState({ objects: [{ id: 'obj-1', left: 0 }] as any[] })
      const state2 = createState({ objects: [{ id: 'obj-1', left: 10 }] as any[] })

      mockCanvas.toDatalessObject
        .mockReturnValueOnce(state1)
        .mockReturnValueOnce(state2)

      historyManager.saveState()
      historyManager.saveState()

      // Циклическое тестирование
      for (let i = 0; i < 3; i++) {
        await historyManager.undo()
        expect(historyManager.currentIndex).toBe(0)

        await historyManager.redo()
        expect(historyManager.currentIndex).toBe(1)
      }
    })

    it('корректно работает с лимитом истории и последующими операциями', async() => {
      const { historyManager, mockCanvas } = createHistoryManagerTestSetup({ maxHistoryLength: 2 })
      const states = [
        createState({ objects: [{ id: 'obj', left: 0 }] as any[] }),
        createState({ objects: [{ id: 'obj', left: 10 }] as any[] }),
        createState({ objects: [{ id: 'obj', left: 20 }] as any[] }),
        createState({ objects: [{ id: 'obj', left: 30 }] as any[] }),
        createState({ objects: [{ id: 'obj', left: 40 }] as any[] })
      ]

      mockCanvas.toDatalessObject
        .mockReturnValueOnce(states[0])
        .mockReturnValueOnce(states[1])
        .mockReturnValueOnce(states[2])
        .mockReturnValueOnce(states[3])
        .mockReturnValueOnce(states[4])

      historyManager.saveState()
      historyManager.saveState()
      historyManager.saveState()
      historyManager.saveState()
      historyManager.saveState()

      expect(historyManager.patches).toHaveLength(2)
      expect(historyManager.baseStateChangesCount).toBe(2)
      expect(historyManager.currentIndex).toBe(2)
      expect(historyManager.totalChangesCount).toBe(4)

      // Откатываемся
      await historyManager.undo()
      expect(historyManager.currentIndex).toBe(1)
      expect(historyManager.totalChangesCount).toBe(3)

      // Возвращаемся вперёд
      await historyManager.redo()
      expect(historyManager.currentIndex).toBe(2)
      expect(historyManager.totalChangesCount).toBe(4)
    })
  })
})
