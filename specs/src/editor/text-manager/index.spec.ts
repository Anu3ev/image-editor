import { nanoid } from 'nanoid'
import { createTextManagerTestSetup } from '../../../test-utils/editor-helpers'

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

      textManager.updateText(baseTextbox, {
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

      textManager.updateText(baseTextbox, { text: 'без истории' }, {
        withoutSave: true,
        skipRender: true
      })

      expect(saveSpy).not.toHaveBeenCalled()
      expect(canvas.requestRenderAll).not.toHaveBeenCalled()
      expect(baseTextbox.text).toBe('БЕЗ ИСТОРИИ')
      expect(historyManager.totalChangesCount).toBe(2)
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

      textManager.updateText(textbox, { text: 'версия 2' })
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

  describe('uppercase и textCaseRaw', () => {
    describe('базовое поведение uppercase', () => {
      it('при включении uppercase текст становится заглавным', () => {
        const { textManager } = createTextManagerTestSetup()
        const textbox = textManager.addText({ text: 'Привет Мир' })

        expect(textbox.text).toBe('Привет Мир')
        expect(textbox.uppercase).toBe(false)
        expect(textbox.textCaseRaw).toBe('Привет Мир')

        textManager.updateText(textbox, { uppercase: true })

        expect(textbox.text).toBe('ПРИВЕТ МИР')
        expect(textbox.uppercase).toBe(true)
        expect(textbox.textCaseRaw).toBe('Привет Мир')
      })

      it('при выключении uppercase возвращается textCaseRaw', () => {
        const { textManager } = createTextManagerTestSetup()
        const textbox = textManager.addText({ text: 'Привет Мир', uppercase: true })

        expect(textbox.text).toBe('ПРИВЕТ МИР')
        expect(textbox.textCaseRaw).toBe('Привет Мир')

        textManager.updateText(textbox, { uppercase: false })

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
        expect(textbox.textCaseRaw).toBe('Новый текст')
      })

      it('textCaseRaw обрезается при удалении символов', () => {
        const { canvas, textManager } = createTextManagerTestSetup()
        const textbox = textManager.addText({ text: 'Новый текст', uppercase: true })

        expect(textbox.textCaseRaw).toBe('Новый текст')

        // Симулируем удаление части текста
        textbox.text = 'Новый'
        canvas.fire('text:changed', { target: textbox })

        expect(textbox.text).toBe('НОВЫЙ')
        expect(textbox.textCaseRaw).toBe('Новый')
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
        textManager.updateText(textbox, { uppercase: true })
        expect(textbox.text).toBe('НОВЫЙ ТЕКСТ ТЕСТ')
        expect(textbox.textCaseRaw).toBe('Новый текст тест')

        // 4. Дописать " еще"
        textbox.text = 'НОВЫЙ ТЕКСТ ТЕСТ ЕЩЕ'
        canvas.fire('text:changed', { target: textbox })
        expect(textbox.text).toBe('НОВЫЙ ТЕКСТ ТЕСТ ЕЩЕ')
        expect(textbox.textCaseRaw).toBe('Новый текст тест еще')

        // 5. Выключить uppercase
        textManager.updateText(textbox, { uppercase: false })
        expect(textbox.text).toBe('Новый текст тест еще')
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
        textManager.updateText(textbox, { uppercase: true })
        expect(textbox.text).toBe('ПРИВЕТ МИР ТЕСТ')

        // Добавляем еще текста
        textbox.text = 'ПРИВЕТ МИР ТЕСТ КОД'
        canvas.fire('text:changed', { target: textbox })

        // Выключаем uppercase - первая буква должна остаться заглавной
        textManager.updateText(textbox, { uppercase: false })
        expect(textbox.text).toBe('Привет мир тест код')
      })
    })

    describe('обновление textCaseRaw при выходе из редактирования', () => {
      it('при text:editing:exited textCaseRaw обновляется корректно', () => {
        const { canvas, textManager } = createTextManagerTestSetup()
        const textbox = textManager.addText({ text: 'Тест', uppercase: true })

        textbox.text = 'ТЕСТ РЕДАКТИРОВАНИЕ'
        canvas.fire('text:changed', { target: textbox })
        canvas.fire('text:editing:exited', { target: textbox })

        expect(textbox.textCaseRaw).toBe('Тест редактирование')
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
  })
})
