import WorkerManager from '../../../../src/editor/worker-manager'
import { createTranslator } from '../../../../src/editor/i18n'

describe('WorkerManager error localization', () => {
  afterEach(() => jest.restoreAllMocks())

  it('translates the same response independently for two instances', async() => {
    const englishManager = new WorkerManager(undefined, createTranslator({ language: 'en' }))
    const russianManager = new WorkerManager(undefined, createTranslator({ language: 'ru' }))
    const managers = [englishManager, russianManager]
    const results = managers.map((manager) => {
      const post = jest.spyOn(manager.worker, 'postMessage')
      const result = manager.post('unknown', {}).catch((error: Error) => error.message)
      const { requestId } = post.mock.calls[0][0]
      manager.worker.onmessage?.call(manager.worker, new MessageEvent('message', {
        data: {
          requestId,
          success: false,
          errorKey: 'worker.errors.unknownAction',
          errorParams: { action: 'custom-action' }
        }
      }))
      return result
    })

    await expect(Promise.all(results)).resolves.toEqual([
      'Unknown action custom-action',
      'Неизвестное действие custom-action'
    ])
    managers.forEach((manager) => manager.terminate())
  })

  it('preserves an external error message and cause', async() => {
    const manager = new WorkerManager(undefined, createTranslator({ language: 'ru' }))
    const post = jest.spyOn(manager.worker, 'postMessage')
    const cause = new Error('Decoder failed')
    const result = manager.post('resizeImage', {}).catch((error: Error) => error)
    const { requestId } = post.mock.calls[0][0]
    manager.worker.onmessage?.call(manager.worker, new MessageEvent('message', {
      data: { requestId, success: false, error: 'Decoder failed', cause }
    }))

    await expect(result).resolves.toMatchObject({ message: 'Decoder failed', cause })
    manager.terminate()
  })

  it.each([
    { errorKey: 'unknown-key' },
    { errorKey: 'worker.errors.unknownAction', errorParams: null },
    { errorKey: 'worker.errors.unknownAction', errorParams: [] }
  ])('settles pending requests for malformed error metadata: %j', async(metadata) => {
    const manager = new WorkerManager(undefined, createTranslator({ language: 'ru' }))
    const post = jest.spyOn(manager.worker, 'postMessage')
    const result = manager.post('resizeImage', {})
    const assertion = expect(result).rejects.toThrow('Некорректный ответ воркера')
    const { requestId } = post.mock.calls[0][0]
    manager.worker.onmessage?.call(manager.worker, new MessageEvent('message', {
      data: { requestId, success: false, ...metadata }
    }))
    await assertion
  })

  it('localizes termination errors for subsequent requests', async() => {
    const manager = new WorkerManager(undefined, createTranslator({ language: 'ru' }))
    manager.terminate()
    await expect(manager.post('resizeImage', {})).rejects.toThrow('Работа воркера завершена')
  })
})
