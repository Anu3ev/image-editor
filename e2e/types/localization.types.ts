import type { EditorOptions } from '../../src/main'

/** Public initialization options for an independently localized editor. */
export interface LocalizedEditorOptions {
  containerId: string
  language?: string
  customLanguages?: EditorOptions['customLanguages']
  toolbar?: EditorOptions['toolbar']
  initialState?: EditorOptions['initialState']
}

/** Expected user-visible copy for one supported language. */
export interface LocalizationExample {
  language: string
  newText: string
  duplicate: string
}
