import { ActiveSelection } from 'fabric'
import { BackgroundTextbox } from '../../../../src/editor/text-manager/background-textbox'
import * as textGeometry from '../../../../src/editor/text-manager/geometry'
import {
  createRestoredTemplateLikeTextbox,
  createTemplateLikeTextbox
} from '../../../test-utils/text/template-textbox-fixtures'
import {
  createTextManagerTestSetup
} from '../../../test-utils/text/manager-setup'
import { createMockShapeGroup, createMockShapeNode, createMockShapeTextbox } from '../../../test-utils/shape/factories'
import { createTextScalingTransform } from '../../../test-utils/text/scaling'

describe('TextManager scaling', () => {
  describe('масштабирование ActiveSelection с текстами', () => {
    it('диагональное масштабирование увеличивает размер шрифта и ширину текста', () => {
      const { canvas, textManager } = createTextManagerTestSetup()
      const textboxA = textManager.addText({ text: 'Первый', fontSize: 20 })
      const textboxB = textManager.addText({ text: 'Второй', fontSize: 30 })

      textboxA.set({ left: 0, top: 0, width: 100 })
      textboxB.set({ left: 100, top: 100, width: 100 })

      const baseFontSizeA = textboxA.fontSize
      const baseFontSizeB = textboxB.fontSize
      const baseWidthA = textboxA.width
      const baseWidthB = textboxB.width

      const selection = new ActiveSelection([textboxA, textboxB], { canvas })
      canvas.setActiveObject(selection)

      selection.scaleX = 2
      selection.scaleY = 2

      canvas.fire('object:modified', { target: selection })

      expect(textboxA.fontSize).toBe(baseFontSizeA! * 2)
      expect(textboxB.fontSize).toBe(baseFontSizeB! * 2)
      expect(textboxA.width).toBe(baseWidthA! * 2)
      expect(textboxB.width).toBe(baseWidthB! * 2)
      expect(textboxA.scaleX).toBe(1)
      expect(textboxA.scaleY).toBe(1)
      expect(textboxB.scaleX).toBe(1)
      expect(textboxB.scaleY).toBe(1)
    })

    it('масштабирование обновляет отступы и радиусы', () => {
      const { canvas, textManager } = createTextManagerTestSetup()
      const textbox = textManager.addText({
        text: 'Padding',
        paddingTop: 10,
        radiusTopLeft: 5
      })

      const selection = new ActiveSelection([textbox], { canvas })
      canvas.setActiveObject(selection)

      selection.scaleX = 1.5
      selection.scaleY = 1.5

      canvas.fire('object:modified', { target: selection })

      expect(textbox.paddingTop).toBe(15)
      expect(textbox.radiusTopLeft).toBe(7.5)
      expect(textbox.scaleX).toBe(1)
      expect(textbox.scaleY).toBe(1)
    })

    it('горизонтальное масштабирование увеличивает ширину, но не шрифт', () => {
      const { canvas, textManager } = createTextManagerTestSetup()
      const textbox = textManager.addText({
        text: 'Text',
        width: 100,
        fontSize: 20
      })

      const selection = new ActiveSelection([textbox], { canvas })
      canvas.setActiveObject(selection)

      selection.scaleX = 2
      selection.scaleY = 1

      canvas.fire('object:modified', { target: selection })

      expect(textbox.width).toBe(200)
      expect(textbox.fontSize).toBe(20)
      expect(textbox.scaleX).toBe(1)
      expect(textbox.scaleY).toBe(1)
    })
  })

  describe('масштабирование текстового объекта', () => {
    describe('нормализация временного scale', () => {
      it('текст после прошлых трансформаций сразу приходит в итоговом размере', () => {
        const { textManager } = createTextManagerTestSetup()
        const textbox = createRestoredTemplateLikeTextbox({
          left: 281,
          top: 352,
          scaleX: 0.5,
          scaleY: 1.5,
          originX: 'center',
          originY: 'top'
        })

        textbox.styles = {
          1: {
            0: {
              fontSize: 24,
              fill: '#333333',
              fontWeight: 'normal'
            }
          }
        }
        const beforeAnchor = textbox.getPointByOrigin('center', 'top')

        const result = textManager.commitStandaloneTextScale({
          target: textbox
        })

        const afterAnchor = textbox.getPointByOrigin('center', 'top')
        const scaledSecondLineStyles = Object.values(textbox.styles?.[1] ?? {})

        expect(result).toBe(true)
        expect(textbox.width).toBe(69)
        expect(textbox.fontSize).toBe(54)
        expect(textbox.paddingTop).toBe(31.5)
        expect(textbox.paddingRight).toBe(18)
        expect(textbox.paddingBottom).toBe(45)
        expect(textbox.paddingLeft).toBe(18)
        expect(textbox.radiusTopLeft).toBe(36)
        expect(textbox.radiusTopRight).toBe(36)
        expect(textbox.radiusBottomRight).toBe(36)
        expect(textbox.radiusBottomLeft).toBe(36)
        expect(textbox.lineFontDefaults?.[1]?.fontSize).toBe(36)
        expect(scaledSecondLineStyles).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              fontSize: 36
            })
          ])
        )
        expect(textbox.scaleX).toBe(1)
        expect(textbox.scaleY).toBe(1)
        expect(afterAnchor.x).toBeCloseTo(beforeAnchor.x, 5)
        expect(afterAnchor.y).toBeCloseTo(beforeAnchor.y, 5)
      })

      it('повторная обработка не меняет текст, если размер уже итоговый', () => {
        const { textManager } = createTextManagerTestSetup()
        const textbox = createRestoredTemplateLikeTextbox({
          left: 281,
          top: 352,
          scaleX: 1,
          scaleY: 1
        })
        const initialWidth = textbox.width
        const initialFontSize = textbox.fontSize
        const initialPaddingTop = textbox.paddingTop
        const initialRadiusTopLeft = textbox.radiusTopLeft
        const initialLineFontSize = textbox.lineFontDefaults?.[1]?.fontSize
        const initialStyleFontSize = textbox.styles?.[1]?.[0]?.fontSize

        const result = textManager.commitStandaloneTextScale({
          target: textbox
        })

        expect(result).toBe(false)
        expect(textbox.width).toBe(initialWidth)
        expect(textbox.fontSize).toBe(initialFontSize)
        expect(textbox.paddingTop).toBe(initialPaddingTop)
        expect(textbox.radiusTopLeft).toBe(initialRadiusTopLeft)
        expect(textbox.lineFontDefaults?.[1]?.fontSize).toBe(initialLineFontSize)
        expect(textbox.styles?.[1]?.[0]?.fontSize).toBe(initialStyleFontSize)
      })

      it('если размер уже итоговый, возвращает обычный текст в базовый интерактивный режим', () => {
        const { textManager } = createTextManagerTestSetup()
        const textbox = createRestoredTemplateLikeTextbox({
          left: 281,
          top: 352,
          scaleX: 1,
          scaleY: 1
        })

        textbox.selectable = false
        textbox.evented = false
        textbox.editable = false
        textbox.lockMovementX = true
        textbox.lockMovementY = true

        const result = textManager.commitStandaloneTextScale({
          target: textbox
        })

        expect(result).toBe(false)
        expect(textbox.selectable).toBe(true)
        expect(textbox.evented).toBe(true)
        expect(textbox.editable).toBe(true)
        expect(textbox.lockMovementX).toBe(false)
        expect(textbox.lockMovementY).toBe(false)
      })

      it('если размер уже итоговый, возвращает заблокированный текст в базовый заблокированный режим', () => {
        const { textManager } = createTextManagerTestSetup()
        const textbox = createRestoredTemplateLikeTextbox({
          left: 281,
          top: 352,
          scaleX: 1,
          scaleY: 1
        })

        textbox.locked = true
        textbox.selectable = false
        textbox.evented = false
        textbox.editable = true
        textbox.lockMovementX = false
        textbox.lockMovementY = false

        const result = textManager.commitStandaloneTextScale({
          target: textbox
        })

        expect(result).toBe(false)
        expect(textbox.selectable).toBe(true)
        expect(textbox.evented).toBe(true)
        expect(textbox.editable).toBe(false)
        expect(textbox.lockMovementX).toBe(true)
        expect(textbox.lockMovementY).toBe(true)
      })

      it('текст внутри фигуры не пересчитывается отдельно от фигуры', () => {
        const { textManager } = createTextManagerTestSetup()
        const textbox = createMockShapeTextbox({
          text: 'Text inside shape',
          width: 180
        })

        textbox.set({
          scaleX: 1.4,
          scaleY: 0.8
        })
        textbox.group = {
          shapeComposite: true
        } as never

        const result = textManager.commitStandaloneTextScale({
          target: textbox
        })

        expect(result).toBe(false)
        expect(textbox.scaleX).toBe(1.4)
        expect(textbox.scaleY).toBe(0.8)
      })

      it('текст внутри фигуры не получает standalone-интерактивность после materialization', () => {
        const { textManager } = createTextManagerTestSetup()
        const textbox = createMockShapeTextbox({
          text: 'Text inside shape',
          width: 180
        })

        textbox.group = {
          shapeComposite: true
        } as never
        textbox.selectable = false
        textbox.evented = false
        textbox.lockMovementX = true
        textbox.lockMovementY = true

        const result = textManager.commitStandaloneTextScale({
          target: textbox
        })

        expect(result).toBe(false)
        expect(textbox.selectable).toBe(false)
        expect(textbox.evented).toBe(false)
        expect(textbox.lockMovementX).toBe(true)
        expect(textbox.lockMovementY).toBe(true)
      })

      it('вертикальный scale не выключает autoExpand', () => {
        const { textManager } = createTextManagerTestSetup()
        const textbox = createRestoredTemplateLikeTextbox({
          left: 281,
          top: 352,
          scaleX: 1,
          scaleY: 1.5
        })

        textbox.autoExpand = true

        textManager.commitStandaloneTextScale({
          target: textbox,
          shouldDisableAutoExpandOnHorizontalChange: true
        })

        expect(textbox.autoExpand).toBe(true)
      })

      it('горизонтальное изменение не выключает autoExpand без явного запроса', () => {
        const { textManager } = createTextManagerTestSetup()
        const textbox = createRestoredTemplateLikeTextbox({
          left: 281,
          top: 352,
          scaleX: 1.25,
          scaleY: 1
        })

        textbox.autoExpand = true

        textManager.commitStandaloneTextScale({
          target: textbox
        })

        expect(textbox.autoExpand).toBe(true)
      })

      it('горизонтальное изменение выключает autoExpand только когда этого ожидает сценарий', () => {
        const { textManager } = createTextManagerTestSetup()
        const textbox = createRestoredTemplateLikeTextbox({
          left: 281,
          top: 352,
          scaleX: 1.25,
          scaleY: 1
        })

        textbox.autoExpand = true

        textManager.commitStandaloneTextScale({
          target: textbox,
          shouldDisableAutoExpandOnHorizontalChange: true
        })

        expect(textbox.autoExpand).toBe(false)
      })
    })

    it('после ручного сужения не расширяет текст обратно при скейлинге по вертикали', () => {
      const { canvas, textManager } = createTextManagerTestSetup()
      const textbox = textManager.addText({
        text: 'Привет, Fabric Fabric!',
        width: 240
      })

      textbox.set({
        width: 120,
        left: 40,
        top: 60,
        originX: 'left',
        originY: 'top'
      })

      canvas.fire('object:resizing', {
        target: textbox,
        transform: {
          corner: 'mr',
          originX: 'left',
          originY: 'top'
        }
      })

      textbox.set({
        scaleX: 1,
        scaleY: 1.5
      })

      canvas.fire('object:scaling', {
        target: textbox,
        transform: {
          corner: 'mb',
          action: 'scaleY',
          originX: 'left',
          originY: 'top',
          scaleX: 1,
          scaleY: 1.5,
          original: {
            width: 120,
            height: textbox.height,
            left: textbox.left,
            top: textbox.top,
            scaleX: 1,
            scaleY: 1
          }
        }
      })

      canvas.fire('object:modified', { target: textbox })

      expect(textbox.autoExpand).toBe(false)
      expect(textbox.width).toBe(120)
      expect(textbox.fontSize).toBe(72)
    })

    it('после ручного сужения сохраняет новую ширину при скейлинге по диагонали', () => {
      const { canvas, textManager } = createTextManagerTestSetup()
      const textbox = textManager.addText({
        text: 'Привет, Fabric Fabric!',
        width: 240
      })

      textbox.set({
        width: 120,
        left: 40,
        top: 60,
        originX: 'left',
        originY: 'top'
      })

      canvas.fire('object:resizing', {
        target: textbox,
        transform: {
          corner: 'mr',
          originX: 'left',
          originY: 'top'
        }
      })

      textbox.set({
        scaleX: 1.5,
        scaleY: 1.5
      })

      canvas.fire('object:scaling', {
        target: textbox,
        transform: {
          corner: 'br',
          action: 'scale',
          originX: 'left',
          originY: 'top',
          scaleX: 1.5,
          scaleY: 1.5,
          original: {
            width: 120,
            height: textbox.height,
            left: textbox.left,
            top: textbox.top,
            scaleX: 1,
            scaleY: 1
          }
        }
      })

      canvas.fire('object:modified', { target: textbox })

      expect(textbox.autoExpand).toBe(false)
      expect(textbox.width).toBe(180)
      expect(textbox.fontSize).toBe(72)
    })

    describe('обновление после скейлинга по диагонали', () => {
      it('после скейлинга по диагонали не сдвигает текст при padding сверху', () => {
        const { canvas, textManager } = createTextManagerTestSetup()
        const textbox = textManager.addText({
          text: 'Новый текст',
          autoExpand: true,
          width: 240,
          left: 40,
          top: 60,
          originX: 'left',
          originY: 'top'
        }) as BackgroundTextbox
        const transform = createTextScalingTransform({
          textbox,
          corner: 'tr',
          originX: 'left',
          originY: 'bottom'
        })

        textbox.set({
          scaleX: 1.5,
          scaleY: 1.5
        })
        transform.scaleX = 1.5
        transform.scaleY = 1.5

        canvas.fire('object:scaling', {
          target: textbox,
          transform
        })
        canvas.fire('object:modified', { target: textbox })

        textManager.updateText({
          target: textbox,
          style: {
            backgroundColor: '#FFFFFF'
          },
          withoutSave: true
        })

        const placementBeforePadding = textGeometry.getTextboxContentPlacement({
          textbox,
          originX: 'left',
          originY: 'top'
        })

        textManager.updateText({
          target: textbox,
          style: {
            paddingTop: 50
          },
          withoutSave: true
        })

        const placementAfterPadding = textGeometry.getTextboxContentPlacement({
          textbox,
          originX: 'left',
          originY: 'top'
        })

        expect(textbox.originX).toBe('left')
        expect(textbox.originY).toBe('top')
        expect(placementAfterPadding.left).toBeCloseTo(placementBeforePadding.left, 5)
        expect(placementAfterPadding.top).toBeCloseTo(placementBeforePadding.top, 5)
      })

      it('после скейлинга по диагонали не сдвигает текст при padding справа', () => {
        const { canvas, textManager } = createTextManagerTestSetup()
        const textbox = textManager.addText({
          text: 'Новый текст',
          autoExpand: true,
          width: 240,
          left: 40,
          top: 60,
          originX: 'left',
          originY: 'top'
        }) as BackgroundTextbox
        const transform = createTextScalingTransform({
          textbox,
          corner: 'tr',
          originX: 'left',
          originY: 'bottom'
        })

        textbox.set({
          scaleX: 1.5,
          scaleY: 1.5
        })
        transform.scaleX = 1.5
        transform.scaleY = 1.5

        canvas.fire('object:scaling', {
          target: textbox,
          transform
        })
        canvas.fire('object:modified', { target: textbox })

        textManager.updateText({
          target: textbox,
          style: {
            backgroundColor: '#FFFFFF'
          },
          withoutSave: true
        })

        const placementBeforePadding = textGeometry.getTextboxContentPlacement({
          textbox,
          originX: 'left',
          originY: 'top'
        })

        textManager.updateText({
          target: textbox,
          style: {
            paddingRight: 50
          },
          withoutSave: true
        })

        const placementAfterPadding = textGeometry.getTextboxContentPlacement({
          textbox,
          originX: 'left',
          originY: 'top'
        })

        expect(textbox.originX).toBe('left')
        expect(textbox.originY).toBe('top')
        expect(placementAfterPadding.left).toBeCloseTo(placementBeforePadding.left, 5)
        expect(placementAfterPadding.top).toBeCloseTo(placementBeforePadding.top, 5)
      })

      it('одинаково держит созданный напрямую и восстановленный текст при увеличении padding сверху после скейлинга', () => {
        const { canvas, textManager } = createTextManagerTestSetup()
        const directTextbox = createTemplateLikeTextbox({
          textManager,
          left: 281,
          top: 352
        })
        const restoredTextbox = createRestoredTemplateLikeTextbox({
          left: 281,
          top: 352
        })
        const directTransform = createTextScalingTransform({
          textbox: directTextbox,
          corner: 'tr',
          originX: 'left',
          originY: 'bottom'
        })
        const restoredTransform = createTextScalingTransform({
          textbox: restoredTextbox,
          corner: 'tr',
          originX: 'left',
          originY: 'bottom'
        })

        directTextbox.set({
          scaleX: 1.4,
          scaleY: 1.4
        })
        restoredTextbox.set({
          scaleX: 1.4,
          scaleY: 1.4
        })
        directTransform.scaleX = 1.4
        directTransform.scaleY = 1.4
        restoredTransform.scaleX = 1.4
        restoredTransform.scaleY = 1.4

        canvas.fire('object:scaling', {
          target: directTextbox,
          transform: directTransform
        })
        canvas.fire('object:modified', { target: directTextbox })

        canvas.fire('object:scaling', {
          target: restoredTextbox,
          transform: restoredTransform
        })
        canvas.fire('object:modified', { target: restoredTextbox })

        const directPlacementBeforePadding = textGeometry.getTextboxContentPlacement({
          textbox: directTextbox,
          originX: 'left',
          originY: 'top'
        })
        const restoredPlacementBeforePadding = textGeometry.getTextboxContentPlacement({
          textbox: restoredTextbox,
          originX: 'left',
          originY: 'top'
        })

        textManager.updateText({
          target: directTextbox,
          style: {
            paddingTop: (directTextbox.paddingTop ?? 0) + 40
          },
          withoutSave: true
        })
        textManager.updateText({
          target: restoredTextbox,
          style: {
            paddingTop: (restoredTextbox.paddingTop ?? 0) + 40
          },
          withoutSave: true
        })

        const directPlacementAfterPadding = textGeometry.getTextboxContentPlacement({
          textbox: directTextbox,
          originX: 'left',
          originY: 'top'
        })
        const restoredPlacementAfterPadding = textGeometry.getTextboxContentPlacement({
          textbox: restoredTextbox,
          originX: 'left',
          originY: 'top'
        })

        expect(directPlacementAfterPadding.left).toBeCloseTo(directPlacementBeforePadding.left, 5)
        expect(directPlacementAfterPadding.top).toBeCloseTo(directPlacementBeforePadding.top, 5)
        expect(restoredPlacementAfterPadding.left).toBeCloseTo(restoredPlacementBeforePadding.left, 5)
        expect(restoredPlacementAfterPadding.top).toBeCloseTo(restoredPlacementBeforePadding.top, 5)
      })
    })

    describe('когда текст уже упёрся в ширину монтажной области', () => {
      const longestLineWidth = 760

      let canvas: ReturnType<typeof createTextManagerTestSetup>['canvas']
      let textManager: ReturnType<typeof createTextManagerTestSetup>['textManager']
      let textbox: BackgroundTextbox
      let initDimensionsSpy: jest.SpyInstance
      let lineWidthSpy: jest.SpyInstance

      beforeEach(() => {
        ({
          canvas,
          textManager
        } = createTextManagerTestSetup())

        textbox = textManager.addText({
          text: 'Очень длинный текст без явных переносов',
          width: 400,
          left: 40,
          top: 60,
          originX: 'left',
          originY: 'top'
        }) as BackgroundTextbox

        textbox.set({
          autoExpand: true,
          width: 400
        })

        initDimensionsSpy = jest.spyOn(textbox, 'initDimensions').mockImplementation(() => {
          textbox.textLines = [
            'Очень длинный текст',
            'без явных переносов'
          ]
          textbox.height = 96
        })
        lineWidthSpy = jest.spyOn(textbox, 'getLineWidth').mockReturnValue(longestLineWidth)
      })

      afterEach(() => {
        initDimensionsSpy.mockRestore()
        lineWidthSpy.mockRestore()
      })

      it('при скейлинге по диагонали не растягивает текст до длины строки, если он уже упёрся в ширину монтажной области', () => {
        const initialWidth = textbox.width ?? 0
        const initialFontSize = textbox.fontSize ?? 0

        textbox.set({
          scaleX: 1.25,
          scaleY: 1.5
        })

        canvas.fire('object:scaling', {
          target: textbox,
          transform: {
            corner: 'br',
            action: 'scale',
            originX: 'left',
            originY: 'top',
            scaleX: 1.25,
            scaleY: 1.5,
            original: {
              width: 400,
              height: textbox.height,
              left: textbox.left,
              top: textbox.top,
              scaleX: 1,
              scaleY: 1
            }
          }
        })

        const widthScale = (textbox.width ?? 0) / initialWidth
        const fontScale = (textbox.fontSize ?? 0) / initialFontSize

        expect(textbox.autoExpand).toBe(true)
        expect(textbox.width).toBeGreaterThan(initialWidth)
        expect(textbox.width).toBeLessThan(longestLineWidth)
        expect(widthScale).toBeCloseTo(fontScale, 5)
        expect(textbox.scaleX).toBe(1)
        expect(textbox.scaleY).toBe(1)
      })

      it('при вертикальном скейлинге сохраняет текущую ширину, если текст уже упёрся в ширину монтажной области', () => {
        textbox.set({
          scaleX: 1,
          scaleY: 1.5
        })

        canvas.fire('object:scaling', {
          target: textbox,
          transform: {
            corner: 'mb',
            action: 'scaleY',
            originX: 'left',
            originY: 'top',
            scaleX: 1,
            scaleY: 1.5,
            original: {
              width: 400,
              height: textbox.height,
              left: textbox.left,
              top: textbox.top,
              scaleX: 1,
              scaleY: 1
            }
          }
        })

        expect(textbox.autoExpand).toBe(true)
        expect(textbox.width).toBe(400)
        expect(textbox.fontSize).toBe(72)
        expect(textbox.scaleX).toBe(1)
        expect(textbox.scaleY).toBe(1)
      })

      it('после завершения скейлинга сохраняет ту же ширину без заметного скачка', () => {
        const initialWidth = textbox.width ?? 0
        const initialFontSize = textbox.fontSize ?? 0

        textbox.set({
          scaleX: 1.25,
          scaleY: 1.5
        })

        canvas.fire('object:scaling', {
          target: textbox,
          transform: {
            corner: 'br',
            action: 'scale',
            originX: 'left',
            originY: 'top',
            scaleX: 1.25,
            scaleY: 1.5,
            original: {
              width: 400,
              height: textbox.height,
              left: textbox.left,
              top: textbox.top,
              scaleX: 1,
              scaleY: 1
            }
          }
        })

        const widthDuringScaling = textbox.width

        canvas.fire('object:modified', { target: textbox })

        const finalWidth = textbox.width ?? 0
        const finalFontSize = textbox.fontSize ?? 0
        const finalFontScale = finalFontSize / initialFontSize
        const expectedWidthByFinalFontScale = initialWidth * finalFontScale

        expect(widthDuringScaling).toBeGreaterThan(initialWidth)
        expect(widthDuringScaling).toBeLessThan(longestLineWidth)
        expect(textbox.autoExpand).toBe(true)
        expect(finalWidth).toBeCloseTo(widthDuringScaling ?? 0, 0)
        expect(Math.abs(finalWidth - expectedWidthByFinalFontScale)).toBeLessThanOrEqual(1)
      })
    })

    it(
      'при скейлинге по диагонали не растягивает однострочный текст до длины строки, если он уже упёрся в ширину монтажной области',
      () => {
        const { canvas, textManager } = createTextManagerTestSetup()
        const textbox = textManager.addText({
          text: 'Очень длинный заголовок',
          width: 400,
          left: 40,
          top: 60,
          originX: 'left',
          originY: 'top'
        }) as BackgroundTextbox

        textbox.set({
          autoExpand: true,
          width: 400,
          scaleX: 1.25,
          scaleY: 1.5
        })
        const initialWidth = textbox.width ?? 0
        const initialFontSize = textbox.fontSize ?? 0
        const longestLineWidth = 760

        const initDimensionsSpy = jest.spyOn(textbox, 'initDimensions').mockImplementation(() => {
          textbox.textLines = ['Очень длинный заголовок']
          textbox.height = 48
        })
        const lineWidthSpy = jest.spyOn(textbox, 'getLineWidth').mockReturnValue(longestLineWidth)

        try {
          canvas.fire('object:scaling', {
            target: textbox,
            transform: {
              corner: 'br',
              action: 'scale',
              originX: 'left',
              originY: 'top',
              scaleX: 1.25,
              scaleY: 1.5,
              original: {
                width: 400,
                height: textbox.height,
                left: textbox.left,
                top: textbox.top,
                scaleX: 1,
                scaleY: 1
              }
            }
          })

          const widthScale = (textbox.width ?? 0) / initialWidth
          const fontScale = (textbox.fontSize ?? 0) / initialFontSize

          expect(textbox.autoExpand).toBe(true)
          expect(textbox.width).toBeGreaterThan(initialWidth)
          expect(textbox.width).toBeLessThan(longestLineWidth)
          expect(widthScale).toBeCloseTo(fontScale, 5)
        } finally {
          initDimensionsSpy.mockRestore()
          lineWidthSpy.mockRestore()
        }
      }
    )

    it('не включает standalone авторасширение у текста внутри фигуры', () => {
      const { canvas, editor } = createTextManagerTestSetup()
      const shape = createMockShapeNode()
      const text = createMockShapeTextbox({
        text: 'Short',
        width: 120
      })

      createMockShapeGroup({
        shape,
        text
      })

      text.autoExpand = true
      text.text = 'Longer text'
      text.getLineWidth = jest.fn(() => 240) as never

      canvas.fire('text:changed', {
        target: text
      })

      expect(text.width).toBe(120)
      expect(editor.canvasManager.applyObjectPlacement).not.toHaveBeenCalled()
    })
  })
})
