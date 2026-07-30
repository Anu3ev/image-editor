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
  SNAP_THRESHOLD,
  SPACING_CONTEXT_SWITCH_DISTANCE,
  SPACING_SNAP_HOLD_MARGIN
} from './constants'
import {
  calculateSnap
} from './movement/line-snapping'
import {
  calculateSpacingSnap,
  type SpacingContextByAxis
} from './movement/spacing'
import {
  createScaleSnapCandidates,
  type ScaleSnapCandidateSource,
  type ScaleSnapEnvironment
} from './scaling/scale-snap-candidates'
import type { VerifiedScaleGuide } from './scaling/scale-snapping-resolver'
import type { ScaleSceneEdge } from './scaling/scale-projection'
import { ImageScaleSnappingController } from './scaling/image-scale-snapping-controller'
import { ImageMovementSnappingController } from './movement/image-movement-snapping-controller'
import {
  calculateSnappingViewportBounds,
  renderSnappingGuides
} from './guides/renderer'
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
  type ScaleAxisSnapState,
  type ScaleUpdatePlan,
  type TextResizeSnapPlan
} from './scaling/legacy-scale-snapping'
import type {
  AnchorBuckets,
  Bounds,
  GuideBounds,
  GuideLine,
  SpacingGuide,
  SpacingPattern
} from './types'
import { buildSpacingPatterns } from './movement/spacing-patterns'
import { pushBoundsToAnchors } from './guides/anchor-buckets'
import {
  getObjectBounds,
  getObjectExactBounds
} from '../utils/geometry'
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

/** Canvas-событие с объектом, который мог быть target активной сессии. */
type ObjectTargetEvent = {
  target?: FabricObject | null
}

type CropFrameSnapTarget = FabricObject & {
  cropSource?: FabricObject | null
}

/** Способ расчёта границ в текущем кеше целей прилипания. */
type AnchorBoundsMode = 'exact' | 'rounded'

/** Оси, по которым текущий шаг перемещения может использовать прилипание. */
type MovementSnapAxisState = {
  canSnapX: boolean
  canSnapY: boolean
}

/** Проверенный контекст одного шага перемещения объекта. */
type ObjectMovementContext = {
  target: FabricObject
  transform?: Transform
  activeBounds: Bounds
  threshold: number
  canSnapX: boolean
  canSnapY: boolean
}

/** Результат прилипания к обычным направляющим во время движения. */
type MovementGuideSnapResult = {
  activeBounds: Bounds
  hasGuideSnapX: boolean
  hasGuideSnapY: boolean
}

/** Данные от кастомной ручки изменения ширины текста. */
type TextResizingSnapRequest = {
  target?: FabricObject | null
  transform?: Transform | null
  event?: TPointerEvent | null
}

/** Проверенный контекст горизонтального изменения ширины текста. */
type TextResizingTargetContext = {
  target: Textbox
  activeBounds: Bounds
  originX: Transform['originX']
  originY: Transform['originY']
  verticalAnchors: number[]
  threshold: number
}

/**
 * Объект и доступные оси текущего скейлинга.
 */
type ObjectScalingTargetContext = {
  event: TransformEvent
  target: FabricObject
  transform: Transform
  canApplyPixelScalingStep: boolean
  isCornerHandle: boolean
  shouldSnapX: boolean
  shouldSnapY: boolean
}

/**
 * Полный план прилипания для одного шага скейлинга.
 */
type ObjectScalingPlanContext = ObjectScalingTargetContext & {
  originX: Transform['originX']
  originY: Transform['originY']
  shouldUseUniformScale: boolean
  scalePlan: ScaleUpdatePlan
}

/** Геометрия прилипания для типов, которые ещё не переведены на новый контракт. */
type ObjectScalingSnapGeometry = {
  activeBounds: Bounds
  originX: Transform['originX']
  originY: Transform['originY']
  scaleX: number
  scaleY: number
  snapState: ScaleAxisSnapState
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

  /** Способ расчёта границ в текущем кеше целей. */
  private anchorBoundsMode: AnchorBoundsMode | null = null

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

  /** События указателя, уже обработанные менеджером конкретного типа объекта. */
  private readonly handledScaleStepEvents = new WeakSet<object>()

  /** Владелец unified movement-сессии одиночного Image. */
  private readonly imageMovementSnappingController: ImageMovementSnappingController

  /** Владелец unified scale-сессии для уже перенесённых Image controls. */
  private readonly imageScaleSnappingController: ImageScaleSnappingController

  /** Активный target Image movement-сессии для точной обработки object:removed. */
  private activeImageMovementSnappingTarget: FabricObject | null = null

  /**
   * Обработчик начала перетаскивания объекта.
   */
  private _onMouseDown: (event: MouseEventInfo) => void

  /** Обработчик fallback scale-step без события `object:scaling`. */
  private _onMouseMove: (event: MouseEventInfo) => void

  /**
   * Обработчик перемещения объекта.
   */
  private _onObjectMoving: (event: TransformEvent) => void

  /**
   * Обработчик масштабирования объекта.
   */
  private _onObjectScaling: (event: TransformEvent) => void

  /**
   * Обработчик завершения или прерывания interaction.
   */
  private _onInteractionFinished: () => void

  /** Обработчик удаления возможного target активной movement-сессии. */
  private _onObjectRemoved: (event: ObjectTargetEvent) => void

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
    this.imageMovementSnappingController = new ImageMovementSnappingController({ editor })
    this.imageScaleSnappingController = new ImageScaleSnappingController({ editor })

    this._onMouseDown = this._handleMouseDown.bind(this)
    this._onMouseMove = this._handleMouseMove.bind(this)
    this._onObjectMoving = this._handleObjectMoving.bind(this)
    this._onObjectScaling = this._handleObjectScaling.bind(this)
    this._onInteractionFinished = this._handleInteractionFinished.bind(this)
    this._onObjectRemoved = this._handleObjectRemoved.bind(this)
    this._onBeforeRender = this._handleBeforeRender.bind(this)
    this._onAfterRender = this._handleAfterRender.bind(this)

    this._bindEvents()
  }

  /**
   * Удаляет слушатели и очищает временные данные.
   */
  public destroy(): void {
    this._unbindEvents()
    this._finishSnappingInteraction()
  }

  /**
   * Сохраняет точные цели и масштаб canvas в начале скейлинга.
   */
  public captureScaleSnapEnvironment({
    activeObject,
    targetEdges
  }: {
    activeObject: FabricObject
    targetEdges: readonly ScaleSceneEdge[]
  }): ScaleSnapEnvironment {
    const sources: ScaleSnapCandidateSource[] = []
    const targets = this._collectTargets({ activeObject })

    for (let index = 0; index < targets.length; index += 1) {
      const object = targets[index]
      const bounds = getObjectExactBounds({ object })
      if (!bounds) continue

      sources.push({
        id: `object:${index}:${object.id ?? object.type}`,
        bounds
      })
    }

    const montageBounds = getObjectExactBounds({ object: this.editor.montageArea })
    if (montageBounds) {
      sources.push({
        id: 'montage-area',
        bounds: montageBounds,
        edgeCategory: 'domain-boundary'
      })
    }

    return Object.freeze({
      candidates: createScaleSnapCandidates({ targetEdges, sources }),
      zoom: this.canvas.getZoom() || 1
    })
  }

  /**
   * Помечает событие указателя уже обработанным менеджером объекта.
   */
  public markScaleStepHandled({ marker }: { marker: object }): void {
    this.handledScaleStepEvents.add(marker)
  }

  /**
   * Показывает направляющие, подтверждённые по уже применённой геометрии.
   */
  public publishVerifiedScaleGuides({ guides }: { guides: readonly VerifiedScaleGuide[] }): void {
    this._applyGuides({
      guides: guides.map(({ axis, position }) => ({
        type: axis === 'x' ? 'vertical' : 'horizontal',
        position
      })),
      spacingGuides: []
    })
  }

  /**
   * Навешивает обработчики событий канваса.
   */
  private _bindEvents(): void {
    const { canvas } = this
    canvas.on('mouse:down', this._onMouseDown)
    canvas.on('mouse:move', this._onMouseMove)
    canvas.on('object:moving', this._onObjectMoving)
    canvas.on('object:scaling', this._onObjectScaling)
    canvas.on('mouse:up', this._onInteractionFinished)
    canvas.on('object:removed', this._onObjectRemoved)
    canvas.on('selection:created', this._onInteractionFinished)
    canvas.on('selection:updated', this._onInteractionFinished)
    canvas.on('selection:cleared', this._onInteractionFinished)
    canvas.on('before:render', this._onBeforeRender)
    canvas.on('after:render', this._onAfterRender)

    window.addEventListener('pointercancel', this._onInteractionFinished)
    window.addEventListener('touchcancel', this._onInteractionFinished)
    window.addEventListener('blur', this._onInteractionFinished)
  }

  /**
   * Удаляет обработчики событий канваса.
   */
  private _unbindEvents(): void {
    const { canvas } = this
    canvas.off('mouse:down', this._onMouseDown)
    canvas.off('mouse:move', this._onMouseMove)
    canvas.off('object:moving', this._onObjectMoving)
    canvas.off('object:scaling', this._onObjectScaling)
    canvas.off('mouse:up', this._onInteractionFinished)
    canvas.off('object:removed', this._onObjectRemoved)
    canvas.off('selection:created', this._onInteractionFinished)
    canvas.off('selection:updated', this._onInteractionFinished)
    canvas.off('selection:cleared', this._onInteractionFinished)
    canvas.off('before:render', this._onBeforeRender)
    canvas.off('after:render', this._onAfterRender)

    window.removeEventListener('pointercancel', this._onInteractionFinished)
    window.removeEventListener('touchcancel', this._onInteractionFinished)
    window.removeEventListener('blur', this._onInteractionFinished)
  }

  /**
   * Очищает прошлый interaction и фиксирует цели нового gesture.
   */
  private _handleMouseDown(event: MouseEventInfo): void {
    const { target } = event
    this._clearGuides()
    this._clearAnchors()

    const usesUnifiedScale = this.imageScaleSnappingController.startGesture({ event })
    const movementTarget = !usesUnifiedScale && event.transform?.action === 'drag'
      ? target
      : null
    const usesImageMovementSnapping = this.imageMovementSnappingController.startGesture({
      target: movementTarget
    })
    this.activeImageMovementSnappingTarget = usesImageMovementSnapping ? target ?? null : null

    if (!target) return

    this._cacheAnchors({ activeObject: target, mode: 'rounded' })
  }

  /** Обрабатывает Image scale-step, для которого Fabric не отправил transform event. */
  private _handleMouseMove(event: MouseEventInfo): void {
    const unifiedStep = this.imageScaleSnappingController.handleCanvasMouseMove({ event })
    if (unifiedStep.handled) {
      if (unifiedStep.shouldPublishGuides) {
        this.publishVerifiedScaleGuides({ guides: unifiedStep.guides })
      }
      return
    }

    if (unifiedStep.didFinishSession) this._clearGuides()
  }

  /**
   * Выполняет привязку объекта к ближайшим линиям при его перемещении.
   */
  private _handleObjectMoving(event: TransformEvent): void {
    const imageMovementStep = this.imageMovementSnappingController.handleObjectMoving({ event })
    if (imageMovementStep.handled) {
      this._applyGuides({
        guides: [...imageMovementStep.guides],
        spacingGuides: [...imageMovementStep.spacingGuides]
      })
      return
    }

    const context = this._resolveObjectMovementContext({ event })
    if (!context) return

    this._applyObjectMovementSnap(context)
  }

  /** Подготавливает объект и точную геометрию для одного шага перемещения. */
  private _resolveObjectMovementContext({
    event
  }: {
    event: TransformEvent
  }): ObjectMovementContext | null {
    const { target, transform } = event

    if (!target) {
      this._clearSpacingContexts()
      this._clearGuides()
      return null
    }

    if (this._shouldAbortObjectMoving({ event })) return null

    const { canSnapX, canSnapY } = this._resolveMovementSnapAxes({ target, transform })

    if (!canSnapX && !canSnapY) {
      this._clearSpacingContexts()
      this._clearGuides()
      return null
    }

    applyMovementStep({ target, transform, roundX: canSnapX, roundY: canSnapY })
    this._ensureAnchorBounds({ activeObject: target, mode: 'exact' })

    const activeBounds = getObjectExactBounds({ object: target })
    if (!activeBounds) {
      this._clearSpacingContexts()
      this._clearGuides()
      return null
    }

    return {
      target,
      activeBounds,
      threshold: SNAP_THRESHOLD / (this.canvas.getZoom() || 1),
      canSnapX,
      canSnapY
    }
  }

  /** Отключает только те оси crop frame, которые будут возвращены внутрь source clamp-ом. */
  private _resolveMovementSnapAxes({
    target,
    transform
  }: {
    target: FabricObject
    transform?: Transform
  }): MovementSnapAxisState {
    const isOverflowingX = this.editor.cropManager.isFrameOverflowingSource({ target, axis: 'x' })
    const isOverflowingY = this.editor.cropManager.isFrameOverflowingSource({ target, axis: 'y' })
    const hasSourceOverflow = isOverflowingX || isOverflowingY
    const originalLeft = transform?.original?.left
    const originalTop = transform?.original?.top
    const hasMovedX = typeof originalLeft !== 'number' || target.left !== originalLeft
    const hasMovedY = typeof originalTop !== 'number' || target.top !== originalTop

    return {
      canSnapX: !isOverflowingX && (!hasSourceOverflow || hasMovedX),
      canSnapY: !isOverflowingY && (!hasSourceOverflow || hasMovedY)
    }
  }

  /** Применяет обычные и равноудалённые направляющие одного шага перемещения. */
  private _applyObjectMovementSnap({
    target,
    transform,
    activeBounds,
    threshold,
    canSnapX,
    canSnapY
  }: ObjectMovementContext): void {
    const guideSnap = this._applyMovementGuideSnap({
      target,
      activeBounds,
      threshold,
      canSnapX,
      canSnapY
    })
    const candidateBounds = this._resolveCurrentTargetBounds({
      activeObject: target,
      mode: 'exact'
    })
    const spacingResult = this._calculateSpacingResult({
      activeBounds: guideSnap.activeBounds,
      candidateBounds,
      threshold,
      canSnapX,
      canSnapY
    })
    this.spacingContexts = spacingResult.contexts

    const hasSpacingSnap = spacingResult.deltaX !== 0 || spacingResult.deltaY !== 0
    const spacedBounds = this._applyMovementDelta({
      target,
      activeBounds: guideSnap.activeBounds,
      deltaX: spacingResult.deltaX,
      deltaY: spacingResult.deltaY
    })

    if (!hasSpacingSnap) {
      applyMovementStep({
        target,
        transform,
        roundX: canSnapX && !guideSnap.hasGuideSnapX,
        roundY: canSnapY && !guideSnap.hasGuideSnapY
      })
    }

    const finalBounds = getObjectExactBounds({ object: target }) ?? spacedBounds
    this._applyMovementVisualGuides({
      activeBounds: finalBounds,
      candidateBounds,
      threshold,
      canSnapX,
      canSnapY
    })
  }

  /** Применяет ближайшие линейные направляющие и возвращает актуальные точные границы. */
  private _applyMovementGuideSnap({
    target,
    activeBounds,
    threshold,
    canSnapX,
    canSnapY
  }: {
    target: FabricObject
    activeBounds: Bounds
    threshold: number
    canSnapX: boolean
    canSnapY: boolean
  }): MovementGuideSnapResult {
    const snapResult = calculateSnap({
      activeBounds,
      threshold,
      anchors: {
        vertical: canSnapX ? this.anchors.vertical : [],
        horizontal: canSnapY ? this.anchors.horizontal : []
      }
    })
    const hasGuideSnapX = snapResult.deltaX !== 0 || snapResult.guides.some((guide) => {
      return guide.type === 'vertical'
    })
    const hasGuideSnapY = snapResult.deltaY !== 0 || snapResult.guides.some((guide) => {
      return guide.type === 'horizontal'
    })

    return {
      activeBounds: this._applyMovementDelta({
        target,
        activeBounds,
        deltaX: snapResult.deltaX,
        deltaY: snapResult.deltaY
      }),
      hasGuideSnapX,
      hasGuideSnapY
    }
  }

  /**
   * Выполняет привязку объекта к ближайшим линиям при его масштабировании.
   */
  private _handleObjectScaling(event: TransformEvent): void {
    const unifiedStep = this.imageScaleSnappingController.handleObjectScaling({ event })
    if (unifiedStep.handled) {
      if (unifiedStep.shouldPublishGuides) {
        this.publishVerifiedScaleGuides({ guides: unifiedStep.guides })
      }
      return
    }
    if (event.e && this.handledScaleStepEvents.has(event.e)) return

    const targetContext = this._resolveObjectScalingTargetContext({ event })
    if (!targetContext) return

    const planContext = this._resolveObjectScalingPlanContext(targetContext)
    if (!planContext) return

    this._applyObjectScalingSnapPlan(planContext)
  }

  /**
   * Проверяет объект для скейлинга или завершает шаг без прилипания.
   */
  private _resolveObjectScalingTargetContext({
    event
  }: {
    event: TransformEvent
  }): ObjectScalingTargetContext | null {
    const { target, transform } = event

    if (!target || !transform) {
      this._clearGuides()
      return null
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
      return null
    }
    if (!this._hasObjectScaleChanged({
      target,
      transform
    })) {
      this._clearGuides()
      return null
    }

    const {
      shouldSnapX,
      shouldSnapY,
      isCornerHandle
    } = resolveScalingAxisState({ transform })

    if (!shouldSnapX && !shouldSnapY) {
      this._finishObjectScalingWithoutSnap({
        target,
        transform,
        canApplyPixelScalingStep
      })
      return null
    }

    this._ensureAnchorBounds({ activeObject: target, mode: 'rounded' })

    return {
      event,
      target,
      transform,
      canApplyPixelScalingStep,
      isCornerHandle,
      shouldSnapX,
      shouldSnapY
    }
  }

  /**
   * Рассчитывает план прилипания или завершает шаг без направляющих.
   */
  private _resolveObjectScalingPlanContext(
    context: ObjectScalingTargetContext
  ): ObjectScalingPlanContext | null {
    const {
      event,
      target,
      transform,
      canApplyPixelScalingStep,
      isCornerHandle
    } = context
    const snapGeometry = this._resolveObjectScalingSnapGeometry(context)
    if (!snapGeometry) return null

    const {
      activeBounds,
      originX,
      originY,
      scaleX,
      scaleY,
      snapState
    } = snapGeometry

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
      originalScaleX: transform.original?.scaleX,
      originalScaleY: transform.original?.scaleY,
      shouldUseUniformScaleSnap: shouldUseUniformScale,
      verticalSnap: snapState.verticalSnap,
      horizontalSnap: snapState.horizontalSnap
    })

    if (!scalePlan) {
      this._finishObjectScalingWithoutSnap({
        target,
        transform,
        canApplyPixelScalingStep
      })
      return null
    }

    return {
      ...context,
      originX,
      originY,
      shouldUseUniformScale,
      scalePlan
    }
  }

  /** Собирает округлённые границы и прилипание для ещё не перенесённых типов объектов. */
  private _resolveObjectScalingSnapGeometry(
    context: ObjectScalingTargetContext
  ): ObjectScalingSnapGeometry | null {
    const { target, transform, canApplyPixelScalingStep, shouldSnapX, shouldSnapY } = context
    const activeBounds = getObjectBounds({ object: target })
    if (!activeBounds) {
      this._finishObjectScalingWithoutSnap({ target, transform, canApplyPixelScalingStep })
      return null
    }

    const transformState = resolveScalingTransformState({ target, transform })
    const { originX, originY } = transformState
    const snapState = resolveScaleAxisSnaps({
      bounds: activeBounds,
      corner: transform.corner,
      originX,
      originY,
      shouldSnapX,
      shouldSnapY,
      threshold: SNAP_THRESHOLD / (this.canvas.getZoom() || 1),
      anchors: this.anchors
    })
    if (!snapState) {
      this._finishObjectScalingWithoutSnap({ target, transform, canApplyPixelScalingStep })
      return null
    }

    return { activeBounds, ...transformState, snapState }
  }

  /**
   * Применяет план прилипания, ограничения CropFrame и округление до пикселей.
   */
  private _applyObjectScalingSnapPlan({
    target,
    transform,
    originX,
    originY,
    canApplyPixelScalingStep,
    shouldUseUniformScale,
    scalePlan
  }: ObjectScalingPlanContext): void {
    const appliedSourceBoundScalePlan = shouldUseUniformScale
      ? this.editor.cropManager.applyFrameSourceBoundScalePlan({
        target,
        transform,
        nextScaleX: scalePlan.nextScaleX,
        nextScaleY: scalePlan.nextScaleY
      })
      : false

    if (!appliedSourceBoundScalePlan) {
      this._applyScaleUpdatePlan({
        target,
        transform,
        originX,
        originY,
        plan: scalePlan
      })
    }

    if (canApplyPixelScalingStep && !appliedSourceBoundScalePlan) {
      this._applyObjectScalingPixelStep({
        target,
        transform,
        originX,
        originY,
        snapGuards: scalePlan.snapGuards
      })
    }

    this.editor.cropManager.restoreFrameScaleAnchorAfterSnap({
      target,
      transform
    })

    if (this._shouldHideOverflowingCropFrameGuides({ target })) return

    this._applyGuides({
      guides: scalePlan.guides,
      spacingGuides: []
    })
  }

  /**
   * Округляет скейлинг, не сдвигая неподвижную сторону текущего преобразования.
   */
  private _applyObjectScalingPixelStep({
    target,
    transform,
    originX,
    originY,
    snapGuards
  }: {
    target: FabricObject
    transform: Transform
    originX: Transform['originX']
    originY: Transform['originY']
    snapGuards: ScaleUpdatePlan['snapGuards']
  }): void {
    const scaleStepPlacement = this.editor.canvasManager.getObjectPlacement({
      object: target,
      originX,
      originY
    })

    applyScalingStep({
      target,
      transform,
      preservePlacement: {
        placement: scaleStepPlacement,
        applyPlacement: (placement) => {
          this.editor.canvasManager.applyObjectPlacement({
            object: target,
            placement
          })
        }
      },
      snapGuards
    })
  }

  /** Возвращает true, если движение нужно прервать до расчёта направляющих. */
  private _shouldAbortObjectMoving({
    event
  }: {
    event: TransformEvent
  }): boolean {
    if (event.e?.ctrlKey) {
      this._clearSpacingContexts()
      this._clearGuides()
      return true
    }

    return false
  }

  /** Проверяет, нужно ли завершить скейлинг до расчёта прилипания. */
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

    return false
  }

  /** Завершает шаг без направляющих, сохраняя прежнее округление до пикселей. */
  private _finishObjectScalingWithoutSnap({
    target,
    transform,
    canApplyPixelScalingStep
  }: {
    target: FabricObject
    transform: Transform
    canApplyPixelScalingStep: boolean
  }): void {
    if (canApplyPixelScalingStep) {
      applyScalingStep({ target, transform })
    }

    this._clearGuides()
  }

  /** Проверяет, изменился ли скейлинг относительно начала преобразования Fabric. */
  private _hasObjectScaleChanged({
    target,
    transform
  }: {
    target: FabricObject
    transform: Transform
  }): boolean {
    const originalScaleX = transform.original?.scaleX
    const originalScaleY = transform.original?.scaleY
    if (typeof originalScaleX !== 'number' || typeof originalScaleY !== 'number') return true

    return target.scaleX !== originalScaleX || target.scaleY !== originalScaleY
  }

  /** Скрывает scale-направляющие crop frame, если текущий шаг будет зажат source clamp-ом. */
  private _shouldHideOverflowingCropFrameGuides({
    target
  }: {
    target: FabricObject
  }): boolean {
    if (!this.editor.cropManager.isFrameOverflowingSource({ target })) return false

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

    return getObjectExactBounds({ object: target }) ?? activeBounds
  }

  /** Рассчитывает прилипание к равноудалённым интервалам во время перемещения. */
  private _calculateSpacingResult({
    activeBounds,
    candidateBounds,
    threshold,
    canSnapX,
    canSnapY
  }: {
    activeBounds: Bounds
    candidateBounds: Bounds[]
    threshold: number
    canSnapX: boolean
    canSnapY: boolean
  }) {
    const hasActiveSpacingContext = Boolean(
      this.spacingContexts.vertical || this.spacingContexts.horizontal
    )
    const spacingThreshold = hasActiveSpacingContext
      ? (SNAP_THRESHOLD + SPACING_SNAP_HOLD_MARGIN) / (this.canvas.getZoom() || 1)
      : threshold

    const result = calculateSpacingSnap({
      activeBounds,
      candidates: candidateBounds,
      threshold: spacingThreshold,
      spacingPatterns: this.spacingPatterns,
      previousContexts: this.spacingContexts,
      switchDistance: SPACING_CONTEXT_SWITCH_DISTANCE
    })

    if (!canSnapX) {
      result.deltaX = 0
      result.guides = result.guides.filter((guide) => guide.type !== 'horizontal')
      result.contexts.horizontal = null
    }
    if (!canSnapY) {
      result.deltaY = 0
      result.guides = result.guides.filter((guide) => guide.type !== 'vertical')
      result.contexts.vertical = null
    }

    return result
  }

  /** Пересчитывает направляющие по окончательным границам шага перемещения. */
  private _applyMovementVisualGuides({
    activeBounds,
    candidateBounds,
    threshold,
    canSnapX,
    canSnapY
  }: {
    activeBounds: Bounds
    candidateBounds: Bounds[]
    threshold: number
    canSnapX: boolean
    canSnapY: boolean
  }): void {
    const visualSnapResult = calculateSnap({
      activeBounds,
      threshold,
      anchors: {
        vertical: canSnapX ? this.anchors.vertical : [],
        horizontal: canSnapY ? this.anchors.horizontal : []
      }
    })
    const visualSpacingResult = calculateSpacingSnap({
      activeBounds,
      candidates: candidateBounds,
      threshold,
      spacingPatterns: this.spacingPatterns,
      previousContexts: this.spacingContexts,
      switchDistance: SPACING_CONTEXT_SWITCH_DISTANCE
    })
    if (!canSnapX) {
      visualSpacingResult.deltaX = 0
      visualSpacingResult.guides = visualSpacingResult.guides.filter((guide) => guide.type !== 'horizontal')
      visualSpacingResult.contexts.horizontal = null
    }
    if (!canSnapY) {
      visualSpacingResult.deltaY = 0
      visualSpacingResult.guides = visualSpacingResult.guides.filter((guide) => guide.type !== 'vertical')
      visualSpacingResult.contexts.vertical = null
    }
    this.spacingContexts = visualSpacingResult.contexts

    const isSpacingPositionExact = visualSpacingResult.deltaX === 0
      && visualSpacingResult.deltaY === 0

    this._applyGuides({
      guides: visualSnapResult.guides,
      spacingGuides: isSpacingPositionExact ? visualSpacingResult.guides : []
    })
  }

  /** Применяет рассчитанный скейлинг к объекту и текущему преобразованию Fabric. */
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
  }: TextResizingSnapRequest): void {
    const context = this._resolveTextResizingTargetContext({ target, transform, event })
    if (!context) return

    const { activeBounds, originX, verticalAnchors, threshold } = context
    const snapPlan = resolveTextResizeSnapPlan({
      target: context.target,
      bounds: activeBounds,
      originX,
      verticalAnchors,
      threshold
    })

    if (!snapPlan) {
      this._clearGuides()
      return
    }

    this._applyTextResizingSnapPlan({ context, snapPlan })
  }

  /** Проверяет изменение ширины текста и собирает геометрию для прилипания. */
  private _resolveTextResizingTargetContext({
    target,
    transform,
    event
  }: TextResizingSnapRequest): TextResizingTargetContext | null {
    if (!target || !(target instanceof Textbox)) return null

    if (!transform || event?.ctrlKey) {
      this._clearGuides()
      return null
    }

    const { corner = '' } = transform
    if (corner !== 'ml' && corner !== 'mr') {
      this._clearGuides()
      return null
    }

    this._ensureAnchorBounds({ activeObject: target, mode: 'rounded' })
    const activeBounds = getObjectBounds({ object: target })
    if (!activeBounds) {
      this._clearGuides()
      return null
    }

    return {
      target,
      activeBounds,
      originX: transform.originX ?? target.originX ?? 'left',
      originY: transform.originY ?? target.originY ?? 'top',
      verticalAnchors: this.anchors.vertical,
      threshold: SNAP_THRESHOLD / (this.canvas.getZoom() || 1)
    }
  }

  /** Применяет рассчитанную ширину текста, не сдвигая неподвижную сторону. */
  private _applyTextResizingSnapPlan({
    context,
    snapPlan
  }: {
    context: TextResizingTargetContext
    snapPlan: TextResizeSnapPlan
  }): void {
    const { target, originX, originY } = context
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

  /** Очищает unified-сессии, направляющие и кеш после завершающего события. */
  private _handleInteractionFinished(): void {
    this._finishSnappingInteraction()
  }

  /** Завершает interaction, только если с canvas удалили его активный target. */
  private _handleObjectRemoved(event: ObjectTargetEvent): void {
    const { target } = event
    if (!target) return

    const removedMovementTarget = target === this.activeImageMovementSnappingTarget
    const removedScaleTarget = this.imageScaleSnappingController.finishGestureForTarget({
      target
    })
    if (!removedMovementTarget && !removedScaleTarget) return

    this._finishSnappingInteraction()
  }

  /** Идемпотентно очищает всё transient-состояние текущего interaction с прилипанием. */
  private _finishSnappingInteraction(): void {
    this.imageMovementSnappingController.finishGesture()
    this.imageScaleSnappingController.finishGesture()
    this.activeImageMovementSnappingTarget = null
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
    renderSnappingGuides({
      canvas: this.canvas,
      guideBounds: this.guideBounds,
      guides: this.activeGuides,
      spacingGuides: this.activeSpacingGuides
    })
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
    this.anchorBoundsMode = null
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
   * Гарантирует, что временный кеш построен в нужном геометрическом режиме.
   */
  private _ensureAnchorBounds({
    activeObject,
    mode
  }: {
    activeObject: FabricObject
    mode: AnchorBoundsMode
  }): void {
    const hasAnchors = Boolean(this.anchors.vertical.length || this.anchors.horizontal.length)
    if (hasAnchors && this.anchorBoundsMode === mode) return

    this._cacheAnchors({ activeObject, mode })
  }

  /**
   * Сохраняет линии для прилипания от всех доступных объектов и монтажной области.
   */
  private _cacheAnchors({
    activeObject,
    mode
  }: {
    activeObject?: FabricObject | null
    mode: AnchorBoundsMode
  }): void {
    const targets = this._collectTargets({ activeObject })
    const nextAnchors: AnchorBuckets = { vertical: [], horizontal: [] }
    const targetBounds: Bounds[] = []

    for (const object of targets) {
      const bounds = this._getTargetBounds({
        object,
        activeObject,
        mode
      })
      if (!bounds) continue
      pushBoundsToAnchors({ anchors: nextAnchors, bounds })
      targetBounds.push(bounds)
    }

    const { montageArea } = this.editor
    const montageBounds = mode === 'exact'
      ? getObjectExactBounds({ object: montageArea })
      : getObjectBounds({ object: montageArea })

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
      this.guideBounds = calculateSnappingViewportBounds({ canvas: this.canvas })
    }

    this.anchors = nextAnchors
    this.anchorBoundsMode = mode
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
  private _resolveCurrentTargetBounds({
    activeObject,
    mode
  }: {
    activeObject: FabricObject
    mode: AnchorBoundsMode
  }): Bounds[] {
    const targets = this._collectTargets({ activeObject })
    const boundsList: Bounds[] = []

    for (const object of targets) {
      const bounds = this._getTargetBounds({
        object,
        activeObject,
        mode
      })
      if (!bounds) continue

      boundsList.push(bounds)
    }

    return boundsList
  }

  /**
   * Возвращает актуальные границы цели прилипания.
   */
  private _getTargetBounds({
    object,
    activeObject,
    mode
  }: {
    object: FabricObject
    activeObject?: FabricObject | null
    mode: AnchorBoundsMode
  }): Bounds | null {
    if (mode === 'exact') return getObjectExactBounds({ object })

    if (this._isActiveCropSource({
      object,
      activeObject
    })) {
      return getObjectExactBounds({ object })
    }

    return getObjectBounds({ object })
  }

  /**
   * Возвращает true, если object является source активного crop frame.
   */
  private _isActiveCropSource({
    object,
    activeObject
  }: {
    object: FabricObject
    activeObject?: FabricObject | null
  }): boolean {
    const cropTarget = activeObject as CropFrameSnapTarget | null | undefined

    return cropTarget?.cropSource === object
  }
}
