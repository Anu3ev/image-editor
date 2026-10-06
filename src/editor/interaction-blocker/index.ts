import { Rect } from 'fabric'
import { ImageEditor } from '../index'
import { addRectangleToCanvas } from '../utils/primitive-shapes'
import {
  AiGenerationOverlay,
  registerAiGenerationOverlay
} from './ai-generation-overlay'
import type {
  InteractionBlockerBlockOptions,
  InteractionBlockerOverlay,
  InteractionBlockerOverlayBaseOptions,
  InteractionBlockerOverlayGeometry
} from './types'

export type {
  InteractionBlockerBlockOptions,
  InteractionBlockerOverlay
} from './types'

const DEFAULT_OVERLAY: InteractionBlockerOverlay = 'default'
const OVERLAY_MASK_ID = 'overlay-mask'

export default class InteractionBlocker {
  /**
   * Reference to the editor containing the canvas.
   */
  public editor: ImageEditor

  /**
   * Flag indicating whether the editor is blocked.
   */
  public isBlocked: boolean

  /**
   * Reference to the mask that blocks interaction with the artboard.
   */
  public overlayMask: Rect | null

  private _overlayType: InteractionBlockerOverlay

  constructor({ editor }: { editor: ImageEditor }) {
    registerAiGenerationOverlay()

    this.editor = editor
    this.isBlocked = false
    this.overlayMask = null
    this._overlayType = DEFAULT_OVERLAY
  }

  /**
   * Returns the canonical overlay geometry for the current artboard.
   * The overlay is a derived/runtime layer and must match montageArea
   * in scene coordinates without persisting its own independent position.
   */
  private _getOverlayGeometry(): InteractionBlockerOverlayGeometry {
    const { canvasManager } = this.editor
    const montageBounds = canvasManager.getMontageAreaSceneBounds()

    return {
      width: montageBounds.width,
      height: montageBounds.height,
      left: montageBounds.center.x,
      top: montageBounds.center.y,
      originX: 'center',
      originY: 'center',
      scaleX: 1,
      scaleY: 1,
      angle: 0,
      flipX: false,
      flipY: false
    }
  }

  private _getOverlayBaseOptions(): InteractionBlockerOverlayBaseOptions {
    return {
      ...this._getOverlayGeometry(),
      selectable: false,
      evented: true,
      hoverCursor: 'not-allowed',
      hasBorders: false,
      hasControls: false,
      excludeFromExport: true,
      visible: false,
      id: OVERLAY_MASK_ID
    }
  }

  private _createDefaultOverlay(): Rect {
    const {
      options: { overlayMaskColor = 'rgba(136, 136, 136, 0.5)' }
    } = this.editor

    return addRectangleToCanvas({
      canvas: this.editor.canvas,
      options: {
        ...this._getOverlayBaseOptions(),
        fill: overlayMaskColor
      },
      flags: { withoutSelection: true }
    })
  }

  private _createAiGenerationOverlay(): AiGenerationOverlay {
    const overlay = new AiGenerationOverlay(this._getOverlayBaseOptions())

    this.editor.canvas.add(overlay)
    return overlay
  }

  private _stopOverlayAnimation(): void {
    if (this.overlayMask instanceof AiGenerationOverlay) {
      this.overlayMask.stopAnimation()
    }
  }

  /**
   * Creates an overlay to block the artboard.
   */
  private _createOverlay({ overlay }: { overlay: InteractionBlockerOverlay }): void {
    const { canvas, historyManager } = this.editor

    historyManager.suspendHistory()

    try {
      this._stopOverlayAnimation()

      if (this.overlayMask) {
        canvas.remove(this.overlayMask)
      }

      this.overlayMask = overlay === 'ai-generation'
        ? this._createAiGenerationOverlay()
        : this._createDefaultOverlay()
      this._overlayType = overlay
    } finally {
      historyManager.resumeHistory()
    }
  }

  private _startOverlayAnimation(): void {
    if (this.overlayMask instanceof AiGenerationOverlay) {
      this.overlayMask.startAnimation({ canvas: this.editor.canvas })
    }
  }

  /**
   * Ensures the overlay exists and synchronizes it with the current artboard.
   * The overlay is a runtime layer and must not depend on persisted state or load path order.
   */
  public ensureOverlay({ overlay = this._overlayType }: InteractionBlockerBlockOptions = {}): void {
    if (!this.overlayMask || this._overlayType !== overlay) {
      this._createOverlay({ overlay })
    }

    if (!this.overlayMask) return

    this.overlayMask.set(this._getOverlayGeometry())
    this.overlayMask.visible = this.isBlocked
    this.overlayMask.setCoords()
  }

  /**
   * Updates the overlay's size and position and brings it to the front
   */
  public refresh(): void {
    const { canvas, historyManager } = this.editor

    if (!this.overlayMask) return

    historyManager.suspendHistory()

    try {
      this.overlayMask.set(this._getOverlayGeometry())
      this.overlayMask.setCoords()
      canvas.discardActiveObject()

      this.editor.layerManager.bringToFront(this.overlayMask, { withoutSave: true })

      if (this.isBlocked) {
        this._startOverlayAnimation()
      }
    } finally {
      historyManager.resumeHistory()
    }
  }

  /**
   * Disables the editor:
   * - removes all selections, mouse events, scaling, and drag-and-drop
   * - makes all objects non-evented and non-selectable
   * - shows overlayMask above all objects in the artboard
   */
  public block({ overlay = DEFAULT_OVERLAY }: InteractionBlockerBlockOptions = {}): void {
    if (this.isBlocked) {
      this.ensureOverlay()
      return
    }

    this.ensureOverlay({ overlay })

    if (!this.overlayMask) return

    const { canvas, canvasManager, historyManager } = this.editor

    historyManager.suspendHistory()

    try {
      this.isBlocked = true

      // Remove all selections, mouse events, scaling, and drag-and-drop
      canvas.discardActiveObject()
      canvas.selection = false
      canvas.skipTargetFind = true

      // Make all objects non-evented and non-selectable
      canvasManager.getObjects().forEach((obj) => {
        obj.evented = false
        obj.selectable = false
      })

      // block the canvas elements themselves in the DOM
      canvas.upperCanvasEl.style.pointerEvents = 'none'
      canvas.lowerCanvasEl.style.pointerEvents = 'none'

      this.overlayMask.visible = true
      this.refresh()

      canvas.fire('editor:disabled')
    } finally {
      historyManager.resumeHistory()
    }
  }

  /**
   * Enables the editor
   */
  public unblock(): void {
    if (!this.isBlocked || !this.overlayMask) return

    const { canvas, canvasManager, historyManager } = this.editor

    historyManager.suspendHistory()

    try {
      this.isBlocked = false

      // restore interactivity
      canvas.selection = true
      canvas.skipTargetFind = false

      // restore selections and events
      canvasManager.getObjects().forEach((obj) => {
        obj.evented = true
        obj.selectable = true
      })

      // unblock the DOM
      canvas.upperCanvasEl.style.pointerEvents = ''
      canvas.lowerCanvasEl.style.pointerEvents = ''

      this._stopOverlayAnimation()
      this.overlayMask.visible = false
      canvas.requestRenderAll()

      canvas.fire('editor:enabled')
    } finally {
      historyManager.resumeHistory()
    }

    historyManager.flushDeferredSaveAfterUnblock()
  }
}
