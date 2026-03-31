import { ActiveSelection } from 'fabric'
import { nanoid } from 'nanoid'
import {
  createRestoredTemplateLikeTextbox,
  createTemplateLikeTextbox,
  createTextManagerTestSetup
} from '../../../test-utils/editor-helpers'
import {
  createMockShapeGroup,
  createMockShapeNode,
  createMockShapeTextbox
} from '../../../test-utils/shape-helpers'
import { BackgroundTextbox } from '../../../../src/editor/text-manager/background-textbox'
import { TEXT_EDITING_DEBOUNCE_MS } from '../../../../src/editor/constants'
import * as textGeometry from '../../../../src/editor/text-manager/geometry'

jest.mock('nanoid')

describe('TextManager', () => {
  const mockNanoid = nanoid as jest.MockedFunction<typeof nanoid>

  beforeEach(() => {
    jest.clearAllMocks()
    mockNanoid.mockImplementation(() => 'mocked-id')
  })

  describe('addText', () => {
    it('создаёт текстовый объект, центрирует, выделяет и сохраняет историю', () => {
      const {
        editor,
        canvas,
        historyManager,
        textManager,
        getObjects
      } = createTextManagerTestSetup()

      historyManager.saveState()
      canvas.on('object:added', () => historyManager.saveState())

      const textbox = textManager.addText({ text: 'Привет' })

      // Проверяем вызов saveState через подсчет изменений в истории
      expect(canvas.add).toHaveBeenCalledWith(textbox)
      expect(editor.canvasManager.centerObjectToMontageArea).toHaveBeenCalledWith({ object: textbox })
      expect(canvas.setActiveObject).toHaveBeenCalledWith(textbox)
      expect(canvas.requestRenderAll).toHaveBeenCalledTimes(1)

      expect(textbox.id).toBe('text-mocked-id')
      expect(textbox.text).toBe('Привет')
      expect(textbox.textCaseRaw).toBe('Привет')

      expect(canvas.fire).toHaveBeenCalledWith('editor:text-added', expect.objectContaining({
        textbox,
        options: expect.objectContaining({ text: 'Привет' })
      }))

      // Проверяем что состояние сохранено (через object:added событие)
      expect(historyManager.totalChangesCount).toBe(1)
      expect(historyManager.currentIndex).toBe(1)
      expect(getObjects()).toHaveLength(1)

      const state = historyManager.getFullState()
      expect(state.objects).toHaveLength(1)
      expect(state.objects?.[0]?.text).toBe('Привет')
    })

    it('ставит autoExpand=true по умолчанию', () => {
      const { textManager } = createTextManagerTestSetup()

      const textbox = textManager.addText({ text: 'Авто' })

      expect(textbox.autoExpand).toBe(true)
    })

    it('поддерживает autoExpand=false при создании', () => {
      const { textManager } = createTextManagerTestSetup()

      const textbox = textManager.addText({ text: 'Без авто', autoExpand: false })

      expect(textbox.autoExpand).toBe(false)
    })

    it('сразу расширяет длинный текст при создании, если переносы появились уже на create-path', () => {
      const { textManager } = createTextManagerTestSetup()
      const roundDimensionsSpy = jest.spyOn(textGeometry, 'roundTextboxDimensions').mockImplementation(({ textbox }) => {
        textbox.textLines = ['Привет,', 'Fabric!']
        return false
      })
      const getLineWidthSpy = jest.spyOn(BackgroundTextbox.prototype, 'getLineWidth').mockReturnValue(240)

      try {
        const textbox = textManager.addText({
          text: 'Привет, Fabric!',
          width: 120
        })

        expect(textbox.width).toBe(240)
      } finally {
        roundDimensionsSpy.mockRestore()
        getLineWidthSpy.mockRestore()
      }
    })
  })

  describe('updateText', () => {
    it('обновляет стиль текста, сохраняет историю и отправляет событие', () => {
      const {
        canvas,
        historyManager,
        textManager,
        getObjects
      } = createTextManagerTestSetup()

      historyManager.saveState()
      canvas.on('object:added', () => historyManager.saveState())

      const baseTextbox = textManager.addText({ text: 'до обновления' })

      const saveSpy = jest.spyOn(historyManager, 'saveState')
      canvas.requestRenderAll.mockClear()
      canvas.fire.mockClear()

      textManager.updateText({
        target: baseTextbox,
        style: {
          text: 'после обновления',
          fontFamily: 'Roboto',
          fontSize: 72,
          bold: true,
          italic: true,
          underline: true,
          uppercase: true,
          strikethrough: true,
          align: 'center',
          color: '#ff0000',
          strokeColor: '#00ff00',
          strokeWidth: 3,
          opacity: 0.5
        }
      })

      expect(saveSpy).toHaveBeenCalledTimes(1)
      expect(canvas.requestRenderAll).toHaveBeenCalledTimes(1)
      expect(canvas.fire).toHaveBeenCalledWith('editor:text-updated', expect.objectContaining({
        textbox: baseTextbox,
        target: baseTextbox,
        style: expect.objectContaining({ text: 'после обновления' }),
        before: expect.objectContaining({ text: 'до обновления' }),
        after: expect.objectContaining({ text: 'ПОСЛЕ ОБНОВЛЕНИЯ' })
      }))

      expect(baseTextbox.text).toBe('ПОСЛЕ ОБНОВЛЕНИЯ')
      expect(baseTextbox.textCaseRaw).toBe('после обновления')
      expect(baseTextbox.uppercase).toBe(true)
      expect(baseTextbox.fontFamily).toBe('Roboto')
      expect(baseTextbox.fontSize).toBe(72)
      expect(baseTextbox.fontWeight).toBe('bold')
      expect(baseTextbox.fontStyle).toBe('italic')
      expect(baseTextbox.underline).toBe(true)
      expect(baseTextbox.linethrough).toBe(true)
      expect(baseTextbox.textAlign).toBe('center')
      expect(baseTextbox.fill).toBe('#ff0000')
      expect(baseTextbox.stroke).toBe('#00ff00')
      expect(baseTextbox.strokeWidth).toBe(3)
      expect(baseTextbox.opacity).toBe(0.5)

      expect(historyManager.totalChangesCount).toBe(2)
      expect(historyManager.currentIndex).toBe(2)
      expect(getObjects()).toHaveLength(1)

      saveSpy.mockClear()
      canvas.requestRenderAll.mockClear()

      textManager.updateText({
        target: baseTextbox,
        style: { text: 'без истории' },
        withoutSave: true,
        skipRender: true
      })

      expect(saveSpy).not.toHaveBeenCalled()
      expect(canvas.requestRenderAll).not.toHaveBeenCalled()
      expect(baseTextbox.text).toBe('БЕЗ ИСТОРИИ')
      expect(historyManager.totalChangesCount).toBe(2)
    })

    it('сначала даёт подписчикам синхронизировать изменение текста, а потом сохраняет итоговое состояние', () => {
      const {
        canvas,
        historyManager,
        textManager
      } = createTextManagerTestSetup()
      const textbox = textManager.addText({
        text: 'до обновления',
        left: 40,
        top: 60
      })
      const lifecycle: string[] = []
      const originalSaveState = historyManager.saveState.bind(historyManager)

      canvas.on('editor:before:text-updated', ({ textbox: eventTextbox }) => {
        lifecycle.push('before')
        eventTextbox.set({
          left: 123
        })
      })
      canvas.on('editor:text-updated', () => {
        lifecycle.push('after')
      })

      canvas.requestRenderAll.mockClear()
      canvas.requestRenderAll.mockImplementation(() => {
        lifecycle.push('render')
      })

      const saveSpy = jest.spyOn(historyManager, 'saveState').mockImplementation(() => {
        lifecycle.push('save')
        originalSaveState()
      })

      canvas.fire.mockClear()

      textManager.updateText({
        target: textbox,
        style: {
          fontSize: 80
        }
      })

      expect(lifecycle).toEqual([
        'before',
        'render',
        'save',
        'after'
      ])

      const [beforeEventName, beforePayload] = canvas.fire.mock.calls[0]
      const [afterEventName, afterPayload] = canvas.fire.mock.calls[1]

      expect(beforeEventName).toBe('editor:before:text-updated')
      expect(beforePayload.selectionRange).toBeUndefined()
      expect(beforePayload.selectionStyles).toBeUndefined()
      expect(afterEventName).toBe('editor:text-updated')
      expect(afterPayload.after).toEqual(expect.objectContaining({
        fontSize: 80,
        left: 123
      }))

      const state = historyManager.getFullState()

      expect(state.objects?.[0]?.left).toBe(123)
      expect(saveSpy).toHaveBeenCalledTimes(1)
    })

    it('применяет стили только к выделенному тексту и сообщает информацию о выделении', () => {
      const {
        canvas,
        historyManager,
        textManager
      } = createTextManagerTestSetup()

      historyManager.saveState()
      const textbox = textManager.addText({
        text: 'selection check',
        fontFamily: 'Arial',
        fontSize: 32,
        color: '#222222',
        strokeColor: '#333333',
        strokeWidth: 2
      })

      textbox.isEditing = true
      textbox.selectionStart = 10
      textbox.selectionEnd = 15

      const saveSpy = jest.spyOn(historyManager, 'saveState')
      canvas.fire.mockClear()
      canvas.requestRenderAll.mockClear()

      textManager.updateText({
        target: textbox,
        withoutSave: true,
        style: {
          bold: true,
          italic: true,
          underline: true,
          strikethrough: true,
          color: '#ff0000',
          fontFamily: 'Roboto',
          fontSize: 64,
          strokeColor: '#00ff00',
          strokeWidth: 5
        }
      })

      expect(saveSpy).not.toHaveBeenCalled()
      expect(canvas.requestRenderAll).toHaveBeenCalledTimes(1)
      expect(textbox.dirty).toBe(true)

      // Глобальные свойства не меняются при частичном выделении
      expect(textbox.fontFamily).toBe('Arial')
      expect(textbox.fontSize).toBe(32)
      expect(textbox.fill).toBe('#222222')
      expect(textbox.stroke).toBe('#333333')
      expect(textbox.strokeWidth).toBe(2)

      const selectionStyles = textbox.getSelectionStyles(10, 15)
      expect(selectionStyles).toHaveLength(5)
      selectionStyles.forEach((style) => {
        expect(style).toMatchObject({
          fontWeight: 'bold',
          fontStyle: 'italic',
          underline: true,
          linethrough: true,
          fill: '#ff0000',
          fontFamily: 'Roboto',
          stroke: '#00ff00',
          strokeWidth: 5
        })
      })

      const [beforeEventName, beforePayload] = canvas.fire.mock.calls[0]
      const [afterEventName, afterPayload] = canvas.fire.mock.calls[1]

      expect(beforeEventName).toBe('editor:before:text-updated')
      expect(beforePayload.selectionRange).toEqual({ start: 10, end: 15 })
      expect(beforePayload.selectionStyles).toMatchObject({
        fontWeight: 'bold',
        fontStyle: 'italic',
        fill: '#ff0000'
      })

      expect(afterEventName).toBe('editor:text-updated')
      expect(afterPayload.selectionRange).toEqual({ start: 10, end: 15 })
      expect(afterPayload.selectionStyles).toMatchObject({
        fontWeight: 'bold',
        fontStyle: 'italic',
        fill: '#ff0000'
      })
    })

    it('применяет fontSize и fontFamily ко всей строке, если выделена её часть', () => {
      const {
        textManager
      } = createTextManagerTestSetup()

      const textbox = textManager.addText({
        text: 'first line\nsecond line',
        fontFamily: 'Arial',
        fontSize: 32
      })

      const newlineIndex = (textbox.text ?? '').indexOf('\n')
      expect(newlineIndex).toBeGreaterThan(0)

      textbox.isEditing = true
      textbox.selectionStart = 2
      textbox.selectionEnd = 4

      textManager.updateText({
        target: textbox,
        withoutSave: true,
        style: {
          fontSize: 50,
          fontFamily: 'Roboto'
        }
      })

      const firstLineStyles = textbox.getSelectionStyles(0, newlineIndex)
      expect(firstLineStyles).toHaveLength(newlineIndex)
      firstLineStyles.forEach((style) => {
        expect(style.fontSize).toBe(50)
        expect(style.fontFamily).toBe('Roboto')
      })

      const secondLineStyles = textbox.getSelectionStyles(newlineIndex, textbox.text?.length ?? 0)
      secondLineStyles.forEach((style) => {
        expect(style.fontSize).toBeUndefined()
        expect(style.fontFamily).toBeUndefined()
      })

      expect(textbox.fontSize).toBe(32)
      expect(textbox.fontFamily).toBe('Arial')
    })

    it('использует selectionRange для применения стилей без режима редактирования', () => {
      const { textManager } = createTextManagerTestSetup()

      const textbox = textManager.addText({
        text: 'first line\nsecond line',
        fontFamily: 'Arial',
        fontSize: 32
      })
      const textValue = textbox.text ?? ''
      const newlineIndex = textValue.indexOf('\n')
      const secondLineStart = newlineIndex + 1

      expect(newlineIndex).toBeGreaterThan(0)

      textManager.updateText({
        target: textbox,
        withoutSave: true,
        selectionRange: { start: 2, end: 4 },
        style: {
          fontSize: 50,
          fontFamily: 'Roboto'
        }
      })

      const firstLineStyles = textbox.getSelectionStyles(0, newlineIndex)
      expect(firstLineStyles).toHaveLength(newlineIndex)
      for (let index = 0; index < firstLineStyles.length; index += 1) {
        const style = firstLineStyles[index]
        expect(style.fontSize).toBe(50)
        expect(style.fontFamily).toBe('Roboto')
      }

      const secondLineStyles = textbox.getSelectionStyles(secondLineStart, textValue.length)
      for (let index = 0; index < secondLineStyles.length; index += 1) {
        const style = secondLineStyles[index]
        expect(style.fontSize).toBeUndefined()
        expect(style.fontFamily).toBeUndefined()
      }

      expect(textbox.fontSize).toBe(32)
      expect(textbox.fontFamily).toBe('Arial')
    })

    it('сохраняет lineFontDefaults для строки при частичном изменении шрифта', () => {
      const { textManager } = createTextManagerTestSetup()

      const textbox = textManager.addText({
        text: 'Первая строка\nВторая строка',
        fontFamily: 'Arial',
        fontSize: 32
      })

      textbox.isEditing = true
      textbox.selectionStart = 1
      textbox.selectionEnd = 4

      textManager.updateText({
        target: textbox,
        withoutSave: true,
        style: {
          fontFamily: 'Roboto',
          fontSize: 40
        }
      })

      const { lineFontDefaults } = textbox
      const firstLineDefaults = lineFontDefaults?.[0]
      const secondLineDefaults = lineFontDefaults?.[1]

      expect(firstLineDefaults).toMatchObject({
        fontFamily: 'Roboto',
        fontSize: 40
      })
      expect(secondLineDefaults).toBeUndefined()
    })

    it('сохраняет fill и stroke в lineFontDefaults при выделении всей строки', () => {
      const { textManager } = createTextManagerTestSetup()

      const textbox = textManager.addText({
        text: 'LineOne\nLineTwo',
        fontFamily: 'Arial',
        fontSize: 32,
        color: '#111111'
      })

      const firstLineLength = 'LineOne'.length
      textbox.isEditing = true
      textbox.selectionStart = 0
      textbox.selectionEnd = firstLineLength

      textManager.updateText({
        target: textbox,
        withoutSave: true,
        style: {
          color: '#ff0000',
          strokeColor: '#00ff00',
          strokeWidth: 2
        }
      })

      const { lineFontDefaults } = textbox
      const firstLineDefaults = lineFontDefaults?.[0]
      const secondLineDefaults = lineFontDefaults?.[1]

      expect(firstLineDefaults).toMatchObject({
        fill: '#ff0000',
        stroke: '#00ff00'
      })
      expect(secondLineDefaults).toBeUndefined()
    })

    it('пересчитывает размеры при смене шрифта для выделенного текста', () => {
      const {
        textManager
      } = createTextManagerTestSetup()

      const textbox = textManager.addText({
        text: 'line one\nline two',
        fontFamily: 'Arial',
        fontSize: 32
      })

      textbox.isEditing = true
      textbox.selectionStart = 0
      textbox.selectionEnd = 4

      const initDimensionsSpy = jest.spyOn(textbox, 'initDimensions')

      textManager.updateText({
        target: textbox,
        withoutSave: true,
        style: {
          fontFamily: 'Roboto'
        }
      })

      expect(initDimensionsSpy).toHaveBeenCalled()
    })

    it('синхронизирует базовые стили объекта, если выделён весь текст', () => {
      const {
        textManager
      } = createTextManagerTestSetup()

      const textbox = textManager.addText({
        text: 'полный текст',
        color: '#111111',
        strokeColor: '#222222',
        strokeWidth: 1
      })

      const textLength = textbox.text?.length ?? 0
      expect(textLength).toBeGreaterThan(0)

      textbox.isEditing = true
      textbox.selectionStart = 0
      textbox.selectionEnd = textLength

      textManager.updateText({
        target: textbox,
        withoutSave: true,
        style: {
          color: '#ff0000',
          strokeColor: '#00ff00',
          strokeWidth: 4,
          bold: true,
          italic: true,
          underline: true,
          strikethrough: true,
          fontFamily: 'Roboto'
        }
      })

      expect(textbox.fill).toBe('#ff0000')
      expect(textbox.stroke).toBe('#00ff00')
      expect(textbox.strokeWidth).toBe(4)
      expect(textbox.fontFamily).toBe('Roboto')
      expect(textbox.fontWeight).toBe('bold')
      expect(textbox.fontStyle).toBe('italic')
      expect(textbox.underline).toBe(true)
      expect(textbox.linethrough).toBe(true)

      const selectionStyles = textbox.getSelectionStyles(0, textLength)
      expect(selectionStyles).not.toHaveLength(0)
      selectionStyles.forEach((style) => {
        expect(style).toMatchObject({
          fill: '#ff0000',
          stroke: '#00ff00',
          strokeWidth: 4,
          fontWeight: 'bold',
          fontStyle: 'italic',
          underline: true,
          linethrough: true,
          fontFamily: 'Roboto'
        })
      })
    })

    it('не обновляет глобальный цвет, если стили применены частично', () => {
      const {
        textManager
      } = createTextManagerTestSetup()

      const textbox = textManager.addText({
        text: 'color sync',
        color: '#111111'
      })

      const textLength = textbox.text?.length ?? 0
      expect(textLength).toBeGreaterThan(0)

      textbox.isEditing = true

      textbox.selectionStart = 0
      textbox.selectionEnd = 5
      textManager.updateText({
        target: textbox,
        withoutSave: true,
        style: { color: '#ff0000' }
      })

      expect(textbox.fill).toBe('#111111')

      textbox.selectionStart = 5
      textbox.selectionEnd = textLength
      textManager.updateText({
        target: textbox,
        withoutSave: true,
        style: { color: '#ff0000' }
      })

      expect(textbox.fill).toBe('#111111')
    })

    it('не сохраняет временные lockMovement флаги из режима редактирования в историю', () => {
      const {
        textManager,
        historyManager
      } = createTextManagerTestSetup()

      historyManager.saveState()
      const textbox = textManager.addText({ text: 'lock state' })

      textbox.isEditing = true
      textbox.lockMovementX = true
      textbox.lockMovementY = true
      textbox.locked = false

      textManager.updateText({
        target: textbox,
        style: { bold: true }
      })

      const state = historyManager.getFullState()
      const savedTextbox = state.objects?.[0]

      expect(textbox.lockMovementX).toBe(true)
      expect(textbox.lockMovementY).toBe(true)
      expect(savedTextbox?.lockMovementX).toBe(false)
      expect(savedTextbox?.lockMovementY).toBe(false)
    })

    it('сохраняет форматирование выделенного текста в историю', async() => {
      const {
        textManager,
        historyManager
      } = createTextManagerTestSetup()

      historyManager.saveState()
      const textbox = textManager.addText({ text: 'selection styles' })

      textbox.isEditing = true
      textbox.selectionStart = 0
      textbox.selectionEnd = 9

      textManager.updateText({
        target: textbox,
        style: { bold: true }
      })

      const stateAfterUpdate = historyManager.getFullState()
      const savedTextbox = stateAfterUpdate.objects?.[0]

      expect(savedTextbox?.styles?.[0]?.fontWeight).toBe('bold')

      await historyManager.undo()

      const stateAfterUndo = historyManager.getFullState()
      const restoredTextbox = stateAfterUndo.objects?.[0]

      expect(restoredTextbox?.styles?.[0]).toBeUndefined()
    })
  })

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

  describe('lineFontDefaults', () => {
    it('text:changed дополняет пропущенные стили строки и удаляет лишние индексы', () => {
      const { canvas, textManager } = createTextManagerTestSetup()

      const textbox = textManager.addText({
        text: 'aaa\nbb\nccc',
        autoExpand: false,
        fontFamily: 'Arial',
        fontSize: 48,
        color: '#000000'
      })

      textbox.lineFontDefaults = {
        2: {
          fontFamily: 'Arial',
          fontSize: 28,
          fill: '#111111',
          stroke: '#222222'
        }
      }
      textbox.styles = {
        2: {
          0: { fontSize: 28, fill: '#ff0000' },
          1: { fontSize: 28 },
          10: { fontSize: 28 },
          foo: { fontSize: 28 }
        }
      }

      canvas.fire('text:changed', { target: textbox })

      const { styles } = textbox
      const lineStyles = styles?.[2]

      expect(lineStyles).toBeDefined()
      expect(lineStyles?.[0]).toMatchObject({
        fontSize: 28,
        fill: '#ff0000',
        fontFamily: 'Arial',
        stroke: '#222222'
      })
      expect(lineStyles?.[1]).toMatchObject({
        fontSize: 28,
        fill: '#111111',
        fontFamily: 'Arial',
        stroke: '#222222'
      })
      expect(lineStyles?.[2]).toMatchObject({
        fontSize: 28,
        fill: '#111111',
        fontFamily: 'Arial',
        stroke: '#222222'
      })
      expect(lineStyles?.[10]).toBeUndefined()
      expect(lineStyles?.['foo']).toBeUndefined()
    })
  })

  describe('HistoryManager интеграция', () => {
    it('поддерживает undo/redo для добавления и обновления текста', async() => {
      const {
        canvas,
        historyManager,
        textManager,
        getObjects
      } = createTextManagerTestSetup()

      historyManager.saveState()
      canvas.on('object:added', () => historyManager.saveState())

      const textbox = textManager.addText({ text: 'версия 1' })
      expect(getObjects()).toHaveLength(1)
      expect(getObjects()[0]?.text).toBe('версия 1')

      textManager.updateText({
        target: textbox,
        style: { text: 'версия 2' }
      })
      expect(getObjects()[0]?.text).toBe('версия 2')

      await historyManager.undo()
      expect(getObjects()).toHaveLength(1)
      expect(getObjects()[0]?.text).toBe('версия 1')

      await historyManager.undo()
      expect(getObjects()).toHaveLength(0)

      await historyManager.redo()
      expect(getObjects()).toHaveLength(1)
      expect(getObjects()[0]?.text).toBe('версия 1')

      await historyManager.redo()
      expect(getObjects()).toHaveLength(1)
      expect(getObjects()[0]?.text).toBe('версия 2')
    })

    it('фиксирует начало и конец редактирования текста', () => {
      const {
        canvas,
        historyManager,
        textManager
      } = createTextManagerTestSetup()

      const beginActionSpy = jest.spyOn(historyManager, 'beginAction').mockImplementation(() => {})
      const endActionSpy = jest.spyOn(historyManager, 'endAction').mockImplementation(() => {})
      const scheduleSaveSpy = jest.spyOn(historyManager, 'scheduleSaveState').mockImplementation(() => {})

      const textbox = textManager.addText({ text: 'Редактирование' })

      canvas.fire('text:editing:entered', { target: textbox })

      expect(beginActionSpy).toHaveBeenCalledWith({ reason: 'text-edit' })
      expect(textManager.isTextEditingActive).toBe(true)

      canvas.fire('text:editing:exited', { target: textbox })

      expect(endActionSpy).toHaveBeenCalledWith({ reason: 'text-edit' })
      expect(scheduleSaveSpy).toHaveBeenCalledWith({
        delayMs: TEXT_EDITING_DEBOUNCE_MS,
        reason: 'text-edit'
      })

      beginActionSpy.mockRestore()
      endActionSpy.mockRestore()
      scheduleSaveSpy.mockRestore()
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

  describe('uppercase и textCaseRaw', () => {
    describe('базовое поведение uppercase', () => {
      it('при включении uppercase текст становится заглавным', () => {
        const { textManager } = createTextManagerTestSetup()
        const textbox = textManager.addText({ text: 'Привет Мир' })

        expect(textbox.text).toBe('Привет Мир')
        expect(textbox.uppercase).toBe(false)
        expect(textbox.textCaseRaw).toBe('Привет Мир')

        textManager.updateText({ target: textbox, style: { uppercase: true } })

        expect(textbox.text).toBe('ПРИВЕТ МИР')
        expect(textbox.uppercase).toBe(true)
        expect(textbox.textCaseRaw).toBe('Привет Мир')
      })

      it('при выключении uppercase возвращается textCaseRaw', () => {
        const { textManager } = createTextManagerTestSetup()
        const textbox = textManager.addText({ text: 'Привет Мир', uppercase: true })

        expect(textbox.text).toBe('ПРИВЕТ МИР')
        expect(textbox.textCaseRaw).toBe('Привет Мир')

        textManager.updateText({ target: textbox, style: { uppercase: false } })

        expect(textbox.text).toBe('Привет Мир')
        expect(textbox.uppercase).toBe(false)
      })

      it('textCaseRaw сохраняет оригинальный регистр при создании', () => {
        const { textManager } = createTextManagerTestSetup()

        const textbox1 = textManager.addText({ text: 'НоВыЙ ТеКсТ' })
        expect(textbox1.textCaseRaw).toBe('НоВыЙ ТеКсТ')

        const textbox2 = textManager.addText({ text: 'НоВыЙ ТеКсТ', uppercase: true })
        expect(textbox2.text).toBe('НОВЫЙ ТЕКСТ')
        expect(textbox2.textCaseRaw).toBe('НоВыЙ ТеКсТ')
      })
    })

    describe('редактирование с включенным uppercase', () => {
      it('вводимый текст автоматически становится заглавным', () => {
        const { canvas, textManager } = createTextManagerTestSetup()
        const textbox = textManager.addText({ text: 'Текст', uppercase: true })

        // Симулируем ввод текста
        textbox.text = 'Текст новый'
        canvas.fire('text:changed', { target: textbox })

        expect(textbox.text).toBe('ТЕКСТ НОВЫЙ')
      })

      it('textCaseRaw обновляется с новыми символами в нижнем регистре при добавлении', () => {
        const { canvas, textManager } = createTextManagerTestSetup()
        const textbox = textManager.addText({ text: 'Новый', uppercase: true })

        expect(textbox.textCaseRaw).toBe('Новый')

        // Симулируем добавление текста
        textbox.text = 'Новый текст'
        canvas.fire('text:changed', { target: textbox })

        expect(textbox.text).toBe('НОВЫЙ ТЕКСТ')
        expect(textbox.textCaseRaw).toBe('новый текст')
      })

      it('textCaseRaw обрезается при удалении символов', () => {
        const { canvas, textManager } = createTextManagerTestSetup()
        const textbox = textManager.addText({ text: 'Новый текст', uppercase: true })

        expect(textbox.textCaseRaw).toBe('Новый текст')

        // Симулируем удаление части текста
        textbox.text = 'Новый'
        canvas.fire('text:changed', { target: textbox })

        expect(textbox.text).toBe('НОВЫЙ')
        expect(textbox.textCaseRaw).toBe('новый')
      })

      it('при замене символов textCaseRaw обновляется в нижнем регистре', () => {
        const { canvas, textManager } = createTextManagerTestSetup()
        const textbox = textManager.addText({ text: 'Привет', uppercase: true })

        // Симулируем замену текста той же длины
        textbox.text = 'Замена'
        canvas.fire('text:changed', { target: textbox })

        expect(textbox.text).toBe('ЗАМЕНА')
        expect(textbox.textCaseRaw).toBe('замена')
      })
    })

    describe('редактирование с выключенным uppercase', () => {
      it('textCaseRaw обновляется при каждом изменении текста', () => {
        const { canvas, textManager } = createTextManagerTestSetup()
        const textbox = textManager.addText({ text: 'Привет' })

        textbox.text = 'Привет МИР'
        canvas.fire('text:changed', { target: textbox })

        expect(textbox.text).toBe('Привет МИР')
        expect(textbox.textCaseRaw).toBe('Привет МИР')
      })

      it('textCaseRaw === text при uppercase = false', () => {
        const { canvas, textManager } = createTextManagerTestSetup()
        const textbox = textManager.addText({ text: 'Любой текст' })

        const texts = ['Новый', 'ЗАГЛАВНЫЙ', 'СмЕшАнНыЙ', 'lowercase']

        texts.forEach((text) => {
          textbox.text = text
          canvas.fire('text:changed', { target: textbox })
          expect(textbox.textCaseRaw).toBe(text)
        })
      })
    })

    describe('сохранение оригинального регистра (Canva-like)', () => {
      it('сохраняет смешанный регистр при переключении uppercase', () => {
        const { canvas, textManager } = createTextManagerTestSetup()

        // 1. Создать "Новый текст"
        const textbox = textManager.addText({ text: 'Новый текст' })
        expect(textbox.textCaseRaw).toBe('Новый текст')

        // 2. Дописать " тест"
        textbox.text = 'Новый текст тест'
        canvas.fire('text:changed', { target: textbox })
        expect(textbox.textCaseRaw).toBe('Новый текст тест')

        // 3. Включить uppercase
        textManager.updateText({ target: textbox, style: { uppercase: true } })
        expect(textbox.text).toBe('НОВЫЙ ТЕКСТ ТЕСТ')
        expect(textbox.textCaseRaw).toBe('Новый текст тест')

        // 4. Дописать " еще"
        textbox.text = 'НОВЫЙ ТЕКСТ ТЕСТ ЕЩЕ'
        canvas.fire('text:changed', { target: textbox })
        expect(textbox.text).toBe('НОВЫЙ ТЕКСТ ТЕСТ ЕЩЕ')
        expect(textbox.textCaseRaw).toBe('новый текст тест еще')

        // 5. Выключить uppercase
        textManager.updateText({ target: textbox, style: { uppercase: false } })
        expect(textbox.text).toBe('новый текст тест еще')
      })

      it('сохраняет заглавную первую букву при многократном редактировании', () => {
        const { canvas, textManager } = createTextManagerTestSetup()

        const textbox = textManager.addText({ text: 'Привет' })

        // Добавляем текст несколько раз
        textbox.text = 'Привет мир'
        canvas.fire('text:changed', { target: textbox })

        textbox.text = 'Привет мир тест'
        canvas.fire('text:changed', { target: textbox })

        // Включаем uppercase
        textManager.updateText({ target: textbox, style: { uppercase: true } })
        expect(textbox.text).toBe('ПРИВЕТ МИР ТЕСТ')

        // Добавляем еще текста
        textbox.text = 'ПРИВЕТ МИР ТЕСТ КОД'
        canvas.fire('text:changed', { target: textbox })

        // Выключаем uppercase - первая буква должна остаться заглавной
        textManager.updateText({ target: textbox, style: { uppercase: false } })
        expect(textbox.text).toBe('привет мир тест код')
      })
    })

    describe('обновление textCaseRaw при выходе из редактирования', () => {
      it('при text:editing:exited textCaseRaw обновляется корректно', () => {
        const { canvas, textManager } = createTextManagerTestSetup()
        const textbox = textManager.addText({ text: 'Тест', uppercase: true })

        textbox.text = 'ТЕСТ РЕДАКТИРОВАНИЕ'
        canvas.fire('text:changed', { target: textbox })
        canvas.fire('text:editing:exited', { target: textbox })

        expect(textbox.textCaseRaw).toBe('тест редактирование')
      })

      it('если uppercase=false, сохраняется текущий текст', () => {
        const { canvas, textManager } = createTextManagerTestSetup()
        const textbox = textManager.addText({ text: 'МиКс РеГиСтРа' })

        textbox.text = 'НоВыЙ МиКс'
        canvas.fire('text:changed', { target: textbox })
        canvas.fire('text:editing:exited', { target: textbox })

        expect(textbox.textCaseRaw).toBe('НоВыЙ МиКс')
        expect(textbox.text).toBe('НоВыЙ МиКс')
      })

      it('если uppercase=true, textCaseRaw не перезаписывается uppercase версией', () => {
        const { canvas, textManager } = createTextManagerTestSetup()
        const textbox = textManager.addText({ text: 'Нормальный', uppercase: true })

        textbox.text = 'НОРМАЛЬНЫЙ ТЕКСТ'
        canvas.fire('text:changed', { target: textbox })

        const rawBeforeExit = textbox.textCaseRaw
        canvas.fire('text:editing:exited', { target: textbox })

        expect(textbox.textCaseRaw).toBe(rawBeforeExit)
        expect(textbox.textCaseRaw).not.toBe('НОРМАЛЬНЫЙ ТЕКСТ')
      })
    })

    describe('масштабирование ActiveSelection с текстами', () => {
      it('диагональное масштабирование увеличивает размер шрифта и ширину текста', () => {
        const { canvas, textManager } = createTextManagerTestSetup()
        const textboxA = textManager.addText({ text: 'Первый', fontSize: 20 })
        const textboxB = textManager.addText({ text: 'Второй', fontSize: 30 })

        // Располагаем объекты
        textboxA.set({ left: 0, top: 0, width: 100 })
        textboxB.set({ left: 100, top: 100, width: 100 })

        const baseFontSizeA = textboxA.fontSize
        const baseFontSizeB = textboxB.fontSize
        const baseWidthA = textboxA.width
        const baseWidthB = textboxB.width

        // Создаем выделение
        const selection = new ActiveSelection([textboxA, textboxB], { canvas })
        canvas.setActiveObject(selection)

        // Эмулируем масштабирование группы (x2)
        selection.scaleX = 2
        selection.scaleY = 2

        // Эмулируем завершение трансформации
        canvas.fire('object:modified', { target: selection })

        // Проверяем, что масштаб группы сбросился
        // expect(selection.scaleX).toBe(1)
        // expect(selection.scaleY).toBe(1)

        // Проверяем, что свойства объектов обновились ("запеклись")
        expect(textboxA.fontSize).toBe(baseFontSizeA! * 2)
        expect(textboxB.fontSize).toBe(baseFontSizeB! * 2)

        expect(textboxA.width).toBe(baseWidthA! * 2)
        expect(textboxB.width).toBe(baseWidthB! * 2)

        // Проверяем, что масштаб объектов сброшен в 1
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

        expect(textbox.paddingTop).toBe(15) // 10 * 1.5
        expect(textbox.radiusTopLeft).toBe(7.5) // 5 * 1.5
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

    describe('когда текст уже упёрся в ширину монтажной области', () => {
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
        lineWidthSpy = jest.spyOn(textbox, 'getLineWidth').mockReturnValue(760)
      })

      afterEach(() => {
        initDimensionsSpy.mockRestore()
        lineWidthSpy.mockRestore()
      })

      it('при скейлинге по диагонали не раздувает текст по длине строки, если он уже упёрся в ширину монтажной области', () => {
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

        expect(textbox.autoExpand).toBe(true)
        expect(textbox.width).toBe(500)
        expect(textbox.fontSize).toBe(72)
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

      it('после завершения скейлинга оставляет ту же ширину, которая была во время перетаскивания', () => {
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

        expect(widthDuringScaling).toBe(500)
        expect(textbox.autoExpand).toBe(true)
        expect(textbox.width).toBe(widthDuringScaling)
        expect(textbox.fontSize).toBe(72)
      })
    })

    it('при скейлинге по диагонали не раздувает однострочный текст по длине строки, если он уже равен ширине монтажной области', () => {
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

      const initDimensionsSpy = jest.spyOn(textbox, 'initDimensions').mockImplementation(() => {
        textbox.textLines = ['Очень длинный заголовок']
        textbox.height = 48
      })
      const lineWidthSpy = jest.spyOn(textbox, 'getLineWidth').mockReturnValue(760)

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

        expect(textbox.autoExpand).toBe(true)
        expect(textbox.width).toBe(500)
        expect(textbox.fontSize).toBe(72)
      } finally {
        initDimensionsSpy.mockRestore()
        lineWidthSpy.mockRestore()
      }
    })

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

  describe('resizing', () => {
    it('корректирует ширину, вычитая отступы при изменении размера', () => {
      const { textManager, canvas } = createTextManagerTestSetup()
      const textbox = textManager.addText({ text: 'Test' })

      // Устанавливаем отступы
      textbox.set({
        paddingLeft: 10,
        paddingRight: 10,
        width: 100 // Начальная ширина
      })

      // Эмулируем изменение размера (resizing)
      // Fabric рассчитывает новую ширину на основе позиции мыши, включая визуальные отступы.
      // Если мы растягиваем объект до 150px визуально, Fabric ставит width = 150.
      // Но нам нужно, чтобы ширина текста была 150 - 20 = 130.

      textbox.set({ width: 150 })

      canvas.fire('object:resizing', {
        target: textbox,
        transform: { corner: 'mr' } // Правый контрол
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

      // Эмулируем изменение размера слева
      // Допустим, мы тянем левый контрол влево на 50px.
      // Визуальная ширина становится 150. Fabric ставит width = 150.
      // Fabric также сдвигает 'left', так как origin сместился.
      // Если ширина увеличилась на 50 (100 -> 150), left сдвигается на -50 (100 -> 50).

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

      // Ожидаемое поведение:
      // Ширина должна быть 150 - 20 = 130.
      // Разница ширин 150 - 130 = 20.
      // Нам нужно сдвинуть 'left' на +20, чтобы компенсировать уменьшение ширины.
      // Новый left должен быть 50 + 20 = 70.
      // Это гарантирует, что правый край останется на 200 (70 + 130 = 200).

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

      // Эмулируем изменение размера справа
      // Тянем правый контрол на 50px.
      // Ширина становится 150. Left остается 100.

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

      // Ожидаемое поведение:
      // Ширина должна быть 150 - 20 = 130.
      // Left должен остаться 100.

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
