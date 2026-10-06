import {
  CANVAS_MAX_HEIGHT,
  CANVAS_MAX_WIDTH,
  CANVAS_MIN_HEIGHT,
  CANVAS_MIN_WIDTH
} from '../constants'
import type {
  ImageManagerEditor,
  ResizeImageToBoundariesOptions
} from './types'

/** Payload for the worker resize command. */
interface ImageResizeWorkerPayload {
  dataURL: string
  sizeType: 'max' | 'min'
  contentType: string
  quality: number
  maxWidth: number
  maxHeight: number
  minWidth: number
  minHeight: number
}

/** Emits an image resize warning. */
function emitImageResizeWarning({
  editor,
  data
}: {
  editor: ImageManagerEditor
  data: ImageResizeWorkerPayload
}): void {
  const {
    sizeType,
    maxWidth,
    maxHeight,
    minWidth,
    minHeight
  } = data
  // eslint-disable-next-line max-len
  let message = `Размер изображения больше максимального размера канваса, поэтому оно будет уменьшено до максимальных размеров c сохранением пропорций: ${maxWidth}x${maxHeight}`

  if (sizeType === 'min') {
    // eslint-disable-next-line max-len
    message = `Размер изображения меньше минимального размера канваса, поэтому оно будет увеличено до минимальных размеров c сохранением пропорций: ${minWidth}x${minHeight}`
  }

  editor.errorManager.emitWarning({
    origin: 'ImageManager',
    method: 'resizeImageToBoundaries',
    code: 'IMAGE_RESIZE_WARNING',
    message,
    data
  })
}

/** Resizes an image through the worker and returns base64 when explicitly requested. */
export function resizeImageToBoundaries({
  editor,
  options
}: {
  editor: ImageManagerEditor
  options: ResizeImageToBoundariesOptions & { asBase64: true }
}): Promise<Base64URLString>

/** Resizes an image through the worker and returns a Blob by default. */
export function resizeImageToBoundaries({
  editor,
  options
}: {
  editor: ImageManagerEditor
  options: ResizeImageToBoundariesOptions & { asBase64?: false }
}): Promise<Blob>

/** Resizes an image through the worker when the caller provides the general options contract. */
export function resizeImageToBoundaries({
  editor,
  options
}: {
  editor: ImageManagerEditor
  options: ResizeImageToBoundariesOptions
}): Promise<Blob | Base64URLString>

/** Resizes an image to the specified bounds, preserving its aspect ratio. */
export async function resizeImageToBoundaries({
  editor,
  options
}: {
  editor: ImageManagerEditor
  options: ResizeImageToBoundariesOptions
}): Promise<Blob | Base64URLString> {
  const {
    dataURL,
    sizeType = 'max',
    contentType = 'image/png',
    quality = 1,
    maxWidth = CANVAS_MAX_WIDTH,
    maxHeight = CANVAS_MAX_HEIGHT,
    minWidth = CANVAS_MIN_WIDTH,
    minHeight = CANVAS_MIN_HEIGHT,
    asBase64 = false,
    emitMessage = true
  } = options
  const data: ImageResizeWorkerPayload = {
    dataURL,
    sizeType,
    contentType,
    quality,
    maxWidth,
    maxHeight,
    minWidth,
    minHeight
  }

  if (emitMessage) {
    emitImageResizeWarning({ editor, data })
  }

  const resizedBlob = await editor.workerManager.post('resizeImage', data)
  if (!(resizedBlob instanceof Blob)) {
    throw new Error('resizeImage worker должен вернуть Blob')
  }

  if (!asBase64) return resizedBlob

  const bitmap = await createImageBitmap(resizedBlob)
  const dataUrl = await editor.workerManager.post(
    'toDataURL',
    { contentType, quality, bitmap },
    [bitmap]
  )

  if (typeof dataUrl !== 'string') {
    throw new Error('toDataURL worker должен вернуть строку')
  }

  return dataUrl as Base64URLString
}
