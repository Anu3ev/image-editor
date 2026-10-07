import { FabricImage, type FabricObject } from 'fabric'
import { english, type Translate } from '../i18n'
/* eslint-disable no-use-before-define -- Keep the public entry point above the internal export details. */

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

/** Prepared request for exporting a single object. */
export interface ObjectExportRequest {
  object?: FabricObject
  contentType: string
  format: string
  fileName: string
  exportAsBase64: boolean
  exportAsBlob: boolean
}

/** Export request after verifying that the object exists. */
export interface ResolvedObjectExportRequest extends ObjectExportRequest {
  object: FabricObject
}

/** Request for fast export of the original image element. */
interface ImageElementExportRequest extends ResolvedObjectExportRequest {
  object: FabricImage
}

/** Single-object export result with the original Fabric object in the event payload. */
export interface ObjectExportResult extends SuccessfulExportResult {
  object: FabricObject
}

/** Dimensions of the original HTML image/video element. */
interface ImageElementSize {
  width: number
  height: number
}

/**
 * Creates an object export request even when object is empty, keeping the error payload consistent.
 */
export function createObjectExportRequest({
  object,
  options,
  t = english
}: {
  object?: FabricObject
  options: ExportObjectAsImageFileParameters
  t?: Translate
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
    fileName: fileName ?? t('image.filenames.defaultWithFormat', { format }),
    exportAsBase64,
    exportAsBlob
  }
}

/**
 * Checks whether the request contains an object to export.
 */
export function hasExportObject(request: ObjectExportRequest): request is ResolvedObjectExportRequest {
  return Boolean(request.object)
}

/**
 * Exports the request after verifying that the object exists.
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
 * Checks whether fast raw image element export can be used without losing crop state.
 */
function canExportImageElementAsBase64(
  request: ResolvedObjectExportRequest
): request is ImageElementExportRequest {
  if (!request.exportAsBase64) return false
  if (!(request.object instanceof FabricImage)) return false

  return !hasVisibleImageCrop({ image: request.object })
}

/**
 * Checks whether the visible FabricImage area differs from the original element.
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
 * Returns the dimensions of the FabricImage's original element.
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
 * Exports an SVG object without rasterization.
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
 * Quickly exports the original image element through the worker when there is no crop state.
 */
async function exportImageElementAsBase64({
  editor,
  request
}: {
  editor: ImageManagerEditor
  request: ImageElementExportRequest
}): Promise<ObjectExportResult> {
  const bitmap = await createImageBitmap(request.object.getElement())
  try {
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
      throw new Error(editor.t('image.errors.workerDataUrlStringExpected'))
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
  } finally {
    bitmap.close()
  }
}

/**
 * Exports a rendered snapshot of the object, including crop and other Fabric object properties.
 */
async function exportRenderedObject({
  editor,
  request
}: {
  editor: ImageManagerEditor
  request: ResolvedObjectExportRequest
}): Promise<ObjectExportResult> {
  const objectBlob = await createObjectBlob({ request, t: editor.t })

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
 * Renders the object to a canvas and creates a Blob.
 */
async function createObjectBlob({ request, t }: { request: ResolvedObjectExportRequest; t: Translate }): Promise<Blob> {
  const objectCanvas = request.object.toCanvasElement({
    enableRetinaScaling: false
  })

  return new Promise((resolve, reject) => {
    objectCanvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error(t('image.errors.canvasBlobCreationFailed')))
        }
      },
      request.contentType,
      1
    )
  })
}

/**
 * Emits the successful object export event and returns the payload.
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
