import type { Canvas } from 'fabric'
import type { ImageEditor } from '../..'

/**
 * Viewport scrollbar axis.
 */
type ViewportScrollbarAxis = 'horizontal' | 'vertical'

/**
 * State of a single DOM scrollbar.
 */
export interface ViewportScrollbarAxisState {
  ratio: number
  thumbOffset: number
  thumbSize: number
  trackSize: number
  visible: boolean
}

/**
 * Complete state of the viewport DOM scrollbars.
 */
export interface ViewportScrollbarState {
  horizontal: ViewportScrollbarAxisState
  vertical: ViewportScrollbarAxisState
}

/**
 * State of an active scrollbar-thumb drag.
 */
type ViewportScrollbarDragState = {
  axis: ViewportScrollbarAxis
  pointerStart: number
  ratioStart: number
}

const VIEWPORT_SCROLLBAR_MIN_THUMB_SIZE = 36
const VIEWPORT_SCROLLBAR_EDGE_INSET = 14
const VIEWPORT_SCROLLBAR_CROSS_AXIS_INSET = 4
const VIEWPORT_SCROLLBAR_THUMB_THICKNESS = 5
const VIEWPORT_SCROLLBAR_Z_INDEX = 40

/**
 * Viewport DOM scrollbar manager.
 * The scrollbars themselves are transient UI state and write camera state only through PanConstraintManager.
 */
export default class ViewportScrollbarManager {
  /**
   * Reference to the editor.
   */
  public editor: ImageEditor

  /**
   * Editor canvas.
   */
  public canvas: Canvas

  /**
   * Root DOM element for the scrollbars.
   */
  public readonly el: HTMLDivElement

  /**
   * Horizontal track DOM element.
   */
  private readonly horizontalTrack: HTMLDivElement

  /**
   * Vertical track DOM element.
   */
  private readonly verticalTrack: HTMLDivElement

  /**
   * Horizontal thumb DOM element.
   */
  private readonly horizontalThumb: HTMLDivElement

  /**
   * Vertical thumb DOM element.
   */
  private readonly verticalThumb: HTMLDivElement

  /**
   * Current calculated scrollbar state.
   */
  private state: ViewportScrollbarState = ViewportScrollbarManager._createEmptyState()

  /**
   * Current scrollbar-thumb drag state.
   */
  private dragState: ViewportScrollbarDragState | null = null

  /**
   * Creates DOM scrollbars and subscribes them to camera-state events.
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
   * Returns the current calculated scrollbar state.
   */
  public getState(): ViewportScrollbarState {
    return this.state
  }

  /**
   * Recalculates the dimensions, visibility, and position of the thumb elements.
   */
  public update(): void {
    this.editor.panConstraintManager.updateBounds()
    this.state = this._calculateState()
    this._applyAxisState({ axis: 'horizontal' })
    this._applyAxisState({ axis: 'vertical' })
  }

  /**
   * Removes the DOM elements and all subscriptions.
   */
  public destroy(): void {
    this._unbindEvents()

    if (this.el.parentNode) {
      this.el.parentNode.removeChild(this.el)
    }
  }

  /**
   * Creates the root DOM element.
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
   * Creates a track for one axis.
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
   * Creates a thumb for one axis.
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
   * Returns the base track styles.
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
   * Returns the base thumb styles.
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
   * Binds DOM and canvas events.
   */
  private _bindEvents(): void {
    this.canvas.on('editor:zoom-changed', this._handleCameraStateChanged)
    this.canvas.on('editor:pan-changed', this._handleCameraStateChanged)
    this.canvas.on('editor:canvas-updated', this._handleCameraStateChanged)
    this.horizontalThumb.addEventListener('pointerdown', this._handleHorizontalPointerDown)
    this.verticalThumb.addEventListener('pointerdown', this._handleVerticalPointerDown)
  }

  /**
   * Unbinds DOM and canvas events.
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
   * Updates the UI after a camera-state change.
   */
  private _handleCameraStateChanged = (): void => {
    this.update()
  }

  /**
   * Starts dragging the horizontal thumb.
   */
  private _handleHorizontalPointerDown = (event: PointerEvent): void => {
    this._startDrag({ axis: 'horizontal', event })
  }

  /**
   * Starts dragging the vertical thumb.
   */
  private _handleVerticalPointerDown = (event: PointerEvent): void => {
    this._startDrag({ axis: 'vertical', event })
  }

  /**
   * Starts dragging a thumb element.
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
   * Binds document events for the active drag.
   */
  private _bindDocumentDragEvents(): void {
    document.addEventListener('pointermove', this._handleDocumentPointerMove)
    document.addEventListener('pointerup', this._handleDocumentPointerUp)
  }

  /**
   * Unbinds document events for the active drag.
   */
  private _unbindDocumentDragEvents(): void {
    document.removeEventListener('pointermove', this._handleDocumentPointerMove)
    document.removeEventListener('pointerup', this._handleDocumentPointerUp)
  }

  /**
   * Handles live dragging of the thumb element.
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
   * Ends dragging of the thumb element.
   */
  private _handleDocumentPointerUp = (): void => {
    this.dragState = null
    this._unbindDocumentDragEvents()
  }

  /**
   * Calculates the scroll ratio from the current pointer position.
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
   * Calculates the state of both axes.
   */
  private _calculateState(): ViewportScrollbarState {
    return {
      horizontal: this._calculateAxisState({ axis: 'horizontal' }),
      vertical: this._calculateAxisState({ axis: 'vertical' })
    }
  }

  /**
   * Calculates the state of one axis.
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
   * Calculates the track length from the current canvas dimensions.
   */
  private _getTrackSize({ axis }: { axis: ViewportScrollbarAxis }): number {
    const canvasSize = axis === 'horizontal'
      ? this.canvas.getWidth()
      : this.canvas.getHeight()

    return Math.max(0, canvasSize - VIEWPORT_SCROLLBAR_EDGE_INSET * 2)
  }

  /**
   * Calculates the thumb length from the viewport's share of the full pan range.
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
   * Applies the calculated state to the DOM elements for one axis.
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
   * Returns the track element for the selected axis.
   */
  private _getTrackElement({ axis }: { axis: ViewportScrollbarAxis }): HTMLDivElement {
    return axis === 'horizontal' ? this.horizontalTrack : this.verticalTrack
  }

  /**
   * Returns the thumb element for the selected axis.
   */
  private _getThumbElement({ axis }: { axis: ViewportScrollbarAxis }): HTMLDivElement {
    return axis === 'horizontal' ? this.horizontalThumb : this.verticalThumb
  }

  /**
   * Makes the canvas wrapper the positioning context for absolutely positioned scrollbars.
   */
  private _ensureWrapperPosition(): void {
    const wrapper = this.canvas.wrapperEl
    const { position } = window.getComputedStyle(wrapper)

    if (position === 'static' || !position) {
      wrapper.style.position = 'relative'
    }
  }

  /**
   * Returns the pointer coordinate for the selected axis.
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
   * Creates an empty scrollbar state.
   */
  private static _createEmptyState(): ViewportScrollbarState {
    return {
      horizontal: ViewportScrollbarManager._createHiddenAxisState({ trackSize: 0 }),
      vertical: ViewportScrollbarManager._createHiddenAxisState({ trackSize: 0 })
    }
  }

  /**
   * Creates a hidden state for one axis.
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
   * Applies a set of CSS properties to a DOM element.
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
   * Clamps a value to a range.
   */
  private static _clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value))
  }
}
