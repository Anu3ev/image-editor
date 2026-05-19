import initListeners from './listeners.js'
import {
  getRequestedEditorVersion,
  loadEditorModule
} from './editor-module-loader.js'

document.addEventListener('DOMContentLoaded', async() => {
  const { default: initEditor } = await loadEditorModule()
  const editorVersion = getRequestedEditorVersion() || 'local'

  console.info('[image-editor demo] editor version:', editorVersion)

  // Инициализация редактора
  const editorInstance = await initEditor('editor', {
    montageAreaWidth: 512,
    montageAreaHeight: 512,
    editorContainerWidth: '100%',
    editorContainerHeight: 'calc(100vh - 4rem)'
  })

  initListeners(editorInstance)
})
