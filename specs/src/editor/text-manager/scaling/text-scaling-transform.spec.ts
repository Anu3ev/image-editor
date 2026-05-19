import { Point } from 'fabric'
import {
  resolvePointerTextScalingStep,
  resolveTextScalingAxisState,
  syncLiveTextScalingTransform
} from '../../../../../src/editor/text-manager/scaling/text-scaling-transform'
import {
  createTextScalingRuntimeSetup,
  createTextScalingTransform,
  mockTextScalingLocalPoint
} from '../../../../test-utils/text/scaling'

describe('масштабирование текста', () => {
  describe('распознавание направления', () => {
    it('считает боковую ручку изменением ширины', () => {
      const state = resolveTextScalingAxisState({
        transform: {
          corner: 'mr',
          action: 'scaleX'
        } as never
      })

      expect(state.isHorizontalHandle).toBe(true)
      expect(state.isVerticalHandle).toBe(false)
      expect(state.isCornerHandle).toBe(false)
    })

    it('считает нижнюю ручку изменением размера текста по высоте', () => {
      const state = resolveTextScalingAxisState({
        transform: {
          corner: 'mb',
          action: 'scaleY'
        } as never
      })

      expect(state.isHorizontalHandle).toBe(false)
      expect(state.isVerticalHandle).toBe(true)
      expect(state.isCornerHandle).toBe(false)
    })

    it('считает угловую ручку скейлингом по диагонали', () => {
      const state = resolveTextScalingAxisState({
        transform: {
          corner: 'br',
          action: 'scale'
        } as never
      })

      expect(state.isHorizontalHandle).toBe(false)
      expect(state.isVerticalHandle).toBe(false)
      expect(state.isCornerHandle).toBe(true)
    })
  })

  describe('синхронизация live шага', () => {
    it('после live шага переносит новую ширину в transform и сбрасывает временный scale', () => {
      const { textbox } = createTextScalingRuntimeSetup()
      const transform = createTextScalingTransform({
        textbox,
        scaleX: 1.4,
        scaleY: 1.4
      })

      textbox.height = 90
      textbox.left = 120
      textbox.top = 180

      syncLiveTextScalingTransform({
        textbox,
        transform,
        appliedWidth: 222
      })

      expect(transform.scaleX).toBe(1)
      expect(transform.scaleY).toBe(1)
      expect(transform.original?.width).toBe(222)
      expect(transform.original?.height).toBe(90)
      expect(transform.original?.left).toBe(120)
      expect(transform.original?.top).toBe(180)
      expect(transform.original?.scaleX).toBe(1)
      expect(transform.original?.scaleY).toBe(1)
    })
  })

  describe('расчёт шага по указателю', () => {
    afterEach(() => {
      jest.restoreAllMocks()
    })

    it('при трансформации из центра считает двойной шаг указателя', () => {
      const { textbox } = createTextScalingRuntimeSetup()
      const transform = createTextScalingTransform({
        textbox,
        originX: 'center',
        originY: 'center'
      })

      const textboxWithDimensions = textbox as unknown as {
        _getTransformedDimensions: jest.Mock
      }

      textboxWithDimensions._getTransformedDimensions = jest.fn(() => ({
        x: 100,
        y: 40
      }))

      mockTextScalingLocalPoint({
        x: 25,
        y: 10
      })

      const step = resolvePointerTextScalingStep({
        textbox,
        transform,
        scenePoint: new Point(0, 0)
      })

      expect(step).toEqual({
        passedOriginX: false,
        passedOriginY: false,
        stepScaleX: 0.5,
        stepScaleY: 0.5
      })
    })

    it('останавливает расчёт если у текста нет видимых размеров', () => {
      const { textbox } = createTextScalingRuntimeSetup()
      const transform = createTextScalingTransform({ textbox })

      const textboxWithDimensions = textbox as unknown as {
        _getTransformedDimensions: jest.Mock
      }

      textboxWithDimensions._getTransformedDimensions = jest.fn(() => ({
        x: 0,
        y: 40
      }))

      const step = resolvePointerTextScalingStep({
        textbox,
        transform,
        scenePoint: new Point(0, 0)
      })

      expect(step).toBeNull()
    })

    it('понимает что указатель перешёл через противоположную сторону', () => {
      const { textbox } = createTextScalingRuntimeSetup()
      const transform = createTextScalingTransform({
        textbox,
        signX: 1,
        signY: -1
      })

      const textboxWithDimensions = textbox as unknown as {
        _getTransformedDimensions: jest.Mock
      }

      textboxWithDimensions._getTransformedDimensions = jest.fn(() => ({
        x: 100,
        y: 40
      }))

      mockTextScalingLocalPoint({
        x: -10,
        y: 5
      })

      const step = resolvePointerTextScalingStep({
        textbox,
        transform,
        scenePoint: new Point(0, 0)
      })

      expect(step).toEqual({
        passedOriginX: true,
        passedOriginY: true,
        stepScaleX: 0.1,
        stepScaleY: 0.125
      })
    })
  })
})
