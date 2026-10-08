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
  type ScaleSnapEnvironment
} from './scaling/scale-snap-candidates'
import {
  createMovementSnapEnvironment,
  type MovementSnapCandidateSource,
  type MovementSnapEnvironment
} from './movement/movement-snap-candidates'
import { createMovementGuideLines, type MovementSnapVerification } from './movement/movement-snapping-resolver'
import {
  createScaleGestureBaseline,
  type VerifiedScaleGuide
} from './scaling/scale-snapping-resolver'
import { ScaleSnappingRuntime } from './scaling/scale-snapping-runtime'
import type { ScaleSceneEdge } from './scaling/scale-projection'
import {
  createRectangularScaleGestureProjection,
  createRectangularScaleProjectionModes,
  resolveRectangularScaleMovingEdges,
  type RectangularScaleGestureProjection,
  type RectangularScaleGestureTransform,
  type RectangularScalePoint
} from './scaling/rectangular-scale-gesture-projection'
import { ImageScaleSnappingController, type ImageScaleStepResult } from './scaling/image-scale-snapping-controller'
import { MovementSnappingController } from './movement/movement-snapping-controller'
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
  SnapTargetResolver,
  type SnapDomainBoundary,
  type SnapTargetBoundsMode
} from './guides/snap-target-resolver'
import {
  getObjectBounds,
  getObjectExactBounds
} from '../utils/geometry'

type TransformEvent = BasicTransformEvent<TPointerEvent> & {
  target?: FabricObject | null
  e?: TPointerEvent | null
}

type MouseEventInfo = TPointerEventInfo<TPointerEvent> & {
  target?: FabricObject | null
}

/** Initial projection and runtime for a single rectangular scaling session. */
type RectangularScaleSnappingSession = Readonly<{
  projection: RectangularScaleGestureProjection
  runtime: ScaleSnappingRuntime
}>

/** Canvas event containing an object that may have participated in the active session. */
type ObjectTargetEvent = {
  target?: FabricObject | null
}

/** Axes on which the current movement step can use snapping. */
type MovementSnapAxisState = {
  canSnapX: boolean
  canSnapY: boolean
}

/** Validated context for one object movement step. */
type ObjectMovementContext = {
  target: FabricObject
  transform?: Transform
  activeBounds: Bounds
  threshold: number
  canSnapX: boolean
  canSnapY: boolean
}

/** Result of snapping to regular guides during movement. */
type MovementGuideSnapResult = {
  activeBounds: Bounds
  hasGuideSnapX: boolean
  hasGuideSnapY: boolean
}

/** Data for the legacy text width resizing path. */
type TextResizingSnapRequest = {
  target?: FabricObject | null
  transform?: Transform | null
  event?: TPointerEvent | null
}

/** Validated context for the legacy horizontal text width resizing path. */
type TextResizingTargetContext = {
  target: Textbox
  activeBounds: Bounds
  originX: Transform['originX']
  originY: Transform['originY']
  verticalAnchors: number[]
  threshold: number
}

/**
 * Object and available axes for the current scaling operation.
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
 * Complete snapping plan for one scaling step.
 */
type ObjectScalingPlanContext = ObjectScalingTargetContext & {
  originX: Transform['originX']
  originY: Transform['originY']
  scalePlan: ScaleUpdatePlan
}

/** Snapping geometry for types not yet migrated to the new contract. */
type ObjectScalingSnapGeometry = {
  activeBounds: Bounds
  originX: Transform['originX']
  originY: Transform['originY']
  scaleX: number
  scaleY: number
  snapState: ScaleAxisSnapState
}

/**
 * Manages guide rendering and object snap alignment.
 */
export default class SnappingManager {
  /**
   * Editor instance.
   */
  public editor: ImageEditor

  /**
   * Editor canvas.
   */
  public canvas: Canvas

  /**
   * Cached snapping lines.
   */
  private anchors: AnchorBuckets = { vertical: [], horizontal: [] }

  /** Bounds calculation mode for the current target cache. */
  private anchorBoundsMode: SnapTargetBoundsMode | null = null

  /**
   * Cached intervals between objects.
   */
  private spacingPatterns: { vertical: SpacingPattern[]; horizontal: SpacingPattern[] } = {
    vertical: [],
    horizontal: []
  }

  /**
   * Saved equal-spacing snapping context for each axis.
   */
  private spacingContexts: SpacingContextByAxis = {
    vertical: null,
    horizontal: null
  }

  /**
   * Cached bounds of available objects.
   */
  private cachedTargetBounds: Bounds[] = []

  /**
   * Current guides to render.
   */
  private activeGuides: GuideLine[] = []

  /**
   * Current spacing guides to render.
   */
  private activeSpacingGuides: SpacingGuide[] = []

  /**
   * Bounds within which guides are drawn.
   */
  private guideBounds: GuideBounds | null = null

  /** Pointer events already handled by the manager for a specific object type. */
  private readonly handledStepEvents = new WeakSet<object>()

  /** Manages unified movement snapping for images, shapes, and standalone text. */
  private readonly movementSnappingController: MovementSnappingController

  /** Manages the shared snapping session for image scaling. */
  private readonly imageScaleSnappingController: ImageScaleSnappingController

  /** Selects available snap targets and calculates their bounds. */
  private readonly snapTargetResolver: SnapTargetResolver

  /**
   * Object drag start handler.
   */
  private _onMouseDown: (event: MouseEventInfo) => void

  /** Fallback scaling step handler when no `object:scaling` event is fired. */
  private _onMouseMove: (event: MouseEventInfo) => void

  /**
   * Object movement handler.
   */
  private _onObjectMoving: (event: TransformEvent) => void

  /**
   * Object scaling handler.
   */
  private _onObjectScaling: (event: TransformEvent) => void

  /**
   * Interaction completion or interruption handler.
   */
  private _onInteractionFinished: () => void

  /** External cancellation handler for the current interaction. */
  private _onInteractionCancelled: (event: Event) => void

  /** Removal handler for an object that may have participated in the active movement session. */
  private _onObjectRemoved: (event: ObjectTargetEvent) => void

  /**
   * Pre-render cleanup handler.
   */
  private _onBeforeRender: () => void

  /**
   * Post-render guide drawing handler.
   */
  private _onAfterRender: () => void

  /**
   * Creates the snapping manager and initializes event listeners.
   */
  constructor({ editor }: { editor: ImageEditor }) {
    this.editor = editor
    const { canvas } = editor
    this.canvas = canvas
    this.movementSnappingController = new MovementSnappingController({ editor })
    this.imageScaleSnappingController = new ImageScaleSnappingController({ editor })
    this.snapTargetResolver = new SnapTargetResolver({ canvas })

    this._onMouseDown = this._handleMouseDown.bind(this)
    this._onMouseMove = this._handleMouseMove.bind(this)
    this._onObjectMoving = this._handleObjectMoving.bind(this)
    this._onObjectScaling = this._handleObjectScaling.bind(this)
    this._onInteractionFinished = this._handleInteractionFinished.bind(this)
    this._onInteractionCancelled = this._handleInteractionCancelled.bind(this)
    this._onObjectRemoved = this._handleObjectRemoved.bind(this)
    this._onBeforeRender = this._handleBeforeRender.bind(this)
    this._onAfterRender = this._handleAfterRender.bind(this)

    this._bindEvents()
  }

  /**
   * Removes listeners and clears temporary data.
   */
  public destroy(): void {
    this._unbindEvents()
    this._finishSnappingInteraction()
  }

  /**
   * Captures exact targets and canvas zoom at the start of scaling.
   * The boundary supplied by the owner takes priority as a domain constraint.
   */
  public captureScaleSnapEnvironment({
    activeObject,
    targetEdges,
    domainBoundary
  }: {
    activeObject: FabricObject
    targetEdges: readonly ScaleSceneEdge[]
    domainBoundary?: SnapDomainBoundary
  }): ScaleSnapEnvironment {
    const sources = this._captureSourcesAndGuideBounds({ activeObject, domainBoundary })

    return Object.freeze({
      candidates: createScaleSnapCandidates({ targetEdges, sources }),
      zoom: this.canvas.getZoom() || 1
    })
  }

  /** Captures exact movement targets; the domain boundary does not participate in equal spacing. */
  public captureMovementSnapEnvironment({
    activeObject, domainBoundary
  }: {
    activeObject: FabricObject
    domainBoundary?: SnapDomainBoundary
  }): MovementSnapEnvironment {
    const sources = this._captureSourcesAndGuideBounds({ activeObject, domainBoundary })

    return createMovementSnapEnvironment({ sources, zoom: this.canvas.getZoom() || 1 })
  }

  /** Captures targets and drawing bounds from a single snapshot of exact scene geometry. */
  private _captureSourcesAndGuideBounds({
    activeObject, domainBoundary
  }: {
    activeObject: FabricObject
    domainBoundary?: SnapDomainBoundary
  }): MovementSnapCandidateSource[] {
    const sources = this.snapTargetResolver.resolveSources({
      activeObject, domainBoundary, montageArea: this.editor.montageArea
    })
    this.guideBounds = sources.find(({ id }) => id === 'montage-area')?.bounds
      ?? calculateSnappingViewportBounds({ canvas: this.canvas })

    return sources
  }

  /** Creates the initial projection and starts the shared snapping calculation for rectangular scaling. */
  public startRectangularScaleSnappingSession({
    pointerStart,
    transform
  }: {
    pointerStart: RectangularScalePoint
    transform: RectangularScaleGestureTransform
  }): RectangularScaleSnappingSession | null {
    transform.target.setCoords()
    const projection = createRectangularScaleGestureProjection({ pointerStart, transform })
    if (!projection) return null

    const projectionModes = createRectangularScaleProjectionModes({ projection })
    const environment = this.captureScaleSnapEnvironment({
      activeObject: transform.target,
      targetEdges: resolveRectangularScaleMovingEdges({ projectionModes })
    })
    const baseline = createScaleGestureBaseline({
      bounds: projection.baselineBounds,
      fixedAnchor: projection.fixedAnchor,
      projectionModes,
      candidates: environment.candidates,
      zoom: environment.zoom
    })
    const runtime = new ScaleSnappingRuntime()
    runtime.startSession({ baseline })

    return Object.freeze({ projection, runtime })
  }

  /**
   * Marks a pointer event as already handled by the object's manager.
   */
  public markStepHandled({ marker }: { marker: object }): void {
    this.handledStepEvents.add(marker)
  }

  /**
   * Shows guides verified against the geometry already applied.
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

  /** Shows regular and equal-spacing guides after verifying the actual position. */
  public publishVerifiedMovementGuides({
    guides, spacingGuides
  }: Pick<MovementSnapVerification, 'guides' | 'spacingGuides'>): void {
    this._applyGuides({
      guides: createMovementGuideLines({ guides }),
      spacingGuides: [...spacingGuides]
    })
  }

  /**
   * Attaches canvas event handlers.
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

    window.addEventListener('pointercancel', this._onInteractionCancelled)
    window.addEventListener('touchcancel', this._onInteractionCancelled)
    window.addEventListener('blur', this._onInteractionCancelled)
  }

  /**
   * Removes canvas event handlers.
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

    window.removeEventListener('pointercancel', this._onInteractionCancelled)
    window.removeEventListener('touchcancel', this._onInteractionCancelled)
    window.removeEventListener('blur', this._onInteractionCancelled)
  }

  /**
   * Clears the previous gesture and starts the owner of the new one. The legacy cache is built only when accessed.
   */
  private _handleMouseDown(event: MouseEventInfo): void {
    const { target } = event
    this._clearGuides()
    this._clearAnchors()

    const usesUnifiedScale = this.imageScaleSnappingController.startGesture({ event })
    const movementTarget = !usesUnifiedScale && event.transform?.action === 'drag'
      ? target
      : null
    this.movementSnappingController.startGesture({
      target: movementTarget
    })
  }

  /** Handles an image scaling step without a Fabric transform event. */
  private _handleMouseMove(event: MouseEventInfo): void {
    let unifiedStep: ImageScaleStepResult
    try {
      unifiedStep = this.imageScaleSnappingController.handleCanvasMouseMove({ event })
    } catch (error) {
      this._finishSnappingInteraction()
      throw error
    }
    if (unifiedStep.handled) {
      if (unifiedStep.shouldPublishGuides) {
        this.publishVerifiedScaleGuides({ guides: unifiedStep.guides })
      }
      return
    }

    if (unifiedStep.didFinishSession) this._clearGuides()
  }

  /**
   * Snaps a moving object to the nearest lines.
   */
  private _handleObjectMoving(event: TransformEvent): void {
    if (event.e && this.handledStepEvents.has(event.e)) return
    const objectMovementStep = this.movementSnappingController.handleObjectMoving({ event })
    if (objectMovementStep.handled) {
      this._applyGuides({
        guides: [...objectMovementStep.guides],
        spacingGuides: [...objectMovementStep.spacingGuides]
      })
      return
    }

    const context = this._resolveObjectMovementContext({ event })
    if (!context) return

    this._applyObjectMovementSnap(context)
  }

  /** Prepares the object and exact geometry for one movement step. */
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

  /** Disables only the crop frame axes that the source clamp will move back inside the source. */
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

  /** Applies regular and equal-spacing guides for one movement step. */
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
    const candidateTargets = this.snapTargetResolver.resolve({
      activeObject: target,
      mode: 'exact'
    })
    const candidateBounds = candidateTargets.map(({ bounds }) => bounds)
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

  /** Applies the nearest line guides and returns the current exact bounds. */
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
   * Snaps a scaling object to the nearest lines.
   */
  private _handleObjectScaling(event: TransformEvent): void {
    let unifiedStep: ImageScaleStepResult
    try {
      unifiedStep = this.imageScaleSnappingController.handleObjectScaling({ event })
    } catch (error) {
      this._finishSnappingInteraction()
      throw error
    }
    if (unifiedStep.handled) {
      if (unifiedStep.shouldPublishGuides) {
        this.publishVerifiedScaleGuides({ guides: unifiedStep.guides })
      }
      return
    }
    if (event.e && this.handledStepEvents.has(event.e)) return
    if (this.editor.textManager.handleStandaloneTextCornerScaling(event)) return

    if (event.target && this.editor.cropManager.getFrameSnappingBoundary(event.target)) {
      this._ensureAnchorBounds({ activeObject: event.target, mode: 'rounded' })
      const guides = this.editor.cropManager.applyFrameScalingSnap({
        target: event.target,
        transform: event.transform,
        event: event.e,
        anchors: this.anchors,
        threshold: SNAP_THRESHOLD / (this.canvas.getZoom() || 1)
      })
      this._applyGuides({ guides, spacingGuides: [] })
      return
    }

    const targetContext = this._resolveObjectScalingTargetContext({ event })
    if (!targetContext) return

    const planContext = this._resolveObjectScalingPlanContext(targetContext)
    if (!planContext) return

    this._applyObjectScalingSnapPlan(planContext)
  }

  /**
   * Validates the object for scaling or ends the step without snapping.
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
   * Calculates a snapping plan or ends the step without guides.
   */
  private _resolveObjectScalingPlanContext(
    context: ObjectScalingTargetContext
  ): ObjectScalingPlanContext | null {
    const {
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

    const scalePlan = resolveScaleUpdatePlan({
      target,
      bounds: activeBounds,
      originX,
      originY,
      scaleX,
      scaleY,
      shouldUseUniformScaleSnap: isCornerHandle,
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
      scalePlan
    }
  }

  /** Collects rounded bounds and snapping for object types not yet migrated. */
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
   * Applies the legacy snapping plan and rounds a regular object to pixels.
   */
  private _applyObjectScalingSnapPlan({
    target,
    transform,
    originX,
    originY,
    canApplyPixelScalingStep,
    scalePlan
  }: ObjectScalingPlanContext): void {
    this._applyScaleUpdatePlan({ target, transform, originX, originY, plan: scalePlan })

    if (canApplyPixelScalingStep) {
      this._applyObjectScalingPixelStep({
        target,
        transform,
        originX,
        originY,
        snapGuards: scalePlan.snapGuards
      })
    }

    this._applyGuides({
      guides: scalePlan.guides,
      spacingGuides: []
    })
  }

  /**
   * Rounds scaling without moving the fixed side of the current transform.
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

  /** Returns true if movement should stop before calculating guides. */
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

  /** Checks whether scaling should end before calculating snapping. */
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

  /** Ends the step without guides, preserving the legacy pixel rounding. */
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

  /** Checks whether scaling has changed since the Fabric transform began. */
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

  /** Applies an object offset and returns its current bounds. */
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

  /** Calculates equal-spacing snapping during movement. */
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

  /** Recalculates guides using the final bounds of the movement step. */
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

  /** Applies the calculated scale to the object and current Fabric transform. */
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

  /** Applies the legacy snapping logic to Textbox variants not yet migrated. */
  public applyTextResizingSnap({
    target,
    transform,
    event
  }: TextResizingSnapRequest): void {
    const context = this._resolveTextResizingTargetContext({ target, transform, event })
    if (!context) return

    const snapPlan = resolveTextResizeSnapPlan({
      target: context.target,
      bounds: context.activeBounds,
      originX: context.originX,
      verticalAnchors: context.verticalAnchors,
      threshold: context.threshold
    })
    if (!snapPlan) {
      this._clearGuides()
      return
    }

    this._applyTextResizingSnapPlan({ context, snapPlan })
  }

  /** Validates legacy path inputs and collects snapping geometry. */
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

  /** Applies the legacy width plan while preserving the fixed side of the Textbox. */
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

    this._applyGuides({ guides: [guide], spacingGuides: [] })
  }

  /** Clears shared snapping sessions, guides, and cache after a terminal event. */
  private _handleInteractionFinished(): void {
    this._finishSnappingInteraction()
  }

  /** Interrupts image scaling and clears guides even if Fabric fails to finish. */
  private _handleInteractionCancelled(event: Event): void {
    const pointerEvent = event.type === 'blur' ? undefined : event as TPointerEvent
    try {
      this.imageScaleSnappingController.interruptGesture({ event: pointerEvent })
    } finally {
      this._finishSnappingInteraction()
    }
  }

  /** Ends the interaction only if a participating object was removed from the canvas. */
  private _handleObjectRemoved(event: ObjectTargetEvent): void {
    const { target } = event
    if (!target) return

    const removedMovementTarget = this.movementSnappingController.finishGestureForTarget({ target })
    const removedScaleTarget = this.imageScaleSnappingController.finishGestureForTarget({
      target
    })
    if (!removedMovementTarget && !removedScaleTarget) return

    this._finishSnappingInteraction()
  }

  /** Idempotently clears all temporary state of the current snapping interaction. */
  private _finishSnappingInteraction(): void {
    this.movementSnappingController.finishGesture()
    this.imageScaleSnappingController.finishGesture()
    this._clearGuides()
    this._clearAnchors()
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
   * Draws active guides after the canvas renders.
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
   * Applies the guides found or clears them if none are available.
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
   * Resets all active guides and requests a redraw.
   */
  private _clearGuides(): void {
    if (!this.activeGuides.length && !this.activeSpacingGuides.length) return

    this.activeGuides = []
    this.activeSpacingGuides = []
    this.canvas.requestRenderAll()
  }

  /**
   * Clears the reference line cache.
   */
  private _clearAnchors(): void {
    this.anchors = { vertical: [], horizontal: [] }
    this.anchorBoundsMode = null
    this.spacingPatterns = { vertical: [], horizontal: [] }
    this.cachedTargetBounds = []
    this._clearSpacingContexts()
  }

  /**
   * Resets the saved equal-spacing guide selection context.
   */
  private _clearSpacingContexts(): void {
    this.spacingContexts = {
      vertical: null,
      horizontal: null
    }
  }

  /**
   * Ensures the temporary cache is built in the required geometry mode.
   */
  private _ensureAnchorBounds({
    activeObject,
    mode
  }: {
    activeObject: FabricObject
    mode: SnapTargetBoundsMode
  }): void {
    const hasAnchors = Boolean(this.anchors.vertical.length || this.anchors.horizontal.length)
    if (hasAnchors && this.anchorBoundsMode === mode) return

    this._cacheAnchors({ activeObject, mode })
  }

  /**
   * Caches snapping lines from all available objects and the artboard.
   */
  private _cacheAnchors({
    activeObject,
    mode
  }: {
    activeObject?: FabricObject | null
    mode: SnapTargetBoundsMode
  }): void {
    const targets = this.snapTargetResolver.resolve({
      activeObject,
      mode,
      domainBoundary: this.editor.cropManager.getFrameSnappingBoundary(activeObject)
    })
    const nextAnchors: AnchorBuckets = { vertical: [], horizontal: [] }
    const targetBounds: Bounds[] = []

    for (const { bounds } of targets) {
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
}
