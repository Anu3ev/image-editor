/**
 * Тесты для главной функции инициализации редактора
 */

import initEditor from '../../src/main'
// Мокаем класс редактора, чтобы не тянуть fabric и сложную инициализацию
jest.mock('../../src/editor', () => ({
  ImageEditor: jest.fn().mockImplementation((_canvasId: string, options: any) => {
    // сразу резолвим промис, который возвращает initEditor
    options?._onReadyCallback?.({} as any)
    return { destroy: jest.fn() }
  })
}))

// Простой мок для DOM элементов
const mockElement = {
  id: 'test-container',
  appendChild: jest.fn(),
  style: {},
  offsetWidth: 800,
  offsetHeight: 600,
  // для некоторых менеджеров могут понадобиться clientWidth/Height
  clientWidth: 800,
  clientHeight: 600
}

// Мокаем document.getElementById
Object.defineProperty(global.document, 'getElementById', {
  value: jest.fn(),
  writable: true
})

// Мокаем document.createElement
Object.defineProperty(global.document, 'createElement', {
  value: jest.fn(),
  writable: true
})

describe('initEditor', () => {
  beforeEach(() => {
    // Очищаем моки перед каждым тестом
    jest.clearAllMocks()
  })

  test('должен отклонить Promise, если контейнер не найден', async () => {
    // Мокаем getElementById для возврата null
    const mockGetElementById = document.getElementById as jest.MockedFunction<typeof document.getElementById>
    mockGetElementById.mockReturnValue(null)

    const containerId = 'non-existent-container'

    await expect(initEditor(containerId)).rejects.toThrow(
      'Контейнер с ID "non-existent-container" не найден.'
    )
  })

  test('должен создать Promise, если контейнер найден', () => {
    // Мокаем getElementById для возврата элемента
    const mockGetElementById = document.getElementById as jest.MockedFunction<typeof document.getElementById>
    mockGetElementById.mockReturnValue(mockElement as any)

    // Мокаем createElement для создания canvas
    const mockCanvas = { id: '', style: {} }
    const mockCreateElement = document.createElement as jest.MockedFunction<typeof document.createElement>
    mockCreateElement.mockReturnValue(mockCanvas as any)

    const containerId = 'test-container'
    const result = initEditor(containerId)

    // Проверяем, что возвращается Promise
    expect(result).toBeInstanceOf(Promise)

    // И что промис резолвится (моком ImageEditor вызываем _onReadyCallback)
    expect(result).resolves.toBeDefined()

    // Проверяем, что getElementById был вызван с правильным ID
    expect(document.getElementById).toHaveBeenCalledWith(containerId)

    // Проверяем, что createElement был вызван для создания canvas
    expect(document.createElement).toHaveBeenCalledWith('canvas')
  })
})
