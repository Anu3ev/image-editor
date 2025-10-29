import initListeners from './listeners.js'
import initEditor from '../../main.js'

document.addEventListener('DOMContentLoaded', async() => {
  // Инициализация редактора
  const editorInstance = await initEditor('editor', {
    montageAreaWidth: 512,
    montageAreaHeight: 512,
    editorContainerWidth: '100%',
    editorContainerHeight: 'calc(100vh - 4rem)',
    fonts: [
      {
        family: 'Montserrat',
        source: 'https://fonts.gstatic.com/s/montserrat/v26/JTUSjIg1_i6t8kCHKm45xW5rygbi.woff2',
        descriptors: {
          style: 'normal',
          weight: '400',
          display: 'swap'
        }
      },
      {
        family: 'Playfair Display',
        source: 'https://fonts.gstatic.com/s/playfairdisplay/v30/nuFvD-vYSZviVYUb_rj3ij__anPXDTzPqg.woff2',
        descriptors: {
          style: 'normal',
          weight: '400',
          display: 'swap'
        }
      },
      {
        family: 'Courier New',
        source: 'local("Courier New")',
        descriptors: {
          style: 'normal',
          weight: '400'
        }
      }
    ]
  })

  initListeners(editorInstance)
})
