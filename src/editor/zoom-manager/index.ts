import { CanvasOptions, Point } from 'fabric'

import { ImageEditor } from '../index'
import {
  DEFAULT_ZOOM_RATIO,
  MAX_ZOOM,
  MIN_ZOOM
} from '../constants'

type ZoomPointerCoordinates = {
  clientX: number
  clientY: number
}

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
    this.defaultZoom = this._normalizeDefaultZoom(this.options.defaultScale)
  }

  /**
   * Приводит значение defaultZoom к числу с двумя знаками после запятой, а также учитывает минимальное и максимальное значения.
   * @param zoom - Значение зума для нормализации
   * @returns Нормализованное значение зума
   * @private
   */
  private _normalizeDefaultZoom(zoom: number): number {
    return Math.min(this.maxZoom, Math.max(this.minZoom, Number(zoom.toFixed(2))))
  }

  /**
   * Вычисляет defaultZoom для текущих размеров контейнера и монтажной области.
   * defaultZoom является derived camera-state и должен пересчитываться каждый раз,
   * когда меняется viewport контейнера или размер montageArea.
   * @param scale - Желаемый масштаб относительно размеров контейнера редактора.
   * @private
   */
  private _calculateDefaultZoom(scale: number): number {
    const { canvas, montageArea } = this.editor

    const container = canvas.editorContainer
    const containerWidth = container.clientWidth || canvas.getWidth()
    const containerHeight = container.clientHeight || canvas.getHeight()

    const scaleX = (containerWidth / montageArea.width) * scale
    const scaleY = (containerHeight / montageArea.height) * scale

    return this._normalizeDefaultZoom(Math.min(scaleX, scaleY))
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
   * в viewport coordinates, потому что zoomToPoint работает именно в этой плоскости.
   * @param pointer - DOM-координаты указателя
   * @returns Ограниченные viewport-координаты внутри видимой области монтажа
   * @private
   */
  private _getClampedPointerCoordinates(pointer: ZoomPointerCoordinates): { x: number; y: number } {
    const { canvas, montageArea } = this.editor

    const viewportPointer = this._getViewportPointerCoordinates(pointer)
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

    const clampedCanvasX = Math.max(montageCanvasMinX, Math.min(montageCanvasMaxX, viewportPointer.x))
    const clampedCanvasY = Math.max(montageCanvasMinY, Math.min(montageCanvasMaxY, viewportPointer.y))

    return {
      x: clampedCanvasX,
      y: clampedCanvasY
    }
  }

  /**
   * Переводит DOM client-координаты в viewport coordinates canvas.
   * @param pointer - DOM-координаты указателя
   * @returns Координаты указателя внутри canvas viewport
   * @private
   */
  private _getViewportPointerCoordinates(pointer: ZoomPointerCoordinates): { x: number; y: number } {
    const rect = this.editor.canvas.upperCanvasEl.getBoundingClientRect()

    return {
      x: pointer.clientX - rect.left,
      y: pointer.clientY - rect.top
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
   *
   * Camera-state должен жить только в viewportTransform. MontageArea здесь выступает
   * стабильной scene-опорой, а не объектом, который нужно физически двигать по сцене
   * при resize контейнера или reset зума.
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

    // Проверяем, выходит ли монтажная область за пределы viewport
    const scaledDimensions = this._getScaledMontageDimensions(zoom)
    const viewportWidth = canvas.getWidth()
    const viewportHeight = canvas.getHeight()
    const montageExceedsViewport = scaledDimensions.width > viewportWidth || scaledDimensions.height > viewportHeight

    const fitZoom = this._calculateFitZoom()
    const distanceFromFit = zoom - fitZoom
    const isInCenteringRange = !montageExceedsViewport || distanceFromFit

    // Проверяем, нужно ли применять центрирование
    if (!isInCenteringRange && !isZoomingOut) {
      return false
    }

    const vpt = canvas.viewportTransform
    const targetVpt = this._calculateTargetViewportPosition(zoom)

    // Если монтажная область помещается в viewport, сразу центрируем
    if (!montageExceedsViewport) {
      vpt[4] = targetVpt.x
      vpt[5] = targetVpt.y
      canvas.setViewportTransform(vpt)
      return true
    }

    // При zoom-out проверяем наличие пустого пространства и применяем плавное центрирование
    if (isZoomingOut && !montageExceedsViewport) {
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
   * Нормализует текущий viewportTransform по pan-границам после zoom-сценария.
   * Zoom может сдвинуть camera-state за допустимый pan-диапазон быстрее,
   * чем следующий scroll или Space-drag успеют пройти через PanConstraintManager.
   * В этом случае bounds нужно применить сразу в том же zoom write-path,
   * чтобы не оставлять invalid viewport до первого pan-события.
   * @private
   */
  private _constrainViewportToPanBounds(): void {
    const { canvas, montageArea, panConstraintManager } = this.editor
    const vpt = canvas.viewportTransform

    panConstraintManager.updateBounds()

    const constrainedViewport = panConstraintManager.constrainPan(vpt[4], vpt[5])
    const didViewportChange = constrainedViewport.x !== vpt[4] || constrainedViewport.y !== vpt[5]

    if (!didViewportChange) return

    const nextViewportTransform = [...vpt] as typeof vpt

    nextViewportTransform[4] = constrainedViewport.x
    nextViewportTransform[5] = constrainedViewport.y

    canvas.setViewportTransform(nextViewportTransform)
    montageArea.setCoords()
  }

  /**
   * Пересчитывает defaultZoom для текущих размеров контейнера и монтажной области.
   * Метод обновляет только derived camera-state и не меняет текущий viewport.
   * @param scale - Желаемый масштаб относительно размеров контейнера редактора.
   * @returns Новое значение defaultZoom
   */
  public updateDefaultZoom(scale: number = this.options.defaultScale): number {
    this.defaultZoom = this._calculateDefaultZoom(scale)

    return this.defaultZoom
  }

  /**
   * Пересчитывает и сразу применяет defaultZoom для текущей монтажной области.
   * Используется когда меняется размер montageArea и текущий camera-state нужно
   * нормализовать к новому fit-состоянию.
   * @param scale - Желаемый масштаб относительно размеров контейнера редактора.
   */
  public calculateAndApplyDefaultZoom(scale: number = this.options.defaultScale): void {
    this.updateDefaultZoom(scale)

    // применяем дефолтный зум
    this.setZoom()
  }

  /**
   * Обработчик зума от DOM-события с координатами указателя.
   * Логика выбора точки зума:
   * - Пока монтажная область полностью помещается во viewport, зум идёт от её опорной точки.
   * - Когда монтажная область уже больше viewport, zoom-in и zoom-out идут от позиции указателя.
   *
   * Важный контракт: pointer-zoom работает только через viewportTransform.
   * Scene state монтажной области и объектов остаётся стабильным.
   * @param scale - Шаг зума
   * @param pointer - DOM-координаты указателя
   * @fires editor:zoom-changed
   */
  public handlePointerZoom(scale: number, pointer: ZoomPointerCoordinates): void {
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
        const clampedPointer = this._getClampedPointerCoordinates(pointer)
        this.zoom(scale, {
          pointX: clampedPointer.x,
          pointY: clampedPointer.y
        })
      }
      return
    }

    if (!montageExceedsViewport) {
      this.zoom(scale, {
        pointX: montageArea.left,
        pointY: montageArea.top
      })
      return
    }

    const clampedPointer = this._getClampedPointerCoordinates(pointer)

    this.zoom(scale, {
      pointX: clampedPointer.x,
      pointY: clampedPointer.y
    })
  }

  /**
   * Техническая совместимость для существующего wheel API.
   * Новый app-код должен использовать handlePointerZoom, чтобы не привязывать camera-state к WheelEvent.
   * @param scale - Шаг зума
   * @param event - Событие колеса мыши
   * @fires editor:zoom-changed
   */
  public handleMouseWheelZoom(scale: number, event: WheelEvent): void {
    this.handlePointerZoom(scale, event)
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

    // Live-zoom не округляется на каждом wheel-событии:
    // мелкие инкременты тачпада должны накапливаться.
    let zoom = currentZoom + Number(scale)
    if (zoom > maxZoom) zoom = maxZoom
    if (zoom < minZoom) zoom = minZoom

    canvas.zoomToPoint(point, zoom)

    this._applyViewportCentering(zoom, isZoomingOut, scale)
    this._constrainViewportToPanBounds()

    canvas.fire('editor:zoom-changed', {
      currentZoom: canvas.getZoom(),
      zoom,
      point
    })
  }

  /**
   * Установка зума
   * После применения зума viewport заново центрируется на монтажной области,
   * чтобы reset/default zoom работали относительно стабильных scene coordinates.
   * @param zoom - Зум
   * @fires editor:zoom-changed
   */
  public setZoom(zoom: number = this.defaultZoom): void {
    const { minZoom, maxZoom } = this
    const {
      canvas,
      canvasManager,
      montageArea
    } = this.editor
    const centerPoint = new Point(montageArea.left, montageArea.top)

    let newZoom = zoom

    if (zoom > maxZoom) newZoom = maxZoom
    if (zoom < minZoom) newZoom = minZoom

    canvas.zoomToPoint(centerPoint, newZoom)
    canvasManager.centerViewportToMontageArea()

    canvas.fire('editor:zoom-changed', {
      currentZoom: canvas.getZoom(),
      zoom: newZoom,
      point: centerPoint
    })

    this.editor.panConstraintManager.updateBounds()
  }

  /**
   * Сброс зума
   * Сбрасывает зум и возвращает viewport к центру монтажной области.
   * @fires editor:zoom-changed
   */
  public resetZoom(): void {
    const {
      canvas,
      canvasManager,
      montageArea
    } = this.editor
    const centerPoint = new Point(montageArea.left, montageArea.top)

    canvas.zoomToPoint(centerPoint, this.defaultZoom)
    canvasManager.centerViewportToMontageArea()

    this.editor.canvas.fire('editor:zoom-changed', {
      currentZoom: canvas.getZoom(),
      point: centerPoint
    })

    this.editor.panConstraintManager.updateBounds()
  }
}
