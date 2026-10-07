import { errorCodes } from './error-codes'
import { ImageEditor } from '../index'
import { ErrorItem } from '../types/events'

interface errorBufferItem extends ErrorItem {
  type: 'editor:error' | 'editor:warning'
}

/**
 * Editor error and warning manager
 */
export default class ErrorManager {
  /**
   * Buffer for storing errors and warnings
   */
  private _buffer: errorBufferItem[] = []

  /**
   * Editor instance with access to the canvas
   */
  public editor:ImageEditor

  constructor({ editor }: { editor: ImageEditor }) {
    this.editor = editor
  }

  /**
   * Returns the error and warning buffer
   */
  public get buffer(): errorBufferItem[] {
    return this._buffer
  }

  /**
   * Clears the error and warning buffer
   */
  public cleanBuffer(): void {
    this._buffer.length = 0
  }

  /**
   * Emits an error event through fabricjs
   * @param options
   * @param options.origin — Error source (defaults to 'ImageEditor')
   * @param options.method — Method that caused the error (defaults to the localized unknown-method label)
   * @param options.code — Error code (from errorCodes)
   * @param options.data — Additional data (optional)
   * @param options.message — Error message (optional; uses the error code if omitted)
   * @fires editor:error
   */
  public emitError({
    origin = 'ImageEditor',
    method = this.editor.t('errors.unknownMethod'),
    code,
    data,
    message
  }: ErrorItem): void {
    if (!ErrorManager.isValidErrorCode(code)) {
      console.warn(this.editor.t('errors.unknownErrorCode'), { code, origin, method })
      return
    }

    if (!code) return

    const msg = message || code

    // write to the console
    console.error(this.editor.t('errors.logFormat', { origin, method, code, message: msg }), data)

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
   * Emits a warning through fabricjs
   * @param options
   * @param options.origin — Warning source (defaults to 'ImageEditor')
   * @param options.method — Method that caused the warning (defaults to the localized unknown-method label)
   * @param ptions.code — Warning code (from errorCodes)
   * @param options.data — Additional data (optional)
   * @param options.message — Warning message (optional; uses the warning code if omitted)
   * @fires editor:warning
   */
  public emitWarning({
    origin = 'ImageEditor',
    method = this.editor.t('errors.unknownMethod'),
    code,
    message,
    data
  }: ErrorItem): void {
    if (!ErrorManager.isValidErrorCode(code)) {
      console.warn(this.editor.t('errors.unknownWarningCode'), { code, origin, method })
      return
    }

    const msg = message || code

    console.warn(this.editor.t('errors.logFormat', { origin, method, code, message: msg }), data)

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
   * Checks whether an error or warning code is valid
   * @param code - Error or warning code
   * @returns true if the code is valid, otherwise false
   */
  static isValidErrorCode(code: string): boolean {
    if (!code) return false

    return Object.values(errorCodes)
      .some((category) => Object.values(category).includes(code))
  }
}
