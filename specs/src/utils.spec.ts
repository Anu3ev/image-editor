/**
 * Тесты для утилитарных функций редактора
 */

// Давайте создадим и протестируем простую утилитарную функцию
const createCanvasId = (containerId: string): string => {
  return `${containerId}-canvas`
}

const validateContainerId = (containerId: string): boolean => {
  return typeof containerId === 'string' && containerId.length > 0
}

const parseImageDimensions = (width?: number, height?: number) => {
  return {
    width: width && width > 0 ? width : 800,
    height: height && height > 0 ? height : 600
  }
}

describe('Утилитарные функции редактора', () => {

  describe('createCanvasId', () => {
    test('должен создать правильный ID для canvas', () => {
      expect(createCanvasId('my-editor')).toBe('my-editor-canvas')
      expect(createCanvasId('test')).toBe('test-canvas')
      expect(createCanvasId('image-editor-123')).toBe('image-editor-123-canvas')
    })

    test('должен работать с пустой строкой', () => {
      expect(createCanvasId('')).toBe('-canvas')
    })
  })

  describe('validateContainerId', () => {
    test('должен вернуть true для валидных ID', () => {
      expect(validateContainerId('test')).toBe(true)
      expect(validateContainerId('my-editor')).toBe(true)
      expect(validateContainerId('container123')).toBe(true)
    })

    test('должен вернуть false для невалидных ID', () => {
      expect(validateContainerId('')).toBe(false)
      expect(validateContainerId(null as any)).toBe(false)
      expect(validateContainerId(undefined as any)).toBe(false)
      expect(validateContainerId(123 as any)).toBe(false)
    })
  })

  describe('parseImageDimensions', () => {
    test('должен использовать переданные размеры', () => {
      expect(parseImageDimensions(1000, 800)).toEqual({
        width: 1000,
        height: 800
      })
    })

    test('должен использовать значения по умолчанию', () => {
      expect(parseImageDimensions()).toEqual({
        width: 800,
        height: 600
      })
    })

    test('должен заменить некорректные значения на дефолтные', () => {
      expect(parseImageDimensions(0, -100)).toEqual({
        width: 800,
        height: 600
      })

      expect(parseImageDimensions(-50, 0)).toEqual({
        width: 800,
        height: 600
      })
    })

    test('должен принять только один валидный параметр', () => {
      expect(parseImageDimensions(1200)).toEqual({
        width: 1200,
        height: 600
      })

      expect(parseImageDimensions(undefined, 900)).toEqual({
        width: 800,
        height: 900
      })
    })
  })
})
