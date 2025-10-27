import { CanvasOptions, Point } from 'fabric'

import { ImageEditor } from '../index'
import {
  DEFAULT_ZOOM_RATIO,
  MAX_ZOOM,
  MIN_ZOOM
} from '../constants'

export default class ZoomManager {
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
   * Дефолтный зум, который будет применён при инициализации редактора.
   */
  public defaultZoom: number

  constructor({ editor }: { editor: ImageEditor }) {
    this.editor = editor
    this.options = editor.options
    this.minZoom = this.options.minZoom || MIN_ZOOM
    this.maxZoom = this.options.maxZoom || MAX_ZOOM
    this.defaultZoom = this.options.defaultScale
  }

  /**
   * Вспомогательный метод для вычисления размеров масштабированной монтажной области
   * @param zoom - Масштаб для расчета
   * @returns Размеры масштабированной монтажной области
   * @private
   */
  private _getScaledMontageDimensions(zoom: number): { width: number; height: number } {
    const { montageArea } = this.editor
    return {
      width: montageArea.width * zoom,
      height: montageArea.height * zoom
    }
  }

  /**
   * Ограничивает координаты курсора видимыми границами монтажной области
   * @param event - Событие колеса мыши
   * @returns Ограниченные координаты в canvas-пространстве
   * @private
   */
  private _getClampedPointerCoordinates(event: WheelEvent): { x: number; y: number } {
    const { canvas, montageArea } = this.editor

    const canvasPointer = canvas.getPointer(event, true)
    const vpt = canvas.viewportTransform
    const zoom = canvas.getZoom()

    const montageMinX = montageArea.left - montageArea.width / 2
    const montageMaxX = montageArea.left + montageArea.width / 2
    const montageMinY = montageArea.top - montageArea.height / 2
    const montageMaxY = montageArea.top + montageArea.height / 2

    const montageCanvasMinX = montageMinX * zoom + vpt[4]
    const montageCanvasMaxX = montageMaxX * zoom + vpt[4]
    const montageCanvasMinY = montageMinY * zoom + vpt[5]
    const montageCanvasMaxY = montageMaxY * zoom + vpt[5]

    const clampedCanvasX = Math.max(montageCanvasMinX, Math.min(montageCanvasMaxX, canvasPointer.x))
    const clampedCanvasY = Math.max(montageCanvasMinY, Math.min(montageCanvasMaxY, canvasPointer.y))

    return {
      x: clampedCanvasX,
      y: clampedCanvasY
    }
  }

  /**
   * Вычисляет зум при котором монтажная область точно помещается в viewport
   * @returns Минимальный зум для полного размещения монтажной области
   * @private
   */
  private _calculateFitZoom(): number {
    const { canvas, montageArea } = this.editor
    const viewportWidth = canvas.getWidth()
    const viewportHeight = canvas.getHeight()

    const fitZoomX = viewportWidth / montageArea.width
    const fitZoomY = viewportHeight / montageArea.height

    return Math.max(fitZoomX, fitZoomY)
  }

  /**
   * Вычисляет целевую позицию viewport для центрирования монтажной области
   * @param zoom - Текущий зум
   * @returns Целевые координаты viewport transform
   * @private
   */
  private _calculateTargetViewportPosition(zoom: number): { x: number; y: number } {
    const { canvas, montageArea } = this.editor
    const viewportWidth = canvas.getWidth()
    const viewportHeight = canvas.getHeight()

    const canvasCenterX = viewportWidth / 2
    const canvasCenterY = viewportHeight / 2
    const montageCenterX = montageArea.left
    const montageCenterY = montageArea.top

    return {
      x: canvasCenterX - montageCenterX * zoom,
      y: canvasCenterY - montageCenterY * zoom
    }
  }

  /**
   * Проверяет наличие пустого пространства вокруг монтажной области
   * @param zoom - Текущий зум
   * @returns Максимальное соотношение пустого пространства к размеру viewport
   * @private
   */
  private _calculateEmptySpaceRatio(zoom: number): number {
    const { canvas, montageArea } = this.editor
    const vpt = canvas.viewportTransform
    const viewportWidth = canvas.getWidth()
    const viewportHeight = canvas.getHeight()

    const montageMinX = montageArea.left - montageArea.width / 2
    const montageMaxX = montageArea.left + montageArea.width / 2
    const montageMinY = montageArea.top - montageArea.height / 2
    const montageMaxY = montageArea.top + montageArea.height / 2

    const viewportMinX = -vpt[4] / zoom
    const viewportMaxX = (-vpt[4] + viewportWidth) / zoom
    const viewportMinY = -vpt[5] / zoom
    const viewportMaxY = (-vpt[5] + viewportHeight) / zoom

    const hasEmptySpaceLeft = viewportMinX < montageMinX
    const hasEmptySpaceRight = viewportMaxX > montageMaxX
    const hasEmptySpaceTop = viewportMinY < montageMinY
    const hasEmptySpaceBottom = viewportMaxY > montageMaxY
    const hasEmptySpace = hasEmptySpaceLeft || hasEmptySpaceRight || hasEmptySpaceTop || hasEmptySpaceBottom

    if (!hasEmptySpace) return 0

    const emptySpaceLeft = Math.max(0, montageMinX - viewportMinX)
    const emptySpaceRight = Math.max(0, viewportMaxX - montageMaxX)
    const emptySpaceTop = Math.max(0, montageMinY - viewportMinY)
    const emptySpaceBottom = Math.max(0, viewportMaxY - montageMaxY)

    const maxEmptyX = Math.max(emptySpaceLeft, emptySpaceRight)
    const maxEmptyY = Math.max(emptySpaceTop, emptySpaceBottom)

    const emptyRatioX = maxEmptyX / viewportWidth
    const emptyRatioY = maxEmptyY / viewportHeight

    return Math.max(emptyRatioX, emptyRatioY)
  }

  /**
   * Вычисляет плавный шаг перемещения viewport к центру с ускорением
   * @param targetVpt - Целевая позиция viewport
   * @param zoom - Текущий зум
   * @param fitZoom - Зум при котором монтажная область помещается в viewport
   * @param zoomStep - Шаг изменения зума
   * @param maxEmptyRatio - Максимальная доля пустого пространства
   * @returns Вычисленный шаг перемещения viewport
   * @private
   */
  private _calculateSmoothCenteringStep(
    targetVpt: { x: number; y: number },
    zoom: number,
    fitZoom: number,
    zoomStep: number,
    maxEmptyRatio: number
  ): { x: number; y: number } {
    const { canvas, montageArea } = this.editor
    const vpt = canvas.viewportTransform
    const viewportWidth = canvas.getWidth()
    const viewportHeight = canvas.getHeight()

    const remainingDistanceX = targetVpt.x - vpt[4]
    const remainingDistanceY = targetVpt.y - vpt[5]

    const absoluteZoomStep = Math.abs(zoomStep)
    const distanceFromFit = zoom - fitZoom
    const numberOfStepsToFit = Math.abs(distanceFromFit) / absoluteZoomStep

    if (numberOfStepsToFit <= 0.1) {
      return { x: remainingDistanceX, y: remainingDistanceY }
    }

    const canvasCenterX = viewportWidth / 2
    const canvasCenterY = viewportHeight / 2
    const montageCenterX = montageArea.left
    const montageCenterY = montageArea.top

    const currentVptAtFitX = canvasCenterX - montageCenterX * fitZoom
    const currentVptAtFitY = canvasCenterY - montageCenterY * fitZoom
    const vptChangePerZoomStepX = (currentVptAtFitX - vpt[4]) / (zoom - fitZoom)
    const vptChangePerZoomStepY = (currentVptAtFitY - vpt[5]) / (zoom - fitZoom)
    const baseStepX = vptChangePerZoomStepX * absoluteZoomStep
    const baseStepY = vptChangePerZoomStepY * absoluteZoomStep

    const adjustedStepX = baseStepX * maxEmptyRatio
    const adjustedStepY = baseStepY * maxEmptyRatio

    const clampedStepX = Math.abs(adjustedStepX) > Math.abs(remainingDistanceX)
      ? remainingDistanceX
      : adjustedStepX
    const clampedStepY = Math.abs(adjustedStepY) > Math.abs(remainingDistanceY)
      ? remainingDistanceY
      : adjustedStepY

    return { x: clampedStepX, y: clampedStepY }
  }

  /**
   * Применяет плавное центрирование viewport при приближении к defaultZoom.
   * При zoom <= defaultZoom монтажная область полностью центрируется.
   * При zoom > defaultZoom применяется плавная интерполяция в пределах переходного диапазона.
   * @param zoom - Текущий зум
   * @param isZoomingOut - Флаг, указывающий что происходит zoom-out (уменьшение масштаба)
   * @param zoomStep - Шаг зума (адаптивно рассчитанный)
   * @returns true если центрирование было применено
   * @private
   */
  private _applyViewportCentering(
    zoom: number,
    isZoomingOut: boolean = false,
    zoomStep: number = DEFAULT_ZOOM_RATIO
  ): boolean {
    const { canvas } = this.editor

    const scaledDimensions = this._getScaledMontageDimensions(zoom)
    const viewportWidth = canvas.getWidth()
    const viewportHeight = canvas.getHeight()
    const montageExceedsViewport = scaledDimensions.width > viewportWidth || scaledDimensions.height > viewportHeight

    const fitZoom = this._calculateFitZoom()
    const distanceFromFit = zoom - fitZoom
    const isInCenteringRange = !montageExceedsViewport || distanceFromFit

    if (!isInCenteringRange && !isZoomingOut) {
      return false
    }

    const vpt = canvas.viewportTransform
    const targetVpt = this._calculateTargetViewportPosition(zoom)

    if (!montageExceedsViewport) {
      vpt[4] = targetVpt.x
      vpt[5] = targetVpt.y
      canvas.setViewportTransform(vpt)
      return true
    }

    if (isZoomingOut && montageExceedsViewport) {
      const maxEmptyRatio = this._calculateEmptySpaceRatio(zoom)

      if (maxEmptyRatio > 0) {
        const step = this._calculateSmoothCenteringStep(targetVpt, zoom, fitZoom, zoomStep, maxEmptyRatio)

        vpt[4] += step.x
        vpt[5] += step.y
        canvas.setViewportTransform(vpt)
        return true
      }
    }

    return false
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
    const containerWidth = container.clientWidth || canvas.getWidth()
    const containerHeight = container.clientHeight || canvas.getHeight()

    const { width: montageWidth, height: montageHeight } = this.editor.montageArea

    const scaleX = (containerWidth / montageWidth) * scale
    const scaleY = (containerHeight / montageHeight) * scale

    // выбираем меньший зум, чтобы монтажная область целиком помещалась
    this.defaultZoom = Math.min(scaleX, scaleY)

    // применяем дефолтный зум
    this.setZoom()

    // обновляем границы перетаскивания
    this.editor.panConstraintManager.updateBounds()
  }

  /**
   * Обработчик зума колесом мыши с автоматическим определением точки зума.
   * Логика выбора точки зума:
   * - При zoom-out (уменьшении): зум к текущему центру монтажной области
   * - При zoom-in (увеличении): зум к позиции курсора (ограниченной границами монтажной области)
   * - Если zoom < defaultZoom или монтажная область помещается во viewport - зум к центру монтажной области
   * @param scale - Шаг зума
   * @param event - Событие колеса мыши
   * @fires editor:zoom-changed
   */
  public handleMouseWheelZoom(scale: number, event: WheelEvent): void {
    const { canvas, montageArea } = this.editor
    const currentZoom = canvas.getZoom()
    const isZoomingOut = scale < 0

    const scaledDimensions = this._getScaledMontageDimensions(currentZoom)
    const viewportWidth = canvas.getWidth()
    const viewportHeight = canvas.getHeight()
    const montageExceedsViewport = scaledDimensions.width > viewportWidth || scaledDimensions.height > viewportHeight

    if (isZoomingOut) {
      if (!montageExceedsViewport) {
        this.zoom(scale, {
          pointX: montageArea.left,
          pointY: montageArea.top
        })
      } else {
        const clampedPointer = this._getClampedPointerCoordinates(event)
        this.zoom(scale, {
          pointX: clampedPointer.x,
          pointY: clampedPointer.y
        })
      }
      return
    }

    if (scale < 0 || !montageExceedsViewport) {
      this.zoom(scale, {
        pointX: montageArea.left,
        pointY: montageArea.top
      })
      return
    }

    const clampedPointer = this._getClampedPointerCoordinates(event)

    this.zoom(scale, {
      pointX: clampedPointer.x,
      pointY: clampedPointer.y
    })
  }

  /**
   * Увеличение/уменьшение масштаба
   * @param scale - Шаг зума
   * @param options - Координаты зума (по умолчанию центр канваса)
   * @param options.pointX - Координата X точки зума
   * @param options.pointY - Координата Y точки зума
   * @fires editor:zoom-changed
   */
  public zoom(scale: number = DEFAULT_ZOOM_RATIO, options: { pointX?: number; pointY?: number } = {}): void {
    if (!scale) return

    const { minZoom, maxZoom } = this
    const { canvas } = this.editor
    const isZoomingOut = scale < 0

    const currentZoom = canvas.getZoom()
    const center = canvas.getCenterPoint()
    const pointX = options.pointX ?? center.x
    const pointY = options.pointY ?? center.y
    const point = new Point(pointX, pointY)

    this.editor.montageArea.setCoords()
    this.editor.canvas.requestRenderAll()

    let zoom = Number((currentZoom + Number(scale)).toFixed(3))
    if (zoom > maxZoom) zoom = maxZoom
    if (zoom < minZoom) zoom = minZoom

    canvas.zoomToPoint(point, zoom)

    this.editor.panConstraintManager.updateBounds()
    this._applyViewportCentering(zoom, isZoomingOut, scale)

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

    this.editor.panConstraintManager.updateBounds()
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

    this.editor.panConstraintManager.updateBounds()
  }
}
