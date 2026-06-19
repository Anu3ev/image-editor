import { CanvasOptions, FabricObject, FabricImage } from 'fabric'

import type { CanvasFullState } from '../history-manager'
import BlobUrlRegistry from './blob-url-registry'
import {
  createCanvasExportRequest,
  createCanvasExportSnapshot,
  exportCanvasSnapshot
} from './canvas-export'
import {
  getAllowedFormatsFromContentTypes as resolveAllowedFormats,
  getContentType as resolveContentType,
  getContentTypeFromExtension as resolveContentTypeFromExtension,
  getContentTypeFromUrl as resolveContentTypeFromUrl,
  getFormatFromContentType as resolveFormatFromContentType,
  isAllowedContentType as resolveIsAllowedContentType
} from './image-format'
import { resizeImageToBoundaries as resizeImageToBoundariesWithWorker } from './image-resize'
import { calculateImageScaleFactor } from './image-scale'
import {
  applyImportedImageProperties,
  completeImportImage,
  createImportImageRequest,
  emitImportFailed,
  emitInvalidContentTypeError,
  emitInvalidSourceTypeError,
  isSupportedImageSource,
  loadImportImage,
  placeImportedImage,
  replaceImageSrcInObjects,
  resolveImportImageUrl,
  resizeImportImageIfNeeded,
  type SupportedImportImageRequest
} from './import-image'
import {
  createObjectExportRequest,
  exportResolvedObject,
  hasExportObject
} from './object-export'
import type {
  exportCanvasAsImageFileOptions,
  ExportObjectAsImageFileParameters,
  ImageManagerEditor,
  ImportImageOptions,
  ResizeImageToBoundariesOptions,
  SuccessfulExportResult,
  SuccessulImageImportResult
} from './types'

export type {
  exportCanvasAsImageFileOptions,
  ExportObjectAsImageFileParameters,
  ImportImageOptions,
  ResizeImageToBoundariesOptions,
  SuccessfulExportResult,
  SuccessulImageImportResult
} from './types'

export default class ImageManager {
  /**
   * Ссылка на редактор, содержащий canvas.
   */
  public editor: ImageManagerEditor

  /**
   * Настройки редактора
   */
  options: CanvasOptions

  /**
   * Массив blobURL, созданных в процессе работы менеджера.
   * Используется для того чтобы при необходимости можно было удалить их (revoke) и освободить память.
   */
  private _blobUrls: BlobUrlRegistry

  /**
   * Массив допустимых contentType, которые можно импортировать. По умолчанию берётся из CanvasOptions.acceptContentTypes.
   */
  public acceptContentTypes: string[]

  /**
   * Массив допустимых форматов изображений, которые можно импортировать. Массив получается из настроек редактора.
   */
  public acceptFormats: string[]

  constructor({ editor }: { editor: ImageManagerEditor }) {
    this.editor = editor
    this.options = editor.options
    this._blobUrls = new BlobUrlRegistry()

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

    await replaceImageSrcInObjects({
      objects,
      cache,
      blobUrls: this._blobUrls
    })

    return clonedState
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
    const defaultScale = this.options.scaleType === 'cover' ? 'image-cover' : 'image-contain'
    const request = await createImportImageRequest({
      options,
      defaultScale,
      acceptContentTypes: this.acceptContentTypes
    })
    if (!request) return null

    const { source, contentType } = request
    if (isSupportedImageSource(source) && !this.isAllowedContentType(contentType)) {
      emitInvalidContentTypeError({
        editor: this.editor,
        request,
        acceptContentTypes: this.acceptContentTypes,
        acceptFormats: this.acceptFormats
      })

      return null
    }

    const { historyManager } = this.editor
    historyManager.suspendHistory()

    try {
      if (!isSupportedImageSource(source)) {
        emitInvalidSourceTypeError({ editor: this.editor, request })
        historyManager.resumeHistory()

        return null
      }

      const supportedRequest: SupportedImportImageRequest = { ...request, source }
      const dataUrl = await resolveImportImageUrl({
        request: supportedRequest,
        blobUrls: this._blobUrls
      })
      const loadedImage = await loadImportImage({ dataUrl, format: request.format })
      const image = await resizeImportImageIfNeeded({
        editor: this.editor,
        blobUrls: this._blobUrls,
        image: loadedImage,
        contentType: request.contentType
      })

      applyImportedImageProperties({ image, request: supportedRequest })
      placeImportedImage({
        editor: this.editor,
        image,
        request: supportedRequest
      })

      return completeImportImage({
        editor: this.editor,
        image,
        request: supportedRequest
      })
    } catch (error) {
      emitImportFailed({ editor: this.editor, error, request })
      historyManager.resumeHistory()

      return null
    }
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
    return resizeImageToBoundariesWithWorker({
      editor: this.editor,
      options
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
    const request = createCanvasExportRequest({
      options
    })

    try {
      const snapshot = await createCanvasExportSnapshot({
        editor: this.editor,
        request
      })

      return await exportCanvasSnapshot({
        editor: this.editor,
        request,
        snapshot
      })
    } catch (error) {
      this.editor.errorManager.emitError({
        origin: 'ImageManager',
        method: 'exportCanvasAsImageFile',
        code: 'IMAGE_EXPORT_FAILED',
        message: `Ошибка экспорта изображения: ${(error as Error).message}`,
        data: {
          contentType: request.contentType,
          fileName: request.fileName,
          exportAsBase64: request.exportAsBase64,
          exportAsBlob: request.exportAsBlob
        }
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
      exportAsBase64 = false,
      exportAsBlob = false
    } = options
    const activeObject = object || this.editor.canvas.getActiveObject()
    const request = createObjectExportRequest({
      object: activeObject ?? undefined,
      options
    })

    if (!hasExportObject(request)) {
      this.editor.errorManager.emitError({
        origin: 'ImageManager',
        method: 'exportObjectAsImageFile',
        code: 'NO_OBJECT_SELECTED',
        message: 'Не выбран объект для экспорта',
        data: {
          contentType: request.contentType,
          fileName: request.fileName,
          exportAsBase64,
          exportAsBlob
        }
      })

      return null
    }

    try {
      return await exportResolvedObject({
        editor: this.editor,
        request
      })
    } catch (error) {
      this.editor.errorManager.emitError({
        origin: 'ImageManager',
        method: 'exportObjectAsImageFile',
        code: 'IMAGE_EXPORT_FAILED',
        message: `Ошибка экспорта объекта: ${(error as Error).message}`,
        data: {
          contentType: request.contentType,
          fileName: request.fileName,
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
    this._blobUrls.revokeAll()
  }

  /**
   * Получает список допустимых форматов изображений
   * @returns массив допустимых форматов изображений
   */
  public getAllowedFormatsFromContentTypes(): string[] {
    return resolveAllowedFormats({
      acceptContentTypes: this.acceptContentTypes
    })
  }

  /**
   * Проверяет, является ли contentType допустимым типом изображения.
   * @returns true, если contentType допустим, иначе false
   */
  public isAllowedContentType(contentType = ''): boolean {
    return resolveIsAllowedContentType({
      contentType,
      acceptContentTypes: this.acceptContentTypes
    })
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

    return resolveContentType({
      source,
      acceptContentTypes: this.acceptContentTypes
    })
  }

  /**
   * Получает contentType изображения через HTTP HEAD запрос или анализ URL
   * @param src - URL изображения
   * @returns MIME-тип изображения
   * @public
   */
  public async getContentTypeFromUrl(src: string): Promise<string> {
    return resolveContentTypeFromUrl({
      src,
      acceptContentTypes: this.acceptContentTypes
    })
  }

  /**
   * Определяет contentType по расширению файла в URL
   * @param url - URL файла
   * @returns MIME-тип
   * @public
   */
  public getContentTypeFromExtension(url: string): string {
    return resolveContentTypeFromExtension({
      url,
      acceptContentTypes: this.acceptContentTypes
    })
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
    return calculateImageScaleFactor({
      montageArea: this.editor.montageArea,
      imageObject,
      scaleType
    })
  }

  /**
   * Извлекает чистый формат (subtype) из contentType,
   * отбросив любую часть после «+» или «;»
   * @param contentType
   * @returns формат, например 'png', 'jpeg', 'svg'
   * @public
   */
  getFormatFromContentType(contentType = ''): string {
    return resolveFormatFromContentType(contentType)
  }
}
