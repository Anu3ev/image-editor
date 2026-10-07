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

  it('localizes the default method without changing code, origin, or diagnostic data', () => {
    const editor = createEditorStub()
    editor.t = createTranslator('ru')
    const manager = new ErrorManager({ editor })
    const data = { source: 'caller-image.png', cause: new Error('Original error') }

    manager.emitError({ code: 'IMPORT_FAILED', origin: 'ImageManager', data })

    expect(editor.canvas.fire).toHaveBeenCalledWith('editor:error', {
      code: 'IMPORT_FAILED',
      origin: 'ImageManager',
      method: 'Неизвестный метод',
      message: 'IMPORT_FAILED',
      data
    })
    expect(manager.buffer[0].data).toBe(data)
  })

  it('preserves caller-supplied messages and method names for errors and warnings', () => {
    const editor = createEditorStub()
    editor.t = createTranslator('ru')
    const manager = new ErrorManager({ editor })
    const event = {
      code: 'IMPORT_FAILED',
      origin: 'HostIntegration',
      method: 'loadCustomerImage',
      message: 'My own message / Моё сообщение',
      data: { requestId: 'request-42' }
    }

    manager.emitError(event)
    manager.emitWarning(event)

    expect(editor.canvas.fire).toHaveBeenCalledWith('editor:error', event)
    expect(editor.canvas.fire).toHaveBeenCalledWith('editor:warning', event)
    expect(manager.buffer.map(({ message }) => message)).toEqual([event.message, event.message])
  })
})
