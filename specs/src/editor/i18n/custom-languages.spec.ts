import type { CustomLanguages, EditorLocale, EditorOptions } from '../../../../src/main'
import { createTranslator, english } from '../../../../src/editor/i18n'
import en from '../../../../src/editor/i18n/en'
import ru from '../../../../src/editor/i18n/ru'

/** Freezes every nested resource to expose accidental mutations during registration. */
function deepFreeze<T extends object>(value: T): T {
  for (const child of Object.values(value)) {
    if (child && typeof child === 'object') deepFreeze(child)
  }
  return Object.freeze(value)
}

describe('Custom editor languages', () => {
  it('uses a partial new locale immediately and falls back to English for missing keys', () => {
    const t = createTranslator({
      language: 'pt',
      customLanguages: { pt: { ui: { toolbar: { delete: 'Excluir' } } } }
    })

    expect(t('ui.toolbar.delete')).toBe('Excluir')
    expect(t('ui.toolbar.duplicate')).toBe('Duplicate')
    expect(t('text.defaults.newText')).toBe('New text')
  })

  it.each(['pt-BR', 'PT-br', 'Pt-bR'])('resolves %s through regional, base, then English resources', (language) => {
    const t = createTranslator({
      language,
      customLanguages: {
        'PT-br': { ui: { toolbar: { delete: 'Excluir no Brasil' } } },
        PT: { ui: { toolbar: { delete: 'Excluir', duplicate: 'Duplicar' } } }
      }
    })

    expect(t('ui.toolbar.delete')).toBe('Excluir no Brasil')
    expect(t('ui.toolbar.duplicate')).toBe('Duplicar')
    expect(t('text.defaults.newText')).toBe('New text')
  })

  it('uses a custom base language when the requested region has no catalog', () => {
    const t = createTranslator({
      language: 'pt-PT',
      customLanguages: { PT: { ui: { toolbar: { delete: 'Excluir' } } } }
    })

    expect(t('ui.toolbar.delete')).toBe('Excluir')
  })

  it('does not substitute another regional catalog for a missing base language', () => {
    const t = createTranslator({
      language: 'pt',
      customLanguages: { 'pt-BR': { ui: { toolbar: { delete: 'Excluir' } } } }
    })

    expect(t('ui.toolbar.delete')).toBe('Delete')
  })

  it.each([
    ['ru', 'RU', ru],
    ['en', 'EN', en]
  ] as const)('deeply overrides %s without losing nested siblings or other domains', (language, resourceCode, catalog) => {
    const t = createTranslator({
      language,
      customLanguages: { [resourceCode]: { ui: { toolbar: { delete: 'Custom delete' } } } }
    })

    expect(t('ui.toolbar.delete')).toBe('Custom delete')
    expect(t('ui.toolbar.duplicate')).toBe(catalog.ui.toolbar.duplicate)
    expect(t('text.defaults.newText')).toBe(catalog.text.defaults.newText)
  })

  it('uses the per-instance English override for defaults and unsupported-language fallback', () => {
    const customLanguages: CustomLanguages = { en: { ui: { toolbar: { delete: 'Remove' } } } }

    expect(createTranslator({ customLanguages })('ui.toolbar.delete')).toBe('Remove')
    expect(createTranslator({ language: 'zz-ZZ', customLanguages })('ui.toolbar.delete')).toBe('Remove')
    expect(english('ui.toolbar.delete')).toBe('Delete')
  })

  it('partially overrides notification text and keeps built-in and English fallbacks', () => {
    const customLanguages: CustomLanguages = {
      ru: { notifications: { image: { exportFailed: 'Повторите экспорт.' } } },
      pt: { notifications: { image: { exportFailed: 'Tente exportar novamente.' } } },
      en: { notifications: { image: { importFailed: 'Try importing the image again.' } } }
    }
    const russian = createTranslator({ language: 'ru', customLanguages })
    const portuguese = createTranslator({ language: 'pt', customLanguages })

    expect(russian('notifications.image.exportFailed')).toBe('Повторите экспорт.')
    expect(russian('notifications.image.importFailed')).toBe('Не удалось импортировать изображение.')
    expect(russian('notifications.clipboard.copyFailed')).toBe('Не удалось скопировать объект.')
    expect(portuguese('notifications.image.exportFailed')).toBe('Tente exportar novamente.')
    expect(portuguese('notifications.image.importFailed')).toBe('Try importing the image again.')
    expect(portuguese('notifications.image.noSelection')).toBe('Select an object to export.')
  })

  it('isolates custom notification text between editors and from later caller mutations', () => {
    const locale = { notifications: { image: { exportFailed: 'First export notification' } } }
    const first = createTranslator({ language: 'ru', customLanguages: { ru: locale } })
    const second = createTranslator({
      language: 'ru',
      customLanguages: { ru: { notifications: { image: { exportFailed: 'Second export notification' } } } }
    })
    locale.notifications.image.exportFailed = 'Changed after initialization'

    expect(first('notifications.image.exportFailed')).toBe('First export notification')
    expect(second('notifications.image.exportFailed')).toBe('Second export notification')
    expect(createTranslator({ language: 'ru' })('notifications.image.exportFailed')).toBe('Не удалось экспортировать изображение.')
    expect(english('notifications.image.exportFailed')).toBe('The image could not be exported.')
    expect(first('notifications.image.exportFailed')).toBe('First export notification')
  })

  it('merges case-equivalent locale entries without dropping previous nested keys', () => {
    const t = createTranslator({
      language: 'pt',
      customLanguages: {
        PT: { ui: { toolbar: { delete: 'Excluir', duplicate: 'Original duplicate' } } },
        pt: { ui: { toolbar: { duplicate: 'Duplicar' } } }
      }
    })

    expect(t('ui.toolbar.delete')).toBe('Excluir')
    expect(t('ui.toolbar.duplicate')).toBe('Duplicar')
  })

  it.each(['cimode', 'CIMODE'])('keeps the reserved %s locale on the English fallback', (language) => {
    const t = createTranslator({
      language,
      customLanguages: { CIMODE: { ui: { toolbar: { delete: 'Unexpected key mode' } } } }
    })

    expect(t('ui.toolbar.delete')).toBe('Delete')
  })

  it('interpolates custom visible indicators without escaping host content', () => {
    const t = createTranslator({
      language: 'pt',
      customLanguages: { pt: { ui: { indicators: { objectSize: 'Largura: {{width}} Altura: {{height}}' } } } }
    })

    expect(t('ui.indicators.objectSize', { width: '<120>&', height: 48 })).toBe('Largura: <120>& Altura: 48')
  })

  it('isolates concurrent configurations even after caller resources change', () => {
    const locale = { ui: { toolbar: { delete: 'First delete' } } }
    const first = createTranslator({ language: 'pt', customLanguages: { pt: locale } })
    const second = createTranslator({
      language: 'pt',
      customLanguages: { pt: { ui: { toolbar: { delete: 'Second delete' } } } }
    })
    locale.ui.toolbar.delete = 'Changed after initialization'

    expect(first('ui.toolbar.delete')).toBe('First delete')
    expect(second('ui.toolbar.delete')).toBe('Second delete')
    expect(createTranslator({ language: 'pt' })('ui.toolbar.delete')).toBe('Delete')
    expect(first('ui.toolbar.delete')).toBe('First delete')
  })

  it('accepts deeply frozen resources and never mutates caller or built-in catalogs', () => {
    const customLanguages = deepFreeze({
      ru: { ui: { toolbar: { delete: 'Custom Russian delete' } } },
      en: { ui: { toolbar: { duplicate: 'Custom English duplicate' } } },
      pt: { ui: { toolbar: { delete: 'Excluir' } } }
    })
    deepFreeze(en)
    deepFreeze(ru)
    const before = JSON.stringify({ customLanguages, en, ru })
    const russian = createTranslator({ language: 'ru', customLanguages })
    const portuguese = createTranslator({ language: 'pt', customLanguages })

    expect(russian('ui.toolbar.delete')).toBe('Custom Russian delete')
    expect(russian('ui.toolbar.duplicate')).toBe('Создать копию')
    expect(portuguese('ui.toolbar.duplicate')).toBe('Custom English duplicate')
    expect(JSON.stringify({ customLanguages, en, ru })).toBe(before)
    expect(createTranslator({ language: 'ru' })('ui.toolbar.delete')).toBe('Удалить')
    expect(english('ui.toolbar.duplicate')).toBe('Duplicate')
  })
})

describe('Public custom-language types', () => {
  it('accepts optional nested keys and arbitrary translated strings in editor options', () => {
    const locale = {
      ui: { toolbar: { delete: 'Any translated string' } },
      notifications: { image: { exportFailed: 'Any export notification' } }
    } satisfies EditorLocale
    const customLanguages = { 'my-locale': locale, en: {} } satisfies CustomLanguages
    const options: Partial<EditorOptions> = { language: 'my-locale', customLanguages }

    expect(createTranslator(options)('ui.toolbar.delete')).toBe('Any translated string')
    expect(createTranslator(options)('notifications.image.exportFailed')).toBe('Any export notification')
  })

  it('rejects unknown nested keys and non-string leaves at compile time', () => {
    // @ts-expect-error Unknown toolbar keys are not part of the editor catalog.
    const unknownKey: EditorLocale = { ui: { toolbar: { missingAction: 'Unknown' } } }
    // @ts-expect-error Catalog leaves must be translated strings.
    const invalidLeaf: EditorLocale = { ui: { toolbar: { delete: 42 } } }
    // @ts-expect-error A catalog domain cannot be replaced by a string leaf.
    const invalidDomain: EditorLocale = { ui: 'Toolbar' }

    // @ts-expect-error Technical diagnostics are not part of the visible UI catalog.
    const technicalOverride: EditorLocale = { editor: { errors: { containerNotFound: 'Custom error' } } }

    expect([unknownKey, invalidLeaf, invalidDomain, technicalOverride]).toHaveLength(4)
  })
})
