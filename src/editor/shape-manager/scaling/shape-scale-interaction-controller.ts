import {
  Point,
  type FabricObject,
  type Transform
} from 'fabric'
import type { ImageEditor } from '../../index'
import {
  getObjectExactBounds,
  type ObjectBounds
} from '../../utils/geometry'
import {
  type FinalScaleGeometry,
  type PlannedScaleConstraint,
  type ScaleRawIntent,
  type ScaleSnapPlan
} from '../../snapping-manager/scaling/scale-snapping-resolver'
import type { ScaleSnappingRuntime } from '../../snapping-manager/scaling/scale-snapping-runtime'
import type { ScaleSceneEdge } from '../../snapping-manager/scaling/scale-projection'
import {
  createRectangularScaleValues,
  resolveRectangularScaleMultipliers,
  resolveRectangularScalePointerMultipliers,
  type RectangularScaleGestureMode,
  type RectangularScaleGestureProjection,
  type RectangularScaleGestureTransform,
  type RectangularScaleMultipliers,
  type RectangularScalePoint
} from '../../snapping-manager/scaling/rectangular-scale-gesture-projection'
import type { ShapeGroup } from '../types'
import { isShapeGroup } from '../domain/shape-reference'
import type ShapeScalingController from './shape-scaling-controller'
import type { ShapeScalingPointerEvent } from './shape-scaling-layout'
import { stabilizeShapeScaleMultipliers } from './shape-scale-stabilization'

/** Event data required to scale a single Shape. */
export type ShapeScaleInteractionEvent = Readonly<{
  target?: FabricObject | null
  e?: ShapeScalingPointerEvent | null
  transform?: Transform | null
  pointer?: RectangularScalePoint
  scenePoint?: RectangularScalePoint
}>

/** Shape properties that must remain unchanged during scaling. */
type ShapeScaleProtectedState = Readonly<{
  angle: number
  controlKey: string
  flipX: boolean
  flipY: boolean
  originX: Transform['originX']
  originY: Transform['originY']
  skewX: number
  skewY: number
}>

/** Validated Fabric data for a supported scale gesture. */
type ShapeScaleGesture = Readonly<{
  target: ShapeGroup
  transform: Transform
  projectionTransform: RectangularScaleGestureTransform
}>

/** Data for the active scale gesture of a single Shape. */
type ShapeScaleInteractionSession = Readonly<{
  target: ShapeGroup
  transform: Transform
  projection: RectangularScaleGestureProjection
  snapping: ScaleSnappingRuntime
  protectedState: ShapeScaleProtectedState
}>

/** Event supplying the current pointer coordinate. */
type ShapeScalePointSource = 'object-scaling' | 'mouse-move'

/** Tolerance for comparing scale and Shape properties. */
const SHAPE_SCALE_STATE_EPSILON = 0.000000001

/** Checks the domain and affine constraints of the new Shape scale owner. */
function isSupportedShapeScaleTarget(target: FabricObject): target is ShapeGroup {
  if (!isShapeGroup(target) || target.group) return false
  if (Boolean(target.flipX) || Boolean(target.flipY)) return false
  if (Boolean(target.locked) || Boolean(target.lockScalingX) || Boolean(target.lockScalingY)) return false

  const skewX = target.skewX ?? 0
  const skewY = target.skewY ?? 0

  return Number.isFinite(skewX)
    && Number.isFinite(skewY)
    && Math.abs(skewX) <= SHAPE_SCALE_STATE_EPSILON
    && Math.abs(skewY) <= SHAPE_SCALE_STATE_EPSILON
}

/** Checks the Fabric transform and returns Shape scale-gesture data. */
function resolveShapeScaleGesture({
  event
}: {
  event: ShapeScaleInteractionEvent
}): ShapeScaleGesture | null {
  const { transform } = event
  if (!transform) return null
  if (!isSupportedShapeScaleTarget(transform.target)) return null

  const originalScaleX = transform.original?.scaleX
  const originalScaleY = transform.original?.scaleY
  if (typeof originalScaleX !== 'number' || !Number.isFinite(originalScaleX)) return null
  if (typeof originalScaleY !== 'number' || !Number.isFinite(originalScaleY)) return null

  return Object.freeze({
    target: transform.target,
    transform,
    projectionTransform: Object.freeze({
      target: transform.target,
      action: transform.action,
      corner: transform.corner,
      originX: transform.originX,
      originY: transform.originY,
      original: Object.freeze({
        scaleX: originalScaleX,
        scaleY: originalScaleY
      })
    })
  })
}

/** Captures Shape properties that scaling must not change. */
function captureShapeState({
  target,
  transform
}: {
  target: ShapeGroup
  transform: Transform
}): ShapeScaleProtectedState {
  return Object.freeze({
    angle: target.angle ?? 0,
    controlKey: transform.corner,
    flipX: Boolean(target.flipX),
    flipY: Boolean(target.flipY),
    originX: transform.originX,
    originY: transform.originY,
    skewX: target.skewX ?? 0,
    skewY: target.skewY ?? 0
  })
}

/** Selects the scale mode based on the handle and whether Shift is pressed. */
function resolveScaleMode({
  projection,
  pointerEvent
}: {
  projection: RectangularScaleGestureProjection
  pointerEvent: ShapeScalingPointerEvent
}): RectangularScaleGestureMode {
  if (projection.controlKey === 'ml' || projection.controlKey === 'mr') return 'horizontal'
  if (projection.controlKey === 'mt' || projection.controlKey === 'mb') return 'vertical'

  return 'shiftKey' in pointerEvent && pointerEvent.shiftKey ? 'free' : 'uniform'
}

/** Reads modifier keys from the current pointer event. */
function readScaleModifiers({ event }: { event: ShapeScalingPointerEvent }): ScaleRawIntent['modifiers'] {
  return Object.freeze({
    ctrlKey: 'ctrlKey' in event && event.ctrlKey === true,
    shiftKey: 'shiftKey' in event && event.shiftKey === true
  })
}

/** Returns edges locked to a guide. */
function resolveSnappedEdges({ plan }: { plan: ScaleSnapPlan }): readonly ScaleSceneEdge[] {
  const edges = new Set<ScaleSceneEdge>()
  if (plan.constraints.x) edges.add(plan.constraints.x.candidate.edge)
  if (plan.constraints.y) edges.add(plan.constraints.y.candidate.edge)

  return Object.freeze([...edges])
}

/** Checks that a Shape edge has actually reached the guide. */
function didReachGuide({
  constraint,
  bounds,
  epsilon
}: {
  constraint: PlannedScaleConstraint | null
  bounds: ObjectBounds
  epsilon: number
}): boolean {
  if (!constraint) return true

  return Math.abs(bounds[constraint.candidate.edge] - constraint.expectedPosition) <= epsilon
}

/** Checks that Fabric has not switched the current scaling to another transform. */
function isSameScaleGesture({ session }: { session: ShapeScaleInteractionSession }): boolean {
  const { target, protectedState } = session

  return Math.abs((target.angle ?? 0) - protectedState.angle) <= SHAPE_SCALE_STATE_EPSILON
    && Math.abs((target.skewX ?? 0) - protectedState.skewX) <= SHAPE_SCALE_STATE_EPSILON
    && Math.abs((target.skewY ?? 0) - protectedState.skewY) <= SHAPE_SCALE_STATE_EPSILON
    && Boolean(target.flipX) === protectedState.flipX
    && Boolean(target.flipY) === protectedState.flipY
    && session.transform.corner === protectedState.controlKey
    && session.transform.originX === protectedState.originX
    && session.transform.originY === protectedState.originY
}

/** Checks whether a modifier switched the side handle from scaling to skewing. */
function isSideSkewStep({
  session,
  pointerEvent
}: {
  session: ShapeScaleInteractionSession
  pointerEvent: ShapeScalingPointerEvent
}): boolean {
  const { controlKey } = session.projection
  const isSideControl = controlKey === 'ml' || controlKey === 'mr' || controlKey === 'mt' || controlKey === 'mb'
  if (!isSideControl) return false

  const altActionKey = session.target.canvas?.altActionKey
  if (!altActionKey) return false

  return Reflect.get(pointerEvent, altActionKey) === true
}

/** Checks Shape properties and axes that the current handle must not change. */
function isShapeStatePreserved({
  session,
  mode,
  multipliers
}: {
  session: ShapeScaleInteractionSession
  mode: RectangularScaleGestureMode
  multipliers: RectangularScaleMultipliers
}): boolean {
  if (!isSameScaleGesture({ session })) return false
  if (mode === 'horizontal') return Math.abs(multipliers.y - 1) <= SHAPE_SCALE_STATE_EPSILON
  if (mode === 'vertical') return Math.abs(multipliers.x - 1) <= SHAPE_SCALE_STATE_EPSILON
  if (mode === 'uniform') return Math.abs(multipliers.x - multipliers.y) <= SHAPE_SCALE_STATE_EPSILON

  return true
}

/**
 * Calculates snapping, applies scale to the Shape, and validates the resulting geometry.
 */
export default class ShapeScaleInteractionController {
  /** Editor providing the canvas and SnappingManager. */
  private readonly editor: ImageEditor

  /** Controller that updates the Shape's dimensions and internal layout. */
  private readonly scalingController: ShapeScalingController

  /** Current scale gesture, or null if this case remains on the previous handling path. */
  private session: ShapeScaleInteractionSession | null = null

  /** Accepts the dependencies required to handle scaling. */
  constructor({
    editor,
    scalingController
  }: {
    editor: ImageEditor
    scalingController: ShapeScalingController
  }) {
    this.editor = editor
    this.scalingController = scalingController
  }

  /** Captures the original geometry of a supported Shape scale gesture. */
  public beginGesture(event: ShapeScaleInteractionEvent): boolean {
    this.finishGesture()

    const gesture = resolveShapeScaleGesture({ event })
    const pointerStart = event.scenePoint ?? event.pointer
    if (!gesture || !pointerStart) return false

    const snappingSession = this.editor.snappingManager.startRectangularScaleSnappingSession({
      pointerStart,
      transform: gesture.projectionTransform
    })
    if (!snappingSession) return false

    const { projection, runtime: snapping } = snappingSession
    this.session = Object.freeze({
      target: gesture.target,
      transform: gesture.transform,
      projection,
      snapping,
      protectedState: captureShapeState({
        target: gesture.target,
        transform: gesture.transform
      })
    })

    return true
  }

  /** Handles object:scaling before the shared handler for other object types. */
  public handleObjectScaling(event: ShapeScaleInteractionEvent): boolean {
    return this._handleScale({ event, pointSource: 'object-scaling' })
  }

  /** Handles mouse:move if Fabric did not emit object:scaling. */
  public handleCanvasMouseMove(event: ShapeScaleInteractionEvent): boolean {
    return this._handleScale({ event, pointSource: 'mouse-move' })
  }

  /** Ends the scale gesture and clears Shape state if necessary. */
  public finishGesture({
    continueWithExistingScaling = false
  }: {
    continueWithExistingScaling?: boolean
  } = {}): void {
    const { session } = this
    if (!session) return

    const finishedSession = session.snapping.finishSession()
    this.session = null
    if (!continueWithExistingScaling) {
      this.scalingController.clearState({ group: session.target })
    }
    if (finishedSession.didCleanup) {
      this.editor.snappingManager.publishVerifiedScaleGuides({ guides: [] })
    }
  }

  /** Ends the scale gesture if its Shape was removed from the canvas. */
  public finishGestureForTarget({ target }: { target: FabricObject }): boolean {
    if (!this.session || this.session.target !== target) return false

    this.finishGesture()

    return true
  }

  /** Finalizes the Fabric transform after a pointer event is canceled. */
  public interruptGesture({ event }: { event?: PointerEvent | TouchEvent } = {}): boolean {
    if (!this.session) return false

    try {
      this.editor.canvas.endCurrentTransform(event)
    } finally {
      this.finishGesture()
    }

    return true
  }

  /** Clears scale-gesture data when ShapeManager is destroyed. */
  public destroy(): void {
    this.finishGesture()
  }

  /** Handles one new pointer coordinate without modifying the Shape twice. */
  private _handleScale({
    event,
    pointSource
  }: {
    event: ShapeScaleInteractionEvent
    pointSource: ShapeScalePointSource
  }): boolean {
    const { session } = this
    if (!session) return false

    const pointerEvent = event.e
    if (!pointerEvent) return this._continueWithExistingScaling()

    const existingStep = session.snapping.getDuplicateStep({ marker: pointerEvent })
    if (existingStep) return true
    if (!this._belongsToCurrentGesture({ event, session })) return this._continueWithExistingScaling()
    if (isSideSkewStep({ session, pointerEvent })) return this._finishBeforeAnotherTransform()
    if (!isSameScaleGesture({ session })) return this._continueWithExistingScaling()

    const pointer = pointSource === 'object-scaling' ? event.pointer : event.scenePoint
    if (!pointer) return this._continueWithExistingScaling()

    const mode = resolveScaleMode({ projection: session.projection, pointerEvent })
    const rawMultipliers = resolveRectangularScalePointerMultipliers({
      projection: session.projection,
      pointer,
      mode
    })
    if (!rawMultipliers || rawMultipliers.x <= 0 || rawMultipliers.y <= 0) {
      return this._continueWithExistingScaling()
    }

    return this._applyScale({ event, pointerEvent, session, mode, rawMultipliers })
  }

  /** Checks that the event belongs to the current Shape and Fabric transform. */
  private _belongsToCurrentGesture({
    event,
    session
  }: {
    event: ShapeScaleInteractionEvent
    session: ShapeScaleInteractionSession
  }): boolean {
    if (event.transform && event.transform !== session.transform) return false
    if (event.target && event.target !== session.target) return false

    return true
  }

  /** Calculates snapping and applies scale to the Shape exactly once. */
  private _applyScale({
    event,
    pointerEvent,
    session,
    mode,
    rawMultipliers
  }: {
    event: ShapeScaleInteractionEvent
    pointerEvent: ShapeScalingPointerEvent
    session: ShapeScaleInteractionSession
    mode: RectangularScaleGestureMode
    rawMultipliers: RectangularScaleMultipliers
  }): boolean {
    const snapStep = session.snapping.resolveScalePlan({
      marker: pointerEvent,
      intent: Object.freeze({
        projectionMode: mode,
        values: createRectangularScaleValues({ mode, multipliers: rawMultipliers }),
        modifiers: readScaleModifiers({ event: pointerEvent })
      })
    })
    if (snapStep.kind === 'duplicate') return true

    try {
      const snappedMultipliers = resolveRectangularScaleMultipliers({
        t: this.editor.t,
        projectionMode: snapStep.plan.projectionMode,
        effectiveValues: snapStep.plan.effectiveValues
      })
      const appliedMultipliers = stabilizeShapeScaleMultipliers({
        t: this.editor.t,
        projection: session.projection,
        mode,
        multipliers: snappedMultipliers,
        protectedEdges: resolveSnappedEdges({ plan: snapStep.plan })
      })

      this.editor.snappingManager.markStepHandled({ marker: pointerEvent })
      this._applyScaleToShape({ event, session, appliedMultipliers })
      const appliedGeometry = this._readAppliedGeometry({ session, plan: snapStep.plan, mode })
      const result = session.snapping.verifyScalePlan({
        token: snapStep.token,
        finalGeometry: appliedGeometry
      })
      this.editor.snappingManager.publishVerifiedScaleGuides({ guides: result.guides })

      return true
    } catch (error) {
      this.finishGesture()
      throw error
    }
  }

  /** Applies the calculated scale and updates the Shape's internal layout. */
  private _applyScaleToShape({
    event,
    session,
    appliedMultipliers
  }: {
    event: ShapeScaleInteractionEvent
    session: ShapeScaleInteractionSession
    appliedMultipliers: RectangularScaleMultipliers
  }): void {
    const { target, transform, projection } = session
    const scaleX = projection.originalScales.x * appliedMultipliers.x
    const scaleY = projection.originalScales.y * appliedMultipliers.y

    target.set({ scaleX, scaleY })
    transform.scaleX = scaleX
    transform.scaleY = scaleY
    target.setPositionByOrigin(
      new Point(projection.fixedAnchor.x, projection.fixedAnchor.y),
      transform.originX,
      transform.originY
    )
    target.setCoords()

    this.scalingController.handleObjectScaling({
      target,
      transform,
      e: event.e ?? undefined
    })

    const appliedScale = this._readAppliedMultipliers({ session })
    const scaleChanged = Math.abs(appliedScale.x - 1) > SHAPE_SCALE_STATE_EPSILON
      || Math.abs(appliedScale.y - 1) > SHAPE_SCALE_STATE_EPSILON
    if (scaleChanged) transform.actionPerformed = true
  }

  /** Reads Shape geometry after applying scale. */
  private _readAppliedGeometry({
    session,
    plan,
    mode
  }: {
    session: ShapeScaleInteractionSession
    plan: ScaleSnapPlan
    mode: RectangularScaleGestureMode
  }): FinalScaleGeometry {
    const bounds = getObjectExactBounds({ t: this.editor.t, object: session.target })
    if (!bounds) throw new Error(this.editor.t('shape.errors.missingExactBoundsAfterScale'))

    const multipliers = this._readAppliedMultipliers({ session })
    const anchor = session.target.getPointByOrigin(
      session.transform.originX,
      session.transform.originY
    )

    return Object.freeze({
      bounds,
      fixedAnchor: Object.freeze({ x: anchor.x, y: anchor.y }),
      measuredValues: createRectangularScaleValues({ mode, multipliers }),
      domainVerdict: Object.freeze({
        x: didReachGuide({
          constraint: plan.constraints.x,
          bounds,
          epsilon: plan.verificationEpsilon
        }) ? 'satisfied' : 'blocked',
        y: didReachGuide({
          constraint: plan.constraints.y,
          bounds,
          epsilon: plan.verificationEpsilon
        }) ? 'satisfied' : 'blocked',
        protectedState: isShapeStatePreserved({ session, mode, multipliers })
          ? 'preserved'
          : 'changed'
      })
    })
  }

  /** Reads the applied multipliers relative to the scale at gesture start. */
  private _readAppliedMultipliers({
    session
  }: {
    session: ShapeScaleInteractionSession
  }): RectangularScaleMultipliers {
    const { target, projection } = session

    return Object.freeze({
      x: (target.scaleX ?? projection.originalScales.x) / projection.originalScales.x,
      y: (target.scaleY ?? projection.originalScales.y) / projection.originalScales.y
    })
  }

  /** Ends the new snapping flow and hands the gesture to the existing scale handler. */
  private _continueWithExistingScaling(): false {
    this.finishGesture({ continueWithExistingScaling: true })

    return false
  }

  /** Ends scaling without running it over another Fabric transform. */
  private _finishBeforeAnotherTransform(): true {
    this.finishGesture()

    return true
  }
}
