/* eslint-disable no-restricted-globals -- Worker entrypoint registers its handler on self. */
describe('Worker изображений: жизненный цикл ресурсов', () => {
  const bitmap = { width: 10, height: 20, close: jest.fn() }
  const blob = new Blob(['encoded image'], { type: 'image/png' })
  const convertToBlob = jest.fn()
  let send: jest.SpyInstance
  let restoreGlobals: () => void

  beforeEach(() => {
    jest.clearAllMocks()
    const previous = {
      OffscreenCanvas: Object.getOwnPropertyDescriptor(globalThis, 'OffscreenCanvas'),
      createImageBitmap: Object.getOwnPropertyDescriptor(globalThis, 'createImageBitmap'),
      fetch: Object.getOwnPropertyDescriptor(globalThis, 'fetch')
    }
    const onmessage = self.onmessage
    restoreGlobals = () => {
      Object.entries(previous).forEach(([key, descriptor]) => {
        if (descriptor) {
          Object.defineProperty(globalThis, key, descriptor)
        } else {
          Reflect.deleteProperty(globalThis, key)
        }
      })
      self.onmessage = onmessage
    }
    convertToBlob.mockResolvedValue(blob)
    Object.defineProperties(globalThis, {
      OffscreenCanvas: {
        configurable: true,
        value: jest.fn(() => ({ getContext: () => ({ drawImage: jest.fn() }), convertToBlob }))
      },
      createImageBitmap: { configurable: true, value: jest.fn().mockResolvedValue(bitmap) },
      fetch: { configurable: true, value: jest.fn().mockResolvedValue({ blob: async() => blob }) }
    })
    send = jest.spyOn(self, 'postMessage').mockImplementation(() => {})
    jest.isolateModules(() => {
      jest.requireActual('../../../../src/editor/worker-manager/worker')
    })
  })

  afterEach(() => {
    restoreGlobals()
    jest.restoreAllMocks()
  })

  async function request({ action, payload }: { action: string; payload: object }): Promise<void> {
    await self.onmessage?.call(self, new MessageEvent('message', {
      data: { action, requestId: 'request', payload }
    }))
  }

  it('освобождает переданный bitmap после экспорта Blob', async() => {
    await request({ action: 'toDataURL', payload: { bitmap, contentType: 'image/png', returnBlob: true } })
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: blob }))
    expect(bitmap.close).toHaveBeenCalledTimes(1)
  })

  it('освобождает переданный bitmap при ошибке кодирования', async() => {
    convertToBlob.mockRejectedValue(new Error('Encoding failed'))
    await request({ action: 'toDataURL', payload: { bitmap, contentType: 'image/png' } })
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ success: false, error: 'Encoding failed' }))
    expect(bitmap.close).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['error', 'Failed to read the image Blob'],
    ['abort', 'Reading the image Blob was aborted']
  ])('сообщает об ошибке FileReader при событии %s', async(eventType, message) => {
    jest.spyOn(FileReader.prototype, 'readAsDataURL').mockImplementation(function(this: FileReader) {
      this.dispatchEvent(new ProgressEvent(eventType))
    })
    await request({ action: 'toDataURL', payload: { bitmap, contentType: 'image/png' } })
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ success: false, error: message, cause: expect.any(Error) }))
    expect(bitmap.close).toHaveBeenCalledTimes(1)
  })

  it('сообщает об ошибке чтения data URL и освобождает bitmap', async() => {
    jest.spyOn(FileReader.prototype, 'readAsDataURL').mockImplementation(function(this: FileReader) {
      this.dispatchEvent(new ProgressEvent('load'))
    })
    await request({ action: 'toDataURL', payload: { bitmap, contentType: 'image/png' } })
    expect(send).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      error: 'Failed to read the image as a data URL',
      cause: expect.any(Error)
    }))
    expect(bitmap.close).toHaveBeenCalledTimes(1)
  })

  it('сообщает об отсутствии контекста OffscreenCanvas и освобождает bitmap', async() => {
    const offscreen = new OffscreenCanvas(bitmap.width, bitmap.height)
    jest.spyOn(offscreen, 'getContext').mockReturnValue(null)
    jest.mocked(OffscreenCanvas).mockReturnValueOnce(offscreen)
    await request({ action: 'toDataURL', payload: { bitmap, contentType: 'image/png' } })
    expect(send).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      error: 'Failed to get a 2D context from OffscreenCanvas',
      cause: expect.any(Error)
    }))
    expect(bitmap.close).toHaveBeenCalledTimes(1)
  })

  it('освобождает декодированный bitmap после изменения размеров', async() => {
    await request({
      action: 'resizeImage',
      payload: { dataURL: 'blob:image', contentType: 'image/png', maxWidth: 100, maxHeight: 100 }
    })
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: blob }))
    expect(bitmap.close).toHaveBeenCalledTimes(1)
  })
})
