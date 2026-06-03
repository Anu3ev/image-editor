import { CanvasOptions, FabricObject, loadSVGFromURL, FabricImage, util } from 'fabric'
import { nanoid } from 'nanoid'
import type { jsPDF } from 'jspdf'
import {
  CANVAS_MAX_WIDTH,
  CANVAS_MAX_HEIGHT,
  CANVAS_MIN_HEIGHT,
  CANVAS_MIN_WIDTH
} from '../constants'

import { ImageEditor } from '../index'
import type { CanvasFullState } from '../history-manager'

export type SuccessulImageImportResult = {
  image: FabricImage | FabricObject
  format: string
  contentType: string
  scale: string
  withoutSave: boolean
  source?: File | string
}

export type SuccessfulExportResult = {
  image: File | Blob | Base64URLString
  format: string
  contentType: string
  fileName: string
}

export type ImportImageOptions = {
  source: File | string,
  scale?: 'image-contain' | 'image-cover' | 'scale-montage',
  withoutSave?: boolean,
  fromClipboard?: boolean,
  isBackground?: boolean,
  withoutSelection?: boolean
  withoutAdding?: boolean,
  customData?: object
}

export type ResizeImageToBoundariesOptions = {
  dataURL: string,
  sizeType?: 'max' | 'min',
  contentType?: string,
  quality?: number,
  maxWidth?: number,
  maxHeight?: number,
  minWidth?: number,
  minHeight?: number,
  asBase64?: boolean,
  asBlob?: boolean,
  emitMessage?: boolean
}

export type ExportObjectAsImageFileParameters = {
  object?: FabricObject,
  fileName?: string,
  contentType?: string,
  exportAsBase64?: boolean,
  exportAsBlob?: boolean
}

export type exportCanvasAsImageFileOptions = {
  fileName?: string,
  contentType?: string,
  exportAsBase64?: boolean,
  exportAsBlob?: boolean
}

/**
 * Нормализованное значение scale для импорта изображения.
 */
type ResolvedImportScale = NonNullable<ImportImageOptions['scale']>

/**
 * Внутренний import request до runtime-проверки source.
 */
interface ImportImageRequest {
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

/**
 * Внутренний import request после проверки, что source можно загрузить.
 */
interface SupportedImportImageRequest extends ImportImageRequest {
  source: File | string
}

/**
 * Payload для worker resize-команды.
 */
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

/**
 * Сериализованный объект canvas из initial/history state.
 */
interface SerializedCanvasObject {
  [key: string]: unknown
}

/**
 * Runtime-форма lazy-loaded jspdf module.
 */
interface JsPDFModule {
  jsPDF: typeof jsPDF
}

export default class ImageManager {
  /**
   * Ссылка на редактор, содержащий canvas.
   */
  public editor: ImageEditor

  /**
   * Настройки редактора
   */
  options: CanvasOptions

  /**
   * Массив blobURL, созданных в процессе работы менеджера.
   * Используется для того чтобы при необходимости можно было удалить их (revoke) и освободить память.
   */
  private _createdBlobUrls: string[]

  /**
   * Массив допустимых contentType, которые можно импортировать. По умолчанию берётся из CanvasOptions.acceptContentTypes.
   */
  public acceptContentTypes: string[]

  /**
   * Массив допустимых форматов изображений, которые можно импортировать. Массив получается из настроек редактора.
   */
  public acceptFormats: string[]

  constructor({ editor }: { editor: ImageEditor }) {
    this.editor = editor
    this.options = editor.options
    this._createdBlobUrls = []

    this.acceptContentTypes = this.editor.options.acceptContentTypes
    this.acceptFormats = this.getAllowedFormatsFromContentTypes()
  }

  /**
   * Подготавливает initialState: заменяет src у изображений на blob-URL с кешированием.
   * Если запрос не удался (например, CORS), src остаётся исходным.
   */
  public async prepareInitialState({ state }: { state: CanvasFullState }): Promise<CanvasFullState> {
    if (!state) return state

    const clonedState = JSON.parse(JSON.stringify(state)) as CanvasFullState
    const cache = new Map<string, string>()

    const { objects = [] } = clonedState

    console.log('objects', objects)
    await this._replaceImageSrcInObjects({ objects, cache })

    return clonedState
  }

  /**
   * Заменяет src у изображений в сериализованном состоянии на blob-URL.
   */
  private async _replaceImageSrcInObjects({
    objects,
    cache
  }: {
    objects: unknown[]
    cache: Map<string, string>
  }): Promise<void> {
    const pendingObjects = [...objects]

    for (let index = 0; index < pendingObjects.length; index += 1) {
      const object = pendingObjects[index]

      if (!ImageManager._isSerializedObject(object)) continue

      const { type, src, objects: childObjects } = object
      const normalizedType = typeof type === 'string' ? type.toLowerCase() : ''

      console.log('_replaceImageSrcInObject', { type, src, objects: childObjects })

      if (normalizedType === 'image' && typeof src === 'string') {
        // eslint-disable-next-line no-await-in-loop
        const blobUrl = await this._getOrCreateBlobUrl({ src, cache })
        if (blobUrl) object.src = blobUrl
      }

      if (Array.isArray(childObjects)) {
        pendingObjects.push(...childObjects)
      }
    }
  }

  /**
   * Проверяет, что значение можно читать как сериализованный canvas object.
   */
  private static _isSerializedObject(value: unknown): value is SerializedCanvasObject {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
  }

  /**
   * Возвращает blob-URL для src, создавая и кешируя его при необходимости.
   */
  private async _getOrCreateBlobUrl({
    src,
    cache
  }: {
    src: string
    cache: Map<string, string>
  }): Promise<string | null> {
    if (ImageManager._isBlobOrDataUrl({ src })) return src

    if (cache.has(src)) {
      return cache.get(src) ?? null
    }

    const blobUrl = await this._fetchAsBlobUrl({ src })
    console.log('_getOrCreateBlobUrl', { src, blobUrl })
    if (!blobUrl) return null

    cache.set(src, blobUrl)

    return blobUrl
  }

  /**
   * Проверяет, что src является blob/data URL.
   */
  private static _isBlobOrDataUrl({ src }: { src: string }): boolean {
    if (src.startsWith('blob:')) return true
    if (src.startsWith('data:')) return true

    return false
  }

  /**
   * Загружает изображение по URL и возвращает blob-URL. При ошибке возвращает null.
   */
  private async _fetchAsBlobUrl({ src }: { src: string }): Promise<string | null> {
    try {
      const response = await fetch(src, { mode: 'cors' })

      if (!response.ok) return null

      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)
      console.log('_fetchAsBlobUrl', { src, blobUrl })

      this._createdBlobUrls.push(blobUrl)

      return blobUrl
    } catch {
      return null
    }
  }

  /**
   * Импорт изображения
   * @param options
   * @param options.source - URL изображения или объект File
   * @param options.scale - Если изображение не вписывается в допустимые размеры, то как масштабировать:
   * 'image-contain' - скейлит картинку, чтобы она вписалась в монтажную область
   * 'image-cover' - скейлит картинку, чтобы она вписалась в монтажную область
   * 'scale-montage' - Обновляет backstore-резолюцию монтажной области (масштабирует
   * экспортный размер канваса под размер изображения)
   * Импортированное изображение материализуется с `originX: 'left'` и `originY: 'top'`,
   * чтобы `left/top` оставались placement-точкой верхнего левого угла объекта.
   * @param options.withoutSave - Не сохранять в историю изменений
   * @returns возвращает Promise с объектом изображения или null в случае ошибки
   */
  public async importImage(options: ImportImageOptions): Promise<SuccessulImageImportResult | null> {
    const request = await this._createImportImageRequest({ options })
    if (!request) return null

    const { historyManager } = this.editor
    historyManager.suspendHistory()

    try {
      const { source } = request

      if (!ImageManager._isSupportedImageSource(source)) {
        this._emitInvalidSourceTypeError({ request })
        historyManager.resumeHistory()

        return null
      }

      const supportedRequest: SupportedImportImageRequest = { ...request, source }
      const dataUrl = await this._resolveImportImageUrl({ request: supportedRequest })
      const loadedImage = await this._loadImportImage({ dataUrl, format: request.format })
      const image = await this._resizeImportImageIfNeeded({
        image: loadedImage,
        contentType: request.contentType
      })

      this._applyImportedImageProperties({ image, request: supportedRequest })
      this._placeImportedImage({ image, request: supportedRequest })

      return this._completeImportImage({ image, request: supportedRequest })
    } catch (error) {
      this._emitImportFailed({ error, request })
      historyManager.resumeHistory()

      return null
    }
  }

  /**
   * Создаёт внутренний request и отсекает только пустой source и неподдержанный contentType.
   */
  private async _createImportImageRequest({
    options
  }: {
    options: ImportImageOptions
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

    const scale: ResolvedImportScale = options.scale ?? (
      this.options.scaleType === 'cover' ? 'image-cover' : 'image-contain'
    )
    const contentType = ImageManager._isSupportedImageSource(source)
      ? await this.getContentType(source)
      : ImageManager._getInvalidSourceContentType({ source })
    const format = this.getFormatFromContentType(contentType)
    const request = {
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

    if (!ImageManager._isSupportedImageSource(source)) return request
    if (this.isAllowedContentType(contentType)) return request

    this._emitInvalidContentTypeError({ request })

    return null
  }

  /**
   * Проверяет runtime-тип source, потому что публичный API может вызываться из JS.
   */
  private static _isSupportedImageSource(source: unknown): source is File | string {
    if (source instanceof File) return true
    if (typeof source === 'string') return true

    return false
  }

  /**
   * Достаёт contentType из невалидного source только для диагностического payload.
   */
  private static _getInvalidSourceContentType({ source }: { source: unknown }): string {
    if (!ImageManager._isSerializedObject(source)) return 'application/octet-stream'

    const { type } = source
    if (typeof type === 'string') return type

    return 'application/octet-stream'
  }

  /**
   * Отправляет ошибку неподдержанного contentType до начала history transaction.
   */
  private _emitInvalidContentTypeError({ request }: { request: ImportImageRequest }): void {
    const { acceptContentTypes, acceptFormats } = this
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

    this.editor.errorManager.emitError({
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
  private _emitInvalidSourceTypeError({ request }: { request: ImportImageRequest }): void {
    const { acceptContentTypes, acceptFormats } = this
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

    this.editor.errorManager.emitError({
      origin: 'ImageManager',
      method: 'importImage',
      code: 'INVALID_SOURCE_TYPE',
      message: 'Неверный тип источника изображения. Ожидается URL или объект File.',
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
   * Возвращает URL, который Fabric может загрузить как изображение.
   */
  private async _resolveImportImageUrl({ request }: { request: SupportedImportImageRequest }): Promise<string> {
    const { source } = request

    if (source instanceof File) {
      const dataUrl = URL.createObjectURL(source)
      this._createdBlobUrls.push(dataUrl)

      return dataUrl
    }

    const dataUrl = await this._fetchAsBlobUrl({ src: source })
    if (!dataUrl) {
      throw new Error('Не удалось загрузить изображение по URL')
    }

    return dataUrl
  }

  /**
   * Создаёт Fabric object из подготовленного image URL.
   */
  private async _loadImportImage({
    dataUrl,
    format
  }: {
    dataUrl: string
    format: string
  }): Promise<FabricImage | FabricObject> {
    if (format === 'svg') {
      const svgData = await loadSVGFromURL(dataUrl)

      return util.groupSVGElements(svgData.objects as FabricObject[], svgData.options)
    }

    return FabricImage.fromURL(dataUrl, { crossOrigin: 'anonymous' })
  }

  /**
   * Масштабирует слишком большие или слишком маленькие raster-изображения.
   */
  private async _resizeImportImageIfNeeded({
    image,
    contentType
  }: {
    image: FabricImage | FabricObject
    contentType: string
  }): Promise<FabricImage | FabricObject> {
    if (!(image instanceof FabricImage)) return image

    const { width: imageWidth, height: imageHeight } = image
    if (imageHeight > CANVAS_MAX_HEIGHT || imageWidth > CANVAS_MAX_WIDTH) {
      return this._resizeImportImageToBoundaries({
        image,
        contentType,
        sizeType: 'max'
      })
    }

    if (imageHeight < CANVAS_MIN_HEIGHT || imageWidth < CANVAS_MIN_WIDTH) {
      return this._resizeImportImageToBoundaries({
        image,
        contentType,
        sizeType: 'min'
      })
    }

    return image
  }

  /**
   * Делегирует resize worker-у и загружает результат обратно в FabricImage.
   */
  private async _resizeImportImageToBoundaries({
    image,
    contentType,
    sizeType
  }: {
    image: FabricImage
    contentType: string
    sizeType: 'max' | 'min'
  }): Promise<FabricImage> {
    const imageSrc = ImageManager._getImageElementSource({ image })
    const resizedBlob = await this.resizeImageToBoundaries({
      dataURL: imageSrc,
      sizeType,
      contentType
    })
    const resizedBlobUrl = URL.createObjectURL(resizedBlob)
    this._createdBlobUrls.push(resizedBlobUrl)

    return FabricImage.fromURL(resizedBlobUrl, { crossOrigin: 'anonymous' })
  }

  /**
   * Возвращает source raster-изображения для resize.
   */
  private static _getImageElementSource({ image }: { image: FabricImage }): string {
    const imageElement = image.getElement()

    if (imageElement instanceof HTMLImageElement) return imageElement.src
    if (imageElement instanceof HTMLCanvasElement) return imageElement.toDataURL()

    throw new Error('Не удалось получить источник изображения для resize')
  }

  /**
   * Проставляет editor metadata на загруженное изображение.
   */
  private _applyImportedImageProperties({
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

  /**
   * Применяет выбранную стратегию размещения импортированного изображения.
   */
  private _placeImportedImage({
    image,
    request
  }: {
    image: FabricImage | FabricObject
    request: SupportedImportImageRequest
  }): void {
    if (request.scale === 'scale-montage') {
      this.editor.canvasManager.scaleMontageAreaToImage({ object: image, withoutSave: true })
      return
    }

    const { montageArea, transformManager } = this.editor
    const { width: montageAreaWidth, height: montageAreaHeight } = montageArea
    const { width: imageWidth, height: imageHeight } = image
    const scaleFactor = this.calculateScaleFactor({ imageObject: image, scaleType: request.scale })

    if (request.scale === 'image-contain' && scaleFactor < 1) {
      transformManager.fitObject({ object: image, type: 'contain', withoutSave: true })
      return
    }

    if (request.scale !== 'image-cover') return
    if (imageWidth <= montageAreaWidth && imageHeight <= montageAreaHeight) return

    transformManager.fitObject({ object: image, type: 'cover', withoutSave: true })
  }

  /**
   * Завершает import transaction, добавляет объект на canvas и отправляет событие.
   */
  private _completeImportImage({
    image,
    request
  }: {
    image: FabricImage | FabricObject
    request: SupportedImportImageRequest
  }): SuccessulImageImportResult {
    const { canvas, canvasManager, historyManager } = this.editor
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
    const result = {
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

    if (withoutAdding) {
      historyManager.resumeHistory()
      canvas.fire('editor:image-imported', result)

      return result
    }

    canvas.add(image)
    canvasManager.centerObjectToMontageArea({ object: image })

    if (!withoutSelection) {
      canvas.setActiveObject(image)
    }

    canvas.renderAll()
    historyManager.resumeHistory()

    if (!withoutSave) {
      historyManager.saveState()
    }

    canvas.fire('editor:image-imported', result)

    return result
  }

  /**
   * Отправляет общую ошибку import path после начала history transaction.
   */
  private _emitImportFailed({
    error,
    request
  }: {
    error: unknown
    request: ImportImageRequest
  }): void {
    this.editor.errorManager.emitError({
      origin: 'ImageManager',
      method: 'importImage',
      code: 'IMPORT_FAILED',
      message: `Ошибка импорта изображения: ${(error as Error).message}`,
      data: request
    })
  }

  /**
   * Ресайзит изображение до заданных максимальных или минимальных размеров,
   * сохраняя пропорции. По умолчанию использует границы канваса.
   *
   * @param options - опции
   * @param options.dataURL - dataURL изображения
   * @param options.sizeType - максимальный или минимальный размер ('max' | 'min')
   * @param options.maxWidth - максимальная ширина (по умолчанию CANVAS_MAX_WIDTH)
   * @param options.maxHeight - максимальная высота (по умолчанию CANVAS_MAX_HEIGHT)
   * @param options.minWidth - минимальная ширина (по умолчанию CANVAS_MIN_WIDTH)
   * @param options.minHeight - минимальная высота (по умолчанию CANVAS_MIN_HEIGHT)
   * @param options.asBase64 - вернуть base64 вместо Blob
   * @param options.emitMessage - выводить предупреждение в случае ресайза
   * @param options.contentType - тип контента
   * @param options.quality - качество изображения от 0 до 1 (для JPEG/WebP)
   * @returns возвращает Promise с Blob или base64 в зависимости от опций
   */
  public async resizeImageToBoundaries(
    options: ResizeImageToBoundariesOptions & { asBase64: true }
  ): Promise<Base64URLString>

  // eslint-disable-next-line no-dupe-class-members
  public async resizeImageToBoundaries(
    options: ResizeImageToBoundariesOptions & { asBase64?: false }
  ): Promise<Blob>

  // eslint-disable-next-line no-dupe-class-members
  public async resizeImageToBoundaries(
    options: ResizeImageToBoundariesOptions
  ): Promise<Blob | Base64URLString> {
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

    const { workerManager } = this.editor

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
      this._emitImageResizeWarning({ data })
    }

    const resizedBlob = await workerManager.post('resizeImage', data) as Blob

    if (asBase64) {
      const bitmap = await createImageBitmap(resizedBlob)
      const dataUrl = await workerManager.post(
        'toDataURL',
        { contentType, quality, bitmap },
        [bitmap]
      ) as Base64URLString

      return dataUrl
    }

    return resizedBlob
  }

  private _emitImageResizeWarning({ data }: { data: ImageResizeWorkerPayload }): void {
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

    this.editor.errorManager.emitWarning({
      origin: 'ImageManager',
      method: 'resizeImageToBoundaries',
      code: 'IMAGE_RESIZE_WARNING',
      message,
      data
    })
  }

  /**
   * Экспорт изображения в файл – экспортируется содержимое монтажной области.
   * Независимо от текущего зума, экспортируется монтажная область в исходном масштабе. Можно экспортировать как base64.
   * @param options - опции
   * @param options.fileName - имя файла
   * @param options.contentType - тип контента
   * @param options.exportAsBase64 - экспортировать как base64
   * @param options.exportAsBlob - экспортировать как blob
   * @returns возвращает Promise с объектом файла или null в случае ошибки
   * @fires editor:canvas-exported
   */
  async exportCanvasAsImageFile(
    options: exportCanvasAsImageFileOptions = {}
  ): Promise<SuccessfulExportResult | null> {
    const {
      fileName = 'image.png',
      contentType = 'image/png',
      exportAsBase64 = false,
      exportAsBlob = false
    } = options

    const {
      canvas,
      canvasManager,
      montageArea,
      workerManager,
      interactionBlocker
    } = this.editor

    try {
      const isPDF = contentType === 'application/pdf'
      // Если это PDF, то дальше нам нужен будет .jpg
      const adjustedContentType = isPDF ? 'image/jpg' : contentType

      const format = this.getFormatFromContentType(adjustedContentType)

      // Экспорт режет сцену по каноническим bounds монтажной области, а не по текущему viewport.
      const {
        left,
        top,
        width,
        height
      } = canvasManager.getMontageAreaSceneBounds()

      // Создаем клон канваса
      const tmpCanvas = await canvas.clone(['id', 'format', 'locked'])

      // Отключаем retina scaling для консистентного экспорта размеров
      tmpCanvas.enableRetinaScaling = false

      // Задаём белый фон если это JPG
      if (['image/jpg', 'image/jpeg'].includes(adjustedContentType)) {
        tmpCanvas.backgroundColor = '#ffffff'
      }

      // Находим монтажную область в клонированном канвасе и скрываем её
      const tmpCanvasMontageArea = tmpCanvas.getObjects().find((obj) => obj.id === montageArea.id)

      if (tmpCanvasMontageArea) {
        tmpCanvasMontageArea.visible = false
      }

      // Если редактор в режиме блокировки взаимодействия, то скрываем слой-маску
      if (interactionBlocker?.isBlocked) {
        const tmpCanvasOverlayMask = tmpCanvas.getObjects().find((obj) => obj.id === interactionBlocker.overlayMask!.id)

        if (tmpCanvasOverlayMask) {
          tmpCanvasOverlayMask.visible = false
        }
      }

      // Сдвигаем клонированную сцену
      tmpCanvas.viewportTransform = [1, 0, 0, 1, -left, -top]
      tmpCanvas.setDimensions({ width, height }, { backstoreOnly: true })
      tmpCanvas.renderAll()

      const allCanvasItemsAreSVG = tmpCanvas.getObjects()
        .filter((object) => object.format)
        .every((object) => object.format === 'svg')

      // Если это SVG, то обрезаем через viewportTransform и backstore
      if (format === 'svg' && allCanvasItemsAreSVG) {
      // получаем SVG строку
        const svgString = tmpCanvas.toSVG()

        // Утилизируем клон
        tmpCanvas.dispose()

        const svg = ImageManager._exportSVGStringAsFile(svgString, {
          exportAsBase64,
          exportAsBlob,
          fileName
        })

        const data = {
          image: svg,
          format: 'svg',
          contentType: 'image/svg+xml',
          fileName: fileName.replace(/\.[^/.]+$/, '.svg')
        }

        canvas.fire('editor:canvas-exported', data)
        return data
      }

      // Получаем blob из клонированного канваса в нужном формате
      const blob: Blob = await new Promise((resolve, reject) => {
        tmpCanvas.getElement().toBlob(
          (canvasBlob) => {
            if (canvasBlob) {
              resolve(canvasBlob)
            } else {
              reject(new Error('Failed to create Blob from canvas'))
            }
          },
          adjustedContentType,
          1
        )
      })

      // Уничтожаем клон
      tmpCanvas.dispose()

      if (exportAsBlob) {
        const data = {
          image: blob,
          format,
          contentType: adjustedContentType,
          fileName
        }

        canvas.fire('editor:canvas-exported', data)

        return data
      }

      // Создаём bitmap из blob, отправляем в воркер и получаем dataURL
      const bitmap = await createImageBitmap(blob)

      const dataUrl = await workerManager.post(
        'toDataURL',
        {
          contentType: adjustedContentType,
          quality: 1,
          bitmap
        },
        [bitmap]
      )

      if (isPDF) {
        const pxToMm = 0.264583 // коэффициент перевода пикселей в миллиметры (при 96 DPI)
        const pdfWidth = width * pxToMm
        const pdfHeight = height * pxToMm

        const JsPDF = (await this.editor.moduleLoader.loadModule<JsPDFModule>('jspdf')).jsPDF

        const pdf = new JsPDF({
          orientation: pdfWidth > pdfHeight ? 'landscape' : 'portrait',
          unit: 'mm',
          format: [pdfWidth, pdfHeight]
        })

        // Добавляем изображение в PDF. Используем формат PNG для изображения
        pdf.addImage(String(dataUrl), 'JPG', 0, 0, pdfWidth, pdfHeight)

        if (exportAsBase64) {
          const pdfBase64 = pdf.output('datauristring')

          const data = {
            image: pdfBase64,
            format: 'pdf',
            contentType: 'application/pdf',
            fileName
          }

          canvas.fire('editor:canvas-exported', data)
          return data
        }

        // Получаем Blob из PDF и создаем File
        const pdfBlob = pdf.output('blob')
        const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' })

        const data = {
          image: pdfFile,
          format: 'pdf',
          contentType: 'application/pdf',
          fileName
        }

        canvas.fire('editor:canvas-exported', data)
        return data
      }

      if (exportAsBase64) {
        const data = {
          image: dataUrl,
          format,
          contentType: adjustedContentType,
          fileName
        }

        canvas.fire('editor:canvas-exported', data)
        return data
      }

      // Если запрашивали SVG, но не все элементы SVG, то меняем расширение на PNG
      const adjustedFileName = format === 'svg' && !allCanvasItemsAreSVG
        ? fileName.replace(/\.[^/.]+$/, '.png')
        : fileName

      // Преобразуем Blob в File
      const file = new File([blob], adjustedFileName, { type: adjustedContentType })

      const data = {
        image: file,
        format,
        contentType: adjustedContentType,
        fileName: adjustedFileName
      }

      canvas.fire('editor:canvas-exported', data)
      return data
    } catch (error) {
      this.editor.errorManager.emitError({
        origin: 'ImageManager',
        method: 'exportCanvasAsImageFile',
        code: 'IMAGE_EXPORT_FAILED',
        message: `Ошибка экспорта изображения: ${(error as Error).message}`,
        data: { contentType, fileName, exportAsBase64, exportAsBlob }
      })

      return null
    }
  }

  /**
   * Экспорт выбранного объекта в виде изображения или base64
   * @param options - опции
   * @param options.object - объект для экспорта
   * @param options.fileName - имя файла
   * @param options.contentType - тип контента
   * @param options.exportAsBase64 - экспортировать как base64
   * @param options.exportAsBlob - экспортировать как blob
   * @returns - возвращает Promise с объектом файла или null в случае ошибки
   * @fires editor:object-exported
   */
  public async exportObjectAsImageFile(
    options: ExportObjectAsImageFileParameters = {}
  ): Promise<SuccessfulExportResult | null> {
    const {
      object,
      fileName,
      contentType,
      exportAsBase64 = false,
      exportAsBlob = false
    } = options

    const { canvas, workerManager } = this.editor

    const activeObject = object || canvas.getActiveObject()
    const fallbackContentType = contentType ?? 'image/png'
    const fallbackFormat = this.getFormatFromContentType(fallbackContentType) || 'png'
    const fallbackFileName = fileName ?? `image.${fallbackFormat}`

    if (!activeObject) {
      this.editor.errorManager.emitError({
        origin: 'ImageManager',
        method: 'exportObjectAsImageFile',
        code: 'NO_OBJECT_SELECTED',
        message: 'Не выбран объект для экспорта',
        data: { contentType: fallbackContentType, fileName: fallbackFileName, exportAsBase64, exportAsBlob }
      })

      return null
    }

    const { contentType: objectContentType, format: objectFormat = '' } = activeObject as {
      contentType?: string
      format?: string
    }
    const processedContentType = contentType ?? objectContentType ?? 'image/png'
    const format = this.getFormatFromContentType(processedContentType)
      || objectFormat
      || 'png'
    const processedFileName = fileName ?? `image.${format}`

    try {
      if (format === 'svg') {
      // Конвертируем fabric.Object в SVG-строку
        const svgString = activeObject.toSVG()

        const svg = ImageManager._exportSVGStringAsFile(svgString, {
          exportAsBase64,
          exportAsBlob,
          fileName: processedFileName
        })

        const data = {
          object: activeObject,
          image: svg,
          format,
          contentType: 'image/svg+xml',
          fileName: processedFileName.replace(/\.[^/.]+$/, '.svg')
        }

        canvas.fire('editor:object-exported', data)
        return data
      }

      if (exportAsBase64 && activeObject instanceof FabricImage) {
        const bitmap = await createImageBitmap(activeObject.getElement())
        const dataUrl = await workerManager.post(
          'toDataURL',
          {
            contentType: processedContentType,
            quality: 1,
            bitmap
          },
          [bitmap]
        )

        const data = {
          object: activeObject,
          image: dataUrl,
          format,
          contentType: processedContentType,
          fileName: processedFileName
        }

        canvas.fire('editor:object-exported', data)
        return data
      }

      const activeObjectCanvas = activeObject.toCanvasElement({
        enableRetinaScaling: false
      })
      const activeObjectBlob: Blob = await new Promise((resolve, reject) => {
        activeObjectCanvas.toBlob((blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('Failed to create Blob from canvas'))
          }
        })
      })

      if (exportAsBlob) {
        const data = {
          object: activeObject,
          image: activeObjectBlob,
          format,
          contentType: processedContentType,
          fileName: processedFileName
        }

        canvas.fire('editor:object-exported', data)
        return data
      }

      // Преобразуем Blob в File
      const file = new File([activeObjectBlob], processedFileName, { type: processedContentType })

      const data = {
        object: activeObject,
        image: file,
        format,
        contentType: processedContentType,
        fileName: processedFileName
      }

      canvas.fire('editor:object-exported', data)
      return data
    } catch (error) {
      this.editor.errorManager.emitError({
        origin: 'ImageManager',
        method: 'exportObjectAsImageFile',
        code: 'IMAGE_EXPORT_FAILED',
        message: `Ошибка экспорта объекта: ${(error as Error).message}`,
        data: {
          contentType: processedContentType,
          fileName: processedFileName,
          exportAsBase64,
          exportAsBlob
        }
      })

      return null
    }
  }

  /**
   * Удаляет все созданные blobURL
   */
  public revokeBlobUrls(): void {
    this._createdBlobUrls.forEach(URL.revokeObjectURL)
    this._createdBlobUrls = []
  }

  /**
   * Получает список допустимых форматов изображений
   * @returns массив допустимых форматов изображений
   */
  public getAllowedFormatsFromContentTypes(): string[] {
    return this.acceptContentTypes
      .map((contentType) => this.getFormatFromContentType(contentType))
      .filter((format) => format)
  }

  /**
   * Проверяет, является ли contentType допустимым типом изображения.
   * @returns true, если contentType допустим, иначе false
   */
  public isAllowedContentType(contentType = ''): boolean {
    return this.acceptContentTypes.includes(contentType)
  }

  /**
   * Получает contentType изображения из источника
   * @param source - URL изображения или объект File
   * @returns MIME-тип изображения
   * @public
   */
  public async getContentType(source: File | string): Promise<string> {
    if (typeof source === 'string') {
      return this.getContentTypeFromUrl(source)
    }

    return source.type || 'application/octet-stream'
  }

  /**
   * Получает contentType изображения через HTTP HEAD запрос или анализ URL
   * @param src - URL изображения
   * @returns MIME-тип изображения
   * @public
   */
  public async getContentTypeFromUrl(src: string): Promise<string> {
    // Если это data URL, извлекаем MIME-тип напрямую
    if (src.startsWith('data:')) {
      const match = src.match(/^data:([^;]+)/)
      return match ? match[1] : 'application/octet-stream'
    }

    // Для обычных URL пытаемся сделать HEAD запрос
    try {
      const response = await fetch(src, { method: 'HEAD' })
      const contentType = response.headers.get('content-type')

      if (contentType && contentType.startsWith('image/')) {
        return contentType.split(';')[0] // убираем дополнительные параметры
      }
    } catch (error) {
      console.warn('HEAD запрос неудачен, определяем тип по расширению:', error)
    }

    // Если HEAD запрос не сработал, определяем по расширению
    return this.getContentTypeFromExtension(src)
  }

  /**
   * Определяет contentType по расширению файла в URL
   * @param url - URL файла
   * @returns MIME-тип
   * @public
   */
  public getContentTypeFromExtension(url: string): string {
    try {
      const urlObj = new URL(url)
      const extension = urlObj.pathname.split('.').pop()?.toLowerCase()

      // Создаем mimeMap из acceptContentTypes
      const mimeMap: { [key: string]: string } = {}
      this.acceptContentTypes.forEach((contentType) => {
        const format = this.getFormatFromContentType(contentType)
        if (format) {
          mimeMap[format] = contentType
        }
      })

      return extension ? mimeMap[extension] || 'application/octet-stream' : 'application/octet-stream'
    } catch (error) {
      console.warn('Не удалось определить расширение из URL:', url, error)
      return 'application/octet-stream'
    }
  }

  /**
   * Рассчитывает коэффициент масштабирования изображения.
   * @param options - опции
   * @param options.imageObject - объект изображения
   * @param options.scaleType - тип масштабирования ('contain' или 'cover')
   * @returns коэффициент масштабирования
   */
  public calculateScaleFactor({
    imageObject,
    scaleType = 'contain'
  }: {
    imageObject: FabricImage | FabricObject,
    scaleType?: 'contain' | 'cover' | 'image-contain' | 'image-cover'
  }): number {
    const { montageArea } = this.editor

    if (!montageArea || !imageObject) return 1

    const canvasWidth = montageArea.width
    const canvasHeight = montageArea.height

    const { width: imageWidth, height: imageHeight } = imageObject

    if (scaleType === 'contain' || scaleType === 'image-contain') {
      return Math.min(canvasWidth / imageWidth, canvasHeight / imageHeight)
    } if (scaleType === 'cover' || scaleType === 'image-cover') {
      return Math.max(canvasWidth / imageWidth, canvasHeight / imageHeight)
    }

    return 1
  }

  /**
   * Преобразует SVG-строку в Blob, файл, или base64
   * @param svgString - SVG-строка
   * @param options - опции
   * @param options.exportAsBase64 - экспортировать как base64
   * @param options.exportAsBlob - экспортировать как blob
   * @param options.fileName - имя файла
   * @returns Blob, base64 или файл
   * @private
   * @static
   */
  private static _exportSVGStringAsFile(svgString: string, {
    exportAsBase64,
    exportAsBlob,
    fileName = 'image.svg'
  }: {
    exportAsBase64?: boolean,
    exportAsBlob?: boolean,
    fileName?: string
  } = {}): Blob | Base64URLString | File {
    if (exportAsBlob) {
      return new Blob([svgString], { type: 'image/svg+xml' })
    }

    if (exportAsBase64) {
      return `data:image/svg+xml;base64,${window.btoa(encodeURIComponent(svgString))}`
    }

    return new File([svgString], fileName.replace(/\.[^/.]+$/, '.svg'), { type: 'image/svg+xml' })
  }

  /**
   * Извлекает чистый формат (subtype) из contentType,
   * отбросив любую часть после «+» или «;»
   * @param contentType
   * @returns формат, например 'png', 'jpeg', 'svg'
   * @public
   */
  getFormatFromContentType(contentType = ''): string {
    const match = contentType.match(/^[^/]+\/([^+;]+)/)
    return match ? match[1] : ''
  }
}
