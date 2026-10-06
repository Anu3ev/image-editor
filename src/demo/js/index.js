import initListeners from './listeners.js'
import {
  getRequestedEditorVersion,
  loadEditorModule
} from './editor-module-loader.js'

/**
 * Returns options that e2e tests can pass to the demo before editor initialization.
 *
 * @returns {Record<string, unknown>}
 */
function getDemoInitOptions() {
  /** @type {Window & { __EDITOR_DEMO_INIT_OPTIONS?: Record<string, unknown> }} */
  const demoWindow = window

  return demoWindow.__EDITOR_DEMO_INIT_OPTIONS ?? {}
}

document.addEventListener('DOMContentLoaded', async() => {
  try {
    const { default: initEditor } = await loadEditorModule()
    const editorVersion = getRequestedEditorVersion() || 'local'
    const demoInitOptions = getDemoInitOptions()

    console.info('[image-editor demo] editor version:', editorVersion)

    // Initialize the editor
    const editorInstance = await initEditor('editor', {
      montageAreaWidth: 512,
      montageAreaHeight: 512,
      editorContainerWidth: '100%',
      editorContainerHeight: 'calc(100vh - 4rem)',
      ...demoInitOptions
    })

    initListeners(editorInstance)
  } catch (error) {
    console.error('[image-editor demo] Initialization failed:', error)
    const status = document.createElement('p')
    status.setAttribute('role', 'alert')
    status.textContent = 'Не удалось загрузить редактор. Перезагрузите страницу, чтобы повторить попытку.'
    document.getElementById('editor')?.appendChild(status)
  }
})
