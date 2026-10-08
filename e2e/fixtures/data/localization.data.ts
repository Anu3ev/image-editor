import type { LocalizationExample } from '../../types'
import type { CustomLanguages } from '../../../src/main'

export const LOCALIZATION_EXAMPLES: readonly LocalizationExample[] = [
  {
    language: 'en',
    newText: 'New text',
    duplicate: 'Duplicate'
  },
  {
    language: 'ru',
    newText: 'Новый текст',
    duplicate: 'Создать копию'
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

/** Technical errors stay English for every built-in or custom UI language. */
export const LOCALIZATION_ERROR_EXPECTATIONS = {
  missingContainer: 'Container with ID "missing-localized-editor" was not found.',
  unknownWorkerAction: 'Unknown action localization-test-action'
}

export const CUSTOM_LANGUAGE_RESOURCES = {
  pt: {
    ui: { toolbar: { delete: 'Excluir' } }
  },
  'PT-br': {
    ui: { toolbar: { duplicate: 'Duplicar "item" & <strong>guardar</strong>' } },
    text: { defaults: { newText: 'Novo texto' } }
  }
} satisfies CustomLanguages

export const CUSTOM_LANGUAGE_EXPECTATIONS = {
  newText: 'Novo texto',
  duplicate: 'Duplicar "item" & <strong>guardar</strong>',
  delete: 'Excluir',
  lockFallback: 'Lock'
}

export const RUSSIAN_OVERRIDE_RESOURCES = {
  ru: { ui: { toolbar: { delete: 'Моя кнопка удаления' } } }
} satisfies CustomLanguages

export const RUSSIAN_TOOLBAR_EXPECTATIONS = {
  delete: 'Удалить',
  overriddenDelete: 'Моя кнопка удаления',
  duplicate: 'Создать копию'
}

/** Small raster dimensions that exercise the real resize worker without large allocations. */
export const LOCALIZATION_RESIZE_IMAGE = {
  sourceWidth: 240,
  sourceHeight: 120,
  maxWidth: 80,
  maxHeight: 60
}

export const LOCALIZATION_RESIZED_DIMENSIONS = { width: 80, height: 40 }

/** Stable English diagnostics retained for integrations regardless of the selected language. */
export const LOCALIZATION_NOTIFICATION_DIAGNOSTICS = {
  noSelection: {
    code: 'NO_OBJECT_SELECTED',
    origin: 'ImageManager',
    method: 'exportObjectAsImageFile',
    message: 'No object selected for export'
  },
  invalidCrop: {
    code: 'CROP_INVALID_IMAGE_TARGET',
    origin: 'CropManager',
    method: 'startImageCrop',
    message: 'Select a raster image object to crop an image.'
  },
  resizeMax: {
    code: 'IMAGE_RESIZE_WARNING',
    origin: 'ImageManager',
    method: 'resizeImageToBoundaries',
    message: 'The image exceeds the maximum canvas size and will be reduced to fit '
      + '80×60 while preserving its aspect ratio.'
  }
}

/** User-facing translations expected alongside the unchanged diagnostics. */
export const LOCALIZATION_NOTIFICATION_MESSAGES = {
  en: {
    noSelection: 'Select an object to export.',
    invalidCrop: 'Select a raster image to crop.'
  },
  ru: {
    noSelection: 'Выберите объект для экспорта.',
    invalidCrop: 'Выберите растровое изображение для обрезки.',
    resizeMax: 'Изображение будет уменьшено до 80×60 с сохранением пропорций.'
  },
  customNoSelection: 'Selecione um objeto para exportar.'
}

/** A partial regional catalog intentionally leaves crop notifications to English fallback. */
export const CUSTOM_NOTIFICATION_RESOURCES = {
  'pt-BR': {
    notifications: { image: { noSelection: 'Selecione um objeto para exportar.' } }
  }
} satisfies CustomLanguages
