import { Point } from 'fabric'
import {
  createShapeOwnedScalingTextbox,
  createStyledScalingTextbox,
  createTextScalingRuntimeSetup,
  createTextScalingTransform,
  mockTextScalingLocalPoint,
  setCurrentTextScalingTransform
} from '../../../../test-utils/text/scaling'

describe('масштабирование текста', () => {
  describe('запекание временного масштаба', () => {
    it('не трогает текст внутри фигуры', () => {
      const { controller } = createTextScalingRuntimeSetup()
      const textbox = createShapeOwnedScalingTextbox()

      textbox.scaleX = 1.4
      textbox.scaleY = 0.8

      const result = controller.commitStandaloneTextScale({
        target: textbox
      })

      expect(result).toBe(false)
      expect(textbox.scaleX).toBe(1.4)
      expect(textbox.scaleY).toBe(0.8)
    })
  })

  describe('скейлинг по диагонали', () => {
    it('при сильном уменьшении останавливается на минимальном размере шрифта', () => {
      const {
        controller,
        textbox
      } = createTextScalingRuntimeSetup({
        width: 120,
        fontSize: 12,
        autoExpand: false
      })
      const transform = createTextScalingTransform({ textbox })

      textbox.scaleX = 0.2
      textbox.scaleY = 0.2

      controller.handleObjectScaling({
        target: textbox,
        transform
      } as never)

      expect(textbox.fontSize).toBe(8)
      expect(textbox.width).toBeCloseTo(80, 5)
      expect(textbox.scaleX).toBe(1)
      expect(textbox.scaleY).toBe(1)
    })

    it('не схлопывает текст если курсор ушёл через противоположную сторону', () => {
      const {
        controller,
        textbox
      } = createTextScalingRuntimeSetup()
      const transform = createTextScalingTransform({ textbox })

      textbox.scaleX = 0.75
      textbox.scaleY = 0.75
      controller.handleObjectScaling({
        target: textbox,
        transform
      } as never)

      const widthAfterFirstStep = textbox.width ?? 0
      const fontSizeAfterFirstStep = textbox.fontSize ?? 0

      textbox.scaleX = -0.4
      textbox.scaleY = 0.4
      transform.scaleX = -0.4
      transform.scaleY = 0.4

      controller.handleObjectScaling({
        target: textbox,
        transform
      } as never)

      expect(textbox.width).toBeCloseTo(widthAfterFirstStep, 5)
      expect(textbox.fontSize).toBeCloseTo(fontSizeAfterFirstStep, 5)
    })

    it('не дёргает размер если во время одного скейлинга изменилась точка от которой тянут объект', () => {
      const {
        controller,
        textbox
      } = createTextScalingRuntimeSetup()
      const firstTransform = createTextScalingTransform({ textbox })

      textbox.scaleX = 0.75
      textbox.scaleY = 0.75
      controller.handleObjectScaling({
        target: textbox,
        transform: firstTransform
      } as never)

      const widthAfterFirstStep = textbox.width ?? 0
      const fontSizeAfterFirstStep = textbox.fontSize ?? 0

      const secondTransform = createTextScalingTransform({
        textbox,
        originX: 'right',
        originY: 'bottom',
        scaleX: 0.5,
        scaleY: 0.5
      })

      textbox.scaleX = 0.5
      textbox.scaleY = 0.5

      controller.handleObjectScaling({
        target: textbox,
        transform: secondTransform
      } as never)

      expect(textbox.width).toBeCloseTo(widthAfterFirstStep, 5)
      expect(textbox.fontSize).toBeCloseTo(fontSizeAfterFirstStep, 5)
    })

    it('не меняет origin текста, если во время одного скейлинга меняется точка, от которой его тянут', () => {
      const {
        controller,
        textbox
      } = createTextScalingRuntimeSetup({
        originX: 'left',
        originY: 'top'
      })
      const firstTransform = createTextScalingTransform({ textbox })

      textbox.scaleX = 0.75
      textbox.scaleY = 0.75
      controller.handleObjectScaling({
        target: textbox,
        transform: firstTransform
      } as never)

      const secondTransform = createTextScalingTransform({
        textbox,
        corner: 'tr',
        originX: 'left',
        originY: 'bottom'
      })

      textbox.scaleX = 0.5
      textbox.scaleY = 0.5

      controller.handleObjectScaling({
        target: textbox,
        transform: secondTransform
      } as never)

      expect(textbox.originX).toBe('left')
      expect(textbox.originY).toBe('top')
    })
  })

  describe('движение мыши во время скейлинга', () => {
    afterEach(() => {
      jest.restoreAllMocks()
    })

    it('продолжает уменьшать текст движением мыши после первого шага', () => {
      const {
        canvas,
        controller,
        textbox
      } = createTextScalingRuntimeSetup()
      const transform = createTextScalingTransform({ textbox })
      const textboxWithDimensions = textbox as unknown as {
        _getTransformedDimensions: jest.Mock
      }

      textbox.scaleX = 0.9
      textbox.scaleY = 0.9
      controller.handleObjectScaling({
        target: textbox,
        transform
      } as never)

      const widthAfterFirstStep = textbox.width ?? 0

      textboxWithDimensions._getTransformedDimensions = jest.fn(() => ({
        x: 100,
        y: 100
      }))
      canvas.getScenePoint = jest.fn(() => new Point(0, 0))
      mockTextScalingLocalPoint({
        x: 50,
        y: 50
      })
      setCurrentTextScalingTransform({
        canvas,
        transform
      })

      controller.handleMouseMove({
        e: {} as MouseEvent
      } as never)

      expect(textbox.width).toBeLessThan(widthAfterFirstStep)
      expect(canvas.requestRenderAll).toHaveBeenCalled()
    })

    it('не меняет origin текста при продолжении скейлинга движением мыши', () => {
      const {
        canvas,
        controller,
        textbox
      } = createTextScalingRuntimeSetup({
        originX: 'left',
        originY: 'top'
      })
      const transform = createTextScalingTransform({
        textbox,
        corner: 'tr',
        originX: 'left',
        originY: 'bottom'
      })
      const textboxWithDimensions = textbox as unknown as {
        _getTransformedDimensions: jest.Mock
      }

      textbox.scaleX = 0.9
      textbox.scaleY = 0.9
      controller.handleObjectScaling({
        target: textbox,
        transform
      } as never)

      textboxWithDimensions._getTransformedDimensions = jest.fn(() => ({
        x: 100,
        y: 100
      }))
      canvas.getScenePoint = jest.fn(() => new Point(0, 0))
      mockTextScalingLocalPoint({
        x: 50,
        y: 50
      })
      setCurrentTextScalingTransform({
        canvas,
        transform
      })

      controller.handleMouseMove({
        e: {} as MouseEvent
      } as never)

      expect(textbox.originX).toBe('left')
      expect(textbox.originY).toBe('top')
    })
  })

  describe('завершение скейлинга', () => {
    it('сохраняет итоговый размер шрифта у обычного текста', () => {
      const {
        controller,
        persistScaledTextbox,
        textbox
      } = createTextScalingRuntimeSetup({
        width: 100,
        fontSize: 20
      })
      const transform = createTextScalingTransform({ textbox })

      textbox.scaleX = 1.5
      textbox.scaleY = 1.5
      controller.handleObjectScaling({
        target: textbox,
        transform
      } as never)
      controller.handleObjectModified({
        target: textbox
      } as never)

      expect(persistScaledTextbox).toHaveBeenCalledWith(expect.objectContaining({
        target: textbox,
        style: expect.objectContaining({
          fontSize: 30,
          width: 150
        })
      }))
      expect(textbox.scaleX).toBe(1)
      expect(textbox.scaleY).toBe(1)
    })

    it('не записывает общий размер шрифта поверх текста с разными размерами строк', () => {
      const {
        controller,
        persistScaledTextbox
      } = createTextScalingRuntimeSetup()
      const textbox = createStyledScalingTextbox()

      const transform = createTextScalingTransform({ textbox })

      textbox.scaleX = 1.5
      textbox.scaleY = 1.5
      controller.handleObjectScaling({
        target: textbox,
        transform
      } as never)
      controller.handleObjectModified({
        target: textbox
      } as never)

      const firstCall = persistScaledTextbox.mock.calls[0]?.[0]

      expect(firstCall?.style).toEqual(expect.objectContaining({
        width: expect.any(Number),
        paddingTop: expect.any(Number),
        radiusTopLeft: expect.any(Number)
      }))
      expect(firstCall?.style).not.toHaveProperty('fontSize')
    })

    it('не сохраняет состояние если размер по факту не изменился', () => {
      const {
        controller,
        persistScaledTextbox,
        textbox
      } = createTextScalingRuntimeSetup()
      const transform = createTextScalingTransform({ textbox })

      textbox.scaleX = 1
      textbox.scaleY = 1
      controller.handleObjectScaling({
        target: textbox,
        transform
      } as never)
      controller.handleObjectModified({
        target: textbox
      } as never)

      expect(persistScaledTextbox).not.toHaveBeenCalled()
    })

    it('после завершения скейлинга сохраняет исходный origin текста', () => {
      const {
        controller,
        textbox
      } = createTextScalingRuntimeSetup({
        originX: 'left',
        originY: 'top'
      })
      const transform = createTextScalingTransform({
        textbox,
        corner: 'tr',
        originX: 'left',
        originY: 'bottom'
      })

      textbox.scaleX = 1.5
      textbox.scaleY = 1.5

      controller.handleObjectScaling({
        target: textbox,
        transform
      } as never)
      controller.handleObjectModified({
        target: textbox
      } as never)

      expect(textbox.originX).toBe('left')
      expect(textbox.originY).toBe('top')
    })
  })
})
