import {
  BasicTransformEvent,
  Canvas,
  FabricObject,
  Textbox,
  Transform,
  TPointerEvent,
  TPointerEventInfo
} from 'fabric'

import { ImageEditor } from '..'
import {
  GUIDE_COLOR,
  GUIDE_WIDTH,
  SNAP_THRESHOLD,
  SPACING_CONTEXT_SWITCH_DISTANCE,
  SPACING_SNAP_HOLD_MARGIN
} from './constants'
import {
  calculateSnap,
  calculateSpacingSnap,
  type SpacingContextByAxis
} from './calculations'
import { drawSpacingGuide } from './renderer'
import {
  applyMovementStep,
  applyScalingStep,
  shouldApplyPixelScalingStep
} from './pixel-grid'
import {
  resolveScaleAxisSnaps,
  resolveScaleUpdatePlan,
  resolveScalingAxisState,
  resolveScalingTransformState,
  resolveTextResizeSnapPlan,
  shouldUseUniformScaleSnap,
  type ScaleUpdatePlan
} from './scaling'
import type {
  AnchorBuckets,
  Bounds,
  GuideBounds,
  GuideLine,
  SpacingGuide,
  SpacingPattern
} from './types'
import {
  buildSpacingPatterns,
  pushBoundsToAnchors
} from './utils'
import { getObjectBounds } from '../utils/geometry'
import {
  collectExcludedObjects,
  shouldIgnoreObject
} from '../utils/object-filter'

type TransformEvent = BasicTransformEvent<TPointerEvent> & {
  target?: FabricObject | null
  e?: TPointerEvent | null
}

type MouseEventInfo = TPointerEventInfo<TPointerEvent> & {
  target?: FabricObject | null
}

/**
 * Менеджер отвечает за отображение направляющих и прилипающее выравнивание объектов.
 */
export default class SnappingManager {
  /**
   * Инстанс редактора.
   */
  public editor: ImageEditor

  /**
   * Канвас редактора.
   */
  public canvas: Canvas

  /**
   * Кешированные линии для привязки.
   */
  private anchors: AnchorBuckets = { vertical: [], horizontal: [] }

  /**
   * Кешированные интервалы между объектами.
   */
  private spacingPatterns: { vertical: SpacingPattern[]; horizontal: SpacingPattern[] } = {
    vertical: [],
    horizontal: []
  }

  /**
   * Сохраненный контекст равноудалённого прилипания по осям.
   */
  private spacingContexts: SpacingContextByAxis = {
    vertical: null,
    horizontal: null
  }

  /**
   * Кешированные границы доступных объектов.
   */
  private cachedTargetBounds: Bounds[] = []

  /**
   * Текущие направляющие для отрисовки.
   */
  private activeGuides: GuideLine[] = []

  /**
   * Текущие направляющие интервалов для отрисовки.
   */
  private activeSpacingGuides: SpacingGuide[] = []

  /**
   * Границы, в пределах которых рисуются направляющие.
   */
  private guideBounds: GuideBounds | null = null

  /**
   * Обработчик начала перетаскивания объекта.
   */
  private _onMouseDown: (event: MouseEventInfo) => void

  /**
   * Обработчик перемещения объекта.
   */
  private _onObjectMoving: (event: TransformEvent) => void

  /**
   * Обработчик масштабирования объекта.
   */
  private _onObjectScaling: (event: TransformEvent) => void

  /**
   * Обработчик завершения перетаскивания.
   */
  private _onMouseUp: () => void

  /**
   * Обработчик очистки перед рендером.
   */
  private _onBeforeRender: () => void

  /**
   * Обработчик отрисовки направляющих после рендера.
   */
  private _onAfterRender: () => void

  /**
   * Создаёт менеджер прилипания и инициализирует слушатели событий.
   */
  constructor({ editor }: { editor: ImageEditor }) {
    this.editor = editor
    const { canvas } = editor
    this.canvas = canvas

    this._onMouseDown = this._handleMouseDown.bind(this)
    this._onObjectMoving = this._handleObjectMoving.bind(this)
    this._onObjectScaling = this._handleObjectScaling.bind(this)
    this._onMouseUp = this._handleMouseUp.bind(this)
    this._onBeforeRender = this._handleBeforeRender.bind(this)
    this._onAfterRender = this._handleAfterRender.bind(this)

    this._bindEvents()
  }

  /**
   * Удаляет слушатели и очищает временные данные.
   */
  public destroy(): void {
    this._unbindEvents()
    this._clearGuides()
    this._clearAnchors()
  }

  /**
   * Навешивает обработчики событий канваса.
   */
  private _bindEvents(): void {
    const { canvas } = this
    canvas.on('mouse:down', this._onMouseDown)
    canvas.on('object:moving', this._onObjectMoving)
    canvas.on('object:scaling', this._onObjectScaling)
    canvas.on('mouse:up', this._onMouseUp)
    canvas.on('before:render', this._onBeforeRender)
    canvas.on('after:render', this._onAfterRender)
  }

  /**
   * Удаляет обработчики событий канваса.
   */
  private _unbindEvents(): void {
    const { canvas } = this
    canvas.off('mouse:down', this._onMouseDown)
    canvas.off('object:moving', this._onObjectMoving)
    canvas.off('object:scaling', this._onObjectScaling)
    canvas.off('mouse:up', this._onMouseUp)
    canvas.off('before:render', this._onBeforeRender)
    canvas.off('after:render', this._onAfterRender)
  }

  /**
   * Кеширует набор опорных линий в момент начала перетаскивания.
   */
  private _handleMouseDown(event: MouseEventInfo): void {
    const { target } = event
    this._clearSpacingContexts()

    if (!target) {
      this._clearAnchors()
      return
    }

    this._cacheAnchors({ activeObject: target })
  }

  /**
   * Выполняет привязку объекта к ближайшим линиям при его перемещении.
   */
  private _handleObjectMoving(event: TransformEvent): void {
    const { target, transform } = event

    if (!target) {
      this._clearSpacingContexts()
      this._clearGuides()
      return
    }

    if (this._shouldAbortObjectMoving({ target, event })) {
      return
    }

    applyMovementStep({
      target,
      transform
    })

    if (!this.anchors.vertical.length && !this.anchors.horizontal.length) {
      this._cacheAnchors({ activeObject: target })
    }

    let activeBounds = getObjectBounds({ object: target })
    if (!activeBounds) {
      this._clearSpacingContexts()
      this._clearGuides()
      return
    }

    const threshold = SNAP_THRESHOLD / (this.canvas.getZoom() || 1)
    const snapResult = calculateSnap({
      activeBounds,
      threshold,
      anchors: this.anchors
    })
    activeBounds = this._applyMovementDelta({
      target,
      activeBounds,
      deltaX: snapResult.deltaX,
      deltaY: snapResult.deltaY
    })

    const candidateBounds = this._resolveCurrentTargetBounds({ activeObject: target })
    const spacingResult = this._calculateSpacingResult({
      activeBounds,
      candidateBounds,
      threshold
    })
    this.spacingContexts = spacingResult.contexts

    const hasSpacingSnap = spacingResult.deltaX !== 0 || spacingResult.deltaY !== 0
    activeBounds = this._applyMovementDelta({
      target,
      activeBounds,
      deltaX: spacingResult.deltaX,
      deltaY: spacingResult.deltaY
    })

    if (!hasSpacingSnap) {
      applyMovementStep({
        target,
        transform
      })
    }

    const finalBounds = getObjectBounds({ object: target }) ?? activeBounds
    this._applyMovementVisualGuides({
      activeBounds: finalBounds,
      candidateBounds,
      threshold
    })
  }

  /**
   * Выполняет привязку объекта к ближайшим линиям при его масштабировании.
   */
  private _handleObjectScaling(event: TransformEvent): void {
    const { target, transform } = event

    if (!target || !transform) {
      this._clearGuides()
      return
    }

    const canApplyPixelScalingStep = shouldApplyPixelScalingStep({
      target
    })
    if (this._shouldAbortObjectScaling({
      target,
      transform,
      event,
      canApplyPixelScalingStep
    })) {
      this._clearGuides()
      return
    }

    const {
      shouldSnapX,
      shouldSnapY,
      isCornerHandle
    } = resolveScalingAxisState({ transform })

    if (!shouldSnapX && !shouldSnapY) {
      this._clearGuides()
      return
    }

    const { anchors } = this
    const {
      vertical: verticalAnchors,
      horizontal: horizontalAnchors
    } = anchors
    if (!verticalAnchors.length && !horizontalAnchors.length) {
      this._cacheAnchors({ activeObject: target })
    }

    const activeBounds = getObjectBounds({ object: target })
    if (!activeBounds) {
      this._clearGuides()
      return
    }

    const threshold = SNAP_THRESHOLD / (this.canvas.getZoom() || 1)
    const {
      originX,
      originY,
      scaleX,
      scaleY
    } = resolveScalingTransformState({ target, transform })
    const snapState = resolveScaleAxisSnaps({
      bounds: activeBounds,
      originX,
      originY,
      shouldSnapX,
      shouldSnapY,
      threshold,
      anchors: this.anchors
    })

    if (!snapState) {
      this._clearGuides()
      return
    }

    const shouldUseUniformScale = shouldUseUniformScaleSnap({
      target,
      event,
      isCornerHandle
    })
    const scalePlan = resolveScaleUpdatePlan({
      target,
      bounds: activeBounds,
      originX,
      originY,
      scaleX,
      scaleY,
      shouldUseUniformScaleSnap: shouldUseUniformScale,
      verticalSnap: snapState.verticalSnap,
      horizontalSnap: snapState.horizontalSnap
    })

    if (!scalePlan) {
      this._clearGuides()
      return
    }

    this._applyScaleUpdatePlan({
      target,
      transform,
      originX,
      originY,
      plan: scalePlan
    })

    if (canApplyPixelScalingStep) {
      applyScalingStep({ target, transform })
    }

    this._applyGuides({
      guides: scalePlan.guides,
      spacingGuides: []
    })
  }

  /** Возвращает true, если движение нужно прервать до расчёта направляющих. */
  private _shouldAbortObjectMoving({
    target,
    event
  }: {
    target: FabricObject
    event: TransformEvent
  }): boolean {
    if (event.e?.ctrlKey) {
      this._clearSpacingContexts()
      this._clearGuides()
      return true
    }

    return this._shouldHideOverflowingCropFrameGuides({
      target,
      clearSpacingContexts: true
    })
  }

  /** Возвращает true, если scaling нужно прервать до расчёта направляющих. */
  private _shouldAbortObjectScaling({
    target,
    transform,
    event,
    canApplyPixelScalingStep
  }: {
    target: FabricObject
    transform: Transform
    event: TransformEvent
    canApplyPixelScalingStep: boolean
  }): boolean {
    if (event.e?.ctrlKey) {
      this._clearGuides()
      if (canApplyPixelScalingStep) {
        applyScalingStep({ target, transform })
      }
      return true
    }

    if (canApplyPixelScalingStep) {
      applyScalingStep({ target, transform })
    }

    return this._shouldHideOverflowingCropFrameGuides({ target })
  }

  /** Скрывает направляющие для crop frame, если текущий шаг уже вышел за source и будет зажат clamp-ом. */
  private _shouldHideOverflowingCropFrameGuides({
    target,
    clearSpacingContexts = false
  }: {
    target: FabricObject
    clearSpacingContexts?: boolean
  }): boolean {
    if (!this.editor.cropManager.isFrameOverflowingSource({ target })) return false

    if (clearSpacingContexts) {
      this._clearSpacingContexts()
    }

    this._clearGuides()

    return true
  }

  /** Применяет сдвиг объекта и возвращает его актуальные bounds. */
  private _applyMovementDelta({
    target,
    activeBounds,
    deltaX,
    deltaY
  }: {
    target: FabricObject
    activeBounds: Bounds
    deltaX: number
    deltaY: number
  }): Bounds {
    if (deltaX === 0 && deltaY === 0) return activeBounds

    const { left = 0, top = 0 } = target
    target.set({
      left: left + deltaX,
      top: top + deltaY
    })
    target.setCoords()

    return getObjectBounds({ object: target }) ?? activeBounds
  }

  /** Рассчитывает snap по равноудалённым интервалам для текущего состояния moving. */
  private _calculateSpacingResult({
    activeBounds,
    candidateBounds,
    threshold
  }: {
    activeBounds: Bounds
    candidateBounds: Bounds[]
    threshold: number
  }) {
    const hasActiveSpacingContext = Boolean(
      this.spacingContexts.vertical || this.spacingContexts.horizontal
    )
    const spacingThreshold = hasActiveSpacingContext
      ? (SNAP_THRESHOLD + SPACING_SNAP_HOLD_MARGIN) / (this.canvas.getZoom() || 1)
      : threshold

    return calculateSpacingSnap({
      activeBounds,
      candidates: candidateBounds,
      threshold: spacingThreshold,
      spacingPatterns: this.spacingPatterns,
      previousContexts: this.spacingContexts,
      switchDistance: SPACING_CONTEXT_SWITCH_DISTANCE
    })
  }

  /** Пересчитывает и показывает финальные moving-guides по уже скорректированным bounds. */
  private _applyMovementVisualGuides({
    activeBounds,
    candidateBounds,
    threshold
  }: {
    activeBounds: Bounds
    candidateBounds: Bounds[]
    threshold: number
  }): void {
    const visualSnapResult = calculateSnap({
      activeBounds,
      threshold,
      anchors: this.anchors
    })
    const visualSpacingResult = calculateSpacingSnap({
      activeBounds,
      candidates: candidateBounds,
      threshold,
      spacingPatterns: this.spacingPatterns,
      previousContexts: this.spacingContexts,
      switchDistance: SPACING_CONTEXT_SWITCH_DISTANCE
    })
    this.spacingContexts = visualSpacingResult.contexts

    const isSpacingPositionExact = visualSpacingResult.deltaX === 0
      && visualSpacingResult.deltaY === 0

    this._applyGuides({
      guides: visualSnapResult.guides,
      spacingGuides: isSpacingPositionExact ? visualSpacingResult.guides : []
    })
  }

  /** Применяет рассчитанные scale-обновления к target и текущему Fabric transform. */
  private _applyScaleUpdatePlan({
    target,
    transform,
    originX,
    originY,
    plan
  }: {
    target: FabricObject
    transform: Transform
    originX: Transform['originX']
    originY: Transform['originY']
    plan: ScaleUpdatePlan
  }): void {
    const {
      nextScaleX,
      nextScaleY
    } = plan

    if (nextScaleX === null && nextScaleY === null) return

    const anchorPlacement = this.editor.canvasManager.getObjectPlacement({
      object: target,
      originX,
      originY
    })
    const updates: Partial<FabricObject> = {}

    if (nextScaleX !== null) {
      updates.scaleX = nextScaleX
      transform.scaleX = nextScaleX
    }

    if (nextScaleY !== null) {
      updates.scaleY = nextScaleY
      transform.scaleY = nextScaleY
    }

    target.set(updates)
    this.editor.canvasManager.applyObjectPlacement({
      object: target,
      placement: anchorPlacement
    })
    target.setCoords()
  }

  /**
   * Применяет прилипания при горизонтальном ресайзе текстового объекта.
   */
  public applyTextResizingSnap({
    target,
    transform,
    event
  }: {
    target?: FabricObject | null
    transform?: Transform | null
    event?: TPointerEvent | null
  }): void {
    if (!target || !(target instanceof Textbox)) return

    if (!transform) {
      this._clearGuides()
      return
    }

    const isCtrlPressed = Boolean(event?.ctrlKey)
    if (isCtrlPressed) {
      this._clearGuides()
      return
    }

    const { corner = '' } = transform
    const isHorizontalHandle = corner === 'ml' || corner === 'mr'
    if (!isHorizontalHandle) {
      this._clearGuides()
      return
    }

    const { anchors } = this
    const {
      vertical: verticalAnchors,
      horizontal: horizontalAnchors
    } = anchors
    if (!verticalAnchors.length && !horizontalAnchors.length) {
      this._cacheAnchors({ activeObject: target })
    }

    const activeBounds = getObjectBounds({ object: target })
    if (!activeBounds) {
      this._clearGuides()
      return
    }

    const { canvas } = this
    const zoom = canvas.getZoom() || 1
    const threshold = SNAP_THRESHOLD / zoom

    const { originX: transformOriginX, originY: transformOriginY } = transform
    const {
      originX: targetOriginX = 'left',
      originY: targetOriginY = 'top'
    } = target
    const originX = transformOriginX ?? targetOriginX
    const originY = transformOriginY ?? targetOriginY

    const snapPlan = resolveTextResizeSnapPlan({
      target,
      bounds: activeBounds,
      originX,
      verticalAnchors,
      threshold
    })

    if (!snapPlan) {
      this._clearGuides()
      return
    }

    const { guide, nextWidth } = snapPlan
    const { width: currentWidth = 0 } = target
    if (nextWidth !== currentWidth) {
      const anchorPlacement = this.editor.canvasManager.getObjectPlacement({
        object: target,
        originX,
        originY
      })

      target.set({ width: nextWidth })
      this.editor.canvasManager.applyObjectPlacement({
        object: target,
        placement: anchorPlacement
      })
    }

    this._applyGuides({
      guides: [guide],
      spacingGuides: []
    })
  }

  /**
   * Очищает направляющие и кеш после окончания перетаскивания.
   */
  private _handleMouseUp(): void {
    this._clearGuides()
    this._clearAnchors()
  }

  /**
   * Очищает вспомогательный слой перед рендером.
   */
  private _handleBeforeRender(): void {
    const { canvas } = this
    const { contextTop } = canvas

    if (contextTop) {
      canvas.clearContext(contextTop)
    }
  }

  /**
   * Отрисовывает активные направляющие после рендера канваса.
   */
  private _handleAfterRender(): void {
    if (!this.activeGuides.length && !this.activeSpacingGuides.length) return

    const { canvas, guideBounds: cachedGuideBounds } = this
    const context = canvas.getSelectionContext()

    if (!context) return

    const bounds = cachedGuideBounds ?? this._calculateViewportBounds()
    const { left, right, top, bottom } = bounds
    const { viewportTransform } = canvas
    const zoom = canvas.getZoom() || 1

    context.save()
    if (Array.isArray(viewportTransform)) {
      context.transform(...viewportTransform)
    }
    context.lineWidth = GUIDE_WIDTH / zoom
    context.strokeStyle = GUIDE_COLOR
    context.setLineDash([4, 4])

    for (const guide of this.activeGuides) {
      context.beginPath()
      if (guide.type === 'vertical') {
        context.moveTo(guide.position, top)
        context.lineTo(guide.position, bottom)
      } else {
        context.moveTo(left, guide.position)
        context.lineTo(right, guide.position)
      }
      context.stroke()
    }

    for (const spacingGuide of this.activeSpacingGuides) {
      drawSpacingGuide({
        context,
        guide: spacingGuide,
        zoom
      })
    }

    context.restore()
  }

  /**
   * Применяет найденные направляющие или очищает их, если ничего нет.
   */
  private _applyGuides({
    guides,
    spacingGuides
  }: {
    guides: GuideLine[]
    spacingGuides: SpacingGuide[]
  }): void {
    if (!guides.length && !spacingGuides.length) {
      this._clearGuides()
      return
    }

    this.activeGuides = guides
    this.activeSpacingGuides = spacingGuides
    this.canvas.requestRenderAll()
  }

  /**
   * Сбрасывает все активные направляющие и инициирует перерисовку.
   */
  private _clearGuides(): void {
    if (!this.activeGuides.length && !this.activeSpacingGuides.length) return

    this.activeGuides = []
    this.activeSpacingGuides = []
    this.canvas.requestRenderAll()
  }

  /**
   * Обнуляет кеш опорных линий.
   */
  private _clearAnchors(): void {
    this.anchors = { vertical: [], horizontal: [] }
    this.spacingPatterns = { vertical: [], horizontal: [] }
    this.cachedTargetBounds = []
    this._clearSpacingContexts()
  }

  /**
   * Сбрасывает сохраненный контекст выбора равноудалённых направляющих.
   */
  private _clearSpacingContexts(): void {
    this.spacingContexts = {
      vertical: null,
      horizontal: null
    }
  }

  /**
   * Сохраняет линии для прилипания от всех доступных объектов и монтажной области.
   */
  private _cacheAnchors({ activeObject }: { activeObject?: FabricObject | null }): void {
    const targets = this._collectTargets({ activeObject })
    const nextAnchors: AnchorBuckets = { vertical: [], horizontal: [] }
    const targetBounds: Bounds[] = []

    for (const object of targets) {
      const bounds = getObjectBounds({ object })
      if (!bounds) continue
      pushBoundsToAnchors({ anchors: nextAnchors, bounds })
      targetBounds.push(bounds)
    }

    const { montageArea } = this.editor
    const montageBounds = getObjectBounds({ object: montageArea })

    if (montageBounds) {
      pushBoundsToAnchors({ anchors: nextAnchors, bounds: montageBounds })
      const { left, right, top, bottom } = montageBounds
      this.guideBounds = {
        left,
        right,
        top,
        bottom
      }
    } else {
      this.guideBounds = this._calculateViewportBounds()
    }

    this.anchors = nextAnchors
    this.spacingPatterns = buildSpacingPatterns({ bounds: targetBounds })
    this.cachedTargetBounds = targetBounds
  }

  /**
   * Собирает объекты, подходящие для прилипания, исключая активный объект и запрещённые id.
   */
  private _collectTargets({ activeObject }: { activeObject?: FabricObject | null }): FabricObject[] {
    const excluded = collectExcludedObjects({ activeObject })
    const targets: FabricObject[] = []

    this.canvas.forEachObject((object) => {
      if (shouldIgnoreObject({ object, excluded })) return
      targets.push(object)
    })

    return targets
  }

  /**
   * Возвращает актуальные границы объектов-целей для расчёта равноудалённого прилипания.
   */
  private _resolveCurrentTargetBounds({ activeObject }: { activeObject: FabricObject }): Bounds[] {
    const targets = this._collectTargets({ activeObject })
    const boundsList: Bounds[] = []

    for (const object of targets) {
      const bounds = getObjectBounds({ object })
      if (!bounds) continue

      boundsList.push(bounds)
    }

    return boundsList
  }

  /**
   * Возвращает границы для рисования направляющих.
   */
  private _calculateViewportBounds(): GuideBounds {
    const { canvas } = this
    const { viewportTransform } = canvas
    const width = canvas.getWidth()
    const height = canvas.getHeight()

    const [
      scaleX = 1,
      ,,
      scaleY = 1,
      translateX = 0,
      translateY = 0
    ] = viewportTransform ?? []

    const left = (0 - translateX) / scaleX
    const top = (0 - translateY) / scaleY
    const right = (width - translateX) / scaleX
    const bottom = (height - translateY) / scaleY

    return {
      left,
      right,
      top,
      bottom
    }
  }
}
