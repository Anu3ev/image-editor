import { ImageEditor } from '../index'

export interface PanBounds {
  minX: number
  maxX: number
  minY: number
  maxY: number
  canPanX: boolean
  canPanY: boolean
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
 * Позиция viewportTransform как scroll-ratio в диапазоне 0..1.
 */
export interface PanRatio {
  horizontalRatio?: number
  verticalRatio?: number
}

/**
 * Scroll-состояние одной оси viewport относительно монтажной области.
 */
export interface PanAxisState {
  canPan: boolean
  contentSize: number
  current: number
  max: number
  min: number
  ratio: number
  scrollDistance: number
  viewportSize: number
}

/**
 * Полное scroll-состояние viewport по горизонтальной и вертикальной осям.
 */
export interface PanViewportState {
  canPan: boolean
  horizontal: PanAxisState
  vertical: PanAxisState
}

type PanAxis = 'x' | 'y'

/**
 * Видимый запас за краем монтажной области при pan.
 */
const PAN_OVERSCROLL_MARGIN = 48

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
   * Если currentZoom <= defaultZoom, pan блокируется.
   * Если currentZoom > defaultZoom, pan включается только по осям,
   * где увеличенная монтажная область подошла к краю viewport с учётом видимого запаса.
   * Расчёт опирается на scene coordinates монтажной области и не должен вызывать
   * никаких изменений scene state сам по себе.
   *
   * @returns Объект с границами перетаскивания
   */
  public calculatePanBounds(): PanBounds {
    const state = this.getViewportPanState()

    return {
      minX: state.horizontal.min,
      maxX: state.horizontal.max,
      minY: state.vertical.min,
      maxY: state.vertical.max,
      canPanX: state.horizontal.canPan,
      canPanY: state.vertical.canPan,
      canPan: state.canPan
    }
  }

  /**
   * Проверяет, разрешено ли перетаскивание при текущем зуме.
   * @returns true если можно перетаскивать
   */
  public isPanAllowed(): boolean {
    this.updateBounds()

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
    let bounds = this.currentBounds

    if (!bounds) {
      bounds = this.calculatePanBounds()
      this.currentBounds = bounds
    }

    return {
      x: PanConstraintManager._clamp(vptX, bounds.minX, bounds.maxX),
      y: PanConstraintManager._clamp(vptY, bounds.minY, bounds.maxY)
    }
  }

  /**
   * Возвращает scroll-состояние viewport по осям.
   */
  public getViewportPanState(): PanViewportState {
    const horizontal = this._getPanAxisState({ axis: 'x' })
    const vertical = this._getPanAxisState({ axis: 'y' })

    return {
      horizontal,
      vertical,
      canPan: horizontal.canPan || vertical.canPan
    }
  }

  /**
   * Применяет позицию viewport по scroll-ratio.
   * @param params - Позиция по осям в диапазоне 0..1
   */
  public applyPanRatio({ horizontalRatio, verticalRatio }: PanRatio): boolean {
    const state = this.getViewportPanState()

    if (!state.canPan) return false

    const x = typeof horizontalRatio === 'number'
      ? PanConstraintManager._getAxisPositionByRatio({
        axisState: state.horizontal,
        ratio: horizontalRatio
      })
      : this.editor.canvas.viewportTransform[4]
    const y = typeof verticalRatio === 'number'
      ? PanConstraintManager._getAxisPositionByRatio({
        axisState: state.vertical,
        ratio: verticalRatio
      })
      : this.editor.canvas.viewportTransform[5]

    return this._applyConstrainedViewport({ vptX: x, vptY: y })
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
    if (!this.getViewportPanState().canPan) return false

    const { canvas } = this.editor
    const vpt = canvas.viewportTransform

    return this._applyConstrainedViewport({
      vptX: vpt[4] + deltaX,
      vptY: vpt[5] + deltaY
    })
  }

  /**
   * Применяет уже вычисленные координаты viewportTransform через pan-ограничения.
   */
  private _applyConstrainedViewport({ vptX, vptY }: { vptX: number; vptY: number }): boolean {
    this.updateBounds()

    const { canvas, montageArea } = this.editor
    const vpt = canvas.viewportTransform
    const constrained = this.constrainPan(vptX, vptY)
    const didViewportMove = constrained.x !== vpt[4] || constrained.y !== vpt[5]

    if (!didViewportMove) return true

    const nextViewportTransform = [...vpt] as typeof vpt
    nextViewportTransform[4] = constrained.x
    nextViewportTransform[5] = constrained.y

    canvas.setViewportTransform(nextViewportTransform)
    montageArea.setCoords()
    canvas.fire('editor:pan-changed', {
      panState: this.getViewportPanState(),
      viewportTransform: nextViewportTransform
    })

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
   * Возвращает scroll-состояние одной оси viewport.
   */
  private _getPanAxisState({ axis }: { axis: PanAxis }): PanAxisState {
    const { canvas, montageArea, zoomManager } = this.editor
    const zoom = canvas.getZoom()
    const isHorizontal = axis === 'x'
    const viewportSize = isHorizontal ? canvas.getWidth() : canvas.getHeight()
    const contentSize = (isHorizontal ? montageArea.width : montageArea.height) * zoom
    const center = (isHorizontal ? montageArea.left : montageArea.top) * zoom
    const centered = viewportSize / 2 - center
    const scrollDistance = PanConstraintManager._getScrollDistance({
      contentSize,
      viewportSize
    })
    const canPan = zoom > zoomManager.defaultZoom && scrollDistance > 0

    if (!canPan) {
      return PanConstraintManager._createLockedAxisState({
        contentSize,
        current: centered,
        viewportSize
      })
    }

    const min = PanConstraintManager._normalizeZero(centered - scrollDistance / 2)
    const max = PanConstraintManager._normalizeZero(centered + scrollDistance / 2)
    const current = PanConstraintManager._clamp(
      isHorizontal ? canvas.viewportTransform[4] : canvas.viewportTransform[5],
      min,
      max
    )

    return {
      canPan: true,
      contentSize,
      current,
      max,
      min,
      ratio: PanConstraintManager._getAxisRatio({ current, max, min }),
      scrollDistance,
      viewportSize
    }
  }

  /**
   * Возвращает длину pan-диапазона для одной оси viewport.
   * Диапазон начинает расти до фактического переполнения viewport,
   * чтобы у пользователя был небольшой видимый запас около края монтажной области.
   */
  private static _getScrollDistance({
    contentSize,
    viewportSize
  }: {
    contentSize: number
    viewportSize: number
  }): number {
    const effectiveViewportSize = Math.max(1, viewportSize - PAN_OVERSCROLL_MARGIN * 2)

    return Math.max(0, contentSize - effectiveViewportSize)
  }

  /**
   * Создаёт состояние заблокированной оси, где viewport центрируется относительно монтажной области.
   */
  private static _createLockedAxisState({
    contentSize,
    current,
    viewportSize
  }: {
    contentSize: number
    current: number
    viewportSize: number
  }): PanAxisState {
    return {
      canPan: false,
      contentSize,
      current,
      max: current,
      min: current,
      ratio: 0,
      scrollDistance: 0,
      viewportSize
    }
  }

  /**
   * Возвращает scroll-ratio текущей позиции оси.
   */
  private static _getAxisRatio({ current, max, min }: { current: number; max: number; min: number }): number {
    const scrollDistance = max - min

    if (scrollDistance <= 0) return 0

    return PanConstraintManager._clamp((max - current) / scrollDistance, 0, 1)
  }

  /**
   * Возвращает координату viewportTransform для scroll-ratio.
   */
  private static _getAxisPositionByRatio({
    axisState,
    ratio
  }: {
    axisState: PanAxisState
    ratio: number
  }): number {
    const clampedRatio = PanConstraintManager._clamp(ratio, 0, 1)

    return axisState.max - (axisState.max - axisState.min) * clampedRatio
  }

  /**
   * Ограничивает значение диапазоном.
   */
  private static _clamp(value: number, min: number, max: number): number {
    return PanConstraintManager._normalizeZero(Math.max(min, Math.min(max, value)))
  }

  /**
   * Приводит JavaScript -0 к обычному 0 для стабильного публичного state.
   */
  private static _normalizeZero(value: number): number {
    return Object.is(value, -0) ? 0 : value
  }

  /**
   * Обновить границы перетаскивания.
   * Вызывается при изменении зума или размеров монтажной области.
   */
  public updateBounds(): void {
    this.currentBounds = this.calculatePanBounds()
  }
}
