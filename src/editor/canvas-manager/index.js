import { Point } from 'fabric'
import {
  CANVAS_MIN_WIDTH,
  CANVAS_MIN_HEIGHT,
  CANVAS_MAX_WIDTH,
  CANVAS_MAX_HEIGHT
} from '../constants'

export default class CanvasManager {
  /**
   * @param {object} options
   * @param {ImageEditor} options.editor – экземпляр редактора
   */
  constructor({ editor }) {
    this.editor = editor
  }

  /**
   * Устанавливаем внутреннюю ширину канваса (для экспорта)
   * @param {String|Number} width
   * @param {Object} [options={}]
   * @param {Boolean} [options.preserveProportional] - Сохранить пропорции
   * @param {Boolean} [options.withoutSave] - Не сохранять состояние
   * @param {Boolean} [options.adaptCanvasToContainer] - Адаптировать канвас к контейнеру
   * @fires editor:resolution-width-changed
   */
  setResolutionWidth(width, { preserveProportional, withoutSave, adaptCanvasToContainer } = {}) {
    if (!width) return

    const {
      canvas,
      montageArea,
      options: { canvasBackstoreWidth }
    } = this.editor

    const { width: montageAreaWidth, height: montageAreaHeight } = montageArea

    const adjustedWidth = Number(Math.max(Math.min(width, CANVAS_MAX_WIDTH), CANVAS_MIN_WIDTH))

    // Если ширина канваса не задана или равна 'auto', адаптируем канвас к контейнеру
    if (!canvasBackstoreWidth || canvasBackstoreWidth === 'auto' || adaptCanvasToContainer) {
      this.adaptCanvasToContainer()
    } else if (canvasBackstoreWidth) {
      this.setCanvasBackstoreWidth(canvasBackstoreWidth)
    } else {
      this.setCanvasBackstoreWidth(adjustedWidth)
    }

    // Обновляем размеры montageArea и clipPath
    montageArea.set({ width: adjustedWidth })
    canvas.clipPath.set({ width: adjustedWidth })

    // Если нужно сохранить пропорции, вычисляем новую высоту
    if (preserveProportional) {
      const factor = adjustedWidth / montageAreaWidth
      const newHeight = montageAreaHeight * factor
      this.setResolutionHeight(newHeight)

      return
    }

    const { left, top } = this.getObjectDefaultCoords(montageArea)

    const currentZoom = canvas.getZoom()
    canvas.setViewportTransform([currentZoom, 0, 0, currentZoom, left, top])

    this.centerMontageArea()

    if (!withoutSave) {
      this.editor.historyManager.saveState()
    }

    canvas?.fire('editor:resolution-width-changed', { width })
  }

  /**
   * Устанавливаем внутреннюю высоту канваса (для экспорта)
   * @param {String|Number} height
   * @param {Object} [options={}]
   * @param {Boolean} [options.preserveProportional] - Сохранить пропорции
   * @param {Boolean} [options.withoutSave] - Не сохранять состояние
   * @param {Boolean} [options.adaptCanvasToContainer] - Адаптировать канвас к контейнеру
   * @fires editor:resolution-height-changed
   */
  setResolutionHeight(height, { preserveProportional, withoutSave, adaptCanvasToContainer } = {}) {
    if (!height) return

    const {
      canvas,
      montageArea,
      options: { canvasBackstoreHeight }
    } = this.editor

    const { width: montageAreaWidth, height: montageAreaHeight } = montageArea

    const adjustedHeight = Number(Math.max(Math.min(height, CANVAS_MAX_HEIGHT), CANVAS_MIN_HEIGHT))

    if (!canvasBackstoreHeight || canvasBackstoreHeight === 'auto' || adaptCanvasToContainer) {
      this.adaptCanvasToContainer()
    } else if (canvasBackstoreHeight) {
      this.setCanvasBackstoreHeight(canvasBackstoreHeight)
    } else {
      this.setCanvasBackstoreHeight(adjustedHeight)
    }

    // Обновляем размеры montageArea и clipPath
    montageArea.set({ height: adjustedHeight })
    canvas.clipPath.set({ height: adjustedHeight })

    // Если нужно сохранить пропорции, вычисляем новую ширину
    if (preserveProportional) {
      const factor = adjustedHeight / montageAreaHeight
      const newWidth = montageAreaWidth * factor

      this.setResolutionWidth(newWidth)

      return
    }

    const { left, top } = this.getObjectDefaultCoords(montageArea)

    const currentZoom = canvas.getZoom()
    canvas.setViewportTransform([currentZoom, 0, 0, currentZoom, left, top])

    this.centerMontageArea()

    if (!withoutSave) {
      this.editor.historyManager.saveState()
    }

    canvas?.fire('editor:resolution-height-changed', { height })
  }

  /**
   * Центрирует монтажную область и ClipPath точно по центру канваса
   * и устанавливает правильный viewportTransform.
   */
  centerMontageArea() {
    const { canvas, montageArea } = this.editor

    const canvasWidth = canvas.getWidth()
    const canvasHeight = canvas.getHeight()

    const currentZoom = canvas.getZoom()

    const centerCanvasPoint = new Point(canvasWidth / 2, canvasHeight / 2)

    // Устанавливаем origin монтажной области в центр канваса без зума
    montageArea.set({
      left: canvasWidth / 2,
      top: canvasHeight / 2
    })

    canvas.clipPath.set({
      left: canvasWidth / 2,
      top: canvasHeight / 2
    })

    canvas.renderAll()

    // Заново устанавливаем viewportTransform, чтобы монтажная область была точно по центру с учётом зума
    const vpt = canvas.viewportTransform
    vpt[4] = canvasWidth / 2 - centerCanvasPoint.x * currentZoom
    vpt[5] = canvasHeight / 2 - centerCanvasPoint.y * currentZoom

    canvas.setViewportTransform(vpt)
    canvas.renderAll()
  }

  /**
   * Метод для получения координат объекта с учетом текущего зума
   * @param {fabric.Object} object - объект, координаты которого нужно получить
   * @returns {Object} координаты объекта
   */
  getObjectDefaultCoords(object) {
    const { canvas } = this.editor

    const activeObject = object || canvas.getActiveObject()

    if (!activeObject) {
      console.error('getObjectDefaultCoords. Не выбран объект')

      this.editor.canvas.fire('editor:error', {
        message: 'Не выбран объект для получения координат'
      })

      return {}
    }

    const { width, height } = activeObject

    const currentZoom = canvas.getZoom()
    const left = (width - (width * currentZoom)) / 2
    const top = (height - (height * currentZoom)) / 2

    return { left, top }
  }

  setCanvasBackstoreWidth(width) {
    if (!width || typeof width !== 'number') return

    const adjustedWidth = Math.max(Math.min(width, CANVAS_MAX_WIDTH), CANVAS_MIN_WIDTH)

    this.editor.canvas.setDimensions({ width: adjustedWidth }, { backstoreOnly: true })
  }

  setCanvasBackstoreHeight(height) {
    if (!height || typeof height !== 'number') return

    const adjustedHeight = Math.max(Math.min(height, CANVAS_MAX_HEIGHT), CANVAS_MIN_HEIGHT)

    this.editor.canvas.setDimensions({ height: adjustedHeight }, { backstoreOnly: true })
  }

  adaptCanvasToContainer() {
    const { canvas } = this.editor

    const container = canvas.editorContainer
    const cw = container.clientWidth
    const ch = container.clientHeight

    const width = Math.max(Math.min(cw, CANVAS_MAX_WIDTH), CANVAS_MIN_WIDTH)
    const height = Math.max(Math.min(ch, CANVAS_MAX_HEIGHT), CANVAS_MIN_HEIGHT)

    console.log('adaptCanvasToContainer newWidth', width)
    console.log('adaptCanvasToContainer newHeight', height)

    canvas.setDimensions({ width, height }, { backstoreOnly: true })
  }

  /**
   * Заготовка.
   * Обновляет CSS-размеры канваса в зависимости от текущего зума, чтобы можно было скроллить вниз-вверх, влево-вправо.
   *
   * TODO: Сейчас изображение обрезается при зуме.
   * Нужно сделать зум по курсору мыши внутри монтажной области, и возможность перетаскивать канвас с зажатым пробелом.
   *
   * Метод нужно вызывать после zoomToPoint.
   *
   * @param {Number} zoom — текущее значение zoom (например, 1, 1.2, 2 и т.д.)
   */
  updateCssDimensionsForZoom(zoom) {
    const { canvas, montageArea } = this.editor

    const zoomedWidth = montageArea.width * zoom
    const zoomedHeight = montageArea.height * zoom
    const scrollContainer = canvas.wrapperEl.parentNode

    const cssWidth = zoomedWidth <= scrollContainer.clientWidth ? '100%' : zoomedWidth
    const cssHeight = zoomedHeight <= scrollContainer.clientHeight ? '100%' : zoomedHeight

    canvas.setDimensions(
      { width: cssWidth, height: cssHeight },
      { cssOnly: true }
    )
  }

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
  }

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
  }

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
  }

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
  }

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
  }

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
  }

  /**
   * Устанавливаем CSS ширину или высоту канваса для отображения
   * @param {Object} options
   * @param {String} [options.element] - элемент, для которого устанавливаем размеры:
   * canvas (upper & lower), wrapper, container
   * @param {('width'|'height')} [options.dimension]
   * @param {string|number} [options.value]
   * @fires editor:display-{element}-{dimension}-changed
   */
  setDisplayDimension({ element, dimension, value } = {}) {
    if (!value) return

    const { canvas, options: { editorContainer } } = this.editor

    const canvasElements = []

    switch (element) {
    case 'canvas':
      canvasElements.push(canvas.lowerCanvasEl, canvas.upperCanvasEl)
      break
    case 'wrapper':
      canvasElements.push(canvas.wrapperEl)
      break
    case 'container':
      canvasElements.push(editorContainer)
      break
    default:
      canvasElements.push(canvas.lowerCanvasEl, canvas.upperCanvasEl)
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

    canvas.fire(`editor:display-${element}-${cssDimension}-changed`, {
      element,
      value
    })
  }

  /**
   * Если изображение вписывается в допустимые значения, то масштабируем под него канвас
   * @param {Object} options
   * @param {fabric.Object} [options.object] - Объект с изображением, которое нужно масштабировать
   * @param {Boolean} [options.withoutSave] - Не сохранять состояние
   * @param {Boolean} [options.preserveAspectRatio] - Сохранять изначальные пропорции монтажной области
   * @fires editor:canvas-scaled
   */
  scaleMontageAreaToImage({ object, preserveAspectRatio, withoutSave } = {}) {
    const {
      canvas,
      montageArea,
      transformManager,
      options: {
        montageAreaWidth: initialMontageAreaWidth,
        montageAreaHeight: initialMontageAreaHeight
      }
    } = this.editor

    const image = object || canvas.getActiveObject()

    if (!image || (image.type !== 'image' && image.format !== 'svg')) return

    const { width: imageWidth, height: imageHeight } = image

    let newCanvasWidth = Math.min(imageWidth, CANVAS_MAX_WIDTH)
    let newCanvasHeight = Math.min(imageHeight, CANVAS_MAX_HEIGHT)

    if (preserveAspectRatio) {
      const {
        width: currentMontageAreaWidth,
        height: currentMontageAreaHeight
      } = montageArea

      const widthMultiplier = imageWidth / currentMontageAreaWidth
      const heightMultiplier = imageHeight / currentMontageAreaHeight

      const multiplier = Math.max(widthMultiplier, heightMultiplier)

      newCanvasWidth = currentMontageAreaWidth * multiplier
      newCanvasHeight = currentMontageAreaHeight * multiplier
    }

    this.setResolutionWidth(newCanvasWidth, { withoutSave: true })
    this.setResolutionHeight(newCanvasHeight, { withoutSave: true })

    // Если изображение больше монтажной области, то устанавливаем зум по умолчанию
    if (imageWidth > initialMontageAreaWidth || imageHeight > initialMontageAreaHeight) {
      transformManager.calculateAndApplyDefaultZoom()
    }

    transformManager.resetObject(image, { withoutSave: true })
    canvas.centerObject(image)
    canvas.renderAll()

    if (!withoutSave) {
      this.editor.historyManager.saveState()
    }

    canvas.fire('editor:canvas-scaled', { width: newCanvasWidth, height: newCanvasHeight })
  }

  /**
   * Очистка холста
   * @fires editor:cleared
   */
  clearCanvas() {
    const { canvas, montageArea, historyManager } = this.editor

    historyManager.suspendHistory()

    // Полностью очищаем канвас (удаляются все объекты, фоны, оверлеи и т.д.)
    canvas.clear()

    // Добавляем монтажную область обратно
    canvas.add(montageArea)

    canvas.renderAll()
    historyManager.resumeHistory()

    historyManager.saveState()

    canvas?.fire('editor:cleared')
  }

  /**
   * Установка зума и масштаба для канваса и сброс трансформации всех объектов
   * @param {Object} options
   * @param {Boolean} options.withoutSave - Не сохранять состояние
   * @fires editor:default-scale-set
   */
  setDefaultScale({ withoutSave } = {}) {
    const {
      canvas,
      transformManager,
      historyManager,
      options: {
        montageAreaWidth: initialMontageAreaWidth,
        montageAreaHeight: initialMontageAreaHeight
      }
    } = this.editor

    transformManager.resetZoom()

    this.setResolutionWidth(initialMontageAreaWidth, { withoutSave: true })
    this.setResolutionHeight(initialMontageAreaHeight, { withoutSave: true })
    canvas.renderAll()

    transformManager.resetObjects()

    if (!withoutSave) {
      historyManager.saveState()
    }

    canvas.fire('editor:default-scale-set')
  }

  /**
   * Получение всех объектов внутри монтажной области редактора
   * @returns {Array} массив объектов
   */
  getObjects() {
    const { canvas, montageArea, interactionBlocker: { overlayMask } } = this.editor

    const canvasObjects = canvas.getObjects()

    return canvasObjects.filter((obj) => obj.id !== montageArea.id && obj.id !== overlayMask.id)
  }
}
