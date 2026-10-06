import { nanoid } from 'nanoid'
import WorkerManager from '../../../../src/editor/worker-manager'

describe('WorkerManager: жизненный цикл', () => {
  let manager: WorkerManager
  let postMessage: jest.SpyInstance

  beforeEach(() => {
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
  })

  function respond({ success, data, error }: { success: boolean; data?: Blob; error?: string }): void {
    const { requestId } = postMessage.mock.calls[0][0]
    manager.worker.onmessage?.call(manager.worker, new MessageEvent('message', {
      data: { requestId, action: 'resizeImage', success, data, error }
    }))
  }

  it('возвращает результат успешного запроса', async() => {
    const blob = new Blob(['image'])
    const result = manager.post('resizeImage', {})
    respond({ success: true, data: blob })
    await expect(result).resolves.toBe(blob)
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
    await expect(manager.post('resizeImage', {})).rejects.toThrow()
  })

  it('отклоняет все ожидающие запросы при завершении worker', async() => {
    const resize = manager.post('resizeImage', {})
    const exportImage = manager.post('toDataURL', {})
    const resizeRejected = expect(resize).rejects.toThrow(/terminated/i)
    const exportRejected = expect(exportImage).rejects.toThrow(/terminated/i)

    manager.terminate()

    await resizeRejected
    await exportRejected
  })

  it('не отправляет новые запросы после завершения worker', async() => {
    manager.terminate()

    await expect(manager.post('resizeImage', {})).rejects.toThrow(/terminated/i)
    expect(postMessage).not.toHaveBeenCalled()
  })

  it('завершает worker только один раз при повторном вызове terminate', () => {
    const terminate = jest.spyOn(manager.worker, 'terminate')

    manager.terminate()
    manager.terminate()

    expect(terminate).toHaveBeenCalledTimes(1)
  })

  it('отключает обработчики сообщений и ошибок после завершения worker', () => {
    manager.terminate()

    expect(manager.worker.onmessage).toBeNull()
    expect(manager.worker.onerror).toBeNull()
    expect(manager.worker.onmessageerror).toBeNull()
  })

  it('отклоняет ожидающие запросы при некорректном ответе worker', async() => {
    const result = manager.post('resizeImage', {})
    const assertion = expect(result).rejects.toThrow('Invalid worker response')
    manager.worker.onmessage?.call(manager.worker, new MessageEvent('message', { data: null }))
    await assertion
  })

  it('отклоняет успешный ответ без результата изображения', async() => {
    const result = manager.post('resizeImage', {})
    const assertion = expect(result).rejects.toThrow('Invalid worker response')

    respond({ success: true })

    await assertion
  })

  it('отклоняет запрос при синхронной ошибке отправки и продолжает работу', async() => {
    postMessage.mockImplementationOnce(() => { throw new Error('DataCloneError') })
    await expect(manager.post('resizeImage', {})).rejects.toThrow('DataCloneError')

    postMessage.mockClear()
    const blob = new Blob(['next image'])
    const next = manager.post('resizeImage', {})
    respond({ success: true, data: blob })
    await expect(next).resolves.toBe(blob)
  })
})
