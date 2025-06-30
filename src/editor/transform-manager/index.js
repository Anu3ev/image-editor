import { ActiveSelection } from 'fabric'

import {
  DEFAULT_ZOOM_RATIO,
  DEFAULT_ROTATE_RATIO
} from '../constants'

export default class TransformManager {
  /**
   * @param {object} options
   * @param {ImageEditor} options.editor - экземпляр редактора с доступом к canvas
   */
  constructor({ editor }) {
    this.editor = editor
    this.options = editor.options
  }

  /**
   * Метод рассчитывает и применяет зум по умолчанию для монтажной области редактора.
   * Зум рассчитывается исходя из размеров контейнера редактора и текущих размеров монтажной области.
   * Расчёт происходит таким образом, чтобы монтажная область визуально целиком помещалась в контейнер редактора.
   * Если scale не передан, то используется значение из options.defaultScale.
   * @param {Number} [scale] - Желаемый масштаб относительно размеров контейнера редактора.
   */
  calculateAndApplyDefaultZoom(scale = this.options.defaultScale) {
    const { canvas } = this.editor

    const container = canvas.editorContainer
    const containerWidth = container.clientWidth
    const containerHeight = container.clientHeight

    const { width: montageWidth, height: montageHeight } = this.editor.montageArea

    const scaleX = (containerWidth / montageWidth) * scale
    const scaleY = (containerHeight / montageHeight) * scale

    // выбираем меньший зум, чтобы монтажная область целиком помещалась
    const defaultZoom = Math.min(scaleX, scaleY)

    const { minZoom, maxZoom, maxZoomFactor } = this.options

    // устанавливаем допустимые пределы зума
    this.minZoom = Math.min(defaultZoom / maxZoomFactor, minZoom)
    this.maxZoom = Math.max(defaultZoom * maxZoomFactor, maxZoom)

    // запоминаем дефолтный зум
    this.defaultZoom = defaultZoom

    // применяем дефолтный зум
    this.setZoom(defaultZoom)
  }

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

    const { canvas, minZoom, maxZoom } = this.editor

    const currentZoom = canvas.getZoom()
    const {
      x: pointX = options.pointX,
      y: pointY = options.pointY
    } = canvas.getCenterPoint()

    let zoom = Number((currentZoom + Number(scale)).toFixed(2))

    if (zoom > maxZoom) zoom = maxZoom
    if (zoom < minZoom) zoom = minZoom

    canvas.zoomToPoint({ x: Number(pointX), y: Number(pointY) }, zoom)

    console.log({
      currentZoom,
      zoom,
      pointX,
      pointY,
    })

    canvas.fire('editor:zoom-changed', {
      currentZoom: canvas.getZoom(),
      zoom,
      pointX,
      pointY
    })
  }

  /**
   * Установка зума
   * @param {Number} zoom - Зум
   * @fires editor:zoom-changed
   */
  setZoom(zoom = this.defaultZoom) {
    const { canvas, minZoom, maxZoom } = this.editor

    const { x: pointX, y: pointY } = canvas.getCenterPoint()

    let newZoom = zoom

    if (zoom > maxZoom) newZoom = maxZoom
    if (zoom < minZoom) newZoom = minZoom

    canvas.zoomToPoint({ x: Number(pointX), y: Number(pointY) }, newZoom)

    canvas.fire('editor:zoom-changed', {
      currentZoom: canvas.getZoom(),
      zoom: newZoom,
      pointX,
      pointY
    })
  }

  /**
   * Сброс зума
   * @fires editor:zoom-changed
   */
  resetZoom() {
    const { canvas, defaultZoom } = this.editor
    const { x: pointX, y: pointY } = canvas.getCenterPoint()

    canvas.zoomToPoint({ x: Number(pointX), y: Number(pointY) }, defaultZoom)

    this.editor.canvas.fire('editor:zoom-changed', {
      currentZoom: canvas.getZoom(),
      pointX,
      pointY
    })
  }

  /**
   * Поворот объекта на заданный угол
   * @param {number} angle
   * @param {Object} options
   * @param {Boolean} options.withoutSave - Не сохранять состояние
   * @fires editor:object-rotated
   */
  rotate(angle = DEFAULT_ROTATE_RATIO, { withoutSave } = {}) {
    const { canvas, historyManager } = this.editor

    const obj = canvas.getActiveObject()
    if (!obj) return
    const newAngle = obj.angle + angle
    obj.rotate(newAngle)
    obj.setCoords()

    canvas.renderAll()

    if (!withoutSave) {
      historyManager.saveState()
    }

    canvas.fire('editor:object-rotated', {
      object: obj,
      withoutSave,
      angle: newAngle
    })
  }

  /**
   * Отразить по горизонтали
   * @param {Object} options
   * @param {Boolean} options.withoutSave - Не сохранять состояние
   * @fires editor:object-flipped-x
   */
  flipX({ withoutSave } = {}) {
    const { canvas, historyManager } = this.editor

    const obj = canvas.getActiveObject()
    if (!obj) return
    obj.flipX = !obj.flipX
    canvas.renderAll()

    if (!withoutSave) {
      historyManager.saveState()
    }

    canvas.fire('editor:object-flipped-x', {
      object: obj,
      withoutSave
    })
  }

  /**
   * Отразить по вертикали
   * @param {Object} options
   * @param {Boolean} options.withoutSave - Не сохранять состояние
   * @fires editor:object-flipped-y
   */
  flipY({ withoutSave } = {}) {
    const { canvas, historyManager } = this.editor

    const obj = canvas.getActiveObject()
    if (!obj) return
    obj.flipY = !obj.flipY
    canvas.renderAll()

    if (!withoutSave) {
      historyManager.saveState()
    }

    canvas.fire('editor:object-flipped-y', {
      object: obj,
      withoutSave
    })
  }

  /**
   * Установка прозрачности объекта
   * @param {Number} opacity - Прозрачность от 0 до 1
   * @fires editor:object-opacity-changed
   */
  setActiveObjectOpacity({ object, opacity = 1, withoutSave } = {}) {
    const { canvas, historyManager } = this.editor

    const activeObject = object || canvas.getActiveObject()
    if (!activeObject) return

    if (activeObject.type === 'activeselection') {
      activeObject.getObjects().forEach((obj) => {
        obj.set('opacity', opacity)
      })
    } else {
      activeObject.set('opacity', opacity)
    }

    canvas.renderAll()

    if (!withoutSave) {
      historyManager.saveState()
    }

    canvas.fire('editor:object-opacity-changed', {
      object: activeObject,
      opacity,
      withoutSave
    })
  }

  /**
   * Масштабирование объекта
   * @param {Object} options
   * @param {fabric.Object} [options.object] - Объект с изображением, которое нужно масштабировать
   * @param {String} [options.type] - Тип масштабирования
   * 'contain' - скейлит картинку, чтобы она вмещалась
   * 'cover' - скейлит картинку, чтобы она вписалась в размер канвас
   * @param {Boolean} [options.withoutSave] - Не сохранять состояние
   * @param {Boolean} [options.fitAsOneObject] - Масштабировать все объекты в активной группе как один объект
   * @fires editor:image-fitted
   */
  fitObject({ object, type = this.options.scaleType, withoutSave, fitAsOneObject } = {}) {
    const { canvas, imageManager, historyManager } = this.editor

    const activeObject = object || canvas.getActiveObject()
    if (!activeObject) return

    // Сбрасываем угол поворота
    activeObject.set('angle', 0)

    if (['activeselection'].includes(activeObject.type) && !fitAsOneObject) {
      const selectedItems = activeObject.getObjects()

      canvas.discardActiveObject()

      selectedItems.forEach((obj) => {
        const objScale = imageManager.calculateScaleFactor({ imageObject: obj, scaleType: type })

        obj.scale(objScale)
        canvas.centerObject(obj)
      })

      const sel = new ActiveSelection(selectedItems, { canvas })

      canvas.setActiveObject(sel)
    } else {
      const scaleFactor = imageManager.calculateScaleFactor({
        imageObject: activeObject,
        scaleType: type
      })

      activeObject.scale(scaleFactor)
      canvas.centerObject(activeObject)
    }

    canvas.renderAll()

    if (!withoutSave) {
      historyManager.saveState()
    }

    canvas.fire('editor:object-fitted', {
      object: activeObject,
      type,
      withoutSave,
      fitAsOneObject
    })
  }

  /**
   * Установка дефолтного масштаба для всех объектов внутри монтажной области редактора
   */
  resetObjects() {
    this.editor.canvasManager.getObjects().forEach((obj) => {
      this.resetObject(obj)
    })
  }

  /**
   * Сброс масштаба объекта до дефолтного
   * @param {fabric.Object} object
   * @param {Object} options
   * @param {Boolean} [options.withoutSave] - Не сохранять состояние
   * @param {Boolean} [options.alwaysFitObject] - вписывать объект в рабочую область даже если он меньше рабочей области
   * @returns
   * @fires editor:object-reset
   */
  resetObject(object, { alwaysFitObject = false, withoutSave = false } = {}) {
    const {
      canvas,
      montageArea,
      imageManager,
      historyManager,
      options: { scaleType }
    } = this.editor

    const currentObject = object || canvas.getActiveObject()

    if (!currentObject || currentObject.locked) return

    historyManager.suspendHistory()

    const isImage = currentObject.type === 'image' || currentObject.format === 'svg'

    if (!isImage) {
      currentObject.set({
        scaleX: 1,
        scaleY: 1,
        flipX: false,
        flipY: false,
        angle: 0
      })
    }

    if (alwaysFitObject) {
      this.fitObject({ object: currentObject, withoutSave: true, fitAsOneObject: true })
    } else {
      const { width: montageAreaWidth, height: montageAreaHeight } = montageArea
      const { width: imageWidth, height: imageHeight } = currentObject

      const scaleFactor = imageManager.calculateScaleFactor({
        imageObject: currentObject,
        scaleType
      })

      const needFit = (scaleType === 'contain' && scaleFactor < 1)
        || (scaleType === 'cover' && (imageWidth > montageAreaWidth || imageHeight > montageAreaHeight))

      // Делаем contain и cover только если размеры изображения больше размеров канваса, иначе просто сбрасываем
      if (needFit) {
        this.fitObject({ object: currentObject, withoutSave: true, fitAsOneObject: true })
      } else {
        currentObject.set({ scaleX: 1, scaleY: 1 })
      }
    }

    currentObject.set({ flipX: false, flipY: false, angle: 0 })
    canvas.centerObject(currentObject)
    canvas.renderAll()

    historyManager.resumeHistory()
    if (!withoutSave) historyManager.saveState()

    canvas.fire('editor:object-reset', {
      object: currentObject,
      withoutSave,
      alwaysFitObject
    })
  }
}
