import type { Canvas } from 'fabric'
import type { ImageEditor } from '../..'

/**
 * Ось viewport-скроллбара.
 */
type ViewportScrollbarAxis = 'horizontal' | 'vertical'

/**
 * Состояние одного DOM-скроллбара.
 */
export interface ViewportScrollbarAxisState {
  ratio: number
  thumbOffset: number
  thumbSize: number
  trackSize: number
  visible: boolean
}

/**
 * Полное состояние DOM-скроллбаров viewport.
 */
export interface ViewportScrollbarState {
  horizontal: ViewportScrollbarAxisState
  vertical: ViewportScrollbarAxisState
}

/**
 * Активный drag thumb-элемента.
 */
type ViewportScrollbarDragState = {
  axis: ViewportScrollbarAxis
  pointerStart: number
  ratioStart: number
}

const VIEWPORT_SCROLLBAR_MIN_THUMB_SIZE = 36
const VIEWPORT_SCROLLBAR_EDGE_INSET = 14
const VIEWPORT_SCROLLBAR_CROSS_AXIS_INSET = 12
const VIEWPORT_SCROLLBAR_THUMB_THICKNESS = 5
const VIEWPORT_SCROLLBAR_Z_INDEX = 40

/**
 * Менеджер DOM-скроллбаров viewport.
 * Сами скроллбары являются transient UI-state и пишут camera-state только через PanConstraintManager.
 */
export default class ViewportScrollbarManager {
  /**
   * Ссылка на редактор.
   */
  public editor: ImageEditor

  /**
   * Canvas редактора.
   */
  public canvas: Canvas

  /**
   * Корневой DOM-элемент скроллбаров.
   */
  public readonly el: HTMLDivElement

  /**
   * DOM-элемент горизонтального track.
   */
  private readonly horizontalTrack: HTMLDivElement

  /**
   * DOM-элемент вертикального track.
   */
  private readonly verticalTrack: HTMLDivElement

  /**
   * DOM-элемент горизонтального thumb.
   */
  private readonly horizontalThumb: HTMLDivElement

  /**
   * DOM-элемент вертикального thumb.
   */
  private readonly verticalThumb: HTMLDivElement

  /**
   * Текущее рассчитанное состояние скроллбаров.
   */
  private state: ViewportScrollbarState = ViewportScrollbarManager._createEmptyState()

  /**
   * Текущий drag thumb-элемента.
   */
  private dragState: ViewportScrollbarDragState | null = null

  /**
   * Создаёт DOM-скроллбары и подписывает их на camera-state события.
   */
  constructor({ editor }: { editor: ImageEditor }) {
    this.editor = editor
    this.canvas = editor.canvas
    this.el = this._createRootElement()
    this.horizontalTrack = this._createTrack({ axis: 'horizontal' })
    this.verticalTrack = this._createTrack({ axis: 'vertical' })
    this.horizontalThumb = this._createThumb({ axis: 'horizontal' })
    this.verticalThumb = this._createThumb({ axis: 'vertical' })

    this.horizontalTrack.appendChild(this.horizontalThumb)
    this.verticalTrack.appendChild(this.verticalThumb)
    this.el.appendChild(this.horizontalTrack)
    this.el.appendChild(this.verticalTrack)
    this._ensureWrapperPosition()
    this.canvas.wrapperEl.appendChild(this.el)
    this._bindEvents()
    this.update()
  }

  /**
   * Возвращает текущее рассчитанное состояние скроллбаров.
   */
  public getState(): ViewportScrollbarState {
    return this.state
  }

  /**
   * Пересчитывает размеры, видимость и позицию thumb-элементов.
   */
  public update(): void {
    this.editor.panConstraintManager.updateBounds()
    this.state = this._calculateState()
    this._applyAxisState({ axis: 'horizontal' })
    this._applyAxisState({ axis: 'vertical' })
  }

  /**
   * Удаляет DOM и все подписки.
   */
  public destroy(): void {
    this._unbindEvents()

    if (this.el.parentNode) {
      this.el.parentNode.removeChild(this.el)
    }
  }

  /**
   * Создаёт корневой DOM-элемент.
   */
  private _createRootElement(): HTMLDivElement {
    const element = document.createElement('div')

    element.className = 'image-editor-viewport-scrollbars'
    element.dataset.editorViewportScrollbars = 'true'
    ViewportScrollbarManager._applyStyles({
      element,
      styles: {
        inset: '0',
        pointerEvents: 'none',
        position: 'absolute',
        zIndex: String(VIEWPORT_SCROLLBAR_Z_INDEX)
      }
    })

    return element
  }

  /**
   * Создаёт track для одной оси.
   */
  private _createTrack({ axis }: { axis: ViewportScrollbarAxis }): HTMLDivElement {
    const element = document.createElement('div')

    element.className = `image-editor-viewport-scrollbar image-editor-viewport-scrollbar--${axis}`
    element.dataset.editorScrollbar = axis
    ViewportScrollbarManager._applyStyles({
      element,
      styles: this._getTrackStyles({ axis })
    })

    return element
  }

  /**
   * Создаёт thumb для одной оси.
   */
  private _createThumb({ axis }: { axis: ViewportScrollbarAxis }): HTMLDivElement {
    const element = document.createElement('div')

    element.className = `image-editor-viewport-scrollbar__thumb image-editor-viewport-scrollbar__thumb--${axis}`
    element.dataset.editorScrollbarThumb = axis
    ViewportScrollbarManager._applyStyles({
      element,
      styles: this._getThumbStyles({ axis })
    })

    return element
  }

  /**
   * Возвращает базовые стили track.
   */
  private _getTrackStyles({ axis }: { axis: ViewportScrollbarAxis }): Record<string, string> {
    const baseStyles = {
      borderRadius: '999px',
      display: 'none',
      pointerEvents: 'auto',
      position: 'absolute'
    }

    if (axis === 'horizontal') {
      return {
        ...baseStyles,
        bottom: `${VIEWPORT_SCROLLBAR_CROSS_AXIS_INSET}px`,
        height: `${VIEWPORT_SCROLLBAR_THUMB_THICKNESS}px`,
        left: `${VIEWPORT_SCROLLBAR_EDGE_INSET}px`
      }
    }

    return {
      ...baseStyles,
      right: `${VIEWPORT_SCROLLBAR_CROSS_AXIS_INSET}px`,
      top: `${VIEWPORT_SCROLLBAR_EDGE_INSET}px`,
      width: `${VIEWPORT_SCROLLBAR_THUMB_THICKNESS}px`
    }
  }

  /**
   * Возвращает базовые стили thumb.
   */
  private _getThumbStyles({ axis }: { axis: ViewportScrollbarAxis }): Record<string, string> {
    const baseStyles = {
      background: '#89909a',
      borderRadius: '999px',
      cursor: axis === 'horizontal' ? 'ew-resize' : 'ns-resize',
      pointerEvents: 'auto',
      position: 'absolute'
    }

    if (axis === 'horizontal') {
      return {
        ...baseStyles,
        height: `${VIEWPORT_SCROLLBAR_THUMB_THICKNESS}px`,
        left: '0',
        top: '0'
      }
    }

    return {
      ...baseStyles,
      left: '0',
      top: '0',
      width: `${VIEWPORT_SCROLLBAR_THUMB_THICKNESS}px`
    }
  }

  /**
   * Привязывает DOM и canvas события.
   */
  private _bindEvents(): void {
    this.canvas.on('editor:zoom-changed', this._handleCameraStateChanged)
    this.canvas.on('editor:pan-changed', this._handleCameraStateChanged)
    this.canvas.on('editor:canvas-updated', this._handleCameraStateChanged)
    this.horizontalThumb.addEventListener('pointerdown', this._handleHorizontalPointerDown)
    this.verticalThumb.addEventListener('pointerdown', this._handleVerticalPointerDown)
  }

  /**
   * Снимает DOM и canvas события.
   */
  private _unbindEvents(): void {
    this.canvas.off('editor:zoom-changed', this._handleCameraStateChanged)
    this.canvas.off('editor:pan-changed', this._handleCameraStateChanged)
    this.canvas.off('editor:canvas-updated', this._handleCameraStateChanged)
    this.horizontalThumb.removeEventListener('pointerdown', this._handleHorizontalPointerDown)
    this.verticalThumb.removeEventListener('pointerdown', this._handleVerticalPointerDown)
    this._unbindDocumentDragEvents()
  }

  /**
   * Обновляет UI после изменения camera-state.
   */
  private _handleCameraStateChanged = (): void => {
    this.update()
  }

  /**
   * Начинает drag горизонтального thumb.
   */
  private _handleHorizontalPointerDown = (event: PointerEvent): void => {
    this._startDrag({ axis: 'horizontal', event })
  }

  /**
   * Начинает drag вертикального thumb.
   */
  private _handleVerticalPointerDown = (event: PointerEvent): void => {
    this._startDrag({ axis: 'vertical', event })
  }

  /**
   * Начинает drag thumb-элемента.
   */
  private _startDrag({ axis, event }: { axis: ViewportScrollbarAxis; event: PointerEvent }): void {
    const axisState = this.state[axis]

    if (!axisState.visible) return

    event.preventDefault()
    this.dragState = {
      axis,
      pointerStart: ViewportScrollbarManager._getPointerPosition({ axis, event }),
      ratioStart: axisState.ratio
    }
    this._bindDocumentDragEvents()
  }

  /**
   * Привязывает document-события активного drag.
   */
  private _bindDocumentDragEvents(): void {
    document.addEventListener('pointermove', this._handleDocumentPointerMove)
    document.addEventListener('pointerup', this._handleDocumentPointerUp)
  }

  /**
   * Снимает document-события активного drag.
   */
  private _unbindDocumentDragEvents(): void {
    document.removeEventListener('pointermove', this._handleDocumentPointerMove)
    document.removeEventListener('pointerup', this._handleDocumentPointerUp)
  }

  /**
   * Обрабатывает live-drag thumb-элемента.
   */
  private _handleDocumentPointerMove = (event: PointerEvent): void => {
    const { dragState } = this

    if (!dragState) return

    event.preventDefault()
    const ratio = this._resolveDragRatio({ event, dragState })

    if (dragState.axis === 'horizontal') {
      this.editor.panConstraintManager.applyPanRatio({ horizontalRatio: ratio })
    } else {
      this.editor.panConstraintManager.applyPanRatio({ verticalRatio: ratio })
    }

    this.update()
  }

  /**
   * Завершает drag thumb-элемента.
   */
  private _handleDocumentPointerUp = (): void => {
    this.dragState = null
    this._unbindDocumentDragEvents()
  }

  /**
   * Рассчитывает scroll-ratio из текущей позиции указателя.
   */
  private _resolveDragRatio({
    event,
    dragState
  }: {
    event: PointerEvent
    dragState: ViewportScrollbarDragState
  }): number {
    const axisState = this.state[dragState.axis]
    const pointer = ViewportScrollbarManager._getPointerPosition({
      axis: dragState.axis,
      event
    })
    const draggableSize = Math.max(1, axisState.trackSize - axisState.thumbSize)
    const deltaRatio = (pointer - dragState.pointerStart) / draggableSize

    return ViewportScrollbarManager._clamp(dragState.ratioStart + deltaRatio, 0, 1)
  }

  /**
   * Рассчитывает состояние обеих осей.
   */
  private _calculateState(): ViewportScrollbarState {
    return {
      horizontal: this._calculateAxisState({ axis: 'horizontal' }),
      vertical: this._calculateAxisState({ axis: 'vertical' })
    }
  }

  /**
   * Рассчитывает состояние одной оси.
   */
  private _calculateAxisState({ axis }: { axis: ViewportScrollbarAxis }): ViewportScrollbarAxisState {
    const panState = this.editor.panConstraintManager.getViewportPanState()
    const axisPanState = axis === 'horizontal' ? panState.horizontal : panState.vertical
    const trackSize = this._getTrackSize({ axis })
    const visible = axisPanState.canPan && trackSize > 0

    if (!visible) {
      return ViewportScrollbarManager._createHiddenAxisState({ trackSize })
    }

    const thumbSize = this._calculateThumbSize({
      scrollDistance: axisPanState.scrollDistance,
      trackSize,
      viewportSize: axisPanState.viewportSize
    })

    return {
      ratio: axisPanState.ratio,
      thumbOffset: (trackSize - thumbSize) * axisPanState.ratio,
      thumbSize,
      trackSize,
      visible: true
    }
  }

  /**
   * Рассчитывает длину track по текущим размерам canvas.
   */
  private _getTrackSize({ axis }: { axis: ViewportScrollbarAxis }): number {
    const canvasSize = axis === 'horizontal'
      ? this.canvas.getWidth()
      : this.canvas.getHeight()

    return Math.max(0, canvasSize - VIEWPORT_SCROLLBAR_EDGE_INSET * 2)
  }

  /**
   * Рассчитывает длину thumb по доле viewport внутри полного pan-диапазона.
   */
  private _calculateThumbSize({
    scrollDistance,
    trackSize,
    viewportSize
  }: {
    scrollDistance: number
    trackSize: number
    viewportSize: number
  }): number {
    const rawSize = trackSize * (viewportSize / (viewportSize + scrollDistance))

    return ViewportScrollbarManager._clamp(rawSize, VIEWPORT_SCROLLBAR_MIN_THUMB_SIZE, trackSize)
  }

  /**
   * Применяет рассчитанное состояние к DOM-элементам одной оси.
   */
  private _applyAxisState({ axis }: { axis: ViewportScrollbarAxis }): void {
    const track = this._getTrackElement({ axis })
    const thumb = this._getThumbElement({ axis })
    const axisState = this.state[axis]

    track.style.display = axisState.visible ? 'block' : 'none'

    if (!axisState.visible) return

    if (axis === 'horizontal') {
      track.style.width = `${axisState.trackSize}px`
      thumb.style.width = `${axisState.thumbSize}px`
      thumb.style.transform = `translateX(${axisState.thumbOffset}px)`
      return
    }

    track.style.height = `${axisState.trackSize}px`
    thumb.style.height = `${axisState.thumbSize}px`
    thumb.style.transform = `translateY(${axisState.thumbOffset}px)`
  }

  /**
   * Возвращает track-элемент выбранной оси.
   */
  private _getTrackElement({ axis }: { axis: ViewportScrollbarAxis }): HTMLDivElement {
    return axis === 'horizontal' ? this.horizontalTrack : this.verticalTrack
  }

  /**
   * Возвращает thumb-элемент выбранной оси.
   */
  private _getThumbElement({ axis }: { axis: ViewportScrollbarAxis }): HTMLDivElement {
    return axis === 'horizontal' ? this.horizontalThumb : this.verticalThumb
  }

  /**
   * Делает canvas wrapper positioning context для absolute scrollbars.
   */
  private _ensureWrapperPosition(): void {
    const wrapper = this.canvas.wrapperEl
    const { position } = window.getComputedStyle(wrapper)

    if (position === 'static' || !position) {
      wrapper.style.position = 'relative'
    }
  }

  /**
   * Возвращает координату указателя для выбранной оси.
   */
  private static _getPointerPosition({
    axis,
    event
  }: {
    axis: ViewportScrollbarAxis
    event: PointerEvent
  }): number {
    return axis === 'horizontal' ? event.clientX : event.clientY
  }

  /**
   * Создаёт пустое состояние скроллбаров.
   */
  private static _createEmptyState(): ViewportScrollbarState {
    return {
      horizontal: ViewportScrollbarManager._createHiddenAxisState({ trackSize: 0 }),
      vertical: ViewportScrollbarManager._createHiddenAxisState({ trackSize: 0 })
    }
  }

  /**
   * Создаёт скрытое состояние одной оси.
   */
  private static _createHiddenAxisState({ trackSize }: { trackSize: number }): ViewportScrollbarAxisState {
    return {
      ratio: 0,
      thumbOffset: 0,
      thumbSize: 0,
      trackSize,
      visible: false
    }
  }

  /**
   * Применяет набор CSS-свойств к DOM-элементу.
   */
  private static _applyStyles({
    element,
    styles
  }: {
    element: HTMLElement
    styles: Record<string, string>
  }): void {
    Object.assign(element.style, styles)
  }

  /**
   * Ограничивает значение диапазоном.
   */
  private static _clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value))
  }
}
