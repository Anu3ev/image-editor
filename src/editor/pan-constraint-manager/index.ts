import { ImageEditor } from '../index'

export interface PanBounds {
  minX: number
  maxX: number
  minY: number
  maxY: number
  canPan: boolean
}

/**
 * Смещение viewportTransform в canvas coordinates.
 */
export interface PanDelta {
  deltaX: number
  deltaY: number
}

/**
 * Менеджер для управления границами перетаскивания канваса.
 * Ограничивает расстояние, на которое можно переместить канвас при зажатой клавише Space.
 * Pan относится только к camera-state и должен изменять исключительно viewportTransform.
 * MontageArea выступает стабильной сценической опорой, а не движущейся частью resize/pan-логики.
 */
export default class PanConstraintManager {
  /**
   * Инстанс редактора с доступом к canvas
   */
  public editor: ImageEditor

  /**
   * Текущие границы перетаскивания
   */
  private currentBounds: PanBounds | null = null

  constructor({ editor }: { editor: ImageEditor }) {
    this.editor = editor
  }

  /**
   * Рассчитывает границы перетаскивания на основе текущего зума.
   * Границы зависят от соотношения currentZoom к defaultZoom.
   * Если currentZoom <= defaultZoom, перетаскивание блокируется.
   * Если currentZoom > defaultZoom, границы рассчитываются как ~50% размера монтажной области.
   * Расчёт опирается на scene coordinates монтажной области и не должен вызывать
   * никаких изменений scene state сам по себе.
   *
   * @returns Объект с границами перетаскивания
   */
  public calculatePanBounds(): PanBounds {
    const { canvas, montageArea, zoomManager } = this.editor
    const { defaultZoom } = zoomManager

    const currentZoom = canvas.getZoom()

    // Если текущий зум меньше или равен дефолтному - блокируем перетаскивание
    if (currentZoom <= defaultZoom) {
      return {
        minX: 0,
        maxX: 0,
        minY: 0,
        maxY: 0,
        canPan: false
      }
    }

    // Размеры монтажной области с учетом текущего зума
    const scaledMontageWidth = montageArea.width * currentZoom
    const scaledMontageHeight = montageArea.height * currentZoom

    // Максимальное допустимое смещение - половина размера увеличенной монтажной области
    const maxOffsetX = scaledMontageWidth / 2
    const maxOffsetY = scaledMontageHeight / 2

    return {
      minX: -maxOffsetX,
      maxX: maxOffsetX,
      minY: -maxOffsetY,
      maxY: maxOffsetY,
      canPan: true
    }
  }

  /**
   * Проверяет, разрешено ли перетаскивание при текущем зуме.
   * @returns true если можно перетаскивать
   */
  public isPanAllowed(): boolean {
    if (!this.currentBounds) {
      this.updateBounds()
    }
    return this.currentBounds?.canPan ?? false
  }

  /**
   * Ограничивает координаты viewportTransform границами.
   * Координаты vpt[4] и vpt[5] представляют смещение канваса.
   * Метод работает только в плоскости camera-state и не должен компенсировать
   * или маскировать смещения scene state.
   *
   * @param vptX - текущее смещение по X из viewportTransform[4]
   * @param vptY - текущее смещение по Y из viewportTransform[5]
   * @returns Скорректированные координаты смещения
   */
  public constrainPan(vptX: number, vptY: number): { x: number; y: number } {
    if (!this.currentBounds || !this.currentBounds.canPan) {
      return { x: 0, y: 0 }
    }

    const { canvas, montageArea } = this.editor
    const currentZoom = canvas.getZoom()

    // Центр монтажной области в canvas coordinates (origin уже в центре)
    const montageCenterX = montageArea.left
    const montageCenterY = montageArea.top

    // Центр канваса
    const canvasCenterX = canvas.getWidth() / 2
    const canvasCenterY = canvas.getHeight() / 2

    // Текущее смещение монтажной области относительно центра канваса
    const offsetX = (montageCenterX * currentZoom + vptX) - canvasCenterX
    const offsetY = (montageCenterY * currentZoom + vptY) - canvasCenterY

    // Применяем ограничения
    const constrainedOffsetX = Math.max(
      this.currentBounds.minX,
      Math.min(this.currentBounds.maxX, offsetX)
    )
    const constrainedOffsetY = Math.max(
      this.currentBounds.minY,
      Math.min(this.currentBounds.maxY, offsetY)
    )

    // Преобразуем обратно в координаты viewportTransform
    const constrainedVptX = constrainedOffsetX + canvasCenterX - montageCenterX * currentZoom
    const constrainedVptY = constrainedOffsetY + canvasCenterY - montageCenterY * currentZoom

    return {
      x: constrainedVptX,
      y: constrainedVptY
    }
  }

  /**
   * Применяет смещение viewportTransform через общие pan-ограничения.
   * Метод является единым write-path для mouse drag, trackpad wheel-pan и touch-pan.
   * @param params - Параметры смещения viewport
   * @param params.deltaX - Смещение viewportTransform по X
   * @param params.deltaY - Смещение viewportTransform по Y
   * @returns true если pan-событие обработано текущим camera-state
   */
  public applyPanDelta({ deltaX, deltaY }: PanDelta): boolean {
    if (deltaX === 0 && deltaY === 0) return false
    if (!this.isPanAllowed()) return false

    const { canvas, montageArea } = this.editor
    const vpt = canvas.viewportTransform
    const constrained = this.constrainPan(vpt[4] + deltaX, vpt[5] + deltaY)
    const didViewportMove = constrained.x !== vpt[4] || constrained.y !== vpt[5]

    if (didViewportMove) {
      vpt[4] = constrained.x
      vpt[5] = constrained.y

      montageArea.setCoords()
      canvas.requestRenderAll()
    }

    return true
  }

  /**
   * Получить текущие границы перетаскивания (геттер для внешнего использования).
   * @returns Текущие границы или null если они ещё не рассчитаны
   */
  public getPanBounds(): PanBounds | null {
    return this.currentBounds
  }

  /**
   * Получить текущее смещение монтажной области относительно центра канваса.
   * @returns Объект с координатами смещения
   */
  public getCurrentOffset(): { x: number; y: number } {
    const { canvas, montageArea } = this.editor
    const currentZoom = canvas.getZoom()
    const vpt = canvas.viewportTransform

    // Центр монтажной области в canvas coordinates (origin уже в центре)
    const montageCenterX = montageArea.left
    const montageCenterY = montageArea.top

    // Центр канваса
    const canvasCenterX = canvas.getWidth() / 2
    const canvasCenterY = canvas.getHeight() / 2

    // Текущее смещение монтажной области относительно центра канваса
    const offsetX = (montageCenterX * currentZoom + vpt[4]) - canvasCenterX
    const offsetY = (montageCenterY * currentZoom + vpt[5]) - canvasCenterY

    return { x: offsetX, y: offsetY }
  }

  /**
   * Обновить границы перетаскивания.
   * Вызывается при изменении зума или размеров монтажной области.
   */
  public updateBounds(): void {
    this.currentBounds = this.calculatePanBounds()
  }
}
