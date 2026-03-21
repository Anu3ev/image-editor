import fabric from 'fabric'
import { BackgroundTextbox, registerBackgroundTextbox } from '../../../../src/editor/text-manager/background-textbox'
import ErrorManager from '../../../../src/editor/error-manager'
import {
  createDecorationRenderSetup,
  createDecorationTextbox,
  createMockContext,
  ensureFabricHelpers
} from '../../../test-utils/editor-helpers'

jest.mock('../../../../src/editor/error-manager', () => ({
  __esModule: true,
  default: {
    emitError: jest.fn()
  }
}))

describe('BackgroundTextbox', () => {
  beforeEach(() => {
    ensureFabricHelpers()
    jest.clearAllMocks()
  })

  describe('constructor & properties', () => {
    it('создаётся с дефолтными значениями', () => {
      const textbox = new BackgroundTextbox('Test')

      expect((textbox as any).constructor.type).toBe('background-textbox')
      expect(textbox.paddingTop).toBe(0)
      expect(textbox.paddingRight).toBe(0)
      expect(textbox.paddingBottom).toBe(0)
      expect(textbox.paddingLeft).toBe(0)
      expect(textbox.radiusTopLeft).toBe(0)
      expect(textbox.radiusTopRight).toBe(0)
      expect(textbox.radiusBottomRight).toBe(0)
      expect(textbox.radiusBottomLeft).toBe(0)
      expect(textbox.backgroundOpacity).toBe(1)
    })

    it('применяет кастомные опции', () => {
      const textbox = new BackgroundTextbox('Test', {
        paddingTop: 1,
        paddingRight: 2,
        paddingBottom: 3,
        paddingLeft: 4,
        radiusTopLeft: 5,
        radiusTopRight: 6,
        radiusBottomRight: 7,
        radiusBottomLeft: 8,
        backgroundColor: '#123456',
        backgroundOpacity: 0.4
      })

      expect(textbox.paddingTop).toBe(1)
      expect(textbox.paddingRight).toBe(2)
      expect(textbox.paddingBottom).toBe(3)
      expect(textbox.paddingLeft).toBe(4)
      expect(textbox.radiusTopLeft).toBe(5)
      expect(textbox.radiusTopRight).toBe(6)
      expect(textbox.radiusBottomRight).toBe(7)
      expect(textbox.radiusBottomLeft).toBe(8)
      expect(textbox.backgroundColor).toBe('#123456')
      expect(textbox.backgroundOpacity).toBe(0.4)
    })

    it('содержит кастомные поля в cacheProperties и stateProperties', () => {
      const customProps = [
        'backgroundColor',
        'backgroundOpacity',
        'paddingTop',
        'paddingRight',
        'paddingBottom',
        'paddingLeft',
        'radiusTopLeft',
        'radiusTopRight',
        'radiusBottomRight',
        'radiusBottomLeft'
      ]

      customProps.forEach((prop) => {
        expect(BackgroundTextbox.cacheProperties).toContain(prop)
        expect(BackgroundTextbox.stateProperties).toContain(prop)
      })
    })
  })

  describe('dimensions', () => {
    it('учитывает padding в расчёте размеров', () => {
      const textbox = new BackgroundTextbox('Test', {
        width: 100,
        height: 50,
        paddingTop: 10,
        paddingRight: 20,
        paddingBottom: 10,
        paddingLeft: 20
      })

      const dims = (textbox as any)._getBackgroundDimensions()
      expect(dims.width).toBe(140)
      expect(dims.height).toBe(70)
    })

    it('учитывает padding в оффсетах', () => {
      const textbox = new BackgroundTextbox('Test', {
        width: 100,
        height: 50,
        paddingTop: 10,
        paddingRight: 0,
        paddingBottom: 0,
        paddingLeft: 20
      })

      const leftOffset = (textbox as any)._getLeftOffset()
      const topOffset = (textbox as any)._getTopOffset()

      expect(leftOffset).toBe((-120 / 2) + 20) // ширина с паддингами 120
      expect(topOffset).toBe((-60 / 2) + 10) // высота с паддингами 60
    })

    it('возвращает размеры с учётом strokeWidth', () => {
      const textbox = new BackgroundTextbox('Test', {
        width: 80,
        height: 40,
        paddingTop: 5,
        paddingRight: 5,
        paddingBottom: 5,
        paddingLeft: 5,
        strokeWidth: 4
      })

      const point = (textbox as any)._getNonTransformedDimensions()
      // background width/height = 90 / 50, plus strokeWidth
      expect(point.x).toBe(94)
      expect(point.y).toBe(54)
    })

    it('_getTransformedDimensions включает фон', () => {
      const textbox = new BackgroundTextbox('Test', {
        width: 50,
        height: 20,
        paddingTop: 5,
        paddingRight: 5,
        paddingBottom: 5,
        paddingLeft: 5
      })

      const dims = (textbox as any)._getTransformedDimensions({
        width: 50,
        height: 20
      })
      expect(dims.x).toBe(60)
      expect(dims.y).toBe(30)
    })
  })

  describe('rendering', () => {
    it('не рисует фон без цвета', () => {
      const textbox = new BackgroundTextbox('Test', { width: 10, height: 10 })
      const ctx = createMockContext()
      const textboxAny = textbox as any
      textboxAny._renderBackground(ctx)

      expect(ctx.fill).not.toHaveBeenCalled()
      expect(ctx.beginPath).not.toHaveBeenCalled()
    })

    it('рисует фон с корректным цветом и путём', () => {
      const textbox = new BackgroundTextbox('Test', {
        width: 10,
        height: 10,
        paddingTop: 2,
        paddingRight: 2,
        paddingBottom: 2,
        paddingLeft: 2,
        backgroundColor: '#ff0000',
        backgroundOpacity: 0.5
      })
      const ctx = createMockContext()
      const roundedSpy = jest.spyOn(BackgroundTextbox as any, '_renderRoundedRect')
      const textboxAny = textbox as any
      textboxAny._renderBackground(ctx)

      expect(roundedSpy).toHaveBeenCalledWith(expect.objectContaining({
        ctx,
        width: 14, // 10 + 2 + 2
        height: 14 // 10 + 2 + 2
      }))
      expect(ctx.fillStyle).toBe('rgba(255,0,0,0.5)')
      expect(ctx.beginPath).toHaveBeenCalled()
      expect(ctx.fill).toHaveBeenCalled()
    })
  })

  describe('colors', () => {
    it('возвращает rgba c учётом opacity', () => {
      const textbox = new BackgroundTextbox('Test', {
        backgroundColor: '#00ff00',
        backgroundOpacity: 0.25
      })

      const rgba = (textbox as any)._getEffectiveBackgroundFill()
      expect(rgba).toBe('rgba(0,255,0,0.25)')
    })

    it('репортит ошибку при невалидном цвете', () => {
      (ErrorManager as any).emitError = jest.fn()
      const textbox = new BackgroundTextbox('Test', {
        backgroundColor: 'invalid-color'
      })

      const result = (textbox as any)._getEffectiveBackgroundFill()

      expect(result).toBeNull()
      expect(ErrorManager.emitError).toHaveBeenCalledWith(expect.objectContaining({
        code: 'INVALID_COLOR_VALUE',
        origin: 'BackgroundTextbox',
        method: '_getEffectiveBackgroundFill'
      }))
    })
  })

  describe('text decoration colors', () => {
    it('использует цвет обводки для underline при включённой обводке', () => {
      const { textbox } = createDecorationTextbox({
        stroke: '#ff0000',
        strokeWidth: 2,
        fill: '#000000'
      })

      const color = (textbox as any)._getDecorationColorAt(0, 0)
      expect(color).toBe('#ff0000')
    })

    it('использует цвет обводки для linethrough при включённой обводке', () => {
      const { textbox } = createDecorationTextbox({
        stroke: '#ff0000',
        strokeWidth: 2,
        fill: '#000000'
      })

      const color = (textbox as any)._getDecorationColorAt(0, 0)
      expect(color).toBe('#ff0000')
    })

    it('использует цвет fill при выключенной обводке', () => {
      const { textbox, state } = createDecorationTextbox({
        stroke: '#ff0000',
        strokeWidth: 0,
        fill: '#111111'
      })

      expect((textbox as any)._getDecorationColorAt(0, 0)).toBe('#111111')

      state.strokeWidth = 2
      state.stroke = null
      state.fill = '#222222'

      expect((textbox as any)._getDecorationColorAt(0, 0)).toBe('#222222')
    })

    it('обновляет цвет при изменении stroke', () => {
      const { textbox, state } = createDecorationTextbox({
        stroke: '#ff0000',
        strokeWidth: 2,
        fill: '#000000'
      })

      expect((textbox as any)._getDecorationColorAt(0, 0)).toBe('#ff0000')
      state.stroke = '#00ff00'
      expect((textbox as any)._getDecorationColorAt(0, 0)).toBe('#00ff00')
    })

    it('не меняет цвет при изменении fill при включённой обводке', () => {
      const { textbox, state } = createDecorationTextbox({
        stroke: '#ff0000',
        strokeWidth: 2,
        fill: '#000000'
      })

      expect((textbox as any)._getDecorationColorAt(0, 0)).toBe('#ff0000')
      state.fill = '#ffffff'
      expect((textbox as any)._getDecorationColorAt(0, 0)).toBe('#ff0000')
    })

    it('использует разные цвета для разных диапазонов в строке', () => {
      const { textbox, ctx, fillStyles } = createDecorationRenderSetup({
        text: 'AB',
        type: 'underline',
        strokeByIndex: ['#ff0000', '#0000ff']
      })
      const textboxAny = textbox as any
      textboxAny._renderTextDecoration(ctx, 'underline')

      expect(fillStyles).toEqual(['#ff0000', '#0000ff'])
    })
  })

  describe('corner radii', () => {
    it('клампит радиусы не больше половины стороны', () => {
      const textbox = new BackgroundTextbox('Test', {
        width: 100,
        height: 100,
        radiusTopLeft: 1000,
        radiusTopRight: 1000,
        radiusBottomRight: 1000,
        radiusBottomLeft: 1000
      })

      const radii = (textbox as any)._getCornerRadii({ width: 100, height: 100 })
      expect(radii).toEqual({
        topLeft: 50,
        topRight: 50,
        bottomRight: 50,
        bottomLeft: 50
      })
    })

    it('клампит отрицательные радиусы в 0 и принимает граничные значения', () => {
      const textbox = new BackgroundTextbox('Test', {
        width: 80,
        height: 60,
        radiusTopLeft: -10,
        radiusTopRight: 30,
        radiusBottomRight: 100,
        radiusBottomLeft: 0
      })

      const radii = (textbox as any)._getCornerRadii({ width: 80, height: 60 })
      expect(radii).toEqual({
        topLeft: 0,
        topRight: 30, // height/2
        bottomRight: 30, // min(width/2=40, height/2=30)
        bottomLeft: 0
      })
    })

    it('применяет разные радиусы в пути', () => {
      const textbox = new BackgroundTextbox('Test', {
        width: 100,
        height: 60,
        radiusTopLeft: 5,
        radiusTopRight: 10,
        radiusBottomRight: 15,
        radiusBottomLeft: 20
      })

      const ctx = createMockContext()
      const backgroundTextboxAny = BackgroundTextbox as any
      backgroundTextboxAny._renderRoundedRect({
        ctx,
        width: 100,
        height: 60,
        left: 0,
        top: 0,
        radii: {
          topLeft: 5,
          topRight: 10,
          bottomRight: 15,
          bottomLeft: 20
        }
      })

      expect(ctx.quadraticCurveTo).toHaveBeenCalledTimes(4)
      expect(ctx.quadraticCurveTo).toHaveBeenNthCalledWith(1, 100, 0, 100, 10)
      expect(ctx.quadraticCurveTo).toHaveBeenNthCalledWith(2, 100, 60, 85, 60)
      expect(ctx.quadraticCurveTo).toHaveBeenNthCalledWith(3, 0, 60, 0, 40)
      expect(ctx.quadraticCurveTo).toHaveBeenNthCalledWith(4, 0, 0, 5, 0)
    })
  })

  describe('serialization', () => {
    it('включает кастомные поля в toObject и восстанавливается через classRegistry', async() => {
      const lineFontDefaults = {
        0: {
          fontFamily: 'Arial',
          fontSize: 20,
          fill: '#111111',
          stroke: '#222222'
        },
        2: {
          fontFamily: 'Roboto',
          fontSize: 30
        }
      }
      const textbox = new BackgroundTextbox('Serialize', {
        paddingTop: 1,
        paddingRight: 2,
        paddingBottom: 3,
        paddingLeft: 4,
        radiusTopLeft: 5,
        radiusTopRight: 6,
        radiusBottomRight: 7,
        radiusBottomLeft: 8,
        backgroundColor: '#abcdef',
        backgroundOpacity: 0.7,
        lineFontDefaults
      })

      const obj = textbox.toObject()
      expect(obj).toMatchObject({
        type: 'background-textbox',
        paddingTop: 1,
        paddingRight: 2,
        paddingBottom: 3,
        paddingLeft: 4,
        radiusTopLeft: 5,
        radiusTopRight: 6,
        radiusBottomRight: 7,
        radiusBottomLeft: 8,
        backgroundColor: '#abcdef',
        backgroundOpacity: 0.7,
        lineFontDefaults
      })

      registerBackgroundTextbox()
      const [restored] = await (fabric as any).util.enlivenObjects([obj])

      expect(restored).toBeInstanceOf(BackgroundTextbox)
      expect(restored).toMatchObject({
        paddingTop: 1,
        paddingRight: 2,
        paddingBottom: 3,
        paddingLeft: 4,
        radiusTopLeft: 5,
        radiusTopRight: 6,
        radiusBottomRight: 7,
        radiusBottomLeft: 8,
        backgroundColor: '#abcdef',
        backgroundOpacity: 0.7,
        lineFontDefaults
      })
    })
  })
})
