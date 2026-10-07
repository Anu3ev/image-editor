import type { LocalizationExample } from '../../types'
import type { CustomLanguages } from '../../../src/main'

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

export const CUSTOM_LANGUAGE_RESOURCES = {
  pt: {
    ui: { toolbar: { delete: 'Excluir' } }
  },
  'PT-br': {
    ui: { toolbar: { duplicate: 'Duplicar "item" & <strong>guardar</strong>' } },
    text: { defaults: { newText: 'Novo texto' } },
    editor: { errors: { containerNotFound: 'Contêiner "{{containerId}}" não encontrado.' } }
  }
} satisfies CustomLanguages

export const CUSTOM_LANGUAGE_EXPECTATIONS = {
  newText: 'Novo texto',
  duplicate: 'Duplicar "item" & <strong>guardar</strong>',
  delete: 'Excluir',
  lockFallback: 'Lock',
  missingContainer: 'Contêiner "missing-localized-editor" não encontrado.'
}

export const RUSSIAN_OVERRIDE_RESOURCES = {
  ru: { ui: { toolbar: { delete: 'Моя кнопка удаления' } } }
} satisfies CustomLanguages

export const RUSSIAN_TOOLBAR_EXPECTATIONS = {
  delete: 'Удалить',
  overriddenDelete: 'Моя кнопка удаления',
  duplicate: 'Создать копию'
}
