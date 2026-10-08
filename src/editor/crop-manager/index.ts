import {
  FabricImage,
  Rect,
  type Canvas,
  type FabricObject,
  type Transform,
  type TPointerEvent,
  type TPointerEventInfo
} from 'fabric'

import type { ImageEditor } from '../index'
import type { SnapDomainBoundary } from '../snapping-manager/guides/snap-target-resolver'
import type { AnchorBuckets, GuideLine } from '../snapping-manager/types'
import { applyCropFrameScaleSnapping } from './snapping/crop-frame-scale-snapping'
import { getObjectExactBounds } from '../utils/geometry'
import { CropFrameInteraction } from './interaction/crop-frame-interaction'
import type {
  CropFrameChangeEvent,
  CropSourceBoundTransform
} from './interaction/crop-resize.types'
import { errorCodes } from '../error-manager/error-codes'
import {
  clampCropFrameToSource,
  clampCropFrameToSourcePreservingAspectRatio,
  getCropRectInSource,
  getSourceSize,
  resolveImageCropSourceAspectRatio,
  resolveCropSize
} from './domain/crop-geometry'
import {
  CropFrame,
  createCropFrame,
  setCropFrameActiveResizePreserveAspectRatio
} from './domain/crop-frame'
import { getCropFrameTransformState } from './domain/crop-frame-transform-state'
import {
  restoreCropScaleAnchor,
  restoreCropSourceBoundFrame
} from './interaction/crop-source-bound-resize'
import {
  isCropFrameResizeTransform,
  resolveCropFrameResizePreserveAspectRatio
} from './domain/crop-resize-mode'
import {
  getCropSessionResultRect,
  getRoundedCropRect
} from './domain/crop-result'
import {
  installCropDimmingOverlay,
  restoreCropDimmingOverlay
} from './domain/crop-dimming-overlay'
import {
  applyCanvasCrop,
  applyImageCrop
} from './mutation/crop-apply'
import type {
  CropApplyResult,
  CropAspectRatio,
  CropFrameFitType,
  CropObjectInteractivity,
  CropSession,
  CropSessionOptions,
  CropSize,
  CropState,
  SetCropPreserveAspectRatioOptions,
  StartCanvasCropOptions,
  StartImageCropOptions
} from './types'

/**
 * Default crop mode behavior.
 */
const DEFAULT_CROP_SESSION_OPTIONS = {
  allowFrameOverflow: true,
  showGrid: true,
  showDimmedArea: true,
  cancelOnSelectionClear: true,
  preserveAspectRatio: true
} satisfies CropSessionOptions

/**
 * Tolerance for live checks of whether the frame extends beyond the source.
 * Fabric can produce fractional pixels for a frame that visually sits on the source boundary.
 */
const SOURCE_BOUNDS_OVERFLOW_EPSILON = 0.5

/**
 * Part of the internal Fabric canvas state needed only to suppress the current pointer event.
 */
type CanvasWithTargetCache = Canvas & {
  _targetInfo?: {
    target?: FabricObject
    subTargets: FabricObject[]
    currentSubTargets: FabricObject[]
  }
  skipTargetFind: boolean
}

/**
 * Minimal part of a live event that affects the effective resize mode.
 */
type CropResizeModeEvent = {
  e?: Pick<TPointerEvent, 'shiftKey'>
  transform?: Pick<
    CropSourceBoundTransform,
    'cropSourceScaleClamped' | 'cropSourceScalePreserveAspectRatio'
  >
}

/**
 * Manages transient crop mode for the artboard and the selected image.
 */
export default class CropManager {
  /**
   * Editor instance.
   */
  public editor: ImageEditor

  /**
   * Active crop session. Not serialized or included in history.
   */
  private _session: CropSession | null

  /**
   * Effective resize mode of the current active resize interaction.
   */
  private _activeResizePreserveAspectRatio: boolean | null

  /** Owner of resizing and movement for the active crop area. */
  private _frameInteraction: CropFrameInteraction | null = null

  /**
   * @param options
   * @param options.editor - Editor instance
   */
  constructor({ editor }: { editor: ImageEditor }) {
    this.editor = editor
    this._session = null
    this._activeResizePreserveAspectRatio = null
  }

  /**
   * Returns true if crop mode is active.
   */
  public get isActive(): boolean {
    return Boolean(this._session)
  }

  /** Passes exact source bounds to legacy snapping only for the active crop frame. */
  public getFrameSnappingBoundary(target?: FabricObject | null): SnapDomainBoundary | undefined {
    const session = this._session
    if (!session || target !== session.frame) return undefined

    const bounds = getObjectExactBounds({ object: session.source })
    if (!bounds) return undefined

    return { object: session.source, bounds }
  }

  /** Handles legacy crop frame resizing that the shared scale session does not support. */
  public applyFrameScalingSnap({
    target, transform, event, anchors, threshold
  }: {
    target?: FabricObject | null
    transform?: Transform | null
    event?: TPointerEvent | null
    anchors: AnchorBuckets
    threshold: number
  }): GuideLine[] {
    const session = this._session
    if (!session || session.frame !== target || !transform) return []

    const guides = applyCropFrameScaleSnapping({ session, transform, event, anchors, threshold })
    return this.isFrameOverflowingSource({ target }) ? [] : guides
  }

  /**
   * Returns the public state of the active crop mode.
   */
  public getState(): CropState | null {
    const { _session: session } = this
    if (!session) return null
    const rect = getCropSessionResultRect({ session })
    const sourceSize = session.options.allowFrameOverflow
      ? undefined
      : getSourceSize({ source: session.source })

    return {
      mode: session.mode,
      frame: session.frame,
      options: session.options,
      target: session.target,
      effectivePreserveAspectRatio: session.effectivePreserveAspectRatio,
      rect: getRoundedCropRect({
        rect,
        sourceSize
      })
    }
  }

  /**
   * Returns the effective aspect ratio preservation state, accounting for Shift being held.
   * Returns true if crop mode is inactive.
   */
  public get effectivePreserveAspectRatio(): boolean {
    return this._session?.effectivePreserveAspectRatio ?? true
  }

  /**
   * Returns the effective aspect ratio preservation state for the given event.
   * Accounts for Shift being held and the source-bound clamp.
   * Returns true if crop mode is inactive.
   */
  private _getEffectivePreserveAspectRatio(
    event?: CropResizeModeEvent
  ): boolean {
    const { _session: session } = this
    if (!session) return true

    if (event?.transform?.cropSourceScaleClamped === true) {
      const preserveAspectRatio = event?.transform?.cropSourceScalePreserveAspectRatio

      return preserveAspectRatio ?? true
    }

    return resolveCropFrameResizePreserveAspectRatio({
      target: session.frame,
      shiftKey: event?.e?.shiftKey
    })
  }

  /** Returns true if the live step moved the crop frame beyond the source along the selected axis and will be clamped. */
  public isFrameOverflowingSource({
    target,
    axis
  }: { target?: FabricObject | null; axis?: 'x' | 'y' }): boolean {
    const { _session: session } = this
    if (!session || !target) return false
    if (session.options.allowFrameOverflow) return false
    if (session.frame !== target) return false

    const rect = getCropRectInSource({ source: session.source, frame: session.frame })
    const sourceSize = getSourceSize({ source: session.source })
    const minLeft = (-sourceSize.width / 2) - SOURCE_BOUNDS_OVERFLOW_EPSILON
    const minTop = (-sourceSize.height / 2) - SOURCE_BOUNDS_OVERFLOW_EPSILON
    const maxRight = (sourceSize.width / 2) + SOURCE_BOUNDS_OVERFLOW_EPSILON
    const maxBottom = (sourceSize.height / 2) + SOURCE_BOUNDS_OVERFLOW_EPSILON
    const overflowsX = rect.left < minLeft || rect.left + rect.width > maxRight
    const overflowsY = rect.top < minTop || rect.top + rect.height > maxBottom

    return (axis !== 'y' && overflowsX) || (axis !== 'x' && overflowsY)
  }

  /**
   * Enters artboard crop mode.
   */
  public startCanvasCrop(options: StartCanvasCropOptions = {}): CropState | null {
    this.cancel()

    const session = this._createCanvasSession({
      source: this.editor.montageArea,
      options
    })

    this._activateSession({ session })

    return this.getState()
  }

  /**
   * Enters crop mode for the selected image.
   */
  public startImageCrop(options: StartImageCropOptions = {}): CropState | null {
    this.cancel()

    const target = options.target ?? this.editor.canvas.getActiveObject()
    if (!(target instanceof FabricImage)) {
      this._emitInvalidImageTargetError({ target })
      return null
    }
    if (target.locked) {
      this._emitLockedImageTargetError({ target })
      return null
    }

    const session = this._createImageSession({
      target,
      options
    })

    this._activateSession({ session })

    return this.getState()
  }

  /**
   * Updates the crop area to the specified visible aspect ratio.
   */
  public setAspectRatio({ aspectRatio }: { aspectRatio: CropAspectRatio | null }): CropState | null {
    const { _session: session } = this
    if (!session) return null

    const sourceSize = getSourceSize({ source: session.source })
    const sourceAspectRatio = aspectRatio && session.mode === 'image'
      ? resolveImageCropSourceAspectRatio({ source: session.source, aspectRatio })
      : aspectRatio
    const nextSize = resolveCropSize({
      sourceSize,
      aspectRatio: sourceAspectRatio ?? undefined,
      allowOverflow: session.options.allowFrameOverflow
    })

    this._applyFrameSize({
      session,
      size: nextSize
    })

    return this.getState()
  }

  /**
   * Updates the crop frame to an explicit size.
   */
  public setSize({ size }: { size: CropSize }): CropState | null {
    const { _session: session } = this
    if (!session) return null

    const sourceSize = getSourceSize({ source: session.source })
    const nextSize = resolveCropSize({
      sourceSize,
      size,
      allowOverflow: session.options.allowFrameOverflow
    })

    this._applyFrameSize({
      session,
      size: nextSize
    })

    return this.getState()
  }

  /**
   * Toggles aspect ratio preservation when resizing the active crop area.
   */
  public setPreserveAspectRatio({
    preserveAspectRatio,
    keepCurrentResizeMode = false
  }: SetCropPreserveAspectRatioOptions): CropState | null {
    const { _session: session } = this
    if (!session) return null

    const currentResizeMode = this._activeResizePreserveAspectRatio

    session.options.preserveAspectRatio = preserveAspectRatio
    this._setFramePreserveAspectRatio({
      frame: session.frame,
      preserveAspectRatio
    })
    setCropFrameActiveResizePreserveAspectRatio({
      frame: session.frame,
      preserveAspectRatio: null
    })

    session.effectivePreserveAspectRatio = preserveAspectRatio
    if (keepCurrentResizeMode && currentResizeMode !== null) {
      session.effectivePreserveAspectRatio = currentResizeMode
      setCropFrameActiveResizePreserveAspectRatio({
        frame: session.frame,
        preserveAspectRatio: currentResizeMode
      })
    }

    this.editor.canvas.requestRenderAll()

    return this.getState()
  }

  /**
   * Expands the active crop frame to the source, preserving the current aspect ratio when keep ratio is enabled.
   * For image crops, a direct call without a Fabric event target is allowed.
   */
  public resetFrameToSource(
    { target }: { target?: FabricObject | null } = {}
  ): CropState | null {
    const { _session: session } = this
    if (!session) return null

    const usesActiveImageCropFrame = target === undefined && session.mode === 'image'
    if (session.frame !== target && !usesActiveImageCropFrame) return null

    const sourceSize = getSourceSize({ source: session.source })
    let size = sourceSize

    if (session.options.preserveAspectRatio) {
      if (!(session.frame instanceof CropFrame)) {
        throw new Error('The crop session frame must be a CropFrame')
      }

      size = resolveCropSize({
        sourceSize,
        aspectRatio: session.frame.getObjectDisplaySize(),
        allowOverflow: session.options.allowFrameOverflow
      })
    }

    this._applyFrameSize({
      session,
      size
    })

    return this.getState()
  }

  /**
   * Scales the active crop frame to the artboard when extending beyond the source is allowed.
   * In strict crop mode, contain and cover expand the frame to the source using the same reset geometry.
   */
  public fitFrame({ type }: { type: CropFrameFitType }): CropState | null {
    const { _session: session } = this
    if (!session) return null

    if (!session.options.allowFrameOverflow) {
      const state = this.resetFrameToSource({ target: session.frame })
      if (!state) return null

      this.editor.canvas.fire('editor:crop:changed', state)

      return state
    }

    this.editor.transformManager.fitObject({
      object: session.frame,
      type,
      withoutSave: true,
      fitAsOneObject: true
    })
    this._clampFrameIfNeeded({
      session,
      preserveAspectRatio: true
    })

    const state = this.getState()
    if (!state) return null

    this.editor.canvas.fire('editor:crop:changed', state)
    this.editor.canvas.requestRenderAll()

    return state
  }

  /**
   * Applies the active crop mode.
   */
  public apply(): CropApplyResult | null {
    const { _session: session } = this
    if (!session) return null

    const result = this._applySessionCrop({ session })

    this._finishSession({
      nextActiveObject: result?.target ?? null
    })

    if (!result) return null

    this.editor.historyManager.saveState()
    this.editor.canvas.fire('editor:crop:applied', result)

    return result
  }

  /**
   * Exits crop mode without applying it.
   */
  public cancel(): boolean {
    const { _session: session } = this
    if (!session) return false

    this._finishSession({
      nextActiveObject: session.previousActiveObject
    })
    this.editor.canvas.fire('editor:crop:cancelled', {
      mode: session.mode,
      target: session.target
    })

    return true
  }

  /**
   * Cleans up crop mode when the editor is destroyed.
   */
  public destroy(): void {
    this.cancel()
  }

  /**
   * Creates a runtime crop session.
   */
  private _createCanvasSession({
    source,
    options
  }: {
    source: FabricObject
    options: StartCanvasCropOptions
  }): CropSession {
    const sessionOptions = this._resolveSessionOptions({ options })
    const frame = this._createCropFrameForSource({
      source,
      options,
      sessionOptions
    })

    return {
      mode: 'canvas',
      source,
      target: null,
      frame,
      options: sessionOptions,
      previousActiveObject: this.editor.canvas.getActiveObject() ?? null,
      interactivity: [],
      sourceBoundFrameState: null,
      effectivePreserveAspectRatio: sessionOptions.preserveAspectRatio
    }
  }

  /**
   * Creates a runtime crop session for an image.
   */
  private _createImageSession({
    target,
    options
  }: {
    target: FabricImage
    options: StartImageCropOptions
  }): CropSession {
    const sessionOptions = this._resolveSessionOptions({ options })
    const frame = this._createCropFrameForSource({
      source: target,
      options,
      sessionOptions
    })

    return {
      mode: 'image',
      source: target,
      target,
      frame,
      options: sessionOptions,
      previousActiveObject: this.editor.canvas.getActiveObject() ?? null,
      interactivity: [],
      sourceBoundFrameState: null,
      effectivePreserveAspectRatio: sessionOptions.preserveAspectRatio
    }
  }

  /**
   * Returns the complete runtime settings for the crop session.
   */
  private _resolveSessionOptions({
    options
  }: {
    options: StartCanvasCropOptions | StartImageCropOptions
  }): CropSessionOptions {
    return {
      allowFrameOverflow: options.allowFrameOverflow ?? DEFAULT_CROP_SESSION_OPTIONS.allowFrameOverflow,
      showGrid: options.showGrid ?? DEFAULT_CROP_SESSION_OPTIONS.showGrid,
      showDimmedArea: options.showDimmedArea ?? DEFAULT_CROP_SESSION_OPTIONS.showDimmedArea,
      cancelOnSelectionClear: options.cancelOnSelectionClear ?? DEFAULT_CROP_SESSION_OPTIONS.cancelOnSelectionClear,
      preserveAspectRatio: options.preserveAspectRatio
        ?? DEFAULT_CROP_SESSION_OPTIONS.preserveAspectRatio
    }
  }

  /**
   * Creates a crop frame based on the source size and the supplied constraints.
   */
  private _createCropFrameForSource({
    source,
    options,
    sessionOptions
  }: {
    source: FabricObject
    options: StartCanvasCropOptions | StartImageCropOptions
    sessionOptions: CropSessionOptions
  }): CropFrame {
    const sourceSize = getSourceSize({ source })
    const sourceAspectRatio = options.aspectRatio && source instanceof FabricImage
      ? resolveImageCropSourceAspectRatio({ source, aspectRatio: options.aspectRatio })
      : options.aspectRatio
    const cropSize = resolveCropSize({
      sourceSize,
      size: options.size,
      aspectRatio: sourceAspectRatio,
      allowOverflow: sessionOptions.allowFrameOverflow
    })

    return createCropFrame({
      source,
      cropSize,
      showGrid: sessionOptions.showGrid,
      allowFrameOverflow: sessionOptions.allowFrameOverflow,
      preserveAspectRatio: sessionOptions.preserveAspectRatio
    })
  }

  /**
   * Synchronizes the runtime crop frame with the active aspect ratio preservation mode.
   */
  private _setFramePreserveAspectRatio({
    frame,
    preserveAspectRatio
  }: {
    frame: Rect
    preserveAspectRatio: boolean
  }): void {
    if (!(frame instanceof CropFrame)) {
      throw new Error('The crop session frame must be a CropFrame')
    }

    frame.preserveAspectRatio = preserveAspectRatio
  }

  /**
   * Activates the crop session on the canvas.
   */
  private _activateSession({ session }: { session: CropSession }): void {
    const { canvas, historyManager } = this.editor

    historyManager.suspendHistory()
    this.editor.toolbar.hideTemporarily()
    session.interactivity = this._disableSceneObjects()

    this._session = session
    if (session.options.showDimmedArea) {
      installCropDimmingOverlay({ canvas, frame: session.frame })
    }
    this._bindCropFrameEvents({ frame: session.frame })
    this._frameInteraction = new CropFrameInteraction({
      canvas,
      frame: session.frame,
      snapping: this.editor.snappingManager
    })

    canvas.add(session.frame)
    canvas.bringObjectToFront(session.frame)
    canvas.setActiveObject(session.frame)
    this._clampFrameIfNeeded({ session })
    this._bindCanvasSelectionEvents({ session })
    canvas.requestRenderAll()

    canvas.fire('editor:crop:started', this.getState())
  }

  /**
   * Subscribes the crop frame to live constraints.
   */
  private _bindCropFrameEvents({ frame }: { frame: Rect }): void {
    frame.on('moving', this._handleCropFrameChanged)
    frame.on('scaling', this._handleCropFrameChanged)
    frame.on('modified', this._handleCropFrameModified)
  }

  /**
   * Unsubscribes the crop frame from live constraints.
   */
  private _unbindCropFrameEvents({ frame }: { frame: Rect }): void {
    frame.off('moving', this._handleCropFrameChanged)
    frame.off('scaling', this._handleCropFrameChanged)
    frame.off('modified', this._handleCropFrameModified)
  }

  /**
   * Subscribes the canvas to loss of the active crop frame, if enabled in the session.
   */
  private _bindCanvasSelectionEvents({ session }: { session: CropSession }): void {
    if (!session.options.cancelOnSelectionClear) return

    this.editor.canvas.on('mouse:down:before', this._handleCanvasMouseDownBefore)
    this.editor.canvas.on('selection:cleared', this._handleCanvasSelectionChanged)
    this.editor.canvas.on('selection:updated', this._handleCanvasSelectionChanged)
  }

  /**
   * Unsubscribes the canvas from crop session lifecycle events.
   */
  private _unbindCanvasSelectionEvents(): void {
    this.editor.canvas.off('mouse:down:before', this._handleCanvasMouseDownBefore)
    this.editor.canvas.off('selection:cleared', this._handleCanvasSelectionChanged)
    this.editor.canvas.off('selection:updated', this._handleCanvasSelectionChanged)
  }

  /**
   * Handles live changes to the crop frame.
   */
  private readonly _handleCropFrameChanged = (event?: CropFrameChangeEvent): void => {
    const { _session: session } = this
    if (!session) return

    session.effectivePreserveAspectRatio = this._getEffectivePreserveAspectRatio(event)

    if (!this._frameInteraction?.ownsTransform(event?.transform)) {
      const restored = restoreCropSourceBoundFrame({ session, event })
      this._clampFrameIfNeeded({ session, preserveAspectRatio: session.effectivePreserveAspectRatio })
      restoreCropScaleAnchor({ session, transform: event?.transform })
      if (!restored) {
        session.sourceBoundFrameState = event?.transform?.cropSourceScaleClamped === true
          ? getCropFrameTransformState({ frame: session.frame })
          : null
      }
    }
    if (isCropFrameResizeTransform({ transform: event?.transform })) {
      this._activeResizePreserveAspectRatio = session.effectivePreserveAspectRatio
    }

    this.editor.canvas.fire('editor:crop:changed', this.getState())
    this.editor.canvas.requestRenderAll()
  }

  /**
   * Handles completion of a crop frame change and clears the live resize override.
   */
  private readonly _handleCropFrameModified = (event?: CropFrameChangeEvent): void => {
    this._handleCropFrameChanged(event)

    const { _session: session } = this
    if (!session) return

    setCropFrameActiveResizePreserveAspectRatio({
      frame: session.frame,
      preserveAspectRatio: null
    })
    this._activeResizePreserveAspectRatio = null
    session.effectivePreserveAspectRatio = session.options.preserveAspectRatio
  }

  /**
   * Cancels crop mode if the crop frame is no longer the active object.
   */
  private readonly _handleCanvasSelectionChanged = (): void => {
    const { _session: session } = this
    if (!session) return
    if (!session.options.cancelOnSelectionClear) return
    if (this._isSpacePanActive()) return
    if (this.editor.canvas.getActiveObject() === session.frame) return

    this.cancel()
  }

  /**
   * Returns true if the current loss of focus is caused by temporary Space-pan.
   */
  private _isSpacePanActive(): boolean {
    return Boolean(this.editor.listeners?.isSpacePressed)
  }

  /**
   * Exits crop mode on a click outside the frame and prevents that click from selecting another object.
   */
  private readonly _handleCanvasMouseDownBefore = ({
    target
  }: TPointerEventInfo<TPointerEvent>): void => {
    const { _session: session } = this
    if (!session) return
    if (!session.options.cancelOnSelectionClear) return
    if (this._isSpacePanActive()) return
    if (target === session.frame) return

    let nextActiveObject: FabricObject | null = null

    if (session.mode === 'image') {
      nextActiveObject = session.target
    }

    this._cancelFromPointerDown({
      nextActiveObject
    })
  }

  /**
   * Ends crop mode so the current pointer event cannot select the object under the cursor.
   */
  private _cancelFromPointerDown({
    nextActiveObject
  }: {
    nextActiveObject: FabricObject | null
  }): void {
    const { _session: session } = this
    if (!session) return

    const { canvas } = this.editor
    const canvasWithCache = canvas as CanvasWithTargetCache
    const previousSkipTargetFind = canvasWithCache.skipTargetFind
    const cancelledPayload = {
      mode: session.mode,
      target: session.target
    }

    canvasWithCache.skipTargetFind = true
    canvasWithCache._targetInfo = {
      subTargets: [],
      currentSubTargets: []
    }

    this._finishSession({ nextActiveObject: null })
    this._deferPointerDownSelectionRestore({
      nextActiveObject,
      previousSkipTargetFind
    })

    this.editor.canvas.fire('editor:crop:cancelled', cancelledPayload)
  }

  /**
   * Restores selection after Fabric finishes the current mouse:down.
   */
  private _deferPointerDownSelectionRestore({
    nextActiveObject,
    previousSkipTargetFind
  }: {
    nextActiveObject: FabricObject | null
    previousSkipTargetFind: boolean
  }): void {
    const restoreSelection = (): void => {
      const canvasWithCache = this.editor.canvas as CanvasWithTargetCache
      canvasWithCache.skipTargetFind = previousSkipTargetFind
      this._restoreActiveObject({ object: nextActiveObject })
      this.editor.canvas.requestRenderAll()
    }

    if (typeof window === 'undefined') {
      restoreSelection()
      return
    }

    window.setTimeout(restoreSelection, 0)
  }

  /**
   * Applies a new local frame size.
   */
  private _applyFrameSize({
    session,
    size
  }: {
    session: CropSession
    size: CropSize
  }): void {
    session.frame.set({
      width: size.width,
      height: size.height,
      scaleX: session.source.scaleX ?? 1,
      scaleY: session.source.scaleY ?? 1
    })
    session.frame.setCoords()
    this._clampFrameIfNeeded({ session })
    this.editor.canvas.requestRenderAll()
  }

  /**
   * Constrains the crop frame to the source bounds only in strict mode.
   */
  private _clampFrameIfNeeded({
    session,
    preserveAspectRatio = false
  }: {
    session: CropSession
    preserveAspectRatio?: boolean
  }): void {
    if (session.options.allowFrameOverflow) return

    if (preserveAspectRatio) {
      clampCropFrameToSourcePreservingAspectRatio({
        source: session.source,
        frame: session.frame
      })
      return
    }

    clampCropFrameToSource({
      source: session.source,
      frame: session.frame
    })
  }

  /**
   * Applies the active crop session through the mode-specific mutation path.
   */
  private _applySessionCrop({ session }: { session: CropSession }): CropApplyResult | null {
    const sourceSize = session.options.allowFrameOverflow
      ? undefined
      : getSourceSize({ source: session.source })
    const rect = getRoundedCropRect({
      rect: getCropSessionResultRect({ session }),
      sourceSize
    })

    if (session.mode === 'canvas') {
      return applyCanvasCrop({
        editor: this.editor,
        frame: session.frame,
        rect
      })
    }

    return applyImageCrop({
      editor: this.editor,
      target: session.target,
      frame: session.frame,
      rect
    })
  }

  /**
   * Ends the crop session and restores normal editing even if gesture completion fails.
   */
  private _finishSession({
    nextActiveObject
  }: {
    nextActiveObject: FabricObject | null
  }): void {
    const { _session: session } = this
    if (!session) return

    try {
      this._frameInteraction?.destroy()
    } finally {
      this._frameInteraction = null
      this._unbindCropFrameEvents({ frame: session.frame })
      this._unbindCanvasSelectionEvents()
      restoreCropDimmingOverlay({ canvas: this.editor.canvas })
      this.editor.canvas.remove(session.frame)
      this._restoreSceneObjects({ interactivity: session.interactivity })
      this.editor.historyManager.resumeHistory()
      this._activeResizePreserveAspectRatio = null
      this._session = null
      this._restoreActiveObject({ object: nextActiveObject })
      this.editor.toolbar.showAfterTemporary()
      this.editor.canvas.requestRenderAll()
    }
  }

  /**
   * Disables interaction with regular objects while crop mode is active.
   */
  private _disableSceneObjects(): CropObjectInteractivity[] {
    const objects = this.editor.canvasManager.getObjects()

    return objects.map((object) => {
      const interactivity = {
        object,
        selectable: Boolean(object.selectable),
        evented: Boolean(object.evented)
      }

      object.set({
        selectable: false,
        evented: false
      })

      return interactivity
    })
  }

  /**
   * Restores object interactivity after crop mode.
   */
  private _restoreSceneObjects({ interactivity }: { interactivity: CropObjectInteractivity[] }): void {
    interactivity.forEach((item) => {
      item.object.set({
        selectable: item.selectable,
        evented: item.evented
      })
      item.object.setCoords()
    })
  }

  /**
   * Restores the active object if it is still on the canvas.
   */
  private _restoreActiveObject({ object }: { object: FabricObject | null }): void {
    const { canvas } = this.editor
    if (!object) {
      canvas.discardActiveObject()
      return
    }

    if (!canvas.getObjects().includes(object)) {
      canvas.discardActiveObject()
      return
    }

    canvas.setActiveObject(object)
  }

  /**
   * Emits an image crop startup error for an unsupported target.
   */
  private _emitInvalidImageTargetError({ target }: { target: FabricObject | undefined }): void {
    this.editor.errorManager.emitError({
      origin: 'CropManager',
      method: 'startImageCrop',
      code: errorCodes.CROP_MANAGER.INVALID_IMAGE_TARGET,
      message: 'Select a raster image object to crop an image.',
      data: {
        targetType: target?.type,
        targetId: target?.id
      }
    })
  }

  /**
   * Emits an image crop startup error for a locked target.
   */
  private _emitLockedImageTargetError({ target }: { target: FabricImage }): void {
    this.editor.errorManager.emitError({
      origin: 'CropManager',
      method: 'startImageCrop',
      code: errorCodes.CROP_MANAGER.LOCKED_IMAGE_TARGET,
      message: 'A locked image cannot be cropped.',
      data: {
        targetType: target.type,
        targetId: target.id
      }
    })
  }
}
