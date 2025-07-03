import { FabricObject, Point } from 'fabric'
import { ImageEditor } from '../index'

import {
  CANVAS_MIN_WIDTH,
  CANVAS_MIN_HEIGHT,
  CANVAS_MAX_WIDTH,
  CANVAS_MAX_HEIGHT
} from '../constants'

export interface SetResolutionOptions {
  preserveProportional?: boolean
  withoutSave?: boolean
  adaptCanvasToContainer?: boolean
}

export interface setDisplayDimensionOptions {
  element?: 'canvas' | 'wrapper' | 'container'
  dimension?: 'width' | 'height'
  value?: string | number
}

export interface ScaleMontageAreaToImageOptions {
  object?: FabricObject
  preserveAspectRatio?: boolean
  withoutSave?: boolean
}

export default class CanvasManager {
  /**
   * Инстанс редактора с доступом к canvas
   * @type {ImageEditor}
   */
  editor: ImageEditor


  /**
   * @param {object} options
   * @param {ImageEditor} options.editor – экземпляр редактора
   */
  constructor({ editor }: { editor: ImageEditor }) {
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
  setResolutionWidth(
    width: string | number,
    { preserveProportional, withoutSave, adaptCanvasToContainer }: SetResolutionOptions = {}
  ) {
    if (!width) return

    const {
      canvas,
      montageArea,
      options: { canvasBackstoreWidth }
    } = this.editor

    const { width: montageAreaWidth, height: montageAreaHeight } = montageArea

    const adjustedWidth = Math.max(Math.min(Number(width), CANVAS_MAX_WIDTH), CANVAS_MIN_WIDTH)

    // Если ширина канваса не задана или равна 'auto', адаптируем канвас к контейнеру
    if (!canvasBackstoreWidth || canvasBackstoreWidth === 'auto' || adaptCanvasToContainer) {
      this.adaptCanvasToContainer()
    } else if (canvasBackstoreWidth) {
      this.setCanvasBackstoreWidth(Number(canvasBackstoreWidth))
    } else {
      this.setCanvasBackstoreWidth(adjustedWidth)
    }

    // Обновляем размеры montageArea и clipPath
    montageArea.set({ width: adjustedWidth })
    canvas.clipPath?.set({ width: adjustedWidth })

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

    canvas.fire('editor:resolution-width-changed', {
      width: adjustedWidth,
      preserveProportional,
      withoutSave,
      adaptCanvasToContainer
    })
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
  setResolutionHeight(
    height: string | number,
    { preserveProportional, withoutSave, adaptCanvasToContainer }: SetResolutionOptions = {}
  ) {
    if (!height) return

    const {
      canvas,
      montageArea,
      options: { canvasBackstoreHeight }
    } = this.editor

    const { width: montageAreaWidth, height: montageAreaHeight } = montageArea

    const adjustedHeight = Math.max(Math.min(Number(height), CANVAS_MAX_HEIGHT), CANVAS_MIN_HEIGHT)

    if (!canvasBackstoreHeight || canvasBackstoreHeight === 'auto' || adaptCanvasToContainer) {
      this.adaptCanvasToContainer()
    } else if (canvasBackstoreHeight) {
      this.setCanvasBackstoreHeight(Number(canvasBackstoreHeight))
    } else {
      this.setCanvasBackstoreHeight(adjustedHeight)
    }

    // Обновляем размеры montageArea и clipPath
    montageArea.set({ height: adjustedHeight })
    canvas.clipPath?.set({ height: adjustedHeight })

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

    canvas.fire('editor:resolution-height-changed', {
      height: adjustedHeight,
      preserveProportional,
      withoutSave,
      adaptCanvasToContainer
    })
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

    canvas.clipPath?.set({
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
  getObjectDefaultCoords(object: FabricObject): { left: number, top: number } {
    const { canvas } = this.editor

    const activeObject = object || canvas.getActiveObject()

    if (!activeObject) {
      this.editor.errorManager.emitError({
        origin: 'CanvasManager',
        method: 'getObjectDefaultCoords',
        code: 'NO_ACTIVE_OBJECT',
        message: 'Не выбран объект для получения координат',
      })

      return { left: 0, top: 0 }
    }

    const { width, height } = activeObject

    const currentZoom = canvas.getZoom()
    const left = (width - (width * currentZoom)) / 2
    const top = (height - (height * currentZoom)) / 2

    return { left, top }
  }

  /**
   * Устанавливаем ширину канваса в backstore (для экспорта)
   * @param {Number} width
   */
  setCanvasBackstoreWidth(width: number) {
    if (!width || typeof width !== 'number') return

    const adjustedWidth = Math.max(Math.min(width, CANVAS_MAX_WIDTH), CANVAS_MIN_WIDTH)

    this.editor.canvas.setDimensions({ width: adjustedWidth }, { backstoreOnly: true })
  }

  /**
   * Устанавливаем высоту канваса в backstore (для экспорта)
   * @param {Number} height
   */
  setCanvasBackstoreHeight(height: number) {
    if (!height || typeof height !== 'number') return

    const adjustedHeight = Math.max(Math.min(height, CANVAS_MAX_HEIGHT), CANVAS_MIN_HEIGHT)

    this.editor.canvas.setDimensions({ height: adjustedHeight }, { backstoreOnly: true })
  }

  /**
   * Адаптирует размеры канваса к размерам контейнера редактора.
   * Устанавливает ширину и высоту канваса в зависимости от размеров контейнера
   * с учётом минимальных и максимальных значений.
   */
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
   * Обновляет размеры канваса и вписывает объекты в монтажную область.
   * Вызывается при изменении размеров контейнера редактора.
   * @fires editor:canvas-updated
   */
  updateCanvasAndFitObjects() {
    const {
      canvas,
      selectionManager,
      transformManager,
      montageArea: {
        width: montageAreaWidth,
        height: montageAreaHeight
      }
    } = this.editor

    // Заново адаптируем канвас к контейнеру
    this.setResolutionWidth(montageAreaWidth, { adaptCanvasToContainer: true, withoutSave: true })
    this.setResolutionHeight(montageAreaHeight, { adaptCanvasToContainer: true, withoutSave: true })

    // Центрируем монтажную область
    this.centerMontageArea()

    // Вписываем объекты в монтажную область
    selectionManager.selectAll()
    transformManager.fitObject({ fitAsOneObject: true, withoutSave: true })

    canvas.fire('editor:canvas-updated', {
      width: montageAreaWidth,
      height: montageAreaHeight
    })
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
  updateCssDimensionsForZoom(zoom: number) {
    const { canvas, montageArea } = this.editor

    const zoomedWidth = montageArea.width * zoom
    const zoomedHeight = montageArea.height * zoom
    const scrollContainer = canvas.wrapperEl.parentNode

    if (!(scrollContainer instanceof HTMLElement)) return;

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
  setCanvasCSSWidth(value: string | number) {
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
  setCanvasCSSHeight(value: string | number) {
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
  setCanvasWrapperWidth(value: string | number) {
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
  setCanvasWrapperHeight(value: string | number) {
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
  setEditorContainerWidth(value: string | number) {
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
  setEditorContainerHeight(value: string | number) {
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
  setDisplayDimension({ element = 'canvas', dimension, value }: setDisplayDimensionOptions = {}) {
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
      canvasElements.forEach((el) => { (el!).style[cssDimension] = value })

      return
    }

    // eslint-disable-next-line no-restricted-globals
    if (isNaN(value)) return

    const newValuePx = `${value}px`
    canvasElements.forEach((el) => { (el!).style[cssDimension] = newValuePx })

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
   * @fires editor:montage-area-scaled-to-image
   */
  scaleMontageAreaToImage({ object, preserveAspectRatio, withoutSave }: ScaleMontageAreaToImageOptions = {}) {
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

    canvas.fire('editor:montage-area-scaled-to-image', {
      object: image,
      width: newCanvasWidth,
      height: newCanvasHeight,
      preserveAspectRatio,
      withoutSave
    })
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
  setDefaultScale({ withoutSave }: { withoutSave?: boolean } = {}) {
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
