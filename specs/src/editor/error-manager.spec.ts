/**
 * Тесты для ErrorManager
 */

import ErrorManager from '../../../src/editor/error-manager'

// Создаем мок для ImageEditor
const mockEditor = {
  canvas: {
    fire: jest.fn()
  },
  // Добавляем другие методы по мере необходимости
} as any

describe('ErrorManager', () => {
  let errorManager: ErrorManager

  beforeEach(() => {
    // Создаем новый экземпляр перед каждым тестом
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
    // Параметризованные тесты для обоих методов
    test.each([
      {
        methodName: 'emitError',
        eventType: 'editor:error',
        consoleMethod: 'error'
      },
      {
        methodName: 'emitWarning',
        eventType: 'editor:warning',
        consoleMethod: 'warn'
      }
    ])('$methodName должен добавить сообщение в буфер и эмитить событие', ({
      methodName,
      eventType,
      consoleMethod
    }) => {
      const messageData = {
        code: 'INVALID_CONTENT_TYPE',
        origin: 'ImageManager',
        method: 'importImage',
        message: 'Invalid image content type'
      }

      // Вызываем метод динамически
      errorManager[methodName](messageData)

      // Проверяем, что сообщение добавлено в буфер
      expect(errorManager.buffer).toHaveLength(1)
      expect(errorManager.buffer[0]).toMatchObject({
        type: eventType,
        ...messageData
      })

      // Проверяем, что событие было эмитировано
      expect(mockEditor.canvas.fire).toHaveBeenCalledWith(eventType, messageData)

      // Проверяем, что сообщение было залогировано
      expect(console[consoleMethod]).toHaveBeenCalledWith(
        'ImageManager. importImage. INVALID_CONTENT_TYPE. Invalid image content type',
        undefined
      )
    })

    test.each([
      { methodName: 'emitError', eventType: 'editor:error' },
      { methodName: 'emitWarning', eventType: 'editor:warning' }
    ])('$methodName должен использовать значения по умолчанию', ({
      methodName,
      eventType
    }) => {
      errorManager[methodName]({ code: 'IMPORT_FAILED' })

      const message = errorManager.buffer[0]
      expect(message.type).toBe(eventType)
      expect(message.origin).toBe('ImageEditor')
      expect(message.method).toBe('Unknown Method')
      expect(message.message).toBe('IMPORT_FAILED')
    })

    test.each([
      { methodName: 'emitError' },
      { methodName: 'emitWarning' }
    ])('$methodName должен использовать код как сообщение, если сообщение не передано', ({
      methodName
    }) => {
      errorManager[methodName]({
        code: 'CLIPBOARD_NOT_SUPPORTED',
        origin: 'ClipboardManager'
      })

      const message = errorManager.buffer[0]
      expect(message.message).toBe('CLIPBOARD_NOT_SUPPORTED')
    })

    test.each([
      { methodName: 'emitError' },
      { methodName: 'emitWarning' }
    ])('$methodName должен передать дополнительные данные', ({
      methodName
    }) => {
      const additionalData = { userId: 123, action: 'upload' }

      errorManager[methodName]({
        code: 'IMAGE_EXPORT_FAILED',
        data: additionalData
      })

      const message = errorManager.buffer[0]
      expect(message.data).toEqual(additionalData)
    })

    test.each([
      { methodName: 'emitError', consoleMethod: 'warn' },
      { methodName: 'emitWarning', consoleMethod: 'warn' }
    ])('$methodName не должен добавлять сообщение с невалидным кодом', ({
      methodName,
      consoleMethod
    }) => {
      const warningMessage = methodName === 'emitError'
        ? 'Неизвестный код ошибки: '
        : 'Неизвестный код предупреждения: '

      errorManager[methodName]({
        code: 'INVALID_ERROR_CODE',
        message: 'Message with invalid code'
      })

      expect(errorManager.buffer).toHaveLength(0)
      expect(mockEditor.canvas.fire).not.toHaveBeenCalled()
      expect(console[consoleMethod]).toHaveBeenCalledWith(
        warningMessage,
        { code: 'INVALID_ERROR_CODE', origin: 'ImageEditor', method: 'Unknown Method' }
      )
    })

    test.each([
      { methodName: 'emitError' },
      { methodName: 'emitWarning' }
    ])('$methodName не должен добавлять сообщение без кода', ({
      methodName
    }) => {
      errorManager[methodName]({
        code: '',
        message: 'Message without code'
      })

      expect(errorManager.buffer).toHaveLength(0)
      expect(mockEditor.canvas.fire).not.toHaveBeenCalled()
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
