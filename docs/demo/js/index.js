import initListeners from './listeners'
import initEditor from '../../../src/main'

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
