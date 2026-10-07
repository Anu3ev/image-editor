import ErrorManager from '../../../../src/editor/error-manager'
import { createTranslator } from '../../../../src/editor/i18n'
import { createEditorStub } from '../../../test-utils/editor/editor-stub'

describe('Localized error event contracts', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {})
    jest.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it.each([
    ['en', 'Unknown method'],
    ['ru', 'Неизвестный метод']
  ])('keeps method metadata stable while translating %s console labels', (language, methodLabel) => {
    const editor = createEditorStub()
    editor.t = createTranslator({ language })
    const manager = new ErrorManager({ editor })
    const data = { source: 'caller-image.png', cause: new Error('Original error') }

    manager.emitError({ code: 'IMPORT_FAILED', origin: 'ImageManager', data })
    manager.emitWarning({ code: 'IMPORT_FAILED', origin: 'ImageManager', data })

    const event = {
      code: 'IMPORT_FAILED',
      origin: 'ImageManager',
      method: 'Unknown Method',
      message: 'IMPORT_FAILED',
      data
    }
    expect(editor.canvas.fire).toHaveBeenCalledWith('editor:error', event)
    expect(editor.canvas.fire).toHaveBeenCalledWith('editor:warning', event)
    expect(manager.buffer.map(({ method }) => method)).toEqual(['Unknown Method', 'Unknown Method'])
    expect(manager.buffer[0].data).toBe(data)
    const logMessage = `ImageManager. ${methodLabel}. IMPORT_FAILED. IMPORT_FAILED`
    expect(console.error).toHaveBeenCalledWith(logMessage, data)
    expect(console.warn).toHaveBeenCalledWith(logMessage, data)
  })

  it.each(['loadCustomerImage', 'Unknown Method'])('preserves caller-supplied method %s and messages', (method) => {
    const editor = createEditorStub()
    editor.t = createTranslator({ language: 'ru' })
    const manager = new ErrorManager({ editor })
    const event = {
      code: 'IMPORT_FAILED',
      origin: 'HostIntegration',
      method,
      message: 'My own message / Моё сообщение',
      data: { requestId: 'request-42' }
    }

    manager.emitError(event)
    manager.emitWarning(event)

    expect(editor.canvas.fire).toHaveBeenCalledWith('editor:error', event)
    expect(editor.canvas.fire).toHaveBeenCalledWith('editor:warning', event)
    expect(manager.buffer.map(({ message }) => message)).toEqual([event.message, event.message])
    expect(console.error).toHaveBeenCalledWith(
      `HostIntegration. ${method}. IMPORT_FAILED. ${event.message}`,
      event.data
    )
  })
})
