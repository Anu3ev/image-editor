// Получение масштаба внутри канваса
function getCanvasResolution(editorInstance) {
  return `${editorInstance.canvas.getWidth()}x${editorInstance.canvas.getHeight()}`
}

function getMontageAreaResolution(editorInstance) {
  return `${editorInstance.montageArea.width}x${editorInstance.montageArea.height}`
}

// Получение отображемых размеров канваса
function getCanvasDisplaySize(editorInstance) {
  return `${editorInstance.canvas?.lowerCanvasEl?.style.width}/${editorInstance.canvas?.lowerCanvasEl?.style.height}`
}

// Получение данных о текущем выделенном объекте
function getCurrentObjectData(editorInstance) {
  const activeObject = editorInstance.canvas.getActiveObject()

  if (!activeObject) return ''

  const { width, height, left, top, type, scaleX, scaleY } = activeObject

  return JSON.stringify({ width, height, left, top, type, scaleX, scaleY }, null, 2)
}

// Импорт изображения в канвас
function importImage(e, editorInstance) {
  const { files } = e.target

  for (let i = 0; i < files.length; i++) {
    (function(file) {
      editorInstance.importImage({ source: file, contentType: file.type })
    }(files[i]))
  }
}

// Сохранение результата
async function saveResult(editorInstance) {
  const { image } = await editorInstance.exportCanvasAsImageFile({ contentType: 'image/svg+xml' })

  const url = URL.createObjectURL(image)
  const link = document.createElement('a')

  link.href = url
  link.download = image.name

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}

export {
  getCanvasResolution,
  getMontageAreaResolution,
  getCanvasDisplaySize,
  getCurrentObjectData,
  importImage,
  saveResult
}
