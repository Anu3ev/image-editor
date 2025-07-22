/* eslint-disable no-restricted-globals */

self.onmessage = async(e: MessageEvent): Promise<void> => {
  const { action, payload, requestId } = e.data

  try {
    switch (action) {
    case 'resizeImage': {
      const { dataURL, maxWidth, maxHeight, minWidth, minHeight, sizeType } = payload
      const imgBitmap = await createImageBitmap(await (await fetch(dataURL)).blob())

      // вычисляем новый размер
      let { width, height } = imgBitmap
      let ratio = Math.min(maxWidth / width, maxHeight / height)

      if (sizeType === 'min') {
        ratio = Math.max(minWidth / width, minHeight / height)
      }

      width = Math.floor(width * ratio)
      height = Math.floor(height * ratio)

      // рисуем изображение в offscreen
      const offscreen = new OffscreenCanvas(width, height)
      const ctx = offscreen.getContext('2d')

      if (!ctx) {
        throw new Error('Failed to get 2D context from OffscreenCanvas')
      }

      ctx.drawImage(imgBitmap, 0, 0, width, height)

      // конвертим в blob
      const resizedBlob = await offscreen.convertToBlob()

      self.postMessage({ requestId, action, success: true, data: resizedBlob })
      break
    }

    case 'toDataURL': {
      const { bitmap, format, quality, returnBlob } = payload
      const { width, height } = bitmap

      // рисуем изображение в offscreen
      const off = new OffscreenCanvas(bitmap.width, bitmap.height)
      const ctx = off.getContext('2d')

      if (!ctx) {
        throw new Error('Failed to get 2D context from OffscreenCanvas')
      }

      ctx.drawImage(bitmap, 0, 0, width, height)

      // конвертируем в blob, а затем в dataURL
      const blob = await off.convertToBlob({ type: format, quality })

      if (returnBlob) {
        self.postMessage({ requestId, action, success: true, data: blob })
        break
      }

      const dataURL = await new Promise((res) => {
        const r = new FileReader()
        r.onload = () => res(r.result)
        r.readAsDataURL(blob)
      })

      self.postMessage({ requestId, action, success: true, data: dataURL })
      break
    }

    default:
      throw new Error(`Unknown action ${action}`)
    }
  } catch (err) {
    self.postMessage({ requestId, action, success: false, error: (err as Error).message })
  }
}
