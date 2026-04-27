import { BackgroundTextbox } from '../../../../src/editor/text-manager/background-textbox'
import {
  createTemplateLikeTextbox,
  createTextManagerTestSetup
} from '../../../test-utils/editor-helpers'

describe('TextManager layout', () => {
  describe('авто-расширение ширины', () => {
    it('updateText увеличивает ширину и не сдвигает объект по Y', () => {
      const { textManager } = createTextManagerTestSetup()

      const textbox = textManager.addText({
        text: 'Short',
        width: 120,
        left: 40,
        top: 80,
        originX: 'left',
        originY: 'top'
      })

      const lineWidthSpy = jest.spyOn(textbox, 'getLineWidth').mockReturnValue(260)

      textManager.updateText({
        target: textbox,
        style: { text: 'Longer text' },
        withoutSave: true
      })

      expect(textbox.width).toBe(260)
      expect(textbox.top).toBe(80)

      lineWidthSpy.mockRestore()
    })

    it('updateText сохраняет правый нижний угол при изменении ширины', () => {
      const { textManager } = createTextManagerTestSetup()

      const textbox = textManager.addText({
        text: 'Short',
        width: 120,
        left: 260,
        top: 180,
        originX: 'right',
        originY: 'bottom'
      })
      const anchorBefore = textbox.getPointByOrigin('right', 'bottom')
      const lineWidthSpy = jest.spyOn(textbox, 'getLineWidth').mockReturnValue(260)

      textManager.updateText({
        target: textbox,
        style: { text: 'Longer text' },
        withoutSave: true
      })

      const anchorAfter = textbox.getPointByOrigin('right', 'bottom')

      expect(textbox.width).toBe(260)
      expect(anchorAfter.x).toBe(anchorBefore.x)
      expect(anchorAfter.y).toBe(anchorBefore.y)

      lineWidthSpy.mockRestore()
    })

    it('updateText уменьшает ширину при сокращении текста', () => {
      const { textManager } = createTextManagerTestSetup()

      const textbox = textManager.addText({
        text: 'Longer text',
        width: 300,
        left: 40,
        top: 80,
        originX: 'left',
        originY: 'top'
      })

      const lineWidthSpy = jest.spyOn(textbox, 'getLineWidth').mockReturnValue(120)

      textManager.updateText({
        target: textbox,
        style: { text: 'Short' },
        withoutSave: true
      })

      expect(textbox.width).toBe(120)
      expect(textbox.top).toBe(80)

      lineWidthSpy.mockRestore()
    })

    it('не уменьшает ширину при автоматическом переносе строки', () => {
      const { textManager } = createTextManagerTestSetup()

      const textbox = textManager.addText({
        text: 'Long text',
        width: 200,
        left: 40,
        top: 80,
        originX: 'left',
        originY: 'top'
      })

      const initSpy = jest.spyOn(textbox, 'initDimensions').mockImplementation(() => {
        textbox.textLines = ['line-1', 'line-2']
      })
      const lineWidthSpy = jest.spyOn(textbox, 'getLineWidth').mockReturnValue(180)

      textManager.updateText({
        target: textbox,
        style: { text: 'Longer text without explicit breaks' },
        withoutSave: true
      })

      expect(textbox.width).toBe(400)
      expect(textbox.top).toBe(80)

      lineWidthSpy.mockRestore()
      initSpy.mockRestore()
    })

    it('updateText сохраняет правый нижний угол при изменении стиля, влияющего на layout', () => {
      const { textManager } = createTextManagerTestSetup()

      const textbox = textManager.addText({
        text: 'Short',
        width: 120,
        left: 260,
        top: 180,
        originX: 'right',
        originY: 'bottom'
      })
      const anchorBefore = textbox.getPointByOrigin('right', 'bottom')
      const lineWidthSpy = jest.spyOn(textbox, 'getLineWidth').mockReturnValue(260)

      textManager.updateText({
        target: textbox,
        style: {
          fontSize: 84,
          bold: true
        },
        withoutSave: true
      })

      const anchorAfter = textbox.getPointByOrigin('right', 'bottom')

      expect(textbox.width).toBe(260)
      expect(anchorAfter.x).toBe(anchorBefore.x)
      expect(anchorAfter.y).toBe(anchorBefore.y)

      lineWidthSpy.mockRestore()
    })

    it('не сдвигает объект по X при ширине больше или равной монтажной области', () => {
      const { textManager } = createTextManagerTestSetup()

      const textbox = textManager.addText({
        text: 'Wide text',
        width: 400,
        left: -50,
        top: 80,
        originX: 'left',
        originY: 'top'
      })

      const lineWidthSpy = jest.spyOn(textbox, 'getLineWidth').mockReturnValue(400)

      textManager.updateText({
        target: textbox,
        style: { fontSize: 50 },
        withoutSave: true
      })

      expect(textbox.left).toBe(-50)

      lineWidthSpy.mockRestore()
    })

    it('text:changed сохраняет вертикальную позицию при редактировании', () => {
      const { canvas, textManager } = createTextManagerTestSetup()

      const textbox = textManager.addText({
        text: 'Short',
        width: 100,
        left: 30,
        top: 70,
        originX: 'left',
        originY: 'top'
      })

      const lineWidthSpy = jest.spyOn(textbox, 'getLineWidth').mockReturnValue(240)

      canvas.fire('text:editing:entered', { target: textbox })
      textbox.text = 'Longer text'
      canvas.fire('text:changed', { target: textbox })

      expect(textbox.width).toBe(240)
      expect(textbox.top).toBe(70)

      lineWidthSpy.mockRestore()
    })

    it('text:changed сохраняет правый нижний угол при редактировании', () => {
      const { canvas, textManager } = createTextManagerTestSetup()

      const textbox = textManager.addText({
        text: 'Short',
        width: 100,
        left: 260,
        top: 180,
        originX: 'right',
        originY: 'bottom'
      })
      const anchorBefore = textbox.getPointByOrigin('right', 'bottom')
      const lineWidthSpy = jest.spyOn(textbox, 'getLineWidth').mockReturnValue(240)

      canvas.fire('text:editing:entered', { target: textbox })
      textbox.text = 'Longer text'
      canvas.fire('text:changed', { target: textbox })

      const anchorAfter = textbox.getPointByOrigin('right', 'bottom')

      expect(textbox.width).toBe(240)
      expect(anchorAfter.x).toBe(anchorBefore.x)
      expect(anchorAfter.y).toBe(anchorBefore.y)

      lineWidthSpy.mockRestore()
    })

    it('не превышает ширину монтажной области при updateText', () => {
      const { textManager } = createTextManagerTestSetup()

      const textbox = textManager.addText({ text: 'Short', width: 120 })
      const lineWidthSpy = jest.spyOn(textbox, 'getLineWidth').mockReturnValue(1000)

      textManager.updateText({
        target: textbox,
        style: { text: 'Very long text' },
        withoutSave: true
      })

      expect(textbox.width).toBeLessThanOrEqual(400)

      lineWidthSpy.mockRestore()
    })

    it('updateText может отключить autoExpand и не расширяет ширину', () => {
      const { textManager } = createTextManagerTestSetup()

      const textbox = textManager.addText({
        text: 'Short',
        width: 120
      })
      const lineWidthSpy = jest.spyOn(textbox, 'getLineWidth').mockReturnValue(260)

      textManager.updateText({
        target: textbox,
        style: { text: 'Longer text', autoExpand: false },
        withoutSave: true
      })

      expect(textbox.autoExpand).toBe(false)
      expect(textbox.width).toBe(120)

      lineWidthSpy.mockRestore()
    })

    it('text:changed не расширяет ширину при autoExpand=false', () => {
      const { canvas, textManager } = createTextManagerTestSetup()

      const textbox = textManager.addText({
        text: 'Short',
        width: 120,
        autoExpand: false
      })
      const lineWidthSpy = jest.spyOn(textbox, 'getLineWidth').mockReturnValue(240)

      canvas.fire('text:editing:entered', { target: textbox })
      textbox.text = 'Longer text'
      canvas.fire('text:changed', { target: textbox })

      expect(textbox.width).toBe(120)

      lineWidthSpy.mockRestore()
    })
  })

  describe('округление размеров', () => {
    it('округляет ширину и высоту при создании текстового объекта', () => {
      const { textManager } = createTextManagerTestSetup()

      const textbox = textManager.addText({
        text: 'fractional',
        width: 100.7,
        height: 50.2
      })

      expect(textbox.width).toBe(101)
      expect(textbox.height).toBe(50)
    })

    it('округляет размеры при updateText', () => {
      const { textManager } = createTextManagerTestSetup()

      const textbox = textManager.addText({ text: 'resize me' })
      textManager.updateText({
        target: textbox,
        style: {
          width: 120.6,
          height: 33.3
        }
      })

      expect(textbox.width).toBe(121)
      expect(textbox.height).toBe(33)
    })

    it('BackgroundTextbox.initDimensions приводит размеры к целым значениям', () => {
      const textbox = new BackgroundTextbox('demo', {
        width: 75.9,
        height: 24.1
      })

      expect(textbox.width).toBe(76)
      expect(textbox.height).toBe(24)
    })
  })

  describe('resizing', () => {
    it('корректирует ширину, вычитая отступы при изменении размера', () => {
      const { textManager, canvas } = createTextManagerTestSetup()
      const textbox = textManager.addText({ text: 'Test' })

      textbox.set({
        paddingLeft: 10,
        paddingRight: 10,
        width: 100
      })

      textbox.set({ width: 150 })

      canvas.fire('object:resizing', {
        target: textbox,
        transform: { corner: 'mr' }
      })

      expect(textbox.width).toBe(130)
    })

    it('корректирует позицию при изменении размера слева (ml)', () => {
      const { textManager, canvas } = createTextManagerTestSetup()
      const textbox = textManager.addText({ text: 'Test' })

      textbox.set({
        paddingLeft: 10,
        paddingRight: 10,
        width: 100,
        left: 100,
        top: 100,
        scaleX: 1,
        angle: 0
      })

      textbox.set({
        width: 150,
        left: 50
      })

      canvas.fire('object:resizing', {
        target: textbox,
        transform: {
          corner: 'ml',
          originX: 'right',
          originY: 'top'
        }
      })

      expect(textbox.width).toBe(130)
      expect(textbox.left).toBe(70)
    })

    it('не корректирует позицию при изменении размера справа (mr)', () => {
      const { textManager, canvas } = createTextManagerTestSetup()
      const textbox = textManager.addText({ text: 'Test' })

      textbox.set({
        paddingLeft: 10,
        paddingRight: 10,
        width: 100,
        left: 100,
        top: 100,
        scaleX: 1
      })

      textbox.set({
        width: 150,
        left: 100
      })

      canvas.fire('object:resizing', {
        target: textbox,
        transform: {
          corner: 'mr',
          originX: 'left',
          originY: 'top'
        }
      })

      expect(textbox.width).toBe(130)
      expect(textbox.left).toBe(100)
    })

    it('сохраняет top-left anchor для template-подобного объекта при переносе строк через mr', () => {
      const { textManager, canvas } = createTextManagerTestSetup()
      const textbox = createTemplateLikeTextbox({ textManager })
      const beforeAnchor = textbox.getPointByOrigin('left', 'top')

      textbox.set({ width: 149 })
      textbox.setPositionByOrigin(beforeAnchor, 'left', 'top')
      textbox.setCoords()

      canvas.fire('object:resizing', {
        target: textbox,
        transform: {
          corner: 'mr',
          originX: 'left',
          originY: 'top'
        }
      })

      const afterAnchor = textbox.getPointByOrigin('left', 'top')

      expect(textbox.width).toBe(125)
      expect(afterAnchor.x).toBeCloseTo(beforeAnchor.x, 5)
      expect(afterAnchor.y).toBeCloseTo(beforeAnchor.y, 5)
    })

    it('сохраняет right-top anchor для template-подобного объекта при переносе строк через ml', () => {
      const { textManager, canvas } = createTextManagerTestSetup()
      const textbox = createTemplateLikeTextbox({ textManager })
      const beforeAnchor = textbox.getPointByOrigin('right', 'top')

      textbox.set({ width: 149 })
      textbox.setPositionByOrigin(beforeAnchor, 'right', 'top')
      textbox.setCoords()

      canvas.fire('object:resizing', {
        target: textbox,
        transform: {
          corner: 'ml',
          originX: 'right',
          originY: 'top'
        }
      })

      const afterAnchor = textbox.getPointByOrigin('right', 'top')

      expect(textbox.width).toBe(125)
      expect(afterAnchor.x).toBeCloseTo(beforeAnchor.x, 5)
      expect(afterAnchor.y).toBeCloseTo(beforeAnchor.y, 5)
    })

    it('сохраняет right-center anchor для template-подобного объекта при переносе строк через ml', () => {
      const { textManager, canvas } = createTextManagerTestSetup()
      const textbox = createTemplateLikeTextbox({ textManager })
      const beforeAnchor = textbox.getPointByOrigin('right', 'center')

      textbox.set({ width: 149 })
      textbox.setPositionByOrigin(beforeAnchor, 'right', 'center')
      textbox.setCoords()

      canvas.fire('object:resizing', {
        target: textbox,
        transform: {
          corner: 'ml',
          originX: 'right',
          originY: 'center'
        }
      })

      const afterAnchor = textbox.getPointByOrigin('right', 'center')

      expect(textbox.width).toBe(125)
      expect(afterAnchor.x).toBeCloseTo(beforeAnchor.x, 5)
      expect(afterAnchor.y).toBeCloseTo(beforeAnchor.y, 5)
    })

    it('сохраняет right-bottom anchor для template-подобного объекта при переносе строк через ml', () => {
      const { textManager, canvas } = createTextManagerTestSetup()
      const textbox = createTemplateLikeTextbox({ textManager })
      const beforeAnchor = textbox.getPointByOrigin('right', 'bottom')

      textbox.set({ width: 149 })
      textbox.setPositionByOrigin(beforeAnchor, 'right', 'bottom')
      textbox.setCoords()

      canvas.fire('object:resizing', {
        target: textbox,
        transform: {
          corner: 'ml',
          originX: 'right',
          originY: 'bottom'
        }
      })

      const afterAnchor = textbox.getPointByOrigin('right', 'bottom')

      expect(textbox.width).toBe(125)
      expect(afterAnchor.x).toBeCloseTo(beforeAnchor.x, 5)
      expect(afterAnchor.y).toBeCloseTo(beforeAnchor.y, 5)
    })

    it('сохраняет anchor для повернутого template-подобного объекта при переносе строк через ml', () => {
      const { textManager, canvas } = createTextManagerTestSetup()
      const textbox = createTemplateLikeTextbox({ textManager })

      textbox.set({ angle: 18 })
      textbox.setCoords()

      const beforeAnchor = textbox.getPointByOrigin('right', 'center')

      textbox.set({ width: 149 })
      textbox.setPositionByOrigin(beforeAnchor, 'right', 'center')
      textbox.setCoords()

      canvas.fire('object:resizing', {
        target: textbox,
        transform: {
          corner: 'ml',
          originX: 'right',
          originY: 'center'
        }
      })

      const afterAnchor = textbox.getPointByOrigin('right', 'center')

      expect(textbox.width).toBe(125)
      expect(afterAnchor.x).toBeCloseTo(beforeAnchor.x, 5)
      expect(afterAnchor.y).toBeCloseTo(beforeAnchor.y, 5)
    })

    it('одинаково сохраняет anchor у обычного и template-подобного объектов при mr resize', () => {
      const { textManager, canvas } = createTextManagerTestSetup()
      const plainTextbox = textManager.addText({
        text: '69\nЧасов музыки',
        autoExpand: false,
        fontFamily: 'Exo 2',
        fontSize: 36,
        bold: true,
        lineHeight: 1.16,
        align: 'center',
        color: '#333333',
        backgroundColor: '#EBE4ED',
        backgroundOpacity: 1,
        paddingTop: 21,
        paddingRight: 12,
        paddingBottom: 30,
        paddingLeft: 12,
        radiusTopLeft: 24,
        radiusTopRight: 24,
        radiusBottomRight: 24,
        radiusBottomLeft: 24,
        width: 333,
        left: 281,
        top: 352
      })
      const templateLikeTextbox = createTemplateLikeTextbox({ textManager, left: 281, top: 460 })
      const plainBeforeAnchor = plainTextbox.getPointByOrigin('left', 'top')
      const templateBeforeAnchor = templateLikeTextbox.getPointByOrigin('left', 'top')

      plainTextbox.set({ width: 149 })
      plainTextbox.setPositionByOrigin(plainBeforeAnchor, 'left', 'top')
      plainTextbox.setCoords()

      templateLikeTextbox.set({ width: 149 })
      templateLikeTextbox.setPositionByOrigin(templateBeforeAnchor, 'left', 'top')
      templateLikeTextbox.setCoords()

      canvas.fire('object:resizing', {
        target: plainTextbox,
        transform: {
          corner: 'mr',
          originX: 'left',
          originY: 'top'
        }
      })
      canvas.fire('object:resizing', {
        target: templateLikeTextbox,
        transform: {
          corner: 'mr',
          originX: 'left',
          originY: 'top'
        }
      })

      const plainAfterAnchor = plainTextbox.getPointByOrigin('left', 'top')
      const templateAfterAnchor = templateLikeTextbox.getPointByOrigin('left', 'top')

      expect(plainAfterAnchor.x).toBeCloseTo(plainBeforeAnchor.x, 5)
      expect(plainAfterAnchor.y).toBeCloseTo(plainBeforeAnchor.y, 5)
      expect(templateAfterAnchor.x).toBeCloseTo(templateBeforeAnchor.x, 5)
      expect(templateAfterAnchor.y).toBeCloseTo(templateBeforeAnchor.y, 5)
    })

    it('вызывает snappingManager.applyTextResizingSnap при изменении размера', () => {
      const { textManager, canvas, editor } = createTextManagerTestSetup()
      const textbox = textManager.addText({ text: 'Test' })
      const transform = { corner: 'mr' }
      const event = { ctrlKey: false }

      canvas.fire('object:resizing', {
        target: textbox,
        transform,
        e: event
      })

      const { snappingManager } = editor
      const { applyTextResizingSnap } = snappingManager

      expect(applyTextResizingSnap).toHaveBeenCalledTimes(1)
      expect(applyTextResizingSnap).toHaveBeenCalledWith({
        target: textbox,
        transform,
        event
      })
    })
  })
})
