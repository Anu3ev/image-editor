/* eslint-disable no-use-before-define -- Публичный entrypoint держим выше внутренних деталей экспорта. */
import { FabricImage, type FabricObject } from 'fabric'

import type {
  ExportObjectAsImageFileParameters,
  ImageManagerEditor,
  SuccessfulExportResult
} from './types'
import { getFormatFromContentType } from './image-format'
import {
  convertBlobToDataUrl,
  exportSVGStringAsFile
} from './export-utils'

/** Подготовленный request для экспорта одного объекта. */
export interface ObjectExportRequest {
  object?: FabricObject
  contentType: string
  format: string
  fileName: string
  exportAsBase64: boolean
  exportAsBlob: boolean
}

/** Request экспорта после проверки, что объект существует. */
export interface ResolvedObjectExportRequest extends ObjectExportRequest {
  object: FabricObject
}

/** Request быстрого экспорта исходного image element. */
interface ImageElementExportRequest extends ResolvedObjectExportRequest {
  object: FabricImage
}

/** Результат экспорта одного объекта с исходным Fabric-объектом в payload события. */
export interface ObjectExportResult extends SuccessfulExportResult {
  object: FabricObject
}

/** Размер исходного HTML image/video element. */
interface ImageElementSize {
  width: number
  height: number
}

/**
 * Создаёт request экспорта объекта даже при пустом object, чтобы error payload был консистентным.
 */
export function createObjectExportRequest({
  object,
  options
}: {
  object?: FabricObject
  options: ExportObjectAsImageFileParameters
}): ObjectExportRequest {
  const {
    fileName,
    contentType,
    exportAsBase64 = false,
    exportAsBlob = false
  } = options
  const objectMetadata = object as {
    contentType?: string
    format?: string
  } | undefined
  const { contentType: objectContentType, format: objectFormat = '' } = objectMetadata || {}
  const resolvedContentType = contentType ?? objectContentType ?? 'image/png'
  const format = getFormatFromContentType(resolvedContentType) || objectFormat || 'png'

  return {
    object,
    contentType: resolvedContentType,
    format,
    fileName: fileName ?? `image.${format}`,
    exportAsBase64,
    exportAsBlob
  }
}

/**
 * Проверяет, что request содержит объект для экспорта.
 */
export function hasExportObject(request: ObjectExportRequest): request is ResolvedObjectExportRequest {
  return Boolean(request.object)
}

/**
 * Экспортирует request после проверки, что объект существует.
 */
export async function exportResolvedObject({
  editor,
  request
}: {
  editor: ImageManagerEditor
  request: ResolvedObjectExportRequest
}): Promise<ObjectExportResult> {
  if (request.format === 'svg') {
    return exportSvgObject({
      editor,
      request
    })
  }

  if (canExportImageElementAsBase64(request)) {
    return exportImageElementAsBase64({
      editor,
      request
    })
  }

  return exportRenderedObject({
    editor,
    request
  })
}

/**
 * Проверяет, можно ли использовать быстрый экспорт raw image element без потери crop-состояния.
 */
function canExportImageElementAsBase64(
  request: ResolvedObjectExportRequest
): request is ImageElementExportRequest {
  if (!request.exportAsBase64) return false
  if (!(request.object instanceof FabricImage)) return false

  return !hasVisibleImageCrop({ image: request.object })
}

/**
 * Проверяет, отличается ли видимая область FabricImage от исходного element.
 */
function hasVisibleImageCrop({ image }: { image: FabricImage }): boolean {
  const cropX = Number(image.cropX ?? 0)
  const cropY = Number(image.cropY ?? 0)
  const width = Number(image.width ?? 0)
  const height = Number(image.height ?? 0)
  const sourceSize = getImageElementSize({ image })

  return Boolean(
    cropX
    || cropY
    || (sourceSize.width && width && width < sourceSize.width)
    || (sourceSize.height && height && height < sourceSize.height)
  )
}

/**
 * Возвращает размер исходного element у FabricImage.
 */
function getImageElementSize({ image }: { image: FabricImage }): ImageElementSize {
  const element = image.getElement() as {
    naturalWidth?: number
    naturalHeight?: number
    videoWidth?: number
    videoHeight?: number
    width?: number
    height?: number
  }

  return {
    width: element.naturalWidth || element.videoWidth || element.width || 0,
    height: element.naturalHeight || element.videoHeight || element.height || 0
  }
}

/**
 * Экспортирует SVG-объект без rasterize.
 */
function exportSvgObject({
  editor,
  request
}: {
  editor: ImageManagerEditor
  request: ResolvedObjectExportRequest
}): ObjectExportResult {
  const svgString = request.object.toSVG()
  const svg = exportSVGStringAsFile(svgString, {
    exportAsBase64: request.exportAsBase64,
    exportAsBlob: request.exportAsBlob,
    fileName: request.fileName
  })
  const data = {
    object: request.object,
    image: svg,
    format: request.format,
    contentType: 'image/svg+xml',
    fileName: request.fileName.replace(/\.[^/.]+$/, '.svg')
  }

  editor.canvas.fire('editor:object-exported', data)

  return data
}

/**
 * Быстро экспортирует исходный image element через worker, когда crop-состояния нет.
 */
async function exportImageElementAsBase64({
  editor,
  request
}: {
  editor: ImageManagerEditor
  request: ImageElementExportRequest
}): Promise<ObjectExportResult> {
  const bitmap = await createImageBitmap(request.object.getElement())
  const dataUrl = await editor.workerManager.post(
    'toDataURL',
    {
      contentType: request.contentType,
      quality: 1,
      bitmap
    },
    [bitmap]
  )

  if (typeof dataUrl !== 'string') {
    throw new Error('toDataURL worker должен вернуть строку')
  }

  const data = {
    object: request.object,
    image: dataUrl as Base64URLString,
    format: request.format,
    contentType: request.contentType,
    fileName: request.fileName
  }

  editor.canvas.fire('editor:object-exported', data)

  return data
}

/**
 * Экспортирует rendered snapshot объекта, включая crop и другие свойства Fabric-объекта.
 */
async function exportRenderedObject({
  editor,
  request
}: {
  editor: ImageManagerEditor
  request: ResolvedObjectExportRequest
}): Promise<ObjectExportResult> {
  const objectBlob = await createObjectBlob({ request })

  if (request.exportAsBlob) {
    return emitObjectExported({
      editor,
      request,
      image: objectBlob
    })
  }

  if (request.exportAsBase64) {
    const dataUrl = await convertBlobToDataUrl({
      editor,
      blob: objectBlob,
      contentType: request.contentType
    })

    return emitObjectExported({
      editor,
      request,
      image: dataUrl
    })
  }

  return emitObjectExported({
    editor,
    request,
    image: new File([objectBlob], request.fileName, { type: request.contentType })
  })
}

/**
 * Рендерит объект в canvas и создаёт Blob.
 */
async function createObjectBlob({ request }: { request: ResolvedObjectExportRequest }): Promise<Blob> {
  const objectCanvas = request.object.toCanvasElement({
    enableRetinaScaling: false
  })

  return new Promise((resolve, reject) => {
    objectCanvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('Failed to create Blob from canvas'))
        }
      },
      request.contentType,
      1
    )
  })
}

/**
 * Отправляет событие успешного экспорта объекта и возвращает payload.
 */
function emitObjectExported({
  editor,
  request,
  image
}: {
  editor: ImageManagerEditor
  request: ResolvedObjectExportRequest
  image: File | Blob | Base64URLString
}): ObjectExportResult {
  const data = {
    object: request.object,
    image,
    format: request.format,
    contentType: request.contentType,
    fileName: request.fileName
  }

  editor.canvas.fire('editor:object-exported', data)

  return data
}
