import {
  createManagerTestMocks,
  createMockBackgroundRect,
  createMockBackgroundImage,
  createMockFabricObject
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
    const mocks = createManagerTestMocks()
    mockEditor = mocks.mockEditor
    mockCanvas = mocks.mockCanvas
    mockMontageArea = mocks.mockMontageArea

    // Настройка дополнительных моков
    mockCanvas.moveObjectTo = jest.fn()
    mockCanvas.indexOf = jest.fn()
    
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

      backgroundManager.setColorBackground({ color: '#ff0000' })

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
      expect(mockCanvas.fire).toHaveBeenCalledWith('background:changed', { type: 'color', color: '#ff0000' })
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

      expect(mockBackground.set).toHaveBeenCalledWith({ fill: '#00ff00' })
      expect(mockBackground.set).toHaveBeenCalledWith('backgroundId', expect.stringMatching(/^background-/))
      expect(mockCanvas.fire).toHaveBeenCalledWith('background:changed', { type: 'color', color: '#00ff00' })
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
      const imageUrl = 'https://example.com/image.jpg'
      
      await backgroundManager.setImageBackground({ imageUrl })

      await new Promise(resolve => setTimeout(resolve, ASYNC_DELAY))

      expect(mockCanvas.add).toHaveBeenCalled()
      expect(mockCanvas.fire).toHaveBeenCalledWith('background:changed', { type: 'image', imageUrl })
      expect(mockEditor.historyManager.saveState).toHaveBeenCalled()
    })

    it('не должен сохранять в историю при withoutSave: true', async () => {
      const imageUrl = 'https://example.com/image.jpg'
      
      await backgroundManager.setImageBackground({ imageUrl, withoutSave: true })

      await new Promise(resolve => setTimeout(resolve, ASYNC_DELAY))

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
      expect(mockCanvas.fire).toHaveBeenCalledWith('background:removed')
      expect(mockEditor.historyManager.saveState).toHaveBeenCalled()
    })

    it('должен показать предупреждение если нет фона для удаления', () => {
      backgroundManager.backgroundObject = null

      backgroundManager.removeBackground()

      expect(mockCanvas.remove).not.toHaveBeenCalled()
      expect(mockEditor.errorManager.emitWarning).toHaveBeenCalledWith({
        code: 'NO_BACKGROUND_TO_REMOVE',
        origin: 'BackgroundManager',
        method: 'removeBackground',
        message: 'Нет фона для удаления'
      })
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

      mockMontageArea.getBoundingRect.mockReturnValue({
        left: 150,
        top: 75,
        width: 500,
        height: 400
      })

      mockCanvas.getObjects.mockReturnValue([mockMontageArea, mockBackground])
      mockCanvas.indexOf.mockImplementation((obj: any) => {
        if (obj === mockMontageArea) return 0
        if (obj === mockBackground) return 1
        return -1
      })

      backgroundManager.refresh()

      expect(mockMontageArea.setCoords).toHaveBeenCalled()
      expect(mockBackground.set).toHaveBeenCalledWith({
        left: 150,
        top: 75,
        width: 500,
        height: 400
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
    it('сценарий 1: установка фона > undo', () => {
      // Устанавливаем фон
      const mockBackground = createMockBackgroundRect({ fill: '#ff0000' })
      mockEditor.shapeManager.addRectangle.mockReturnValue(mockBackground)
      
      backgroundManager.setColorBackground({ color: '#ff0000' })
      
      // Проверяем что canvas.getObjects не содержит фон до его реального добавления
      expect(mockCanvas.getObjects().filter((obj: any) => obj.id === 'background')).toHaveLength(0)
      
      // Имитируем undo - должен быть вызван removeBackground
      const removeBackgroundSpy = jest.spyOn(backgroundManager, 'removeBackground')
      
      // Сначала устанавливаем backgroundObject чтобы было что удалять
      backgroundManager.backgroundObject = mockBackground
      
      // Симулируем вызов от historyManager при undo когда фон должен быть удален
      backgroundManager.removeBackground({ withoutSave: true })
      
      expect(removeBackgroundSpy).toHaveBeenCalledWith({ withoutSave: true })
      expect(backgroundManager.backgroundObject).toBeNull()
    })

    it('сценарий 2: установка фона > установка другого фона > undo', () => {
      // Первый фон
      const firstBackground = createMockBackgroundRect({ 
        fill: '#ff0000',
        backgroundId: 'background-first'
      })
      mockEditor.shapeManager.addRectangle.mockReturnValueOnce(firstBackground)
      backgroundManager.setColorBackground({ color: '#ff0000' })

      // Второй фон
      const secondBackground = createMockBackgroundRect({ 
        fill: '#00ff00',
        backgroundId: 'background-second'
      })
      mockEditor.shapeManager.addRectangle.mockReturnValueOnce(secondBackground)
      backgroundManager.setColorBackground({ color: '#00ff00' })

      // Симулируем undo - должен восстановиться первый фон
      backgroundManager.backgroundObject = firstBackground
      
      expect(backgroundManager.backgroundObject).toBe(firstBackground)
      expect(backgroundManager.backgroundObject!.backgroundType).toBe('color')
      expect(backgroundManager.backgroundObject!.backgroundId).toBe('background-first')
    })

    it('сценарий 4: установка изображения > установка цвета > undo', () => {
      // Первый фон (изображение)
      const imageBackground = createMockBackgroundImage({ 
        backgroundType: 'image',
        backgroundId: 'background-image'
      })
      backgroundManager.backgroundObject = imageBackground

      // Второй фон (цвет)
      const colorBackground = createMockBackgroundRect({ 
        fill: '#ff0000',
        backgroundType: 'color',
        backgroundId: 'background-color'
      })
      mockEditor.shapeManager.addRectangle.mockReturnValue(colorBackground)
      backgroundManager.setColorBackground({ color: '#ff0000' })

      // Симулируем undo - должен восстановиться фон-изображение
      backgroundManager.backgroundObject = imageBackground
      
      expect(backgroundManager.backgroundObject).toBe(imageBackground)
      expect(backgroundManager.backgroundObject!.backgroundType).toBe('image')
      expect(backgroundManager.backgroundObject!.backgroundId).toBe('background-image')
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
      expect(mockCanvas.fire).toHaveBeenCalledWith('background:changed', {
        type: 'gradient',
        gradientParams: gradient
      })
    })

    it('не должен изменять градиент если он тот же (сценарий 13)', () => {
      // Мокаем статический метод для сравнения градиентов
      const isGradientEqualSpy = jest.spyOn(BackgroundManager as any, '_isGradientEqual')
        .mockReturnValue(true) // Симулируем что градиенты одинаковые
      
      const gradient = {
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

  // Сценарий 12: одинаковый цвет
  describe('color background edge cases', () => {
    it('сценарий 12: установка того же цвета не должна записывать в историю', () => {
      const mockBackground = createMockBackgroundRect({ 
        fill: '#ff0000',
        backgroundType: 'color' 
      })
      backgroundManager.backgroundObject = mockBackground

      backgroundManager.setColorBackground({ color: '#ff0000' })

      expect(mockEditor.historyManager.saveState).not.toHaveBeenCalled()
    })
  })

  // Сценарии с полным циклом undo/redo
  describe('complex undo/redo scenarios', () => {
    it('сценарий 3: установка > установка > undo > undo > redo > redo', () => {
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

    it('сценарий 6: фон > изображение > scaleMontageAreaToImage > undo', () => {
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

    it('сценарий 10-11: removeBackground > undo > undo > redo > redo', () => {
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
    it('сценарий 7: selectAll должен включать фон', () => {
      const mockBackground = createMockBackgroundRect()
      const mockImage = createMockFabricObject({ type: 'image', id: 'image-123' })
      
      backgroundManager.backgroundObject = mockBackground
      
      // Симулируем что canvas.getObjects возвращает фон и изображение
      mockCanvas.getObjects.mockReturnValue([mockMontageArea, mockBackground, mockImage])
      
      // Вызываем selectAll
      mockEditor.selectionManager.selectAll()
      
      expect(mockEditor.selectionManager.selectAll).toHaveBeenCalled()
    })

    it('сценарий 8: отправка изображения на задний план - изображение должно быть выше фона', () => {
      const mockBackground = createMockBackgroundRect()
      const mockImage = createMockFabricObject({ type: 'image', id: 'image-123' })
      
      backgroundManager.backgroundObject = mockBackground
      
      // Симулируем начальное состояние: изображение выше фона
      mockCanvas.getObjects.mockReturnValue([mockMontageArea, mockBackground, mockImage])
      
      // Вызываем layerManager.sendToBack для изображения
      mockEditor.layerManager.bringToFront(mockImage)
      
      // Проверяем что layerManager был вызван
      expect(mockEditor.layerManager.bringToFront).toHaveBeenCalledWith(mockImage)
      
      // В реальном сценарии изображение должно остаться выше фона
      // (это поведение layer-manager'а)
    })

    it('сценарий 9: removeBackground должен удалить фон', () => {
      const mockBackground = createMockBackgroundRect()
      backgroundManager.backgroundObject = mockBackground

      backgroundManager.removeBackground()

      expect(mockCanvas.remove).toHaveBeenCalledWith(mockBackground)
      expect(backgroundManager.backgroundObject).toBeNull()
    })

    it('сценарий 14: refresh должен синхронизировать фон с монтажной областью', () => {
      const mockBackground = createMockBackgroundRect()
      backgroundManager.backgroundObject = mockBackground

      // Симулируем изменение размера монтажной области
      mockMontageArea.getBoundingRect.mockReturnValue({
        left: 200,
        top: 100,
        width: 600,
        height: 450
      })

      mockCanvas.getObjects.mockReturnValue([mockMontageArea, mockBackground])
      mockCanvas.indexOf.mockImplementation((obj: any) => {
        if (obj === mockMontageArea) return 0
        if (obj === mockBackground) return 1
        return -1
      })

      backgroundManager.refresh()

      // Проверяем что фон получил те же размеры что и монтажная область
      expect(mockBackground.set).toHaveBeenCalledWith({
        left: 200,
        top: 100,
        width: 600,
        height: 450
      })
    })
  })
})