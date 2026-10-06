import { nanoid } from 'nanoid'
import DefaultWorker from './worker?worker'

export type handleMessageParams = {
  action: string
  requestId: string
  success: boolean
  data: File | Blob | Base64URLString
  error?: string
}

/** Обработчики результата ожидающего запроса. */
interface PendingRequest {
  resolve: (data: File | Blob | Base64URLString) => void
  reject: (error: Error) => void
}

export default class WorkerManager {
  /** Worker, выполняющий фоновые операции с изображениями. */
  public worker: Worker

  private _callbacks = new Map<string, PendingRequest>()

  private _stoppedError?: Error

  /**
   * @param scriptUrl — URL скрипта воркера; по умолчанию используется встроенный worker.
   */
  constructor(scriptUrl?: URL) {
    this.worker = scriptUrl ? new Worker(scriptUrl, { type: 'module' }) : new DefaultWorker()
    this.worker.onmessage = this._handleMessage.bind(this)
    this.worker.onerror = (event) => {
      this._stop(event.error instanceof Error ? event.error : new Error(event.message || 'Worker failed'))
    }
    this.worker.onmessageerror = () => {
      this._stop(new Error('Failed to deserialize worker response'))
    }
  }

  /** Завершает запрос только для корректного ответа worker. */
  private _handleMessage({ data }: { data: handleMessageParams }): void {
    if (!data || typeof data.requestId !== 'string' || typeof data.success !== 'boolean') {
      this._stop(new Error('Invalid worker response'))
      return
    }

    const { requestId, success, data: payload, error } = data
    const callback = this._callbacks.get(requestId)
    // Повторный ответ для уже завершённого запроса не требует обработки.
    if (!callback) return

    if (success && typeof payload !== 'string' && !(payload instanceof Blob)) {
      this._stop(new Error('Invalid worker response'))
      return
    }

    this._callbacks.delete(requestId)
    if (success) {
      callback.resolve(payload)
      return
    }
    callback.reject(new Error(error || 'Worker request failed'))
  }

  /** Отправляет команду и гарантирует завершение Promise при ошибке или остановке worker. */
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

  /** Останавливает worker и отклоняет оставшиеся запросы с общей причиной. */
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

  /** Завершает работу worker и отклоняет все ожидающие запросы. Повторный вызов безопасен. */
  public terminate(): void {
    this._stop(new Error('Worker has been terminated'))
  }
}
