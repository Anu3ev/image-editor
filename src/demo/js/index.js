import initListeners from './listeners.js'
import initEditor from '../../main.js'

document.addEventListener('DOMContentLoaded', async() => {
  // Инициализация редактора
  const editorInstance = await initEditor('editor', {
    montageAreaWidth: 810,
    montageAreaHeight: 1080,
    editorContainerWidth: '100%',
    editorContainerHeight: 'calc(100vh - 4rem)'
  })

  initListeners(editorInstance)
})
