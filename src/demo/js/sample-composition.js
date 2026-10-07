/** Vector illustration for trying image, text, shape, and history operations without uploading a file. */
const SAMPLE_IMAGE = `
  <svg xmlns="http://www.w3.org/2000/svg" width="400" height="220" viewBox="0 0 400 220">
    <rect width="400" height="220" rx="20" fill="#e8dfd0"/>
    <circle cx="294" cy="70" r="38" fill="#d86c3d"/>
    <path d="M0 180L110 70L260 220H0Z" fill="#7d968b"/>
    <path d="M110 220L275 110L400 190V220Z" fill="#2d5148"/>
  </svg>
`

/**
 * Adds a sample through the public API as one history entry on the demo's 512px artboard.
 * @param {import('../../editor').ImageEditor} editor
 */
export default async function addSampleComposition(editor) {
  const { backgroundManager, canvas, historyManager, textManager } = editor
  historyManager.suspendHistory()

  try {
    backgroundManager.setColorBackground({ color: '#f7f3eb' })
    const source = new File([SAMPLE_IMAGE], 'sample.svg', { type: 'image/svg+xml' })
    const imported = await editor.imageManager.importImage({ source, scale: 'image-contain' })
    if (!imported) throw new Error('The sample illustration could not be loaded.')

    imported.image.set({ left: 256, top: 250, originX: 'center', originY: 'center', scaleX: 1, scaleY: 1 })
    imported.image.setCoords()

    const heading = textManager.addText({
      text: 'A little adventure',
      fontFamily: 'Arial',
      fontSize: 36,
      bold: true,
      color: '#203d35',
      left: 256,
      top: 76,
      originX: 'center',
      originY: 'center'
    })
    const badge = await editor.shapeManager.add({
      presetKey: 'square',
      options: {
        text: 'MAKE IT YOURS',
        width: 240,
        height: 56,
        fill: '#203d35',
        textStyle: { fontFamily: 'Arial', fontSize: 20, color: '#ffffff', bold: true },
        left: 256,
        top: 424,
        originX: 'center',
        originY: 'center'
      }
    })
    if (!badge) throw new Error('The sample label could not be created.')

    canvas.setActiveObject(heading)
    canvas.requestRenderAll()
  } finally {
    historyManager.resumeHistory()
  }

  historyManager.saveState()
  editor.zoomManager.calculateAndApplyDefaultZoom(0.85)
}
