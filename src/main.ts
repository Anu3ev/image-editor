import { CanvasOptions } from 'fabric'
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
  // Владение canvas и ключом регистрации не зависит от последующих изменений host/window.
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
