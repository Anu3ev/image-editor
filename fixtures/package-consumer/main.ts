import initEditor from '@anu3ev/fabric-image-editor'

async function runScenario() {
  const editor = await initEditor('editor', { montageAreaWidth: 128, montageAreaHeight: 128, fonts: [] })
  try {
    const source = await fetch(new URL('./sample.png', import.meta.url)).then(response => response.blob())
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
    const imported = await editor.imageManager.importImage({ source: new File([resized], 'sample.png', { type: 'image/png' }) })
    if (!imported) throw new Error('Import returned null')
    const result = await editor.imageManager.exportCanvasAsImageFile({ exportAsBlob: true })
    if (!result || !(result.image instanceof Blob) || result.image.size === 0) throw new Error('Empty export')
    const bitmap = await createImageBitmap(result.image)
    const dimensions = { width: bitmap.width, height: bitmap.height }
    bitmap.close()
    if (dimensions.width !== 128 || dimensions.height !== 128) throw new Error('Wrong export dimensions')
    const pending = editor.workerManager.post('resizeImage', {
      dataURL, sizeType: 'max', contentType: 'image/png', maxWidth: 16, maxHeight: 8,
      minWidth: 1, minHeight: 1, quality: 1
    })
    editor.destroy()
    await pending.then(() => { throw new Error('Disposed worker unexpectedly resolved') }, () => {})
    editor.destroy()
    const remounted = await initEditor('editor', { fonts: [] })
    remounted.destroy()
    if (document.querySelectorAll('#editor canvas').length !== 0) throw new Error('Canvas leaked after destroy')
    return { ...dimensions, bytes: result.image.size }
  } finally {
    editor.destroy()
  }
}
Object.assign(window, { runScenario })
