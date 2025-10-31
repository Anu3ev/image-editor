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
        source: 'https://fonts.gstatic.com/s/montserrat/v31/JTUHjIg1_i6t8kCHKm4532VJOt5-QNFgpCtr6Hw0aXpsog.woff2',
        descriptors: {
          style: 'normal',
          weight: '400',
          display: 'swap'
        }
      },
      {
        family: 'Playfair Display',
        source: 'https://fonts.gstatic.com/s/playfairdisplay/v40/nuFiD-vYSZviVYUb_rj3ij__anPXDTjYgFE_.woff2',
        descriptors: {
          style: 'normal',
          weight: '400',
          display: 'swap'
        }
      },
      {
        family: 'Playfair Display',
        source: 'https://fonts.gstatic.com/s/playfairdisplay/v40/nuFiD-vYSZviVYUb_rj3ij__anPXDTzYgA.woff2',
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
