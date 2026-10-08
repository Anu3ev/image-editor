import { createTranslator, type TranslationKey } from '../../../../src/editor/i18n'
import en from '../../../../src/editor/i18n/en'
import ru from '../../../../src/editor/i18n/ru'

interface NestedCatalog {
  [key: string]: string | NestedCatalog
}

/** Collects leaf paths while rejecting flattened keys at every catalog level. */
function catalogEntries(catalog: NestedCatalog, prefix = ''): Array<[string, string]> {
  return Object.entries(catalog).flatMap(([key, value]) => {
    expect(key).not.toContain('.')
    const path = prefix ? `${prefix}.${key}` : key

    if (typeof value === 'string') return [[path, value]]

    return catalogEntries(value, path)
  })
}

describe('Per-instance editor translations', () => {
  it('uses English immediately when no locale is supplied', () => {
    const t = createTranslator()

    expect(t('text.defaults.newText')).toBe('New text')
    expect(t('ui.toolbar.duplicate')).toBe('Duplicate')
  })

  it('resolves regional Russian through the Russian catalog', () => {
    const t = createTranslator({ language: 'ru-RU' })

    expect(t('text.defaults.newText')).toBe('Новый текст')
  })

  it.each(['RU', 'Ru', 'RU-ru'])('resolves the case-insensitive locale %s', (language) => {
    expect(createTranslator({ language })('text.defaults.newText')).toBe('Новый текст')
  })

  it('falls back to English for an unsupported locale', () => {
    const t = createTranslator({ language: 'zz-ZZ' })

    expect(t('text.defaults.newText')).toBe('New text')
  })

  it('keeps independent translators stable after another locale is initialized', () => {
    const english = createTranslator({ language: 'en' })
    const russian = createTranslator({ language: 'ru' })
    createTranslator({ language: 'zz-ZZ' })

    expect(russian('ui.toolbar.delete')).toBe('Удалить')
    expect(english('ui.toolbar.delete')).toBe('Delete')
    expect(russian('ui.toolbar.delete')).toBe('Удалить')
  })

  it('interpolates visible indicator values without HTML-escaping content', () => {
    const t = createTranslator({ language: 'en' })

    expect(t('ui.indicators.objectSize', { width: 120, height: 48 })).toBe('Width: 120 Height: 48')
    expect(t('ui.indicators.objectSize', { width: '<120>&', height: 48 }))
      .toBe('Width: <120>& Height: 48')
  })
})

describe('Built-in catalog consistency', () => {
  it.each([
    ['en', en],
    ['ru', ru]
  ] as const)('preserves nested domains and resolves every %s leaf', (language, catalog) => {
    expect(catalog.ui).toHaveProperty('toolbar.duplicate')
    expect(catalog.text).toHaveProperty('defaults.newText')
    expect(Object.keys(catalog).sort()).toEqual(['image', 'text', 'ui'])
    expect(Object.keys(catalog.image)).toEqual(['filenames'])
    expect(Object.keys(catalog.text)).toEqual(['defaults'])
    expect(Object.keys(catalog.ui).sort()).toEqual(['indicators', 'toolbar'])

    const entries = catalogEntries(catalog)
    const t = createTranslator({ language })

    expect(entries.length).toBeGreaterThan(0)

    for (const [key, value] of entries) {
      const parameters: Record<string, string> = {}
      const expected = value.replace(/\{\{([^}]+)\}\}/g, (_match, name: string) => {
        parameters[name] = `<${name}>&`
        return parameters[name]
      })

      expect(value.trim()).not.toBe('')
      expect({ key, translation: t(key as TranslationKey, parameters) }).toEqual({ key, translation: expected })
    }
  })

  it('provides matching English and Russian leaf paths and interpolation parameters', () => {
    const englishEntries = catalogEntries(en)
    const russianEntries = new Map(catalogEntries(ru))

    expect([...russianEntries.keys()].sort()).toEqual(englishEntries.map(([key]) => key).sort())

    for (const [key, value] of englishEntries) {
      const englishParameters = value.match(/\{\{[^}]+\}\}/g) ?? []
      const russianParameters = russianEntries.get(key)?.match(/\{\{[^}]+\}\}/g) ?? []

      expect({ key, parameters: russianParameters.sort() })
        .toEqual({ key, parameters: englishParameters.sort() })
    }
  })

  it.each(['cimode', 'CIMODE'])('falls back to English for the reserved locale %s', (language) => {
    expect(createTranslator({ language })('text.defaults.newText')).toBe('New text')
  })
})
