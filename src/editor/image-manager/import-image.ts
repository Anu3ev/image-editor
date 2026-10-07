/* eslint-disable no-use-before-define -- Keep the public import functions above the internal steps. */
import {
  FabricImage,
  FabricObject,
  loadSVGFromURL,
  util
} from 'fabric'
import { nanoid } from 'nanoid'
import { english, type Translate } from '../i18n'

import {
  CANVAS_MAX_HEIGHT,
  CANVAS_MAX_WIDTH,
  CANVAS_MIN_HEIGHT,
  CANVAS_MIN_WIDTH
} from '../constants'
import type BlobUrlRegistry from './blob-url-registry'
import { getContentType, getFormatFromContentType } from './image-format'
import { resizeImageToBoundaries } from './image-resize'
import { calculateImageScaleFactor } from './image-scale'
import type {
  ImageManagerEditor,
  ImportImageOptions,
  SuccessulImageImportResult
} from './types'

/** Normalized scale value for image import. */
export type ResolvedImportScale = NonNullable<ImportImageOptions['scale']>

/** Internal import request before runtime source validation. */
export interface ImportImageRequest {
  source: unknown
  scale: ResolvedImportScale
  withoutSave: boolean
  fromClipboard: boolean
  isBackground: boolean
  withoutSelection: boolean
  withoutAdding: boolean
  customData: object | null
  contentType: string
  format: string
}

/** Internal import request after verifying that the source can be loaded. */
export interface SupportedImportImageRequest extends ImportImageRequest {
  source: File | string
}

/** Context for completing an import transaction. */
interface CompleteImportImageParams {
  editor: ImageManagerEditor
  image: FabricImage | FabricObject
  request: SupportedImportImageRequest
}

/** Context for building a successful import result. */
interface CreateImportImageResultParams {
  image: FabricImage | FabricObject
  request: SupportedImportImageRequest
}

/** Serialized canvas object from initial/history state. */
interface SerializedCanvasObject {
  [key: string]: unknown
}

/** Checks the runtime source type because the public API may be called from JS. */
export function isSupportedImageSource(source: unknown): source is File | string {
  if (source instanceof File) return true
  if (typeof source === 'string') return true

  return false
}

/** Creates an import request without side effects or error emission. */
export async function createImportImageRequest({
  options,
  defaultScale,
  acceptContentTypes,
  t = english
}: {
  options: ImportImageOptions
  defaultScale: ResolvedImportScale
  t?: Translate
  acceptContentTypes: string[]
}): Promise<ImportImageRequest | null> {
  const {
    source,
    withoutSave = false,
    fromClipboard = false,
    isBackground = false,
    withoutSelection = false,
    withoutAdding = false,
    customData = null
  } = options

  if (!source) return null

  const scale: ResolvedImportScale = options.scale ?? defaultScale
  const contentType = isSupportedImageSource(source)
    ? await getContentType({ source, acceptContentTypes, t })
    : getInvalidSourceContentType({ source })
  const format = getFormatFromContentType(contentType)

  return {
    source,
    scale,
    withoutSave,
    fromClipboard,
    isBackground,
    withoutSelection,
    withoutAdding,
    customData,
    contentType,
    format
  }
}

/** Extracts contentType from an invalid source solely for the diagnostic payload. */
function getInvalidSourceContentType({ source }: { source: unknown }): string {
  if (!isSerializedCanvasObject(source)) return 'application/octet-stream'

  const { type } = source
  if (typeof type === 'string') return type

  return 'application/octet-stream'
}

/** Creates a Fabric object from a prepared image URL. */
export async function loadImportImage({
  dataUrl,
  format
}: {
  dataUrl: string
  format: string
}): Promise<FabricImage | FabricObject> {
  if (format === 'svg') {
    const svgData = await loadSVGFromURL(dataUrl)
    const svgObjects = svgData.objects.filter((object): object is FabricObject => Boolean(object))

    return util.groupSVGElements(svgObjects, svgData.options)
  }

  return FabricImage.fromURL(dataUrl, { crossOrigin: 'anonymous' })
}

/** Returns the raster image source for resizing. */
function getImageElementSource({ image, t }: { image: FabricImage; t: Translate }): string {
  const imageElement = image.getElement()

  if (imageElement instanceof HTMLImageElement) return imageElement.src
  if (imageElement instanceof HTMLCanvasElement) return imageElement.toDataURL()

  throw new Error(t('image.errors.resizeSourceUnavailable'))
}

/** Scales raster images that are too large or too small. */
export async function resizeImportImageIfNeeded({
  editor,
  blobUrls,
  image,
  contentType
}: {
  editor: ImageManagerEditor
  blobUrls: BlobUrlRegistry
  image: FabricImage | FabricObject
  contentType: string
}): Promise<FabricImage | FabricObject> {
  if (!(image instanceof FabricImage)) return image

  const { width: imageWidth, height: imageHeight } = image
  if (imageHeight > CANVAS_MAX_HEIGHT || imageWidth > CANVAS_MAX_WIDTH) {
    return resizeImportImageToBoundaries({
      editor,
      blobUrls,
      image,
      contentType,
      sizeType: 'max'
    })
  }

  if (imageHeight < CANVAS_MIN_HEIGHT || imageWidth < CANVAS_MIN_WIDTH) {
    return resizeImportImageToBoundaries({
      editor,
      blobUrls,
      image,
      contentType,
      sizeType: 'min'
    })
  }

  return image
}

/** Applies editor metadata to the loaded image. */
export function applyImportedImageProperties({
  image,
  request
}: {
  image: FabricImage | FabricObject
  request: SupportedImportImageRequest
}): void {
  image.set({
    id: `${image.type}-${nanoid()}`,
    format: request.format,
    contentType: request.contentType,
    customData: request.customData ?? null,
    originX: 'left',
    originY: 'top'
  })
}

/** Applies the selected placement strategy to the imported image. */
export function placeImportedImage({
  editor,
  image,
  request
}: {
  editor: ImageManagerEditor
  image: FabricImage | FabricObject
  request: SupportedImportImageRequest
}): void {
  if (request.scale === 'scale-montage') {
    editor.canvasManager.scaleMontageAreaToImage({ object: image, withoutSave: true })
    return
  }

  const { montageArea, transformManager } = editor
  const { width: montageAreaWidth, height: montageAreaHeight } = montageArea
  const { width: imageWidth, height: imageHeight } = image
  const scaleFactor = calculateImageScaleFactor({
    montageArea,
    imageObject: image,
    scaleType: request.scale
  })

  if (request.scale === 'image-contain' && scaleFactor < 1) {
    transformManager.fitObject({ object: image, type: 'contain', withoutSave: true })
    return
  }

  if (request.scale !== 'image-cover') return
  if (imageWidth <= montageAreaWidth && imageHeight <= montageAreaHeight) return

  transformManager.fitObject({ object: image, type: 'cover', withoutSave: true })
}

/**
 * Emits an unsupported contentType error before the history transaction begins.
 */
export function emitInvalidContentTypeError({
  editor,
  request,
  acceptContentTypes,
  acceptFormats
}: {
  editor: ImageManagerEditor
  request: ImportImageRequest
  acceptContentTypes: string[]
  acceptFormats: string[]
}): void {
  const {
    source,
    format,
    contentType,
    fromClipboard,
    isBackground,
    withoutSelection,
    withoutAdding,
    customData
  } = request
  const message = editor.t('image.errors.invalidContentType', {
    contentType,
    acceptedContentTypes: acceptContentTypes.join(', ')
  })

  editor.errorManager.emitError({
    origin: 'ImageManager',
    method: 'importImage',
    code: 'INVALID_CONTENT_TYPE',
    message,
    data: {
      source,
      format,
      contentType,
      acceptContentTypes,
      acceptFormats,
      fromClipboard,
      isBackground,
      withoutSelection,
      withoutAdding,
      customData
    }
  })
}

/**
 * Emits an unsupported runtime source type error within the history transaction.
 */
export function emitInvalidSourceTypeError({
  editor,
  request
}: {
  editor: ImageManagerEditor
  request: ImportImageRequest
}): void {
  const {
    source,
    format,
    contentType,
    fromClipboard,
    isBackground,
    withoutSelection,
    withoutAdding,
    customData
  } = request

  editor.errorManager.emitError({
    origin: 'ImageManager',
    method: 'importImage',
    code: 'INVALID_SOURCE_TYPE',
    message: editor.t('image.errors.invalidSourceType'),
    data: {
      source,
      format,
      contentType,
      fromClipboard,
      isBackground,
      withoutSelection,
      withoutAdding,
      customData
    }
  })
}

/**
 * Returns a URL that Fabric can load as an image.
 */
export async function resolveImportImageUrl({
  request,
  blobUrls,
  t = english
}: {
  request: SupportedImportImageRequest
  t?: Translate
  blobUrls: BlobUrlRegistry
}): Promise<string> {
  const { source } = request

  if (source instanceof File) {
    return blobUrls.createObjectUrl({ source })
  }

  const dataUrl = await blobUrls.fetchAsBlobUrl({ src: source })
  if (!dataUrl) {
    throw new Error(t('image.errors.urlLoadFailed'))
  }

  return dataUrl
}

/**
 * Completes the import transaction, adds the object to the canvas, and emits the event.
 */
export function completeImportImage({
  editor,
  image,
  request
}: CompleteImportImageParams): SuccessulImageImportResult {
  const result = createImportImageResult({ image, request })

  if (!request.withoutAdding) {
    addImportedImageToCanvas({ editor, image, request })
  }

  editor.historyManager.resumeHistory()

  if (!request.withoutAdding && !request.withoutSave) {
    editor.historyManager.saveState()
  }

  editor.canvas.fire('editor:image-imported', result)

  return result
}

/**
 * Replaces image src values in serialized state with blob URLs.
 */
export async function replaceImageSrcInObjects({
  objects,
  cache,
  blobUrls
}: {
  objects: unknown[]
  cache: Map<string, string>
  blobUrls: BlobUrlRegistry
}): Promise<void> {
  const pendingObjects = [...objects]

  for (let index = 0; index < pendingObjects.length; index += 1) {
    const object = pendingObjects[index]

    if (!isSerializedCanvasObject(object)) continue

    const { type, src, objects: childObjects } = object
    const normalizedType = typeof type === 'string' ? type.toLowerCase() : ''

    if (normalizedType === 'image' && typeof src === 'string') {
      // eslint-disable-next-line no-await-in-loop
      const blobUrl = await blobUrls.getOrCreateForSource({ src, cache })
      if (blobUrl) object.src = blobUrl
    }

    if (Array.isArray(childObjects)) {
      pendingObjects.push(...childObjects)
    }
  }
}

/** Delegates resizing to the public resize operation and loads the result back into a FabricImage. */
async function resizeImportImageToBoundaries({
  editor,
  blobUrls,
  image,
  contentType,
  sizeType
}: {
  editor: ImageManagerEditor
  blobUrls: BlobUrlRegistry
  image: FabricImage
  contentType: string
  sizeType: 'max' | 'min'
}): Promise<FabricImage> {
  const imageSrc = getImageElementSource({ image, t: editor.t })
  const resizedBlob = await resizeImageToBoundaries({
    editor,
    options: {
      dataURL: imageSrc,
      sizeType,
      contentType
    }
  })
  const resizedBlobUrl = blobUrls.createObjectUrl({ source: resizedBlob })

  return FabricImage.fromURL(resizedBlobUrl, { crossOrigin: 'anonymous' })
}

/** Checks whether the value can be read as a serialized canvas object. */
function isSerializedCanvasObject(value: unknown): value is SerializedCanvasObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Builds the public result of a successful image import. */
function createImportImageResult({
  image,
  request
}: CreateImportImageResultParams): SuccessulImageImportResult {
  const {
    format,
    contentType,
    scale,
    withoutSave,
    source,
    fromClipboard,
    isBackground,
    withoutSelection,
    withoutAdding,
    customData
  } = request

  return {
    image,
    format,
    contentType,
    scale,
    withoutSave,
    source,
    fromClipboard,
    isBackground,
    withoutSelection,
    withoutAdding,
    customData
  }
}

/** Adds the imported object to the canvas and applies the selection policy. */
function addImportedImageToCanvas({
  editor,
  image,
  request
}: CompleteImportImageParams): void {
  const { canvas, canvasManager } = editor

  canvas.add(image)
  canvasManager.centerObjectToMontageArea({ object: image })

  if (!request.withoutSelection) {
    canvas.setActiveObject(image)
  }

  canvas.renderAll()
}

/**
 * Emits a general import path error after the history transaction has begun.
 */
export function emitImportFailed({
  editor,
  error,
  request
}: {
  editor: ImageManagerEditor
  error: unknown
  request: ImportImageRequest
}): void {
  editor.errorManager.emitError({
    origin: 'ImageManager',
    method: 'importImage',
    code: 'IMPORT_FAILED',
    message: editor.t('image.errors.importFailed', { error: error instanceof Error ? error.message : String(error) }),
    data: request
  })
}
