import ErrorManager from '../../../../src/editor/error-manager'
import type { ErrorItem } from '../../../../src/main'
import { createTranslator } from '../../../../src/editor/i18n'
import { createEditorStub } from '../../../test-utils/editor/editor-stub'

describe('Language-independent error event contracts', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {})
    jest.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it.each(['en', 'ru', 'pt-BR'])('keeps English diagnostics and metadata for a %s editor', (language) => {
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
    const logMessage = 'ImageManager. Unknown method. IMPORT_FAILED. IMPORT_FAILED'
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

  it.each(['omitted', 'undefined'])('omits userMessage from events and buffer when %s', (input) => {
    const editor = createEditorStub()
    editor.t = createTranslator({ language: 'ru' })
    const manager = new ErrorManager({ editor })
    const item: ErrorItem = { code: 'IMPORT_FAILED', message: 'Original diagnostic' }
    if (input === 'undefined') item.userMessage = undefined

    manager.emitError(item)
    manager.emitWarning(item)

    const errorEvent = editor.canvas.fire.mock.calls[0][1]
    const warningEvent = editor.canvas.fire.mock.calls[1][1]
    expect(errorEvent).not.toHaveProperty('userMessage')
    expect(warningEvent).not.toHaveProperty('userMessage')
    expect(manager.buffer).toHaveLength(2)
    manager.buffer.forEach((entry) => {
      expect(entry).not.toHaveProperty('userMessage')
      expect(entry.message).toBe('Original diagnostic')
    })
  })

  it.each([
    'A caller-provided message / Сообщение приложения',
    '<strong>External & literal</strong> {{interpolation}}',
    ''
  ])('forwards caller userMessage %j unchanged in errors, warnings, and buffer', (userMessage) => {
    const editor = createEditorStub()
    editor.t = createTranslator({ language: 'ru' })
    const manager = new ErrorManager({ editor })
    const cause = new Error('Original browser failure')
    const data = { requestId: 'request-42', cause }
    const item: ErrorItem = {
      code: 'IMPORT_FAILED',
      origin: 'HostIntegration',
      method: 'loadCustomerImage',
      message: 'Original diagnostic <detail> {{cause}}',
      userMessage,
      data
    }

    manager.emitError(item)
    manager.emitWarning(item)

    expect(editor.canvas.fire).toHaveBeenCalledWith('editor:error', item)
    expect(editor.canvas.fire).toHaveBeenCalledWith('editor:warning', item)
    expect(manager.buffer).toStrictEqual([
      { type: 'editor:error', ...item },
      { type: 'editor:warning', ...item }
    ])
    expect(editor.canvas.fire.mock.calls[0][1].data).toBe(data)
    expect(editor.canvas.fire.mock.calls[1][1].data).toBe(data)
    manager.buffer.forEach((entry) => {
      expect(entry.data).toBe(data)
      expect(entry.data).toHaveProperty('cause', cause)
    })
    const logMessage = 'HostIntegration. loadCustomerImage. IMPORT_FAILED. Original diagnostic <detail> {{cause}}'
    expect(console.error).toHaveBeenCalledWith(logMessage, data)
    expect(console.warn).toHaveBeenCalledWith(logMessage, data)
    expect(item.userMessage).toBe(userMessage)
    expect(data.cause).toBe(cause)
  })
})
