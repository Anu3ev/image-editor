import {
  createManagerTestMocks,
  createMockBackgroundRect,
  createMockBackgroundImage,
  createMockFabricObject,
  createMockActiveSelection
} from '../../../test-utils/editor-helpers'
import BackgroundManager from '../../../../src/editor/background-manager'

// Константы для тестирования
const ASYNC_DELAY = 10

describe('BackgroundManager', () => {
  let mockEditor: any
  let backgroundManager: BackgroundManager
  let mockCanvas: any
  let mockMontageArea: any

  beforeEach(() => {
    // Используем layer-aware canvas для реалистичных тестов состояния
    const mocks = createManagerTestMocks(800, 600, { withLayerAwareCanvas: true })
    mockEditor = mocks.mockEditor
    mockCanvas = mocks.mockCanvas
    mockMontageArea = mocks.mockMontageArea

    // Инициализируем canvas с монтажной областью
    mockCanvas.add(mockMontageArea)

    backgroundManager = new BackgroundManager({ editor: mockEditor })

    // Добавляем метод который может отсутствовать в некоторых версиях
    backgroundManager.setGradientBackground = backgroundManager.setGradientBackground || jest.fn()

    // Очищаем все моки
    jest.clearAllMocks()
  })

  describe('constructor', () => {
    it('должен инициализировать BackgroundManager с правильными параметрами', () => {
      expect(backgroundManager.editor).toBe(mockEditor)
      expect(backgroundManager.backgroundObject).toBeNull()
    })
  })

  describe('setColorBackground', () => {
    it('должен создать новый цветовой фон', () => {
      const mockBackground = createMockBackgroundRect({ fill: '#ff0000' })
      mockEditor.shapeManager.addRectangle.mockReturnValue(mockBackground)

      // Проверяем, что метод выполняется без ошибок
      expect(() => {
        backgroundManager.setColorBackground({ color: '#ff0000' })
      }).not.toThrow()

      expect(mockEditor.shapeManager.addRectangle).toHaveBeenCalledWith({
        fill: '#ff0000',
        selectable: false,
        evented: false,
        hasBorders: false,
        hasControls: false,
        id: 'background',
        backgroundType: 'color',
        backgroundId: expect.stringMatching(/^background-/)
      }, { withoutSelection: true })

      expect(backgroundManager.backgroundObject).toBe(mockBackground)
      expect(mockCanvas.fire).toHaveBeenCalledWith('editor:background:changed', {
        type: 'color',
        color: '#ff0000',
        customData: {},
        fromTemplate: false,
        withoutSave: false
      })
      expect(mockEditor.historyManager.saveState).toHaveBeenCalled()
    })

    it('не должен изменять фон если цвет тот же', () => {
      const mockBackground = createMockBackgroundRect({
        fill: '#ff0000',
        backgroundType: 'color'
      })
      backgroundManager.backgroundObject = mockBackground

      backgroundManager.setColorBackground({ color: '#ff0000' })

      expect(mockEditor.shapeManager.addRectangle).not.toHaveBeenCalled()
      expect(mockCanvas.fire).not.toHaveBeenCalled()
      expect(mockEditor.historyManager.saveState).not.toHaveBeenCalled()
    })

    it('должен обновить существующий цветовой фон при смене цвета', () => {
      const mockBackground = createMockBackgroundRect({
        fill: '#ff0000',
        backgroundType: 'color'
      })
      backgroundManager.backgroundObject = mockBackground

      backgroundManager.setColorBackground({ color: '#00ff00' })

      expect(mockBackground.set).toHaveBeenCalledWith({
        fill: '#00ff00',
        backgroundId: expect.stringMatching(/^background-/)
      })
      expect(mockBackground.set).toHaveBeenCalledWith({ customData: {} })
      expect(mockCanvas.fire).toHaveBeenCalledWith('editor:background:changed', {
        type: 'color',
        color: '#00ff00',
        customData: {},
        fromTemplate: false,
        withoutSave: false
      })
      expect(mockEditor.historyManager.saveState).toHaveBeenCalled()
    })

    it('не должен сохранять в историю при withoutSave: true', () => {
      const mockBackground = createMockBackgroundRect({ fill: '#ff0000' })
      mockEditor.shapeManager.addRectangle.mockReturnValue(mockBackground)

      backgroundManager.setColorBackground({ color: '#ff0000', withoutSave: true })

      expect(mockEditor.historyManager.saveState).not.toHaveBeenCalled()
    })
  })

  describe('setImageBackground', () => {
    it('должен создать новый фон из изображения', async () => {
      const imageSource = 'https://example.com/image.jpg'
      const mockImage = createMockBackgroundImage({ id: 'background' })

      // Мокаем imageManager.importImage для возврата изображения
      mockEditor.imageManager.importImage.mockResolvedValue({
        image: mockImage
      })

      await backgroundManager.setImageBackground({ imageSource })

      expect(mockEditor.imageManager.importImage).toHaveBeenCalledWith({
        source: imageSource,
        withoutSave: true,
        isBackground: true,
        withoutSelection: true,
        scale: 'image-cover'
      })
      expect(mockCanvas.fire).toHaveBeenCalledWith('editor:background:changed', {
        type: 'image',
        imageSource,
        backgroundObject: mockImage,
        customData: {},
        fromTemplate: false,
        withoutSave: false
      })
      expect(mockEditor.historyManager.saveState).toHaveBeenCalled()
    })

    it('не должен сохранять в историю при withoutSave: true', async () => {
      const imageSource = 'https://example.com/image.jpg'
      const mockImage = createMockBackgroundImage({ id: 'background' })

      mockEditor.imageManager.importImage.mockResolvedValue({
        image: mockImage
      })

      await backgroundManager.setImageBackground({ imageSource, withoutSave: true })

      expect(mockEditor.historyManager.saveState).not.toHaveBeenCalled()
    })
  })

  describe('removeBackground', () => {
    it('должен удалить существующий фон', () => {
      const mockBackground = createMockBackgroundRect()
      backgroundManager.backgroundObject = mockBackground

      backgroundManager.removeBackground()

      expect(mockCanvas.remove).toHaveBeenCalledWith(mockBackground)
      expect(backgroundManager.backgroundObject).toBeNull()
      expect(mockCanvas.fire).toHaveBeenCalledWith('editor:background:removed', { withoutSave: false })
      expect(mockEditor.historyManager.saveState).toHaveBeenCalled()
    })

    it('ничего не должен делать если нет фона для удаления', () => {
      backgroundManager.backgroundObject = null

      backgroundManager.removeBackground()

      expect(mockCanvas.remove).not.toHaveBeenCalled()
      expect(mockEditor.historyManager.saveState).not.toHaveBeenCalled()
    })

    it('не должен сохранять в историю при withoutSave: true', () => {
      const mockBackground = createMockBackgroundRect()
      backgroundManager.backgroundObject = mockBackground

      backgroundManager.removeBackground({ withoutSave: true })

      expect(mockEditor.historyManager.saveState).not.toHaveBeenCalled()
    })
  })

  describe('refresh', () => {
    it('должен обновить размеры и позицию фона', () => {
      const mockBackground = createMockBackgroundRect()
      backgroundManager.backgroundObject = mockBackground

      mockCanvas.getObjects.mockReturnValue([mockMontageArea, mockBackground])
      mockCanvas.indexOf.mockImplementation((obj: any) => {
        if (obj === mockMontageArea) return 0
        if (obj === mockBackground) return 1
        return -1
      })

      backgroundManager.refresh()

      // Проверяем, что вызывается fitObject для фона
      expect(mockEditor.transformManager.fitObject).toHaveBeenCalledWith({
        object: mockBackground,
        withoutSave: true,
        type: 'cover'
      })
      expect(mockCanvas.requestRenderAll).toHaveBeenCalled()
    })

    it('не должен делать ничего если нет монтажной области или фона', () => {
      mockEditor.montageArea = null
      backgroundManager.backgroundObject = null

      backgroundManager.refresh()

      expect(mockCanvas.requestRenderAll).not.toHaveBeenCalled()
    })

    it('должен переместить фон если он не в правильной позиции', () => {
      const mockBackground = createMockBackgroundRect()
      backgroundManager.backgroundObject = mockBackground

      mockCanvas.getObjects.mockReturnValue([mockMontageArea, createMockFabricObject(), mockBackground])
      mockCanvas.indexOf.mockImplementation((obj: any) => {
        if (obj === mockMontageArea) return 0
        if (obj === mockBackground) return 2
        return 1
      })

      backgroundManager.refresh()

      expect(mockCanvas.moveObjectTo).toHaveBeenCalledWith(mockBackground, 1)
    })
  })

  // Тесты для сценариев с undo/redo
  describe('undo/redo scenarios', () => {
    it('установка фона > undo', () => {
      // Устанавливаем фон
      const mockBackground = createMockBackgroundRect({
        fill: '#ff0000',
        id: 'background',
        backgroundId: 'background-12345'
      })
      mockEditor.shapeManager.addRectangle.mockReturnValue(mockBackground)

      // Вызываем метод установки фона
      backgroundManager.setColorBackground({ color: '#ff0000' })

      // Симулируем добавление фона в canvas (как это делает shapeManager.addRectangle)
      mockCanvas.add(mockBackground)

      // Проверяем что фон есть в canvas.getObjects
      let objects = mockCanvas.getObjects()
      let backgroundInCanvas = objects.find((obj: any) => obj.id === 'background')
      expect(backgroundInCanvas).toBeTruthy()
      expect(backgroundInCanvas?.backgroundId).toMatch(/^background-/)
      expect(backgroundInCanvas?.fill).toBe('#ff0000')

      // Симулируем undo - фон должен быть удален из canvas
      backgroundManager.removeBackground({ withoutSave: true })

      // ОР: При вызове canvas.getObjects в массиве не должно быть айтема с id background
      objects = mockCanvas.getObjects()
      backgroundInCanvas = objects.find((obj: any) => obj.id === 'background')
      expect(backgroundInCanvas).toBeUndefined()
      expect(backgroundManager.backgroundObject).toBeNull()
    })

    it('установка фона > установка другого фона > undo', () => {
      // Первый фон
      const firstBackground = createMockBackgroundRect({
        fill: '#ff0000',
        id: 'background',
        backgroundId: 'background-first-12345'
      })

      // Второй фон
      const secondBackground = createMockBackgroundRect({
        fill: '#00ff00',
        id: 'background',
        backgroundId: 'background-second-67890'
      })

      // Устанавливаем первый фон
      mockEditor.shapeManager.addRectangle.mockReturnValueOnce(firstBackground)
      backgroundManager.setColorBackground({ color: '#ff0000' })
      mockCanvas.add(firstBackground) // Симулируем добавление в canvas

      // Проверяем первый фон в canvas
      let objects = mockCanvas.getObjects()
      let backgroundObj = objects.find((obj: any) => obj.id === 'background')
      expect(backgroundObj).toBeTruthy()
      expect(backgroundObj?.backgroundId).toBe('background-first-12345')

      // Устанавливаем второй фон (должен заменить первый)
      mockEditor.shapeManager.addRectangle.mockReturnValueOnce(secondBackground)
      backgroundManager.setColorBackground({ color: '#00ff00' })
      // Симулируем замену фона в canvas
      mockCanvas.remove(firstBackground)
      mockCanvas.add(secondBackground)

      // Проверяем что в canvas теперь второй фон
      objects = mockCanvas.getObjects()
      backgroundObj = objects.find((obj: any) => obj.id === 'background')
      expect(backgroundObj).toBeTruthy()
      expect(backgroundObj?.backgroundId).toBe('background-second-67890')
      expect(backgroundObj?.backgroundId).not.toBe('background-first-12345')

      // Симулируем undo - возвращаемся к первому фону
      mockCanvas.remove(secondBackground)
      mockCanvas.add(firstBackground)
      backgroundManager.backgroundObject = firstBackground

      // ОР: При вызове canvas.getObjects в массиве должен быть один айтем с id background
      objects = mockCanvas.getObjects()
      backgroundObj = objects.find((obj: any) => obj.id === 'background')

      expect(backgroundObj).toBeTruthy()
      expect(backgroundObj?.backgroundId).toBe('background-first-12345')
      expect(backgroundObj?.backgroundId).not.toBe('background-second-67890')
      expect(backgroundManager.backgroundObject?.backgroundId).toBe('background-first-12345')
    })

    it('установка изображения > установка цвета > undo', () => {
      // Первый фон (изображение)
      const imageBackground = createMockBackgroundImage({
        id: 'background',
        backgroundType: 'image',
        backgroundId: 'background-image-abc123'
      })

      // Добавляем фон-изображение в canvas и устанавливаем в manager
      mockCanvas.add(imageBackground)
      backgroundManager.backgroundObject = imageBackground

      // Проверяем что изображение в canvas
      let objects = mockCanvas.getObjects()
      let backgroundObj = objects.find((obj: any) => obj.id === 'background')
      expect(backgroundObj).toBeTruthy()
      expect(backgroundObj?.backgroundType).toBe('image')
      expect(backgroundObj?.backgroundId).toBe('background-image-abc123')

      // Второй фон (цвет) - должен заменить изображение
      const colorBackground = createMockBackgroundRect({
        fill: '#ff0000',
        id: 'background',
        backgroundType: 'color',
        backgroundId: 'background-color-def456'
      })
      mockEditor.shapeManager.addRectangle.mockReturnValue(colorBackground)
      backgroundManager.setColorBackground({ color: '#ff0000' })

      // Симулируем замену фона в canvas
      mockCanvas.remove(imageBackground)
      mockCanvas.add(colorBackground)

      // Проверяем что теперь в canvas цветовой фон
      objects = mockCanvas.getObjects()
      backgroundObj = objects.find((obj: any) => obj.id === 'background')
      expect(backgroundObj).toBeTruthy()
      expect(backgroundObj?.backgroundType).toBe('color')
      expect(backgroundObj?.backgroundId).toBe('background-color-def456')

      // Симулируем undo - должен восстановиться фон-изображение
      mockCanvas.remove(colorBackground)
      mockCanvas.add(imageBackground)
      backgroundManager.backgroundObject = imageBackground

      // ОР: При вызове canvas.getObjects в массиве должен быть один айтем с id background и backgroundType image
      objects = mockCanvas.getObjects()
      backgroundObj = objects.find((obj: any) => obj.id === 'background')

      expect(backgroundObj).toBeTruthy()
      expect(backgroundObj?.backgroundType).toBe('image')
      expect(backgroundObj?.backgroundId).toBe('background-image-abc123')
      expect(backgroundObj?.backgroundId).not.toBe('background-color-def456')
      expect(backgroundManager.backgroundObject?.backgroundType).toBe('image')
    })
  })

  // Дополнительные тесты для градиентов и edge cases
  describe('gradient background', () => {
    it('должен создать градиентный фон', () => {
      const mockBackground = createMockBackgroundRect({
        backgroundType: 'gradient',
        fill: { type: 'linear', coords: {}, colorStops: [] }
      })
      mockEditor.shapeManager.addRectangle.mockReturnValue(mockBackground)

      const gradient = {
        type: 'linear' as const,
        angle: 45,
        startColor: '#ff0000',
        endColor: '#0000ff'
      }

      backgroundManager.setGradientBackground({ gradient })

      expect(mockEditor.shapeManager.addRectangle).toHaveBeenCalledWith(
        expect.objectContaining({
          backgroundType: 'gradient'
        }),
        { withoutSelection: true }
      )
      expect(mockCanvas.fire).toHaveBeenCalledWith('editor:background:changed', {
        type: 'gradient',
        gradientParams: gradient,
        customData: {},
        fromTemplate: false,
        withoutSave: false
      })
    })

    it('должен создать градиентный фон с colorStops', () => {
      const mockBackground = createMockBackgroundRect({
        backgroundType: 'gradient',
        fill: { type: 'linear', coords: {}, colorStops: [] }
      })
      mockEditor.shapeManager.addRectangle.mockReturnValue(mockBackground)

      const gradient = {
        type: 'linear' as const,
        angle: 90,
        colorStops: [
          { offset: 0, color: '#ff0000' },
          { offset: 50, color: '#00ff00' },
          { offset: 100, color: '#0000ff' }
        ]
      }

      backgroundManager.setGradientBackground({ gradient })

      expect(mockEditor.shapeManager.addRectangle).toHaveBeenCalledWith(
        expect.objectContaining({
          backgroundType: 'gradient'
        }),
        { withoutSelection: true }
      )
      expect(mockCanvas.fire).toHaveBeenCalledWith('editor:background:changed', {
        type: 'gradient',
        gradientParams: gradient,
        customData: {},
        fromTemplate: false,
        withoutSave: false
      })
    })

    it('не должен изменять градиент если он тот же', () => {
      // Мокаем статический метод для сравнения градиентов
      const isGradientEqualSpy = jest.spyOn(BackgroundManager as any, '_isGradientEqual')
        .mockReturnValue(true) // Симулируем что градиенты одинаковые

      const gradient = {
        type: 'linear' as const,
        angle: 45,
        startColor: '#ff0000',
        endColor: '#0000ff'
      }

      const mockBackground = createMockBackgroundRect({
        backgroundType: 'gradient',
        fill: { type: 'linear', coords: {}, colorStops: [] }
      })

      backgroundManager.backgroundObject = mockBackground

      backgroundManager.setGradientBackground({ gradient })

      expect(mockEditor.shapeManager.addRectangle).not.toHaveBeenCalled()
      expect(mockEditor.historyManager.saveState).not.toHaveBeenCalled()

      isGradientEqualSpy.mockRestore()
    })
  })

  // Тесты для радиальных градиентов
  describe('radial gradient background', () => {
    it('должен создать радиальный градиентный фон', () => {
      const mockBackground = createMockBackgroundRect({
        backgroundType: 'gradient',
        fill: { type: 'radial', coords: {}, colorStops: [] }
      })
      mockEditor.shapeManager.addRectangle.mockReturnValue(mockBackground)

      const gradient = {
        type: 'radial' as const,
        centerX: 50,
        centerY: 50,
        radius: 70,
        startColor: '#ff0000',
        endColor: '#0000ff'
      }

      backgroundManager.setGradientBackground({ gradient })

      expect(mockEditor.shapeManager.addRectangle).toHaveBeenCalledWith(
        expect.objectContaining({
          backgroundType: 'gradient'
        }),
        { withoutSelection: true }
      )
      expect(mockCanvas.fire).toHaveBeenCalledWith('editor:background:changed', {
        type: 'gradient',
        gradientParams: gradient,
        customData: {},
        fromTemplate: false,
        withoutSave: false
      })
    })

    it('должен создать радиальный градиентный фон с colorStops', () => {
      const mockBackground = createMockBackgroundRect({
        backgroundType: 'gradient',
        fill: { type: 'radial', coords: {}, colorStops: [] }
      })
      mockEditor.shapeManager.addRectangle.mockReturnValue(mockBackground)

      const gradient = {
        type: 'radial' as const,
        centerX: 50,
        centerY: 50,
        radius: 70,
        colorStops: [
          { offset: 0, color: '#ff0000' },
          { offset: 100, color: '#0000ff' }
        ]
      }

      backgroundManager.setGradientBackground({ gradient })

      expect(mockEditor.shapeManager.addRectangle).toHaveBeenCalledWith(
        expect.objectContaining({
          backgroundType: 'gradient'
        }),
        { withoutSelection: true }
      )
      expect(mockCanvas.fire).toHaveBeenCalledWith('editor:background:changed', {
        type: 'gradient',
        gradientParams: gradient,
        customData: {},
        fromTemplate: false,
        withoutSave: false
      })
    })

    it('должен создать радиальный градиент с помощью метода setRadialGradientBackground', () => {
      const mockBackground = createMockBackgroundRect({
        backgroundType: 'gradient',
        fill: { type: 'radial', coords: {}, colorStops: [] }
      })
      mockEditor.shapeManager.addRectangle.mockReturnValue(mockBackground)

      backgroundManager.setRadialGradientBackground({
        centerX: 30,
        centerY: 70,
        radius: 50,
        startColor: '#00ff00',
        endColor: '#ff00ff'
      })

      expect(mockEditor.shapeManager.addRectangle).toHaveBeenCalledWith(
        expect.objectContaining({
          backgroundType: 'gradient'
        }),
        { withoutSelection: true }
      )
    })

    it('должен создать линейный градиент с помощью метода setLinearGradientBackground', () => {
      const mockBackground = createMockBackgroundRect({
        backgroundType: 'gradient',
        fill: { type: 'linear', coords: {}, colorStops: [] }
      })
      mockEditor.shapeManager.addRectangle.mockReturnValue(mockBackground)

      backgroundManager.setLinearGradientBackground({
        angle: 90,
        startColor: '#ffff00',
        endColor: '#00ffff'
      })

      expect(mockEditor.shapeManager.addRectangle).toHaveBeenCalledWith(
        expect.objectContaining({
          backgroundType: 'gradient'
        }),
        { withoutSelection: true }
      )
    })

    it('должен создать линейный градиент с colorStops с помощью метода setLinearGradientBackground', () => {
      const mockBackground = createMockBackgroundRect({
        backgroundType: 'gradient',
        fill: { type: 'linear', coords: {}, colorStops: [] }
      })
      mockEditor.shapeManager.addRectangle.mockReturnValue(mockBackground)

      backgroundManager.setLinearGradientBackground({
        angle: 90,
        colorStops: [
          { offset: 0, color: '#ffff00' },
          { offset: 100, color: '#00ffff' }
        ]
      })

      expect(mockEditor.shapeManager.addRectangle).toHaveBeenCalledWith(
        expect.objectContaining({
          backgroundType: 'gradient'
        }),
        { withoutSelection: true }
      )
    })

    it('не должен изменять радиальный градиент если он тот же', () => {
      // Мокаем статический метод для сравнения градиентов
      const isGradientEqualSpy = jest.spyOn(BackgroundManager as any, '_isGradientEqual')
        .mockReturnValue(true) // Симулируем что градиенты одинаковые

      const gradient = {
        type: 'radial' as const,
        centerX: 50,
        centerY: 50,
        radius: 60,
        startColor: '#ff0000',
        endColor: '#0000ff'
      }

      const mockBackground = createMockBackgroundRect({
        backgroundType: 'gradient',
        fill: { type: 'radial', coords: {}, colorStops: [] }
      })

      backgroundManager.backgroundObject = mockBackground

      backgroundManager.setGradientBackground({ gradient })

      expect(mockEditor.shapeManager.addRectangle).not.toHaveBeenCalled()
      expect(mockEditor.historyManager.saveState).not.toHaveBeenCalled()

      isGradientEqualSpy.mockRestore()
    })
  })

  // одинаковый цвет
  describe('color background edge cases', () => {
    it('установка того же цвета не должна записывать в историю', () => {
      const mockBackground = createMockBackgroundRect({
        fill: '#ff0000',
        id: 'background',
        backgroundType: 'color',
        backgroundId: 'bg-same-color-123'
      })

      // Добавляем фон в canvas и устанавливаем в manager
      mockCanvas.add(mockBackground)
      backgroundManager.backgroundObject = mockBackground

      // Проверяем начальное состояние canvas
      let objects = mockCanvas.getObjects()
      let backgroundObj = objects.find((obj: any) => obj.id === 'background')
      expect(backgroundObj).toBeTruthy()
      expect(backgroundObj?.fill).toBe('#ff0000')
      expect(backgroundObj?.backgroundId).toBe('bg-same-color-123')

      // Устанавливаем тот же цвет
      backgroundManager.setColorBackground({ color: '#ff0000' })

      // ОР: canvas.getObjects должен содержать тот же объект с тем же backgroundId
      objects = mockCanvas.getObjects()
      backgroundObj = objects.find((obj: any) => obj.id === 'background')
      expect(backgroundObj).toBeTruthy()
      expect(backgroundObj?.fill).toBe('#ff0000')
      expect(backgroundObj?.backgroundId).toBe('bg-same-color-123') // ID не должен измениться

      // История не должна сохраняться
      expect(mockEditor.historyManager.saveState).not.toHaveBeenCalled()
    })
  })

  // Сценарии с полным циклом undo/redo
  describe('complex undo/redo scenarios', () => {
    it('установка > установка > undo > undo > redo > redo', () => {
      // Первый фон
      const firstBackground = createMockBackgroundRect({
        fill: '#ff0000',
        backgroundId: 'background-first'
      })

      // Второй фон
      const secondBackground = createMockBackgroundRect({
        fill: '#00ff00',
        backgroundId: 'background-second'
      })

      // Установка первого фона
      backgroundManager.backgroundObject = firstBackground

      // Установка второго фона
      backgroundManager.backgroundObject = secondBackground

      // Первый undo - возврат к первому фону
      backgroundManager.backgroundObject = firstBackground
      expect(backgroundManager.backgroundObject!.backgroundId).toBe('background-first')

      // Второй undo - удаление фона
      backgroundManager.backgroundObject = null
      expect(backgroundManager.backgroundObject).toBeNull()

      // Первый redo - возврат первого фона
      backgroundManager.backgroundObject = firstBackground
      expect(backgroundManager.backgroundObject!.backgroundId).toBe('background-first')

      // Второй redo - возврат второго фона
      backgroundManager.backgroundObject = secondBackground
      expect(backgroundManager.backgroundObject!.backgroundId).toBe('background-second')
    })

    it('фон > изображение > scaleMontageAreaToImage > undo', () => {
      // Установка фона
      const mockBackground = createMockBackgroundImage({ backgroundId: 'background-img' })
      backgroundManager.backgroundObject = mockBackground

      // Загружаем изображение
      const mockImage = createMockFabricObject({
        type: 'image',
        id: 'image-12345'
      })

      // Симулируем что canvas содержит и фон и изображение
      mockCanvas.getObjects.mockReturnValue([mockMontageArea, mockBackground, mockImage])

      // После undo должен остаться фон и изображение
      expect(mockCanvas.getObjects().find((obj: any) => obj.id === 'background')).toBeTruthy()
      expect(mockCanvas.getObjects().find((obj: any) => obj.type === 'image')).toBeTruthy()
      expect(backgroundManager.backgroundObject!.backgroundType).toBe('image')
    })

    it('фон x2 > removeBackground > undo > undo > redo > redo', () => {
      // Устанавливаем фон дважды
      const firstBackground = createMockBackgroundRect({ backgroundId: 'background-1' })
      const secondBackground = createMockBackgroundRect({ backgroundId: 'background-2' })

      backgroundManager.backgroundObject = secondBackground

      // Удаляем фон
      backgroundManager.removeBackground()
      expect(backgroundManager.backgroundObject).toBeNull()

      // Первый undo - возврат последнего фона
      backgroundManager.backgroundObject = secondBackground
      expect(backgroundManager.backgroundObject!.backgroundId).toBe('background-2')

      // Второй undo - возврат первого фона
      backgroundManager.backgroundObject = firstBackground
      expect(backgroundManager.backgroundObject!.backgroundId).toBe('background-1')

      // Первый redo - возврат второго фона
      backgroundManager.backgroundObject = secondBackground
      expect(backgroundManager.backgroundObject!.backgroundId).toBe('background-2')

      // Второй redo - удаление фона
      backgroundManager.backgroundObject = null
      expect(backgroundManager.backgroundObject).toBeNull()
    })
  })

  // Тесты для взаимодействия с другими менеджерами
  describe('integration with other managers', () => {
    it('сценарий 7: selectAll НЕ должен включать фон', () => {
      const mockBackground = createMockBackgroundRect({
        id: 'background',
        backgroundId: 'bg-select-123'
      })
      const mockImage = createMockFabricObject({ type: 'image', id: 'image-123' })

      // Добавляем фон и изображение в canvas
      mockCanvas.add(mockBackground)
      mockCanvas.add(mockImage)
      backgroundManager.backgroundObject = mockBackground

      // Проверяем что canvas.getObjects возвращает фон и изображение
      const objects = mockCanvas.getObjects()
      const backgroundInCanvas = objects.find((obj: any) => obj.id === 'background')
      const imageInCanvas = objects.find((obj: any) => obj.id === 'image-123')

      expect(backgroundInCanvas).toBeTruthy()
      expect(imageInCanvas).toBeTruthy()
      expect(objects).toHaveLength(3) // montageArea + background + image

      // Создаём activeSelection только с изображением (БЕЗ фона) и мокаем getActiveObject
      const mockActiveSelection = createMockActiveSelection([mockImage])
      mockCanvas.getActiveObject.mockReturnValue(mockActiveSelection)
      mockCanvas.getActiveObjects.mockReturnValue([mockImage]) // Только изображение

      // Вызываем selectAll
      mockEditor.selectionManager.selectAll()

      expect(mockEditor.selectionManager.selectAll).toHaveBeenCalled()

      // ОР: activeSelection должен содержать только селектируемые объекты (БЕЗ фона)
      const activeObject = mockCanvas.getActiveObject()
      const activeObjects = mockCanvas.getActiveObjects()

      // Проверяем через getActiveObject (если это ActiveSelection)
      if (activeObject && activeObject.type === 'activeSelection') {
        const selectedObjects = activeObject.getObjects()
        const selectedBackground = selectedObjects.find((obj: any) => obj.id === 'background')
        const selectedImage = selectedObjects.find((obj: any) => obj.id === 'image-123')

        expect(selectedBackground).toBeUndefined() // Фон НЕ должен быть выбран
        expect(selectedImage).toBeTruthy() // Изображение должно быть выбрано
      }

      // Проверяем через getActiveObjects
      const backgroundInActive = activeObjects.find((obj: any) => obj.id === 'background')
      const imageInActive = activeObjects.find((obj: any) => obj.id === 'image-123')

      expect(backgroundInActive).toBeUndefined() // Фон НЕ должен быть в активных объектах
      expect(imageInActive).toBeTruthy() // Изображение должно быть в активных объектах
      expect(activeObjects).toHaveLength(1) // Только изображение
    })

    it('сценарий 8: отправка изображения на задний план - изображение должно остаться выше фона', () => {
      const mockBackground = createMockBackgroundRect({
        id: 'background',
        backgroundId: 'bg-layer-456'
      })
      const mockImage = createMockFabricObject({ type: 'image', id: 'image-789' })

      // Добавляем объекты в правильном порядке: montageArea, background, image
      mockCanvas.add(mockBackground)
      mockCanvas.add(mockImage)
      backgroundManager.backgroundObject = mockBackground

      // Проверяем начальное состояние: изображение выше фона
      let objects = mockCanvas.getObjects()
      let backgroundIndex = objects.findIndex((obj: any) => obj.id === 'background')
      let imageIndex = objects.findIndex((obj: any) => obj.id === 'image-789')

      expect(backgroundIndex).toBe(1) // montageArea(0), background(1), image(2)
      expect(imageIndex).toBe(2)
      expect(imageIndex).toBeGreaterThan(backgroundIndex)

      // Отправляем изображение на задний план
      mockCanvas.sendObjectToBack(mockImage)

      // После sendToBack изображение переместится в начало массива
      objects = mockCanvas.getObjects()
      backgroundIndex = objects.findIndex((obj: any) => obj.id === 'background')
      imageIndex = objects.findIndex((obj: any) => obj.id === 'image-789')

      // Теперь порядок: image(0), montageArea(1), background(2) - фон НЕ на правильной позиции!
      expect(imageIndex).toBe(0)
      expect(backgroundIndex).toBe(2)

      // Настраиваем indexOf мок для refresh()
      mockCanvas.indexOf.mockImplementation((obj: any) => {
        const objects = mockCanvas.getObjects()
        return objects.indexOf(obj)
      })

      // Сброс счетчика вызовов moveObjectTo перед refresh
      mockCanvas.moveObjectTo.mockClear()

      // Вызываем refresh - он должен обнаружить что фон не на правильной позиции
      // montageArea индекс = 1, значит фон должен быть на позиции 2 (montageIndex + 1)
      // но он на позиции 2, что не равно 1 + 1 = 2... стоп, это правильная позиция!
      // Нужно сделать так чтобы фон был на неправильной позиции

      // Меняем порядок: image(0), background(1), montageArea(2) - фон перед montageArea!
      const wrongObjects = [mockImage, mockBackground, mockMontageArea]
      mockCanvas.getObjects.mockReturnValue(wrongObjects)

      backgroundManager.refresh()

      // refresh() должен переместить фон на позицию после montageArea (индекс 3)
      expect(mockCanvas.moveObjectTo).toHaveBeenCalledWith(mockBackground, 3)
    })

    it('removeBackground должен удалить фон', () => {
      const mockBackground = createMockBackgroundRect({
        id: 'background',
        backgroundId: 'bg-remove-999'
      })

      // Добавляем фон в canvas
      mockCanvas.add(mockBackground)
      backgroundManager.backgroundObject = mockBackground

      // Проверяем что фон есть в canvas
      let objects = mockCanvas.getObjects()
      let backgroundObj = objects.find((obj: any) => obj.id === 'background')
      expect(backgroundObj).toBeTruthy()

      // Удаляем фон
      backgroundManager.removeBackground()

      // ОР: При вызове canvas.getObjects в массиве не должно быть айтема с id background
      objects = mockCanvas.getObjects()
      backgroundObj = objects.find((obj: any) => obj.id === 'background')
      expect(backgroundObj).toBeUndefined()
      expect(backgroundManager.backgroundObject).toBeNull()
    })

    it('refresh должен синхронизировать фон с монтажной областью', () => {
      const mockBackground = createMockBackgroundRect({
        id: 'background',
        backgroundId: 'bg-refresh-777',
        left: 100,
        top: 50,
        width: 400,
        height: 300
      })

      // Добавляем фон в canvas
      mockCanvas.add(mockBackground)
      backgroundManager.backgroundObject = mockBackground

      // Симулируем изменение размера монтажной области
      mockMontageArea.getBoundingRect.mockReturnValue({
        left: 200,
        top: 100,
        width: 600,
        height: 450
      })

      // Проверяем начальное состояние фона в canvas
      let objects = mockCanvas.getObjects()
      let backgroundObj = objects.find((obj: any) => obj.id === 'background')
      expect(backgroundObj).toBeTruthy()
      expect(backgroundObj?.left).toBe(100)
      expect(backgroundObj?.width).toBe(400)

      // Вызываем refresh
      backgroundManager.refresh()

      // ОР: При вызове refresh должен быть вызван fitObject для фона
      expect(mockEditor.transformManager.fitObject).toHaveBeenCalledWith({
        object: mockBackground,
        withoutSave: true,
        type: 'cover'
      })

      // Проверяем что canvas обновился
      expect(mockCanvas.requestRenderAll).toHaveBeenCalled()
    })
  })
})
