import WorkerManager from '../../../../src/editor/worker-manager'

describe('WorkerManager technical errors', () => {
  afterEach(() => jest.restoreAllMocks())

  it('uses an English fallback when a worker reports no message', async() => {
    const manager = new WorkerManager()
    const post = jest.spyOn(manager.worker, 'postMessage')
    const result = manager.post('resizeImage', {})
    const assertion = expect(result).rejects.toThrow('Worker request failed')
    const { requestId } = post.mock.calls[0][0]
    manager.worker.onmessage?.call(manager.worker, new MessageEvent('message', {
      data: { requestId, success: false }
    }))

    await assertion
    manager.terminate()
  })

  it('preserves an external error message and cause', async() => {
    const manager = new WorkerManager()
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

  it.each([[null], [[]], [{}], [42]])('settles pending requests for a malformed error: %j', async(error) => {
    const manager = new WorkerManager()
    const post = jest.spyOn(manager.worker, 'postMessage')
    const result = manager.post('resizeImage', {})
    const assertion = expect(result).rejects.toThrow('Invalid worker response')
    const { requestId } = post.mock.calls[0][0]
    manager.worker.onmessage?.call(manager.worker, new MessageEvent('message', {
      data: { requestId, success: false, error }
    }))
    await assertion
  })

  it.each([
    ['error', 'Worker failed'],
    ['messageerror', 'Failed to deserialize the worker response']
  ])('uses an English message for a worker %s event', async(eventType, message) => {
    const manager = new WorkerManager()
    const result = manager.post('resizeImage', {})
    const assertion = expect(result).rejects.toThrow(message)
    if (eventType === 'error') {
      manager.worker.onerror?.call(manager.worker, new ErrorEvent('error'))
    } else {
      manager.worker.onmessageerror?.call(manager.worker, new MessageEvent('messageerror'))
    }
    await assertion
  })

  it('uses an English termination error for subsequent requests', async() => {
    const manager = new WorkerManager()
    manager.terminate()
    await expect(manager.post('resizeImage', {})).rejects.toThrow('Worker has been terminated')
  })
})
