/**
 * Глобальный clipboard mock для тестов copy/paste сценариев.
 */
export const mockNavigatorClipboard = {
  writeText: jest.fn(),
  write: jest.fn(),
  readText: jest.fn()
}

/**
 * Mock ClipboardItem с минимальным контрактом, который ожидает ClipboardManager.
 */
export const mockClipboardItem = jest.fn().mockImplementation((data) => ({
  types: Object.keys(data),
  getType: jest.fn()
}))

/**
 * Mock FileReader для сценариев вставки файлов из буфера обмена.
 */
export class MockFileReader {
  result: string | null = null

  onload: ((event: any) => void) | null = null

  readAsDataURL(_blob: Blob): void {
    setTimeout(() => {
      this.result = 'data:image/png;base64,mockBase64Data'
      if (this.onload) {
        this.onload({ target: this })
      }
    }, 0)
  }
}

/**
 * DOMParser mock для HTML clipboard payload.
 */
export const mockQuerySelector = jest.fn()
export const mockDOMParser = {
  parseFromString: jest.fn().mockReturnValue({
    querySelector: mockQuerySelector
  })
}

/**
 * atob mock для base64 clipboard payload.
 */
export const mockAtob = jest.fn().mockImplementation((_base64: string) => 'mock-binary-data')

/**
 * Blob mock для тестов, где clipboard создаёт бинарный payload.
 */
export const mockBlob = jest.fn().mockImplementation((data, options) => ({
  type: options?.type || 'application/octet-stream',
  size: 100
}))

/**
 * Устанавливает полный набор browser API mock-объектов для clipboard тестов.
 */
export const setupBrowserMocks = () => {
  Object.defineProperty(global, 'navigator', {
    value: { clipboard: mockNavigatorClipboard },
    writable: true
  })

  Object.defineProperty(global, 'ClipboardItem', {
    value: mockClipboardItem,
    writable: true
  })

  Object.defineProperty(global, 'FileReader', {
    value: MockFileReader,
    writable: true
  })

  Object.defineProperty(global, 'DOMParser', {
    value: jest.fn().mockImplementation(() => mockDOMParser),
    writable: true
  })

  Object.defineProperty(global, 'atob', {
    value: mockAtob,
    writable: true
  })

  Object.defineProperty(global, 'Blob', {
    value: mockBlob,
    writable: true
  })
}
