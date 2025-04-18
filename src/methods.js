import { nanoid } from 'nanoid'
import { jsPDF as JsPDF } from 'jspdf'

import {
  DEFAULT_ZOOM_RATIO,
  DEFAULT_ROTATE_RATIO,
  CANVAS_MIN_WIDTH,
  CANVAS_MIN_HEIGHT,
  CANVAS_MAX_WIDTH,
  CANVAS_MAX_HEIGHT
} from './constants'

import {
  calculateScaleFactor,
  centerCanvas,
  diffPatcher
} from './helpers'

/**
 * Методы для работы с канвасом
 * @param {Object} params
 * @param {Object} params.fabric - объект fabric
 * @param {Object} params.editorOptions - опции редактора
 *
 * @returns {Object} методы для работы с канвасом
 */
export default ({ fabric, editorOptions }) => ({
  /**
   * Устанавливаем внутреннюю ширину канваса (для экспорта)
   * @param {String} width
   * @param {Object} options
   * @param {Boolean} options.preserveProportional - Сохранить пропорции
   * @param {Boolean} options.withoutSave - Не сохранять состояние
   * @fires editor:resolution-width-changed
   */
  setResolutionWidth(width, options = {}) {
    if (!width) return

    const { preserveProportional, withoutSave, adaptCanvasToContainer } = options
    const { width: montageAreaWidth, height: montageAreaHeight } = this.montageArea

    const adjustedWidth = Number(Math.max(Math.min(width, CANVAS_MAX_WIDTH), CANVAS_MIN_WIDTH))

    const { canvasBackstoreWidth } = editorOptions

    // Если ширина канваса не задана или равна 'auto', адаптируем канвас к контейнеру
    if (!canvasBackstoreWidth || canvasBackstoreWidth === 'auto' || adaptCanvasToContainer) {
      this.adaptCanvasToContainer()
    } else if (canvasBackstoreWidth) {
      this.setCanvasBackstoreWidth(canvasBackstoreWidth)
    } else {
      this.setCanvasBackstoreWidth(adjustedWidth)
    }

    // Обновляем размеры montageArea и clipPath
    this.montageArea.set({ width: adjustedWidth })
    this.canvas.clipPath.set({ width: adjustedWidth })

    // Если нужно сохранить пропорции, вычисляем новую высоту
    if (preserveProportional) {
      const factor = adjustedWidth / montageAreaWidth
      const newHeight = montageAreaHeight * factor
      this.setResolutionHeight(newHeight)

      return
    }

    const { left, top } = this.getObjectDefaultCoords(this.montageArea)

    const currentZoom = this.canvas.getZoom()

    this.canvas.setViewportTransform([currentZoom, 0, 0, currentZoom, left, top])

    // Центрируем montageArea и clipPath
    centerCanvas(this.canvas, this.montageArea)

    if (!withoutSave) {
      this.saveState()
    }

    this.canvas?.fire('editor:resolution-width-changed', { width })
  },

  /**
   * Устанавливаем внутреннюю высоту канваса (для экспорта)
   * @param {String} height
   * @param {Object} options
   * @param {Boolean} options.preserveProportional - Сохранить пропорции
   * @param {Boolean} options.withoutSave - Не сохранять состояние
   * @fires editor:resolution-height-changed
   */
  setResolutionHeight(height, options = {}) {
    if (!height) return

    const { preserveProportional, withoutSave, adaptCanvasToContainer } = options
    const { width: montageAreaWidth, height: montageAreaHeight } = this.montageArea

    const adjustedHeight = Number(Math.max(Math.min(height, CANVAS_MAX_HEIGHT), CANVAS_MIN_HEIGHT))

    const { canvasBackstoreHeight } = editorOptions

    if (!canvasBackstoreHeight || canvasBackstoreHeight === 'auto' || adaptCanvasToContainer) {
      this.adaptCanvasToContainer()
    } else if (canvasBackstoreHeight) {
      this.setCanvasBackstoreHeight(canvasBackstoreHeight)
    } else {
      this.setCanvasBackstoreHeight(adjustedHeight)
    }

    // Обновляем размеры montageArea и clipPath
    this.montageArea.set({ height: adjustedHeight })
    this.canvas.clipPath.set({ height: adjustedHeight })

    // Если нужно сохранить пропорции, вычисляем новую ширину
    if (preserveProportional) {
      const factor = adjustedHeight / montageAreaHeight
      const newWidth = montageAreaWidth * factor

      this.setResolutionWidth(newWidth)

      return
    }

    const { left, top } = this.getObjectDefaultCoords(this.montageArea)

    const currentZoom = this.canvas.getZoom()
    this.canvas.setViewportTransform([currentZoom, 0, 0, currentZoom, left, top])

    // Центрируем clipPath и монтажную область относительно новых размеров
    // centerCanvas(this.canvas, this.montageArea)

    this.centerMontageArea()

    if (!withoutSave) {
      this.saveState()
    }

    this.canvas?.fire('editor:resolution-height-changed', { height })
  },

  /**
   * Центрирует монтажную область и ClipPath точно по центру канваса
   * и устанавливает правильный viewportTransform.
   */
  centerMontageArea() {
    const canvasWidth = this.canvas.getWidth()
    const canvasHeight = this.canvas.getHeight()

    const currentZoom = this.canvas.getZoom()

    const centerCanvasPoint = new fabric.Point(canvasWidth / 2, canvasHeight / 2)

    // Устанавливаем origin монтажной области в центр канваса без зума
    this.montageArea.set({
      left: canvasWidth / 2,
      top: canvasHeight / 2
    })

    this.canvas.clipPath.set({
      left: canvasWidth / 2,
      top: canvasHeight / 2
    })

    this.canvas.renderAll()

    // Заново устанавливаем viewportTransform, чтобы монтажная область была точно по центру с учётом зума
    const vpt = this.canvas.viewportTransform
    vpt[4] = canvasWidth / 2 - centerCanvasPoint.x * currentZoom
    vpt[5] = canvasHeight / 2 - centerCanvasPoint.y * currentZoom

    this.canvas.setViewportTransform(vpt)
    this.canvas.renderAll()
  },

  /**
   * Метод для получения координат объекта с учетом текущего зума
   * @param {fabric.Object} object - объект, координаты которого нужно получить
   * @returns {Object} координаты объекта
   */
  getObjectDefaultCoords(object) {
    const activeObject = object || this.canvas.getActiveObject()

    if (!activeObject) {
      console.error('getObjectDefaultCoords. Не выбран объект')

      this.canvas.fire('editor:error', {
        message: 'Не выбран объект для получения координат'
      })

      return {}
    }

    const { width, height } = activeObject

    const currentZoom = this.canvas.getZoom()
    const left = (width - (width * currentZoom)) / 2
    const top = (height - (height * currentZoom)) / 2

    return { left, top }
  },

  setCanvasBackstoreWidth(width) {
    if (!width || typeof width !== 'number') return

    const adjustedWidth = Math.max(Math.min(width, CANVAS_MAX_WIDTH), CANVAS_MIN_WIDTH)

    this.canvas.setDimensions({ width: adjustedWidth }, { backstoreOnly: true })
  },

  setCanvasBackstoreHeight(height) {
    if (!height || typeof height !== 'number') return

    const adjustedHeight = Math.max(Math.min(height, CANVAS_MAX_HEIGHT), CANVAS_MIN_HEIGHT)

    this.canvas.setDimensions({ height: adjustedHeight }, { backstoreOnly: true })
  },

  adaptCanvasToContainer() {
    const container = this.canvas.editorContainer
    const cw = container.clientWidth
    const ch = container.clientHeight

    const width = Math.max(Math.min(cw, CANVAS_MAX_WIDTH), CANVAS_MIN_WIDTH)
    const height = Math.max(Math.min(ch, CANVAS_MAX_HEIGHT), CANVAS_MIN_HEIGHT)

    console.log('adaptCanvasToContainer newWidth', width)
    console.log('adaptCanvasToContainer newHeight', height)

    this.canvas.setDimensions({ width, height }, { backstoreOnly: true })
  },

  /**
   * Устанавливаем CSS ширину канваса для отображения
   * @param {string|number} width
   * @fires editor:display-canvas-width-changed
   */
  setCanvasCSSWidth(value) {
    this.setDisplayDimension({
      element: 'canvas',
      dimension: 'width',
      value
    })
  },

  /**
   * Устанавливаем CSS высоту канваса для отображения
   * @param {string|number} height
   * @fires editor:display-canvas-height-changed
   */
  setCanvasCSSHeight(value) {
    this.setDisplayDimension({
      element: 'canvas',
      dimension: 'height',
      value
    })
  },

  /**
   * Устанавливаем CSS ширину обертки канваса для отображения
   * @param {string|number} width
   * @fires editor:display-wrapper-width-changed
   */
  setCanvasWrapperWidth(value) {
    this.setDisplayDimension({
      element: 'wrapper',
      dimension: 'width',
      value
    })
  },

  /**
   * Устанавливаем CSS высоту обертки канваса для отображения
   * @param {string|number} height
   * @fires editor:display-wrapper-height-changed
   */
  setCanvasWrapperHeight(value) {
    this.setDisplayDimension({
      element: 'wrapper',
      dimension: 'height',
      value
    })
  },

  /**
   * Устанавливаем CSS ширину контейнера редактора для отображения
   * @param {string|number} width
   * @fires editor:display-container-width-changed
   */
  setEditorContainerWidth(value) {
    this.setDisplayDimension({
      element: 'container',
      dimension: 'width',
      value
    })
  },

  /**
   * Устанавливаем CSS высоту контейнера редактора для отображения
   * @param {string|number} height
   * @fires editor:display-container-height-changed
   */
  setEditorContainerHeight(value) {
    this.setDisplayDimension({
      element: 'container',
      dimension: 'height',
      value
    })
  },

  /**
   * Устанавливаем CSS ширину или высоту канваса для отображения
   * @param {Object} options
   * @param {String} [options.element] - элемент, для которого устанавливаем размеры:
   * canvas (upper & lower), wrapper, container
   * @param {('width'|'height')} [options.dimension]
   * @param {string|number} [options.value]
   * @fires editor:display-{element}-{dimension}-changed
   */
  setDisplayDimension({ element, dimension, value }) {
    if (!value) return

    const canvasElements = []

    switch (element) {
    case 'canvas':
      canvasElements.push(this.canvas.lowerCanvasEl, this.canvas.upperCanvasEl)
      break
    case 'wrapper':
      canvasElements.push(this.canvas.wrapperEl)
      break
    case 'container':
      canvasElements.push(editorOptions.editorContainer)
      break
    default:
      canvasElements.push(this.canvas.lowerCanvasEl, this.canvas.upperCanvasEl)
    }

    const cssDimension = dimension === 'width' ? 'width' : 'height'

    // Если строка, то просто устанавливаем
    if (typeof value === 'string') {
      canvasElements.forEach((el) => { el.style[cssDimension] = value })

      return
    }

    // Если число, то добавляем px
    const numericValue = parseFloat(value)

    // eslint-disable-next-line no-restricted-globals
    if (isNaN(numericValue)) return

    const newValuePx = `${numericValue}px`
    canvasElements.forEach((el) => { el.style[cssDimension] = newValuePx })

    this.canvas.fire(`editor:display-${element}-${cssDimension}-changed`, {
      element,
      value
    })
  },

  /**
   * Приостанавливает сохранение истории
   */
  suspendHistory() {
    this._historySuspendCount += 1
  },

  /**
   * Возобновляет сохранение истории
   */
  resumeHistory() {
    this._historySuspendCount = Math.max(0, this._historySuspendCount - 1)
  },

  /**
   * Создаёт overlay для блокировки монтажной области
   */
  createDisabledOverlay() {
    this.suspendHistory()
    // получаем в экранных координатах то, что отображает монтажную зону
    this.montageArea.setCoords()
    const { left, top, width, height } = this.montageArea.getBoundingRect()

    // создаём overlay‑объект
    this.disabledOverlay = new fabric.Rect({
      left,
      top,
      width,
      height,
      fill: 'rgba(136, 136, 136, 0.4)',
      selectable: false, // не даём выделить его
      evented: true, // но при этом он перехватывает все события мыши
      hoverCursor: 'not‑allowed',
      hasBorders: false,
      hasControls: false
    })

    // рисуем его поверх всех
    this.canvas.add(this.disabledOverlay)
    this.canvas.renderAll()
    this.resumeHistory()
  },

  /**
   * Обновляет размеры и позицию overlay, выносит его на передний план
   */
  updateDisabledOverlay() {
    this.suspendHistory()
    if (!this.disabledOverlay) return

    // получаем в экранных координатах то, что отображает монтажную зону
    this.montageArea.setCoords()
    const { left, top, width, height } = this.montageArea.getBoundingRect()

    // обновляем размеры и позицию overlay
    this.disabledOverlay.set({ left, top, width, height })
    this.canvas.discardActiveObject()
    this.bringToFront(this.disabledOverlay, { withoutSave: true })
    this.resumeHistory()
  },

  /**
   * Выключает редактор:
   * 1) убирает все селекты, события мыши, скейл/драг–н–дроп
   * 2) делает все объекты не‑evented и не‑selectable
   * 3) делает видимым disabledOverlay поверх всех объектов в монтажной области
   */
  disable() {
    this.suspendHistory()
    if (this.isDisabled) return
    this.isDisabled = true

    // 1) Убираем все селекты, события мыши, скейл/драг–н–дроп
    this.canvas.discardActiveObject()
    this.canvas.selection = false
    this.canvas.skipTargetFind = true

    // 2) Делаем все объекты не‑evented и не‑selectable
    this.canvas.getObjects().forEach((obj) => {
      obj.evented = false
      obj.selectable = false
    })

    // 3) (опционально) блокируем сами canvas‑элементы в DOM
    this.canvas.upperCanvasEl.style.pointerEvents = 'none'
    this.canvas.lowerCanvasEl.style.pointerEvents = 'none'

    this.disabledOverlay.visible = true
    this.bringToFront(this.disabledOverlay, { withoutSave: true })

    console.log('EDITOR DISABLED', this.isDisabled)

    this.canvas.fire('editor:disabled')
    this.resumeHistory()
  },

  /**
   * Включает редактор
   */
  enable() {
    if (!this.isDisabled) return
    this.isDisabled = false

    // 1) возвращаем интерактивность
    this.canvas.selection = true
    this.canvas.skipTargetFind = false

    // 2) возвращаем селекты & ивенты
    this.canvas.getObjects().forEach((obj) => {
      obj.evented = true
      obj.selectable = true
    })

    // 3) разблокируем DOM
    this.canvas.upperCanvasEl.style.pointerEvents = ''
    this.canvas.lowerCanvasEl.style.pointerEvents = ''
    this.disabledOverlay.visible = false
    this.canvas.requestRenderAll()

    this.canvas.fire('editor:enabled')
  },

  /**
   * Импорт изображения
   * @param {Object} options
   * @param {String} [options.url] - URL изображения
   * @param {String} [options.scale] - Если изображение не вписывается в допустимые размеры, то как масштабировать:
   * 'image-contain' - скейлит картинку, чтобы она вписалась в монтажную область
   * 'image-cover' - скейлит картинку, чтобы она вписалась в монтажную область
   * 'scale-montage' - Обновляет backstore-резолюцию монтажной области (масштабирует
   * экспортный размер канваса под размер изображения)
   */
  async importImage({ url, scale = `image-${editorOptions.scaleType}`, withoutSave = false }) {
    if (!url || typeof url !== 'string') return

    if (withoutSave) {
      this.suspendHistory()
    }

    try {
      let img = await fabric.FabricImage.fromURL(url, { crossOrigin: 'anonymous' })

      const { width: montageAreaWidth, height: montageAreaHeight } = this.montageArea

      const { width: imageWidth, height: imageHeight } = img

      if (imageHeight > CANVAS_MAX_HEIGHT || imageWidth > CANVAS_MAX_WIDTH) {
        const message = `Размер изображения больше максимального размера канваса, поэтому оно будет уменьшено до максимальных размеров: ${CANVAS_MAX_WIDTH}x${CANVAS_MAX_HEIGHT}`

        console.warn(`importImage. ${message}`)

        this.canvas.fire('editor:warning', {
          message
        })

        // Делаем небольшую задержку, чтобы сначала сработал warning
        await new Promise((resolve) => { setTimeout(resolve, 250) })

        console.time('resizeImageToBoundaries')
        const dataURL = await this.resizeImageToBoundaries(img._element, 'max')
        // Создаем новый объект FabricImage из уменьшенного dataURL
        img = await fabric.FabricImage.fromURL(dataURL, { crossOrigin: 'anonymous' })
        console.timeEnd('resizeImageToBoundaries')
      }

      if (scale === 'scale-montage') {
        this.scaleMontageAreaToImage({ object: img, withoutSave })
      } else {
        const scaleFactor = calculateScaleFactor({ montageArea: this.montageArea, imageObject: img, scaleType: scale })

        if (scale === 'image-contain' && scaleFactor < 1) {
          this.imageFit({ object: img, type: 'contain' })
        } else if (
          scale === 'image-cover'
          && (imageWidth > montageAreaWidth || imageHeight > montageAreaHeight)
        ) {
          this.imageFit({ object: img, type: 'cover' })
        }
      }

      img.set('id', `${img.type}-${nanoid()}`)

      // Добавляем изображение, центрируем его и перерисовываем канвас
      this.canvas.add(img)
      this.canvas.centerObject(img)
      this.canvas.setActiveObject(img)
      this.canvas.renderAll()
    } catch (error) {
      console.error('importImage. Ошибка импорта изображения: ', error)

      this.canvas.fire('editor:error', {
        message: `Ошибка импорта изображения: ${error.message}`
      })
    } finally {
      this.resumeHistory()
    }
  },

  /**
   * Функция для ресайза изображения до максимальных размеров,
   * если оно превышает лимит. Сохраняет пропорции.
   *
   * @param {HTMLImageElement} imageEl - HTML элемент изображения
   * @param {string} [size='max | min'] - максимальный или минимальный размер
   * @returns {Promise<string>} - возвращает Promise с новым dataURL
   */
  resizeImageToBoundaries(imageEl, size = 'max') {
    return new Promise((resolve) => {
      const { naturalWidth: width, naturalHeight: height } = imageEl

      let ratio = Math.min(CANVAS_MAX_WIDTH / width, CANVAS_MAX_HEIGHT / height)

      if (size === 'min') {
        ratio = Math.max(CANVAS_MIN_WIDTH / width, CANVAS_MIN_HEIGHT / height)
      }

      const newWidth = Math.floor(width * ratio)
      const newHeight = Math.floor(height * ratio)

      // Создаем off-screen canvas
      const canvas = document.createElement('canvas')
      canvas.width = newWidth
      canvas.height = newHeight
      const ctx = canvas.getContext('2d')
      // Отрисовываем изображение с уменьшенными размерами
      ctx.drawImage(imageEl, 0, 0, width, height, 0, 0, newWidth, newHeight)
      // Получаем новый dataURL
      const dataURL = canvas.toDataURL()
      resolve(dataURL)
      canvas.remove()
    })
  },

  /**
   * Масштабирование изображения
   * @param {Object} options
   * @param {fabric.Object} [options.object] - Объект с изображением, которое нужно масштабировать
   * @param {String} [options.type] - Тип масштабирования
   * 'contain' - скейлит картинку, чтобы она вмещалась
   * 'cover' - скейлит картинку, чтобы она вписалась в размер канвас
   * @param {Boolean} [options.withoutSave] - Не сохранять состояние
   * @fires editor:image-fitted
   */
  imageFit(options = {}) {
    const { object, type = editorOptions.scaleType, withoutSave } = options

    const image = object || this.canvas.getActiveObject()

    if (image?.type !== 'image') return

    const scaleFactor = calculateScaleFactor({ montageArea: this.montageArea, imageObject: image, scaleType: type })

    image.scale(scaleFactor)
    this.canvas.centerObject(image)
    this.canvas.renderAll()

    if (!withoutSave) {
      this.saveState()
    }

    this.canvas.fire('editor:image-fitted', { type })
  },

  /**
   * Получение всех объектов внутри монтажной области редактора
   * @returns {Array} массив объектов
   */
  getObjects() {
    const canvasObjects = this.canvas.getObjects()

    return canvasObjects.filter((obj) => obj.id !== this.montageArea.id) ?? []
  },

  /**
   * Установка дефолтного масштаба для всех объектов внутри монтажной области редактора
   */
  resetObjects() {
    this.getObjects().forEach((obj) => {
      this.resetObject(obj)
    })
  },

  /**
   * Сброс масштаба объекта до дефолтного
   * @param {fabric.Object} object
   * @param {Boolean} [fitOnlyBigImage] - растягивать только большие изображения
   * @returns
   */
  resetObject(object, alwaysFitImage = false) {
    const currentObject = object || this.canvas.getActiveObject()

    if (!currentObject) return

    if (currentObject.type !== 'image') {
      currentObject.set({
        scaleX: 1,
        scaleY: 1,
        flipX: false,
        flipY: false,
        angle: 0
      })

      this.canvas.centerObject(currentObject)
      this.canvas.renderAll()
    }

    if (alwaysFitImage) {
      this.imageFit({ object: currentObject, withoutSave: true })
    } else {
      const { width: montageAreaWidth, height: montageAreaHeight } = this.montageArea
      const { width: imageWidth, height: imageHeight } = currentObject

      const scaleFactor = calculateScaleFactor({
        montageArea: this.montageArea,
        imageObject: currentObject,
        scaleType: editorOptions.scaleType
      })

      // Делаем contain и cover только если размеры изображения больше размеров канваса, иначе просто сбрасываем
      if (
        (editorOptions.scaleType === 'contain' && scaleFactor < 1)
        || (
          editorOptions.scaleType === 'cover'
          && (imageWidth > montageAreaWidth || imageHeight > montageAreaHeight)
        )
      ) {
        this.imageFit({ object: currentObject, withoutSave: true })
      } else {
        currentObject.set({ scaleX: 1, scaleY: 1 })
      }
    }

    currentObject.set({
      flipX: false,
      flipY: false,
      angle: 0
    })

    this.canvas.centerObject(currentObject)
    this.canvas.renderAll()
  },

  /**
   * Если изображение вписывается в допустимые значения, то масштабируем под него канвас
   * @param {Object} options
   * @param {fabric.Object} [options.object] - Объект с изображением, которое нужно масштабировать
   * @param {Boolean} [options.withoutSave] - Не сохранять состояние
   * @param {Boolean} [options.preserveAspectRatio] - Сохранять изначальные пропорции монтажной области
   * @fires editor:canvas-scaled
   */
  scaleMontageAreaToImage(options = {}) {
    const { object, preserveAspectRatio, withoutSave } = options

    const image = object || this.canvas.getActiveObject()

    if (!image || image.type !== 'image') return

    const { width: imageWidth, height: imageHeight } = image

    if (imageWidth < CANVAS_MIN_WIDTH || imageHeight < CANVAS_MIN_HEIGHT) {
      const message = `Размер изображения меньше минимального размера канваса, поэтому оно будет растянуто до минимальных размеров: ${CANVAS_MIN_WIDTH}x${CANVAS_MIN_HEIGHT}`

      console.warn(`importImage. ${message}`)

      this.canvas.fire('editor:warning', {
        message
      })
    }

    let newCanvasWidth = Math.min(imageWidth, CANVAS_MAX_WIDTH)
    let newCanvasHeight = Math.min(imageHeight, CANVAS_MAX_HEIGHT)

    if (preserveAspectRatio) {
      const { width: montageAreaWidth, height: montageAreaHeight } = this.montageArea

      const widthMultiplier = imageWidth / montageAreaWidth
      const heightMultiplier = imageHeight / montageAreaHeight

      const multiplier = Math.max(widthMultiplier, heightMultiplier)

      newCanvasWidth = montageAreaWidth * multiplier
      newCanvasHeight = montageAreaHeight * multiplier
    }

    this.setResolutionWidth(newCanvasWidth, { withoutSave: true })
    this.setResolutionHeight(newCanvasHeight, { withoutSave: true })

    const { montageAreaWidth, montageAreaHeight } = editorOptions

    // Если изображение больше монтажной области, то устанавливаем зум по умолчанию
    if (imageWidth > montageAreaWidth || imageHeight > montageAreaHeight) {
      this.calculateAndApplyDefaultZoom(montageAreaWidth, montageAreaHeight)
    }

    this.resetObject(image, true)
    this.canvas.centerObject(image)
    this.canvas.renderAll()

    if (!withoutSave) {
      this.saveState()
    }

    this.canvas.fire('editor:canvas-scaled', { width: newCanvasWidth, height: newCanvasHeight })
  },

  /**
   * Экспорт изображения в файл – экспортируется содержимое монтажной области.
   * Независимо от текущего зума, экспортируется монтажная область в исходном масштабе. Можно экспортировать как base64.
   * @param {Object} options - опции
   * @param {string} options.fileName - имя файла
   * @param {string} options.contentType - тип контента
   * @param {Boolean} options.exportAsBase64 - экспортировать как base64
   * @returns {Promise<File> | String} - файл или base64
   * @fires editor:canvas-exported
   */
  async exportCanvasAsImageFile(options = {}) {
    const {
      fileName = 'image.png',
      contentType = 'image/png',
      exportAsBase64 = false
    } = options

    const idPDF = contentType === 'application/pdf'
    // Если это PDF, то дальше нам нужен будет .jpg
    const adjustedContentType = idPDF ? 'image/jpg' : contentType

    // Сброс активного объекта и ререндер
    this.canvas.discardActiveObject()
    this.canvas.renderAll()

    // Сохраняем текущий viewportTransform (матрицу масштабирования и сдвига)
    const savedTransform = this.canvas.viewportTransform.slice()

    // Если экспортируем .jpg, временно задаем белый фон (если его ещё нет)
    const savedBackground = this.canvas.backgroundColor
    if (adjustedContentType === 'image/jpg') {
      this.canvas.backgroundColor = '#ffffff'
    }

    // Сбрасываем viewportTransform, чтобы экспортировать содержимое в координатах канваса без зума
    this.canvas.viewportTransform = [1, 0, 0, 1, 0, 0]
    this.canvas.renderAll()

    // Пересчитываем координаты монтажной области:
    this.montageArea.setCoords()

    // Получаем координаты монтажной области.
    const { left, top, width, height } = this.montageArea.getBoundingRect()
    this.montageArea.visible = false
    this.canvas.renderAll()

    // Вызываем toDataURL с указанием нужной области.
    const dataUrl = this.canvas.toDataURL({
      format: adjustedContentType.split('/')[1],
      left,
      top,
      width,
      height
    })

    // Восстанавливаем сохранённый viewportTransform и заливку для монтажной области
    this.canvas.viewportTransform = savedTransform
    this.montageArea.visible = true
    this.canvas.backgroundColor = savedBackground
    this.canvas.renderAll()

    if (idPDF) {
      const pxToMm = 0.264583 // коэффициент перевода пикселей в миллиметры (при 96 DPI)
      const pdfWidth = width * pxToMm
      const pdfHeight = height * pxToMm

      const pdf = new JsPDF({
        orientation: pdfWidth > pdfHeight ? 'landscape' : 'portrait',
        unit: 'mm',
        format: [pdfWidth, pdfHeight]
      })

      // Добавляем изображение в PDF. Используем формат PNG для изображения
      pdf.addImage(dataUrl, 'JPG', 0, 0, pdfWidth, pdfHeight)

      if (exportAsBase64) {
        const pdfBase64 = pdf.output('datauristring')
        this.canvas.fire('editor:canvas-exported', pdfBase64)
        return pdfBase64
      }

      // Получаем Blob из PDF и создаем File
      const pdfBlob = pdf.output('blob')
      const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' })
      this.canvas.fire('editor:canvas-exported', { image: pdfFile })
      return pdfFile
    }

    if (exportAsBase64) {
      this.canvas.fire('editor:canvas-exported', dataUrl)

      return dataUrl
    }

    // Преобразуем dataUrl в Blob и затем в File
    const blob = await (await fetch(dataUrl)).blob()

    const file = new File([blob], fileName, { type: adjustedContentType })
    this.canvas.fire('editor:canvas-exported', { image: file })

    return file
  },

  /**
   * Экспорт выбранного объекта в виде изображения или base64
   * @param {Object} options - опции
   * @param {fabric.Object} options.object - объект для экспорта
   * @param {String} options.fileName - имя файла
   * @param {String} options.contentType - тип контента
   * @param {Boolean} options.exportAsBase64 - экспортировать как base64
   * @returns {String} base64
   * @fires editor:object-exported
   */
  async exportObjectAsImageFile(options = {}) {
    const {
      object,
      fileName = 'image.png',
      contentType = 'image/png',
      exportAsBase64 = false
    } = options

    const activeObject = object || this.canvas.getActiveObject()

    if (!activeObject) {
      console.error('exportObjectAsDataURL. Не выбран объект')

      this.canvas.fire('editor:error', {
        message: 'Не выбран объект для экспорта'
      })

      return ''
    }

    // Вызываем toDataURL с указанием нужной области.
    const dataUrl = await activeObject.toDataURL({
      format: contentType.split('/')[1]
    })

    if (exportAsBase64) {
      this.canvas.fire('editor:object-exported', { image: dataUrl })

      return dataUrl
    }

    // Преобразуем dataUrl в Blob и затем в File
    const blob = await (await fetch(dataUrl)).blob()

    const file = new File([blob], fileName, { type: contentType })
    this.canvas.fire('editor:object-exported', { image: file })

    return file
  },

  /**
   * Группировка объектов
   * @fires editor:objects-grouped
   */
  group() {
    this.suspendHistory()
    const activeObject = this.canvas.getActiveObject()
    if (!activeObject) return

    if (activeObject.type !== 'activeSelection' && activeObject.type !== 'activeselection') {
      return
    }

    const group = new fabric.Group(this.canvas.getActiveObject().removeAll())
    this.canvas.add(group)
    this.canvas.setActiveObject(group)
    this.canvas.renderAll()
    this.resumeHistory()

    this.canvas.fire('editor:objects-grouped')
  },

  /**
   * Разгруппировка объектов
   * @param {fabric.Group} obj - группа объектов
   * @fires editor:objects-ungrouped
   */
  ungroup(obj) {
    this.suspendHistory()

    const group = obj || this.canvas.getActiveObject()

    if (!group || group.type !== 'group') {
      return
    }

    this.canvas.remove(group)
    const sel = new fabric.ActiveSelection(group.removeAll(), {
      canvas: this.canvas
    })

    this.canvas.setActiveObject(sel)
    this.canvas.renderAll()
    this.resumeHistory()

    this.canvas.fire('editor:objects-ungrouped')
  },

  /**
   * Удалить выбранный объект
   * @param {Object} options
   * @param {Boolean} options.withoutSave - Не сохранять состояние
   * @fires editor:object-deleted
   */
  deleteSelectedObjects(options = {}) {
    this.suspendHistory()
    const { withoutSave } = options

    const activeObjects = this.canvas.getActiveObjects()

    if (!activeObjects?.length) return

    activeObjects.forEach((obj) => {
      if (obj.type === 'group') {
        this.ungroup(obj)
        this.deleteSelectedObjects()

        return
      }

      this.canvas.remove(obj)
    })

    this.canvas.discardActiveObject()
    this.canvas.renderAll()
    this.resumeHistory()

    if (!withoutSave) {
      this.saveState()
    }

    this.canvas.fire('editor:objects-deleted')
  },

  /**
   * Получаем полное состояние, применяя все диффы к базовому состоянию.
   */
  getFullState() {
    const { baseState, currentIndex, patches } = this.history

    // Глубокая копия базового состояния
    let state = JSON.parse(JSON.stringify(baseState))
    // Применяем все диффы до текущего индекса
    for (let i = 0; i < currentIndex; i += 1) {
      state = diffPatcher.patch(state, patches[i])
    }
    return state
  },

  /**
   * Сохраняем текущее состояние в виде диффа от последнего сохранённого полного состояния.
   */
  saveState() {
    console.log('saveState')
    if (this.isLoading) return

    // Получаем текущее состояние канваса как объект
    const currentStateObj = this.canvas.toDatalessJSON(['selectable', 'evented', 'id', 'width', 'height'])

    // Если базовое состояние ещё не установлено, сохраняем полное состояние как базу
    if (!this.history.baseState) {
      this.history.baseState = currentStateObj
      this.history.patches = []
      this.history.currentIndex = 0
      console.log('Базовое состояние сохранено.')
      return
    }

    // Вычисляем diff между последним сохранённым полным состоянием и текущим состоянием.
    // Последнее сохранённое полное состояние – это результат getFullState()
    const prevState = this.getFullState()
    const diff = diffPatcher.diff(prevState, currentStateObj)

    // Если изменений нет, не сохраняем новый шаг
    if (!diff) {
      console.log('Нет изменений для сохранения.')
      return
    }

    console.log('baseState', this.history.baseState)

    // Если мы уже сделали undo и сейчас добавляем новое состояние,
    // удаляем «редо»-ветку
    if (this.history.currentIndex < this.history.patches.length) {
      this.history.patches.splice(this.history.currentIndex)
    }

    console.log('diff', diff)

    // Сохраняем дифф
    this.history.patches.push(diff)
    this.history.currentIndex += 1

    // Если история стала слишком длинной, сбрасываем её: делаем новое базовое состояние
    if (this.history.patches.length > this.history.maxHistoryLength) {
      // Обновляем базовое состояние, применяя самый старый дифф
      // Можно также обновить базу, применив все диффы, но здесь мы делаем сдвиг на один шаг
      this.history.baseState = diffPatcher.patch(this.history.baseState, this.history.patches[0])
      this.history.patches.shift() // Удаляем первый дифф
      this.history.currentIndex -= 1 // Корректируем индекс
    }

    console.log('Состояние сохранено. Текущий индекс истории:', this.history.currentIndex)
  },

  /**
   * Функция загрузки состояния в канвас.
   * Здесь мы принимаем полное состояние (JSON-строку) и загружаем его.
   * @param {String} fullState - полное состояние канваса в виде JSON-строки
   * @fires editor:state-loaded
   */
  async loadStateFromFullState(fullState) {
    if (!fullState) return
    console.log('loadStateFromFullState fullState', fullState)

    await this.canvas.loadFromJSON(fullState)

    const loadedMontage = this.canvas.getObjects().find((obj) => obj.id === 'montage-area')
    if (loadedMontage) {
      this.montageArea = loadedMontage
    }

    this.canvas.renderAll()

    this.canvas.fire('editor:history-state-loaded')
  },

  /**
   * Undo – отмена последнего действия, восстанавливая состояние по накопленным диффам.
   * @fires editor:undo
   */
  async undo() {
    if (this.isLoading) return

    const { currentIndex } = this.history

    if (currentIndex <= 0) {
      console.log('Нет предыдущих состояний для отмены.')
      return
    }

    this.isLoading = true
    this.suspendHistory()

    try {
      this.history.currentIndex -= 1
      const fullState = this.getFullState()
      console.log('image top', fullState.objects[1]?.top)
      console.log('image left', fullState.objects[1]?.left)

      await this.loadStateFromFullState(JSON.stringify(fullState))

      console.log('Undo выполнен. Текущий индекс истории:', this.history.currentIndex)

      this.canvas.fire('editor:undo')
    } catch (error) {
      console.error('undo. Ошибка отмены действия: ', error)

      this.canvas.fire('editor:error', {
        message: `Ошибка отмены действия: ${error.message}`
      })
    } finally {
      this.isLoading = false
      this.resumeHistory()
    }
  },

  /**
   * Redo – повтор ранее отменённого действия.
   * @fires editor:redo
   */
  async redo() {
    if (this.isLoading) return

    const { currentIndex, patches } = this.history

    if (currentIndex >= patches.length) {
      console.log('Нет состояний для повтора.')
      return
    }

    this.isLoading = true
    this.suspendHistory()

    try {
      this.history.currentIndex += 1
      const fullState = this.getFullState()
      console.log('fullState', fullState)
      console.log('image top', fullState.objects[1]?.top)
      console.log('image left', fullState.objects[1]?.left)
      await this.loadStateFromFullState(JSON.stringify(fullState))
      console.log('Redo выполнен. Текущий индекс истории:', this.history.currentIndex)

      this.canvas.fire('editor:redo')
    } catch (error) {
      console.error('redo. Ошибка повтора действия: ', error)

      this.canvas.fire('editor:error', {
        message: `Ошибка повтора действия: ${error.message}`
      })
    } finally {
      this.isLoading = false
      this.resumeHistory()
    }
  },

  // Дебаунс для снижения частоты сохранения состояния
  debounce(fn, delay) {
    let timer = null

    return function(...args) {
      const context = this
      clearTimeout(timer)
      timer = setTimeout(() => {
        fn.apply(context, args)
      }, delay)
    }
  },

  /**
   * Очистка холста
   * @fires editor:cleared
   */
  clearCanvas() {
    this.suspendHistory()
    // Сохраняем ссылку на монтажную область
    const { montageArea } = this

    // Полностью очищаем канвас (удаляются все объекты, фоны, оверлеи и т.д.)
    this.canvas.clear()

    // Добавляем монтажную область обратно
    this.canvas.add(montageArea)

    this.canvas.renderAll()
    this.resumeHistory()

    this.saveState()

    this.canvas?.fire('editor:cleared')
  },

  /**
   * Выделить все объекты
   * @fires editor:all-objects-selected
   */
  selectAll() {
    this.canvas.discardActiveObject()

    const sel = new fabric.ActiveSelection(this.getObjects(), {
      canvas: this.canvas
    })

    this.canvas.setActiveObject(sel)
    this.canvas.requestRenderAll()

    this.canvas.fire('editor:all-objects-selected', { selected: sel })
  },

  /**
   * Копирование объекта
   * @fires editor:object-copied
   */
  async copy() {
    const activeObject = this.canvas.getActiveObject()
    if (!activeObject) return

    const clonedObject = await activeObject.clone()

    this.clipboard = clonedObject

    // Сохраняем объект в локальном буфере редактора
    if (this.clipboard.type !== 'image') {
      await navigator.clipboard.writeText(['application/image-editor', JSON.stringify(clonedObject)])

      return
    }

    // Если это изображение, то сохраним его в системном буфере
    const clonedDataUrl = this.clipboard.toDataURL()
    const blob = await (await fetch(clonedDataUrl)).blob()

    const clipboardItem = new ClipboardItem({ [blob.type]: blob })

    try {
      await navigator.clipboard.write([clipboardItem])

      this.canvas.fire('editor:object-copied', { object: clonedObject })
    } catch (error) {
      console.error('copy. Ошибка записи в системный буфер обмена: ', error)

      this.canvas.fire('editor:error', {
        message: `Ошибка записи в системный буфер обмена: ${error.message}`
      })
    }
  },

  /**
   * Вставка объекта
   * @fires editor:object-pasted
   */
  async paste() {
    if (!this.clipboard) return

    // clone again, so you can do multiple copies.
    const clonedObj = await this.clipboard.clone()
    this.canvas.discardActiveObject()
    clonedObj.set({
      id: `${clonedObj.type}-${nanoid()}`,
      left: clonedObj.left + 10,
      top: clonedObj.top + 10,
      evented: true
    })
    if (clonedObj instanceof fabric.ActiveSelection) {
      // active selection needs a reference to the canvas.
      clonedObj.canvas = this.canvas
      clonedObj.forEachObject((obj) => {
        this.canvas.add(obj)
      })
      // this should solve the unselectability
      clonedObj.setCoords()
    } else {
      this.canvas.add(clonedObj)
    }
    this.clipboard.top += 10
    this.clipboard.left += 10
    this.canvas.setActiveObject(clonedObj)
    this.canvas.requestRenderAll()

    this.canvas.fire('editor:object-pasted', { object: clonedObj })
  },

  /**
   * Метод рассчитывает дефолтный, максимальный, и минимальный зум таким образом,
   * чтобы монтажная область визуально занимала переданные размеры.
   * Если размеры не переданы, то используются дефолтные размеры монтажной области переданные в editorOptions.
   * @param {number} [targetWidth]  — желаемая видимая ширина (px)
   * @param {number} [targetHeight] — желаемая видимая высота (px)
   */
  calculateAndApplyDefaultZoom(
    targetWidth = editorOptions.montageAreaWidth,
    targetHeight = editorOptions.montageAreaHeight
  ) {
    const { width: montageWidth, height: montageHeight } = this.montageArea

    const scaleX = targetWidth / montageWidth
    const scaleY = targetHeight / montageHeight

    // выбираем меньший зум, чтобы монтажная область целиком помещалась
    const defaultZoom = Math.min(scaleX, scaleY)

    const { minZoom, maxZoom, maxZoomFactor } = editorOptions

    // устанавливаем допустимые пределы зума
    this.minZoom = Math.min(defaultZoom / maxZoomFactor, minZoom)
    this.maxZoom = Math.max(defaultZoom * maxZoomFactor, maxZoom)

    // запоминаем дефолтный зум
    this.defaultZoom = defaultZoom

    // применяем дефолтный зум
    this.setZoom(defaultZoom)
  },

  /**
   * Увеличение/уменьшение масштаба
   * @param {Number} scale - Шаг зума
   * @param {Object} options - Координаты зума (по умолчанию центр канваса)
   * @param {Number} options.pointX - Координата X точки зума
   * @param {Number} options.pointY - Координата Y точки зума
   * @fires editor:zoom-changed
   * Если передавать координаты курсора, то нужно быть аккуратнее, так как юзер может выйти за пределы рабочей области
   */
  zoom(scale = DEFAULT_ZOOM_RATIO, options = {}) {
    if (!scale) return

    const { minZoom, maxZoom } = this

    const currentZoom = this.canvas.getZoom()
    const pointX = options.pointX ?? this.canvas.getWidth() / 2
    const pointY = options.pointY ?? this.canvas.getHeight() / 2

    let zoom = Number((currentZoom + Number(scale)).toFixed(2))

    if (zoom > maxZoom) zoom = maxZoom
    if (zoom < minZoom) zoom = minZoom

    console.log('currentZoom', currentZoom)

    this.canvas.zoomToPoint({ x: Number(pointX), y: Number(pointY) }, zoom)

    this.canvas.fire('editor:zoom-changed', {
      currentZoom: this.canvas.getZoom(),
      zoom,
      pointX,
      pointY
    })
  },

  /**
   * Установка зума
   * @param {Number} zoom - Зум
   * @fires editor:zoom-changed
   */
  setZoom(zoom = this.defaultZoom) {
    const pointX = this.canvas.getWidth() / 2
    const pointY = this.canvas.getHeight() / 2

    let newZoom = zoom

    const { minZoom, maxZoom } = this

    if (zoom > maxZoom) newZoom = maxZoom
    if (zoom < minZoom) newZoom = minZoom

    this.canvas.zoomToPoint({ x: Number(pointX), y: Number(pointY) }, newZoom)

    this.canvas.fire('editor:zoom-changed', {
      currentZoom: this.canvas.getZoom(),
      zoom: newZoom,
      pointX,
      pointY
    })
  },

  /**
   * Сброс зума
   * @fires editor:zoom-changed
   */
  resetZoom() {
    const pointX = this.canvas.getWidth() / 2
    const pointY = this.canvas.getHeight() / 2

    this.canvas.zoomToPoint({ x: Number(pointX), y: Number(pointY) }, this.defaultZoom)

    this.canvas.fire('editor:zoom-changed', { currentZoom: this.canvas.getZoom() })
  },

  /**
   * Установка зума и масштаба для канваса и объекта по умолчанию
   * @param {Object} options
   * @param {Boolean} options.withoutSave - Не сохранять состояние
   * @fires editor:default-scale-set
   */
  setDefaultScale({ withoutSave } = {}) {
    this.resetZoom()
    this.setResolutionWidth(editorOptions.montageAreaWidth, { withoutSave: true })
    this.setResolutionHeight(editorOptions.montageAreaHeight, { withoutSave: true })
    centerCanvas(this.canvas, this.montageArea)
    this.canvas.renderAll()

    this.resetObjects()

    if (!withoutSave) {
      this.saveState()
    }

    this.canvas.fire('editor:default-scale-set')
  },

  /**
   * Поднять объект навверх по оси Z
   * @param {fabric.Object} object
   * @param {Object} options
   * @param {Boolean} options.withoutSave - Не сохранять состояние
   * @fires editor:object-bring-to-front
   */
  bringToFront(object, options = {}) {
    this.suspendHistory()

    const { withoutSave } = options

    const activeObject = object || this.canvas.getActiveObject()

    if (!activeObject) return

    this.canvas.bringObjectToFront(activeObject)
    this.canvas.renderAll()
    this.resumeHistory()

    if (!withoutSave) {
      this.saveState()
    }

    this.canvas.fire('editor:object-bring-to-front')
  },

  /**
   * Поднять объект на один уровень вверх по оси Z
   * @param {fabric.Object} object
   * @param {Object} options
   * @param {Boolean} options.withoutSave - Не сохранять состояние
   * @fires editor:object-bring-forward
   */
  bringForward(object, options = {}) {
    this.suspendHistory()
    const { withoutSave } = options

    const activeObject = object || this.canvas.getActiveObject()

    if (!activeObject) return

    this.canvas.bringObjectForward(activeObject)
    this.canvas.renderAll()
    this.resumeHistory()

    if (!withoutSave) {
      this.saveState()
    }

    this.canvas.fire('editor:object-bring-forward')
  },

  /**
  * Отправить объект на задний план по оси Z
  * @param {fabric.Object} object
  * @param {Object} options
  * @param {Boolean} options.withoutSave - Не сохранять состояние
  * @fires editor:object-send-to-back
  */
  sendToBack(object, options = {}) {
    this.suspendHistory()
    const { withoutSave } = options

    const activeObject = object || this.canvas.getActiveObject()

    if (!activeObject) return

    this.canvas.sendObjectToBack(activeObject)
    this.canvas.sendObjectToBack(this.montageArea)
    this.canvas.renderAll()

    this.resumeHistory()

    if (!withoutSave) {
      this.saveState()
    }

    this.canvas.fire('editor:object-send-to-back')
  },

  /**
  * Отправить объект на один уровень ниже по оси Z
  * @param {fabric.Object} object
  * @param {Object} options
  * @param {Boolean} options.withoutSave - Не сохранять состояние
  */
  sendBackwards(object, options = {}) {
    this.suspendHistory()
    const { withoutSave } = options

    const activeObject = object || this.canvas.getActiveObject()

    if (!activeObject) return

    this.canvas.sendObjectBackwards(activeObject)
    this.canvas.sendObjectToBack(this.montageArea)
    this.canvas.renderAll()

    this.resumeHistory()

    if (!withoutSave) {
      this.saveState()
    }

    this.canvas.fire('editor:object-send-backwards')
  },

  /**
   * Поворот объекта на заданный угол
   * @param {number} angle
   * @param {Object} options
   * @param {Boolean} options.withoutSave - Не сохранять состояние
   * @fires editor:object-rotated
   */
  rotate(angle = DEFAULT_ROTATE_RATIO, options = {}) {
    const { withoutSave } = options

    const obj = this.canvas.getActiveObject()
    if (!obj) return
    const newAngle = obj.angle + angle
    obj.rotate(newAngle)
    obj.setCoords()

    this.canvas.renderAll()

    if (!withoutSave) {
      this.saveState()
    }

    this.canvas.fire('editor:object-rotated', { angle: newAngle })
  },

  /**
   * Отразить по горизонтали
   * @param {Object} options
   * @param {Boolean} options.withoutSave - Не сохранять состояние
   * @fires editor:object-flipped-x
   */
  flipX(options = {}) {
    const { withoutSave } = options

    const obj = this.canvas.getActiveObject()
    if (!obj) return
    obj.flipX = !obj.flipX
    this.canvas.renderAll()

    if (!withoutSave) {
      this.saveState()
    }

    this.canvas.fire('editor:object-flipped-x')
  },

  /**
   * Отразить по вертикали
   * @param {Object} options
   * @param {Boolean} options.withoutSave - Не сохранять состояние
   * @fires editor:object-flipped-y
   */
  flipY(options = {}) {
    const { withoutSave } = options

    const obj = this.canvas.getActiveObject()
    if (!obj) return
    obj.flipY = !obj.flipY
    this.canvas.renderAll()

    if (!withoutSave) {
      this.saveState()
    }

    this.canvas.fire('editor:object-flipped-y')
  },

  /**
   * Установка прозрачности объекта
   * @param {Number} opacity - Прозрачность от 0 до 1
   * @fires editor:object-opacity-changed
   * TODO: Сейвить состояние
   */
  setActiveObjectOpacity(opacity = 1) {
    const obj = this.canvas.getActiveObject()
    if (!obj) return

    obj.set('opacity', opacity)
    this.canvas.renderAll()

    this.canvas.fire('editor:object-opacity-changed', opacity)
  },

  /**
   * Добавление прямоугольника
   * @param {Object} options
   * @param {Number} options.left - Координата X
   * @param {Number} options.top - Координата Y
   * @param {Number} options.width - Ширина
   * @param {Number} options.height - Высота
   * @param {String} options.color - Цвет
   * @param {String} options.originX - Ориентация по X
   * @param {String} options.originY - Ориентация по Y
   */
  addRectangle(options = {}) {
    const {
      left,
      top,
      width = 100,
      height = 100,
      color = 'blue',
      originX = 'center',
      originY = 'center'
    } = options

    const rect = new fabric.Rect({
      id: `rect-${nanoid()}`,
      left,
      top,
      fill: color,
      width,
      height,
      originX,
      originY
    })

    if (!left && !top) {
      this.canvas.centerObject(rect)
    }

    this.canvas.add(rect)
    this.canvas.setActiveObject(rect)
    this.canvas.renderAll()
  },

  /**
   * Добавление круга
   * @param {Object} options
   * @param {Number} options.left - Координата X
   * @param {Number} options.top - Координата Y
   * @param {Number} options.radius - Радиус
   * @param {String} options.color - Цвет
   * @param {String} options.originX - Ориентация по X
   * @param {String} options.originY - Ориентация по Y
   */
  addCircle(options = {}) {
    const {
      left,
      top,
      radius = 50,
      color = 'green',
      originX = 'center',
      originY = 'center'
    } = options

    const circle = new fabric.Circle({
      id: `circle-${nanoid()}`,
      left,
      top,
      fill: color,
      radius,
      originX,
      originY
    })

    if (!left && !top) {
      this.canvas.centerObject(circle)
    }

    this.canvas.add(circle)
    this.canvas.setActiveObject(circle)
    this.canvas.renderAll()
  },

  /**
   * Добавление треугольника
   * @param {Object} options
   * @param {Number} options.left - Координата X
   * @param {Number} options.top - Координата Y
   * @param {Number} options.width - Ширина
   * @param {Number} options.height - Высота
   * @param {String} options.color - Цвет
   * @param {String} options.originX - Ориентация по X
   * @param {String} options.originY - Ориентация по Y
   */
  addTriangle(options = {}) {
    const {
      left,
      top,
      width = 100,
      height = 100,
      originX = 'center',
      originY = 'center',
      color = 'yellow'
    } = options

    const triangle = new fabric.Triangle({
      id: `triangle-${nanoid()}`,
      left,
      top,
      fill: color,
      width,
      height,
      originX,
      originY
    })

    if (!left && !top) {
      this.canvas.centerObject(triangle)
    }

    this.canvas.add(triangle)
    this.canvas.setActiveObject(triangle)
    this.canvas.renderAll()
  }

  // TODO: Проверить что работает
  // Пример с ClipPath
  // cropImage(imageObj, cropRect) {
  //   // cropRect — это объект { left, top, width, height },
  //   // который задаёт рамку для обрезки

  //   imageObj.clipPath = new fabric.Rect({
  //     left: cropRect.left,
  //     top: cropRect.top,
  //     width: cropRect.width,
  //     height: cropRect.height,
  //     absolutePositioned: true // Чтобы учитывались координаты именно канвы, а не локальные
  //   })

  //   this.canvas.renderAll()
  // },

  // TODO: Проверить что работает
  // Пример с «ручной» обрезкой (создаём новый fabric.Image)
  // cropImageAndReplace(imageObj, cropRect) {
  //   // 1. Создаём промежуточный <canvas> (DOM)
  //   const tempCanvas = document.createElement('canvas')
  //   const ctx = tempCanvas.getContext('2d')

  //   // Задаём размеры временного canvas
  //   tempCanvas.width = cropRect.width
  //   tempCanvas.height = cropRect.height

  //   // Копируем нужную часть
  //   // drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)
  //   ctx.drawImage(
  //     imageObj._element,
  //     cropRect.left,
  //     cropRect.top,
  //     cropRect.width,
  //     cropRect.height,
  //     0,
  //     0,
  //     cropRect.width,
  //     cropRect.height
  //   )

  //   // 2. Получаем dataURL
  //   const dataURL = tempCanvas.toDataURL()

  //   // 3. Удаляем старый объект из canvas
  //   this.canvas.remove(imageObj)

  //   // 4. Создаём новый объект из dataURL
  //   fabric.FabricImage.fromURL(dataURL, (croppedImg) => {
  //     croppedImg.set({
  //       left: imageObj.left,
  //       top: imageObj.top
  //     })
  //     this.canvas.add(croppedImg)
  //     this.canvas.renderAll()
  //   })
  // },

  // TODO: Проверить что работает
  // addText(text) {
  //   const textObj = new fabric.FabricText(text, { left: 100, top: 100 })
  //   this.canvas.add(textObj)
  //   this.canvas.renderAll()
  // },

  // Ещё один вариант
  // addText(text) {
  //   const textObj = new fabricTextbox(textString, {
  //     left: 100,
  //     top: 200,
  //     fontSize: 30,
  //     fill: '#000',
  //     // Прочие настройки...
  //   });
  //   canvas.add(textObj);
  //   canvas.renderAll();
  // }

  // TODO: Проверить что работает
  // addSticker(url) {
  //   fabric.fabricFabricImage.fromURL(url, (img) => {
  //     img.set({
  //       left: 100,
  //       top: 100
  //       // можно что-то поднастроить...
  //     })
  //     this.canvas.add(img)
  //     this.canvas.renderAll()
  //   })
  // },

  // TODO: Проверить что работает. Возможно это должно быть внутренней фичей
  // hideControls(imageObj) {
  //   imageObj.set({
  //     hasControls: true, // разрешает уголки для маштабирования/вращения
  //     lockRotation: false // если хотим разрешить вращение, это должно быть false
  //   })
  // },

  // TODO: Проверить что работает
  // applyGradient(object) {
  //   // Допустим, линейный градиент слева направо
  //   const gradient = new fabric.fabricGradient({
  //     type: 'linear',
  //     gradientUnits: 'pixels', // или 'percentage'
  //     coords: {
  //       x1: 0,
  //       y1: 0,
  //       x2: object.width,
  //       y2: 0
  //     },
  //     colorStops: [
  //       { offset: 0, color: 'red' },
  //       { offset: 1, color: 'blue' }
  //     ]
  //   })
  //   object.set('fill', gradient)
  //   this.canvas.renderAll()

  //   // Для тени
  //   // object.setShadow({
  //   //   color: 'rgba(0,0,0,0.3)',
  //   //   blur: 5,
  //   //   offsetX: 5,
  //   //   offsetY: 5
  //   // });
  //   // this.canvas.renderAll();
  // },

  // TODO: Проверить что работает
  // applyBrightness() {
  //   const obj = this.canvas.getActiveObject()
  //   if (!obj || obj.type !== 'image') return
  //   const brightnessFilter = new fabric.fabricImage.filters.Brightness({
  //     brightness: 0.2
  //   })
  //   obj.filters[0] = brightnessFilter
  //   obj.applyFilters()
  //   this.canvas.renderAll()
  // },

  // Предположим, у нас есть imageObj, который является fabricImage
  // applyBrightness(imageObj, value) {
  //   // value: число от -1 до +1
  //   const brightnessFilter = new fabricImage.filters.Brightness({
  //     brightness: value
  //   });
  //   // Массив filters у объекта - туда можно добавить несколько фильтров
  //   imageObj.filters[0] = brightnessFilter;
  //   imageObj.applyFilters();
  //   this.canvas.renderAll();
  // }

  // TODO: Проверить что работает
  // applyFilters(imageObj) {
  //   const saturationFilter = new fabric.fabricImage.filters.Saturation({
  //     saturation: 0.5 // 0.5 — это пример, смотрите документацию
  //   })
  //   imageObj.filters.push(saturationFilter)
  //   imageObj.applyFilters()
  //   this.canvas.renderAll()
  // },

  // TODO: Проверить что работает
  // removeFilter() {
  //   const obj = this.canvas.getActiveObject()
  //   if (!obj || obj.type !== 'image') return
  //   obj.filters = []
  //   obj.applyFilters()
  //   this.canvas.renderAll()
  // },

  // TODO: Проверить что работает
  // setDrawingModeOn() {
  //   this.canvas.freeDrawingBrush = new fabric.fabricPencilBrush(this.canvas)
  //   this.canvas.isDrawingMode = true
  //   this.canvas.freeDrawingBrush.color = '#ff0000'
  //   this.canvas.freeDrawingBrush.width = 5
  // },

  // TODO: Проверить что работает
  // setDrawingModeOff() {
  //   this.canvas.isDrawingMode = false
  // }
})
