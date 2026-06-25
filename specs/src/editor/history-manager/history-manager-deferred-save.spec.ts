import { nanoid } from 'nanoid'
import { createHistoryManagerTestSetup } from '../../../test-utils/history/manager-setup'
import { createHistoryState } from '../../../test-utils/history/state-fixtures'

jest.mock('nanoid')

type DeferredSaveTestSetup = ReturnType<typeof createHistoryManagerTestSetup>

/**
 * Параметры подготовки saveState, отложенного из-за заблокированного UI.
 */
type StageDeferredSaveParams = {
  setup: DeferredSaveTestSetup
  nextLeft: number
  blockedSaveAttempts?: number
}

/**
 * Готовит baseState и ставит следующий saveState в deferred queue через публичный path.
 */
const stageDeferredSave = ({
  setup,
  nextLeft,
  blockedSaveAttempts = 1
}: StageDeferredSaveParams): void => {
  const { historyManager, mockCanvas, mockEditor } = setup
  const baseState = createHistoryState({ objects: [{ id: 'object-1', left: 0 }] })
  const nextState = createHistoryState({ objects: [{ id: 'object-1', left: nextLeft }] })

  mockCanvas.toDatalessObject
    .mockReturnValueOnce(baseState)
    .mockReturnValueOnce(nextState)

  mockEditor.interactionBlocker.isBlocked = false
  historyManager.saveState()

  mockEditor.interactionBlocker.isBlocked = true
  for (let index = 0; index < blockedSaveAttempts; index += 1) {
    historyManager.saveState()
  }
}

/**
 * Проверяет, что deferred save сохранил ровно один history step.
 */
const expectSingleHistoryStepSaved = ({
  historyManager,
  mockCanvas
}: DeferredSaveTestSetup): void => {
  expect(historyManager.patches).toHaveLength(1)
  expect(historyManager.currentIndex).toBe(1)
  expect(historyManager.totalChangesCount).toBe(1)
  expect(mockCanvas.toDatalessObject).toHaveBeenCalledTimes(2)
}

describe('deferred save при блокировке UI', () => {
  const mockNanoid = nanoid as jest.MockedFunction<typeof nanoid>

  beforeEach(() => {
    jest.clearAllMocks()
    mockNanoid.mockImplementation(() => 'patch-id')
  })

  it('не сохраняет состояние во время блокировки UI и сохраняет после flush', () => {
    const setup = createHistoryManagerTestSetup()
    const { historyManager, mockCanvas, mockEditor } = setup

    stageDeferredSave({
      setup,
      nextLeft: 20
    })

    expect(historyManager.patches).toHaveLength(0)
    expect(historyManager.currentIndex).toBe(0)
    expect(historyManager.totalChangesCount).toBe(0)
    expect(mockCanvas.toDatalessObject).toHaveBeenCalledTimes(1)

    mockEditor.interactionBlocker.isBlocked = false
    const isFlushed = historyManager.flushDeferredSaveAfterUnblock()

    expect(isFlushed).toBe(true)
    expectSingleHistoryStepSaved(setup)
  })

  it('схлопывает множественные saveState во время блокировки в один flush', () => {
    const setup = createHistoryManagerTestSetup()
    const { historyManager, mockCanvas, mockEditor } = setup

    stageDeferredSave({
      setup,
      nextLeft: 30,
      blockedSaveAttempts: 3
    })

    expect(historyManager.patches).toHaveLength(0)
    expect(mockCanvas.toDatalessObject).toHaveBeenCalledTimes(1)

    mockEditor.interactionBlocker.isBlocked = false

    const firstFlush = historyManager.flushDeferredSaveAfterUnblock()
    const secondFlush = historyManager.flushDeferredSaveAfterUnblock()

    expect(firstFlush).toBe(true)
    expect(secondFlush).toBe(false)
    expectSingleHistoryStepSaved(setup)
  })

  it('не сбрасывает отложенное сохранение если flush вызван при suspendHistory', () => {
    const setup = createHistoryManagerTestSetup()
    const { historyManager, mockEditor } = setup

    stageDeferredSave({
      setup,
      nextLeft: 15
    })

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
