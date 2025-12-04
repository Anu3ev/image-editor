import { ActiveSelection } from 'fabric'
import { nanoid } from 'nanoid'
import { createTextManagerTestSetup } from '../../../test-utils/editor-helpers'
import { BackgroundTextbox } from '../../../../src/editor/text-manager/background-textbox'

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
      expect(canvas.centerObject).toHaveBeenCalledWith(textbox)
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

      const [eventName, payload] = canvas.fire.mock.calls[0]
      expect(eventName).toBe('editor:text-updated')
      expect(payload.selectionRange).toEqual({ start: 10, end: 15 })
      expect(payload.selectionStyles).toMatchObject({
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

  describe('HistoryManager интеграция', () => {
    it('поддерживает undo/redo для добавления и обновления текста', async () => {
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

        texts.forEach(text => {
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
      it('горизонтальное растягивание увеличивает ширину текстов без изменения кегля и с компенсацией scale', () => {
        const { canvas, textManager } = createTextManagerTestSetup()
        const textboxA = textManager.addText({ text: 'Первый', fontSize: 32 })
        const textboxB = textManager.addText({ text: 'Второй', fontSize: 28 })

        textboxA.set({ width: 100 })
        textboxB.set({ width: 80 })
        const baseWidthA = textboxA.width ?? textboxA.calcTextWidth()
        const baseWidthB = textboxB.width ?? textboxB.calcTextWidth()
        const baseFontA = textboxA.fontSize
        const baseFontB = textboxB.fontSize

        const selection = new ActiveSelection([textboxA, textboxB], { canvas })
        selection.scaleX = 2
        selection.setCoords = jest.fn()

        canvas.fire('object:scaling', {
          target: selection,
          transform: {
            corner: 'mr',
            action: 'scaleX',
            scaleX: 2,
            original: {
              left: selection.left,
              width: selection.width
            }
          }
        })

        expect(textboxA.width).toBeCloseTo((baseWidthA ?? 0) * 2)
        expect(textboxB.width).toBeCloseTo((baseWidthB ?? 0) * 2)
        expect(textboxA.scaleX).toBeCloseTo(0.5)
        expect(textboxB.scaleX).toBeCloseTo(0.5)
        expect(textboxA.fontSize).toBe(baseFontA)
        expect(textboxB.fontSize).toBe(baseFontB)
      })

      it('после завершения горизонтального скейла ширина фиксируется, а scale сбрасывается к 1', () => {
        const { canvas, textManager } = createTextManagerTestSetup()
        const textboxA = textManager.addText({ text: 'Первый', fontSize: 32 })
        const textboxB = textManager.addText({ text: 'Второй', fontSize: 28 })

        textboxA.set({ width: 100 })
        textboxB.set({ width: 80 })
        const baseWidthA = textboxA.width ?? textboxA.calcTextWidth()
        const baseWidthB = textboxB.width ?? textboxB.calcTextWidth()

        const selection = new ActiveSelection([textboxA, textboxB], { canvas })
        selection.scaleX = 2
        selection.setCoords = jest.fn()

        canvas.fire('object:scaling', {
          target: selection,
          transform: {
            corner: 'mr',
            action: 'scaleX',
            scaleX: 2,
            original: {
              left: selection.left,
              width: selection.width
            }
          }
        })

        canvas.fire('object:modified', { target: selection })

        expect(textboxA.width).toBeCloseTo((baseWidthA ?? 0) * 2)
        expect(textboxB.width).toBeCloseTo((baseWidthB ?? 0) * 2)
        expect(textboxA.scaleX).toBe(1)
        expect(textboxB.scaleX).toBe(1)
        expect(selection.scaleX).toBe(1)
      })
    })
  })
})
