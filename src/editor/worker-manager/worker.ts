import { WorkerOperationError } from './errors'
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
        throw new WorkerOperationError('worker.errors.offscreenContextUnavailable')
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
        throw new WorkerOperationError('worker.errors.offscreenContextUnavailable')
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
            reject(new WorkerOperationError('worker.errors.imageDataUrlReadFailed'))
          }
        }
        reader.onerror = () => reject(reader.error || new WorkerOperationError('worker.errors.imageBlobReadFailed'))
        reader.onabort = () => reject(new WorkerOperationError('worker.errors.imageBlobReadAborted'))
        reader.readAsDataURL(blob)
      })

      self.postMessage({ requestId, action, success: true, data: dataURL })
      break
    }

    default:
      throw new WorkerOperationError('worker.errors.unknownAction', { action })
    }
  } catch (err) {
    if (err instanceof WorkerOperationError) {
      self.postMessage({
        requestId,
        action,
        success: false,
        error: err.message,
        errorKey: err.key,
        errorParams: err.params
      })
    } else {
      self.postMessage({
        requestId,
        action,
        success: false,
        error: err instanceof Error ? err.message : String(err),
        cause: err instanceof Error ? err : undefined
      })
    }
  } finally {
    bitmapToClose?.close()
  }
}
