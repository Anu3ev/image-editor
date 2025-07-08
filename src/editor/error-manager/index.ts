import { errorCodes } from './error-codes'
import { ImageEditor } from '../index'
import { ErrorItem } from '../types/events'

interface errorBufferItem extends ErrorItem {
  type: 'editor:error' | 'editor:warning'
}

/**
 * Менеджер ошибок и предупреждений редактора
 * @param {object} options
 * @param {ImageEditor} options.editor — экземпляр редактора с доступом к canvas
 */
export default class ErrorManager {
  /**
   * Буфер для хранения ошибок и предупреждений
   * @type {errorBufferItem[]}
   * @private
   */
  private _buffer: errorBufferItem[] = []

  public editor:ImageEditor

  constructor({ editor }: { editor: ImageEditor }) {
    this.editor = editor
  }

  get buffer() {
    return this._buffer
  }

  public cleanBuffer() {
    this._buffer.length = 0
  }

  /**
   * Эмитит событие ошибки через fabricjs
   * @param {object} options
   * @param {string} [options.origin='ImageEditor'] — источник ошибки (по умолчанию 'ImageEditor')
   * @param {string} [options.method='Unknown Method'] — метод, вызвавший ошибку (по умолчанию 'Unknown Method')
   * @param {string} options.code — код ошибки (из errorCodes)
   * @param {object} [options.data] — доп. данные (опционально)
   * @param {string} [options.message] — текст ошибки (опционально, если не передан, то используется код ошибки)
   * @fires editor:error
   */
  public emitError({ origin = 'ImageEditor', method = 'Unknown Method', code, data, message }:ErrorItem) {
    if (!ErrorManager.isValidErrorCode(code)) {
      console.warn('Неизвестный код ошибки: ', { code, origin, method })
      return
    }
    if (!code) return

    const msg = message || code

    // записываем в консоль
    console.error(`${origin}. ${method}. ${code}. ${msg}`, data)

    const errorData = {
      code,
      origin,
      method,
      message: msg,
      data
    }

    this._buffer.push({
      type: 'editor:error',
      ...errorData
    })

    this.editor.canvas.fire('editor:error', errorData)
  }

  /**
   * Эмитит предупреждение через fabricjs
   * @param {object} options
   * @param {string} [options.origin='ImageEditor'] — источник предупреждения (по умолчанию 'ImageEditor')
   * @param {string} [options.method='Unknown Method'] — метод, вызвавший предупреждение (по умолчанию 'Unknown Method')
   * @param {string} options.code — код предупреждения (из errorCodes)
   * @param {object} [options.data] — доп. данные (опционально)
   * @param {string} [options.message] — текст предупреждения (опционально, если не передан, то используется код предупреждения)
   * @fires editor:warning
   */
  public emitWarning({ origin = 'ImageEditor', method = 'Unknown Method', code, message, data }:ErrorItem) {
    if (!ErrorManager.isValidErrorCode(code)) {
      console.warn('Неизвестный код предупреждения: ', { code, origin, method })
      return
    }

    const msg = message || code

    console.warn(`${origin}. ${method}. ${code}. ${msg}`, data)

    const warningData = {
      code,
      origin,
      method,
      message: msg,
      data
    }

    this._buffer.push({
      type: 'editor:warning',
      ...warningData
    })

    this.editor.canvas.fire('editor:warning', warningData)
  }

  static isValidErrorCode(code: string) {
    if (!code) return false

    return Object.values(errorCodes)
      .some((category) => Object.values(category).includes(code))
  }
}
