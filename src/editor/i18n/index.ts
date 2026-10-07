import { createInstance } from 'i18next'
import en from './en'
import ru from './ru'

/** Keys shared by the built-in language catalogs. */
export type TranslationKey = keyof typeof en

/** A fixed-language translator owned by one editor or standalone helper. */
export type Translate = (key: TranslationKey, params?: Record<string, unknown>) => string

/** Creates a synchronous, isolated translator from the bundled catalogs. */
export function createTranslator(language = 'en'): Translate {
  const instance = createInstance()
  // Bundled resources need no backend, language detection, or asynchronous loading.
  instance.init({
    // i18next reserves cimode for displaying keys; it is not a supported editor locale.
    lng: language.toLowerCase() === 'cimode' ? 'en' : language,
    fallbackLng: 'en',
    supportedLngs: ['en', 'ru'],
    load: 'languageOnly',
    lowerCaseLng: true,
    initAsync: false,
    keySeparator: false,
    interpolation: { escapeValue: false },
    resources: {
      en: { translation: en },
      ru: { translation: ru }
    }
  })

  return (key, params) => instance.t(key, params)
}

/** English fallback for helpers used outside an editor instance. */
export const english = createTranslator()
