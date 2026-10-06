/**
 * @typedef {import('../../editor').ImageEditor} ImageEditor
 * @typedef {import('../../editor/background-manager').GradientBackground} GradientBackground
 * @typedef {{
 *   centerX?: number,
 *   centerY?: number,
 *   radius?: number,
 *   angle?: string | number,
 *   colorStops?: Array<{ color: string, offset: number }>
 * }} DemoGradientOptions
 * @typedef {{ contentType: string, fileName: string }} DemoExportOptions
 */

/** Maps the Demo selector value to a standard MIME type and download filename. */
/** @type {Record<string, DemoExportOptions>} */
const EXPORT_OPTIONS_BY_FORMAT = {
  jpg: {
    contentType: 'image/jpeg',
    fileName: 'image.jpg'
  },
  jpeg: {
    contentType: 'image/jpeg',
    fileName: 'image.jpeg'
  },
  png: {
    contentType: 'image/png',
    fileName: 'image.png'
  },
  webp: {
    contentType: 'image/webp',
    fileName: 'image.webp'
  },
  pdf: {
    contentType: 'application/pdf',
    fileName: 'image.pdf'
  }
}

// Get the zoom inside the canvas
/**
 * @param {ImageEditor} editorInstance
 */
function getCanvasResolution(editorInstance) {
  return `${editorInstance.canvas.getWidth()}x${editorInstance.canvas.getHeight()}`
}

/**
 * @param {ImageEditor} editorInstance
 */
function getMontageAreaResolution(editorInstance) {
  if (!editorInstance.montageArea) return ''

  return `${editorInstance.montageArea.width}x${editorInstance.montageArea.height}`
}

// Get the displayed canvas dimensions
/**
 * @param {ImageEditor} editorInstance
 */
function getCanvasDisplaySize(editorInstance) {
  return `${editorInstance.canvas?.lowerCanvasEl?.style.width}/${editorInstance.canvas?.lowerCanvasEl?.style.height}`
}

// Get data for the currently selected object
/**
 * @param {ImageEditor} editorInstance
 */
function getCurrentObjectData(editorInstance) {
  const activeObject = editorInstance.canvas.getActiveObject()

  if (!activeObject) return ''

  const { width, height, left, top, type, scaleX, scaleY } = activeObject

  return JSON.stringify({ width, height, left, top, type, scaleX, scaleY }, null, 2)
}

// Import an image onto the canvas
/**
 * @param {Event} e
 * @param {ImageEditor} editorInstance
 */
function importImage(e, editorInstance) {
  if (!(e.target instanceof HTMLInputElement)) return

  const { files } = e.target
  if (!files) return

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index]
    if (!file) continue

    editorInstance.imageManager.importImage({ source: file })
  }
}

/**
 * Exports the artboard in the selected format and starts a browser download.
 * @param {ImageEditor} editorInstance
 * @param {string} [format]
 */
async function saveResult(editorInstance, format = 'png') {
  const exportOptions = EXPORT_OPTIONS_BY_FORMAT[format] ?? EXPORT_OPTIONS_BY_FORMAT.png
  const result = await editorInstance.imageManager.exportCanvasAsImageFile(exportOptions)
  if (!result) return

  const { fileName, image } = result
  if (typeof image === 'string') return

  const url = URL.createObjectURL(image)
  const link = document.createElement('a')

  link.href = url
  link.download = fileName

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}

// Set a color background
/**
 * @param {ImageEditor} editorInstance
 * @param {string} color
 */
function setColorBackground(editorInstance, color) {
  editorInstance.backgroundManager.setColorBackground({ color })
}

// Set a gradient background
/**
 * @param {ImageEditor} editorInstance
 * @param {string} startColor
 * @param {string} endColor
 * @param {'linear' | 'radial'} gradientType
 * @param {DemoGradientOptions} [options]
 */
function setGradientBackground(editorInstance, startColor, endColor, gradientType, options = {}) {
  /** @type {GradientBackground} */
  let gradient

  if (gradientType === 'radial') {
    gradient = {
      type: 'radial',
      centerX: options.centerX ?? 50,
      centerY: options.centerY ?? 50,
      radius: options.radius || 1,
      startColor,
      endColor,
      startPosition: 0,
      endPosition: 100,
      colorStops: options.colorStops
    }
  } else {
    gradient = {
      type: 'linear',
      angle: Number.parseInt(String(options.angle ?? 0)),
      startColor,
      endColor,
      startPosition: 0,
      endPosition: 100,
      colorStops: options.colorStops
    }
  }

  editorInstance.backgroundManager.setGradientBackground({
    gradient,
    customData: { testProp: true, anotherProp: 'value', type: 'gradient' }
  })
}

// Set an image background
/**
 * @param {ImageEditor} editorInstance
 * @param {string | File} file
 */
async function setImageBackground(editorInstance, file) {
  await editorInstance.backgroundManager.setImageBackground({
    imageSource: file,
    customData: { testProp: true, anotherProp: 'value', type: 'image', src: { file1: 'test', file2: 'test2' } }
  })
}

// Remove the background
/**
 * @param {ImageEditor} editorInstance
 */
function removeBackground(editorInstance) {
  editorInstance.backgroundManager.removeBackground()
}

export {
  getCanvasResolution,
  getMontageAreaResolution,
  getCanvasDisplaySize,
  getCurrentObjectData,
  importImage,
  saveResult,
  setColorBackground,
  setGradientBackground,
  setImageBackground,
  removeBackground
}
