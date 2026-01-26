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
  maxWidth?: number,
  maxHeight?: number,
  minWidth?: number,
  minHeight?: number,
  asBase64?: boolean,
  asBlob?: boolean
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

type JsPDFModule = {
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
   * Импорт изображения
   * @param options
   * @param options.source - URL изображения или объект File
   * @param options.scale - Если изображение не вписывается в допустимые размеры, то как масштабировать:
   * 'image-contain' - скейлит картинку, чтобы она вписалась в монтажную область
   * 'image-cover' - скейлит картинку, чтобы она вписалась в монтажную область
   * 'scale-montage' - Обновляет backstore-резолюцию монтажной области (масштабирует
   * экспортный размер канваса под размер изображения)
   * @param options.withoutSave - Не сохранять в историю изменений
   * @returns возвращает Promise с объектом изображения или null в случае ошибки
   */
  public async importImage(options: ImportImageOptions): Promise<SuccessulImageImportResult | null> {
    const {
      source,
      scale = `image-${this.options.scaleType}`,
      withoutSave = false,
      fromClipboard = false,
      isBackground = false,
      withoutSelection = false,
      withoutAdding = false,
      customData = null
    } = options

    if (!source) return null

    const { canvas, montageArea, transformManager, historyManager, errorManager } = this.editor

    const contentType = await this.getContentType(source)
    const format = ImageManager.getFormatFromContentType(contentType)

    const { acceptContentTypes, acceptFormats } = this

    if (!this.isAllowedContentType(contentType)) {
      // eslint-disable-next-line max-len
      const message = `Неверный contentType для изображения: ${contentType}. Ожидается один из: ${this.acceptContentTypes.join(', ')}.`

      errorManager.emitError({
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

      return null
    }

    historyManager.suspendHistory()

    try {
      let dataUrl
      let img

      if (source instanceof File) {
        dataUrl = URL.createObjectURL(source)
      } else if (typeof source === 'string') {
        const resp = await fetch(source, { mode: 'cors' })
        const blob = await resp.blob()

        dataUrl = URL.createObjectURL(blob)
      } else {
        errorManager.emitError({
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

        historyManager.resumeHistory()
        return null
      }

      // Создаем blobURL и добавляем его в массив для последующего удаления (destroy)
      this._createdBlobUrls.push(dataUrl)

      // SVG: парсим через loadSVGFromURL и группируем в один объект
      if (format === 'svg') {
        const svgData = await loadSVGFromURL(dataUrl)

        img = util.groupSVGElements(svgData.objects as FabricObject[], svgData.options)
      } else {
        // Создаем объект FabricImage из blobURL
        img = await FabricImage.fromURL(dataUrl, { crossOrigin: 'anonymous' })
      }

      const { width: imageWidth, height: imageHeight } = img

      if (img instanceof FabricImage) {
        const imageElement = img.getElement()

        let imageSrc: string = ''

        if (imageElement instanceof HTMLImageElement) {
          imageSrc = imageElement.src
        } else if (imageElement instanceof HTMLCanvasElement) {
          imageSrc = imageElement.toDataURL()
        }

        // Если изображение больше максимальных размеров, то даунскейлим его
        if (imageHeight > CANVAS_MAX_HEIGHT || imageWidth > CANVAS_MAX_WIDTH) {
          const resizedBlob = await this.resizeImageToBoundaries({
            dataURL: imageSrc,
            sizeType: 'max'
          })
          const resizedBlobURL = URL.createObjectURL(resizedBlob)
          this._createdBlobUrls.push(resizedBlobURL)

          // Создаем новый объект FabricImage из уменьшенного dataURL
          img = await FabricImage.fromURL(resizedBlobURL, { crossOrigin: 'anonymous' })
        } else if (imageHeight < CANVAS_MIN_HEIGHT || imageWidth < CANVAS_MIN_WIDTH) {
          // Если изображение меньше минимальных размеров, то апскейлим его
          const resizedBlob = await this.resizeImageToBoundaries({
            dataURL: imageSrc,
            sizeType: 'min'
          })
          const resizedBlobURL = URL.createObjectURL(resizedBlob)
          this._createdBlobUrls.push(resizedBlobURL)

          // Создаем новый объект FabricImage из увеличенного dataURL
          img = await FabricImage.fromURL(resizedBlobURL, { crossOrigin: 'anonymous' })
        }
      }

      img.set('id', `${img.type}-${nanoid()}`)
      img.set('format', format)
      img.set('customData', customData || null)

      // Растягиваем монтажную область под изображение или наоборот
      if (scale === 'scale-montage') {
        this.editor.canvasManager.scaleMontageAreaToImage({ object: img, withoutSave: true })
      } else {
        const { width: montageAreaWidth, height: montageAreaHeight } = montageArea

        const scaleFactor = this.calculateScaleFactor({ imageObject: img, scaleType: scale })

        if (scale === 'image-contain' && scaleFactor < 1) {
          transformManager.fitObject({ object: img, type: 'contain', withoutSave: true })
        } else if (
          scale === 'image-cover'
          && (imageWidth > montageAreaWidth || imageHeight > montageAreaHeight)
        ) {
          transformManager.fitObject({ object: img, type: 'cover', withoutSave: true })
        }
      }

      const result = {
        image: img,
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

      // Добавляем изображение, центрируем его и перерисовываем канвас
      canvas.add(img)
      canvas.centerObject(img)

      if (!withoutSelection) {
        canvas.setActiveObject(img)
      }

      canvas.renderAll()

      historyManager.resumeHistory()

      if (!withoutSave) {
        historyManager.saveState()
      }

      canvas.fire('editor:image-imported', result)

      return result
    } catch (error) {
      errorManager.emitError({
        origin: 'ImageManager',
        method: 'importImage',
        code: 'IMPORT_FAILED',
        message: `Ошибка импорта изображения: ${(error as Error).message}`,
        data: {
          source,
          format,
          contentType,
          scale,
          withoutSave,
          fromClipboard,
          isBackground,
          withoutSelection,
          withoutAdding,
          customData
        }
      })

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
   * @returns возвращает Promise с Blob или base64 в зависимости от опций
   */
  public async resizeImageToBoundaries(
    options: ResizeImageToBoundariesOptions
  ): Promise<Blob | Base64URLString> {
    const {
      dataURL,
      sizeType = 'max',
      maxWidth = CANVAS_MAX_WIDTH,
      maxHeight = CANVAS_MAX_HEIGHT,
      minWidth = CANVAS_MIN_WIDTH,
      minHeight = CANVAS_MIN_HEIGHT,
      asBase64 = false,
      emitMessage = true
    } = options

    const { errorManager, workerManager } = this.editor

    const data = {
      dataURL,
      sizeType,
      maxWidth,
      maxHeight,
      minWidth,
      minHeight
    }

    if (emitMessage) {
      // eslint-disable-next-line max-len
      let message = `Размер изображения больше максимального размера канваса, поэтому оно будет уменьшено до максимальных размеров c сохранением пропорций: ${maxWidth}x${maxHeight}`

      if (sizeType === 'min') {
        // eslint-disable-next-line max-len
        message = `Размер изображения меньше минимального размера канваса, поэтому оно будет увеличено до минимальных размеров c сохранением пропорций: ${minWidth}x${minHeight}`
      }

      errorManager.emitWarning({
        origin: 'ImageManager',
        method: 'resizeImageToBoundaries',
        code: 'IMAGE_RESIZE_WARNING',
        message,
        data
      })
    }

    const resizedBlob = await workerManager.post('resizeImage', data) as Blob

    if (asBase64) {
      const contentType = await this.getContentTypeFromUrl(dataURL)
      const format = ImageManager.getFormatFromContentType(contentType)
      const outputFormat = format || 'png'
      const bitmap = await createImageBitmap(resizedBlob)
      const dataUrl = await workerManager.post(
        'toDataURL',
        { format: outputFormat, quality: 1, bitmap },
        [bitmap]
      ) as Base64URLString

      return dataUrl
    }

    return resizedBlob
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

    const { canvas, montageArea, workerManager, interactionBlocker } = this.editor

    try {
      const isPDF = contentType === 'application/pdf'
      // Если это PDF, то дальше нам нужен будет .jpg
      const adjustedContentType = isPDF ? 'image/jpg' : contentType

      const format = ImageManager.getFormatFromContentType(adjustedContentType)

      // Пересчитываем координаты монтажной области:
      montageArea.setCoords()

      // Получаем координаты монтажной области.
      const { left, top, width, height } = montageArea.getBoundingRect()

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

      // Получаем blob из клонированного канваса
      const blob: Blob = await new Promise((resolve, reject) => {
        tmpCanvas.getElement().toBlob((canvasBlob) => {
          if (canvasBlob) {
            resolve(canvasBlob)
          } else {
            reject(new Error('Failed to create Blob from canvas'))
          }
        })
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
        { format, quality: 1, bitmap },
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
      fileName = 'image.png',
      contentType = 'image/png',
      exportAsBase64 = false,
      exportAsBlob = false
    } = options

    const { canvas, workerManager } = this.editor

    const activeObject = object || canvas.getActiveObject()

    if (!activeObject) {
      this.editor.errorManager.emitError({
        origin: 'ImageManager',
        method: 'exportObjectAsImageFile',
        code: 'NO_OBJECT_SELECTED',
        message: 'Не выбран объект для экспорта',
        data: { contentType, fileName, exportAsBase64, exportAsBlob }
      })

      return null
    }

    try {
      const format = ImageManager.getFormatFromContentType(contentType)

      if (format === 'svg') {
      // Конвертируем fabric.Object в SVG-строку
        const svgString = activeObject.toSVG()

        const svg = ImageManager._exportSVGStringAsFile(svgString, {
          exportAsBase64,
          exportAsBlob,
          fileName
        })

        const data = {
          object: activeObject,
          image: svg,
          format,
          contentType: 'image/svg+xml',
          fileName: fileName.replace(/\.[^/.]+$/, '.svg')
        }

        canvas.fire('editor:object-exported', data)
        return data
      }

      if (exportAsBase64 && activeObject instanceof FabricImage) {
        const bitmap = await createImageBitmap(activeObject.getElement())
        const dataUrl = await workerManager.post(
          'toDataURL',
          {
            format,
            quality: 1,
            bitmap
          },
          [bitmap]
        )

        const data = {
          object: activeObject,
          image: dataUrl,
          format,
          contentType,
          fileName
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
          contentType,
          fileName
        }

        canvas.fire('editor:object-exported', data)
        return data
      }

      // Преобразуем Blob в File
      const file = new File([activeObjectBlob], fileName, { type: contentType })

      const data = {
        object: activeObject,
        image: file,
        format,
        contentType,
        fileName
      }

      canvas.fire('editor:object-exported', data)
      return data
    } catch (error) {
      this.editor.errorManager.emitError({
        origin: 'ImageManager',
        method: 'exportObjectAsImageFile',
        code: 'IMAGE_EXPORT_FAILED',
        message: `Ошибка экспорта объекта: ${(error as Error).message}`,
        data: { contentType, fileName, exportAsBase64, exportAsBlob }
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
      .map((contentType) => ImageManager.getFormatFromContentType(contentType))
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
        const format = ImageManager.getFormatFromContentType(contentType)
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
   * @static
   */
  static getFormatFromContentType(contentType = ''): string {
    const match = contentType.match(/^[^/]+\/([^+;]+)/)
    return match ? match[1] : ''
  }
}
