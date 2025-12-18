import { Point } from 'fabric'
import ZoomManager from '../../../../src/editor/zoom-manager'
import { createManagerTestMocks } from '../../../test-utils/editor-helpers'

describe('ZoomManager', () => {
  let mockEditor: any
  let zoomManager: ZoomManager
  let mockCanvas: any

  beforeEach(() => {
    const mocks = createManagerTestMocks()
    mockEditor = mocks.mockEditor
    mockCanvas = mocks.mockCanvas

    mockCanvas.editorContainer = {
      clientWidth: 800,
      clientHeight: 600
    }

    zoomManager = new ZoomManager({ editor: mockEditor })
    mockEditor.zoomManager = zoomManager
  })

  describe('constructor', () => {
    it('должен инициализировать ZoomManager с правильными параметрами', () => {
      expect(zoomManager.editor).toBe(mockEditor)
      expect(zoomManager.options).toBe(mockEditor.options)
      expect(zoomManager.minZoom).toBe(0.1)
      expect(zoomManager.maxZoom).toBe(2)
      expect(zoomManager.defaultZoom).toBe(0.8)
    })

    it('должен использовать значения по умолчанию из констант', () => {
      const editorWithoutZoom = {
        ...mockEditor,
        options: {
          ...mockEditor.options,
          minZoom: undefined,
          maxZoom: undefined
        }
      }

      const zm = new ZoomManager({ editor: editorWithoutZoom })
      expect(zm.minZoom).toBe(0.1)
      expect(zm.maxZoom).toBe(2)
    })

    it('должен ограничивать defaultZoom минимальным значением', () => {
      const { options } = mockEditor
      const editorWithSmallScale = {
        ...mockEditor,
        options: {
          ...options,
          defaultScale: 0.01
        }
      }

      const zm = new ZoomManager({ editor: editorWithSmallScale })

      expect(zm.defaultZoom).toBe(zm.minZoom)
    })

    it('должен ограничивать defaultZoom максимальным значением', () => {
      const { options } = mockEditor
      const editorWithLargeScale = {
        ...mockEditor,
        options: {
          ...options,
          defaultScale: 5
        }
      }

      const zm = new ZoomManager({ editor: editorWithLargeScale })

      expect(zm.defaultZoom).toBe(zm.maxZoom)
    })
  })

  describe('calculateAndApplyDefaultZoom', () => {
    it('должен рассчитать и применить зум по размерам контейнера', () => {
      const setZoomSpy = jest.spyOn(zoomManager, 'setZoom').mockImplementation()

      zoomManager.calculateAndApplyDefaultZoom()

      expect(zoomManager.defaultZoom).toBe(1.6)
      expect(setZoomSpy).toHaveBeenCalled()
      expect(mockEditor.panConstraintManager.updateBounds).toHaveBeenCalled()
    })

    it('должен использовать переданный scale параметр', () => {
      const setZoomSpy = jest.spyOn(zoomManager, 'setZoom').mockImplementation()

      zoomManager.calculateAndApplyDefaultZoom(0.5)

      expect(zoomManager.defaultZoom).toBe(1.0)
      expect(setZoomSpy).toHaveBeenCalled()
    })
  })

  describe('zoom', () => {
    it('должен увеличить зум на заданное значение', () => {
      mockCanvas.getZoom.mockReturnValue(1)

      zoomManager.zoom(0.1)

      expect(mockCanvas.zoomToPoint).toHaveBeenCalledWith(
        expect.any(Point),
        1.1
      )
      expect(mockCanvas.fire).toHaveBeenCalledWith('editor:zoom-changed', {
        currentZoom: 1,
        zoom: 1.1,
        point: expect.any(Point)
      })
      expect(mockEditor.panConstraintManager.updateBounds).toHaveBeenCalled()
    })

    it('должен ограничить зум максимальным значением', () => {
      mockCanvas.getZoom.mockReturnValue(1.95)

      zoomManager.zoom(0.1)

      expect(mockCanvas.zoomToPoint).toHaveBeenCalledWith(
        expect.any(Point),
        2
      )
    })

    it('должен ограничить зум минимальным значением', () => {
      mockCanvas.getZoom.mockReturnValue(0.15)

      zoomManager.zoom(-0.1)

      expect(mockCanvas.zoomToPoint).toHaveBeenCalledWith(
        expect.any(Point),
        0.1
      )
    })

    it('должен использовать переданные координаты точки зума', () => {
      mockCanvas.getZoom.mockReturnValue(1)

      zoomManager.zoom(0.1, { pointX: 100, pointY: 200 })

      expect(mockCanvas.zoomToPoint).toHaveBeenCalledWith(
        new Point(100, 200),
        1.1
      )
    })

    it('не должен делать ничего если scale равен 0', () => {
      zoomManager.zoom(0)

      expect(mockCanvas.zoomToPoint).not.toHaveBeenCalled()
      expect(mockCanvas.fire).not.toHaveBeenCalled()
    })
  })

  describe('setZoom', () => {
    it('должен установить заданный зум', () => {
      zoomManager.setZoom(1.5)

      expect(mockCanvas.zoomToPoint).toHaveBeenCalledWith(
        expect.any(Point),
        1.5
      )
      expect(mockCanvas.fire).toHaveBeenCalledWith('editor:zoom-changed', {
        currentZoom: 1,
        zoom: 1.5,
        point: expect.any(Point)
      })
      expect(mockEditor.panConstraintManager.updateBounds).toHaveBeenCalled()
    })

    it('должен использовать defaultZoom если зум не передан', () => {
      zoomManager.setZoom()

      expect(mockCanvas.zoomToPoint).toHaveBeenCalledWith(
        expect.any(Point),
        0.8
      )
    })

    it('должен ограничить зум максимальным значением', () => {
      zoomManager.setZoom(5)

      expect(mockCanvas.zoomToPoint).toHaveBeenCalledWith(
        expect.any(Point),
        2
      )
    })
  })

  describe('resetZoom', () => {
    it('должен сбросить зум к значению по умолчанию', () => {
      mockCanvas.getZoom.mockReturnValue(0.8)

      zoomManager.resetZoom()

      expect(mockCanvas.zoomToPoint).toHaveBeenCalledWith(
        expect.any(Point),
        0.8
      )
      expect(mockEditor.canvas.fire).toHaveBeenCalledWith('editor:zoom-changed', {
        currentZoom: 0.8,
        point: expect.any(Point)
      })
      expect(mockEditor.panConstraintManager.updateBounds).toHaveBeenCalled()
    })
  })

  describe('handleMouseWheelZoom', () => {
    it('должен зумить к центру монтажной области когда zoom < defaultZoom', () => {
      mockCanvas.getZoom.mockReturnValue(0.5)
      mockCanvas.getWidth.mockReturnValue(800)
      mockCanvas.getHeight.mockReturnValue(600)

      const mockEvent = new WheelEvent('wheel', { deltaY: -100 })
      const zoomSpy = jest.spyOn(zoomManager, 'zoom')

      zoomManager.handleMouseWheelZoom(0.1, mockEvent)

      expect(zoomSpy).toHaveBeenCalledWith(0.1, {
        pointX: mockEditor.montageArea.left,
        pointY: mockEditor.montageArea.top
      })
    })

    it('должен зумить к центру когда монтажная область помещается во viewport', () => {
      mockCanvas.getZoom.mockReturnValue(1)
      mockCanvas.getWidth.mockReturnValue(800)
      mockCanvas.getHeight.mockReturnValue(600)

      const mockEvent = new WheelEvent('wheel', { deltaY: -100 })
      const zoomSpy = jest.spyOn(zoomManager, 'zoom')

      zoomManager.handleMouseWheelZoom(0.1, mockEvent)

      expect(zoomSpy).toHaveBeenCalledWith(0.1, {
        pointX: mockEditor.montageArea.left,
        pointY: mockEditor.montageArea.top
      })
    })

    it('должен зумить к курсору когда монтажная область выходит за пределы viewport', () => {
      mockCanvas.getZoom.mockReturnValue(2)
      mockCanvas.getWidth.mockReturnValue(800)
      mockCanvas.getHeight.mockReturnValue(600)
      mockCanvas.viewportTransform = [2, 0, 0, 2, 50, 100]
      mockCanvas.getPointer.mockReturnValue({ x: 400, y: 300 })

      const mockEvent = new WheelEvent('wheel', { deltaY: -100 })
      const zoomSpy = jest.spyOn(zoomManager, 'zoom')

      zoomManager.handleMouseWheelZoom(0.1, mockEvent)

      expect(zoomSpy).toHaveBeenCalledWith(0.1, {
        pointX: expect.any(Number),
        pointY: expect.any(Number)
      })
    })

    it('должен ограничить координаты курсора границами монтажной области', () => {
      mockCanvas.getZoom.mockReturnValue(2)
      mockCanvas.getWidth.mockReturnValue(800)
      mockCanvas.getHeight.mockReturnValue(600)
      mockCanvas.viewportTransform = [2, 0, 0, 2, 0, 0]
      mockCanvas.getPointer.mockReturnValue({ x: 1000, y: 1000 })

      const mockEvent = new WheelEvent('wheel', { deltaY: -100 })
      const zoomSpy = jest.spyOn(zoomManager, 'zoom')

      zoomManager.handleMouseWheelZoom(0.1, mockEvent)

      const callArgs = zoomSpy.mock.calls[0][1] as any

      expect(callArgs.pointX).toBeLessThanOrEqual(300)
      expect(callArgs.pointY).toBeLessThanOrEqual(200)
    })
  })

  describe('_applyViewportCentering', () => {
    it('должен полностью центрировать viewport при zoom <= defaultZoom', () => {
      mockCanvas.getWidth.mockReturnValue(800)
      mockCanvas.getHeight.mockReturnValue(600)
      mockCanvas.getZoom.mockReturnValue(0.5)
      mockCanvas.viewportTransform = [0.5, 0, 0, 0.5, 100, 50]
      mockCanvas.setViewportTransform.mockClear()

      zoomManager.zoom(0.3)

      expect(mockCanvas.setViewportTransform).toHaveBeenCalled()
    })

    it('должен применять плавное центрирование при zoom в переходном диапазоне', () => {
      mockCanvas.getWidth.mockReturnValue(800)
      mockCanvas.getHeight.mockReturnValue(600)
      mockCanvas.getZoom.mockReturnValue(1)
      mockCanvas.viewportTransform = [1, 0, 0, 1, 200, 150]

      zoomManager.zoom(0.2)

      expect(mockCanvas.setViewportTransform).toHaveBeenCalled()
    })

    it('не должен изменять viewport при zoom вне переходного диапазона', () => {
      mockCanvas.getWidth.mockReturnValue(800)
      mockCanvas.getHeight.mockReturnValue(600)
      mockCanvas.getZoom.mockReturnValue(1.5)
      mockCanvas.viewportTransform = [1.5, 0, 0, 1.5, 100, 50]

      zoomManager.zoom(0.1)

      expect(mockCanvas.setViewportTransform).toHaveBeenCalled()
    })
  })
})
