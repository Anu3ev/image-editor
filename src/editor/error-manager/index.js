import { errorCodes } from './error-codes.js'

/**
 * Менеджер ошибок и предупреждений редактора
 * @param {object} options
 * @param {ImageEditor} options.editor — экземпляр редактора с доступом к canvas
 */
export default class ErrorManager {
  constructor({ editor }) {
    this.editor = editor
  }

  /**
   * Эмитит событие ошибки через fabricjs
   * @param {object} options
   * @param {string} [origin='ImageEditor'] — источник ошибки (по умолчанию 'ImageEditor')
   * @param {string} code — код ошибки (из errorCodes)
   * @param {object} [data] — доп. данные (опционально)
   * @param {string} [message] — текст ошибки (опционально, если не передан, то используется код ошибки)
   * @fires editor:error
   */
  emitError({ origin = 'ImageEditor', method = 'Unknown Method', code, data, message }) {
    if (!ErrorManager.isValidErrorCode(code)) {
      console.warn('Неизвестный код ошибки: ', { code, origin, method })
      return
    }

    if (!code) return

    const msg = message || code

    console.error(`${origin}. ${method}. ${code}. ${msg}`, data)

    this.editor.canvas.fire('editor:error', {
      code,
      origin,
      method,
      message: msg,
      data
    })
  }

  /**
   * Эмитит предупреждение через fabricjs
   * @param {object} options
   * @param {string} [origin='ImageEditor'] — источник предупреждения (по умолчанию 'ImageEditor')
   * @param {string} code — код предупреждения (из errorCodes)
   * @param {object} [data] — доп. данные (опционально)
   * @param {string} [message] — текст предупреждения (опционально, если не передан, то используется код предупреждения)
   * @fires editor:warning
   */
  emitWarning({ origin = 'ImageEditor', method = 'Unknown Method', code, message, data }) {
    if (!ErrorManager.isValidErrorCode(code)) {
      console.warn('Неизвестный код ошибки: ', { code, origin, method })
      return
    }

    const msg = message || code

    console.warn(`${origin}. ${method}. ${code}. ${msg}`, data)

    this.editor.canvas.fire('editor:warning', {
      code,
      origin,
      method,
      message,
      data
    })
  }

  static isValidErrorCode(code) {
    if (!code) return false

    return Object.values(errorCodes)
      .some((category) => Object.values(category).includes(code))
  }
}
