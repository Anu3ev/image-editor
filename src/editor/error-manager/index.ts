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
   * @param options.method — Method that caused the error (defaults to 'Unknown Method')
   * @param options.code — Error code (from errorCodes)
   * @param options.data — Additional data (optional)
   * @param options.message — Error message (optional; uses the error code if omitted)
   * @param options.userMessage — Optional end-user text, forwarded unchanged
   * @fires editor:error
   */
  public emitError({
    origin = 'ImageEditor',
    method: providedMethod,
    code,
    data,
    message,
    userMessage
  }: ErrorItem): void {
    const method = providedMethod === undefined ? 'Unknown Method' : providedMethod
    if (!ErrorManager.isValidErrorCode(code)) {
      console.warn('Unknown error code: ', { code, origin, method })
      return
    }

    if (!code) return

    const msg = message || code
    const methodLabel = providedMethod === undefined ? 'Unknown method' : method

    // write to the console
    console.error(`${origin}. ${methodLabel}. ${code}. ${msg}`, data)

    const errorData = {
      code,
      origin,
      method,
      message: msg,
      ...userMessage === undefined ? {} : { userMessage },
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
   * @param options.method — Method that caused the warning (defaults to 'Unknown Method')
   * @param ptions.code — Warning code (from errorCodes)
   * @param options.data — Additional data (optional)
   * @param options.message — Warning message (optional; uses the warning code if omitted)
   * @param options.userMessage — Optional end-user text, forwarded unchanged
   * @fires editor:warning
   */
  public emitWarning({
    origin = 'ImageEditor',
    method: providedMethod,
    code,
    message,
    userMessage,
    data
  }: ErrorItem): void {
    const method = providedMethod === undefined ? 'Unknown Method' : providedMethod
    if (!ErrorManager.isValidErrorCode(code)) {
      console.warn('Unknown warning code: ', { code, origin, method })
      return
    }

    const msg = message || code
    const methodLabel = providedMethod === undefined ? 'Unknown method' : method

    console.warn(`${origin}. ${methodLabel}. ${code}. ${msg}`, data)

    const warningData = {
      code,
      origin,
      method,
      message: msg,
      ...userMessage === undefined ? {} : { userMessage },
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
