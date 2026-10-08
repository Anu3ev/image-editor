import type { EditorOptions, ErrorItem } from '../../src/main'

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

/** Public notification events and buffered copies observed during one operation. */
export interface LocalizedNotificationSnapshot {
  events: ErrorItem[]
  buffer: (ErrorItem & { type: 'editor:error' | 'editor:warning' })[]
}

/** Result of an operation rejected through the public manager API. */
export interface LocalizedFailureSnapshot extends LocalizedNotificationSnapshot {
  failed: boolean
}

/** Source dimensions and resize bounds for a real browser-worker operation. */
export interface LocalizedResizeOptions {
  containerId: string
  sourceWidth: number
  sourceHeight: number
  maxWidth: number
  maxHeight: number
}

/** Actual resized bitmap dimensions, alongside the warning delivered to integrations. */
export interface LocalizedResizeSnapshot extends LocalizedNotificationSnapshot {
  width: number
  height: number
}
