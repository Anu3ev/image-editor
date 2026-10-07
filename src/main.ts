import type { EditorOptions } from './editor/types/options'
import { ImageEditor } from './editor'
import { defaults } from './editor/defaults'
import { createTranslator } from './editor/i18n'

/**
 * Initializes the editor by creating a canvas inside the container.
 *
 * @param containerId — ID of the container in which both canvases will be created.
 * @param options — Options and settings.
 */
export default async function initEditor(
  containerId: string,
  options: Partial<EditorOptions> = {}
): Promise<ImageEditor> {
  const adjustedOptions:EditorOptions = { ...defaults, ...options } as EditorOptions

  // Find the container by ID.
  const container = document.getElementById(containerId)
  if (!container) {
    const t = createTranslator(options.language)
    return Promise.reject(new Error(t('editor.errors.containerNotFound', { containerId })))
  }

  const canvasId = `${containerId}-canvas`
  if (document.getElementById(canvasId)) {
    const t = createTranslator(options.language)
    throw new Error(t('editor.errors.canvasAlreadyExists', { canvasId }))
  }

  // Create the canvas
  const editorCanvas = document.createElement('canvas')
  editorCanvas.id = canvasId
  container.appendChild(editorCanvas)

  // Store the container in the options
  adjustedOptions.editorContainer = container

  let editorInstance: ImageEditor | undefined
  // Ownership of the canvas and registration key does not depend on subsequent host/window changes.
  const cleanupHostResources = (): void => {
    editorCanvas.remove()
    if (editorInstance && window[containerId] === editorInstance) {
      delete window[containerId]
    }
  }

  try {
    editorInstance = new ImageEditor(editorCanvas.id, adjustedOptions, cleanupHostResources)
    window[containerId] = editorInstance
    await editorInstance.ready
    return editorInstance
  } catch (error) {
    editorInstance?.destroy()
    cleanupHostResources()
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
export type { ToolbarConfig } from './editor/ui/toolbar-manager'
