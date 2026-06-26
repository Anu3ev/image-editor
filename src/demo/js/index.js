import initListeners from './listeners.js'
import {
  getRequestedEditorVersion,
  loadEditorModule
} from './editor-module-loader.js'

/**
 * Возвращает options, которые e2e может передать demo перед инициализацией редактора.
 *
 * @returns {Record<string, unknown>}
 */
function getDemoInitOptions() {
  /** @type {Window & { __EDITOR_DEMO_INIT_OPTIONS?: Record<string, unknown> }} */
  const demoWindow = window

  return demoWindow.__EDITOR_DEMO_INIT_OPTIONS ?? {}
}

document.addEventListener('DOMContentLoaded', async() => {
  const { default: initEditor } = await loadEditorModule()
  const editorVersion = getRequestedEditorVersion() || 'local'
  const demoInitOptions = getDemoInitOptions()

  console.info('[image-editor demo] editor version:', editorVersion)

  // Инициализация редактора
  const editorInstance = await initEditor('editor', {
    montageAreaWidth: 512,
    montageAreaHeight: 512,
    editorContainerWidth: '100%',
    editorContainerHeight: 'calc(100vh - 4rem)',
    ...demoInitOptions
  })

  initListeners(editorInstance)
})
