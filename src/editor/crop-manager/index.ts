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
 * Поведение crop mode по умолчанию.
 */
const DEFAULT_CROP_SESSION_OPTIONS = {
  allowFrameOverflow: true,
  showGrid: true,
  showDimmedArea: true,
  cancelOnSelectionClear: true,
  preserveAspectRatio: true
} satisfies CropSessionOptions

/**
 * Допуск для live-проверки выхода frame за source.
 * Fabric может давать доли пикселя у frame, который визуально стоит на границе source.
 */
const SOURCE_BOUNDS_OVERFLOW_EPSILON = 0.5

/**
 * Часть internal Fabric canvas state, нужная только чтобы погасить текущий pointer event.
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
 * Минимальная часть live-event, которая влияет на effective resize mode.
 */
type CropResizeModeEvent = {
  e?: Pick<TPointerEvent, 'shiftKey'>
  transform?: Pick<
    CropSourceBoundTransform,
    'cropSourceScaleClamped' | 'cropSourceScalePreserveAspectRatio'
  >
}

/**
 * Управляет transient crop mode для монтажной области и выбранного изображения.
 */
export default class CropManager {
  /**
   * Инстанс редактора.
   */
  public editor: ImageEditor

  /**
   * Активная crop session. Не сериализуется и не попадает в history.
   */
  private _session: CropSession | null

  /**
   * Фактический resize-режим текущего active resize interaction.
   */
  private _activeResizePreserveAspectRatio: boolean | null

  /** Владелец изменения размера и перемещения активной crop-области. */
  private _frameInteraction: CropFrameInteraction | null = null

  /**
   * @param options
   * @param options.editor - экземпляр редактора
   */
  constructor({ editor }: { editor: ImageEditor }) {
    this.editor = editor
    this._session = null
    this._activeResizePreserveAspectRatio = null
  }

  /**
   * Возвращает true, если crop mode активен.
   */
  public get isActive(): boolean {
    return Boolean(this._session)
  }

  /** Передаёт прежнему snapping точные границы источника только для активной crop-рамки. */
  public getFrameSnappingBoundary(target?: FabricObject | null): SnapDomainBoundary | undefined {
    const session = this._session
    if (!session || target !== session.frame) return undefined

    const bounds = getObjectExactBounds({ object: session.source })
    if (!bounds) return undefined

    return { object: session.source, bounds }
  }

  /** Обрабатывает прежний resize crop-рамки, не поддерживаемый общей scale-сессией. */
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
   * Возвращает публичное состояние активного crop mode.
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
   * Возвращает фактическое состояние сохранения пропорций с учётом зажатого Shift.
   * Если crop mode не активен, возвращает true.
   */
  public get effectivePreserveAspectRatio(): boolean {
    return this._session?.effectivePreserveAspectRatio ?? true
  }

  /**
   * Возвращает фактическое состояние сохранения пропорций по переданному событию.
   * Учитывает зажатый Shift и source-bound clamp.
   * Если crop mode не активен, возвращает true.
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

  /** Возвращает true, если live-step вынес crop frame за source по выбранной оси и будет зажат clamp-ом. */
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
   * Входит в режим кропа монтажной области.
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
   * Входит в режим кропа выбранного изображения.
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
   * Обновляет crop-область по заданной видимой пропорции.
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
   * Обновляет crop frame по explicit размеру.
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
   * Переключает сохранение пропорций при resize активной crop-области.
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
   * Разворачивает active crop frame до source, сохраняя текущие пропорции при включённом keep ratio.
   * Для image crop разрешён прямой вызов без Fabric event target.
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
        throw new Error('Crop session frame должен быть CropFrame')
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
   * Масштабирует active crop frame к монтажной области, когда разрешён выход за source.
   * В strict crop contain и cover разворачивают frame до source с одной и той же геометрией reset.
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
   * Применяет активный crop mode.
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
   * Выходит из crop mode без применения.
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
   * Очищает crop mode при уничтожении редактора.
   */
  public destroy(): void {
    this.cancel()
  }

  /**
   * Создаёт runtime crop session.
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
   * Создаёт runtime crop session для изображения.
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
   * Возвращает полные runtime-настройки crop session.
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
   * Создаёт crop frame по размеру источника и переданным ограничениям.
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
   * Синхронизирует runtime crop frame с активным режимом сохранения пропорций.
   */
  private _setFramePreserveAspectRatio({
    frame,
    preserveAspectRatio
  }: {
    frame: Rect
    preserveAspectRatio: boolean
  }): void {
    if (!(frame instanceof CropFrame)) {
      throw new Error('Crop session frame должен быть CropFrame')
    }

    frame.preserveAspectRatio = preserveAspectRatio
  }

  /**
   * Активирует crop session на canvas.
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
   * Подписывает crop frame на live-ограничения.
   */
  private _bindCropFrameEvents({ frame }: { frame: Rect }): void {
    frame.on('moving', this._handleCropFrameChanged)
    frame.on('scaling', this._handleCropFrameChanged)
    frame.on('modified', this._handleCropFrameModified)
  }

  /**
   * Отписывает crop frame от live-ограничений.
   */
  private _unbindCropFrameEvents({ frame }: { frame: Rect }): void {
    frame.off('moving', this._handleCropFrameChanged)
    frame.off('scaling', this._handleCropFrameChanged)
    frame.off('modified', this._handleCropFrameModified)
  }

  /**
   * Подписывает canvas на потерю active crop frame, если это включено в session.
   */
  private _bindCanvasSelectionEvents({ session }: { session: CropSession }): void {
    if (!session.options.cancelOnSelectionClear) return

    this.editor.canvas.on('mouse:down:before', this._handleCanvasMouseDownBefore)
    this.editor.canvas.on('selection:cleared', this._handleCanvasSelectionChanged)
    this.editor.canvas.on('selection:updated', this._handleCanvasSelectionChanged)
  }

  /**
   * Отписывает canvas от lifecycle-событий crop session.
   */
  private _unbindCanvasSelectionEvents(): void {
    this.editor.canvas.off('mouse:down:before', this._handleCanvasMouseDownBefore)
    this.editor.canvas.off('selection:cleared', this._handleCanvasSelectionChanged)
    this.editor.canvas.off('selection:updated', this._handleCanvasSelectionChanged)
  }

  /**
   * Обрабатывает live-изменение crop frame.
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
   * Обрабатывает завершение изменения crop frame и очищает live resize override.
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
   * Отменяет crop mode, если crop frame перестал быть active object.
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
   * Возвращает true, если текущая потеря focus связана с временным Space-pan.
   */
  private _isSpacePanActive(): boolean {
    return Boolean(this.editor.listeners?.isSpacePressed)
  }

  /**
   * Выходит из crop mode по клику вне frame и не даёт этому же клику выбрать другой объект.
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
   * Завершает crop mode так, чтобы текущий pointer event не выбрал объект под курсором.
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
   * Восстанавливает selection после того, как Fabric завершит текущий mouse:down.
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
   * Применяет новый локальный размер frame.
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
   * Ограничивает crop frame source-границами только для strict mode.
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
   * Применяет активную crop session через mode-specific mutation path.
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
   * Завершает crop session и возвращает обычное редактирование даже при ошибке завершения жеста.
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
   * Отключает интерактивность обычных объектов на время crop mode.
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
   * Восстанавливает интерактивность объектов после crop mode.
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
   * Восстанавливает active object, если он ещё находится на canvas.
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
   * Эмитит ошибку старта image crop для неподдержанного target.
   */
  private _emitInvalidImageTargetError({ target }: { target: FabricObject | undefined }): void {
    this.editor.errorManager.emitError({
      origin: 'CropManager',
      method: 'startImageCrop',
      code: errorCodes.CROP_MANAGER.INVALID_IMAGE_TARGET,
      message: 'Для кропа изображения нужно выбрать raster image объект.',
      data: {
        targetType: target?.type,
        targetId: target?.id
      }
    })
  }

  /**
   * Эмитит ошибку старта image crop для заблокированного target.
   */
  private _emitLockedImageTargetError({ target }: { target: FabricImage }): void {
    this.editor.errorManager.emitError({
      origin: 'CropManager',
      method: 'startImageCrop',
      code: errorCodes.CROP_MANAGER.LOCKED_IMAGE_TARGET,
      message: 'Заблокированное изображение нельзя обрезать.',
      data: {
        targetType: target.type,
        targetId: target.id
      }
    })
  }
}
