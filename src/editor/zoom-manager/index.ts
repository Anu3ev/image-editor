import { Point } from 'fabric'
import type { EditorOptions } from '../types/options'

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
   * Editor instance with access to the canvas
   */
  public editor: ImageEditor

  /**
   * Parameters (options) for listeners.
   */
  public options: EditorOptions

  /**
   * Minimum zoom
   */
  public minZoom: number

  /**
   * Maximum zoom
   */
  public maxZoom: number

  /**
   * Default zoom to apply when initializing the editor.
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
   * Converts defaultZoom to a number with two decimal places and respects the minimum and maximum values.
   * @param zoom - Zoom value to normalize
   * @returns Normalized zoom value
   * @private
   */
  private _normalizeDefaultZoom(zoom: number): number {
    return Math.min(this.maxZoom, Math.max(this.minZoom, Number(zoom.toFixed(2))))
  }

  /**
   * Calculates defaultZoom for the current container and artboard dimensions.
   * defaultZoom is derived camera state and must be recalculated whenever
   * the container viewport or the montageArea dimensions change.
   * @param scale - Desired scale relative to the editor container dimensions.
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
   * Helper method for calculating the scaled artboard dimensions
   * @param zoom - Zoom to use in the calculation
   * @returns Scaled artboard dimensions
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
   * Clamps the pointer coordinates to the visible artboard bounds
   * in viewport coordinates, because zoomToPoint operates in this coordinate system.
   * @param pointer - DOM pointer coordinates
   * @returns Clamped viewport coordinates within the visible artboard
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
   * Converts DOM client coordinates to canvas viewport coordinates.
   * @param pointer - DOM pointer coordinates
   * @returns Pointer coordinates within the canvas viewport
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
   * Calculates the zoom at which the artboard fits exactly within the viewport
   * @returns Minimum zoom for fitting the entire artboard
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
   * Calculates the target viewport position for centering the artboard
   * @param zoom - Current zoom
   * @returns Target viewport transform coordinates
   *
   * Camera state must reside only in viewportTransform. MontageArea serves here as
   * a stable scene reference, rather than an object that needs to be physically moved within the scene
   * when the container is resized or the zoom is reset.
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
   * Checks for empty space around the artboard
   * @param zoom - Current zoom
   * @returns Maximum ratio of empty space to viewport size
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
   * Calculates a smooth, accelerating step toward the viewport center
   * @param targetVpt - Target viewport position
   * @param zoom - Current zoom
   * @param fitZoom - Zoom at which the artboard fits within the viewport
   * @param zoomStep - Zoom increment
   * @param maxEmptyRatio - Maximum fraction of empty space
   * @returns Calculated viewport movement step
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
   * Applies smooth viewport centering as zoom approaches defaultZoom.
   * At zoom <= defaultZoom, the artboard is fully centered.
   * At zoom > defaultZoom, smooth interpolation is applied within the transition range.
   * @param zoom - Current zoom
   * @param isZoomingOut - Flag indicating that zooming out is in progress
   * @param zoomStep - Zoom increment (calculated adaptively)
   * @returns true if centering was applied
   * @private
   */
  private _applyViewportCentering(
    zoom: number,
    isZoomingOut: boolean = false,
    zoomStep: number = DEFAULT_ZOOM_RATIO
  ): boolean {
    const { canvas } = this.editor

    // Check whether the artboard extends beyond the viewport
    const scaledDimensions = this._getScaledMontageDimensions(zoom)
    const viewportWidth = canvas.getWidth()
    const viewportHeight = canvas.getHeight()
    const montageExceedsViewport = scaledDimensions.width > viewportWidth || scaledDimensions.height > viewportHeight

    const fitZoom = this._calculateFitZoom()
    const distanceFromFit = zoom - fitZoom
    const isInCenteringRange = !montageExceedsViewport || distanceFromFit

    // Check whether centering should be applied
    if (!isInCenteringRange && !isZoomingOut) {
      return false
    }

    const vpt = canvas.viewportTransform
    const targetVpt = this._calculateTargetViewportPosition(zoom)

    // If the artboard fits within the viewport, center it immediately
    if (!montageExceedsViewport) {
      vpt[4] = targetVpt.x
      vpt[5] = targetVpt.y
      canvas.setViewportTransform(vpt)
      return true
    }

    // When zooming out, check for empty space and apply smooth centering
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
   * Normalizes the current viewportTransform to the pan bounds after a zoom operation.
   * Zooming can move camera state beyond the allowed pan range before
   * the next scroll or Space-drag has a chance to pass through PanConstraintManager.
   * In this case, the bounds must be applied immediately within the same zoom write path,
   * to avoid leaving an invalid viewport until the first pan event.
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
   * Recalculates defaultZoom for the current container and artboard dimensions.
   * This method updates only derived camera state and does not change the current viewport.
   * @param scale - Desired scale relative to the editor container dimensions.
   * @returns New defaultZoom value
   */
  public updateDefaultZoom(scale: number = this.options.defaultScale): number {
    this.defaultZoom = this._calculateDefaultZoom(scale)

    return this.defaultZoom
  }

  /**
   * Recalculates and immediately applies defaultZoom for the current artboard.
   * Used when the montageArea dimensions change and the current camera state needs
   * to be normalized to the new fit state.
   * @param scale - Desired scale relative to the editor container dimensions.
   */
  public calculateAndApplyDefaultZoom(scale: number = this.options.defaultScale): void {
    this.updateDefaultZoom(scale)

    // apply the default zoom
    this.setZoom()
  }

  /**
   * Handles zoom from a DOM event with pointer coordinates.
   * Zoom point selection logic:
   * - While the artboard fits entirely within the viewport, zoom around its reference point.
   * - Once the artboard is larger than the viewport, zoom in and out around the pointer position.
   *
   * Important contract: pointer zoom works exclusively through viewportTransform.
   * The scene state of the artboard and objects remains stable.
   * @param scale - Zoom increment
   * @param pointer - DOM pointer coordinates
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
   * Compatibility support for the existing wheel API.
   * New app code should use handlePointerZoom to avoid coupling camera state to WheelEvent.
   * @param scale - Zoom increment
   * @param event - Mouse wheel event
   * @fires editor:zoom-changed
   */
  public handleMouseWheelZoom(scale: number, event: WheelEvent): void {
    this.handlePointerZoom(scale, event)
  }

  /**
   * Zoom in/out
   * @param scale - Zoom increment
   * @param options - Zoom coordinates (the canvas center by default)
   * @param options.pointX - X coordinate of the zoom point
   * @param options.pointY - Y coordinate of the zoom point
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

    // Live zoom is not rounded on every wheel event:
    // small touchpad increments must accumulate.
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
   * Set the zoom
   * After applying the zoom, recenter the viewport on the artboard,
   * so that reset/default zoom works relative to stable scene coordinates.
   * @param zoom - Zoom
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
   * Reset the zoom
   * Resets the zoom and returns the viewport to the center of the artboard.
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
