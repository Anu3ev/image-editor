import { nanoid } from 'nanoid'
import WorkerManager from '../../../../src/editor/worker-manager'

describe('WorkerManager: жизненный цикл', () => {
  let manager: WorkerManager
  let postMessage: jest.SpyInstance

  beforeEach(() => {
    jest.useFakeTimers()
    let request = 0
    jest.mocked(nanoid).mockImplementation(() => {
      request += 1
      return `request-${request}`
    })
    manager = new WorkerManager()
    postMessage = jest.spyOn(manager.worker, 'postMessage').mockImplementation(() => {})
  })

  afterEach(() => {
    manager.terminate()
    jest.restoreAllMocks()
    jest.useRealTimers()
  })

  function respond({ success, data, error }: { success: boolean; data?: Blob; error?: string }): void {
    const { requestId } = postMessage.mock.calls[0][0]
    manager.worker.onmessage?.call(manager.worker, new MessageEvent('message', {
      data: { requestId, action: 'resizeImage', success, data, error }
    }))
  }

  it('возвращает результат запроса и отменяет таймер ожидания', async() => {
    const blob = new Blob(['image'])
    const result = manager.post('resizeImage', {})
    respond({ success: true, data: blob })
    await expect(result).resolves.toBe(blob)
    expect(jest.getTimerCount()).toBe(0)
  })

  it('отклоняет неудачный запрос и обрабатывает следующий', async() => {
    const failed = manager.post('resizeImage', {})
    const assertion = expect(failed).rejects.toThrow('Cannot decode image')
    respond({ success: false, error: 'Cannot decode image' })
    await assertion
    postMessage.mockClear()
    const blob = new Blob(['next image'])
    const next = manager.post('resizeImage', {})
    respond({ success: true, data: blob })
    await expect(next).resolves.toBe(blob)
    expect(jest.getTimerCount()).toBe(0)
  })

  it.each(['error', 'messageerror'])('отклоняет все ожидающие запросы при событии %s от worker', async(eventType) => {
    const rejected = jest.fn()
    manager.post('resizeImage', {}).catch(rejected)
    manager.post('toDataURL', {}).catch(rejected)
    if (eventType === 'error') {
      manager.worker.onerror?.call(manager.worker, new ErrorEvent('error', { message: 'Worker crashed' }))
    } else {
      manager.worker.onmessageerror?.call(manager.worker, new MessageEvent('messageerror'))
    }
    await Promise.resolve()
    expect(rejected).toHaveBeenCalledTimes(2)
    expect(rejected).toHaveBeenCalledWith(expect.any(Error))
    expect(jest.getTimerCount()).toBe(0)
    await expect(manager.post('resizeImage', {})).rejects.toThrow()
  })

  it('отклоняет запрос без ответа через 30 секунд', async() => {
    const rejected = jest.fn()
    manager.post('resizeImage', {}).catch(rejected)
    jest.advanceTimersByTime(30_000)
    await Promise.resolve()
    expect(rejected).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringMatching(/timed out/i) }))
    expect(jest.getTimerCount()).toBe(0)
  })

  it('отклоняет ожидающие и новые запросы после однократного завершения worker', async() => {
    const terminate = jest.spyOn(manager.worker, 'terminate')
    const rejected = jest.fn()
    manager.post('resizeImage', {}).catch(rejected)
    manager.terminate()
    manager.terminate()
    await Promise.resolve()
    expect(rejected).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringMatching(/terminated/i) }))
    expect(terminate).toHaveBeenCalledTimes(1)
    expect(manager.worker.onmessage).toBeNull()
    expect(manager.worker.onerror).toBeNull()
    expect(manager.worker.onmessageerror).toBeNull()
    expect(jest.getTimerCount()).toBe(0)
    await expect(manager.post('resizeImage', {})).rejects.toThrow(/terminated/i)
  })

  it('игнорирует запоздалый ответ и успешно обрабатывает следующий запрос', async() => {
    const failed = manager.post('resizeImage', {})
    const assertion = expect(failed).rejects.toThrow(/timed out/i)
    jest.advanceTimersByTime(30_000)
    await assertion
    respond({ success: true, data: new Blob(['late image']) })
    postMessage.mockClear()
    const blob = new Blob(['next image'])
    const next = manager.post('resizeImage', {})
    respond({ success: true, data: blob })
    await expect(next).resolves.toBe(blob)
    expect(jest.getTimerCount()).toBe(0)
  })

  it('отклоняет ожидающие запросы при некорректном ответе worker', async() => {
    const result = manager.post('resizeImage', {})
    const assertion = expect(result).rejects.toThrow('Invalid worker response')
    manager.worker.onmessage?.call(manager.worker, new MessageEvent('message', { data: null }))
    await assertion
    expect(jest.getTimerCount()).toBe(0)
  })

  it('отклоняет успешный ответ без результата изображения', async() => {
    const result = manager.post('resizeImage', {})
    const assertion = expect(result).rejects.toThrow('Invalid worker response')

    respond({ success: true })

    await assertion
    expect(jest.getTimerCount()).toBe(0)
  })

  it('отклоняет запрос при синхронной ошибке отправки и продолжает работу', async() => {
    postMessage.mockImplementationOnce(() => { throw new Error('DataCloneError') })
    await expect(manager.post('resizeImage', {})).rejects.toThrow('DataCloneError')
    expect(jest.getTimerCount()).toBe(0)

    postMessage.mockClear()
    const blob = new Blob(['next image'])
    const next = manager.post('resizeImage', {})
    respond({ success: true, data: blob })
    await expect(next).resolves.toBe(blob)
    expect(jest.getTimerCount()).toBe(0)
  })
})
