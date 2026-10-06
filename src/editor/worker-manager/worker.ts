/* eslint-disable no-restricted-globals */

self.onmessage = async(e: MessageEvent): Promise<void> => {
  const { action, payload, requestId } = e.data
  let bitmapToClose: ImageBitmap | undefined

  try {
    switch (action) {
    case 'resizeImage': {
      const {
        dataURL,
        maxWidth,
        maxHeight,
        minWidth,
        minHeight,
        contentType,
        quality,
        sizeType
      } = payload
      const imgBitmap = await createImageBitmap(await (await fetch(dataURL)).blob())
      bitmapToClose = imgBitmap

      // calculate the new dimensions
      let { width, height } = imgBitmap
      let ratio = Math.min(maxWidth / width, maxHeight / height)

      if (sizeType === 'min') {
        ratio = Math.max(minWidth / width, minHeight / height)
      }

      width = Math.floor(width * ratio)
      height = Math.floor(height * ratio)

      // draw the image on the offscreen canvas
      const offscreen = new OffscreenCanvas(width, height)
      const ctx = offscreen.getContext('2d')

      if (!ctx) {
        throw new Error('Failed to get 2D context from OffscreenCanvas')
      }

      ctx.drawImage(imgBitmap, 0, 0, width, height)

      // convert to a blob
      const resizedBlob = await offscreen.convertToBlob({ type: contentType, quality })

      self.postMessage({ requestId, action, success: true, data: resizedBlob })
      break
    }

    case 'toDataURL': {
      const {
        bitmap,
        contentType,
        quality,
        returnBlob
      } = payload
      bitmapToClose = bitmap
      const { width, height } = bitmap

      // draw the image on the offscreen canvas
      const off = new OffscreenCanvas(bitmap.width, bitmap.height)
      const ctx = off.getContext('2d')

      if (!ctx) {
        throw new Error('Failed to get 2D context from OffscreenCanvas')
      }

      ctx.drawImage(bitmap, 0, 0, width, height)

      // convert to a blob, then to a dataURL
      const blob = await off.convertToBlob({ type: contentType, quality })

      if (returnBlob) {
        self.postMessage({ requestId, action, success: true, data: blob })
        break
      }

      const dataURL = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            resolve(reader.result)
          } else {
            reject(new Error('Failed to read image as a data URL'))
          }
        }
        reader.onerror = () => reject(reader.error || new Error('Failed to read image Blob'))
        reader.onabort = () => reject(new Error('Image Blob reading was aborted'))
        reader.readAsDataURL(blob)
      })

      self.postMessage({ requestId, action, success: true, data: dataURL })
      break
    }

    default:
      throw new Error(`Unknown action ${action}`)
    }
  } catch (err) {
    self.postMessage({ requestId, action, success: false, error: (err as Error).message })
  } finally {
    bitmapToClose?.close()
  }
}
