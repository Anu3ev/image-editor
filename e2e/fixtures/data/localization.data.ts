import type { LocalizationExample } from '../../types'

export const LOCALIZATION_EXAMPLES: readonly LocalizationExample[] = [
  {
    language: 'en',
    newText: 'New text',
    duplicate: 'Duplicate',
    missingContainer: 'Container with ID "missing-localized-editor" was not found.',
    unknownWorkerAction: 'Unknown action localization-test-action'
  },
  {
    language: 'ru',
    newText: 'Новый текст',
    duplicate: 'Создать копию',
    missingContainer: 'Контейнер с ID «missing-localized-editor» не найден.',
    unknownWorkerAction: 'Неизвестное действие localization-test-action'
  }
]

export const CUSTOM_LOCALIZATION_CONTENT = {
  toolbarLabel: 'My own copy label / Моя копия',
  toolbarHtml: '<strong>Custom action / Моё действие</strong>',
  toolbarHtmlText: 'Custom action / Моё действие',
  text: 'Keep this text / Сохранить этот текст',
  persistedText: 'Мой русский текст: привет, мир!',
  emptyText: ''
}

export const LOCALIZATION_MISSING_CONTAINER = 'missing-localized-editor'
export const LOCALIZATION_WORKER_ACTION = 'localization-test-action'
