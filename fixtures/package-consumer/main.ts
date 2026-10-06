import initEditor, * as editorModule from '@anu3ev/fabric-image-editor'

/** Exercise the installed public API without depending on teardown or remount changes. */
async function runScenario() {
  if ('ImageEditor' in editorModule) throw new Error('ImageEditor must remain a type-only export')
  const editor = await initEditor('editor', { montageAreaWidth: 128, montageAreaHeight: 128, fonts: [] })
  const source = await fetch(new URL('./sample.png', import.meta.url)).then((response) => response.blob())
  const dataURL = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(source)
  })
  const resized = await editor.imageManager.resizeImageToBoundaries({
    dataURL, maxWidth: 32, maxHeight: 16, emitMessage: false
  })
  const resizedBitmap = await createImageBitmap(resized)
  if (resizedBitmap.width !== 32 || resizedBitmap.height !== 16) throw new Error('Wrong worker resize dimensions')
  resizedBitmap.close()
  const imported = await editor.imageManager.importImage({
    source: new File([resized], 'sample.png', { type: 'image/png' }), scale: 'image-contain'
  })
  if (!imported || !editor.canvas.getObjects().includes(imported.image)) throw new Error('Image was not imported')
  const exports = []
  for (const contentType of ['image/png', 'image/jpeg']) {
    const result = await editor.imageManager.exportCanvasAsImageFile({ contentType, fileName: 'consumer' })
    if (!result || !(result.image instanceof File) || result.image.size === 0) throw new Error('Empty file export')
    if (result.image.type !== contentType) throw new Error('Wrong export MIME type')
    const bitmap = await createImageBitmap(result.image)
    const dimensions = { width: bitmap.width, height: bitmap.height }
    bitmap.close()
    if (dimensions.width !== 128 || dimensions.height !== 128) throw new Error('Wrong export dimensions')
    exports.push({ ...dimensions, contentType, bytes: result.image.size })
  }
  return exports
}
Object.assign(window, { runScenario })
