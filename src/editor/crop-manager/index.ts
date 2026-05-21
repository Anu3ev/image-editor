import {
  FabricImage,
  Rect,
  type Canvas,
  type TPointerEvent,
  type TPointerEventInfo,
  type FabricObject
} from 'fabric'

import type { ImageEditor } from '../index'
import { errorCodes } from '../error-manager/error-codes'
import {
  clampCropFrameToSource,
  getSourceSize,
  resolveCropSize
} from './domain/crop-geometry'
import { createCropFrame } from './domain/crop-frame'
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
  CropObjectInteractivity,
  CropSession,
  CropSessionOptions,
  CropSize,
  CropState,
  StartCanvasCropOptions,
  StartImageCropOptions
} from './types'

/**
 * Поведение crop mode по умолчанию.
 */
const DEFAULT_CROP_SESSION_OPTIONS = {
  allowFrameOverflow: true,
  showGrid: true,
  cancelOnSelectionClear: true
} satisfies CropSessionOptions

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
   * Bound handler изменения crop frame.
   */
  private readonly _handleCropFrameChangedBound = (): void => {
    this._handleCropFrameChanged()
  }

  /**
   * Bound handler изменения active object во время crop mode.
   */
  private readonly _handleCanvasSelectionChangedBound = (): void => {
    this._handleCanvasSelectionChanged()
  }

  /**
   * Bound handler клика вне crop frame до стандартной Fabric selection-логики.
   */
  private readonly _handleCanvasMouseDownBeforeBound = (event: TPointerEventInfo<TPointerEvent>): void => {
    this._handleCanvasMouseDownBefore(event)
  }

  /**
   * @param options
   * @param options.editor - экземпляр редактора
   */
  constructor({ editor }: { editor: ImageEditor }) {
    this.editor = editor
    this._session = null
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

    return {
      mode: session.mode,
      frame: session.frame,
      options: session.options,
      target: session.target,
      rect: getCropSessionResultRect({ session })
    }
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
      interactivity: []
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
      interactivity: []
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
      cancelOnSelectionClear: options.cancelOnSelectionClear ?? DEFAULT_CROP_SESSION_OPTIONS.cancelOnSelectionClear
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
      showGrid: sessionOptions.showGrid
    })
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
    frame.on('moving', this._handleCropFrameChangedBound)
    frame.on('scaling', this._handleCropFrameChangedBound)
    frame.on('modified', this._handleCropFrameChangedBound)
  }

  /**
   * Отписывает crop frame от live-ограничений.
   */
  private _unbindCropFrameEvents({ frame }: { frame: Rect }): void {
    frame.off('moving', this._handleCropFrameChangedBound)
    frame.off('scaling', this._handleCropFrameChangedBound)
    frame.off('modified', this._handleCropFrameChangedBound)
  }

  /**
   * Подписывает canvas на потерю active crop frame, если это включено в session.
   */
  private _bindCanvasSelectionEvents({ session }: { session: CropSession }): void {
    if (!session.options.cancelOnSelectionClear) return

    this.editor.canvas.on('mouse:down:before', this._handleCanvasMouseDownBeforeBound)
    this.editor.canvas.on('selection:cleared', this._handleCanvasSelectionChangedBound)
    this.editor.canvas.on('selection:updated', this._handleCanvasSelectionChangedBound)
  }

  /**
   * Отписывает canvas от lifecycle-событий crop session.
   */
  private _unbindCanvasSelectionEvents(): void {
    this.editor.canvas.off('mouse:down:before', this._handleCanvasMouseDownBeforeBound)
    this.editor.canvas.off('selection:cleared', this._handleCanvasSelectionChangedBound)
    this.editor.canvas.off('selection:updated', this._handleCanvasSelectionChangedBound)
  }

  /**
   * Обрабатывает live-изменение crop frame.
   */
  private _handleCropFrameChanged(): void {
    const { _session: session } = this
    if (!session) return

    this._clampFrameIfNeeded({ session })
    this.editor.canvas.fire('editor:crop:changed', this.getState())
    this.editor.canvas.requestRenderAll()
  }

  /**
   * Отменяет crop mode, если crop frame перестал быть active object.
   */
  private _handleCanvasSelectionChanged(): void {
    const { _session: session } = this
    if (!session) return
    if (!session.options.cancelOnSelectionClear) return
    if (this.editor.canvas.getActiveObject() === session.frame) return

    this.cancel()
  }

  /**
   * Выходит из crop mode по клику вне frame и не даёт этому же клику выбрать другой объект.
   */
  private _handleCanvasMouseDownBefore({
    target
  }: TPointerEventInfo<TPointerEvent>): void {
    const { _session: session } = this
    if (!session) return
    if (!session.options.cancelOnSelectionClear) return
    if (target === session.frame) return

    const nextActiveObject = session.mode === 'image'
      ? session.target
      : null

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
  private _clampFrameIfNeeded({ session }: { session: CropSession }): void {
    if (session.options.allowFrameOverflow) return

    clampCropFrameToSource({
      source: session.source,
      frame: session.frame
    })
  }

  /**
   * Применяет активную crop session через mode-specific mutation path.
   */
  private _applySessionCrop({ session }: { session: CropSession }): CropApplyResult | null {
    const rect = getRoundedCropRect({
      rect: getCropSessionResultRect({ session })
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
