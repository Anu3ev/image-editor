import { createInstance } from 'i18next'
import en from './en'
import ru from './ru'

/** Dotted paths to string leaves in a nested language catalog. */
type CatalogKey<T> = {
  [Key in keyof T & string]: T[Key] extends string ? Key : `${Key}.${CatalogKey<T[Key]>}`
}[keyof T & string]

/** Optional catalog branches with translated string leaves. */
type PartialCatalog<T> = {
  [Key in keyof T]?: T[Key] extends string ? string : PartialCatalog<T[Key]>
}

/** A custom locale following the nested English catalog, with every key optional. */
export type EditorLocale = PartialCatalog<typeof en>

/** Custom locales or partial built-in overrides, indexed by locale code. */
export type CustomLanguages = Record<string, EditorLocale>

/** Per-instance language selection and additional catalog resources. */
interface TranslatorOptions {
  language?: string
  customLanguages?: CustomLanguages
}

/** Keys shared by the built-in language catalogs. */
export type TranslationKey = CatalogKey<typeof en>

/** A fixed-language translator owned by one editor or standalone helper. */
export type Translate = (key: TranslationKey, params?: Record<string, unknown>) => string

/** Creates a synchronous, isolated translator from bundled and custom catalogs. */
export function createTranslator({ language = 'en', customLanguages = {} }: TranslatorOptions = {}): Translate {
  const instance = createInstance()
  // Bundled resources need no backend, language detection, or asynchronous loading.
  instance.init({
    // i18next reserves cimode for displaying keys; it is not a supported editor locale.
    lng: language.toLowerCase() === 'cimode' ? 'en' : language,
    fallbackLng: 'en',
    load: 'all',
    lowerCaseLng: true,
    initAsync: false,
    interpolation: { escapeValue: false },
    resources: {}
  })

  // addResourceBundle copies each catalog before merging, preserving caller and bundled resources.
  instance.addResourceBundle('en', 'translation', en, true, true)
  instance.addResourceBundle('ru', 'translation', ru, true, true)
  for (const [locale, catalog] of Object.entries(customLanguages)) {
    instance.addResourceBundle(locale.toLowerCase(), 'translation', catalog, true, true)
  }

  return (key, params) => instance.t(key, params)
}

/** English fallback for helpers used outside an editor instance. */
export const english = createTranslator()
