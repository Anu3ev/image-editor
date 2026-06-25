import { nanoid } from 'nanoid'
import {
  createTextManagerTestSetup
} from '../../../test-utils/text/manager-setup'
import { BackgroundTextbox } from '../../../../src/editor/text-manager/background-textbox'
import type { BeforeTextUpdatedPayload } from '../../../../src/editor/text-manager/types'
import { TEXT_EDITING_DEBOUNCE_MS } from '../../../../src/editor/constants'
import * as textGeometry from '../../../../src/editor/text-manager/geometry'

jest.mock('nanoid')

/**
 * Возвращает только lifecycle-события updateText из общего списка canvas.fire вызовов.
 */
const getTextUpdateEventCalls = (
  fireMock: jest.Mock<void, [string, unknown]>
): Array<[string, unknown]> => fireMock.mock.calls.filter(([eventName]) => {
  return eventName === 'editor:before:text-updated'
    || eventName === 'editor:text-updated'
})

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

      expect(textbox.id).toBe('background-textbox-mocked-id')
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
      const savedTextbox = state.objects?.[0] as { text?: string } | undefined
      expect(savedTextbox?.text).toBe('Привет')
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

    it('не обновляет заблокированный текст', () => {
      const {
        canvas,
        historyManager,
        textManager
      } = createTextManagerTestSetup()
      const textbox = textManager.addText({
        text: 'TEST',
        fontSize: 32
      })
      const saveSpy = jest.spyOn(historyManager, 'saveState')

      saveSpy.mockClear()
      canvas.requestRenderAll.mockClear()
      canvas.fire.mockClear()

      textbox.locked = true

      textManager.updateText({
        target: textbox,
        style: {
          text: 'UPDATED',
          fontSize: 72
        }
      })

      expect(textbox.text).toBe('TEST')
      expect(textbox.fontSize).toBe(32)
      expect(saveSpy).not.toHaveBeenCalled()
      expect(canvas.requestRenderAll).not.toHaveBeenCalled()
      expect(canvas.fire).not.toHaveBeenCalled()
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

      canvas.on('editor:before:text-updated', ({ textbox: eventTextbox }: BeforeTextUpdatedPayload) => {
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

      const textUpdateCalls = getTextUpdateEventCalls(canvas.fire)

      expect(textUpdateCalls).toEqual([
        [
          'editor:before:text-updated',
          expect.objectContaining({
            selectionRange: undefined,
            selectionStyles: undefined
          })
        ],
        [
          'editor:text-updated',
          expect.objectContaining({
            after: expect.objectContaining({
              fontSize: 80,
              left: 123
            })
          })
        ]
      ])

      const state = historyManager.getFullState()

      expect(state.objects?.[0]?.left).toBe(123)
      expect(saveSpy).toHaveBeenCalledTimes(1)
    })

    it('цвет, начертание и обводка при частичном выделении не меняют стиль всего объекта', () => {
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
          strokeColor: '#00ff00',
          strokeWidth: 5
        }
      })

      expect(saveSpy).not.toHaveBeenCalled()
      expect(canvas.requestRenderAll).toHaveBeenCalledTimes(1)
      expect(textbox.dirty).toBe(true)

      // Базовые свойства объекта не меняются от частичного декоративного стиля.
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
          stroke: '#00ff00',
          strokeWidth: 5
        })
      })

      const textUpdateCalls = getTextUpdateEventCalls(canvas.fire)

      expect(textUpdateCalls).toEqual([
        [
          'editor:before:text-updated',
          expect.objectContaining({
            selectionRange: { start: 10, end: 15 },
            selectionStyles: expect.objectContaining({
              fontWeight: 'bold',
              fontStyle: 'italic',
              fill: '#ff0000'
            })
          })
        ],
        [
          'editor:text-updated',
          expect.objectContaining({
            selectionRange: { start: 10, end: 15 },
            selectionStyles: expect.objectContaining({
              fontWeight: 'bold',
              fontStyle: 'italic',
              fill: '#ff0000'
            })
          })
        ]
      ])
    })

    it('если в однострочном тексте выделена часть строки, шрифт и размер обновляют весь объект', () => {
      const { textManager } = createTextManagerTestSetup()

      const textbox = textManager.addText({
        text: 'NEW TEXT',
        fontFamily: 'Arial',
        fontSize: 48
      })
      const textValue = textbox.text ?? ''

      textbox.isEditing = true
      textbox.selectionStart = 4
      textbox.selectionEnd = 8

      textManager.updateText({
        target: textbox,
        withoutSave: true,
        style: {
          fontFamily: 'Exo 2',
          fontSize: 36
        }
      })

      const wholeTextStyles = textbox.getSelectionStyles(0, textValue.length)
      expect(wholeTextStyles).toHaveLength(textValue.length)
      for (let index = 0; index < wholeTextStyles.length; index += 1) {
        const style = wholeTextStyles[index]
        expect(style.fontFamily).toBe('Exo 2')
        expect(style.fontSize).toBe(36)
      }

      expect(textbox.fontFamily).toBe('Exo 2')
      expect(textbox.fontSize).toBe(36)
    })

    it('в многострочном тексте применяет шрифт и размер ко всей затронутой строке', () => {
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
      const savedTextboxStyles = (savedTextbox as {
        styles?: Record<number, { fontWeight?: string }>
      } | undefined)?.styles

      expect(savedTextboxStyles?.[0]?.fontWeight).toBe('bold')

      await historyManager.undo()

      const stateAfterUndo = historyManager.getFullState()
      const restoredTextbox = stateAfterUndo.objects?.[0]
      const restoredTextboxStyles = (restoredTextbox as {
        styles?: Record<number, unknown>
      } | undefined)?.styles

      expect(restoredTextboxStyles?.[0]).toBeUndefined()
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
      const stageStateSpy = jest.spyOn(historyManager, 'stageCurrentStateForPendingSave').mockImplementation(() => {})
      const scheduleSaveSpy = jest.spyOn(historyManager, 'scheduleSaveState').mockImplementation(() => {})

      const textbox = textManager.addText({ text: 'Редактирование' })

      canvas.fire('text:editing:entered', { target: textbox })

      expect(beginActionSpy).toHaveBeenCalledWith({ reason: 'text-edit' })
      expect(textManager.isTextEditingActive).toBe(true)

      canvas.fire('text:editing:exited', { target: textbox })

      expect(endActionSpy).toHaveBeenCalledWith({ reason: 'text-edit' })
      expect(stageStateSpy).toHaveBeenCalledWith({ reason: 'text-edit' })
      expect(scheduleSaveSpy).toHaveBeenCalledWith({
        delayMs: TEXT_EDITING_DEBOUNCE_MS,
        reason: 'text-edit'
      })
      expect(stageStateSpy.mock.invocationCallOrder[0]).toBeLessThan(scheduleSaveSpy.mock.invocationCallOrder[0])

      beginActionSpy.mockRestore()
      endActionSpy.mockRestore()
      stageStateSpy.mockRestore()
      scheduleSaveSpy.mockRestore()
    })
  })

  describe('exitActiveTextEditing', () => {
    it('завершает редактирование активного текстового объекта и перерисовывает canvas', () => {
      const {
        canvas,
        textManager
      } = createTextManagerTestSetup()
      const textbox = textManager.addText({
        text: 'Редактируемый текст'
      })

      const exitEditingSpy = jest.fn(() => {
        textbox.isEditing = false
      })
      Object.assign(textbox, {
        exitEditing: exitEditingSpy
      })

      textbox.isEditing = true
      canvas.requestRenderAll.mockClear()

      const didExit = textManager.exitActiveTextEditing()

      expect(didExit).toBe(true)
      expect(exitEditingSpy).toHaveBeenCalledTimes(1)
      expect(canvas.requestRenderAll).toHaveBeenCalledTimes(1)
    })

    it('ничего не делает если активный объект не находится в режиме редактирования текста', () => {
      const {
        canvas,
        textManager
      } = createTextManagerTestSetup()
      const textbox = textManager.addText({
        text: 'Обычный текст'
      })

      const exitEditingSpy = jest.fn()
      Object.assign(textbox, {
        exitEditing: exitEditingSpy
      })
      canvas.requestRenderAll.mockClear()

      const didExit = textManager.exitActiveTextEditing()

      expect(didExit).toBe(false)
      expect(exitEditingSpy).not.toHaveBeenCalled()
      expect(canvas.requestRenderAll).not.toHaveBeenCalled()
    })
  })
})
