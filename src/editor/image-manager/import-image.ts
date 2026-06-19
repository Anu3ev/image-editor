/* eslint-disable no-use-before-define -- Публичные import-функции держим выше внутренних шагов. */
import {
  FabricImage,
  FabricObject,
  loadSVGFromURL,
  util
} from 'fabric'
import { nanoid } from 'nanoid'

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

/** Нормализованное значение scale для импорта изображения. */
export type ResolvedImportScale = NonNullable<ImportImageOptions['scale']>

/** Внутренний import request до runtime-проверки source. */
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

/** Внутренний import request после проверки, что source можно загрузить. */
export interface SupportedImportImageRequest extends ImportImageRequest {
  source: File | string
}

/** Контекст завершения import transaction. */
interface CompleteImportImageParams {
  editor: ImageManagerEditor
  image: FabricImage | FabricObject
  request: SupportedImportImageRequest
}

/** Контекст сборки результата успешного импорта. */
interface CreateImportImageResultParams {
  image: FabricImage | FabricObject
  request: SupportedImportImageRequest
}

/** Сериализованный объект canvas из initial/history state. */
interface SerializedCanvasObject {
  [key: string]: unknown
}

/** Проверяет runtime-тип source, потому что публичный API может вызываться из JS. */
export function isSupportedImageSource(source: unknown): source is File | string {
  if (source instanceof File) return true
  if (typeof source === 'string') return true

  return false
}

/** Создаёт import request без побочных эффектов и error emit. */
export async function createImportImageRequest({
  options,
  defaultScale,
  acceptContentTypes
}: {
  options: ImportImageOptions
  defaultScale: ResolvedImportScale
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
    ? await getContentType({ source, acceptContentTypes })
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

/** Достаёт contentType из невалидного source только для диагностического payload. */
function getInvalidSourceContentType({ source }: { source: unknown }): string {
  if (!isSerializedCanvasObject(source)) return 'application/octet-stream'

  const { type } = source
  if (typeof type === 'string') return type

  return 'application/octet-stream'
}

/** Создаёт Fabric object из подготовленного image URL. */
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

/** Возвращает source raster-изображения для resize. */
function getImageElementSource({ image }: { image: FabricImage }): string {
  const imageElement = image.getElement()

  if (imageElement instanceof HTMLImageElement) return imageElement.src
  if (imageElement instanceof HTMLCanvasElement) return imageElement.toDataURL()

  throw new Error('Не удалось получить источник изображения для resize')
}

/** Масштабирует слишком большие или слишком маленькие raster-изображения. */
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

/** Применяет editor metadata на загруженное изображение. */
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

/** Применяет выбранную стратегию размещения импортированного изображения. */
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
 * Отправляет ошибку неподдержанного contentType до начала history transaction.
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
  // eslint-disable-next-line max-len
  const message = `Неверный contentType для изображения: ${contentType}. Ожидается один из: ${acceptContentTypes.join(', ')}.`

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
 * Отправляет ошибку неподдержанного runtime-типа source внутри history transaction.
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
    message: 'Неверный тип источника изображения. Ожидается URL или объект File.',
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
 * Возвращает URL, который Fabric может загрузить как изображение.
 */
export async function resolveImportImageUrl({
  request,
  blobUrls
}: {
  request: SupportedImportImageRequest
  blobUrls: BlobUrlRegistry
}): Promise<string> {
  const { source } = request

  if (source instanceof File) {
    return blobUrls.createObjectUrl({ source })
  }

  const dataUrl = await blobUrls.fetchAsBlobUrl({ src: source })
  if (!dataUrl) {
    throw new Error('Не удалось загрузить изображение по URL')
  }

  return dataUrl
}

/**
 * Завершает import transaction, добавляет объект на canvas и отправляет событие.
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
 * Заменяет src у изображений в сериализованном состоянии на blob URL.
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

/** Делегирует resize публичной resize-операции и загружает результат обратно в FabricImage. */
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
  const imageSrc = getImageElementSource({ image })
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

/** Проверяет, что значение можно читать как сериализованный canvas object. */
function isSerializedCanvasObject(value: unknown): value is SerializedCanvasObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Собирает публичный результат успешного импорта изображения. */
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

/** Добавляет импортированный объект на canvas и применяет selection policy. */
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
 * Отправляет общую ошибку import path после начала history transaction.
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
    message: `Ошибка импорта изображения: ${(error as Error).message}`,
    data: request
  })
}
