import { Point } from 'fabric'
import CanvasManager, {
  clampValue,
  calculateProportionalDimension,
  calculateCanvasCenterPoint,
  isImageObject
} from '../../../../src/editor/canvas-manager'
import { createManagerTestMocks } from '../../../test-utils/editor-helpers'
import {
  CANVAS_MIN_WIDTH,
  CANVAS_MIN_HEIGHT,
  CANVAS_MAX_WIDTH,
  CANVAS_MAX_HEIGHT
} from '../../../../src/editor/constants'

describe('CanvasManager', () => {
  let mockEditor: any
  let canvasManager: CanvasManager
  let mockCanvas: any
  let mockMontageArea: any
  let mockContainer: HTMLElement

  beforeEach(() => {
    const mocks = createManagerTestMocks()
    mockContainer = mocks.mockContainer
    mockMontageArea = mocks.mockMontageArea
    mockCanvas = mocks.mockCanvas
    mockEditor = mocks.mockEditor

    canvasManager = new CanvasManager({ editor: mockEditor })
  })

  describe('Вспомогательные функции', () => {
    describe('clampValue', () => {
      it('ограничивает значение минимумом', () => {
        expect(clampValue(5, 10, 100)).toBe(10)
      })

      it('ограничивает значение максимумом', () => {
        expect(clampValue(150, 10, 100)).toBe(100)
      })

      it('возвращает значение в допустимом диапазоне', () => {
        expect(clampValue(50, 10, 100)).toBe(50)
      })
    })

    describe('calculateProportionalDimension', () => {
      it('вычисляет пропорциональный размер', () => {
        expect(calculateProportionalDimension(100, 1.5)).toBe(150)
        expect(calculateProportionalDimension(200, 0.5)).toBe(100)
      })
    })

    describe('calculateCanvasCenterPoint', () => {
      it('вычисляет центральную точку канваса', () => {
        const testWidth = 800
        const testHeight = 600
        const center = calculateCanvasCenterPoint(testWidth, testHeight)
        expect(center).toEqual(new Point(testWidth / 2, testHeight / 2))
      })
    })

    describe('isImageObject', () => {
      it('возвращает true для объекта изображения', () => {
        const imageObj = { type: 'image', width: 100, height: 100 }
        expect(isImageObject(imageObj as any)).toBe(true)
      })

      it('возвращает true для SVG объекта', () => {
        const svgObj = { format: 'svg', width: 100, height: 100 }
        expect(isImageObject(svgObj as any)).toBe(true)
      })

      it('возвращает false для других типов объектов', () => {
        const rectObj = { type: 'rect', width: 100, height: 100 }
        expect(isImageObject(rectObj as any)).toBe(false)
      })

      it('возвращает false для null/undefined', () => {
        expect(isImageObject(null)).toBe(false)
        expect(isImageObject(undefined)).toBe(false)
      })
    })
  })

  describe('DOM accessor методы', () => {
    describe('getEditorContainer', () => {
      it('возвращает canvas.editorContainer если он есть', () => {
        const result = canvasManager.getEditorContainer()
        expect(result).toBe(mockContainer)
      })

      it('возвращает options.editorContainer если canvas.editorContainer отсутствует', () => {
        mockCanvas.editorContainer = null
        const result = canvasManager.getEditorContainer()
        expect(result).toBe(mockContainer)
      })
    })
  })

  describe('setResolutionWidth', () => {
    it('не делает ничего если width пустой', () => {
      canvasManager.setResolutionWidth('')
      expect(mockMontageArea.set).not.toHaveBeenCalled()
      expect(mockCanvas.fire).not.toHaveBeenCalled()
    })

    it('устанавливает ширину с ограничениями', () => {
      canvasManager.setResolutionWidth(500)

      expect(mockMontageArea.set).toHaveBeenCalledWith({ width: 500 })
      expect(mockCanvas.clipPath.set).toHaveBeenCalledWith({ width: 500 })
      expect(mockCanvas.fire).toHaveBeenCalledWith('editor:resolution-width-changed', expect.objectContaining({
        width: 500
      }))
    })

    it('ограничивает ширину минимальным значением', () => {
      canvasManager.setResolutionWidth(10) // меньше CANVAS_MIN_WIDTH

      expect(mockMontageArea.set).toHaveBeenCalledWith({ width: CANVAS_MIN_WIDTH })
    })

    it('ограничивает ширину максимальным значением', () => {
      canvasManager.setResolutionWidth(10000) // больше CANVAS_MAX_WIDTH

      expect(mockMontageArea.set).toHaveBeenCalledWith({ width: CANVAS_MAX_WIDTH })
    })

    it('сохраняет пропорции при установке preserveProportional', () => {
      const setResolutionHeightSpy = jest.spyOn(canvasManager, 'setResolutionHeight')

      canvasManager.setResolutionWidth(800, { preserveProportional: true })

      // Ожидаемая новая высота: (mockMontageArea.height / mockMontageArea.width) * newWidth
      const expectedHeight = (mockMontageArea.height / mockMontageArea.width) * 800
      expect(setResolutionHeightSpy).toHaveBeenCalledWith(expectedHeight)
    })

    it('не сохраняет состояние при withoutSave: true', () => {
      canvasManager.setResolutionWidth(500, { withoutSave: true })

      expect(mockEditor.historyManager.saveState).not.toHaveBeenCalled()
    })

    it('адаптирует канвас к контейнеру при adaptCanvasToContainer: true', () => {
      const adaptSpy = jest.spyOn(canvasManager, 'adaptCanvasToContainer')

      canvasManager.setResolutionWidth(500, { adaptCanvasToContainer: true })

      expect(adaptSpy).toHaveBeenCalled()
    })
  })

  describe('setResolutionHeight', () => {
    it('не делает ничего если height пустой', () => {
      canvasManager.setResolutionHeight('')
      expect(mockMontageArea.set).not.toHaveBeenCalled()
      expect(mockCanvas.fire).not.toHaveBeenCalled()
    })

    it('устанавливает высоту с ограничениями', () => {
      canvasManager.setResolutionHeight(400)

      expect(mockMontageArea.set).toHaveBeenCalledWith({ height: 400 })
      expect(mockCanvas.clipPath.set).toHaveBeenCalledWith({ height: 400 })
      expect(mockCanvas.fire).toHaveBeenCalledWith('editor:resolution-height-changed', expect.objectContaining({
        height: 400
      }))
    })

    it('сохраняет пропорции при установке preserveProportional', () => {
      const setResolutionWidthSpy = jest.spyOn(canvasManager, 'setResolutionWidth')

      canvasManager.setResolutionHeight(600, { preserveProportional: true })

      // Ожидаемая новая ширина: (mockMontageArea.width / mockMontageArea.height) * newHeight
      const expectedWidth = (mockMontageArea.width / mockMontageArea.height) * 600
      expect(setResolutionWidthSpy).toHaveBeenCalledWith(expectedWidth)
    })

    it('ограничивает высоту минимальным значением', () => {
      canvasManager.setResolutionHeight(10) // меньше CANVAS_MIN_HEIGHT

      expect(mockMontageArea.set).toHaveBeenCalledWith({ height: CANVAS_MIN_HEIGHT })
    })

    it('ограничивает высоту максимальным значением', () => {
      canvasManager.setResolutionHeight(10000) // больше CANVAS_MAX_HEIGHT

      expect(mockMontageArea.set).toHaveBeenCalledWith({ height: CANVAS_MAX_HEIGHT })
    })

    it('не сохраняет состояние при withoutSave: true', () => {
      canvasManager.setResolutionHeight(400, { withoutSave: true })

      expect(mockEditor.historyManager.saveState).not.toHaveBeenCalled()
    })

    it('адаптирует канвас к контейнеру при adaptCanvasToContainer: true', () => {
      const adaptSpy = jest.spyOn(canvasManager, 'adaptCanvasToContainer')

      canvasManager.setResolutionHeight(400, { adaptCanvasToContainer: true })

      expect(adaptSpy).toHaveBeenCalled()
    })
  })

  describe('centerMontageArea', () => {
    it('центрирует монтажную область', () => {
      canvasManager.centerMontageArea()

      // Получаем размеры из моков канваса
      const canvasWidth = mockCanvas.getWidth() // 800
      const canvasHeight = mockCanvas.getHeight() // 600
      const expectedLeft = canvasWidth / 2 // 400
      const expectedTop = canvasHeight / 2 // 300

      expect(mockMontageArea.set).toHaveBeenCalledWith({
        left: expectedLeft,
        top: expectedTop
      })
      expect(mockCanvas.clipPath.set).toHaveBeenCalledWith({
        left: expectedLeft,
        top: expectedTop
      })
      expect(mockCanvas.setViewportTransform).toHaveBeenCalled()
      expect(mockCanvas.renderAll).toHaveBeenCalledTimes(2)
    })
  })

  describe('getObjectDefaultCoords', () => {
    it('возвращает координаты переданного объекта', () => {
      const mockObject = { width: 100, height: 80 }

      const coords = canvasManager.getObjectDefaultCoords(mockObject as any)

      // (100 - 100*1) / 2 = 0
      expect(coords).toEqual({ left: 0, top: 0 })
    })

    it('возвращает координаты активного объекта если объект не передан', () => {
      const activeObject = { width: 200, height: 150 }
      mockCanvas.getActiveObject.mockReturnValue(activeObject)

      const coords = canvasManager.getObjectDefaultCoords(undefined as any)

      // (200 - 200*1) / 2 = 0
      expect(coords).toEqual({ left: 0, top: 0 })
    })

    it('выдаёт ошибку и возвращает {0,0} если нет объекта', () => {
      mockCanvas.getActiveObject.mockReturnValue(null)

      const coords = canvasManager.getObjectDefaultCoords(undefined as any)

      expect(mockEditor.errorManager.emitError).toHaveBeenCalledWith({
        origin: 'CanvasManager',
        method: 'getObjectDefaultCoords',
        code: 'NO_ACTIVE_OBJECT',
        message: 'Не выбран объект для получения координат'
      })
      expect(coords).toEqual({ left: 0, top: 0 })
    })
  })

  describe('setCanvasBackstoreWidth/Height', () => {
    it('setCanvasBackstoreWidth устанавливает ширину с ограничениями', () => {
      canvasManager.setCanvasBackstoreWidth(500)

      expect(mockCanvas.setDimensions).toHaveBeenCalledWith(
        { width: 500 },
        { backstoreOnly: true }
      )
    })

    it('setCanvasBackstoreHeight устанавливает высоту с ограничениями', () => {
      canvasManager.setCanvasBackstoreHeight(400)

      expect(mockCanvas.setDimensions).toHaveBeenCalledWith(
        { height: 400 },
        { backstoreOnly: true }
      )
    })

    it('не делает ничего при некорректных значениях', () => {
      canvasManager.setCanvasBackstoreWidth(0)
      canvasManager.setCanvasBackstoreHeight('invalid' as any)

      expect(mockCanvas.setDimensions).not.toHaveBeenCalled()
    })
  })

  describe('adaptCanvasToContainer', () => {
    it('адаптирует размеры канваса к контейнеру', () => {
      canvasManager.adaptCanvasToContainer()

      expect(mockCanvas.setDimensions).toHaveBeenCalledWith(
        { width: mockContainer.clientWidth, height: mockContainer.clientHeight },
        { backstoreOnly: true }
      )
    })

    it('ограничивает размеры минимальными и максимальными значениями', () => {
      // Симулируем очень маленький контейнер
      Object.defineProperty(mockContainer, 'clientWidth', { value: 10 })
      Object.defineProperty(mockContainer, 'clientHeight', { value: 10 })

      canvasManager.adaptCanvasToContainer()

      expect(mockCanvas.setDimensions).toHaveBeenCalledWith(
        { width: CANVAS_MIN_WIDTH, height: CANVAS_MIN_HEIGHT },
        { backstoreOnly: true }
      )
    })
  })

  describe('scaleMontageAreaToImage', () => {
    it('не делает ничего если объект не является изображением', () => {
      const mockObject = { type: 'rect', width: 100, height: 100 }
      mockCanvas.getActiveObject.mockReturnValue(mockObject)

      canvasManager.scaleMontageAreaToImage({})

      expect(mockCanvas.fire).not.toHaveBeenCalledWith('editor:montage-area-scaled-to-image', expect.any(Object))
    })

    it('масштабирует монтажную область под изображение', () => {
      const mockImage = { type: 'image', width: 600, height: 400 }
      mockCanvas.getActiveObject.mockReturnValue(mockImage)

      const setResolutionWidthSpy = jest.spyOn(canvasManager, 'setResolutionWidth')
      const setResolutionHeightSpy = jest.spyOn(canvasManager, 'setResolutionHeight')

      canvasManager.scaleMontageAreaToImage({})

      expect(setResolutionWidthSpy).toHaveBeenCalledWith(mockImage.width, { withoutSave: true })
      expect(setResolutionHeightSpy).toHaveBeenCalledWith(mockImage.height, { withoutSave: true })
      expect(mockEditor.transformManager.resetObject).toHaveBeenCalledWith(mockImage, { withoutSave: true })
      expect(mockCanvas.centerObject).toHaveBeenCalledWith(mockImage)
      expect(mockCanvas.fire).toHaveBeenCalledWith('editor:montage-area-scaled-to-image', expect.objectContaining({
        object: mockImage,
        width: mockImage.width,
        height: mockImage.height
      }))
    })

    it('сохраняет пропорции при preserveAspectRatio: true', () => {
      const mockImage = { type: 'image', width: 800, height: 600 }

      const setResolutionWidthSpy = jest.spyOn(canvasManager, 'setResolutionWidth')
      const setResolutionHeightSpy = jest.spyOn(canvasManager, 'setResolutionHeight')

      canvasManager.scaleMontageAreaToImage({
        object: mockImage as any,
        preserveAspectRatio: true
      })

      expect(setResolutionWidthSpy).toHaveBeenCalledWith(mockImage.width, { withoutSave: true })
      expect(setResolutionHeightSpy).toHaveBeenCalledWith(mockImage.height, { withoutSave: true })
    })
  })

  describe('clearCanvas', () => {
    it('очищает канвас и восстанавливает монтажную область', () => {
      canvasManager.clearCanvas()

      expect(mockEditor.historyManager.suspendHistory).toHaveBeenCalled()
      expect(mockCanvas.clear).toHaveBeenCalled()
      expect(mockCanvas.add).toHaveBeenCalledWith(mockMontageArea)
      expect(mockEditor.historyManager.resumeHistory).toHaveBeenCalled()
      expect(mockEditor.historyManager.saveState).toHaveBeenCalled()
      expect(mockCanvas.fire).toHaveBeenCalledWith('editor:cleared')
    })
  })

  describe('setDefaultScale', () => {
    it('сбрасывает зум и размеры к значениям по умолчанию', () => {
      const setResolutionWidthSpy = jest.spyOn(canvasManager, 'setResolutionWidth')
      const setResolutionHeightSpy = jest.spyOn(canvasManager, 'setResolutionHeight')

      canvasManager.setDefaultScale({})

      expect(mockEditor.transformManager.resetZoom).toHaveBeenCalled()
      expect(setResolutionWidthSpy).toHaveBeenCalledWith(mockMontageArea.width, { withoutSave: true })
      expect(setResolutionHeightSpy).toHaveBeenCalledWith(mockMontageArea.height, { withoutSave: true })
      expect(mockEditor.transformManager.resetObjects).toHaveBeenCalled()
      expect(mockEditor.historyManager.saveState).toHaveBeenCalled()
      expect(mockCanvas.fire).toHaveBeenCalledWith('editor:default-scale-set')
    })

    it('не сохраняет состояние при withoutSave: true', () => {
      canvasManager.setDefaultScale({ withoutSave: true })

      expect(mockEditor.historyManager.saveState).not.toHaveBeenCalled()
    })
  })

  describe('getObjects', () => {
    it('возвращает объекты исключая служебные', () => {
      const objects = [
        { id: 'montage-area' },
        { id: 'overlay-mask' },
        { id: 'user-object-1' },
        { id: 'user-object-2' }
      ]
      mockCanvas.getObjects.mockReturnValue(objects)

      const result = canvasManager.getObjects()

      expect(result).toEqual([
        { id: 'user-object-1' },
        { id: 'user-object-2' }
      ])
    })
  })

  describe('setDisplayDimension', () => {
    it('не делает ничего если value пустое', () => {
      canvasManager.setDisplayDimension({ value: '' })

      expect(mockCanvas.fire).not.toHaveBeenCalled()
    })

    it('устанавливает CSS размеры для элементов канваса', () => {
      canvasManager.setDisplayDimension({
        element: 'canvas',
        dimension: 'width',
        value: '700px'
      })

      expect(mockCanvas.lowerCanvasEl.style.width).toBe('700px')
      expect(mockCanvas.upperCanvasEl.style.width).toBe('700px')
    })

    it('устанавливает размеры для контейнера используя accessor', () => {
      canvasManager.setDisplayDimension({
        element: 'container',
        dimension: 'height',
        value: 500
      })

      expect(mockCanvas.fire).toHaveBeenCalledWith('editor:display-container-height-changed', {
        element: 'container',
        value: 500
      })
    })

    it('преобразует числовые значения в пиксели', () => {
      canvasManager.setDisplayDimension({
        element: 'canvas',
        dimension: 'height',
        value: 400
      })

      expect(mockCanvas.lowerCanvasEl.style.height).toBe('400px')
      expect(mockCanvas.upperCanvasEl.style.height).toBe('400px')
    })

    it('игнорирует NaN значения', () => {
      canvasManager.setDisplayDimension({
        element: 'canvas',
        dimension: 'width',
        value: NaN
      })

      expect(mockCanvas.fire).not.toHaveBeenCalled()
    })
  })

  describe('CSS Dimension методы', () => {
    describe('setCanvasCSSWidth/Height', () => {
      it('setCanvasCSSWidth устанавливает CSS ширину канваса', () => {
        const setDisplayDimensionSpy = jest.spyOn(canvasManager, 'setDisplayDimension')

        canvasManager.setCanvasCSSWidth('800px')

        expect(setDisplayDimensionSpy).toHaveBeenCalledWith({
          element: 'canvas',
          dimension: 'width',
          value: '800px'
        })
      })

      it('setCanvasCSSHeight устанавливает CSS высоту канваса', () => {
        const setDisplayDimensionSpy = jest.spyOn(canvasManager, 'setDisplayDimension')

        canvasManager.setCanvasCSSHeight(600)

        expect(setDisplayDimensionSpy).toHaveBeenCalledWith({
          element: 'canvas',
          dimension: 'height',
          value: 600
        })
      })
    })

    describe('setCanvasWrapperWidth/Height', () => {
      it('setCanvasWrapperWidth устанавливает CSS ширину обертки канваса', () => {
        const setDisplayDimensionSpy = jest.spyOn(canvasManager, 'setDisplayDimension')

        canvasManager.setCanvasWrapperWidth('700px')

        expect(setDisplayDimensionSpy).toHaveBeenCalledWith({
          element: 'wrapper',
          dimension: 'width',
          value: '700px'
        })
      })

      it('setCanvasWrapperHeight устанавливает CSS высоту обертки канваса', () => {
        const setDisplayDimensionSpy = jest.spyOn(canvasManager, 'setDisplayDimension')

        canvasManager.setCanvasWrapperHeight(500)

        expect(setDisplayDimensionSpy).toHaveBeenCalledWith({
          element: 'wrapper',
          dimension: 'height',
          value: 500
        })
      })
    })

    describe('setEditorContainerWidth/Height', () => {
      it('setEditorContainerWidth устанавливает CSS ширину контейнера редактора', () => {
        const setDisplayDimensionSpy = jest.spyOn(canvasManager, 'setDisplayDimension')

        canvasManager.setEditorContainerWidth('900px')

        expect(setDisplayDimensionSpy).toHaveBeenCalledWith({
          element: 'container',
          dimension: 'width',
          value: '900px'
        })
      })

      it('setEditorContainerHeight устанавливает CSS высоту контейнера редактора', () => {
        const setDisplayDimensionSpy = jest.spyOn(canvasManager, 'setDisplayDimension')

        canvasManager.setEditorContainerHeight(700)

        expect(setDisplayDimensionSpy).toHaveBeenCalledWith({
          element: 'container',
          dimension: 'height',
          value: 700
        })
      })
    })
  })

  describe('updateCanvas', () => {
    it('обновляет размеры канваса без изменения позиций объектов', () => {
      const setResolutionWidthSpy = jest.spyOn(canvasManager, 'setResolutionWidth')
      const setResolutionHeightSpy = jest.spyOn(canvasManager, 'setResolutionHeight')
      const centerMontageAreaSpy = jest.spyOn(canvasManager, 'centerMontageArea')

      // Мокаем объекты на канвасе
      const objects = [
        { id: 'montage-area', left: 200, top: 150, set: jest.fn(), setCoords: jest.fn() },
        { id: 'user-object', left: 300, top: 250, set: jest.fn(), setCoords: jest.fn() }
      ]
      mockCanvas.getObjects.mockReturnValue(objects)

      canvasManager.updateCanvas()

      expect(setResolutionWidthSpy).toHaveBeenCalledWith(mockMontageArea.width, { adaptCanvasToContainer: true, withoutSave: true })
      expect(setResolutionHeightSpy).toHaveBeenCalledWith(mockMontageArea.height, { adaptCanvasToContainer: true, withoutSave: true })
      expect(centerMontageAreaSpy).toHaveBeenCalled()
      expect(mockCanvas.fire).toHaveBeenCalledWith('editor:canvas-updated', {
        width: mockMontageArea.width,
        height: mockMontageArea.height
      })
    })

    it('корректно смещает объекты при изменении позиции монтажной области', () => {
      // Мокаем изменение позиции монтажной области
      const oldLeft = 100
      const oldTop = 50
      mockMontageArea.left = oldLeft
      mockMontageArea.top = oldTop

      const userObject = {
        id: 'user-object',
        left: 300,
        top: 250,
        set: jest.fn(),
        setCoords: jest.fn()
      }

      mockCanvas.getObjects.mockReturnValue([mockMontageArea, userObject])

      // Симулируем изменение позиции монтажной области после centerMontageArea
      jest.spyOn(canvasManager, 'centerMontageArea').mockImplementation(() => {
        mockMontageArea.left = 400 // новая позиция
        mockMontageArea.top = 300 // новая позиция
      })

      canvasManager.updateCanvas()

      // Проверяем, что объект сместился на дельту изменения монтажной области
      const deltaX = 400 - oldLeft // 300
      const deltaY = 300 - oldTop // 250

      expect(userObject.set).toHaveBeenCalledWith({
        left: userObject.left + deltaX, // 300 + 300 = 600
        top: userObject.top + deltaY // 250 + 250 = 500
      })
      expect(userObject.setCoords).toHaveBeenCalled()
    })
  })
})
