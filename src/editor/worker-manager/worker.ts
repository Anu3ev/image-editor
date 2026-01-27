/* eslint-disable no-restricted-globals */

import initOxipng, { optimise as oxipngOptimise } from '@jsquash/oxipng/codec/pkg/squoosh_oxipng'
import oxipngWasmUrl from '@jsquash/oxipng/codec/pkg/squoosh_oxipng_bg.wasm?url'

let oxipngInitPromise: ReturnType<typeof initOxipng> | null = null

type ShouldOptimizePngParams = {
  contentType?: string
  optimizePng?: boolean
}

type OptimizePngBlobParams = {
  blob: Blob
  level?: number
}

/**
 * Инициализирует oxipng wasm и кэширует промис инициализации.
 */
const ensureOxipngReady = (): ReturnType<typeof initOxipng> => {
  if (!oxipngInitPromise) {
    oxipngInitPromise = initOxipng(oxipngWasmUrl)
  }

  return oxipngInitPromise
}

/**
 * Определяет, нужно ли запускать lossless-сжатие PNG.
 */
const shouldOptimizePng = ({ contentType, optimizePng }: ShouldOptimizePngParams): boolean => {
  const normalizedContentType = (contentType || '').toLowerCase()
  const isPng = normalizedContentType === 'png'
    || normalizedContentType === 'image/png'
    || normalizedContentType === 'image/x-png'
    || normalizedContentType === ''

  if (!isPng) return false

  return Boolean(optimizePng)
}

/**
 * Сжимает PNG через oxipng и возвращает меньший blob.
 */
const optimizePngBlob = async({ blob, level }: OptimizePngBlobParams): Promise<Blob> => {
  const { size } = blob
  const inputBuffer = await blob.arrayBuffer()
  const resolvedLevel = typeof level === 'number' ? level : 2

  try {
    await ensureOxipngReady()
    const optimizedBytes = oxipngOptimise(new Uint8Array(inputBuffer), resolvedLevel, false)
    const optimizedBuffer = optimizedBytes.buffer

    console.log('Original size:', size, 'Optimized size:', optimizedBuffer.byteLength)
    if (optimizedBuffer.byteLength >= size) {
      return blob
    }

    return new Blob([optimizedBytes], { type: 'image/png' })
  } catch (error) {
    console.error('PNG optimization failed, returning original blob', error)
    return blob
  }
}

self.onmessage = async(e: MessageEvent): Promise<void> => {
  const { action, payload, requestId } = e.data

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
        sizeType,
        optimizePng = false,
        oxipngLevel
      } = payload
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
      let resizedBlob = await offscreen.convertToBlob({ type: contentType, quality })
      const shouldOptimize = shouldOptimizePng({ contentType, optimizePng })

      if (shouldOptimize) {
        resizedBlob = await optimizePngBlob({ blob: resizedBlob, level: oxipngLevel })
      }

      self.postMessage({ requestId, action, success: true, data: resizedBlob })
      break
    }

    case 'toDataURL': {
      const {
        bitmap,
        contentType,
        quality,
        returnBlob,
        optimizePng = false,
        oxipngLevel
      } = payload
      const { width, height } = bitmap

      // рисуем изображение в offscreen
      const off = new OffscreenCanvas(bitmap.width, bitmap.height)
      const ctx = off.getContext('2d')

      if (!ctx) {
        throw new Error('Failed to get 2D context from OffscreenCanvas')
      }

      ctx.drawImage(bitmap, 0, 0, width, height)

      // конвертируем в blob, а затем в dataURL
      let blob = await off.convertToBlob({ type: contentType, quality })
      const shouldOptimize = shouldOptimizePng({ contentType, optimizePng })

      if (shouldOptimize) {
        blob = await optimizePngBlob({ blob, level: oxipngLevel })
      }

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
