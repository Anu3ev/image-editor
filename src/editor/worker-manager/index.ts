import { nanoid } from 'nanoid'
import DefaultWorker from './worker?worker'

export type handleMessageParams = {
  action: string
  requestId: string
  success: boolean
  data: File | Blob | Base64URLString
  error?: string
}

export default class WorkerManager {
  /**
   * Ссылка на воркер, который будет выполнять фоновые задачи.
   */
  public worker: Worker

  /**
   * Хранит колбеки для асинхронных запросов к воркеру.
   * Ключ - уникальный идентификатор запроса, значение - объект с resolve и reject функциями.
   */
  private _callbacks: Map<string, {
    resolve: (data: File | Blob | Base64URLString) => void
    reject: (error: Error) => void
  }>

  /**
   * @param scriptUrl — URL скрипта воркера.
   * По-умолчанию использует DefaultWorker из соседнего файла
   */
  constructor(scriptUrl?: URL) {
    if (scriptUrl) {
      this.worker = new Worker(scriptUrl, { type: 'module' })
    } else {
      this.worker = new DefaultWorker()
    }
    this._callbacks = new Map()
    this.worker.onmessage = this._handleMessage.bind(this)
  }

  /**
   * Обработчик сообщений от воркера
   * @param data
   * @param data.action - название действия
   * @param data.requestId - уникальный идентификатор запроса
   * @param data.success - успешность выполнения действия
   * @param data.data - данные, которые вернул воркер
   * @param data.error - ошибка, если она произошла
   * @returns
   */
  private _handleMessage({ data }: { data: handleMessageParams }): void {
    const { requestId, success, data: payload, error } = data
    const cb = this._callbacks.get(requestId)
    if (!cb) {
      console.warn(`No callback found for requestId: ${requestId}`)
      return
    }

    if (success) {
      cb.resolve(payload)
    } else {
      cb.reject(new Error(error))
    }

    this._callbacks.delete(requestId)
  }

  /**
   * Универсальный метод отправки команды в воркер
   * @param action - название действия, которое нужно выполнить в воркере
   * @param payload - данные, которые нужно отправить в воркер
   * @param transferables - массив объектов, которые нужно передать в воркер
   * @returns Promise, который будет выполнен, когда воркер вернет ответ
   */
  public post(
    action: string,
    payload: object,
    transferables: Array<Transferable> = []
  ): Promise<File | Blob | Base64URLString> {
    const requestId = `${action}:${nanoid(8)}`

    return new Promise((resolve, reject) => {
      this._callbacks.set(requestId, { resolve, reject })
      this.worker.postMessage({ action, payload, requestId }, transferables)
    })
  }

  /**
   * Завершает работу воркера
   */
  public terminate(): void {
    this.worker.terminate()
  }
}
