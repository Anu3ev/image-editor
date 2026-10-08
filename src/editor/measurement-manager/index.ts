import {
  Canvas,
  FabricObject,
  TPointerEvent,
  TPointerEventInfo
} from 'fabric'

import { ImageEditor } from '..'
import { getObjectExactBounds } from '../utils/geometry'
import {
  collectExcludedObjects,
  shouldIgnoreObject
} from '../utils/object-filter'
import { drawGuideLabel } from '../utils/render-utils'
import { resolveDisplayDistance } from '../utils/distance'
import {
  MEASUREMENT_COLOR,
  MEASUREMENT_LINE_WIDTH
} from './constants'
import type { Bounds, MeasurementGuide } from './types'

/** Fabric mouse move event with an optional object under the cursor. */
type MouseMoveEvent = TPointerEventInfo<TPointerEvent> & {
  target?: FabricObject | null
}

/** Measurement target and its exact bounds in scene coordinates. */
type MeasurementTargetContext = {
  targetBounds: Bounds
  targetIsMontageArea: boolean
}

/** Measurement guide with a prepared distance label. */
type MeasurementRenderGuide = {
  guide: MeasurementGuide
  label: string
}

/**
 * Manager for displaying distances between selected objects and the object under the cursor while ALT is held down.
 */
export default class MeasurementManager {
  /**
   * Editor instance.
   */
  public editor: ImageEditor

  /**
   * Editor canvas.
   */
  private canvas: Canvas

  /**
   * Current measurement guides.
   */
  private activeGuides: MeasurementGuide[] = []

  /**
   * Flag indicating that ALT is held down.
   */
  private isAltPressed: boolean = false

  /**
   * Latest mouse movement for deferred processing.
   */
  private pendingEvent: MouseMoveEvent | null = null

  /**
   * Active requestAnimationFrame identifier.
   */
  private frameRequest: number | null = null

  /**
   * Flag for hiding the toolbar in measurement mode.
   */
  private isToolbarHidden: boolean = false

  /**
   * Indicates whether the current measurement target is the artboard.
   */
  private isTargetMontageArea: boolean = false

  /**
   * Last known mouse move event.
   */
  private lastMouseEvent: MouseMoveEvent | null = null

  /**
   * Mouse move handler.
   */
  private _onMouseMove: (event: MouseMoveEvent) => void

  /**
   * Pre-render cleanup handler.
   */
  private _onBeforeRender: () => void

  /**
   * Guide rendering handler.
   */
  private _onAfterRender: () => void

  /**
   * Reset handler for selection clearing.
   */
  private _onSelectionCleared: () => void

  /**
   * Key press handler.
   */
  private _onKeyDown: (event: KeyboardEvent) => void

  /**
   * Key release handler.
   */
  private _onKeyUp: (event: KeyboardEvent) => void

  /**
   * Window blur handler.
   */
  private _onWindowBlur: () => void

  /**
   * Creates the measurement manager and initializes events.
   */
  constructor({ editor }: { editor: ImageEditor }) {
    this.editor = editor
    this.canvas = editor.canvas

    this._onMouseMove = this._handleMouseMove.bind(this)
    this._onBeforeRender = this._handleBeforeRender.bind(this)
    this._onAfterRender = this._handleAfterRender.bind(this)
    this._onSelectionCleared = this._handleSelectionCleared.bind(this)
    this._onKeyDown = this._handleKeyDown.bind(this)
    this._onKeyUp = this._handleKeyUp.bind(this)
    this._onWindowBlur = this._handleWindowBlur.bind(this)

    this._bindEvents()
  }

  /**
   * Disables the manager and removes all listeners.
   */
  public destroy(): void {
    this._unbindEvents()
    this._cancelScheduledUpdate()
    this._clearGuides()
  }

  /**
   * Subscribes the manager to the required events.
   */
  private _bindEvents(): void {
    const { canvas } = this
    canvas.on('mouse:move', this._onMouseMove)
    canvas.on('before:render', this._onBeforeRender)
    canvas.on('after:render', this._onAfterRender)
    canvas.on('selection:cleared', this._onSelectionCleared)

    window.addEventListener('keydown', this._onKeyDown)
    window.addEventListener('keyup', this._onKeyUp)
    window.addEventListener('blur', this._onWindowBlur)
  }

  /**
   * Removes all event handlers.
   */
  private _unbindEvents(): void {
    const { canvas } = this
    canvas.off('mouse:move', this._onMouseMove)
    canvas.off('before:render', this._onBeforeRender)
    canvas.off('after:render', this._onAfterRender)
    canvas.off('selection:cleared', this._onSelectionCleared)

    window.removeEventListener('keydown', this._onKeyDown)
    window.removeEventListener('keyup', this._onKeyUp)
    window.removeEventListener('blur', this._onWindowBlur)
  }

  /**
   * Records ALT being held down to enable measurements.
   */
  private _handleKeyDown(event: KeyboardEvent): void {
    if (event.altKey || event.key === 'Alt') {
      this.isAltPressed = true
      if (this.lastMouseEvent) {
        this.pendingEvent = this.lastMouseEvent
        this._scheduleUpdate()
      }
    }
  }

  /**
   * Resets measurement mode when ALT is released.
   */
  private _handleKeyUp(event: KeyboardEvent): void {
    if (!this.isAltPressed) return

    const isAltReleased = event.key === 'Alt' || !event.altKey
    if (!isAltReleased) return

    this.isAltPressed = false
    this._clearGuides()
  }

  /**
   * Resets measurement mode when the window loses focus.
   */
  private _handleWindowBlur(): void {
    this.isAltPressed = false
    this._clearGuides()
  }

  /**
   * Clears measurements when the selection is cleared.
   */
  private _handleSelectionCleared(): void {
    this._clearGuides()
  }

  /**
   * Handles mouse movement and schedules a measurement update.
   */
  private _handleMouseMove(event: MouseMoveEvent): void {
    const { e } = event
    this.lastMouseEvent = event
    const isAltActive = Boolean(e?.altKey)

    this.isAltPressed = isAltActive

    if (!isAltActive) {
      this._clearGuides()
      return
    }

    const { canvas } = this
    const activeObjects = canvas.getActiveObjects()
    if (!activeObjects.length) {
      this._clearGuides()
      return
    }

    this._hideToolbar()
    this.pendingEvent = event
    this._scheduleUpdate()
  }

  /**
   * Schedules a guide update in an animation frame.
   */
  private _scheduleUpdate(): void {
    if (this.frameRequest !== null) return

    this.frameRequest = window.requestAnimationFrame(() => {
      this.frameRequest = null
      this._processPending()
    })
  }

  /**
   * Cancels the deferred update.
   */
  private _cancelScheduledUpdate(): void {
    if (this.frameRequest === null) return
    window.cancelAnimationFrame(this.frameRequest)
    this.frameRequest = null
  }

  /**
   * Processes the pending movement event.
   */
  private _processPending(): void {
    const event = this.pendingEvent
    this.pendingEvent = null
    this._updateGuides({ event })
  }

  /**
   * Updates the set of measurement guides.
   */
  private _updateGuides({
    event
  }: {
    event: MouseMoveEvent | null
  }): void {
    if (!this.isAltPressed || !event) {
      this._clearGuides()
      return
    }

    const { canvas } = this
    const activeObject = canvas.getActiveObject()

    if (!activeObject) {
      this._clearGuides()
      return
    }

    const activeBounds = getObjectExactBounds({ object: activeObject })

    if (!activeBounds) {
      this._clearGuides()
      return
    }

    const targetContext = this._resolveMeasurementTargetContext({
      event,
      activeObject
    })
    if (!targetContext) {
      this._clearGuides()
      return
    }

    const { targetBounds, targetIsMontageArea } = targetContext

    const isActiveOutsideMontage = targetIsMontageArea
      && MeasurementManager._isOutsideBounds({ activeBounds, targetBounds })
    if (isActiveOutsideMontage) {
      this._clearGuides()
      return
    }

    const guides = MeasurementManager._buildGuides({
      activeBounds,
      targetBounds,
      targetIsMontageArea
    })

    if (!guides.length) {
      this._clearGuides()
      return
    }

    this.isTargetMontageArea = targetIsMontageArea
    this.activeGuides = guides
    this._hideToolbar()
    canvas.requestRenderAll()
  }

  /** Returns the object under the cursor or the artboard, along with its exact bounds. */
  private _resolveMeasurementTargetContext({
    event,
    activeObject
  }: {
    event: MouseMoveEvent
    activeObject: FabricObject
  }): MeasurementTargetContext | null {
    const targetObject = MeasurementManager._resolveTarget({ event, activeObject })
    const { montageArea } = this.editor
    const fallbackTarget = targetObject ?? montageArea
    const targetBounds = getObjectExactBounds({ object: fallbackTarget })
    if (!targetBounds) return null

    return {
      targetBounds,
      targetIsMontageArea: fallbackTarget === montageArea
    }
  }

  /** Checks whether the active object is entirely outside the target. */
  private static _isOutsideBounds({
    activeBounds,
    targetBounds
  }: {
    activeBounds: Bounds
    targetBounds: Bounds
  }): boolean {
    return activeBounds.right <= targetBounds.left
      || activeBounds.left >= targetBounds.right
      || activeBounds.bottom <= targetBounds.top
      || activeBounds.top >= targetBounds.bottom
  }

  /**
   * Returns the object under the cursor that is suitable for measurement.
   */
  private static _resolveTarget({
    event,
    activeObject
  }: {
    event: MouseMoveEvent
    activeObject: FabricObject
  }): FabricObject | null {
    const { target } = event
    const excluded = collectExcludedObjects({ activeObject })

    if (target && !shouldIgnoreObject({ object: target, excluded })) {
      return target
    }

    return null
  }

  /**
   * Builds vertical and horizontal distance guides.
   */
  private static _buildGuides({
    activeBounds,
    targetBounds,
    targetIsMontageArea
  }: {
    activeBounds: Bounds
    targetBounds: Bounds
    targetIsMontageArea: boolean
  }): MeasurementGuide[] {
    const horizontalGuides = MeasurementManager._buildHorizontalGuides({
      activeBounds,
      targetBounds,
      targetIsMontageArea
    })
    const verticalGuides = MeasurementManager._buildVerticalGuides({
      activeBounds,
      targetBounds,
      targetIsMontageArea
    })

    return [...horizontalGuides, ...verticalGuides]
  }

  /**
   * Builds horizontal guides (distance along the X axis).
   */
  private static _buildHorizontalGuides({
    activeBounds,
    targetBounds,
    targetIsMontageArea
  }: {
    activeBounds: Bounds
    targetBounds: Bounds
    targetIsMontageArea: boolean
  }): MeasurementGuide[] {
    const guides: MeasurementGuide[] = []
    const {
      left: activeLeft = 0,
      right: activeRight = 0,
      top: activeTop = 0,
      bottom: activeBottom = 0,
      centerY: activeCenterY = 0
    } = activeBounds
    const {
      left: targetLeft = 0,
      right: targetRight = 0,
      top: targetTop = 0,
      bottom: targetBottom = 0,
      centerY: targetCenterY = 0
    } = targetBounds

    const overlapStart = Math.max(activeTop, targetTop)
    const overlapEnd = Math.min(activeBottom, targetBottom)
    const hasOverlap = overlapEnd >= overlapStart
    const axis = hasOverlap
      ? (overlapStart + overlapEnd) / 2
      : (activeCenterY + targetCenterY) / 2

    if (targetLeft >= activeRight) {
      if (targetIsMontageArea) return guides

      const distance = targetLeft - activeRight
      if (distance > 0) {
        guides.push({
          type: 'horizontal',
          axis,
          start: activeRight,
          end: targetLeft,
          distance
        })
      }
      return guides
    }

    if (targetRight <= activeLeft) {
      if (targetIsMontageArea) return guides

      const distance = activeLeft - targetRight
      if (distance > 0) {
        guides.push({
          type: 'horizontal',
          axis,
          start: targetRight,
          end: activeLeft,
          distance
        })
      }
      return guides
    }

    if (!targetIsMontageArea) return guides

    const isBeyondLeft = activeLeft < targetLeft
    const isBeyondRight = activeRight > targetRight

    const leftStart = Math.min(activeLeft, targetLeft)
    const leftEnd = Math.max(activeLeft, targetLeft)
    const leftDistance = leftEnd - leftStart
    if (leftDistance > 0 && !isBeyondLeft) {
      guides.push({
        type: 'horizontal',
        axis,
        start: leftStart,
        end: leftEnd,
        distance: leftDistance
      })
    }

    const rightStart = Math.min(activeRight, targetRight)
    const rightEnd = Math.max(activeRight, targetRight)
    const rightDistance = rightEnd - rightStart
    if (rightDistance > 0 && !isBeyondRight) {
      guides.push({
        type: 'horizontal',
        axis,
        start: rightStart,
        end: rightEnd,
        distance: rightDistance
      })
    }

    return guides
  }

  /**
   * Builds vertical guides (distance along the Y axis).
   */
  private static _buildVerticalGuides({
    activeBounds,
    targetBounds,
    targetIsMontageArea
  }: {
    activeBounds: Bounds
    targetBounds: Bounds
    targetIsMontageArea: boolean
  }): MeasurementGuide[] {
    const guides: MeasurementGuide[] = []
    const {
      top: activeTop = 0,
      bottom: activeBottom = 0,
      left: activeLeft = 0,
      right: activeRight = 0,
      centerX: activeCenterX = 0
    } = activeBounds
    const {
      top: targetTop = 0,
      bottom: targetBottom = 0,
      left: targetLeft = 0,
      right: targetRight = 0,
      centerX: targetCenterX = 0
    } = targetBounds

    const overlapStart = Math.max(activeLeft, targetLeft)
    const overlapEnd = Math.min(activeRight, targetRight)
    const hasOverlap = overlapEnd >= overlapStart
    const axis = hasOverlap
      ? (overlapStart + overlapEnd) / 2
      : (activeCenterX + targetCenterX) / 2

    if (targetTop >= activeBottom) {
      if (targetIsMontageArea) return guides

      const distance = targetTop - activeBottom
      if (distance > 0) {
        guides.push({
          type: 'vertical',
          axis,
          start: activeBottom,
          end: targetTop,
          distance
        })
      }
      return guides
    }

    if (targetBottom <= activeTop) {
      if (targetIsMontageArea) return guides

      const distance = activeTop - targetBottom
      if (distance > 0) {
        guides.push({
          type: 'vertical',
          axis,
          start: targetBottom,
          end: activeTop,
          distance
        })
      }
      return guides
    }

    if (!targetIsMontageArea) return guides

    const isBeyondTop = activeTop < targetTop
    const isBeyondBottom = activeBottom > targetBottom

    const topStart = Math.min(activeTop, targetTop)
    const topEnd = Math.max(activeTop, targetTop)
    const topDistance = topEnd - topStart
    if (topDistance > 0 && !isBeyondTop) {
      guides.push({
        type: 'vertical',
        axis,
        start: topStart,
        end: topEnd,
        distance: topDistance
      })
    }

    const bottomStart = Math.min(activeBottom, targetBottom)
    const bottomEnd = Math.max(activeBottom, targetBottom)
    const bottomDistance = bottomEnd - bottomStart
    if (bottomDistance > 0 && !isBeyondBottom) {
      guides.push({
        type: 'vertical',
        axis,
        start: bottomStart,
        end: bottomEnd,
        distance: bottomDistance
      })
    }

    return guides
  }

  /**
   * Resets active guides and triggers a redraw.
   */
  private _clearGuides(): void {
    if (!this.activeGuides.length) {
      this._showToolbar()
      return
    }

    this.activeGuides = []
    this.isTargetMontageArea = false
    this.canvas.requestRenderAll()
    this._showToolbar()
  }

  /**
   * Clears the helper layer before rendering.
   */
  private _handleBeforeRender(): void {
    const { canvas } = this
    const { contextTop } = canvas

    if (contextTop) {
      canvas.clearContext(contextTop)
    }
  }

  /**
   * Draws guides and badges after the canvas is rendered.
   */
  private _handleAfterRender(): void {
    if (!this.activeGuides.length) return

    const { canvas } = this
    const context = canvas.getSelectionContext()

    if (!context) return

    const { viewportTransform } = canvas
    const zoom = canvas.getZoom() || 1
    const hasVertical = this.activeGuides.some((guide) => guide.type === 'vertical')
    const hasHorizontal = this.activeGuides.some((guide) => guide.type === 'horizontal')
    const hasBothDirections = hasVertical && hasHorizontal && !this.isTargetMontageArea
    const labelOffset = hasBothDirections ? 12 / zoom : 0
    const renderGuides: MeasurementRenderGuide[] = this.activeGuides.map((guide) => ({
      guide,
      label: resolveDisplayDistance({ distance: guide.distance }).toString()
    }))

    context.save()
    try {
      if (Array.isArray(viewportTransform)) {
        context.transform(...viewportTransform)
      }
      context.lineWidth = MEASUREMENT_LINE_WIDTH / zoom
      context.strokeStyle = MEASUREMENT_COLOR
      context.setLineDash([])
      this._drawMeasurementGuides({
        context,
        renderGuides,
        zoom,
        labelOffset,
        hasBothDirections
      })
    } finally {
      context.restore()
    }
  }

  /** Draws validated measurement guides and distance labels. */
  private _drawMeasurementGuides({
    context,
    renderGuides,
    zoom,
    labelOffset,
    hasBothDirections
  }: {
    context: CanvasRenderingContext2D
    renderGuides: MeasurementRenderGuide[]
    zoom: number
    labelOffset: number
    hasBothDirections: boolean
  }): void {
    for (const { guide, label } of renderGuides) {
      const { type, axis, start, end } = guide
      const gap = Math.abs(end - start)
      const sign = start <= end ? -1 : 1
      const offsetAlongAxis = hasBothDirections ? sign * ((gap / 2) + labelOffset) : 0

      context.beginPath()
      if (type === 'vertical') {
        context.moveTo(axis, start)
        context.lineTo(axis, end)
      } else {
        context.moveTo(start, axis)
        context.lineTo(end, axis)
      }
      context.stroke()

      drawGuideLabel({
        context,
        type,
        axis,
        start,
        end,
        text: label,
        zoom,
        color: MEASUREMENT_COLOR,
        lineWidth: MEASUREMENT_LINE_WIDTH,
        offsetAlongAxis,
        offsetPerpendicular: 0
      })
    }
  }

  /**
   * Temporarily hides the toolbar while measurements are displayed.
   */
  private _hideToolbar(): void {
    if (this.isToolbarHidden) return

    const { toolbar } = this.editor
    toolbar?.hideTemporarily?.()
    this.isToolbarHidden = true
  }

  /**
   * Restores the toolbar after measurement mode.
   */
  private _showToolbar(): void {
    if (!this.isToolbarHidden) return

    const { toolbar } = this.editor
    toolbar?.showAfterTemporary?.()
    this.isToolbarHidden = false
  }
}
