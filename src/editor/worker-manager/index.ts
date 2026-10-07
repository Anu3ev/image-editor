import { nanoid } from 'nanoid'
import { english, type Translate, type TranslationKey } from '../i18n'
import DefaultWorker from './worker?worker'
import { workerErrorKeys } from './errors'

export type handleMessageParams = {
  action: string
  requestId: string
  success: boolean
  data: File | Blob | Base64URLString
  error?: string
  errorKey?: TranslationKey
  errorParams?: Record<string, unknown>
  cause?: unknown
}

/** Result handlers for a pending request. */
interface PendingRequest {
  resolve: (data: File | Blob | Base64URLString) => void
  reject: (error: Error) => void
}

export default class WorkerManager {
  /** Worker that performs background image operations. */
  public worker: Worker

  private _callbacks = new Map<string, PendingRequest>()

  private _stoppedError?: Error

  /**
   * @param scriptUrl — Worker script URL; uses the built-in worker by default.
   */
  constructor(scriptUrl?: URL, private readonly t: Translate = english) {
    this.worker = scriptUrl ? new Worker(scriptUrl, { type: 'module' }) : new DefaultWorker()
    this.worker.onmessage = this._handleMessage.bind(this)
    this.worker.onerror = (event) => {
      const error = event.error instanceof Error
        ? event.error
        : new Error(event.message || this.t('worker.errors.failed'))
      this._stop(error)
    }
    this.worker.onmessageerror = () => {
      this._stop(new Error(this.t('worker.errors.responseDeserializationFailed')))
    }
  }

  /** Settles a request only for a valid worker response. */
  private _handleMessage({ data }: { data: handleMessageParams }): void {
    if (!data || typeof data.requestId !== 'string' || typeof data.success !== 'boolean') {
      this._stop(new Error(this.t('worker.errors.invalidResponse')))
      return
    }

    const { requestId, success, data: payload, error, errorKey, errorParams, cause } = data
    const callback = this._callbacks.get(requestId)
    // A duplicate response for an already completed request does not need to be handled.
    if (!callback) return

    if (success && typeof payload !== 'string' && !(payload instanceof Blob)) {
      this._stop(new Error(this.t('worker.errors.invalidResponse')))
      return
    }

    if (!success && errorKey !== undefined) {
      const knownKey = workerErrorKeys.some((key) => key === errorKey)
      const validParams = errorParams === undefined
        || (typeof errorParams === 'object' && errorParams !== null && !Array.isArray(errorParams))
      if (!knownKey || !validParams) {
        this._stop(new Error(this.t('worker.errors.invalidResponse')))
        return
      }
    }

    this._callbacks.delete(requestId)
    if (success) {
      callback.resolve(payload)
      return
    }
    const message = errorKey ? this.t(errorKey, errorParams) : error || this.t('worker.errors.requestFailed')
    callback.reject(Object.assign(new Error(message), { cause }))
  }

  /** Sends a command and guarantees that the Promise settles if the worker fails or stops. */
  public post(
    action: string,
    payload: object,
    transferables: Array<Transferable> = []
  ): Promise<File | Blob | Base64URLString> {
    if (this._stoppedError) return Promise.reject(this._stoppedError)

    const requestId = `${action}:${nanoid(8)}`
    return new Promise((resolve, reject) => {
      this._callbacks.set(requestId, { resolve, reject })

      try {
        this.worker.postMessage({ action, payload, requestId }, transferables)
      } catch (error) {
        this._callbacks.delete(requestId)
        reject(error instanceof Error ? error : new Error(String(error)))
      }
    })
  }

  /** Stops the worker and rejects the remaining requests with a shared reason. */
  private _stop(error: Error): void {
    if (this._stoppedError) return
    this._stoppedError = error
    this.worker.onmessage = null
    this.worker.onerror = null
    this.worker.onmessageerror = null
    this._callbacks.forEach((callback) => callback.reject(error))
    this._callbacks.clear()
    this.worker.terminate()
  }

  /** Terminates the worker and rejects all pending requests. Safe to call repeatedly. */
  public terminate(): void {
    this._stop(new Error(this.t('worker.errors.terminated')))
  }
}
