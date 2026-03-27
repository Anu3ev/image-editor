import { Point } from 'fabric'
import CanvasManager, {
  clampValue,
  calculateProportionalDimension,
  isImageObject
} from '../../../../src/editor/canvas-manager'
import {
  createManagerTestMocks,
  createMockFabricObject
} from '../../../test-utils/editor-helpers'
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

    describe('getMontageAreaCanonicalSceneCenter', () => {
      it('вычисляет канонический центр монтажной области от её размеров', () => {
        mockMontageArea.width = 800
        mockMontageArea.height = 600

        const center = canvasManager.getMontageAreaCanonicalSceneCenter()

        expect(center).toEqual(new Point(400, 300))
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

    describe('getVisibleCenterPoint', () => {
      beforeEach(() => {
        // Настраиваем стандартные параметры для тестов
        mockCanvas.getWidth.mockReturnValue(800)
        mockCanvas.getHeight.mockReturnValue(600)

        // Монтажная область 400x300 по центру канваса 800x600
        // left/top = 400/300 (центр)
        mockMontageArea.width = 400
        mockMontageArea.height = 300
        mockMontageArea.left = 400
        mockMontageArea.top = 300
      })

      it('возвращает центр вьюпорта, если он находится внутри монтажной области', () => {
        // Zoom 2, смещение такое, чтобы центр вьюпорта попадал в точку (250, 200)
        // CenterX = (CanvasW/2 - vptX) / zoom => 250 = (400 - vptX) / 2 => 500 = 400 - vptX => vptX = -100
        // CenterY = (CanvasH/2 - vptY) / zoom => 200 = (300 - vptY) / 2 => 400 = 300 - vptY => vptY = -100

        mockCanvas.getZoom.mockReturnValue(2)
        mockCanvas.viewportTransform = [2, 0, 0, 2, -100, -100]

        const result = canvasManager.getVisibleCenterPoint()

        // Границы монтажной области:
        // X: [400 - 200, 400 + 200] = [200, 600]
        // Y: [300 - 150, 300 + 150] = [150, 450]
        // Точка (250, 200) внутри границ
        expect(result.x).toBe(250)
        expect(result.y).toBe(200)
      })

      it('ограничивает координаты границами монтажной области (clamping)', () => {
        // Zoom 1, смещение такое, что центр вьюпорта улетает далеко влево-вверх (-600, -700)
        // CenterX = (400 - 1000) / 1 = -600
        // CenterY = (300 - 1000) / 1 = -700

        mockCanvas.getZoom.mockReturnValue(1)
        mockCanvas.viewportTransform = [1, 0, 0, 1, 1000, 1000]

        const result = canvasManager.getVisibleCenterPoint()

        // Границы монтажной области: [200, 600] x [150, 450]
        // Ожидаем привязку к левому верхнему углу монтажной области
        expect(result.x).toBe(200)
        expect(result.y).toBe(150)
      })

      it('возвращает центр монтажной области, если вьюпорт центрирован на ней', () => {
        mockCanvas.getZoom.mockReturnValue(1)
        // vpt = [1, 0, 0, 1, 0, 0] -> смещения нет
        // CenterX = 400 / 1 = 400
        // CenterY = 300 / 1 = 300
        mockCanvas.viewportTransform = [1, 0, 0, 1, 0, 0]

        const result = canvasManager.getVisibleCenterPoint()

        expect(result.x).toBe(400)
        expect(result.y).toBe(300)
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
      expect(mockCanvas.clipPath.set).toHaveBeenCalledWith(expect.objectContaining({ width: 500 }))
      expect(mockCanvas.clipPath.setCoords).toHaveBeenCalled()
      expect(mockCanvas.fire).toHaveBeenCalledWith('editor:resolution-width-changed', expect.objectContaining({
        width: 500
      }))
    })

    it('пересчитывает defaultZoom после изменения ширины монтажной области', () => {
      jest.clearAllMocks()

      canvasManager.setResolutionWidth(500)

      expect(mockEditor.zoomManager.calculateAndApplyDefaultZoom).toHaveBeenCalledTimes(1)
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
      expect(setResolutionHeightSpy).toHaveBeenCalledWith(expectedHeight, expect.objectContaining({
        withoutSave: undefined,
        adaptCanvasToContainer: undefined
      }))
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
      expect(mockCanvas.clipPath.set).toHaveBeenCalledWith(expect.objectContaining({ height: 400 }))
      expect(mockCanvas.clipPath.setCoords).toHaveBeenCalled()
      expect(mockCanvas.fire).toHaveBeenCalledWith('editor:resolution-height-changed', expect.objectContaining({
        height: 400
      }))
    })

    it('пересчитывает defaultZoom после изменения высоты монтажной области', () => {
      jest.clearAllMocks()

      canvasManager.setResolutionHeight(400)

      expect(mockEditor.zoomManager.calculateAndApplyDefaultZoom).toHaveBeenCalledTimes(1)
    })

    it('сохраняет пропорции при установке preserveProportional', () => {
      const setResolutionWidthSpy = jest.spyOn(canvasManager, 'setResolutionWidth')

      canvasManager.setResolutionHeight(600, { preserveProportional: true })

      // Ожидаемая новая ширина: (mockMontageArea.width / mockMontageArea.height) * newHeight
      const expectedWidth = (mockMontageArea.width / mockMontageArea.height) * 600
      expect(setResolutionWidthSpy).toHaveBeenCalledWith(expectedWidth, expect.objectContaining({
        withoutSave: undefined,
        adaptCanvasToContainer: undefined
      }))
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

  describe('placeMontageAreaAtCanonicalScenePosition', () => {
    it('приводит монтажную область и clipPath к каноническому scene-placement', () => {
      mockMontageArea.width = 800
      mockMontageArea.height = 600

      canvasManager.placeMontageAreaAtCanonicalScenePosition()

      expect(mockMontageArea.set).toHaveBeenCalledWith({
        left: 400,
        top: 300
      })
      expect(mockCanvas.clipPath.set).toHaveBeenCalledWith(expect.objectContaining({
        left: 400,
        top: 300,
        width: 800,
        height: 600
      }))
      expect(mockCanvas.clipPath.setCoords).toHaveBeenCalled()
    })
  })

  describe('getObjectPlacement', () => {
    it('возвращает placement объекта по effective origin', () => {
      const mockObject = {
        left: 10,
        top: 20,
        originX: 'left',
        originY: 'top',
        getPointByOrigin: jest.fn(() => new Point(10, 20))
      }

      const placement = canvasManager.getObjectPlacement({ object: mockObject as any })

      expect(placement).toEqual({
        left: 10,
        top: 20,
        originX: 'left',
        originY: 'top'
      })
    })

    it('может пересчитать placement для другого origin без мутации объекта', () => {
      const mockObject = {
        originX: 'center',
        originY: 'center',
        getPointByOrigin: jest.fn(() => new Point(120, 85))
      }

      const placement = canvasManager.getObjectPlacement({
        object: mockObject as any,
        originX: 'right',
        originY: 'bottom'
      })

      expect(mockObject.getPointByOrigin).toHaveBeenCalledWith('right', 'bottom')
      expect(placement).toEqual({
        left: 120,
        top: 85,
        originX: 'right',
        originY: 'bottom'
      })
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
      const mockImage = createMockFabricObject({
        type: 'image',
        width: 600,
        height: 400,
        setPositionByOrigin: jest.fn()
      })
      mockCanvas.getActiveObject.mockReturnValue(mockImage)

      const setResolutionWidthSpy = jest.spyOn(canvasManager, 'setResolutionWidth')
      const setResolutionHeightSpy = jest.spyOn(canvasManager, 'setResolutionHeight')
      const centerObjectSpy = jest.spyOn(canvasManager, 'centerObjectToMontageArea')

      canvasManager.scaleMontageAreaToImage({})

      expect(setResolutionWidthSpy).toHaveBeenCalledWith(mockImage.width, { withoutSave: true })
      expect(setResolutionHeightSpy).toHaveBeenCalledWith(mockImage.height, { withoutSave: true })
      expect(mockEditor.transformManager.resetObject).toHaveBeenCalledWith({ object: mockImage, withoutSave: true })
      expect(centerObjectSpy).toHaveBeenCalledWith({ object: mockImage as any })
      expect(mockCanvas.fire).toHaveBeenCalledWith('editor:montage-area-scaled-to-image', expect.objectContaining({
        object: mockImage,
        width: mockImage.width,
        height: mockImage.height
      }))
    })

    it('сохраняет пропорции при preserveAspectRatio: true', () => {
      const mockImage = createMockFabricObject({
        type: 'image',
        width: 800,
        height: 600,
        setPositionByOrigin: jest.fn()
      })

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

      expect(mockEditor.zoomManager.resetZoom).toHaveBeenCalled()
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
    it('обновляет camera-state и derived-слои без смещения пользовательских объектов', () => {
      const adaptCanvasToContainerSpy = jest.spyOn(canvasManager, 'adaptCanvasToContainer')
      const placeMontageSpy = jest.spyOn(canvasManager, 'placeMontageAreaAtCanonicalScenePosition')
      const centerViewportSpy = jest.spyOn(canvasManager, 'centerViewportToMontageArea')
      const refreshDerivedSpy = jest.spyOn(canvasManager, 'refreshMontageDerivedState')
      const userObject = { id: 'user-object', set: jest.fn(), setCoords: jest.fn() }

      canvasManager.updateCanvas()

      expect(adaptCanvasToContainerSpy).toHaveBeenCalled()
      expect(placeMontageSpy).toHaveBeenCalled()
      expect(mockEditor.zoomManager.updateDefaultZoom).toHaveBeenCalled()
      expect(centerViewportSpy).toHaveBeenCalled()
      expect(refreshDerivedSpy).toHaveBeenCalled()
      expect(mockEditor.panConstraintManager.updateBounds).toHaveBeenCalled()
      expect(userObject.set).not.toHaveBeenCalled()
      expect(mockCanvas.fire).toHaveBeenCalledWith('editor:canvas-updated', {
        width: mockMontageArea.width,
        height: mockMontageArea.height
      })
    })

    it('приводит монтажную область к каноническому placement вместо физического ресентра по canvas', () => {
      mockMontageArea.width = 500
      mockMontageArea.height = 350

      canvasManager.updateCanvas()

      expect(mockMontageArea.set).toHaveBeenCalledWith({
        left: 250,
        top: 175
      })
      expect(mockCanvas.clipPath.set).toHaveBeenCalledWith(expect.objectContaining({
        left: 250,
        top: 175,
        width: 500,
        height: 350
      }))
    })
  })
})
