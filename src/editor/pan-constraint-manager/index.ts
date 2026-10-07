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
 * viewportTransform offset in canvas coordinates.
 */
export interface PanDelta {
  deltaX: number
  deltaY: number
}

/**
 * viewportTransform position as a scroll ratio in the range 0..1.
 */
export interface PanRatio {
  horizontalRatio?: number
  verticalRatio?: number
}

/**
 * Scroll state of one viewport axis relative to the artboard.
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
 * Full viewport scroll state along the horizontal and vertical axes.
 */
export interface PanViewportState {
  canPan: boolean
  horizontal: PanAxisState
  vertical: PanAxisState
}

type PanAxis = 'x' | 'y'

/**
 * Visible margin beyond the artboard edge when panning.
 */
const PAN_OVERSCROLL_MARGIN = 48

/**
 * Manager for controlling canvas drag bounds.
 * Limits how far the canvas can move while the Space key is held down.
 * Panning affects only camera state and must change viewportTransform exclusively.
 * MontageArea is a stable scene reference, not a moving part of the resize/pan logic.
 */
export default class PanConstraintManager {
  /**
   * Editor instance with access to the canvas
   */
  public editor: ImageEditor

  /**
   * Current drag bounds
   */
  private currentBounds: PanBounds | null = null

  constructor({ editor }: { editor: ImageEditor }) {
    this.editor = editor
  }

  /**
   * Calculates drag bounds based on the current zoom.
   * If currentZoom <= defaultZoom, panning is blocked.
   * If currentZoom > defaultZoom, panning is enabled only on axes
   * where the enlarged artboard reaches the viewport edge, accounting for the visible margin.
   * The calculation is based on the artboard's scene coordinates and must not
   * change scene state on its own.
   *
   * @returns Object containing drag bounds
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
   * Checks whether dragging is allowed at the current zoom.
   * @returns true if dragging is allowed
   */
  public isPanAllowed(): boolean {
    this.updateBounds()

    return this.currentBounds?.canPan ?? false
  }

  /**
   * Clamps viewportTransform coordinates to the bounds.
   * The vpt[4] and vpt[5] coordinates represent the canvas offset.
   * The method operates only on camera state and must not compensate for
   * or hide scene state offsets.
   *
   * @param vptX - Current X offset from viewportTransform[4]
   * @param vptY - Current Y offset from viewportTransform[5]
   * @returns Adjusted offset coordinates
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
   * Returns the viewport scroll state for each axis.
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
   * Applies the viewport position by scroll ratio.
   * @param params - Axis positions in the range 0..1
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
   * Applies a viewportTransform offset through the shared pan constraints.
   * This method is the single write path for mouse dragging, trackpad wheel panning, and touch panning.
   * @param params - Viewport offset parameters
   * @param params.deltaX - viewportTransform X offset
   * @param params.deltaY - viewportTransform Y offset
   * @returns true if the pan event was handled by the current camera state
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
   * Applies already calculated viewportTransform coordinates through the pan constraints.
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
   * Get the current drag bounds (getter for external use).
   * @returns Current bounds, or null if they have not yet been calculated
   */
  public getPanBounds(): PanBounds | null {
    return this.currentBounds
  }

  /**
   * Get the current artboard offset relative to the canvas center.
   * @returns Object containing offset coordinates
   */
  public getCurrentOffset(): { x: number; y: number } {
    const { canvas, montageArea } = this.editor
    const currentZoom = canvas.getZoom()
    const vpt = canvas.viewportTransform

    // Artboard center in canvas coordinates (origin is already centered)
    const montageCenterX = montageArea.left
    const montageCenterY = montageArea.top

    // Canvas center
    const canvasCenterX = canvas.getWidth() / 2
    const canvasCenterY = canvas.getHeight() / 2

    // Current artboard offset relative to the canvas center
    const offsetX = (montageCenterX * currentZoom + vpt[4]) - canvasCenterX
    const offsetY = (montageCenterY * currentZoom + vpt[5]) - canvasCenterY

    return { x: offsetX, y: offsetY }
  }

  /**
   * Returns the scroll state of one viewport axis.
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
   * Returns the length of the pan range for one viewport axis.
   * The range starts growing before the viewport actually overflows,
   * giving the user a small visible margin around the artboard edge.
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
   * Creates a locked axis state with the viewport centered on the artboard.
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
   * Returns the scroll ratio of the current axis position.
   */
  private static _getAxisRatio({ current, max, min }: { current: number; max: number; min: number }): number {
    const scrollDistance = max - min

    if (scrollDistance <= 0) return 0

    return PanConstraintManager._clamp((max - current) / scrollDistance, 0, 1)
  }

  /**
   * Returns the viewportTransform coordinate for a scroll ratio.
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
   * Clamps a value to a range.
   */
  private static _clamp(value: number, min: number, max: number): number {
    return PanConstraintManager._normalizeZero(Math.max(min, Math.min(max, value)))
  }

  /**
   * Converts JavaScript -0 to regular 0 for stable public state.
   */
  private static _normalizeZero(value: number): number {
    return Object.is(value, -0) ? 0 : value
  }

  /**
   * Update drag bounds.
   * Called when the zoom or artboard dimensions change.
   */
  public updateBounds(): void {
    this.currentBounds = this.calculatePanBounds()
  }
}
