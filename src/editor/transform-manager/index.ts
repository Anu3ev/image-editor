import { ActiveSelection, CanvasOptions, FabricObject, Point } from 'fabric'
import { ImageEditor } from '../index'

import {
  DEFAULT_ZOOM_RATIO,
  DEFAULT_ROTATE_RATIO,
  MIN_ZOOM,
  MAX_ZOOM
} from '../constants'

export default class TransformManager {
  /**
   * Инстанс редактора с доступом к canvas
   * @type {ImageEditor}
   */
  editor: ImageEditor
  /**
   * Параметры (опции) для слушателей.
   * @type {CanvasOptions}
   */
  options: CanvasOptions
  /**
   * Минимальный зум
   * @type {Number}
   */
  minZoom: number
  /**
   * Максимальный зум
   * @type {Number}
   */
  maxZoom: number
  /**
   * Дефолтный зум, который будет применён при инициализации редактора
   * @type {Number}
   */
  defaultZoom: number
  /**
   * Максимальный коэффициент зума
   * @type {Number}
   */
  maxZoomFactor: number

  constructor({ editor }: { editor: ImageEditor }) {
    this.editor = editor
    this.options = editor.options
    this.minZoom = this.options.minZoom || MIN_ZOOM
    this.maxZoom = this.options.maxZoom || MAX_ZOOM
    this.defaultZoom = this.options.defaultScale
    this.maxZoomFactor = this.options.maxZoomFactor
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
    this.defaultZoom = Math.min(scaleX, scaleY)

    const { defaultZoom, maxZoomFactor, minZoom, maxZoom } = this

    // устанавливаем допустимые пределы зума
    this.minZoom = Math.min(defaultZoom / maxZoomFactor, minZoom)
    this.maxZoom = Math.max(defaultZoom * maxZoomFactor, maxZoom)

    // применяем дефолтный зум
    this.setZoom()
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
  zoom(scale = DEFAULT_ZOOM_RATIO, options: { pointX?: number, pointY?: number } = {}) {
    if (!scale) return

    const { minZoom, maxZoom } = this
    const { canvas } = this.editor

    const currentZoom = canvas.getZoom()
    const center = canvas.getCenterPoint()
    const pointX = options.pointX ?? center.x
    const pointY = options.pointY ?? center.y
    const point = new Point(pointX, pointY)

    let zoom = Number((currentZoom + Number(scale)).toFixed(2))
    if (zoom > maxZoom) zoom = maxZoom
    if (zoom < minZoom) zoom = minZoom

    canvas.zoomToPoint(point, zoom)

    console.log({
      currentZoom,
      zoom,
      point
    })

    canvas.fire('editor:zoom-changed', {
      currentZoom: canvas.getZoom(),
      zoom,
      point
    })
  }

  /**
   * Установка зума
   * @param {Number} zoom - Зум
   * @fires editor:zoom-changed
   */
  setZoom(zoom = this.defaultZoom) {
    const { minZoom, maxZoom } = this
    const { canvas } = this.editor
    const centerPoint = new Point(canvas.getCenterPoint())

    let newZoom = zoom

    if (zoom > maxZoom) newZoom = maxZoom
    if (zoom < minZoom) newZoom = minZoom

    canvas.zoomToPoint(centerPoint, newZoom)

    canvas.fire('editor:zoom-changed', {
      currentZoom: canvas.getZoom(),
      zoom: newZoom,
      point: centerPoint
    })
  }

  /**
   * Сброс зума
   * @fires editor:zoom-changed
   */
  resetZoom() {
    const { canvas } = this.editor
    const centerPoint = new Point(canvas.getCenterPoint())

    canvas.zoomToPoint(centerPoint, this.defaultZoom)

    this.editor.canvas.fire('editor:zoom-changed', {
      currentZoom: canvas.getZoom(),
      point: centerPoint
    })
  }

  /**
   * Поворот объекта на заданный угол
   * @param {number} angle
   * @param {Object} options
   * @param {Boolean} options.withoutSave - Не сохранять состояние
   * @fires editor:object-rotated
   */
  rotate(angle = DEFAULT_ROTATE_RATIO, { withoutSave }: { withoutSave?: boolean } = {}) {
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
  flipX({ withoutSave }: { withoutSave?: boolean } = {}) {
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
  flipY({ withoutSave }: { withoutSave?: boolean } = {}) {
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
  setActiveObjectOpacity({
    object,
    opacity = 1,
    withoutSave
  }: { object?: FabricObject; opacity?: number; withoutSave?: boolean } = {}) {
    const { canvas, historyManager } = this.editor

    const activeObject = object || canvas.getActiveObject()
    if (!activeObject) return

    if (activeObject.type === 'activeselection') {
      activeObject.getObjects().forEach((obj:FabricObject) => {
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
  fitObject({
    object,
    type = this.options.scaleType,
    withoutSave,
    fitAsOneObject
  }: {
    object?: FabricObject,
    type?: 'contain' | 'cover',
    withoutSave?: boolean,
    fitAsOneObject?: boolean
  } = {}) {
    const { canvas, imageManager, historyManager } = this.editor

    const activeObject = object || canvas.getActiveObject()
    if (!activeObject) return

    // Сбрасываем угол поворота
    activeObject.set('angle', 0)

    if (['activeselection'].includes(activeObject.type) && !fitAsOneObject) {
      const selectedItems = activeObject.getObjects()

      canvas.discardActiveObject()

      selectedItems.forEach((obj:FabricObject) => {
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
  resetObject(object:FabricObject, { alwaysFitObject = false, withoutSave = false } = {}) {
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
