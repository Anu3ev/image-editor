import { FabricObject, FabricImage } from 'fabric'
import type { EditorOptions } from '../types/options'

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
  private _destroyed = false

  /**
   * Reference to the editor containing the canvas.
   */
  public editor: ImageManagerEditor

  /**
   * Editor settings
   */
  options: EditorOptions

  /**
   * Array of blobURLs created while the manager is running.
   * Used to revoke them and release memory when needed.
   */
  private _blobUrls: BlobUrlRegistry

  /**
   * Array of allowed contentType values for import. Defaults to EditorOptions.acceptContentTypes.
   */
  public acceptContentTypes: string[]

  /**
   * Array of allowed image formats for import, derived from the editor settings.
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
   * Prepares serialized state: replaces image src values with cached blob URLs.
   * If the request fails (for example, due to CORS), src remains unchanged.
   */
  public async prepareSerializedImageSources<State extends { objects?: unknown[] } | null | undefined>({
    state
  }: {
    state: State
  }): Promise<State> {
    if (!state) return state

    const clonedState = JSON.parse(JSON.stringify(state)) as NonNullable<State>
    const cache = new Map<string, string>()
    const objects = Array.isArray(clonedState.objects) ? clonedState.objects : []

    await replaceImageSrcInObjects({
      objects,
      cache,
      blobUrls: this._blobUrls
    })

    return clonedState as State
  }

  /**
   * Import an image
   * @param options
   * @param options.source - Image URL or File object
   * @param options.scale - How to scale an image that does not fit within the allowed dimensions:
   * 'image-contain' - scales the image to fit within the artboard
   * 'image-cover' - scales the image to cover the artboard
   * 'scale-montage' - Updates the artboard backstore resolution (scales
   * the exported canvas dimensions to the image size)
   * The imported image is materialized with `originX: 'left'` and `originY: 'top'`,
   * so that `left/top` remain the placement point for the object's top-left corner.
   * @param options.withoutSave - Do not save to the change history
   * @returns A Promise with the image object, or null on error
   */
  public async importImage(options: ImportImageOptions): Promise<SuccessulImageImportResult | null> {
    if (this._destroyed) return null

    const defaultScale = this.options.scaleType === 'cover' ? 'image-cover' : 'image-contain'
    const request = await createImportImageRequest({
      t: this.editor.t,
      options,
      defaultScale,
      acceptContentTypes: this.acceptContentTypes
    })
    if (this._destroyed || !request) return null

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
    let loadedImage: FabricObject | undefined
    let image: FabricObject | undefined

    try {
      if (!isSupportedImageSource(source)) {
        emitInvalidSourceTypeError({ editor: this.editor, request })
        historyManager.resumeHistory()

        return null
      }

      const supportedRequest: SupportedImportImageRequest = { ...request, source }
      const dataUrl = await resolveImportImageUrl({
        t: this.editor.t,
        request: supportedRequest,
        blobUrls: this._blobUrls
      })
      if (this._destroyed) throw new Error(this.editor.t('image.errors.managerDestroyed'))

      loadedImage = await loadImportImage({ dataUrl, format: request.format })
      if (this._destroyed) throw new Error(this.editor.t('image.errors.managerDestroyed'))

      image = await resizeImportImageIfNeeded({
        editor: this.editor,
        blobUrls: this._blobUrls,
        image: loadedImage,
        contentType: request.contentType
      })

      if (this._destroyed) throw new Error(this.editor.t('image.errors.managerDestroyed'))

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
      if (this._destroyed) {
        image?.dispose()
        if (loadedImage && loadedImage !== image) loadedImage.dispose()
        this.revokeBlobUrls()
      } else {
        emitImportFailed({ editor: this.editor, error, request })
      }
      historyManager.resumeHistory()

      return null
    }
  }

  /**
   * Resizes an image to the specified maximum or minimum dimensions,
   * preserving its aspect ratio. Uses the canvas bounds by default.
   *
   * @param options - Options
   * @param options.dataURL - Image dataURL
   * @param options.sizeType - Maximum or minimum size ('max' | 'min')
   * @param options.maxWidth - Maximum width (defaults to CANVAS_MAX_WIDTH)
   * @param options.maxHeight - Maximum height (defaults to CANVAS_MAX_HEIGHT)
   * @param options.minWidth - Minimum width (defaults to CANVAS_MIN_WIDTH)
   * @param options.minHeight - Minimum height (defaults to CANVAS_MIN_HEIGHT)
   * @param options.asBase64 - Return base64 instead of a Blob
   * @param options.emitMessage - Emit a warning if the image is resized
   * @param options.contentType - Content type
   * @param options.quality - Image quality from 0 to 1 (for JPEG/WebP)
   * @returns A Promise with a Blob or base64, depending on the options
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
   * Export an image to a file: exports the contents of the artboard.
   * The artboard is exported at its original scale regardless of the current zoom. Base64 export is also supported.
   * @param options - Options
   * @param options.fileName - Filename
   * @param options.contentType - Content type
   * @param options.exportAsBase64 - Export as base64
   * @param options.exportAsBlob - Export as a blob
   * @returns A Promise with a file object, or null on error
   * @fires editor:canvas-exported
   */
  async exportCanvasAsImageFile(
    options: exportCanvasAsImageFileOptions = {}
  ): Promise<SuccessfulExportResult | null> {
    const request = createCanvasExportRequest({
      t: this.editor.t,
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
        message: this.editor.t('image.errors.exportFailed', {
          error: error instanceof Error ? error.message : String(error)
        }),
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
   * Export the selected object as an image or base64
   * @param options - Options
   * @param options.object - Object to export
   * @param options.fileName - Filename
   * @param options.contentType - Content type
   * @param options.exportAsBase64 - Export as base64
   * @param options.exportAsBlob - Export as a blob
   * @returns - A Promise with a file object, or null on error
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
      t: this.editor.t,
      object: activeObject ?? undefined,
      options
    })

    if (!hasExportObject(request)) {
      this.editor.errorManager.emitError({
        origin: 'ImageManager',
        method: 'exportObjectAsImageFile',
        code: 'NO_OBJECT_SELECTED',
        message: this.editor.t('image.errors.noObjectSelected'),
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
        message: this.editor.t('image.errors.objectExportFailed', {
          error: error instanceof Error ? error.message : String(error)
        }),
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

  /** Stops importing and releases the manager's blob URLs. */
  public destroy(): void {
    if (this._destroyed) return
    this._destroyed = true
    this.revokeBlobUrls()
  }

  /**
   * Removes all created blobURLs
   */
  public revokeBlobUrls(): void {
    this._blobUrls.revokeAll()
  }

  /**
   * Gets the list of allowed image formats
   * @returns Array of allowed image formats
   */
  public getAllowedFormatsFromContentTypes(): string[] {
    return resolveAllowedFormats({
      acceptContentTypes: this.acceptContentTypes
    })
  }

  /**
   * Checks whether contentType is an allowed image type.
   * @returns true if contentType is allowed, otherwise false
   */
  public isAllowedContentType(contentType = ''): boolean {
    return resolveIsAllowedContentType({
      contentType,
      acceptContentTypes: this.acceptContentTypes
    })
  }

  /**
   * Gets an image's contentType from its source
   * @param source - Image URL or File object
   * @returns Image MIME type
   * @public
   */
  public async getContentType(source: File | string): Promise<string> {
    if (typeof source === 'string') {
      return this.getContentTypeFromUrl(source)
    }

    return resolveContentType({
      t: this.editor.t,
      source,
      acceptContentTypes: this.acceptContentTypes
    })
  }

  /**
   * Gets an image's contentType through an HTTP HEAD request or URL analysis
   * @param src - Image URL
   * @returns Image MIME type
   * @public
   */
  public async getContentTypeFromUrl(src: string): Promise<string> {
    return resolveContentTypeFromUrl({
      t: this.editor.t,
      src,
      acceptContentTypes: this.acceptContentTypes
    })
  }

  /**
   * Determines contentType from the file extension in a URL
   * @param url - File URL
   * @returns MIME type
   * @public
   */
  public getContentTypeFromExtension(url: string): string {
    return resolveContentTypeFromExtension({
      t: this.editor.t,
      url,
      acceptContentTypes: this.acceptContentTypes
    })
  }

  /**
   * Calculates the image scale factor.
   * @param options - Options
   * @param options.imageObject - Image object
   * @param options.scaleType - Scaling type ('contain' or 'cover')
   * @returns Scale factor
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
   * Extracts the plain format (subtype) from contentType,
   * discarding anything after "+" or ";"
   * @param contentType
   * @returns Format, for example 'png', 'jpeg', 'svg'
   * @public
   */
  getFormatFromContentType(contentType = ''): string {
    return resolveFormatFromContentType(contentType)
  }
}
