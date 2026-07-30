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
  createScaleGestureBaseline,
  type FinalScaleGeometry,
  type PlannedScaleConstraint,
  type ScaleRawIntent,
  type ScaleSnapPlan
} from '../../snapping-manager/scaling/scale-snapping-resolver'
import { ScaleSnappingRuntime } from '../../snapping-manager/scaling/scale-snapping-runtime'
import type { ScaleSceneEdge } from '../../snapping-manager/scaling/scale-projection'
import {
  createRectangularScaleGestureProjection,
  createRectangularScaleProjectionModes,
  createRectangularScaleValues,
  resolveRectangularScaleMovingEdges,
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

/** Данные события, необходимые для scale одиночного Shape. */
export type ShapeScaleInteractionEvent = Readonly<{
  target?: FabricObject | null
  e?: ShapeScalingPointerEvent | null
  transform?: Transform | null
  pointer?: RectangularScalePoint
  scenePoint?: RectangularScalePoint
}>

/** Свойства Shape, которые должны оставаться неизменными во время scale. */
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

/** Проверенные данные Fabric для поддерживаемого scale-жеста. */
type ShapeScaleGesture = Readonly<{
  target: ShapeGroup
  transform: Transform
  projectionTransform: RectangularScaleGestureTransform
}>

/** Данные активного scale-жеста одиночного Shape. */
type ShapeScaleInteractionSession = Readonly<{
  target: ShapeGroup
  transform: Transform
  projection: RectangularScaleGestureProjection
  snapping: ScaleSnappingRuntime
  protectedState: ShapeScaleProtectedState
}>

/** Событие, из которого берётся текущая координата указателя. */
type ShapeScalePointSource = 'object-scaling' | 'mouse-move'

/** Допуск при сравнении scale и свойств Shape. */
const SHAPE_SCALE_STATE_EPSILON = 0.000000001

/** Проверяет доменные и affine-ограничения нового Shape scale owner. */
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

/** Проверяет Fabric transform и возвращает данные scale-жеста Shape. */
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

/** Запоминает свойства Shape, которые scale не должен менять. */
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

/** Выбирает режим scale по ручке и нажатому Shift. */
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

/** Читает модификаторы текущего события указателя. */
function readScaleModifiers({ event }: { event: ShapeScalingPointerEvent }): ScaleRawIntent['modifiers'] {
  return Object.freeze({
    ctrlKey: 'ctrlKey' in event && event.ctrlKey === true,
    shiftKey: 'shiftKey' in event && event.shiftKey === true
  })
}

/** Возвращает грани, зафиксированные на guide. */
function resolveSnappedEdges({ plan }: { plan: ScaleSnapPlan }): readonly ScaleSceneEdge[] {
  const edges = new Set<ScaleSceneEdge>()
  if (plan.constraints.x) edges.add(plan.constraints.x.candidate.edge)
  if (plan.constraints.y) edges.add(plan.constraints.y.candidate.edge)

  return Object.freeze([...edges])
}

/** Проверяет, что грань Shape действительно дошла до guide. */
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

/** Проверяет, что Fabric не переключил текущий scale на другое преобразование. */
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

/** Проверяет, что модификатор переключил боковую ручку со scale на skew. */
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

/** Проверяет свойства Shape и оси, которые текущая ручка не должна менять. */
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
 * Рассчитывает snapping, применяет scale к Shape и проверяет получившуюся геометрию.
 */
export default class ShapeScaleInteractionController {
  /** Редактор, из которого берутся canvas и SnappingManager. */
  private readonly editor: ImageEditor

  /** Контроллер, который обновляет размеры и внутренний layout Shape. */
  private readonly scalingController: ShapeScalingController

  /** Текущий scale-жест или null, если этот сценарий остаётся на прежней обработке. */
  private session: ShapeScaleInteractionSession | null = null

  /** Принимает зависимости, необходимые для обработки scale. */
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

  /** Запоминает исходную геометрию поддерживаемого scale-жеста Shape. */
  public beginGesture(event: ShapeScaleInteractionEvent): boolean {
    this.finishGesture()

    const gesture = resolveShapeScaleGesture({ event })
    const pointerStart = event.scenePoint ?? event.pointer
    if (!gesture || !pointerStart) return false

    gesture.target.setCoords()
    const projection = createRectangularScaleGestureProjection({
      transform: gesture.projectionTransform,
      pointerStart
    })
    if (!projection) return false

    const snappingModes = createRectangularScaleProjectionModes({ projection })
    const snappingEnvironment = this.editor.snappingManager.captureScaleSnapEnvironment({
      activeObject: gesture.target,
      targetEdges: resolveRectangularScaleMovingEdges({ projectionModes: snappingModes })
    })
    const initialGeometry = createScaleGestureBaseline({
      bounds: projection.baselineBounds,
      fixedAnchor: projection.fixedAnchor,
      projectionModes: snappingModes,
      candidates: snappingEnvironment.candidates,
      zoom: snappingEnvironment.zoom
    })
    const snapping = new ScaleSnappingRuntime()
    snapping.startSession({ baseline: initialGeometry })
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

  /** Обрабатывает object:scaling до общего обработчика остальных типов объектов. */
  public handleObjectScaling(event: ShapeScaleInteractionEvent): boolean {
    return this._handleScale({ event, pointSource: 'object-scaling' })
  }

  /** Обрабатывает mouse:move, если Fabric не отправил object:scaling. */
  public handleCanvasMouseMove(event: ShapeScaleInteractionEvent): boolean {
    return this._handleScale({ event, pointSource: 'mouse-move' })
  }

  /** Завершает scale-жест и при необходимости очищает состояние Shape. */
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

  /** Завершает scale-жест, если с canvas удалён его Shape. */
  public finishGestureForTarget({ target }: { target: FabricObject }): boolean {
    if (!this.session || this.session.target !== target) return false

    this.finishGesture()

    return true
  }

  /** Завершает Fabric transform после отмены события указателя. */
  public interruptGesture({ event }: { event?: PointerEvent | TouchEvent } = {}): boolean {
    if (!this.session) return false

    try {
      this.editor.canvas.endCurrentTransform(event)
    } finally {
      this.finishGesture()
    }

    return true
  }

  /** Очищает данные scale-жеста при уничтожении ShapeManager. */
  public destroy(): void {
    this.finishGesture()
  }

  /** Обрабатывает одну новую координату указателя без повторного изменения Shape. */
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

  /** Проверяет, что событие относится к текущему Shape и Fabric transform. */
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

  /** Рассчитывает snapping и ровно один раз применяет scale к Shape. */
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
        projectionMode: snapStep.plan.projectionMode,
        effectiveValues: snapStep.plan.effectiveValues
      })
      const appliedMultipliers = stabilizeShapeScaleMultipliers({
        projection: session.projection,
        mode,
        multipliers: snappedMultipliers,
        protectedEdges: resolveSnappedEdges({ plan: snapStep.plan })
      })

      this.editor.snappingManager.markScaleStepHandled({ marker: pointerEvent })
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

  /** Применяет рассчитанный scale и обновляет внутренний layout Shape. */
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

  /** Читает геометрию Shape после применения scale. */
  private _readAppliedGeometry({
    session,
    plan,
    mode
  }: {
    session: ShapeScaleInteractionSession
    plan: ScaleSnapPlan
    mode: RectangularScaleGestureMode
  }): FinalScaleGeometry {
    const bounds = getObjectExactBounds({ object: session.target })
    if (!bounds) throw new Error('Shape must have exact bounds after scale')

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

  /** Читает применённые множители относительно scale в начале жеста. */
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

  /** Завершает новый snapping и передаёт жест существующему обработчику scale. */
  private _continueWithExistingScaling(): false {
    this.finishGesture({ continueWithExistingScaling: true })

    return false
  }

  /** Завершает scale, не запуская его поверх другого преобразования Fabric. */
  private _finishBeforeAnotherTransform(): true {
    this.finishGesture()

    return true
  }
}
