import type { Canvas } from 'fabric'
import { ImageEditor } from '../../../../src/editor'
import { createHistoryManagerTestSetup } from '../../../test-utils/history/manager-setup'
import { createHistoryState } from '../../../test-utils/history/state-fixtures'

describe('HistoryManager: уничтожение', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  it('отменяет отложенное сохранение до уничтожения canvas редактора', () => {
    const { historyManager, mockEditor, mockCanvas } = createHistoryManagerTestSetup()
    const save = jest.spyOn(historyManager, 'saveState')
    const editor = Object.assign(Object.create(ImageEditor.prototype) as ImageEditor, mockEditor, {
      historyManager,
      errorManager: undefined,
      shapeManager: undefined,
      textManager: undefined
    })
    mockCanvas.dispose = jest.fn(() => {
      jest.runOnlyPendingTimers()
      expect(save).not.toHaveBeenCalled()
    })
    historyManager.scheduleSaveState({ delayMs: 300, reason: 'text-edit' })

    editor.destroy()
    editor.destroy()
    jest.runAllTimers()

    expect(save).not.toHaveBeenCalled()
    expect(mockCanvas.toDatalessObject).not.toHaveBeenCalled()
    expect(mockCanvas.fire).not.toHaveBeenCalled()
    expect(mockCanvas.dispose).toHaveBeenCalledTimes(1)
    expect(jest.getTimerCount()).toBe(0)
  })

  it('сбрасывает отложенные снимки и не сохраняет историю после уничтожения', () => {
    const { historyManager, mockEditor, mockCanvas } = createHistoryManagerTestSetup()
    historyManager.beginAction({ reason: 'text-edit' })
    historyManager.stageCurrentStateForPendingSave({ reason: 'text-edit' })
    mockEditor.interactionBlocker.isBlocked = true
    historyManager.saveState()
    historyManager.scheduleSaveState({ delayMs: 300, reason: 'text-edit' })
    mockCanvas.toDatalessObject.mockClear()
    mockCanvas.fire.mockClear()

    historyManager.destroy()
    historyManager.destroy()
    mockEditor.interactionBlocker.isBlocked = false
    historyManager.scheduleSaveState({ delayMs: 300, reason: 'late-event' })
    historyManager.saveState()
    historyManager.beginAction({ reason: 'late-event' })
    historyManager.stageCurrentStateForPendingSave({ reason: 'late-event' })
    jest.runAllTimers()

    expect(historyManager.flushPendingSave()).toBe(false)
    expect(historyManager.flushDeferredSaveAfterUnblock()).toBe(false)
    expect(historyManager.skipHistory).toBe(true)
    expect(mockCanvas.toDatalessObject).not.toHaveBeenCalled()
    expect(mockCanvas.fire).not.toHaveBeenCalled()
    expect(jest.getTimerCount()).toBe(0)
  })

  it('отменяет загрузку состояния и не восстанавливает геометрию после уничтожения', async() => {
    const { historyManager, mockEditor, mockCanvas } = createHistoryManagerTestSetup()
    let signal: AbortSignal | undefined
    let finishLoading!: () => void
    mockCanvas.loadFromJSON.mockImplementation((...args: Parameters<Canvas['loadFromJSON']>) => {
      signal = args[2]?.signal
      return new Promise<void>((resolve) => { finishLoading = resolve })
    })
    const loading = historyManager.loadStateFromFullState(createHistoryState())

    historyManager.destroy()
    finishLoading()
    await loading

    expect(signal?.aborted).toBe(true)
    expect(mockEditor.backgroundManager.removeBackground).not.toHaveBeenCalled()
    expect(mockCanvas.renderAll).not.toHaveBeenCalled()
    expect(mockCanvas.fire).not.toHaveBeenCalled()
  })

  it('не начинает загрузку состояния после уничтожения', async() => {
    const { historyManager, mockCanvas } = createHistoryManagerTestSetup()
    historyManager.destroy()

    await historyManager.loadStateFromFullState(createHistoryState())

    expect(mockCanvas.loadFromJSON).not.toHaveBeenCalled()
    expect(mockCanvas.fire).not.toHaveBeenCalled()
  })

  it.each(['undo', 'redo'] as const)('не сообщает об ошибке %s при отмене загрузки уничтожением', async(action) => {
    const { historyManager, mockEditor, mockCanvas, setCanvasObjects } = createHistoryManagerTestSetup()
    historyManager.saveState()
    setCanvasObjects([{ id: 'object', left: 10 }])
    historyManager.saveState()
    if (action === 'redo') await historyManager.undo()
    mockCanvas.fire.mockClear()
    mockCanvas.renderAll.mockClear()
    mockCanvas.loadFromJSON.mockImplementation((...args: Parameters<Canvas['loadFromJSON']>) => {
      const signal = args[2]?.signal
      if (!signal) throw new Error('Загрузка состояния должна поддерживать отмену')
      return new Promise<void>((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(new DOMException('Loading aborted', 'AbortError')))
      })
    })
    const operation = historyManager[action]()
    await Promise.resolve()

    historyManager.destroy()
    await operation

    expect(mockEditor.errorManager.emitError).not.toHaveBeenCalled()
    expect(mockCanvas.renderAll).not.toHaveBeenCalled()
    expect(mockCanvas.fire).not.toHaveBeenCalled()
  })
})
