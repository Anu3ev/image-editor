import { errorCodes } from './error-codes'
import { ImageEditor } from '../index'
import { ErrorItem } from '../types/events'

interface errorBufferItem extends ErrorItem {
  type: 'editor:error' | 'editor:warning'
}

/**
 * Менеджер ошибок и предупреждений редактора
 */
export default class ErrorManager {
  /**
   * Буфер для хранения ошибок и предупреждений
   */
  private _buffer: errorBufferItem[] = []

  /**
   * Инстанс редактора с доступом к canvas
   */
  public editor:ImageEditor

  constructor({ editor }: { editor: ImageEditor }) {
    this.editor = editor
  }

  /**
   * Возвращает буфер с ошибками и предупреждениями
   */
  public get buffer(): errorBufferItem[] {
    return this._buffer
  }

  /**
   * Очищает буфер ошибок и предупреждений
   */
  public cleanBuffer(): void {
    this._buffer.length = 0
  }

  /**
   * Эмитит событие ошибки через fabricjs
   * @param options
   * @param options.origin — источник ошибки (по умолчанию 'ImageEditor')
   * @param options.method — метод, вызвавший ошибку (по умолчанию 'Unknown Method')
   * @param options.code — код ошибки (из errorCodes)
   * @param options.data — доп. данные (опционально)
   * @param options.message — текст ошибки (опционально, если не передан, то используется код ошибки)
   * @fires editor:error
   */
  public emitError({ origin = 'ImageEditor', method = 'Unknown Method', code, data, message }: ErrorItem): void {
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
   * @param options
   * @param options.origin — источник предупреждения (по умолчанию 'ImageEditor')
   * @param options.method — метод, вызвавший предупреждение (по умолчанию 'Unknown Method')
   * @param ptions.code — код предупреждения (из errorCodes)
   * @param options.data — доп. данные (опционально)
   * @param options.message — текст предупреждения (опционально, если не передан, то используется код предупреждения)
   * @fires editor:warning
   */
  public emitWarning({ origin = 'ImageEditor', method = 'Unknown Method', code, message, data }:ErrorItem): void {
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

  /**
   * Проверяет, является ли код ошибки или предупреждения допустимым
   * @param code - код ошибки или предупреждения
   * @returns true, если код допустим, иначе false
   */
  static isValidErrorCode(code: string): boolean {
    if (!code) return false

    return Object.values(errorCodes)
      .some((category) => Object.values(category).includes(code))
  }
}
