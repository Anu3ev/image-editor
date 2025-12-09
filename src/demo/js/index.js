import initListeners from './listeners.js'
import initEditor from '../../main.js'

document.addEventListener('DOMContentLoaded', async() => {
  // Инициализация редактора
  const editorInstance = await initEditor('editor', {
    montageAreaWidth: 512,
    montageAreaHeight: 512,
    editorContainerWidth: '100%',
    editorContainerHeight: 'calc(100vh - 4rem)'
  })

  initListeners(editorInstance)
})
