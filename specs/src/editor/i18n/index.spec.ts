import { createTranslator } from '../../../../src/editor/i18n'
import en from '../../../../src/editor/i18n/en'
import ru from '../../../../src/editor/i18n/ru'

describe('Per-instance editor translations', () => {
  it('uses English immediately when no locale is supplied', () => {
    const t = createTranslator()

    expect(t('text.defaults.newText')).toBe('New text')
    expect(t('ui.toolbar.duplicate')).toBe('Duplicate')
  })

  it('resolves regional Russian through the Russian catalog', () => {
    const t = createTranslator('ru-RU')

    expect(t('text.defaults.newText')).toBe('Новый текст')
  })

  it.each(['RU', 'Ru', 'RU-ru'])('resolves the case-insensitive locale %s', (language) => {
    expect(createTranslator(language)('text.defaults.newText')).toBe('Новый текст')
  })

  it('falls back to English for an unsupported locale', () => {
    const t = createTranslator('zz-ZZ')

    expect(t('text.defaults.newText')).toBe('New text')
  })

  it('keeps independent translators stable after another locale is initialized', () => {
    const english = createTranslator('en')
    const russian = createTranslator('ru')
    createTranslator('zz-ZZ')

    expect(russian('ui.toolbar.delete')).toBe('Удалить')
    expect(english('ui.toolbar.delete')).toBe('Delete')
    expect(russian('ui.toolbar.delete')).toBe('Удалить')
  })

  it('interpolates multiple values without HTML-escaping diagnostic content', () => {
    const t = createTranslator('en')

    expect(t('ui.indicators.objectSize', { width: 120, height: 48 })).toBe('Width: 120 Height: 48')
    expect(t('editor.errors.containerNotFound', { containerId: '<canvas>&"' }))
      .toBe('Container with ID "<canvas>&"" was not found.')
  })
})

describe('Built-in catalog consistency', () => {
  it('provides matching English and Russian keys and interpolation parameters', () => {
    expect(Object.keys(ru).sort()).toEqual(Object.keys(en).sort())

    for (const key of Object.keys(en) as Array<keyof typeof en>) {
      const englishParameters = en[key].match(/\{\{[^}]+\}\}/g) ?? []
      const russianParameters = ru[key].match(/\{\{[^}]+\}\}/g) ?? []

      expect({ key, parameters: russianParameters.sort() })
        .toEqual({ key, parameters: englishParameters.sort() })
      expect(ru[key].trim()).not.toBe('')
      expect(en[key].trim()).not.toBe('')
    }
  })

  it.each(['cimode', 'CIMODE'])('falls back to English for the reserved locale %s', (language) => {
    expect(createTranslator(language)('text.defaults.newText')).toBe('New text')
  })
})
