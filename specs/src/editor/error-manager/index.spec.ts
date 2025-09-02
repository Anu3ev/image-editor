import ErrorManager from '../../../../src/editor/error-manager'
import { createEditorStub } from '../../../test-utils/editor-helpers'

describe('ErrorManager', () => {
  let errorManager: ErrorManager
  let mockEditor: ReturnType<typeof createEditorStub>

  beforeEach(() => {
    // Используем типизированный стаб вместо any
    mockEditor = createEditorStub()
    errorManager = new ErrorManager({ editor: mockEditor })

    // Очищаем все моки
    jest.clearAllMocks()

    // Мокаем console.error чтобы не засорять вывод тестов
    jest.spyOn(console, 'error').mockImplementation(() => {})
    jest.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    // Восстанавливаем console методы
    jest.restoreAllMocks()
  })

  describe('конструктор', () => {
    test('должен инициализировать пустой буфер', () => {
      expect(errorManager.buffer).toEqual([])
    })

    test('должен сохранить ссылку на редактор', () => {
      expect(errorManager.editor).toBe(mockEditor)
    })
  })

  describe('buffer', () => {
    test('должен возвращать массив ошибок', () => {
      const buffer = errorManager.buffer
      expect(Array.isArray(buffer)).toBe(true)
      expect(buffer).toHaveLength(0)
    })
  })

  describe('cleanBuffer', () => {
    test('должен очистить буфер ошибок', () => {
      // Добавляем что-то в буфер (напрямую для тестирования)
      errorManager['_buffer'].push({
        type: 'editor:error',
        code: 'TEST_ERROR',
        origin: 'Test',
        method: 'testMethod',
        message: 'Test error'
      })

      expect(errorManager.buffer).toHaveLength(1)

      errorManager.cleanBuffer()

      expect(errorManager.buffer).toHaveLength(0)
    })
  })

  describe('emitError и emitWarning', () => {
    describe('emitError', () => {
      it('должен добавить ошибку в буфер и эмитить событие', () => {
        const messageData = {
          code: 'INVALID_CONTENT_TYPE',
          origin: 'ImageManager',
          method: 'importImage',
          message: 'Invalid image content type'
        }

        errorManager.emitError(messageData)

        // Проверяем, что сообщение добавлено в буфер
        expect(errorManager.buffer).toHaveLength(1)
        expect(errorManager.buffer[0]).toMatchObject({
          type: 'editor:error',
          ...messageData
        })

        // Проверяем, что событие было эмитировано
        expect(mockEditor.canvas.fire).toHaveBeenCalledWith('editor:error', messageData)

        // Проверяем, что сообщение было залогировано
        expect(console.error).toHaveBeenCalledWith(
          'ImageManager. importImage. INVALID_CONTENT_TYPE. Invalid image content type',
          undefined
        )
      })

      it('должен использовать значения по умолчанию', () => {
        errorManager.emitError({ code: 'IMPORT_FAILED' })

        const message = errorManager.buffer[0]
        expect(message.type).toBe('editor:error')
        expect(message.origin).toBe('ImageEditor')
        expect(message.method).toBe('Unknown Method')
        expect(message.message).toBe('IMPORT_FAILED')
      })

      it('должен использовать код как сообщение, если сообщение не передано', () => {
        errorManager.emitError({
          code: 'CLIPBOARD_NOT_SUPPORTED',
          origin: 'ClipboardManager'
        })

        const message = errorManager.buffer[0]
        expect(message.message).toBe('CLIPBOARD_NOT_SUPPORTED')
      })

      it('должен передать дополнительные данные', () => {
        const additionalData = { userId: 123, action: 'upload' }

        errorManager.emitError({
          code: 'IMAGE_EXPORT_FAILED',
          data: additionalData
        })

        const message = errorManager.buffer[0]
        expect(message.data).toEqual(additionalData)
      })

      it('не должен добавлять сообщение с невалидным кодом', () => {
        errorManager.emitError({
          code: 'INVALID_ERROR_CODE',
          message: 'Message with invalid code'
        })

        expect(errorManager.buffer).toHaveLength(0)
        expect(mockEditor.canvas.fire).not.toHaveBeenCalled()
        expect(console.warn).toHaveBeenCalledWith(
          'Неизвестный код ошибки: ',
          { code: 'INVALID_ERROR_CODE', origin: 'ImageEditor', method: 'Unknown Method' }
        )
      })

      it('не должен добавлять сообщение без кода', () => {
        errorManager.emitError({
          code: '',
          message: 'Message without code'
        })

        expect(errorManager.buffer).toHaveLength(0)
        expect(mockEditor.canvas.fire).not.toHaveBeenCalled()
      })
    })

    describe('emitWarning', () => {
      it('должен добавить предупреждение в буфер и эмитить событие', () => {
        const messageData = {
          code: 'IMAGE_RESIZE_WARNING',
          origin: 'ImageManager',
          method: 'resizeImage',
          message: 'Image resize warning'
        }

        errorManager.emitWarning(messageData)

        // Проверяем, что сообщение добавлено в буфер
        expect(errorManager.buffer).toHaveLength(1)
        expect(errorManager.buffer[0]).toMatchObject({
          type: 'editor:warning',
          ...messageData
        })

        // Проверяем, что событие было эмитировано
        expect(mockEditor.canvas.fire).toHaveBeenCalledWith('editor:warning', messageData)

        // Проверяем, что сообщение было залогировано
        expect(console.warn).toHaveBeenCalledWith(
          'ImageManager. resizeImage. IMAGE_RESIZE_WARNING. Image resize warning',
          undefined
        )
      })

      it('должен использовать значения по умолчанию', () => {
        errorManager.emitWarning({ code: 'IMPORT_FAILED' })

        const message = errorManager.buffer[0]
        expect(message.type).toBe('editor:warning')
        expect(message.origin).toBe('ImageEditor')
        expect(message.method).toBe('Unknown Method')
        expect(message.message).toBe('IMPORT_FAILED')
      })

      it('должен использовать код как сообщение, если сообщение не передано', () => {
        errorManager.emitWarning({
          code: 'CLIPBOARD_NOT_SUPPORTED',
          origin: 'ClipboardManager'
        })

        const message = errorManager.buffer[0]
        expect(message.message).toBe('CLIPBOARD_NOT_SUPPORTED')
      })

      it('должен передать дополнительные данные', () => {
        const additionalData = { userId: 123, action: 'upload' }

        errorManager.emitWarning({
          code: 'IMAGE_EXPORT_FAILED',
          data: additionalData
        })

        const message = errorManager.buffer[0]
        expect(message.data).toEqual(additionalData)
      })

      it('не должен добавлять сообщение с невалидным кодом', () => {
        errorManager.emitWarning({
          code: 'INVALID_WARNING_CODE',
          message: 'Message with invalid code'
        })

        expect(errorManager.buffer).toHaveLength(0)
        expect(mockEditor.canvas.fire).not.toHaveBeenCalled()
        expect(console.warn).toHaveBeenCalledWith(
          'Неизвестный код предупреждения: ',
          { code: 'INVALID_WARNING_CODE', origin: 'ImageEditor', method: 'Unknown Method' }
        )
      })

      it('не должен добавлять сообщение без кода', () => {
        errorManager.emitWarning({
          code: '',
          message: 'Message without code'
        })

        expect(errorManager.buffer).toHaveLength(0)
        expect(mockEditor.canvas.fire).not.toHaveBeenCalled()
      })
    })
  })

  describe('isValidErrorCode', () => {
    test('должен вернуть true для валидных кодов ошибок', () => {
      expect(ErrorManager.isValidErrorCode('IMPORT_FAILED')).toBe(true)
      expect(ErrorManager.isValidErrorCode('IMAGE_RESIZE_WARNING')).toBe(true)
      expect(ErrorManager.isValidErrorCode('INVALID_CONTENT_TYPE')).toBe(true)
    })

    test('должен вернуть false для невалидных кодов ошибок', () => {
      expect(ErrorManager.isValidErrorCode('UNKNOWN_ERROR')).toBe(false)
      expect(ErrorManager.isValidErrorCode('')).toBe(false)
    })
  })

  describe('интеграционные тесты', () => {
    test('должен корректно работать с несколькими ошибками и предупреждениями', () => {
      // Добавляем несколько ошибок и предупреждений с реальными кодами
      errorManager.emitError({ code: 'IMPORT_FAILED' })
      errorManager.emitWarning({ code: 'IMAGE_RESIZE_WARNING' })
      errorManager.emitError({ code: 'INVALID_CONTENT_TYPE' })
      errorManager.emitWarning({ code: 'CLIPBOARD_NOT_SUPPORTED' })

      expect(errorManager.buffer).toHaveLength(4)
      expect(mockEditor.canvas.fire).toHaveBeenCalledTimes(4)

      // Проверяем, что типы сообщений корректны
      expect(errorManager.buffer[0].type).toBe('editor:error')
      expect(errorManager.buffer[1].type).toBe('editor:warning')
      expect(errorManager.buffer[2].type).toBe('editor:error')
      expect(errorManager.buffer[3].type).toBe('editor:warning')

      // Очищаем буфер
      errorManager.cleanBuffer()
      expect(errorManager.buffer).toHaveLength(0)

      // Добавляем новое сообщение
      errorManager.emitWarning({ code: 'IMAGE_EXPORT_FAILED' })
      expect(errorManager.buffer).toHaveLength(1)
      expect(errorManager.buffer[0].type).toBe('editor:warning')
    })

    test('должен корректно различать ошибки и предупреждения в событиях', () => {
      errorManager.emitError({ code: 'IMPORT_FAILED', message: 'Import error' })
      errorManager.emitWarning({ code: 'IMAGE_RESIZE_WARNING', message: 'Resize warning' })

      // Проверяем, что правильные события были эмитированы
      expect(mockEditor.canvas.fire).toHaveBeenNthCalledWith(1, 'editor:error', {
        code: 'IMPORT_FAILED',
        origin: 'ImageEditor',
        method: 'Unknown Method',
        message: 'Import error'
      })

      expect(mockEditor.canvas.fire).toHaveBeenNthCalledWith(2, 'editor:warning', {
        code: 'IMAGE_RESIZE_WARNING',
        origin: 'ImageEditor',
        method: 'Unknown Method',
        message: 'Resize warning'
      })
    })
  })
})
