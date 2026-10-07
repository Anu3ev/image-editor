import { FabricObject, Point } from 'fabric'
import { ImageEditor } from '../index'

import {
  CANVAS_MIN_WIDTH,
  CANVAS_MIN_HEIGHT,
  CANVAS_MAX_WIDTH,
  CANVAS_MAX_HEIGHT
} from '../constants'

export interface SetResolutionOptions {
  preserveProportional?: boolean
  withoutSave?: boolean
  adaptCanvasToContainer?: boolean
}

export interface setDisplayDimensionOptions {
  element?: 'canvas' | 'wrapper' | 'container'
  dimension?: 'width' | 'height'
  value?: string | number
}

export interface ScaleMontageAreaToImageOptions {
  object?: FabricObject
  preserveAspectRatio?: boolean
  withoutSave?: boolean
}

type MontageAreaSceneBounds = {
  left: number
  top: number
  right: number
  bottom: number
  width: number
  height: number
  center: Point
}

export type ObjectPlacement = {
  left: number
  top: number
  originX: FabricObject['originX']
  originY: FabricObject['originY']
}

// Helper functions for testing
export const clampValue = (value: number, min: number, max: number): number => Math.max(Math.min(value, max), min)

export const calculateProportionalDimension = (base: number, factor: number): number => base * factor

export function isImageObject(
  object: FabricObject | null | undefined
): object is FabricObject & { width: number; height: number } {
  return (object?.type === 'image' || object?.format === 'svg')
    && typeof object?.width === 'number'
    && typeof object?.height === 'number'
}

export default class CanvasManager {
  /**
   * Editor instance with access to the canvas
   */
  public editor: ImageEditor

  /**
   * @param options
   * @param options.editor – Editor instance
   */
  constructor({ editor }: { editor: ImageEditor }) {
    this.editor = editor
  }

  /**
   * Returns the editor container
   */
  public getEditorContainer(): HTMLElement {
    const { canvas, options: { editorContainer } } = this.editor
    return (canvas.editorContainer || editorContainer) as HTMLElement
  }

  /**
   * Returns the center point of the currently visible canvas area.
   * If the point is outside the artboard, it is projected onto the nearest artboard boundary.
   * The artboard's scene coordinates are canonical here, and viewportTransform
   * is the sole camera state for pan/zoom and visual centering.
   */
  public getVisibleCenterPoint(): Point {
    const { canvas } = this.editor
    const zoom = canvas.getZoom()
    const vpt = canvas.viewportTransform
    const width = canvas.getWidth()
    const height = canvas.getHeight()
    const montageBounds = this.getMontageAreaSceneBounds()

    // Calculate the viewport center in canvas coordinates
    const viewportCenterX = (width / 2 - vpt[4]) / zoom
    const viewportCenterY = (height / 2 - vpt[5]) / zoom

    const clampedX = clampValue(
      viewportCenterX,
      montageBounds.left,
      montageBounds.right
    )
    const clampedY = clampValue(
      viewportCenterY,
      montageBounds.top,
      montageBounds.bottom
    )

    return new Point(clampedX, clampedY)
  }

  /**
   * Returns the current artboard center in scene coordinates.
   */
  public getMontageAreaSceneCenter(): Point {
    const { montageArea } = this.editor
    return new Point(montageArea.left, montageArea.top)
  }

  /**
   * Returns the canonical artboard center in scene coordinates.
   * The canonical model keeps the artboard's top-left corner at (0, 0),
   * so its center is determined only by its size.
   */
  public getMontageAreaCanonicalSceneCenter(): Point {
    const { montageArea } = this.editor
    return new Point(montageArea.width / 2, montageArea.height / 2)
  }

  /**
   * Returns the artboard bounds in scene coordinates.
   */
  public getMontageAreaSceneBounds(): MontageAreaSceneBounds {
    const { montageArea } = this.editor
    const center = this.getMontageAreaSceneCenter()
    const halfWidth = montageArea.width / 2
    const halfHeight = montageArea.height / 2

    return {
      left: center.x - halfWidth,
      top: center.y - halfHeight,
      right: center.x + halfWidth,
      bottom: center.y + halfHeight,
      width: montageArea.width,
      height: montageArea.height,
      center
    }
  }

  /**
   * Returns the object's current placement state in scene coordinates.
   * In the editor-level contract, `left/top + originX/originY` are the source of truth
   * for positioning the object relative to the artboard.
   */
  public getObjectPlacement({
    object,
    originX,
    originY
  }: {
    object: FabricObject
    originX?: FabricObject['originX']
    originY?: FabricObject['originY']
  }): ObjectPlacement {
    const resolvedOriginX = originX ?? object.originX ?? 'center'
    const resolvedOriginY = originY ?? object.originY ?? 'center'
    const relativePoint = object.getPointByOrigin(resolvedOriginX, resolvedOriginY)
    const point = object.group
      ? relativePoint.transform(object.group.calcTransformMatrix())
      : relativePoint

    return {
      left: point.x,
      top: point.y,
      originX: resolvedOriginX,
      originY: resolvedOriginY
    }
  }

  /**
   * Builds the target object placement from explicit `left/top/originX/originY`.
   * If a coordinate is omitted, uses the object's current point at the effective origin
   * or the provided fallbackPoint.
   */
  public resolveObjectPlacement({
    object,
    left,
    top,
    originX,
    originY,
    fallbackPoint
  }: {
    object: FabricObject
    left?: number
    top?: number
    originX?: FabricObject['originX']
    originY?: FabricObject['originY']
    fallbackPoint?: Point
  }): ObjectPlacement {
    const resolvedOriginX = originX ?? object.originX ?? 'center'
    const resolvedOriginY = originY ?? object.originY ?? 'center'
    const currentPlacement = this.getObjectPlacement({
      object,
      originX: resolvedOriginX,
      originY: resolvedOriginY
    })

    return {
      left: left ?? fallbackPoint?.x ?? currentPlacement.left,
      top: top ?? fallbackPoint?.y ?? currentPlacement.top,
      originX: resolvedOriginX,
      originY: resolvedOriginY
    }
  }

  /**
   * Applies the placement contract to the object and makes its origin part of the persisted scene state.
   */
  public applyObjectPlacement({
    object,
    placement
  }: {
    object: FabricObject
    placement: ObjectPlacement
  }): void {
    const {
      left,
      top,
      originX,
      originY
    } = placement

    object.set({
      originX,
      originY
    })
    object.setXY(new Point(left, top), originX, originY)
    object.setCoords()
  }

  /**
   * Centers an object relative to the artboard in scene coordinates.
   */
  public centerObjectToMontageArea({ object }: { object: FabricObject }): void {
    const montageCenter = this.getMontageAreaSceneCenter()

    object.setPositionByOrigin(montageCenter, 'center', 'center')
    object.setCoords()
  }

  /**
   * Synchronizes clipPath with the current artboard geometry.
   * clipPath is derived state and must not have its own persisted position.
   */
  public syncClipPathWithMontageArea(): void {
    const {
      canvas,
      montageArea
    } = this.editor
    const { clipPath } = canvas

    if (!clipPath) return

    clipPath.set({
      left: montageArea.left,
      top: montageArea.top,
      width: montageArea.width,
      height: montageArea.height,
      originX: montageArea.originX,
      originY: montageArea.originY
    })
    clipPath.setCoords()
  }

  /**
   * Normalizes montageArea and clipPath to canonical scene placement.
   * In the canonical model, the artboard's top-left corner is always (0, 0),
   * and its center is determined only by its current width and height.
   */
  public placeMontageAreaAtCanonicalScenePosition(): void {
    const { montageArea } = this.editor
    const canonicalCenter = this.getMontageAreaCanonicalSceneCenter()

    montageArea.set({
      left: canonicalCenter.x,
      top: canonicalCenter.y
    })
    montageArea.setCoords()

    this.syncClipPathWithMontageArea()
  }

  /**
   * Updates derived layers that depend on the artboard and current viewport.
   */
  public refreshMontageDerivedState(): void {
    const { backgroundManager, interactionBlocker } = this.editor

    if (backgroundManager.backgroundObject) {
      backgroundManager.refresh()
    }

    if (interactionBlocker.isBlocked) {
      interactionBlocker.refresh()
    }
  }

  /**
   * Set the internal canvas width (for export)
   * @param width - Canvas width
   * @param options
   * @param options.preserveProportional - Preserve the aspect ratio
   * @param options.withoutSave - Do not save the state
   * @param options.adaptCanvasToContainer - Adapt the canvas to the container
   * When the artboard size changes, the editor recalculates defaultZoom
   * and normalizes the current camera state to the new fit state.
   * @fires editor:resolution-width-changed
   */
  public setResolutionWidth(
    width: string | number,
    { preserveProportional, withoutSave, adaptCanvasToContainer }: SetResolutionOptions = {}
  ): void {
    if (!width) return

    const {
      canvas,
      montageArea,
      options: { canvasBackstoreWidth }
    } = this.editor

    const { width: montageAreaWidth, height: montageAreaHeight } = montageArea

    const adjustedWidth = clampValue(Number(width), CANVAS_MIN_WIDTH, CANVAS_MAX_WIDTH)

    // If the canvas width is not set or is 'auto', adapt the canvas to the container
    if (!canvasBackstoreWidth || canvasBackstoreWidth === 'auto' || adaptCanvasToContainer) {
      this.adaptCanvasToContainer()
    } else if (canvasBackstoreWidth) {
      this.setCanvasBackstoreWidth(Number(canvasBackstoreWidth))
    } else {
      this.setCanvasBackstoreWidth(adjustedWidth)
    }

    // Update the dimensions of montageArea and clipPath
    montageArea.set({ width: adjustedWidth })
    this.placeMontageAreaAtCanonicalScenePosition()

    // If the aspect ratio must be preserved, calculate the new height
    if (preserveProportional) {
      const factor = adjustedWidth / montageAreaWidth
      const newHeight = calculateProportionalDimension(montageAreaHeight, factor)
      this.setResolutionHeight(newHeight, {
        withoutSave,
        adaptCanvasToContainer
      })

      return
    }

    this.editor.zoomManager.calculateAndApplyDefaultZoom()
    this.refreshMontageDerivedState()

    if (!withoutSave) {
      this.editor.historyManager.saveState()
    }

    canvas.fire('editor:resolution-width-changed', {
      width: adjustedWidth,
      preserveProportional,
      withoutSave,
      adaptCanvasToContainer
    })

    // update the drag bounds
    this.editor.panConstraintManager.updateBounds()
  }

  /**
   * Set the internal canvas height (for export)
   * @param height - Canvas height
   * @param options
   * @param options.preserveProportional - Preserve the aspect ratio
   * @param options.withoutSave - Do not save the state
   * @param options.adaptCanvasToContainer - Adapt the canvas to the container
   * When the artboard size changes, the editor recalculates defaultZoom
   * and normalizes the current camera state to the new fit state.
   * @fires editor:resolution-height-changed
   */
  public setResolutionHeight(
    height: string | number,
    { preserveProportional, withoutSave, adaptCanvasToContainer }: SetResolutionOptions = {}
  ): void {
    if (!height) return

    const {
      canvas,
      montageArea,
      options: { canvasBackstoreHeight }
    } = this.editor

    const { width: montageAreaWidth, height: montageAreaHeight } = montageArea

    const adjustedHeight = clampValue(Number(height), CANVAS_MIN_HEIGHT, CANVAS_MAX_HEIGHT)

    if (!canvasBackstoreHeight || canvasBackstoreHeight === 'auto' || adaptCanvasToContainer) {
      this.adaptCanvasToContainer()
    } else if (canvasBackstoreHeight) {
      this.setCanvasBackstoreHeight(Number(canvasBackstoreHeight))
    } else {
      this.setCanvasBackstoreHeight(adjustedHeight)
    }

    // Update the dimensions of montageArea and clipPath
    montageArea.set({ height: adjustedHeight })
    this.placeMontageAreaAtCanonicalScenePosition()

    // If the aspect ratio must be preserved, calculate the new width
    if (preserveProportional) {
      const factor = adjustedHeight / montageAreaHeight
      const newWidth = calculateProportionalDimension(montageAreaWidth, factor)

      this.setResolutionWidth(newWidth, {
        withoutSave,
        adaptCanvasToContainer
      })

      return
    }

    this.editor.zoomManager.calculateAndApplyDefaultZoom()
    this.refreshMontageDerivedState()

    if (!withoutSave) {
      this.editor.historyManager.saveState()
    }

    canvas.fire('editor:resolution-height-changed', {
      height: adjustedHeight,
      preserveProportional,
      withoutSave,
      adaptCanvasToContainer
    })

    // update the drag bounds
    this.editor.panConstraintManager.updateBounds()
  }

  /**
   * Centers the viewport on the artboard without changing scene coordinates.
   * The method controls only camera state through viewportTransform.
   */
  public centerViewportToMontageArea(): void {
    const { canvas } = this.editor
    const currentZoom = canvas.getZoom()
    const montageCenter = this.getMontageAreaSceneCenter()
    const viewportWidth = canvas.getWidth()
    const viewportHeight = canvas.getHeight()

    canvas.setViewportTransform([
      currentZoom,
      0,
      0,
      currentZoom,
      viewportWidth / 2 - montageCenter.x * currentZoom,
      viewportHeight / 2 - montageCenter.y * currentZoom
    ])
    canvas.renderAll()
  }

  /**
   * Set the canvas backstore width (for export)
   */
  public setCanvasBackstoreWidth(width: number): void {
    if (!width || typeof width !== 'number') return

    const adjustedWidth = clampValue(width, CANVAS_MIN_WIDTH, CANVAS_MAX_WIDTH)

    this.editor.canvas.setDimensions({ width: adjustedWidth }, { backstoreOnly: true })
  }

  /**
   * Set the canvas backstore height (for export)
   * @param height
   */
  public setCanvasBackstoreHeight(height: number): void {
    if (!height || typeof height !== 'number') return

    const adjustedHeight = clampValue(height, CANVAS_MIN_HEIGHT, CANVAS_MAX_HEIGHT)

    this.editor.canvas.setDimensions({ height: adjustedHeight }, { backstoreOnly: true })
  }

  /**
   * Adapts the canvas dimensions to the editor container size.
   * Sets the canvas width and height based on the container dimensions,
   * respecting minimum and maximum values.
   */
  public adaptCanvasToContainer(): void {
    const { canvas } = this.editor

    const container = this.getEditorContainer()
    const cw = container.clientWidth
    const ch = container.clientHeight

    const width = clampValue(cw, CANVAS_MIN_WIDTH, CANVAS_MAX_WIDTH)
    const height = clampValue(ch, CANVAS_MIN_HEIGHT, CANVAS_MAX_HEIGHT)

    canvas.setDimensions({ width, height }, { backstoreOnly: true })
  }

  /**
   * Updates the canvas dimensions without changing object positions.
   * Used when the browser window is resized.
   *
   * In the camera-only model, container resize changes only the canvas dimensions and viewportTransform.
   * Scene coordinates of user objects and montageArea remain stable,
   * while defaultZoom is recalculated as derived camera state for the new viewport.
   * @fires editor:canvas-updated
   */
  public updateCanvas(): void {
    const {
      canvas,
      montageArea: {
        width: montageAreaWidth,
        height: montageAreaHeight
      }
    } = this.editor

    this.adaptCanvasToContainer()
    this.placeMontageAreaAtCanonicalScenePosition()
    this.editor.zoomManager.updateDefaultZoom()
    this.centerViewportToMontageArea()
    this.refreshMontageDerivedState()

    canvas.fire('editor:canvas-updated', {
      width: montageAreaWidth,
      height: montageAreaHeight
    })

    // update the drag bounds
    this.editor.panConstraintManager.updateBounds()
  }

  /**
   * Stub.
   * Updates the canvas CSS dimensions based on the current zoom to allow vertical and horizontal scrolling.
   *
   * TODO: The image is currently clipped when zooming.
   * Implement zoom at the mouse cursor inside the artboard and canvas dragging while holding the space bar.
   *
   * This method must be called after zoomToPoint.
   *
   * @param zoom — Current zoom value (for example, 1, 1.2, 2, etc.)
   */
  // public updateCssDimensionsForZoom(zoom: number): void {
  //   const { canvas, montageArea } = this.editor

  //   const zoomedWidth = montageArea.width * zoom
  //   const zoomedHeight = montageArea.height * zoom
  //   const scrollContainer = canvas.wrapperEl.parentNode

  //   if (!(scrollContainer instanceof HTMLElement)) return

  //   const cssWidth = zoomedWidth <= scrollContainer.clientWidth ? '100%' : zoomedWidth
  //   const cssHeight = zoomedHeight <= scrollContainer.clientHeight ? '100%' : zoomedHeight

  //   canvas.setDimensions(
  //     { width: cssWidth, height: cssHeight },
  //     { cssOnly: true }
  //   )
  // }

  /**
   * Set the canvas CSS width for display
   * @param width
   * @fires editor:display-canvas-width-changed
   */
  public setCanvasCSSWidth(value: string | number): void {
    this.setDisplayDimension({
      element: 'canvas',
      dimension: 'width',
      value
    })
  }

  /**
   * Set the canvas CSS height for display
   * @param height
   * @fires editor:display-canvas-height-changed
   */
  public setCanvasCSSHeight(value: string | number): void {
    this.setDisplayDimension({
      element: 'canvas',
      dimension: 'height',
      value
    })
  }

  /**
   * Set the canvas wrapper CSS width for display
   * @param width
   * @fires editor:display-wrapper-width-changed
   */
  public setCanvasWrapperWidth(value: string | number): void {
    this.setDisplayDimension({
      element: 'wrapper',
      dimension: 'width',
      value
    })
  }

  /**
   * Set the canvas wrapper CSS height for display
   * @param height
   * @fires editor:display-wrapper-height-changed
   */
  public setCanvasWrapperHeight(value: string | number): void {
    this.setDisplayDimension({
      element: 'wrapper',
      dimension: 'height',
      value
    })
  }

  /**
   * Set the editor container CSS width for display
   * @param width
   * @fires editor:display-container-width-changed
   */
  public setEditorContainerWidth(value: string | number): void {
    this.setDisplayDimension({
      element: 'container',
      dimension: 'width',
      value
    })
  }

  /**
   * Set the editor container CSS height for display
   * @param height
   * @fires editor:display-container-height-changed
   */
  public setEditorContainerHeight(value: string | number): void {
    this.setDisplayDimension({
      element: 'container',
      dimension: 'height',
      value
    })
  }

  /**
   * Set the canvas CSS width or height for display
   * @param options
   * @param options.element - Element whose dimensions are being set:
   * canvas (upper & lower), wrapper, container
   * @param options.dimension - Dimension to set: width or height
   * @param options.value - Dimension value (string or number)
   * @fires editor:display-{element}-{dimension}-changed
   */
  public setDisplayDimension({ element = 'canvas', dimension, value }: setDisplayDimensionOptions = {}): void {
    if (!value) return

    const { canvas } = this.editor

    const canvasElements = []

    switch (element) {
    case 'canvas':
      canvasElements.push(canvas.lowerCanvasEl, canvas.upperCanvasEl)
      break
    case 'wrapper':
      canvasElements.push(canvas.wrapperEl)
      break
    case 'container':
      canvasElements.push(this.getEditorContainer())
      break
    default:
      canvasElements.push(canvas.lowerCanvasEl, canvas.upperCanvasEl)
    }

    const cssDimension = dimension === 'width' ? 'width' : 'height'

    // If it is a string, set it directly
    if (typeof value === 'string') {
      canvasElements.forEach((el) => { (el!).style[cssDimension] = value })

      return
    }

    // eslint-disable-next-line no-restricted-globals
    if (isNaN(value)) return

    const newValuePx = `${value}px`
    canvasElements.forEach((el) => { (el!).style[cssDimension] = newValuePx })

    canvas.fire(`editor:display-${element}-${cssDimension}-changed`, {
      element,
      value
    })
  }

  /**
   * If the image fits within the allowed values, scale the canvas to match it
   * @param options
   * @param options.object - Object containing the image to scale
   * @param options.withoutSave - Do not save the state
   * @param options.preserveAspectRatio - Preserve the original artboard aspect ratio
   * @fires editor:montage-area-scaled-to-image
   */
  public scaleMontageAreaToImage(
    { object, preserveAspectRatio, withoutSave }: ScaleMontageAreaToImageOptions = {}
  ): void {
    const {
      canvas,
      montageArea,
      transformManager
    } = this.editor

    const image = object || canvas.getActiveObject()

    if (!isImageObject(image)) return

    const { width: imageWidth, height: imageHeight } = image

    let newCanvasWidth = Math.min(imageWidth, CANVAS_MAX_WIDTH)
    let newCanvasHeight = Math.min(imageHeight, CANVAS_MAX_HEIGHT)

    if (preserveAspectRatio) {
      const {
        width: currentMontageAreaWidth,
        height: currentMontageAreaHeight
      } = montageArea

      const widthMultiplier = imageWidth / currentMontageAreaWidth
      const heightMultiplier = imageHeight / currentMontageAreaHeight

      const multiplier = Math.max(widthMultiplier, heightMultiplier)

      newCanvasWidth = currentMontageAreaWidth * multiplier
      newCanvasHeight = currentMontageAreaHeight * multiplier
    }

    this.setResolutionWidth(newCanvasWidth, { withoutSave: true })
    this.setResolutionHeight(newCanvasHeight, { withoutSave: true })

    transformManager.resetObject({ object: image, withoutSave: true })
    this.centerObjectToMontageArea({ object: image })
    canvas.renderAll()

    if (!withoutSave) {
      this.editor.historyManager.saveState()
    }

    canvas.fire('editor:montage-area-scaled-to-image', {
      object: image,
      width: newCanvasWidth,
      height: newCanvasHeight,
      preserveAspectRatio,
      withoutSave
    })
  }

  /**
   * Clear the canvas
   * @fires editor:cleared
   */
  public clearCanvas() {
    const { canvas, montageArea, historyManager } = this.editor

    historyManager.suspendHistory()

    // Completely clear the canvas (remove all objects, backgrounds, overlays, etc.)
    canvas.clear()

    // Add the artboard back
    canvas.add(montageArea)

    canvas.renderAll()
    historyManager.resumeHistory()

    historyManager.saveState()

    canvas?.fire('editor:cleared')
  }

  /**
   * Set the canvas zoom and scale and reset all object transforms
   * @param options
   * @param options.withoutSave - Do not save the state
   * @fires editor:default-scale-set
   */
  public setDefaultScale({ withoutSave }: { withoutSave?: boolean } = {}) {
    const {
      canvas,
      transformManager,
      historyManager,
      options: {
        montageAreaWidth: initialMontageAreaWidth,
        montageAreaHeight: initialMontageAreaHeight
      }
    } = this.editor

    this.editor.zoomManager.resetZoom()

    this.setResolutionWidth(initialMontageAreaWidth, { withoutSave: true })
    this.setResolutionHeight(initialMontageAreaHeight, { withoutSave: true })
    canvas.renderAll()

    transformManager.resetObjects()

    if (!withoutSave) {
      historyManager.saveState()
    }

    canvas.fire('editor:default-scale-set')
  }

  /**
   * Get all objects inside the editor artboard
   * @returns Array of objects
   */
  public getObjects(): FabricObject[] {
    const {
      canvas,
      montageArea,
      interactionBlocker: { overlayMask },
      backgroundManager: { backgroundObject }
    } = this.editor

    const canvasObjects = canvas.getObjects()

    return canvasObjects.filter(
      (obj) => obj.id !== montageArea.id
               && obj.id !== overlayMask?.id
               && obj.id !== backgroundObject?.id
    )
  }
}
