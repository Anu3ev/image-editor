import { nanoid } from 'nanoid'
import { createHistoryManagerTestSetup } from '../../../test-utils/editor-helpers'
import { createHistoryState } from './history-manager.spec-utils'

jest.mock('nanoid')

describe('constructor и базовые аксессоры', () => {
  const mockNanoid = nanoid as jest.MockedFunction<typeof nanoid>

  beforeEach(() => {
    jest.clearAllMocks()
    mockNanoid.mockImplementation(() => 'patch-id')
  })

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
    const baseState = createHistoryState()
    const nextState = createHistoryState({
      objects: [{ id: 'object-1', left: 10 }] as any[]
    })

    mockNanoid.mockReturnValueOnce('patch-last')
    mockCanvas.toDatalessObject
      .mockReturnValueOnce(baseState)
      .mockReturnValueOnce(nextState)
      .mockReturnValueOnce(nextState)
      .mockReturnValueOnce(baseState)
      .mockReturnValueOnce(nextState)

    historyManager.saveState()
    historyManager.saveState()

    expect(historyManager.lastPatch).toEqual(
      expect.objectContaining({ id: 'patch-last' })
    )
  })
})
