import {
  FabricImage,
  Point,
  Rect,
  type BasicTransformEvent,
  type Canvas,
  type FabricObject,
  type ModifiedEvent,
  type Transform,
  type TPointerEvent,
  type TPointerEventInfo
} from 'fabric'

import type { ImageEditor } from '../index'
import { errorCodes } from '../error-manager/error-codes'
import {
  clampCropFrameToSource,
  clampCropFrameToSourcePreservingAspectRatio,
  getCropRectInSource,
  getSourceSize,
  resolveCropSize
} from './domain/crop-geometry'
import {
  resolveCropProportionalSourceSnapPlan,
  type CropSourceScaleAnchor
} from './domain/crop-source-scale'
import {
  CropFrame,
  createCropFrame,
  setCropFrameActiveResizePreserveAspectRatio
} from './domain/crop-frame'
import {
  isCropFrameResizeTransform,
  resolveCropFrameResizePreserveAspectRatio
} from './domain/crop-resize-mode'
import {
  getCropSessionResultRect,
  getRoundedCropRect
} from './domain/crop-result'
import {
  applyCanvasCrop,
  applyImageCrop
} from './mutation/crop-apply'
import type {
  CropApplyResult,
  CropAspectRatio,
  CropFrameTransformState,
  CropObjectInteractivity,
  CropRect,
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
  cancelOnSelectionClear: true,
  preserveAspectRatio: true
} satisfies CropSessionOptions

/**
 * Допуск для live-проверки выхода frame за source.
 * Fabric может давать доли пикселя у frame, который визуально стоит на границе source.
 */
const SOURCE_BOUNDS_OVERFLOW_EPSILON = 0.5

/**
 * Допуск сравнения snap scale-plan с source-bound limit crop frame.
 */
const SOURCE_SCALE_PLAN_EPSILON = 0.000000001

/**
 * Source-зазор, в котором snap scale-plan уже считается дошедшим до source-boundary.
 */
const SOURCE_SCALE_PLAN_SNAP_GAP_PIXELS = 1

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
 * Scale, на котором proportional resize уже упёрся в source.
 */
type CropSourceBoundScale = {
  scaleX: number
  scaleY: number
}

/**
 * Source-границы resize, зафиксированные на старте Fabric transform.
 */
type CropSourceScaleBounds = {
  sourceSize: CropSize
  startRect: CropRect
}

/**
 * Fabric transform, который crop controls помечают при упоре proportional resize в source.
 */
type CropSourceBoundTransform = Transform & {
  cropSourceScaleBounds?: CropSourceScaleBounds | null
  cropSourceScaleClamped?: boolean
  cropSourceBoundScale?: CropSourceBoundScale | null
  cropSourceScaleAnchorX?: CropSourceScaleAnchor
  cropSourceScaleAnchorY?: CropSourceScaleAnchor
  cropSourceScalePreserveAspectRatio?: boolean
}

/**
 * Source-bound scale-plan, которым CropManager ограничивает snap без отключения направляющих.
 */
type CropSourceBoundScalePlan = {
  rect: CropRect
  scale: CropSourceBoundScale
  anchorX: CropSourceScaleAnchor
  anchorY: CropSourceScaleAnchor
}

/**
 * Событие live-изменения crop frame.
 */
type CropFrameChangeEvent = (
  BasicTransformEvent<TPointerEvent> | ModifiedEvent<TPointerEvent>
) & {
  transform?: CropSourceBoundTransform
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

    if (this._isSourceScaleClamped({ event })) {
      const preserveAspectRatio = event?.transform?.cropSourceScalePreserveAspectRatio

      return preserveAspectRatio ?? true
    }

    return resolveCropFrameResizePreserveAspectRatio({
      target: session.frame,
      shiftKey: event?.e?.shiftKey
    })
  }

  /** Возвращает true, если текущий live-step вынес crop frame за пределы source и будет зажат clamp-ом. */
  public isFrameOverflowingSource({ target }: { target?: FabricObject | null }): boolean {
    const { _session: session } = this
    if (!session || !target) return false
    if (session.options.allowFrameOverflow) return false

    if (session.frame !== target) return false

    const rect = getCropRectInSource({
      source: session.source,
      frame: session.frame
    })
    const sourceSize = getSourceSize({ source: session.source })
    const minLeft = (-sourceSize.width / 2) - SOURCE_BOUNDS_OVERFLOW_EPSILON
    const minTop = (-sourceSize.height / 2) - SOURCE_BOUNDS_OVERFLOW_EPSILON
    const maxRight = (sourceSize.width / 2) + SOURCE_BOUNDS_OVERFLOW_EPSILON
    const maxBottom = (sourceSize.height / 2) + SOURCE_BOUNDS_OVERFLOW_EPSILON

    return rect.left < minLeft
      || rect.top < minTop
      || rect.left + rect.width > maxRight
      || rect.top + rect.height > maxBottom
  }

  /** Возвращает true, если active crop frame уже зажат source-границей в текущем scale-step. */
  public isFrameSourceScaleClamped({
    target,
    transform
  }: {
    target?: FabricObject | null
    transform?: Transform | null
  }): boolean {
    const { _session: session } = this
    if (!session || !target || !transform) return false
    if (session.frame !== target) return false

    return (transform as CropSourceBoundTransform).cropSourceScaleClamped === true
  }

  /** Применяет source-bound версию snap scale-plan для active crop frame, если plan выходит за source. */
  public applyFrameSourceBoundScalePlan({
    target,
    transform,
    nextScaleX,
    nextScaleY
  }: {
    target?: FabricObject | null
    transform?: Transform | null
    nextScaleX: number | null
    nextScaleY: number | null
  }): boolean {
    const { _session: session } = this
    if (!session || !target || !transform) return false
    if (session.frame !== target) return false

    const sourcePlan = this._resolveSourceBoundScalePlan({
      target,
      transform: transform as CropSourceBoundTransform,
      nextScaleX,
      nextScaleY
    })
    if (!sourcePlan) return false

    this._markSourceBoundScalePlan({
      transform: transform as CropSourceBoundTransform,
      plan: sourcePlan
    })
    this._applyFrameTransformState({
      session,
      state: this._getFrameTransformStateFromSourceRect({
        session,
        rect: sourcePlan.rect,
        scale: sourcePlan.scale
      })
    })

    return true
  }

  /** Восстанавливает fixed source anchor active crop frame после generic snap/pixel-grid. */
  public restoreFrameScaleAnchorAfterSnap({
    target,
    transform
  }: {
    target?: FabricObject | null
    transform?: Transform | null
  }): boolean {
    const { _session: session } = this
    if (!session || !target || !transform) return false
    if (session.frame !== target) return false

    return this._restoreFrameScaleAnchorFromTransform({
      session,
      transform: transform as CropSourceBoundTransform
    })
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
   * Обновляет crop frame по заданной пропорции.
   */
  public setAspectRatio({ aspectRatio }: { aspectRatio: CropAspectRatio | null }): CropState | null {
    const { _session: session } = this
    if (!session) return null

    const sourceSize = getSourceSize({ source: session.source })
    const nextSize = resolveCropSize({
      sourceSize,
      aspectRatio: aspectRatio ?? undefined,
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
   * Сбрасывает активный crop frame к полному размеру source.
   */
  public resetFrameToSource({ target }: { target?: FabricObject | null }): CropState | null {
    const { _session: session } = this
    if (!session || session.frame !== target) return null

    const sourceSize = getSourceSize({ source: session.source })

    this._applyFrameSize({
      session,
      size: sourceSize
    })

    return this.getState()
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
  }): Rect {
    const sourceSize = getSourceSize({ source })
    const cropSize = resolveCropSize({
      sourceSize,
      size: options.size,
      aspectRatio: options.aspectRatio,
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
    this._bindCropFrameEvents({ frame: session.frame })

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

    const restoredSourceBoundFrame = this._restoreSourceBoundFrameIfNeeded({
      session,
      event
    })

    this._clampFrameIfNeeded({
      session,
      preserveAspectRatio: session.effectivePreserveAspectRatio
    })
    this._restoreFrameScaleAnchorFromEventIfNeeded({
      session,
      event
    })
    if (!restoredSourceBoundFrame) {
      this._rememberSourceBoundFrameIfNeeded({
        session,
        event
      })
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
   * Восстанавливает frame, если текущий resize уже упёрся в source.
   */
  private _restoreSourceBoundFrameIfNeeded({
    session,
    event
  }: {
    session: CropSession
    event?: CropFrameChangeEvent
  }): boolean {
    if (!this._isSourceScaleClamped({ event })) {
      session.sourceBoundFrameState = null
      return false
    }

    const state = this._getSourceBoundFrameStateFromEvent({
      session,
      event
    }) ?? session.sourceBoundFrameState
    if (!state) return false

    this._applyFrameTransformState({
      session,
      state
    })

    return true
  }

  /**
   * Возвращает frame state из текущего source-bound transform.
   */
  private _getSourceBoundFrameStateFromEvent({
    session,
    event
  }: {
    session: CropSession
    event?: CropFrameChangeEvent
  }): CropFrameTransformState | null {
    const scale = event?.transform?.cropSourceBoundScale
    if (!scale) return null
    if (!Number.isFinite(scale.scaleX) || !Number.isFinite(scale.scaleY)) return null

    const sourceRect = this._getSourceBoundRectFromEvent({ event })
    if (sourceRect) {
      return this._getFrameTransformStateFromSourceRect({
        session,
        rect: sourceRect,
        scale
      })
    }

    return {
      left: session.frame.left,
      top: session.frame.top,
      scaleX: scale.scaleX,
      scaleY: scale.scaleY
    }
  }

  /**
   * Возвращает source-rect для текущего source-bound transform.
   */
  private _getSourceBoundRectFromEvent({
    event
  }: {
    event?: CropFrameChangeEvent
  }): CropRect | null {
    const transform = event?.transform
    const scale = transform?.cropSourceBoundScale
    const bounds = transform?.cropSourceScaleBounds
    const originalScaleX = transform?.original?.scaleX
    const originalScaleY = transform?.original?.scaleY

    if (!scale || !bounds) return null
    if (typeof originalScaleX !== 'number' || typeof originalScaleY !== 'number') return null
    if (!Number.isFinite(originalScaleX) || !Number.isFinite(originalScaleY)) return null
    if (originalScaleX === 0 || originalScaleY === 0) return null

    return this._getAnchoredSourceBoundRectFromEvent({
      event,
      size: {
        width: bounds.startRect.width * Math.abs(scale.scaleX / originalScaleX),
        height: bounds.startRect.height * Math.abs(scale.scaleY / originalScaleY)
      }
    })
  }

  /**
   * Восстанавливает fixed source anchor из текущего Fabric event.
   */
  private _restoreFrameScaleAnchorFromEventIfNeeded({
    session,
    event
  }: {
    session: CropSession
    event?: CropFrameChangeEvent
  }): boolean {
    const { transform } = event ?? {}
    if (!transform) return false

    return this._restoreFrameScaleAnchorFromTransform({
      session,
      transform
    })
  }

  /**
   * Восстанавливает fixed source anchor по стартовым bounds текущего transform.
   */
  private _restoreFrameScaleAnchorFromTransform({
    session,
    transform
  }: {
    session: CropSession
    transform: CropSourceBoundTransform
  }): boolean {
    const currentRect = getCropSessionResultRect({ session })
    const rect = this._getAnchoredSourceBoundRectFromTransform({
      transform,
      size: {
        width: currentRect.width,
        height: currentRect.height
      }
    })
    if (!rect) return false

    this._applyFrameTransformState({
      session,
      state: this._getFrameTransformStateFromSourceRect({
        session,
        rect,
        scale: {
          scaleX: session.frame.scaleX ?? 1,
          scaleY: session.frame.scaleY ?? 1
        }
      })
    })

    return true
  }

  /**
   * Возвращает source-rect заданного размера с учётом fixed anchor текущего transform.
   */
  private _getAnchoredSourceBoundRectFromEvent({
    event,
    size
  }: {
    event?: CropFrameChangeEvent
    size: CropSize
  }): CropRect | null {
    const { transform } = event ?? {}
    if (!transform) return null

    return this._getAnchoredSourceBoundRectFromTransform({
      transform,
      size
    })
  }

  /**
   * Возвращает source-rect заданного размера по fixed anchor текущего transform.
   */
  private _getAnchoredSourceBoundRectFromTransform({
    transform,
    size
  }: {
    transform: CropSourceBoundTransform
    size: CropSize
  }): CropRect | null {
    const { cropSourceScaleBounds: bounds } = transform
    if (!bounds) return null

    return this._getAnchoredSourceBoundRect({
      bounds,
      size,
      anchorX: transform.cropSourceScaleAnchorX ?? this._getTransformAnchorX({ transform }),
      anchorY: transform.cropSourceScaleAnchorY ?? this._getTransformAnchorY({ transform })
    })
  }

  /**
   * Возвращает source-rect заданного размера с учётом fixed anchors.
   */
  private _getAnchoredSourceBoundRect({
    bounds,
    size,
    anchorX,
    anchorY
  }: {
    bounds: CropSourceScaleBounds
    size: CropSize
    anchorX: CropSourceScaleAnchor
    anchorY: CropSourceScaleAnchor
  }): CropRect {
    return {
      left: this._resolveAnchoredSourceBoundStart({
        start: bounds.startRect.left,
        length: bounds.startRect.width,
        nextLength: size.width,
        anchor: anchorX
      }),
      top: this._resolveAnchoredSourceBoundStart({
        start: bounds.startRect.top,
        length: bounds.startRect.height,
        nextLength: size.height,
        anchor: anchorY
      }),
      width: size.width,
      height: size.height
    }
  }

  /**
   * Возвращает frame geometry, материализованную из source-rect.
   */
  private _getFrameTransformStateFromSourceRect({
    session,
    rect,
    scale
  }: {
    session: CropSession
    rect: CropRect
    scale: CropSourceBoundScale
  }): CropFrameTransformState {
    const center = new Point(
      rect.left + (rect.width / 2),
      rect.top + (rect.height / 2)
    ).transform(session.source.calcTransformMatrix())
    const position = session.frame.translateToOriginPoint(
      center,
      session.frame.originX,
      session.frame.originY
    )

    return {
      left: position.x,
      top: position.y,
      scaleX: scale.scaleX,
      scaleY: scale.scaleY
    }
  }

  /**
   * Возвращает start координату source-bound rect с учётом fixed anchor.
   */
  private _resolveAnchoredSourceBoundStart({
    start,
    length,
    nextLength,
    anchor
  }: {
    start: number
    length: number
    nextLength: number
    anchor: CropSourceScaleAnchor
  }): number {
    if (anchor === 'min') return start
    if (anchor === 'max') return start + length - nextLength

    return start + ((length - nextLength) / 2)
  }

  /**
   * Запоминает первую frame geometry, на которой resize упёрся в source.
   */
  private _rememberSourceBoundFrameIfNeeded({
    session,
    event
  }: {
    session: CropSession
    event?: CropFrameChangeEvent
  }): void {
    if (!this._isSourceScaleClamped({ event })) {
      session.sourceBoundFrameState = null
      return
    }

    session.sourceBoundFrameState = this._getFrameTransformState({ session })
  }

  /**
   * Возвращает true, если текущий transform зажат source-границей.
   */
  private _isSourceScaleClamped({
    event
  }: {
    event?: CropResizeModeEvent
  }): boolean {
    return event?.transform?.cropSourceScaleClamped === true
  }

  /**
   * Возвращает source-bound версию snap scale-plan или null, если plan остаётся внутри source.
   */
  private _resolveSourceBoundScalePlan({
    target,
    transform,
    nextScaleX,
    nextScaleY
  }: {
    target: FabricObject
    transform: CropSourceBoundTransform
    nextScaleX: number | null
    nextScaleY: number | null
  }): CropSourceBoundScalePlan | null {
    const { cropSourceScaleBounds: bounds } = transform
    const originalScaleX = transform.original?.scaleX
    const originalScaleY = transform.original?.scaleY
    if (!bounds) return null
    if (typeof originalScaleX !== 'number' || typeof originalScaleY !== 'number') return null
    if (originalScaleX === 0 || originalScaleY === 0) return null

    const scaleX = nextScaleX ?? target.scaleX ?? originalScaleX
    const scaleY = nextScaleY ?? target.scaleY ?? originalScaleY
    if (!Number.isFinite(scaleX) || !Number.isFinite(scaleY)) return null

    const anchorX = transform.cropSourceScaleAnchorX ?? this._getTransformAnchorX({ transform })
    const anchorY = transform.cropSourceScaleAnchorY ?? this._getTransformAnchorY({ transform })
    const sourcePlan = resolveCropProportionalSourceSnapPlan({
      sourceSize: bounds.sourceSize,
      startRect: bounds.startRect,
      anchorX,
      anchorY
    })
    if (!sourcePlan) return null

    const proposedScale = Math.max(
      Math.abs(scaleX / originalScaleX),
      Math.abs(scaleY / originalScaleY)
    )
    const sourceScaleGap = Math.max(0, sourcePlan.scale - proposedScale)
      * Math.min(bounds.startRect.width, bounds.startRect.height)

    if (
      proposedScale <= sourcePlan.scale + SOURCE_SCALE_PLAN_EPSILON
      && sourceScaleGap > SOURCE_SCALE_PLAN_SNAP_GAP_PIXELS
    ) return null

    const sourceBoundScale = {
      scaleX: originalScaleX * sourcePlan.scale,
      scaleY: originalScaleY * sourcePlan.scale
    }

    return {
      anchorX,
      anchorY,
      rect: sourcePlan.rect,
      scale: sourceBoundScale
    }
  }

  /**
   * Помечает Fabric transform как source-bound после ограничения snap scale-plan.
   */
  private _markSourceBoundScalePlan({
    transform,
    plan
  }: {
    transform: CropSourceBoundTransform
    plan: CropSourceBoundScalePlan
  }): void {
    transform.cropSourceScaleClamped = true
    transform.cropSourceScalePreserveAspectRatio = true
    transform.cropSourceScaleAnchorX = plan.anchorX
    transform.cropSourceScaleAnchorY = plan.anchorY
    transform.cropSourceBoundScale = plan.scale
    transform.scaleX = plan.scale.scaleX
    transform.scaleY = plan.scale.scaleY
  }

  /**
   * Возвращает fixed source anchor по горизонтали для Fabric transform.
   */
  private _getTransformAnchorX({ transform }: { transform: Transform }): CropSourceScaleAnchor {
    if (transform.corner === 'tl' || transform.corner === 'bl' || transform.corner === 'ml') {
      return 'max'
    }
    if (transform.corner === 'tr' || transform.corner === 'br' || transform.corner === 'mr') {
      return 'min'
    }

    if (transform.originX === 'left' || transform.originX === 0) return 'min'
    if (transform.originX === 'right' || transform.originX === 1) return 'max'

    return 'center'
  }

  /**
   * Возвращает fixed source anchor по вертикали для Fabric transform.
   */
  private _getTransformAnchorY({ transform }: { transform: Transform }): CropSourceScaleAnchor {
    if (transform.corner === 'tl' || transform.corner === 'tr' || transform.corner === 'mt') {
      return 'max'
    }
    if (transform.corner === 'bl' || transform.corner === 'br' || transform.corner === 'mb') {
      return 'min'
    }

    if (transform.originY === 'top' || transform.originY === 0) return 'min'
    if (transform.originY === 'bottom' || transform.originY === 1) return 'max'

    return 'center'
  }

  /**
   * Возвращает geometry crop frame, достаточную для восстановления live resize.
   */
  private _getFrameTransformState({ session }: { session: CropSession }): CropFrameTransformState {
    return {
      left: session.frame.left,
      top: session.frame.top,
      scaleX: session.frame.scaleX ?? 1,
      scaleY: session.frame.scaleY ?? 1
    }
  }

  /**
   * Восстанавливает geometry crop frame внутри текущей live resize-сессии.
   */
  private _applyFrameTransformState({
    session,
    state
  }: {
    session: CropSession
    state: CropFrameTransformState
  }): void {
    session.frame.set({
      left: state.left,
      top: state.top,
      scaleX: state.scaleX,
      scaleY: state.scaleY
    })
    session.frame.setCoords()
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
   * Завершает crop session и восстанавливает обычную интерактивность.
   */
  private _finishSession({
    nextActiveObject
  }: {
    nextActiveObject: FabricObject | null
  }): void {
    const { _session: session } = this
    if (!session) return

    this._unbindCropFrameEvents({ frame: session.frame })
    this._unbindCanvasSelectionEvents()
    this.editor.canvas.remove(session.frame)
    this._restoreSceneObjects({ interactivity: session.interactivity })
    this.editor.historyManager.resumeHistory()
    this._activeResizePreserveAspectRatio = null
    this._session = null
    this._restoreActiveObject({ object: nextActiveObject })
    this.editor.toolbar.showAfterTemporary()
    this.editor.canvas.requestRenderAll()
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
