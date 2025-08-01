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
   */
  public editor: ImageEditor

  /**
   * Параметры (опции) для слушателей.
   */
  public options: CanvasOptions

  /**
   * Минимальный зум
   */
  public minZoom: number

  /**
   * Максимальный зум
   */
  public maxZoom: number

  /**
   * Дефолтный зум, который будет применён при инициализации редактора
   */
  public defaultZoom: number

  /**
   * Максимальный коэффициент зума
   */
  public maxZoomFactor: number

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
   * @param scale - Желаемый масштаб относительно размеров контейнера редактора.
   */
  public calculateAndApplyDefaultZoom(scale: number = this.options.defaultScale): void {
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
   * @param scale - Шаг зума
   * @param options - Координаты зума (по умолчанию центр канваса)
   * @param options.pointX - Координата X точки зума
   * @param options.pointY - Координата Y точки зума
   * @fires editor:zoom-changed
   * Если передавать координаты курсора, то нужно быть аккуратнее, так как юзер может выйти за пределы рабочей области
   */
  public zoom(scale: number = DEFAULT_ZOOM_RATIO, options: { pointX?: number, pointY?: number } = {}): void {
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
   * @param zoom - Зум
   * @fires editor:zoom-changed
   */
  public setZoom(zoom: number = this.defaultZoom): void {
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
  public resetZoom(): void {
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
   * @param angle
   * @param options
   * @param options.withoutSave - Не сохранять состояние
   * @fires editor:object-rotated
   */
  public rotate(angle: number = DEFAULT_ROTATE_RATIO, { withoutSave }: { withoutSave?: boolean } = {}): void {
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
   * @param options
   * @param options.withoutSave - Не сохранять состояние
   * @fires editor:object-flipped-x
   */
  public flipX({ withoutSave }: { withoutSave?: boolean } = {}): void {
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
   * @param options
   * @param options.withoutSave - Не сохранять состояние
   * @fires editor:object-flipped-y
   */
  public flipY({ withoutSave }: { withoutSave?: boolean } = {}): void {
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
   * @param options
   * @param options.object - Объект, для которого нужно установить прозрачность
   * @param options.withoutSave - Не сохранять состояние
   * @param options.opacity - Прозрачность от 0 до 1
   * @fires editor:object-opacity-changed
   */
  public setActiveObjectOpacity({
    object,
    opacity = 1,
    withoutSave
  }: { object?: FabricObject; opacity?: number; withoutSave?: boolean } = {}): void {
    const { canvas, historyManager } = this.editor

    const activeObject = object || canvas.getActiveObject()
    if (!activeObject) return

    if (activeObject instanceof ActiveSelection) {
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
   * @param options
   * @param options.object - Объект с изображением, которое нужно масштабировать
   * @param options.type - Тип масштабирования
   * 'contain' - скейлит картинку, чтобы она вмещалась
   * 'cover' - скейлит картинку, чтобы она вписалась в размер канвас
   * @param options.withoutSave - Не сохранять состояние
   * @param options.fitAsOneObject - Масштабировать все объекты в активной группе как один объект
   * @fires editor:image-fitted
   */
  public fitObject({
    object,
    type = this.options.scaleType,
    withoutSave,
    fitAsOneObject
  }: {
    object?: FabricObject,
    type?: 'contain' | 'cover',
    withoutSave?: boolean,
    fitAsOneObject?: boolean
  } = {}): void {
    const { canvas, historyManager } = this.editor

    const activeObject = object || canvas.getActiveObject()
    if (!activeObject) return

    if (activeObject instanceof ActiveSelection && !fitAsOneObject) {
      const selectedItems = activeObject.getObjects()

      canvas.discardActiveObject()

      selectedItems.forEach((obj: FabricObject) => {
        this._fitSingleObject(obj, type)
      })

      const sel = new ActiveSelection(selectedItems, { canvas })
      canvas.setActiveObject(sel)
    } else {
      this._fitSingleObject(activeObject, type)
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
   * Масштабирует отдельный объект с учетом его угла поворота
   * @param obj - объект для масштабирования
   * @param type - тип масштабирования
   * @private
   */
  private _fitSingleObject(obj: FabricObject, type: 'contain' | 'cover'): void {
    const { canvas, montageArea } = this.editor

    const { width, height, scaleX = 1, scaleY = 1, angle = 0 } = obj

    // Рассчитываем текущие масштабированные размеры
    const scaledWidth = width * Math.abs(scaleX)
    const scaledHeight = height * Math.abs(scaleY)

    // Рассчитываем размеры с учетом поворота
    const radians = (angle * Math.PI) / 180
    const cos = Math.abs(Math.cos(radians))
    const sin = Math.abs(Math.sin(radians))

    const rotatedWidth = scaledWidth * cos + scaledHeight * sin
    const rotatedHeight = scaledWidth * sin + scaledHeight * cos

    // Рассчитываем коэффициент масштабирования
    const canvasWidth = montageArea.width
    const canvasHeight = montageArea.height

    let scaleFactor: number

    if (type === 'contain') {
      scaleFactor = Math.min(canvasWidth / rotatedWidth, canvasHeight / rotatedHeight)
    } else {
      scaleFactor = Math.max(canvasWidth / rotatedWidth, canvasHeight / rotatedHeight)
    }

    // Применяем масштабирование к текущим значениям scaleX и scaleY
    obj.set({
      scaleX: scaleX * scaleFactor,
      scaleY: scaleY * scaleFactor
    })

    canvas.centerObject(obj)
  }

  /**
   * Установка дефолтного масштаба для всех объектов внутри монтажной области редактора
   */
  public resetObjects(): void {
    this.editor.canvasManager.getObjects().forEach((obj) => {
      this.resetObject(obj)
    })
  }

  /**
   * Сброс масштаба объекта до дефолтного
   * @param object
   * @param options
   * @param options.withoutSave - Не сохранять состояние
   * @param options.alwaysFitObject - вписывать объект в рабочую область даже если он меньше рабочей области
   * @fires editor:object-reset
   */
  public resetObject(object:FabricObject, { alwaysFitObject = false, withoutSave = false } = {}): void {
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
