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
 */

// Получение масштаба внутри канваса
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

// Получение отображемых размеров канваса
/**
 * @param {ImageEditor} editorInstance
 */
function getCanvasDisplaySize(editorInstance) {
  return `${editorInstance.canvas?.lowerCanvasEl?.style.width}/${editorInstance.canvas?.lowerCanvasEl?.style.height}`
}

// Получение данных о текущем выделенном объекте
/**
 * @param {ImageEditor} editorInstance
 */
function getCurrentObjectData(editorInstance) {
  const activeObject = editorInstance.canvas.getActiveObject()

  if (!activeObject) return ''

  const { width, height, left, top, type, scaleX, scaleY } = activeObject

  return JSON.stringify({ width, height, left, top, type, scaleX, scaleY }, null, 2)
}

// Импорт изображения в канвас
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

// Сохранение результата
/**
 * @param {ImageEditor} editorInstance
 */
async function saveResult(editorInstance) {
  const result = await editorInstance.imageManager.exportCanvasAsImageFile({ contentType: 'image/png' })
  if (!result) return

  const { image } = result
  if (typeof image === 'string') return

  const url = URL.createObjectURL(image)
  const link = document.createElement('a')
  const fileName = image instanceof File ? image.name : 'image.png'

  link.href = url
  link.download = fileName

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}

// Установка цветового фона
/**
 * @param {ImageEditor} editorInstance
 * @param {string} color
 */
function setColorBackground(editorInstance, color) {
  editorInstance.backgroundManager.setColorBackground({ color })
}

// Установка градиентного фона
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

// Установка фона из изображения
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

// Удаление фона
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
