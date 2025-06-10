import initListeners from './listeners'
import initEditor from '../main'

document.addEventListener('DOMContentLoaded', async() => {
  // Инициализация редактора
  const editorInstance = await initEditor('editor', {
    montageAreaWidth: 512,
    montageAreaHeight: 512,
    editorContainerWidth: '100%',
    editorContainerHeight: '100vh'
  })

  initListeners(editorInstance)
})
