import { nanoid } from 'nanoid'
import { createHistoryManagerTestSetup } from '../../../test-utils/history/manager-setup'
import { createHistoryState } from './history-manager.spec-utils'

jest.mock('nanoid')

describe('интеграционные сценарии', () => {
  const mockNanoid = nanoid as jest.MockedFunction<typeof nanoid>

  beforeEach(() => {
    jest.clearAllMocks()
    mockNanoid.mockImplementation(() => 'patch-id')
  })

  it('сложный сценарий: сохранение, откаты, redo и разветвление истории', async() => {
    const { historyManager, mockCanvas } = createHistoryManagerTestSetup()
    const state1 = createHistoryState({ objects: [{ id: 'obj-1', left: 0 }] as any[] })
    const state2 = createHistoryState({ objects: [{ id: 'obj-1', left: 10 }] as any[] })
    const state3 = createHistoryState({ objects: [{ id: 'obj-1', left: 20 }] as any[] })
    const state4 = createHistoryState({ objects: [{ id: 'obj-1', left: 30 }] as any[] })
    const state5 = createHistoryState({ objects: [{ id: 'obj-1', left: 15 }] as any[] })

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
      .mockReturnValueOnce(state4)
      .mockReturnValueOnce(state3)
      .mockReturnValueOnce(state3)

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
    const state1 = createHistoryState({ objects: [{ id: 'obj-1', left: 0 }] as any[] })
    const state2 = createHistoryState({ objects: [{ id: 'obj-1', left: 10 }] as any[] })

    mockCanvas.toDatalessObject
      .mockReturnValueOnce(state1)
      .mockReturnValueOnce(state2)
      .mockReturnValueOnce(state2)
      .mockReturnValueOnce(state2)
      .mockReturnValueOnce(state2)
      .mockReturnValueOnce(state1)
      .mockReturnValueOnce(state2)
      .mockReturnValueOnce(state1)

    historyManager.saveState()
    historyManager.saveState()

    // Циклическое тестирование
    for (let i = 0; i < 3; i += 1) {
      await historyManager.undo()
      expect(historyManager.currentIndex).toBe(0)

      await historyManager.redo()
      expect(historyManager.currentIndex).toBe(1)
    }
  })

  it('корректно работает с лимитом истории и последующими операциями', async() => {
    const { historyManager, mockCanvas } = createHistoryManagerTestSetup({ maxHistoryLength: 2 })
    const states = [
      createHistoryState({ objects: [{ id: 'obj', left: 0 }] as any[] }),
      createHistoryState({ objects: [{ id: 'obj', left: 10 }] as any[] }),
      createHistoryState({ objects: [{ id: 'obj', left: 20 }] as any[] }),
      createHistoryState({ objects: [{ id: 'obj', left: 30 }] as any[] }),
      createHistoryState({ objects: [{ id: 'obj', left: 40 }] as any[] })
    ]

    mockCanvas.toDatalessObject
      .mockReturnValueOnce(states[0])
      .mockReturnValueOnce(states[1])
      .mockReturnValueOnce(states[2])
      .mockReturnValueOnce(states[3])
      .mockReturnValueOnce(states[4])
      .mockReturnValueOnce(states[4])
      .mockReturnValueOnce(states[3])

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
