import { nanoid } from 'nanoid'
import { createHistoryManagerTestSetup } from '../../../test-utils/editor-helpers'
import { createHistoryState } from './history-manager.spec-utils'

jest.mock('nanoid')

describe('deferred save при блокировке UI', () => {
  const mockNanoid = nanoid as jest.MockedFunction<typeof nanoid>

  beforeEach(() => {
    jest.clearAllMocks()
    mockNanoid.mockImplementation(() => 'patch-id')
  })

  it('не сохраняет состояние во время блокировки UI и сохраняет после flush', () => {
    const { historyManager, mockCanvas, mockEditor } = createHistoryManagerTestSetup()
    const baseState = createHistoryState({ objects: [{ id: 'object-1', left: 0 }] as any[] })
    const nextState = createHistoryState({ objects: [{ id: 'object-1', left: 20 }] as any[] })

    mockCanvas.toDatalessObject
      .mockReturnValueOnce(baseState)
      .mockReturnValueOnce(nextState)

    mockEditor.interactionBlocker.isBlocked = false
    historyManager.saveState()

    mockEditor.interactionBlocker.isBlocked = true
    historyManager.saveState()

    expect(historyManager.patches).toHaveLength(0)
    expect(historyManager.currentIndex).toBe(0)
    expect(historyManager.totalChangesCount).toBe(0)
    expect(mockCanvas.toDatalessObject).toHaveBeenCalledTimes(1)

    mockEditor.interactionBlocker.isBlocked = false
    const isFlushed = historyManager.flushDeferredSaveAfterUnblock()

    expect(isFlushed).toBe(true)
    expect(historyManager.patches).toHaveLength(1)
    expect(historyManager.currentIndex).toBe(1)
    expect(historyManager.totalChangesCount).toBe(1)
    expect(mockCanvas.toDatalessObject).toHaveBeenCalledTimes(2)
  })

  it('схлопывает множественные saveState во время блокировки в один flush', () => {
    const { historyManager, mockCanvas, mockEditor } = createHistoryManagerTestSetup()
    const baseState = createHistoryState({ objects: [{ id: 'object-1', left: 0 }] as any[] })
    const nextState = createHistoryState({ objects: [{ id: 'object-1', left: 30 }] as any[] })

    mockCanvas.toDatalessObject
      .mockReturnValueOnce(baseState)
      .mockReturnValueOnce(nextState)

    mockEditor.interactionBlocker.isBlocked = false
    historyManager.saveState()

    mockEditor.interactionBlocker.isBlocked = true
    historyManager.saveState()
    historyManager.saveState()
    historyManager.saveState()

    expect(historyManager.patches).toHaveLength(0)
    expect(mockCanvas.toDatalessObject).toHaveBeenCalledTimes(1)

    mockEditor.interactionBlocker.isBlocked = false

    const firstFlush = historyManager.flushDeferredSaveAfterUnblock()
    const secondFlush = historyManager.flushDeferredSaveAfterUnblock()

    expect(firstFlush).toBe(true)
    expect(secondFlush).toBe(false)
    expect(historyManager.patches).toHaveLength(1)
    expect(historyManager.currentIndex).toBe(1)
    expect(historyManager.totalChangesCount).toBe(1)
    expect(mockCanvas.toDatalessObject).toHaveBeenCalledTimes(2)
  })

  it('не сбрасывает отложенное сохранение если flush вызван при suspendHistory', () => {
    const { historyManager, mockCanvas, mockEditor } = createHistoryManagerTestSetup()
    const baseState = createHistoryState({ objects: [{ id: 'object-1', left: 0 }] as any[] })
    const nextState = createHistoryState({ objects: [{ id: 'object-1', left: 15 }] as any[] })

    mockCanvas.toDatalessObject
      .mockReturnValueOnce(baseState)
      .mockReturnValueOnce(nextState)

    mockEditor.interactionBlocker.isBlocked = false
    historyManager.saveState()

    mockEditor.interactionBlocker.isBlocked = true
    historyManager.saveState()

    mockEditor.interactionBlocker.isBlocked = false
    historyManager.suspendHistory()

    const suspendedFlush = historyManager.flushDeferredSaveAfterUnblock()

    historyManager.resumeHistory()
    const resumedFlush = historyManager.flushDeferredSaveAfterUnblock()

    expect(suspendedFlush).toBe(false)
    expect(resumedFlush).toBe(true)
    expect(historyManager.patches).toHaveLength(1)
    expect(historyManager.currentIndex).toBe(1)
    expect(historyManager.totalChangesCount).toBe(1)
  })
})
