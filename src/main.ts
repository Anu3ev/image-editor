import type { EditorOptions } from './editor/types/options'
import { ImageEditor } from './editor'
import { defaults } from './editor/defaults'

/**
 * Инициализирует редактор, создавая канвас внутри контейнера.
 *
 * @param containerId — ID контейнера, в котором будут созданы оба канваса.
 * @param options — опции и настройки.
 */
export default function initEditor(containerId:string, options:Partial<EditorOptions> = {}): Promise<ImageEditor> {
  const adjustedOptions:EditorOptions = { ...defaults, ...options } as EditorOptions

  // Находим контейнер по ID.
  const container = document.getElementById(containerId)
  if (!container) {
    return Promise.reject(new Error(`Контейнер с ID "${containerId}" не найден.`))
  }

  // Создаём канвас
  const editorCanvas = document.createElement('canvas')
  editorCanvas.id = `${containerId}-canvas`
  container.appendChild(editorCanvas)

  // Сохраняем контейнер в опциях
  adjustedOptions.editorContainer = container

  return new Promise((resolve) => {
    adjustedOptions._onReadyCallback = resolve

    const editorInstance = new ImageEditor(editorCanvas.id, adjustedOptions)
    window[containerId] = editorInstance
  })
}

export type { ImageEditor } from './editor'
export type { EditorOptions } from './editor/types/options'
export type { EditorFontDefinition, EditorFontFaceDescriptors } from './editor/types/font'
export type {
  ImportImageOptions,
  ResizeImageToBoundariesOptions,
  SuccessfulExportResult,
  SuccessulImageImportResult,
  ExportObjectAsImageFileParameters,
  exportCanvasAsImageFileOptions as ExportCanvasAsImageFileOptions
} from './editor/image-manager/types'
export type * from './editor/types/events'
export type { ToolbarConfig } from './editor/ui/toolbar-manager'
