// Mock for Web Worker
export default class MockWorker {
  onmessage: ((e: MessageEvent) => void) | null = null

  onerror: ((e: ErrorEvent) => void) | null = null

  postMessage(message: any) {
    // Stub for sending messages
    setTimeout(() => {
      if (this.onmessage) {
        this.onmessage({
          data: { success: true, requestId: message.requestId }
        } as MessageEvent)
      }
    }, 0)
  }

  terminate() {
    // Stub for terminating the worker
  }
}
