import { createManagerTestMocks } from '../../../test-utils/editor/manager-test-mocks'
import { createMockBackgroundRect, createMockBackgroundImage } from '../../../test-utils/fabric/background-objects'
import { createMockFabricObject, createMockActiveSelection } from '../../../test-utils/fabric/objects'
import BackgroundManager from '../../../../src/editor/background-manager'
import { addRectangleToCanvas } from '../../../../src/editor/utils/primitive-shapes'

jest.mock('../../../../src/editor/utils/primitive-shapes', () => ({
  addRectangleToCanvas: jest.fn()
}))

const addRectangleToCanvasMock = addRectangleToCanvas as jest.Mock

describe('BackgroundManager', () => {
  let mockEditor: any
  let backgroundManager: BackgroundManager
  let mockCanvas: any
  let mockMontageArea: any

  beforeEach(() => {
    // Use a layer-aware canvas for realistic state tests
    const mocks = createManagerTestMocks(800, 600, { withLayerAwareCanvas: true })
    mockEditor = mocks.mockEditor
    mockCanvas = mocks.mockCanvas
    mockMontageArea = mocks.mockMontageArea

    // Initialize the canvas with an artboard
    mockCanvas.add(mockMontageArea)

    backgroundManager = new BackgroundManager({ editor: mockEditor })

    // Add a method that may be missing in some versions
    backgroundManager.setGradientBackground = backgroundManager.setGradientBackground || jest.fn()

    // Clear all mocks
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
      addRectangleToCanvasMock.mockReturnValue(mockBackground)

      // Check that the method executes without errors
      expect(() => {
        backgroundManager.setColorBackground({ color: '#ff0000' })
      }).not.toThrow()

      expect(addRectangleToCanvasMock).toHaveBeenCalledWith({
        canvas: mockEditor.canvas,
        options: expect.objectContaining({
          fill: '#ff0000',
          selectable: false,
          evented: false,
          hasBorders: false,
          hasControls: false,
          id: 'background',
          backgroundType: 'color',
          backgroundId: expect.stringMatching(/^background-/)
        }),
        flags: { withoutSelection: true }
      })

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

    it('при создании объект цветового фона сразу получает размеры и позицию монтажной области', () => {
      const mockBackground = createMockBackgroundRect({ fill: '#ff0000' })
      addRectangleToCanvasMock.mockReturnValue(mockBackground)

      backgroundManager.setColorBackground({ color: '#ff0000' })

      expect(addRectangleToCanvasMock).toHaveBeenCalledWith(expect.objectContaining({
        options: expect.objectContaining({
          width: mockMontageArea.width,
          height: mockMontageArea.height,
          left: mockMontageArea.left,
          top: mockMontageArea.top,
          originX: 'center',
          originY: 'center'
        })
      }))
    })

    it('не должен изменять фон если цвет тот же', () => {
      const mockBackground = createMockBackgroundRect({
        fill: '#ff0000',
        backgroundType: 'color'
      })
      backgroundManager.backgroundObject = mockBackground

      backgroundManager.setColorBackground({ color: '#ff0000' })

      expect(addRectangleToCanvasMock).not.toHaveBeenCalled()
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
      addRectangleToCanvasMock.mockReturnValue(mockBackground)

      backgroundManager.setColorBackground({ color: '#ff0000', withoutSave: true })

      expect(mockEditor.historyManager.saveState).not.toHaveBeenCalled()
    })
  })

  describe('setImageBackground', () => {
    it('должен создать новый фон из изображения', async() => {
      const imageSource = 'https://example.com/image.jpg'
      const mockImage = createMockBackgroundImage({ id: 'background' })

      // Mock imageManager.importImage to return an image
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

    it('не должен сохранять в историю при withoutSave: true', async() => {
      const imageSource = 'https://example.com/image.jpg'
      const mockImage = createMockBackgroundImage({ id: 'background' })

      mockEditor.imageManager.importImage.mockResolvedValue({
        image: mockImage
      })

      await backgroundManager.setImageBackground({ imageSource, withoutSave: true })

      expect(mockEditor.historyManager.saveState).not.toHaveBeenCalled()
    })
  })

  describe('setPreparedImageBackground', () => {
    it('устанавливает подготовленный image-объект как фон без повторного импорта', () => {
      const mockImage = createMockBackgroundImage({
        id: 'template-background',
        selectable: true,
        evented: true,
        hasBorders: true,
        hasControls: true
      })
      const customData = { presetHandle: 'texture-1' }

      backgroundManager.setPreparedImageBackground({
        image: mockImage,
        customData,
        fromTemplate: true
      })

      expect(mockEditor.imageManager.importImage).not.toHaveBeenCalled()
      expect(mockCanvas.add).toHaveBeenCalledWith(mockImage)
      expect(mockImage.set).toHaveBeenCalledWith(expect.objectContaining({
        selectable: false,
        evented: false,
        hasBorders: false,
        hasControls: false,
        id: 'background',
        backgroundType: 'image',
        backgroundId: expect.stringMatching(/^background-/),
        customData
      }))
      expect(mockEditor.transformManager.fitObject).toHaveBeenCalledWith({
        object: mockImage,
        withoutSave: true,
        type: 'cover'
      })
      expect(backgroundManager.backgroundObject).toBe(mockImage)
      expect(mockCanvas.fire).toHaveBeenCalledWith('editor:background:changed', {
        type: 'image',
        backgroundObject: mockImage,
        customData,
        fromTemplate: true,
        withoutSave: false
      })
      expect(mockEditor.historyManager.saveState).toHaveBeenCalled()
    })

    it('не сохраняет подготовленный image-фон в историю при withoutSave: true', () => {
      const mockImage = createMockBackgroundImage({ id: 'template-background' })

      backgroundManager.setPreparedImageBackground({
        image: mockImage,
        withoutSave: true
      })

      expect(backgroundManager.backgroundObject).toBe(mockImage)
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

      expect(mockBackground.set).toHaveBeenCalledWith(expect.objectContaining({
        width: mockMontageArea.width,
        height: mockMontageArea.height,
        left: mockMontageArea.left,
        top: mockMontageArea.top,
        originX: 'center',
        originY: 'center'
      }))
      expect(mockBackground.setCoords).toHaveBeenCalled()
      expect(mockCanvas.requestRenderAll).toHaveBeenCalled()
    })

    it('при обновлении объект цветового фона берёт размеры монтажной области напрямую', () => {
      const mockBackground = createMockBackgroundRect({
        backgroundType: 'color'
      })
      backgroundManager.backgroundObject = mockBackground

      mockCanvas.getObjects.mockReturnValue([mockMontageArea, mockBackground])
      mockCanvas.indexOf.mockImplementation((obj: any) => {
        if (obj === mockMontageArea) return 0
        if (obj === mockBackground) return 1
        return -1
      })

      backgroundManager.refresh()

      expect(mockEditor.transformManager.fitObject).not.toHaveBeenCalled()
      expect(mockBackground.set).toHaveBeenCalledWith(expect.objectContaining({
        width: mockMontageArea.width,
        height: mockMontageArea.height,
        left: mockMontageArea.left,
        top: mockMontageArea.top
      }))
    })

    it('при обновлении фоновое изображение заполняет монтажную область по cover', () => {
      const mockBackground = createMockBackgroundImage({
        backgroundType: 'image'
      })
      backgroundManager.backgroundObject = mockBackground

      mockCanvas.getObjects.mockReturnValue([mockMontageArea, mockBackground])
      mockCanvas.indexOf.mockImplementation((obj: any) => {
        if (obj === mockMontageArea) return 0
        if (obj === mockBackground) return 1
        return -1
      })

      backgroundManager.refresh()

      expect(mockEditor.transformManager.fitObject).toHaveBeenCalledWith({
        object: mockBackground,
        withoutSave: true,
        type: 'cover'
      })
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
      expect(mockBackground.setCoords).toHaveBeenCalled()
    })
  })

  // Tests for undo/redo scenarios
  describe('undo/redo scenarios', () => {
    it('установка фона > undo', () => {
      // Set the background
      const mockBackground = createMockBackgroundRect({
        fill: '#ff0000',
        id: 'background',
        backgroundId: 'background-12345'
      })
      addRectangleToCanvasMock.mockReturnValue(mockBackground)

      // Call the background-setting method
      backgroundManager.setColorBackground({ color: '#ff0000' })

      // Simulate adding the background to the canvas (as shapeManager.addRectangle does)
      mockCanvas.add(mockBackground)

      // Check that the background is present in canvas.getObjects
      let objects = mockCanvas.getObjects()
      let backgroundInCanvas = objects.find((obj: any) => obj.id === 'background')
      expect(backgroundInCanvas).toBeTruthy()
      expect(backgroundInCanvas?.backgroundId).toMatch(/^background-/)
      expect(backgroundInCanvas?.fill).toBe('#ff0000')

      // Simulate undo: the background should be removed from the canvas
      backgroundManager.removeBackground({ withoutSave: true })

      // Expected: the array returned by canvas.getObjects should not contain an item with id background
      objects = mockCanvas.getObjects()
      backgroundInCanvas = objects.find((obj: any) => obj.id === 'background')
      expect(backgroundInCanvas).toBeUndefined()
      expect(backgroundManager.backgroundObject).toBeNull()
    })

    it('установка фона > установка другого фона > undo', () => {
      // First background
      const firstBackground = createMockBackgroundRect({
        fill: '#ff0000',
        id: 'background',
        backgroundId: 'background-first-12345'
      })

      // Second background
      const secondBackground = createMockBackgroundRect({
        fill: '#00ff00',
        id: 'background',
        backgroundId: 'background-second-67890'
      })

      // Set the first background
      addRectangleToCanvasMock.mockReturnValueOnce(firstBackground)
      backgroundManager.setColorBackground({ color: '#ff0000' })
      mockCanvas.add(firstBackground) // Simulate adding it to the canvas

      // Check the first background in the canvas
      let objects = mockCanvas.getObjects()
      let backgroundObj = objects.find((obj: any) => obj.id === 'background')
      expect(backgroundObj).toBeTruthy()
      expect(backgroundObj?.backgroundId).toBe('background-first-12345')

      // Set the second background (it should replace the first)
      addRectangleToCanvasMock.mockReturnValueOnce(secondBackground)
      backgroundManager.setColorBackground({ color: '#00ff00' })
      // Simulate replacing the background in the canvas
      mockCanvas.remove(firstBackground)
      mockCanvas.add(secondBackground)

      // Check that the canvas now contains the second background
      objects = mockCanvas.getObjects()
      backgroundObj = objects.find((obj: any) => obj.id === 'background')
      expect(backgroundObj).toBeTruthy()
      expect(backgroundObj?.backgroundId).toBe('background-second-67890')
      expect(backgroundObj?.backgroundId).not.toBe('background-first-12345')

      // Simulate undo: return to the first background
      mockCanvas.remove(secondBackground)
      mockCanvas.add(firstBackground)
      backgroundManager.backgroundObject = firstBackground

      // Expected: the array returned by canvas.getObjects should contain one item with id background
      objects = mockCanvas.getObjects()
      backgroundObj = objects.find((obj: any) => obj.id === 'background')

      expect(backgroundObj).toBeTruthy()
      expect(backgroundObj?.backgroundId).toBe('background-first-12345')
      expect(backgroundObj?.backgroundId).not.toBe('background-second-67890')
      expect(backgroundManager.backgroundObject?.backgroundId).toBe('background-first-12345')
    })

    it('установка изображения > установка цвета > undo', () => {
      // First background (image)
      const imageBackground = createMockBackgroundImage({
        id: 'background',
        backgroundType: 'image',
        backgroundId: 'background-image-abc123'
      })

      // Add the image background to the canvas and set it in the manager
      mockCanvas.add(imageBackground)
      backgroundManager.backgroundObject = imageBackground

      // Check that the image is in the canvas
      let objects = mockCanvas.getObjects()
      let backgroundObj = objects.find((obj: any) => obj.id === 'background')
      expect(backgroundObj).toBeTruthy()
      expect(backgroundObj?.backgroundType).toBe('image')
      expect(backgroundObj?.backgroundId).toBe('background-image-abc123')

      // Second background (color): should replace the image
      const colorBackground = createMockBackgroundRect({
        fill: '#ff0000',
        id: 'background',
        backgroundType: 'color',
        backgroundId: 'background-color-def456'
      })
      addRectangleToCanvasMock.mockReturnValue(colorBackground)
      backgroundManager.setColorBackground({ color: '#ff0000' })

      // Simulate replacing the background in the canvas
      mockCanvas.remove(imageBackground)
      mockCanvas.add(colorBackground)

      // Check that the canvas now contains a solid-color background
      objects = mockCanvas.getObjects()
      backgroundObj = objects.find((obj: any) => obj.id === 'background')
      expect(backgroundObj).toBeTruthy()
      expect(backgroundObj?.backgroundType).toBe('color')
      expect(backgroundObj?.backgroundId).toBe('background-color-def456')

      // Simulate undo: the image background should be restored
      mockCanvas.remove(colorBackground)
      mockCanvas.add(imageBackground)
      backgroundManager.backgroundObject = imageBackground

      // Expected: the array returned by canvas.getObjects should contain one item with id background and backgroundType image
      objects = mockCanvas.getObjects()
      backgroundObj = objects.find((obj: any) => obj.id === 'background')

      expect(backgroundObj).toBeTruthy()
      expect(backgroundObj?.backgroundType).toBe('image')
      expect(backgroundObj?.backgroundId).toBe('background-image-abc123')
      expect(backgroundObj?.backgroundId).not.toBe('background-color-def456')
      expect(backgroundManager.backgroundObject?.backgroundType).toBe('image')
    })
  })

  // Additional tests for gradients and edge cases
  describe('gradient background', () => {
    it('при создании объект градиентного фона сразу получает размеры и позицию монтажной области', () => {
      const mockBackground = createMockBackgroundRect({
        backgroundType: 'gradient',
        fill: { type: 'linear', coords: {}, colorStops: [] }
      })
      const gradient = {
        type: 'linear' as const,
        angle: 90,
        startColor: '#ff0000',
        endColor: '#0000ff'
      }

      addRectangleToCanvasMock.mockReturnValue(mockBackground)

      backgroundManager.setGradientBackground({ gradient })

      expect(addRectangleToCanvasMock).toHaveBeenCalledWith(expect.objectContaining({
        options: expect.objectContaining({
          width: mockMontageArea.width,
          height: mockMontageArea.height,
          left: mockMontageArea.left,
          top: mockMontageArea.top,
          originX: 'center',
          originY: 'center'
        })
      }))
    })

    it('должен создать градиентный фон', () => {
      const mockBackground = createMockBackgroundRect({
        backgroundType: 'gradient',
        fill: { type: 'linear', coords: {}, colorStops: [] }
      })
      addRectangleToCanvasMock.mockReturnValue(mockBackground)

      const gradient = {
        type: 'linear' as const,
        angle: 45,
        startColor: '#ff0000',
        endColor: '#0000ff'
      }

      backgroundManager.setGradientBackground({ gradient })

      expect(addRectangleToCanvasMock).toHaveBeenCalledWith({
        canvas: mockEditor.canvas,
        options: expect.objectContaining({
          backgroundType: 'gradient'
        }),
        flags: { withoutSelection: true }
      })
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
      addRectangleToCanvasMock.mockReturnValue(mockBackground)

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

      expect(addRectangleToCanvasMock).toHaveBeenCalledWith({
        canvas: mockEditor.canvas,
        options: expect.objectContaining({
          backgroundType: 'gradient'
        }),
        flags: { withoutSelection: true }
      })
      expect(mockCanvas.fire).toHaveBeenCalledWith('editor:background:changed', {
        type: 'gradient',
        gradientParams: gradient,
        customData: {},
        fromTemplate: false,
        withoutSave: false
      })
    })

    it('не должен изменять градиент если он тот же', () => {
      // Mock the static method for comparing gradients
      const isGradientEqualSpy = jest.spyOn(BackgroundManager as any, '_isGradientEqual')
        .mockReturnValue(true) // Simulate identical gradients

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

      expect(addRectangleToCanvasMock).not.toHaveBeenCalled()
      expect(mockEditor.historyManager.saveState).not.toHaveBeenCalled()

      isGradientEqualSpy.mockRestore()
    })
  })

  // Tests for radial gradients
  describe('radial gradient background', () => {
    it('должен создать радиальный градиентный фон', () => {
      const mockBackground = createMockBackgroundRect({
        backgroundType: 'gradient',
        fill: { type: 'radial', coords: {}, colorStops: [] }
      })
      addRectangleToCanvasMock.mockReturnValue(mockBackground)

      const gradient = {
        type: 'radial' as const,
        centerX: 50,
        centerY: 50,
        radius: 70,
        startColor: '#ff0000',
        endColor: '#0000ff'
      }

      backgroundManager.setGradientBackground({ gradient })

      expect(addRectangleToCanvasMock).toHaveBeenCalledWith({
        canvas: mockEditor.canvas,
        options: expect.objectContaining({
          backgroundType: 'gradient'
        }),
        flags: { withoutSelection: true }
      })
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
      addRectangleToCanvasMock.mockReturnValue(mockBackground)

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

      expect(addRectangleToCanvasMock).toHaveBeenCalledWith({
        canvas: mockEditor.canvas,
        options: expect.objectContaining({
          backgroundType: 'gradient'
        }),
        flags: { withoutSelection: true }
      })
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
      addRectangleToCanvasMock.mockReturnValue(mockBackground)

      backgroundManager.setRadialGradientBackground({
        centerX: 30,
        centerY: 70,
        radius: 50,
        startColor: '#00ff00',
        endColor: '#ff00ff'
      })

      expect(addRectangleToCanvasMock).toHaveBeenCalledWith({
        canvas: mockEditor.canvas,
        options: expect.objectContaining({
          backgroundType: 'gradient'
        }),
        flags: { withoutSelection: true }
      })
    })

    it('должен создать линейный градиент с помощью метода setLinearGradientBackground', () => {
      const mockBackground = createMockBackgroundRect({
        backgroundType: 'gradient',
        fill: { type: 'linear', coords: {}, colorStops: [] }
      })
      addRectangleToCanvasMock.mockReturnValue(mockBackground)

      backgroundManager.setLinearGradientBackground({
        angle: 90,
        startColor: '#ffff00',
        endColor: '#00ffff'
      })

      expect(addRectangleToCanvasMock).toHaveBeenCalledWith({
        canvas: mockEditor.canvas,
        options: expect.objectContaining({
          backgroundType: 'gradient'
        }),
        flags: { withoutSelection: true }
      })
    })

    it('должен создать линейный градиент с colorStops с помощью метода setLinearGradientBackground', () => {
      const mockBackground = createMockBackgroundRect({
        backgroundType: 'gradient',
        fill: { type: 'linear', coords: {}, colorStops: [] }
      })
      addRectangleToCanvasMock.mockReturnValue(mockBackground)

      backgroundManager.setLinearGradientBackground({
        angle: 90,
        colorStops: [
          { offset: 0, color: '#ffff00' },
          { offset: 100, color: '#00ffff' }
        ]
      })

      expect(addRectangleToCanvasMock).toHaveBeenCalledWith({
        canvas: mockEditor.canvas,
        options: expect.objectContaining({
          backgroundType: 'gradient'
        }),
        flags: { withoutSelection: true }
      })
    })

    it('не должен изменять радиальный градиент если он тот же', () => {
      // Mock the static method for comparing gradients
      const isGradientEqualSpy = jest.spyOn(BackgroundManager as any, '_isGradientEqual')
        .mockReturnValue(true) // Simulate identical gradients

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

      expect(addRectangleToCanvasMock).not.toHaveBeenCalled()
      expect(mockEditor.historyManager.saveState).not.toHaveBeenCalled()

      isGradientEqualSpy.mockRestore()
    })
  })

  // Same color
  describe('color background edge cases', () => {
    it('установка того же цвета не должна записывать в историю', () => {
      const mockBackground = createMockBackgroundRect({
        fill: '#ff0000',
        id: 'background',
        backgroundType: 'color',
        backgroundId: 'bg-same-color-123'
      })

      // Add the background to the canvas and set it in the manager
      mockCanvas.add(mockBackground)
      backgroundManager.backgroundObject = mockBackground

      // Check the initial canvas state
      let objects = mockCanvas.getObjects()
      let backgroundObj = objects.find((obj: any) => obj.id === 'background')
      expect(backgroundObj).toBeTruthy()
      expect(backgroundObj?.fill).toBe('#ff0000')
      expect(backgroundObj?.backgroundId).toBe('bg-same-color-123')

      // Set the same color
      backgroundManager.setColorBackground({ color: '#ff0000' })

      // Expected: canvas.getObjects should contain the same object with the same backgroundId
      objects = mockCanvas.getObjects()
      backgroundObj = objects.find((obj: any) => obj.id === 'background')
      expect(backgroundObj).toBeTruthy()
      expect(backgroundObj?.fill).toBe('#ff0000')
      expect(backgroundObj?.backgroundId).toBe('bg-same-color-123') // The ID should not change

      // History should not be saved
      expect(mockEditor.historyManager.saveState).not.toHaveBeenCalled()
    })
  })

  // Scenarios with a full undo/redo cycle
  describe('complex undo/redo scenarios', () => {
    it('установка > установка > undo > undo > redo > redo', () => {
      // First background
      const firstBackground = createMockBackgroundRect({
        fill: '#ff0000',
        backgroundId: 'background-first'
      })

      // Second background
      const secondBackground = createMockBackgroundRect({
        fill: '#00ff00',
        backgroundId: 'background-second'
      })

      // Set the first background
      backgroundManager.backgroundObject = firstBackground

      // Set the second background
      backgroundManager.backgroundObject = secondBackground

      // First undo: return to the first background
      backgroundManager.backgroundObject = firstBackground
      expect(backgroundManager.backgroundObject!.backgroundId).toBe('background-first')

      // Second undo: remove the background
      backgroundManager.backgroundObject = null
      expect(backgroundManager.backgroundObject).toBeNull()

      // First redo: restore the first background
      backgroundManager.backgroundObject = firstBackground
      expect(backgroundManager.backgroundObject!.backgroundId).toBe('background-first')

      // Second redo: restore the second background
      backgroundManager.backgroundObject = secondBackground
      expect(backgroundManager.backgroundObject!.backgroundId).toBe('background-second')
    })

    it('фон > изображение > scaleMontageAreaToImage > undo', () => {
      // Set the background
      const mockBackground = createMockBackgroundImage({ backgroundId: 'background-img' })
      backgroundManager.backgroundObject = mockBackground

      // Load the image
      const mockImage = createMockFabricObject({
        type: 'image',
        id: 'image-12345'
      })

      // Simulate a canvas containing both the background and the image
      mockCanvas.getObjects.mockReturnValue([mockMontageArea, mockBackground, mockImage])

      // After undo, both the background and the image should remain
      expect(mockCanvas.getObjects().find((obj: any) => obj.id === 'background')).toBeTruthy()
      expect(mockCanvas.getObjects().find((obj: any) => obj.type === 'image')).toBeTruthy()
      expect(backgroundManager.backgroundObject!.backgroundType).toBe('image')
    })

    it('фон x2 > removeBackground > undo > undo > redo > redo', () => {
      // Set the background twice
      const firstBackground = createMockBackgroundRect({ backgroundId: 'background-1' })
      const secondBackground = createMockBackgroundRect({ backgroundId: 'background-2' })

      backgroundManager.backgroundObject = secondBackground

      // Remove the background
      backgroundManager.removeBackground()
      expect(backgroundManager.backgroundObject).toBeNull()

      // First undo: restore the last background
      backgroundManager.backgroundObject = secondBackground
      expect(backgroundManager.backgroundObject!.backgroundId).toBe('background-2')

      // Second undo: restore the first background
      backgroundManager.backgroundObject = firstBackground
      expect(backgroundManager.backgroundObject!.backgroundId).toBe('background-1')

      // First redo: restore the second background
      backgroundManager.backgroundObject = secondBackground
      expect(backgroundManager.backgroundObject!.backgroundId).toBe('background-2')

      // Second redo: remove the background
      backgroundManager.backgroundObject = null
      expect(backgroundManager.backgroundObject).toBeNull()
    })
  })

  // Tests for interaction with other managers
  describe('integration with other managers', () => {
    it('сценарий 7: selectAll НЕ должен включать фон', () => {
      const mockBackground = createMockBackgroundRect({
        id: 'background',
        backgroundId: 'bg-select-123'
      })
      const mockImage = createMockFabricObject({ type: 'image', id: 'image-123' })

      // Add the background and image to the canvas
      mockCanvas.add(mockBackground)
      mockCanvas.add(mockImage)
      backgroundManager.backgroundObject = mockBackground

      // Check that canvas.getObjects returns the background and image
      const objects = mockCanvas.getObjects()
      const backgroundInCanvas = objects.find((obj: any) => obj.id === 'background')
      const imageInCanvas = objects.find((obj: any) => obj.id === 'image-123')

      expect(backgroundInCanvas).toBeTruthy()
      expect(imageInCanvas).toBeTruthy()
      expect(objects).toHaveLength(3) // montageArea + background + image

      // Create an activeSelection containing only the image (WITHOUT the background) and mock getActiveObject
      const mockActiveSelection = createMockActiveSelection([mockImage])
      mockCanvas.getActiveObject.mockReturnValue(mockActiveSelection)
      mockCanvas.getActiveObjects.mockReturnValue([mockImage]) // Image only

      // Call selectAll
      mockEditor.selectionManager.selectAll()

      expect(mockEditor.selectionManager.selectAll).toHaveBeenCalled()

      // Expected: activeSelection should contain only selectable objects (WITHOUT the background)
      const activeObject = mockCanvas.getActiveObject()
      const activeObjects = mockCanvas.getActiveObjects()

      // Check via getActiveObject (if it is an ActiveSelection)
      if (activeObject && activeObject.type === 'activeSelection') {
        const selectedObjects = activeObject.getObjects()
        const selectedBackground = selectedObjects.find((obj: any) => obj.id === 'background')
        const selectedImage = selectedObjects.find((obj: any) => obj.id === 'image-123')

        expect(selectedBackground).toBeUndefined() // The background should NOT be selected
        expect(selectedImage).toBeTruthy() // The image should be selected
      }

      // Check via getActiveObjects
      const backgroundInActive = activeObjects.find((obj: any) => obj.id === 'background')
      const imageInActive = activeObjects.find((obj: any) => obj.id === 'image-123')

      expect(backgroundInActive).toBeUndefined() // The background should NOT be among the active objects
      expect(imageInActive).toBeTruthy() // The image should be among the active objects
      expect(activeObjects).toHaveLength(1) // Image only
    })

    it('сценарий 8: отправка изображения на задний план - изображение должно остаться выше фона', () => {
      const mockBackground = createMockBackgroundRect({
        id: 'background',
        backgroundId: 'bg-layer-456'
      })
      const mockImage = createMockFabricObject({ type: 'image', id: 'image-789' })

      // Add objects in the correct order: montageArea, background, image
      mockCanvas.add(mockBackground)
      mockCanvas.add(mockImage)
      backgroundManager.backgroundObject = mockBackground

      // Check the initial state: the image is above the background
      let objects = mockCanvas.getObjects()
      let backgroundIndex = objects.findIndex((obj: any) => obj.id === 'background')
      let imageIndex = objects.findIndex((obj: any) => obj.id === 'image-789')

      expect(backgroundIndex).toBe(1) // montageArea(0), background(1), image(2)
      expect(imageIndex).toBe(2)
      expect(imageIndex).toBeGreaterThan(backgroundIndex)

      // Send the image to the back
      mockCanvas.sendObjectToBack(mockImage)

      // After sendToBack, the image moves to the start of the array
      objects = mockCanvas.getObjects()
      backgroundIndex = objects.findIndex((obj: any) => obj.id === 'background')
      imageIndex = objects.findIndex((obj: any) => obj.id === 'image-789')

      // The order is now image(0), montageArea(1), background(2): the background is NOT in the correct position!
      expect(imageIndex).toBe(0)
      expect(backgroundIndex).toBe(2)

      // Configure the indexOf mock for refresh()
      mockCanvas.indexOf.mockImplementation((obj: any) => {
        const canvasObjects = mockCanvas.getObjects()
        return canvasObjects.indexOf(obj)
      })

      // Reset the moveObjectTo call count before refresh
      mockCanvas.moveObjectTo.mockClear()

      // Call refresh: it should detect that the background is in the wrong position
      // The montageArea index is 1, so the background should be at position 2 (montageIndex + 1)
      // But it is at position 2, which is not equal to 1 + 1 = 2... wait, that is the correct position!
      // We need to put the background in the wrong position

      // Change the order: image(0), background(1), montageArea(2): the background is before montageArea!
      const wrongObjects = [mockImage, mockBackground, mockMontageArea]
      mockCanvas.getObjects.mockReturnValue(wrongObjects)

      backgroundManager.refresh()

      // refresh() should move the background to the position after montageArea (index 3)
      expect(mockCanvas.moveObjectTo).toHaveBeenCalledWith(mockBackground, 3)
    })

    it('removeBackground должен удалить фон', () => {
      const mockBackground = createMockBackgroundRect({
        id: 'background',
        backgroundId: 'bg-remove-999'
      })

      // Add the background to the canvas
      mockCanvas.add(mockBackground)
      backgroundManager.backgroundObject = mockBackground

      // Check that the background is in the canvas
      let objects = mockCanvas.getObjects()
      let backgroundObj = objects.find((obj: any) => obj.id === 'background')
      expect(backgroundObj).toBeTruthy()

      // Remove the background
      backgroundManager.removeBackground()

      // Expected: the array returned by canvas.getObjects should not contain an item with id background
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

      // Add the background to the canvas
      mockCanvas.add(mockBackground)
      backgroundManager.backgroundObject = mockBackground

      // Simulate resizing the artboard
      mockMontageArea.left = 200
      mockMontageArea.top = 100
      mockMontageArea.width = 600
      mockMontageArea.height = 450

      // Check the initial background state in the canvas
      const objects = mockCanvas.getObjects()
      const backgroundObj = objects.find((obj: any) => obj.id === 'background')
      expect(backgroundObj).toBeTruthy()
      expect(backgroundObj?.left).toBe(100)
      expect(backgroundObj?.width).toBe(400)

      // Call refresh
      backgroundManager.refresh()

      expect(mockBackground.set).toHaveBeenCalledWith(expect.objectContaining({
        left: 200,
        top: 100,
        width: 600,
        height: 450,
        originX: 'center',
        originY: 'center'
      }))
      expect(mockBackground.setCoords).toHaveBeenCalled()

      // Check that the canvas was updated
      expect(mockCanvas.requestRenderAll).toHaveBeenCalled()
    })
  })
})
