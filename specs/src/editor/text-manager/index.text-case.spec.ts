import { createTextManagerTestSetup } from '../../../test-utils/text/manager-setup'

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

    it('сохраняет оригинальный регистр при создании', () => {
      const { textManager } = createTextManagerTestSetup()

      const textboxWithoutUppercase = textManager.addText({ text: 'НоВыЙ ТеКсТ' })
      expect(textboxWithoutUppercase.textCaseRaw).toBe('НоВыЙ ТеКсТ')

      const textboxWithUppercase = textManager.addText({ text: 'НоВыЙ ТеКсТ', uppercase: true })
      expect(textboxWithUppercase.text).toBe('НОВЫЙ ТЕКСТ')
      expect(textboxWithUppercase.textCaseRaw).toBe('НоВыЙ ТеКсТ')
    })
  })

  describe('редактирование с включенным uppercase', () => {
    it('вводимый текст автоматически становится заглавным', () => {
      const { canvas, textManager } = createTextManagerTestSetup()
      const textbox = textManager.addText({ text: 'Текст', uppercase: true })

      textbox.text = 'Текст новый'
      canvas.fire('text:changed', { target: textbox })

      expect(textbox.text).toBe('ТЕКСТ НОВЫЙ')
    })

    it('обновляет textCaseRaw с новыми символами в нижнем регистре при добавлении', () => {
      const { canvas, textManager } = createTextManagerTestSetup()
      const textbox = textManager.addText({ text: 'Новый', uppercase: true })

      expect(textbox.textCaseRaw).toBe('Новый')

      textbox.text = 'Новый текст'
      canvas.fire('text:changed', { target: textbox })

      expect(textbox.text).toBe('НОВЫЙ ТЕКСТ')
      expect(textbox.textCaseRaw).toBe('новый текст')
    })

    it('обрезает textCaseRaw при удалении символов', () => {
      const { canvas, textManager } = createTextManagerTestSetup()
      const textbox = textManager.addText({ text: 'Новый текст', uppercase: true })

      expect(textbox.textCaseRaw).toBe('Новый текст')

      textbox.text = 'Новый'
      canvas.fire('text:changed', { target: textbox })

      expect(textbox.text).toBe('НОВЫЙ')
      expect(textbox.textCaseRaw).toBe('новый')
    })

    it('обновляет textCaseRaw в нижнем регистре при замене символов', () => {
      const { canvas, textManager } = createTextManagerTestSetup()
      const textbox = textManager.addText({ text: 'Привет', uppercase: true })

      textbox.text = 'Замена'
      canvas.fire('text:changed', { target: textbox })

      expect(textbox.text).toBe('ЗАМЕНА')
      expect(textbox.textCaseRaw).toBe('замена')
    })
  })

  describe('редактирование с выключенным uppercase', () => {
    it('обновляет textCaseRaw при каждом изменении текста', () => {
      const { canvas, textManager } = createTextManagerTestSetup()
      const textbox = textManager.addText({ text: 'Привет' })

      textbox.text = 'Привет МИР'
      canvas.fire('text:changed', { target: textbox })

      expect(textbox.text).toBe('Привет МИР')
      expect(textbox.textCaseRaw).toBe('Привет МИР')
    })

    it('держит textCaseRaw равным text когда uppercase выключен', () => {
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

  describe('сохранение оригинального регистра', () => {
    it('сохраняет смешанный регистр при переключении uppercase', () => {
      const { canvas, textManager } = createTextManagerTestSetup()

      const textbox = textManager.addText({ text: 'Новый текст' })
      expect(textbox.textCaseRaw).toBe('Новый текст')

      textbox.text = 'Новый текст тест'
      canvas.fire('text:changed', { target: textbox })
      expect(textbox.textCaseRaw).toBe('Новый текст тест')

      textManager.updateText({ target: textbox, style: { uppercase: true } })
      expect(textbox.text).toBe('НОВЫЙ ТЕКСТ ТЕСТ')
      expect(textbox.textCaseRaw).toBe('Новый текст тест')

      textbox.text = 'НОВЫЙ ТЕКСТ ТЕСТ ЕЩЕ'
      canvas.fire('text:changed', { target: textbox })
      expect(textbox.text).toBe('НОВЫЙ ТЕКСТ ТЕСТ ЕЩЕ')
      expect(textbox.textCaseRaw).toBe('новый текст тест еще')

      textManager.updateText({ target: textbox, style: { uppercase: false } })
      expect(textbox.text).toBe('новый текст тест еще')
    })

    it('сохраняет первую букву при многократном редактировании', () => {
      const { canvas, textManager } = createTextManagerTestSetup()

      const textbox = textManager.addText({ text: 'Привет' })

      textbox.text = 'Привет мир'
      canvas.fire('text:changed', { target: textbox })

      textbox.text = 'Привет мир тест'
      canvas.fire('text:changed', { target: textbox })

      textManager.updateText({ target: textbox, style: { uppercase: true } })
      expect(textbox.text).toBe('ПРИВЕТ МИР ТЕСТ')

      textbox.text = 'ПРИВЕТ МИР ТЕСТ КОД'
      canvas.fire('text:changed', { target: textbox })

      textManager.updateText({ target: textbox, style: { uppercase: false } })
      expect(textbox.text).toBe('привет мир тест код')
    })
  })

  describe('обновление textCaseRaw при выходе из редактирования', () => {
    it('обновляет textCaseRaw корректно при завершении редактирования', () => {
      const { canvas, textManager } = createTextManagerTestSetup()
      const textbox = textManager.addText({ text: 'Тест', uppercase: true })

      textbox.text = 'ТЕСТ РЕДАКТИРОВАНИЕ'
      canvas.fire('text:changed', { target: textbox })
      canvas.fire('text:editing:exited', { target: textbox })

      expect(textbox.textCaseRaw).toBe('тест редактирование')
    })

    it('сохраняет текущий текст если uppercase выключен', () => {
      const { canvas, textManager } = createTextManagerTestSetup()
      const textbox = textManager.addText({ text: 'МиКс РеГиСтРа' })

      textbox.text = 'НоВыЙ МиКс'
      canvas.fire('text:changed', { target: textbox })
      canvas.fire('text:editing:exited', { target: textbox })

      expect(textbox.textCaseRaw).toBe('НоВыЙ МиКс')
      expect(textbox.text).toBe('НоВыЙ МиКс')
    })

    it('не перезаписывает textCaseRaw uppercase-версией когда uppercase включен', () => {
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
