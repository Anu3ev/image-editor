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

  describe('emitError', () => {
    test('должен добавить ошибку в буфер и эмитить событие', () => {
      const errorData = {
        code: 'INVALID_CONTENT_TYPE', // Используем реальный код ошибки
        origin: 'ImageManager',
        method: 'importImage',
        message: 'Invalid image content type'
      }

      errorManager.emitError(errorData)

      // Проверяем, что ошибка добавлена в буфер
      expect(errorManager.buffer).toHaveLength(1)
      expect(errorManager.buffer[0]).toMatchObject({
        type: 'editor:error',
        ...errorData
      })

      // Проверяем, что событие было эмитировано
      expect(mockEditor.canvas.fire).toHaveBeenCalledWith('editor:error', {
        ...errorData
      })

      // Проверяем, что ошибка была залогирована
      expect(console.error).toHaveBeenCalledWith(
        'ImageManager. importImage. INVALID_CONTENT_TYPE. Invalid image content type',
        undefined
      )
    })

    test('должен использовать значения по умолчанию', () => {
      errorManager.emitError({
        code: 'IMPORT_FAILED' // Используем реальный код ошибки
      })

      const error = errorManager.buffer[0]
      expect(error.origin).toBe('ImageEditor')
      expect(error.method).toBe('Unknown Method')
      expect(error.message).toBe('IMPORT_FAILED')
    })

    test('должен использовать код как сообщение, если сообщение не передано', () => {
      errorManager.emitError({
        code: 'CLIPBOARD_NOT_SUPPORTED', // Используем реальный код ошибки
        origin: 'ClipboardManager'
      })

      const error = errorManager.buffer[0]
      expect(error.message).toBe('CLIPBOARD_NOT_SUPPORTED')
    })

    test('должен передать дополнительные данные', () => {
      const additionalData = { userId: 123, action: 'upload' }

      errorManager.emitError({
        code: 'IMAGE_EXPORT_FAILED', // Используем реальный код ошибки
        data: additionalData
      })

      const error = errorManager.buffer[0]
      expect(error.data).toEqual(additionalData)

      // Проверяем, что данные переданы в console.error
      expect(console.error).toHaveBeenCalledWith(
        expect.any(String),
        additionalData
      )
    })

    test('не должен добавлять ошибку с невалидным кодом', () => {
      errorManager.emitError({
        code: 'INVALID_ERROR_CODE', // Невалидный код
        message: 'Error with invalid code'
      })

      expect(errorManager.buffer).toHaveLength(0)
      expect(mockEditor.canvas.fire).not.toHaveBeenCalled()
      expect(console.warn).toHaveBeenCalledWith(
        'Неизвестный код ошибки: ',
        { code: 'INVALID_ERROR_CODE', origin: 'ImageEditor', method: 'Unknown Method' }
      )
    })

    test('не должен добавлять ошибку без кода', () => {
      errorManager.emitError({
        code: '',
        message: 'Error without code'
      })

      expect(errorManager.buffer).toHaveLength(0)
      expect(mockEditor.canvas.fire).not.toHaveBeenCalled()
    })
  })

  describe('интеграционные тесты', () => {
    test('должен корректно работать с несколькими ошибками', () => {
      // Добавляем несколько ошибок с реальными кодами
      errorManager.emitError({ code: 'IMPORT_FAILED' })
      errorManager.emitError({ code: 'INVALID_CONTENT_TYPE' })
      errorManager.emitError({ code: 'CLIPBOARD_NOT_SUPPORTED' })

      expect(errorManager.buffer).toHaveLength(3)
      expect(mockEditor.canvas.fire).toHaveBeenCalledTimes(3)

      // Очищаем буфер
      errorManager.cleanBuffer()
      expect(errorManager.buffer).toHaveLength(0)

      // Добавляем новую ошибку
      errorManager.emitError({ code: 'IMAGE_EXPORT_FAILED' })
      expect(errorManager.buffer).toHaveLength(1)
    })
  })
})
