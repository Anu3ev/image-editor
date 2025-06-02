import { loadSVGFromURL, FabricImage, util } from 'fabric'
import { nanoid } from 'nanoid'
import {
  CANVAS_MAX_WIDTH,
  CANVAS_MAX_HEIGHT
} from '../constants'

export default class ImageManager {
  /**
   * @param {object} options
   * @param {ImageEditor} options.editor - экземпляр редактора с доступом к canvas
   */
  constructor({
    editor
  }) {
    this.editor = editor
    this.options = editor.options
    this._createdBlobUrls = []

    this.acceptContentTypes = this.editor.options.acceptContentTypes
    this.acceptFormats = this.getAllowedFormatsFromContentTypes()
  }

  /**
   * Импорт изображения
   * @param {Object} options
   * @param {File|string} [options.source] - URL изображения или объект File
   * @param {String} [options.scale] - Если изображение не вписывается в допустимые размеры, то как масштабировать:
   * 'image-contain' - скейлит картинку, чтобы она вписалась в монтажную область
   * 'image-cover' - скейлит картинку, чтобы она вписалась в монтажную область
   * 'scale-montage' - Обновляет backstore-резолюцию монтажной области (масштабирует
   * экспортный размер канваса под размер изображения)
   * @param {Boolean} [options.withoutSave] - Не сохранять в историю изменений
   */
  async importImage({
    source,
    scale = `image-${this.options.scaleType}`,
    withoutSave = false
  }) {
    if (!source) return

    const { canvas, montageArea, transformManager, historyManager, errorManager } = this.editor

    const contentType = await this.getContentType(source)

    const { acceptContentTypes, acceptFormats } = this

    if (!this.isAllowedContentType(contentType)) {
      // eslint-disable-next-line max-len
      const message = `Неверный contentType для изображения: ${contentType}. Ожидается один из: ${this.acceptContentTypes.join(', ')}.`

      errorManager.emitError({
        origin: 'ImageManager',
        method: 'importImage',
        code: 'INVALID_CONTENT_TYPE',
        message,
        data: { contentType, source, acceptContentTypes, acceptFormats }
      })

      return
    }

    historyManager.suspendHistory()

    try {
      let dataUrl
      let img

      if (source instanceof File) {
        dataUrl = URL.createObjectURL(source)
      } else if (typeof source === 'string') {
        const resp = await fetch(source, { mode: 'cors' })
        const blob = await resp.blob({ type: contentType, quality: 1 })

        dataUrl = URL.createObjectURL(blob)
      } else {
        errorManager.emitError({
          origin: 'ImageManager',
          method: 'importImage',
          code: 'INVALID_SOURCE_TYPE',
          message: 'Неверный тип источника изображения. Ожидается URL или объект File.',
          data: { source, contentType, acceptContentTypes, acceptFormats }
        })

        return
      }

      // Создаем blobURL и добавляем его в массив для последующего удаления (destroy)
      this._createdBlobUrls.push(dataUrl)

      const format = ImageManager.getFormatFromContentType(contentType)

      // SVG: парсим через loadSVGFromURL и группируем в один объект
      if (format === 'svg') {
        const svgData = await loadSVGFromURL(dataUrl)
        img = util.groupSVGElements(svgData.objects, svgData.options)
      } else {
        // Создаем объект FabricImage из blobURL
        img = await FabricImage.fromURL(dataUrl, { crossOrigin: 'anonymous' })
      }

      const { width: imageWidth, height: imageHeight } = img

      // Если изображение больше максимальных размеров, то даунскейлим его
      if (imageHeight > CANVAS_MAX_HEIGHT || imageWidth > CANVAS_MAX_WIDTH) {
        const resizedBlob = await this.resizeImageToBoundaries(img._element.src, 'max')
        const resizedBlobURL = URL.createObjectURL(resizedBlob)
        this._createdBlobUrls.push(resizedBlobURL)

        // Создаем новый объект FabricImage из уменьшенного dataURL
        img = await FabricImage.fromURL(resizedBlobURL, { crossOrigin: 'anonymous' })
      }

      img.set('id', `${img.type}-${nanoid()}`)
      img.set('format', format)

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

      // Добавляем изображение, центрируем его и перерисовываем канвас
      canvas.add(img)
      canvas.centerObject(img)
      canvas.setActiveObject(img)
      canvas.renderAll()

      historyManager.resumeHistory()

      if (!withoutSave) {
        historyManager.saveState()
      }
    } catch (error) {
      errorManager.emitError({
        origin: 'ImageManager',
        method: 'importImage',
        code: 'IMPORT_FAILED',
        message: `Ошибка импорта изображения: ${error.message}`,
        data: { source, contentType, scale, withoutSave }
      })

      historyManager.resumeHistory()
    }
  }

  /**
   * Функция для ресайза изображения до максимальных размеров,
   * если оно их превышает. Сохраняет пропорции.
   *
   * @param {HTMLImageElement} imageEl - HTML элемент изображения
   * @param {string} [size='max | min'] - максимальный или минимальный размер
   * @returns {Promise<string>} - возвращает Promise с новым dataURL
   */
  async resizeImageToBoundaries(dataURL, size = 'max') {
    // eslint-disable-next-line max-len
    const message = `Размер изображения больше максимального размера канваса, поэтому оно будет уменьшено до максимальных размеров: ${CANVAS_MAX_WIDTH}x${CANVAS_MAX_HEIGHT}`

    this.editor.errorManager.emitWarning({
      origin: 'ImageManager',
      method: 'resizeImageToBoundaries',
      code: 'IMAGE_RESIZE_WARNING',
      message,
      data: { dataURL, size }
    })

    const newDataURL = await this.editor.workerManager.post('resizeImage', {
      dataURL,
      maxWidth: CANVAS_MAX_WIDTH,
      maxHeight: CANVAS_MAX_HEIGHT,
      sizeType: size
    })

    return newDataURL
  }

  /**
   * Экспорт изображения в файл – экспортируется содержимое монтажной области.
   * Независимо от текущего зума, экспортируется монтажная область в исходном масштабе. Можно экспортировать как base64.
   * @param {Object} options - опции
   * @param {string} options.fileName - имя файла
   * @param {string} options.contentType - тип контента
   * @param {Boolean} options.exportAsBase64 - экспортировать как base64
   * @param {Boolean} options.exportAsBlob - экспортировать как blob
   * @returns {Promise<File> | String} - файл или base64
   * @fires editor:canvas-exported
   */
  async exportCanvasAsImageFile({
    fileName = 'image.png',
    contentType = 'image/png',
    exportAsBase64 = false,
    exportAsBlob = false
  } = {}) {
    const { canvas, montageArea, workerManager } = this.editor

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

      // Задаём белый фон если это JPG
      if (['image/jpg', 'image/jpeg'].includes(adjustedContentType)) {
        tmpCanvas.backgroundColor = '#ffffff'
      }

      // Находим монтажную область в клонированном канвасе и скрываем её
      const tmpCanvasMontageArea = tmpCanvas.getObjects().find((obj) => obj.id === montageArea.id)
      tmpCanvasMontageArea.visible = false

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
      const blob = await new Promise((resolve) => { tmpCanvas.getElement().toBlob(resolve) })

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

        const JsPDF = (await this.editor.moduleLoader.loadModule('jspdf')).jsPDF

        const pdf = new JsPDF({
          orientation: pdfWidth > pdfHeight ? 'landscape' : 'portrait',
          unit: 'mm',
          format: [pdfWidth, pdfHeight]
        })

        // Добавляем изображение в PDF. Используем формат PNG для изображения
        pdf.addImage(dataUrl, 'JPG', 0, 0, pdfWidth, pdfHeight)

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
        message: `Ошибка экспорта изображения: ${error.message}`,
        data: { contentType, fileName, exportAsBase64, exportAsBlob }
      })

      return ''
    }
  }

  /**
   * Экспорт выбранного объекта в виде изображения или base64
   * @param {Object} options - опции
   * @param {fabric.Object} options.object - объект для экспорта
   * @param {String} options.fileName - имя файла
   * @param {String} options.contentType - тип контента
   * @param {Boolean} options.exportAsBase64 - экспортировать как base64
   * @param {Boolean} options.exportAsBlob - экспортировать как blob
   * @returns {String} base64
   * @fires editor:object-exported
   */
  async exportObjectAsImageFile({
    object,
    fileName = 'image.png',
    contentType = 'image/png',
    exportAsBase64 = false,
    exportAsBlob = false
  } = {}) {
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

      return ''
    }

    try {
      const format = ImageManager.getFormatFromContentType(contentType)

      if (format === 'svg') {
      // Конвертируем fabric.Object в SVG-строку
        const svgString = activeObject.toSVG()

        const svg = this._exportSVGStringAsFile(svgString, {
          exportAsBase64,
          exportAsBlob,
          fileName
        })

        const data = {
          image: svg,
          format,
          contentType: 'image/svg+xml',
          fileName: fileName.replace(/\.[^/.]+$/, '.svg')
        }

        canvas.fire('editor:object-exported', data)
        return data
      }

      if (exportAsBase64) {
        const bitmap = await createImageBitmap(activeObject._element)
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
          image: dataUrl,
          format,
          contentType,
          fileName
        }

        canvas.fire('editor:object-exported', data)
        return data
      }

      const activeObjectCanvas = activeObject.toCanvasElement()
      const activeObjectBlob = await new Promise((resolve) => { activeObjectCanvas.toBlob(resolve) })

      if (exportAsBlob) {
        const data = {
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
        message: `Ошибка экспорта объекта: ${error.message}`,
        data: { contentType, fileName, exportAsBase64, exportAsBlob }
      })

      return ''
    }
  }

  /**
   * Удаляет все созданные blobURL
   * @returns {void}
   */
  revokeBlobUrls() {
    this._createdBlobUrls.forEach(URL.revokeObjectURL)
    this._createdBlobUrls = []
  }

  /**
   * Преобразует SVG-строку в Blob, файл, или base64
   * @param {string} svgString - SVG-строка
   * @param {Object} options - опции
   * @param {Boolean} options.exportAsBase64 - экспортировать как base64
   * @param {Boolean} options.exportAsBlob - экспортировать как blob
   * @param {String} options.fileName - имя файла
   * @returns {Blob|String|File} - Blob, base64 или файл
   * @private
   * @static
   */
  static _exportSVGStringAsFile(svgString, { exportAsBase64, exportAsBlob, fileName } = {}) {
    if (exportAsBlob) {
      return new Blob([svgString], { type: 'image/svg+xml' })
    }

    if (exportAsBase64) {
      return `data:image/svg+xml;base64,${btoa(svgString)}`
    }

    return new File([svgString], fileName.replace(/\.[^/.]+$/, '.svg'), { type: 'image/svg+xml' })
  }

  /**
   * Получает список допустимых форматов изображений
   * @returns {string[]} - массив допустимых форматов изображений
   */
  getAllowedFormatsFromContentTypes() {
    return this.acceptContentTypes
      .map((contentType) => ImageManager.getFormatFromContentType(contentType))
      .filter((format) => format)
  }

  /**
   * Извлекает чистый формат (subtype) из contentType,
   * отбросив любую часть после «+» или «;»
   * @param {string} contentType
   * @returns {string} формат, например 'png', 'jpeg', 'svg'
   * @static
   */
  static getFormatFromContentType(contentType = '') {
    const match = contentType.match(/^[^/]+\/([^+;]+)/)
    return match ? match[1] : ''
  }

  /**
   * Проверяет, является ли contentType допустимым типом изображения.
   * @param {string} contentType - тип контента
   * @returns {boolean} true, если contentType допустим, иначе false
   */
  isAllowedContentType(contentType = '') {
    return this.acceptContentTypes.includes(contentType)
  }

  /**
   * Получает contentType изображения из источника
   * @param {File|string} source - URL изображения или объект File
   * @returns {Promise<string>|string} - MIME-тип изображения
   * @public
   */
  async getContentType(source) {
    if (typeof source === 'string') {
      return this.getContentTypeFromUrl(source)
    }

    return source.type || 'application/octet-stream'
  }

  /**
   * Получает contentType изображения через HTTP HEAD запрос или анализ URL
   * @param {string} src - URL изображения
   * @returns {Promise<string>} - MIME-тип изображения
   * @public
   */
  async getContentTypeFromUrl(src) {
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
   * @param {string} url - URL файла
   * @returns {string} - MIME-тип
   * @public
   */
  getContentTypeFromExtension(url) {
    try {
      const urlObj = new URL(url)
      const extension = urlObj.pathname.split('.').pop()?.toLowerCase()

      // Создаем mimeMap из acceptContentTypes
      const mimeMap = {}
      this.acceptContentTypes.forEach((contentType) => {
        const format = ImageManager.getFormatFromContentType(contentType)
        if (format) {
          mimeMap[format] = contentType
        }
      })

      return mimeMap[extension] || 'application/octet-stream'
    } catch (error) {
      console.warn('Не удалось определить расширение из URL:', url, error)
      return 'application/octet-stream'
    }
  }

  /**
   * Рассчитывает коэффициент масштабирования изображения.
   * @param {object} imageObject - объект изображения
   * @param {string} scaleType - тип масштабирования ('contain' или 'cover')
   * @returns {number} коэффициент масштабирования
   */
  calculateScaleFactor({ imageObject, scaleType = 'contain' }) {
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
}
