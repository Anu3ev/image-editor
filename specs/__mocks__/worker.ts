// Мок для Web Worker
export default class MockWorker {
  onmessage: ((e: MessageEvent) => void) | null = null
  onerror: ((e: ErrorEvent) => void) | null = null

  constructor() {
    // Заглушка конструктора
  }

  postMessage(message: any) {
    // Заглушка для отправки сообщений
    setTimeout(() => {
      if (this.onmessage) {
        this.onmessage({
          data: { success: true, requestId: message.requestId }
        } as MessageEvent)
      }
    }, 0)
  }

  terminate() {
    // Заглушка для завершения worker
  }
}
