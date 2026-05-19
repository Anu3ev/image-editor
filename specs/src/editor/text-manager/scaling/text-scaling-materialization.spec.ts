import { BackgroundTextbox } from '../../../../../src/editor/text-manager/background-textbox'
import {
  captureTextScaleBase,
  commitStandaloneTextboxScale,
  resolveMinimumTextScalingBounds
} from '../../../../../src/editor/text-manager/scaling/text-scaling-materialization'
import {
  createTextManagerTestSetup
} from '../../../../test-utils/text/manager-setup'
import { createStyledScalingTextbox } from '../../../../test-utils/text/scaling'

describe('масштабирование текста', () => {
  describe('подготовка базового состояния', () => {
    it('сохраняет стили и размеры отдельно от исходного объекта', () => {
      const textbox = createStyledScalingTextbox()
      textbox.lineFontDefaults = {
        1: {
          fontFamily: 'Open Sans',
          fontSize: 24,
          fontStyle: 'italic',
          fontWeight: 'bold',
          fill: '#333333',
          linethrough: true,
          stroke: '#222222',
          strokeWidth: 2,
          underline: true
        }
      }

      const base = captureTextScaleBase({ textbox })

      textbox.paddingTop = 99
      textbox.radiusTopLeft = 88
      textbox.styles = {
        1: {
          0: {
            fontSize: 77,
            fill: '#000000'
          }
        }
      }
      textbox.lineFontDefaults = {
        1: {
          fontFamily: 'Another Font',
          fontSize: 66
        }
      }

      expect(base.padding.top).toBe(21)
      expect(base.radii.topLeft).toBe(24)
      expect(base.styles['1']?.['0']?.fontSize).toBe(24)
      expect(base.lineFontDefaults?.[1]).toMatchObject({
        fontFamily: 'Open Sans',
        fontSize: 24,
        fontStyle: 'italic',
        fontWeight: 'bold',
        fill: '#333333',
        linethrough: true,
        stroke: '#222222',
        strokeWidth: 2,
        underline: true
      })
    })
  })

  describe('ограничение уменьшения', () => {
    it('при уменьшении учитывает самый маленький размер шрифта внутри объекта', () => {
      const bounds = resolveMinimumTextScalingBounds({
        base: {
          width: 120,
          fontSize: 24,
          padding: {
            top: 0,
            right: 0,
            bottom: 0,
            left: 0
          },
          radii: {
            topLeft: 0,
            topRight: 0,
            bottomRight: 0,
            bottomLeft: 0
          },
          styles: {
            0: {
              0: {
                fontSize: 10
              }
            }
          },
          lineFontDefaults: {
            1: {
              fontSize: 9
            }
          }
        }
      })

      expect(bounds.widthScale).toBeCloseTo(1 / 120, 6)
      expect(bounds.fontScale).toBeCloseTo(8 / 9, 6)
      expect(bounds.proportionalScale).toBeCloseTo(8 / 9, 6)
    })
  })

  describe('запекание временного масштаба', () => {
    it('при сильном уменьшении по диагонали останавливает шрифт на минимальном размере и сохраняет стиль строки', () => {
      const { editor } = createTextManagerTestSetup()
      const textbox = new BackgroundTextbox('69\nЧасов музыки', {
        width: 160,
        fontSize: 12,
        left: 40,
        top: 60,
        originX: 'left',
        originY: 'top'
      })

      textbox.styles = {
        1: {
          0: {
            fontSize: 9
          }
        }
      }
      textbox.lineFontDefaults = {
        1: {
          fontSize: 10,
          fontStyle: 'italic',
          fontWeight: 'bold',
          fill: '#333333',
          linethrough: true,
          stroke: '#222222',
          strokeWidth: 2,
          underline: true
        }
      }
      jest.spyOn(textbox, 'initDimensions').mockImplementation(() => undefined)

      const base = captureTextScaleBase({ textbox })

      commitStandaloneTextboxScale({
        textbox,
        canvasManager: editor.canvasManager,
        base,
        widthScale: 0.2,
        heightScale: 0.2,
        placement: editor.canvasManager.getObjectPlacement({ object: textbox }),
        shouldScaleFontSize: true,
        shouldScalePadding: true,
        shouldScaleRadii: true,
        shouldRoundDimensions: false
      })

      expect(textbox.fontSize).toBe(8)
      expect(textbox.lineFontDefaults?.[1]).toMatchObject({
        fontSize: 8,
        fontStyle: 'italic',
        fontWeight: 'bold',
        fill: '#333333',
        linethrough: true,
        stroke: '#222222',
        strokeWidth: 2,
        underline: true
      })
      expect(textbox.styles?.['1']?.['0']?.fontSize).toBe(8)
    })

    it('не поднимает обратно шрифт который уже был меньше минимума', () => {
      const { editor } = createTextManagerTestSetup()
      const textbox = new BackgroundTextbox('Маленький\nтекст', {
        width: 120,
        fontSize: 6,
        left: 40,
        top: 60,
        originX: 'left',
        originY: 'top'
      })

      textbox.styles = {
        0: {
          0: {
            fontSize: 4
          }
        }
      }
      textbox.lineFontDefaults = {
        1: {
          fontSize: 5
        }
      }
      jest.spyOn(textbox, 'initDimensions').mockImplementation(() => undefined)

      const base = captureTextScaleBase({ textbox })

      commitStandaloneTextboxScale({
        textbox,
        canvasManager: editor.canvasManager,
        base,
        widthScale: 0.5,
        heightScale: 0.5,
        placement: editor.canvasManager.getObjectPlacement({ object: textbox }),
        shouldScaleFontSize: true,
        shouldScalePadding: true,
        shouldScaleRadii: true,
        shouldRoundDimensions: false
      })

      expect(textbox.fontSize).toBe(6)
      expect(textbox.lineFontDefaults?.[1]?.fontSize).toBe(5)
      expect(textbox.styles?.['0']?.['0']?.fontSize).toBe(4)
    })

    it('во время скейлинга по диагонали оставляет дробную ширину', () => {
      const { editor } = createTextManagerTestSetup()
      const textbox = new BackgroundTextbox('Дробная ширина', {
        width: 101,
        fontSize: 48,
        left: 40,
        top: 60,
        originX: 'left',
        originY: 'top'
      })

      jest.spyOn(textbox, 'initDimensions').mockImplementation(() => undefined)

      const base = captureTextScaleBase({ textbox })
      const result = commitStandaloneTextboxScale({
        textbox,
        canvasManager: editor.canvasManager,
        base,
        widthScale: 0.5,
        heightScale: 0.5,
        placement: editor.canvasManager.getObjectPlacement({ object: textbox }),
        shouldScaleFontSize: true,
        shouldScalePadding: true,
        shouldScaleRadii: true,
        shouldRoundDimensions: false
      })

      expect(textbox.width).toBe(50.5)
      expect(result.appliedWidth).toBe(50.5)
      expect(result.dimensionsRounded).toBe(false)
    })

    it('после live шага возвращает прежнее правило округления', () => {
      const { editor } = createTextManagerTestSetup()
      const textbox = new BackgroundTextbox('Возврат округления', {
        width: 101,
        fontSize: 48,
        left: 40,
        top: 60,
        originX: 'left',
        originY: 'top'
      })

      textbox.shouldRoundDimensionsOnInit = true
      jest.spyOn(textbox, 'initDimensions').mockImplementation(() => {
        expect(textbox.shouldRoundDimensionsOnInit).toBe(false)
      })

      const base = captureTextScaleBase({ textbox })

      commitStandaloneTextboxScale({
        textbox,
        canvasManager: editor.canvasManager,
        base,
        widthScale: 0.5,
        heightScale: 0.5,
        placement: editor.canvasManager.getObjectPlacement({ object: textbox }),
        shouldScaleFontSize: true,
        shouldScalePadding: true,
        shouldScaleRadii: true,
        shouldRoundDimensions: false
      })

      expect(textbox.shouldRoundDimensionsOnInit).toBe(true)
    })

    it('во время live шага держит точку, от которой тянут объект, но сохраняет origin текста', () => {
      const { editor } = createTextManagerTestSetup()
      const textbox = new BackgroundTextbox('Текст', {
        width: 100,
        fontSize: 20,
        left: 40,
        top: 60,
        originX: 'left',
        originY: 'top'
      })

      textbox.initDimensions()

      const base = captureTextScaleBase({ textbox })
      const dragPointBefore = textbox.getPointByOrigin('left', 'bottom')

      commitStandaloneTextboxScale({
        textbox,
        canvasManager: editor.canvasManager,
        base,
        widthScale: 1.5,
        heightScale: 2,
        placement: editor.canvasManager.getObjectPlacement({ object: textbox }),
        anchorPlacement: {
          left: dragPointBefore.x,
          top: dragPointBefore.y,
          originX: 'left',
          originY: 'bottom'
        },
        shouldScaleFontSize: true,
        shouldScalePadding: true,
        shouldScaleRadii: true,
        shouldRoundDimensions: false
      })

      const dragPointAfter = textbox.getPointByOrigin('left', 'bottom')

      expect(textbox.originX).toBe('left')
      expect(textbox.originY).toBe('top')
      expect(dragPointAfter.x).toBeCloseTo(dragPointBefore.x, 5)
      expect(dragPointAfter.y).toBeCloseTo(dragPointBefore.y, 5)
    })

    it('без временной точки сохраняет положение восстановленного текста по его origin', () => {
      const { editor } = createTextManagerTestSetup()
      const textbox = new BackgroundTextbox('Текст', {
        width: 100,
        fontSize: 20,
        left: 180,
        top: 220,
        originX: 'center',
        originY: 'bottom'
      })

      textbox.initDimensions()

      const base = captureTextScaleBase({ textbox })
      const pointBefore = textbox.getPointByOrigin('center', 'bottom')

      commitStandaloneTextboxScale({
        textbox,
        canvasManager: editor.canvasManager,
        base,
        widthScale: 1.5,
        heightScale: 2,
        placement: editor.canvasManager.getObjectPlacement({ object: textbox }),
        shouldScaleFontSize: true,
        shouldScalePadding: true,
        shouldScaleRadii: true,
        shouldRoundDimensions: false
      })

      const pointAfter = textbox.getPointByOrigin('center', 'bottom')

      expect(textbox.originX).toBe('center')
      expect(textbox.originY).toBe('bottom')
      expect(pointAfter.x).toBeCloseTo(pointBefore.x, 5)
      expect(pointAfter.y).toBeCloseTo(pointBefore.y, 5)
    })

    it('при ручном изменении ширины отключает autoExpand только если ширина реально изменилась', () => {
      const { editor } = createTextManagerTestSetup()
      const textbox = createStyledScalingTextbox()
      jest.spyOn(textbox, 'initDimensions').mockImplementation(() => undefined)

      const base = captureTextScaleBase({ textbox })

      textbox.autoExpand = true
      commitStandaloneTextboxScale({
        textbox,
        canvasManager: editor.canvasManager,
        base,
        widthScale: 1,
        heightScale: 1,
        placement: editor.canvasManager.getObjectPlacement({ object: textbox }),
        shouldScaleFontSize: false,
        shouldScalePadding: false,
        shouldScaleRadii: false,
        shouldDisableAutoExpandOnHorizontalChange: true,
        shouldRoundDimensions: false
      })
      expect(textbox.autoExpand).toBe(true)

      commitStandaloneTextboxScale({
        textbox,
        canvasManager: editor.canvasManager,
        base,
        widthScale: 0.8,
        heightScale: 1,
        placement: editor.canvasManager.getObjectPlacement({ object: textbox }),
        shouldScaleFontSize: false,
        shouldScalePadding: false,
        shouldScaleRadii: false,
        shouldDisableAutoExpandOnHorizontalChange: true,
        shouldRoundDimensions: false
      })

      expect(textbox.autoExpand).toBe(false)
    })
  })
})
