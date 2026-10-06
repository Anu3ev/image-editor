import type { EditorOptions as CanvasOptions } from './editor/types/options'
import { ImageEditor } from './editor'
import { defaults } from './editor/defaults'

/**
 * Инициализирует редактор, создавая канвас внутри контейнера.
 *
 * @param containerId — ID контейнера, в котором будут созданы оба канваса.
 * @param options — опции и настройки.
 */
export default async function initEditor(
  containerId: string,
  options: Partial<CanvasOptions> = {}
): Promise<ImageEditor> {
  const adjustedOptions:CanvasOptions = { ...defaults, ...options } as CanvasOptions

  // Находим контейнер по ID.
  const container = document.getElementById(containerId)
  if (!container) {
    return Promise.reject(new Error(`Контейнер с ID "${containerId}" не найден.`))
  }

  const canvasId = `${containerId}-canvas`
  if (document.getElementById(canvasId)) {
    throw new Error(`Canvas "${canvasId}" already exists. Destroy the previous editor before initializing again.`)
  }

  // Создаём канвас
  const editorCanvas = document.createElement('canvas')
  editorCanvas.id = canvasId
  container.appendChild(editorCanvas)

  // Сохраняем контейнер в опциях
  adjustedOptions.editorContainer = container

  let editorInstance: ImageEditor | undefined
  try {
    editorInstance = new ImageEditor(editorCanvas.id, adjustedOptions)
    window[containerId] = editorInstance
    await editorInstance.ready
    return editorInstance
  } catch (error) {
    editorInstance?.destroy()
    editorCanvas.remove()
    if (editorInstance && window[containerId] === editorInstance) {
      delete window[containerId]
    }
    throw error
  }
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
