import {
  controlsUtils,
  type Control,
  type FabricObject,
  type Transform
} from 'fabric'
import type { ImageEditor } from '../..'
import {
  getObjectExactBounds,
  type ObjectBounds
} from '../../utils/geometry'
import {
  createScaleGestureBaseline,
  type FinalScaleGeometry,
  type PlannedScaleConstraint,
  type ScaleRawIntent,
  type ScaleSnapPlan,
  type VerifiedScaleGuide
} from '../../snapping-manager/scaling/scale-snapping-resolver'
import {
  ScaleSnappingRuntime,
  type ScalePlanToken
} from '../../snapping-manager/scaling/scale-snapping-runtime'
import { BackgroundTextbox } from '../background-textbox'
import type { EditorTextbox } from '../types'
import type TextScalingController from './text-scaling'
import TextCornerScaleMeasurer, {
  type TextCornerScaleMeasurement
} from './text-corner-scale-measurer'
import {
  resolveReachedTextCornerScaleFallback,
  resolveTextCornerScaleSnapMeasurement
} from './text-corner-scale-plan'
import { areTextCornerScaleCanonicalStatesEqual } from './text-corner-scale-state'
import {
  createTextCornerScaleGestureProjection,
  resolveTextCornerScalePointerMultiplier,
  TEXT_CORNER_SCALE_PROJECTION_MODE,
  type TextCornerScaleGestureProjection
} from './text-corner-scale-projection'

/** Событие Fabric, необходимое для углового скейлинга отдельного текста. */
export type TextCornerScaleInteractionEvent = Readonly<{
  target?: FabricObject | null
  e?: Event | MouseEvent | PointerEvent | TouchEvent | null
  transform?: Transform | null
  pointer?: Readonly<{ x: number; y: number }>
  scenePoint?: Readonly<{ x: number; y: number }>
}>

/** Свойства текста и преобразования, которые угловой скейлинг не должен менять. */
type TextCornerScaleProtectedState = Readonly<{
  angle: number
  controlKey: string
  flipX: boolean
  flipY: boolean
  originX: Transform['originX']
  originY: Transform['originY']
  skewX: number
  skewY: number
}>

/** Проверенные данные Fabric для поддерживаемого жеста. */
type TextCornerScaleGesture = Readonly<{
  target: EditorTextbox
  transform: Transform
}>

/** Данные активного углового скейлинга отдельного текста. */
type TextCornerScaleSession = Readonly<{
  gesture: TextCornerScaleGestureProjection
  measurer: TextCornerScaleMeasurer
  protectedState: TextCornerScaleProtectedState
  runtime: ScaleSnappingRuntime
  state: {
    lastAppliedScale: number | null
  }
  target: EditorTextbox
  transform: Transform
}>

/** Точный множитель и уточнённый план одного шага. */
type ResolvedTextCornerScaleStep = Readonly<{
  measurement: TextCornerScaleMeasurement
  plan: ScaleSnapPlan
}>

/** Источник координаты указателя в событиях Fabric. */
type TextCornerScalePointSource = 'object-scaling' | 'mouse-move'

/** Допуск при проверке неизменяемых геометрических свойств текста. */
const TEXT_CORNER_SCALE_STATE_EPSILON = 0.000000001

/** Стандартные ручки Fabric для углового скейлинга Textbox. */
const STANDARD_TEXT_CORNER_SCALE_CONTROLS: Readonly<Record<string, Control>> = Object.freeze(
  controlsUtils.createTextboxDefaultControls()
)

/** Проверяет угловую ручку пропорционального скейлинга. */
function isCornerControl({ transform }: { transform: Transform }): boolean {
  return transform.action === 'scale'
    && (transform.corner === 'tl'
      || transform.corner === 'tr'
      || transform.corner === 'bl'
      || transform.corner === 'br')
}

/** Проверяет обработчик и геометрию активной ручки по стандартному контракту Fabric. */
function isStandardTextCornerScaleControl({
  target,
  transform
}: {
  target: EditorTextbox
  transform: Transform
}): boolean {
  const control = target.controls[transform.corner]
  const standardControl = STANDARD_TEXT_CORNER_SCALE_CONTROLS[transform.corner]
  if (!control || !standardControl) return false

  const behaviorMatches = [
    control.actionHandler === standardControl.actionHandler,
    control.getActionHandler === standardControl.getActionHandler,
    control.positionHandler === standardControl.positionHandler,
    control.getTransformAnchorPoint === standardControl.getTransformAnchorPoint,
    control.transformAnchorPoint === standardControl.transformAnchorPoint
  ]
  if (!behaviorMatches.every(Boolean)) return false

  const geometryPairs = [
    [control.x, standardControl.x],
    [control.y, standardControl.y],
    [control.offsetX, standardControl.offsetX],
    [control.offsetY, standardControl.offsetY]
  ]

  return geometryPairs.every(([value, standardValue]) => {
    return Number.isFinite(value)
      && Number.isFinite(standardValue)
      && Math.abs(value - standardValue) <= TEXT_CORNER_SCALE_STATE_EPSILON
  })
}

/** Проверяет ограничения общей логики углового скейлинга текста. */
function isSupportedStandaloneText(target: FabricObject): target is EditorTextbox {
  if (!(target instanceof BackgroundTextbox) || target.group) return false
  if (target.shapeNodeType === 'text' || target.path || target.isEditing) return false
  if (Boolean(target.flipX) || Boolean(target.flipY) || Boolean(target.locked)) return false
  if (Boolean(target.lockScalingX) || Boolean(target.lockScalingY)) return false

  const scaleX = target.scaleX ?? 1
  const scaleY = target.scaleY ?? 1
  const skewX = target.skewX ?? 0
  const skewY = target.skewY ?? 0
  const strokeWidth = target.strokeWidth ?? 0

  return Number.isFinite(scaleX)
    && Number.isFinite(scaleY)
    && Number.isFinite(strokeWidth)
    && Math.abs(scaleX - 1) <= TEXT_CORNER_SCALE_STATE_EPSILON
    && Math.abs(scaleY - 1) <= TEXT_CORNER_SCALE_STATE_EPSILON
    && Math.abs(skewX) <= TEXT_CORNER_SCALE_STATE_EPSILON
    && Math.abs(skewY) <= TEXT_CORNER_SCALE_STATE_EPSILON
    && Math.abs(strokeWidth) <= TEXT_CORNER_SCALE_STATE_EPSILON
}

/** Возвращает поддерживаемый объект и преобразование одного жеста. */
function resolveTextCornerScaleGesture({
  event
}: {
  event: TextCornerScaleInteractionEvent
}): TextCornerScaleGesture | null {
  const { transform } = event
  if (!transform || !isCornerControl({ transform })) return null
  if (!isSupportedStandaloneText(transform.target)) return null
  if (!isStandardTextCornerScaleControl({ target: transform.target, transform })) return null
  if (event.target && event.target !== transform.target) return null

  return Object.freeze({
    target: transform.target,
    transform
  })
}

/** Запоминает свойства, которые должны оставаться неизменными во время жеста. */
function captureProtectedTextState({
  target,
  transform
}: TextCornerScaleGesture): TextCornerScaleProtectedState {
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

/** Читает Ctrl и Shift из текущего события указателя. */
function readScaleModifiers({
  event
}: {
  event: Event | MouseEvent | PointerEvent | TouchEvent
}): ScaleRawIntent['modifiers'] {
  return Object.freeze({
    ctrlKey: 'ctrlKey' in event && event.ctrlKey === true,
    shiftKey: 'shiftKey' in event && event.shiftKey === true
  })
}

/** Проверяет, что свойства объекта и преобразования всё ещё относятся к исходному жесту. */
function isSameScaleGesture({ session }: { session: TextCornerScaleSession }): boolean {
  const { protectedState, target, transform } = session

  return transform.target === target
    && transform.corner === protectedState.controlKey
    && transform.originX === protectedState.originX
    && transform.originY === protectedState.originY
    && Math.abs((target.angle ?? 0) - protectedState.angle) <= TEXT_CORNER_SCALE_STATE_EPSILON
    && Math.abs((target.skewX ?? 0) - protectedState.skewX) <= TEXT_CORNER_SCALE_STATE_EPSILON
    && Math.abs((target.skewY ?? 0) - protectedState.skewY) <= TEXT_CORNER_SCALE_STATE_EPSILON
    && Boolean(target.flipX) === protectedState.flipX
    && Boolean(target.flipY) === protectedState.flipY
}

/** Проверяет, что выбранная направляющая достигнута после применения размера текста. */
function didReachGuide({
  bounds,
  constraint,
  epsilon
}: {
  bounds: ObjectBounds
  constraint: PlannedScaleConstraint | null
  epsilon: number
}): boolean {
  if (!constraint) return true

  return Math.abs(bounds[constraint.candidate.edge] - constraint.expectedPosition) <= epsilon
}

/** Управляет угловым скейлингом отдельного текста и общей логикой прилипания. */
export default class TextCornerScaleInteractionController {
  /** Редактор, из которого берутся холст и SnappingManager. */
  private readonly editor: ImageEditor

  /** Единственный владелец канонических свойств скейлинга текста. */
  private readonly scalingController: TextScalingController

  /** Текущий поддерживаемый жест или null для прежней логики. */
  private session: TextCornerScaleSession | null = null

  /** Принимает зависимости, необходимые для расчёта и применения скейлинга. */
  constructor({
    editor,
    scalingController
  }: {
    editor: ImageEditor
    scalingController: TextScalingController
  }) {
    this.editor = editor
    this.scalingController = scalingController
  }

  /** Фиксирует исходную геометрию поддерживаемого углового скейлинга текста. */
  public beginGesture(event: TextCornerScaleInteractionEvent): boolean {
    this.finishGesture()

    const resolved = resolveTextCornerScaleGesture({ event })
    const pointerStart = event.scenePoint ?? event.pointer
    if (!resolved || !pointerStart) return false

    resolved.target.setCoords()
    const gesture = createTextCornerScaleGestureProjection({
      textbox: resolved.target,
      transform: resolved.transform,
      pointerStart
    })
    if (!gesture) return false
    if (!this.scalingController.beginStandaloneCornerScale(resolved)) return false

    try {
      this.session = this._createSession({ gesture, resolved })
    } catch (error) {
      this.scalingController.clearStandaloneCornerScale({ target: resolved.target })
      throw error
    }

    return true
  }

  /** Обрабатывает штатное событие `object:scaling`. */
  public handleObjectScaling(event: TextCornerScaleInteractionEvent): boolean {
    return this._handleScale({ event, pointSource: 'object-scaling' })
  }

  /** Обрабатывает движение мыши, если Fabric не отправил `object:scaling`. */
  public handleCanvasMouseMove(event: TextCornerScaleInteractionEvent): boolean {
    return this._handleScale({ event, pointSource: 'mouse-move' })
  }

  /** Завершает активный жест и очищает его временное состояние. */
  public finishGesture({
    continueWithExistingScaling = false
  }: {
    continueWithExistingScaling?: boolean
  } = {}): boolean {
    const { session } = this
    if (!session) return false

    const cleanup = session.runtime.finishSession()
    session.measurer.dispose()
    this.session = null
    if (continueWithExistingScaling) {
      this.scalingController.prepareStandaloneCornerScaleForLegacyCommit({ target: session.target })
    } else {
      this.scalingController.clearStandaloneCornerScale({ target: session.target })
    }
    if (cleanup.didCleanup) {
      this.editor.snappingManager.publishVerifiedScaleGuides({ guides: [] })
    }

    return true
  }

  /** Завершает жест только при удалении его текста. */
  public finishGestureForTarget({ target }: { target: FabricObject }): boolean {
    if (!this.session || this.session.target !== target) return false

    return this.finishGesture()
  }

  /** Прерывает преобразование Fabric после отмены события указателя. */
  public interruptGesture({ event }: { event?: PointerEvent | TouchEvent } = {}): boolean {
    if (!this.session) return false

    try {
      this.editor.canvas.endCurrentTransform(event)
    } finally {
      this.finishGesture()
    }

    return true
  }

  /** Создаёт окружение прилипания и измеритель для одного жеста. */
  private _createSession({
    gesture,
    resolved
  }: {
    gesture: TextCornerScaleGestureProjection
    resolved: TextCornerScaleGesture
  }): TextCornerScaleSession {
    const environment = this.editor.snappingManager.captureScaleSnapEnvironment({
      activeObject: resolved.target,
      targetEdges: gesture.movingEdges
    })
    const baseline = createScaleGestureBaseline({
      bounds: gesture.baselineBounds,
      fixedAnchor: gesture.fixedAnchor,
      projectionModes: [gesture.projectionMode],
      candidates: environment.candidates,
      zoom: environment.zoom
    })
    const runtime = new ScaleSnappingRuntime()
    runtime.startSession({ baseline })

    return Object.freeze({
      gesture,
      measurer: new TextCornerScaleMeasurer({
        canvasManager: this.editor.canvasManager,
        gesture,
        target: resolved.target,
        transform: resolved.transform
      }),
      protectedState: captureProtectedTextState(resolved),
      runtime,
      state: { lastAppliedScale: null },
      target: resolved.target,
      transform: resolved.transform
    })
  }

  /** Рассчитывает и применяет одну новую координату указателя. */
  private _handleScale({
    event,
    pointSource
  }: {
    event: TextCornerScaleInteractionEvent
    pointSource: TextCornerScalePointSource
  }): boolean {
    const { session } = this
    if (!session) return false

    const pointerEvent = event.e
    if (!pointerEvent) return this._continueWithExistingScaling()

    const duplicate = session.runtime.getDuplicateStep({ marker: pointerEvent })
    if (duplicate) return true
    if (!this._belongsToCurrentGesture({ event, session })) return this._continueWithExistingScaling()
    if (!isSameScaleGesture({ session })) return this._continueWithExistingScaling()

    const pointer = pointSource === 'object-scaling' ? event.pointer : event.scenePoint
    if (!pointer) return this._continueWithExistingScaling()

    const scale = resolveTextCornerScalePointerMultiplier({ gesture: session.gesture, pointer })
    if (scale === null) return this._continueWithExistingScaling()

    return this._applyScale({ pointerEvent, scale, session })
  }

  /** Проверяет, что событие относится к текущему тексту и преобразованию Fabric. */
  private _belongsToCurrentGesture({
    event,
    session
  }: {
    event: TextCornerScaleInteractionEvent
    session: TextCornerScaleSession
  }): boolean {
    if (event.transform && event.transform !== session.transform) return false
    if (event.target && event.target !== session.target) return false

    return true
  }

  /** Рассчитывает прилипание и ровно один раз применяет канонические свойства текста. */
  private _applyScale({
    pointerEvent,
    scale,
    session
  }: {
    pointerEvent: Event | MouseEvent | PointerEvent | TouchEvent
    scale: number
    session: TextCornerScaleSession
  }): boolean {
    try {
      const measurement = session.measurer.measure({ scale })
      const step = session.runtime.resolveScalePlan({
        marker: pointerEvent,
        intent: Object.freeze({
          projectionMode: TEXT_CORNER_SCALE_PROJECTION_MODE,
          values: Object.freeze([measurement.scale]),
          modifiers: readScaleModifiers({ event: pointerEvent })
        }),
        stepProjection: measurement.projection
      })
      if (step.kind === 'duplicate') return true

      const resolved = this._resolveScaleStep({
        plan: step.plan,
        pointerMeasurement: measurement,
        session,
        token: step.token
      })
      this.editor.snappingManager.markScaleStepHandled({ marker: pointerEvent })
      const guides = this._applyAndVerifyScale({ resolved, session, token: step.token })
      this.editor.snappingManager.publishVerifiedScaleGuides({ guides })

      return true
    } catch (error) {
      this.finishGesture()
      throw error
    }
  }

  /** Уточняет выбранное прилипание по канонической геометрии текста. */
  private _resolveScaleStep({
    plan,
    pointerMeasurement,
    session,
    token
  }: {
    plan: ScaleSnapPlan
    pointerMeasurement: TextCornerScaleMeasurement
    session: TextCornerScaleSession
    token: ScalePlanToken
  }): ResolvedTextCornerScaleStep {
    if (!plan.refinementCandidates.x && !plan.refinementCandidates.y) {
      return Object.freeze({ measurement: pointerMeasurement, plan })
    }

    const preferredScale = this._resolvePreferredHeldScale({ plan, session })
    const snappedMeasurement = resolveTextCornerScaleSnapMeasurement({
      measurer: session.measurer,
      plan,
      preferredScale
    })
    const resolved = snappedMeasurement
      ? Object.freeze({
        constraints: plan.refinementCandidates,
        measurement: snappedMeasurement
      })
      : resolveReachedTextCornerScaleFallback({
        measurer: session.measurer,
        plan,
        pointerMeasurement,
        preferredScale
      })

    const refinedPlan = session.runtime.refineScalePlan({
      token,
      refinement: Object.freeze({
        constraints: resolved.constraints,
        effectiveValues: Object.freeze([resolved.measurement.scale]),
        stepProjection: resolved.measurement.projection
      })
    })

    return Object.freeze({ measurement: resolved.measurement, plan: refinedPlan })
  }

  /** Возвращает последний подтверждённый размер только внутри текущего удержания. */
  private _resolvePreferredHeldScale({
    plan,
    session
  }: {
    plan: ScaleSnapPlan
    session: TextCornerScaleSession
  }): number | undefined {
    const hasHeldConstraint = plan.constraints.x?.transition === 'held'
      || plan.constraints.y?.transition === 'held'

    return hasHeldConstraint ? session.state.lastAppliedScale ?? undefined : undefined
  }

  /** Применяет план к тексту на холсте и проверяет фактическую геометрию. */
  private _applyAndVerifyScale({
    resolved,
    session,
    token
  }: {
    resolved: ResolvedTextCornerScaleStep
    session: TextCornerScaleSession
    token: ScalePlanToken
  }): readonly VerifiedScaleGuide[] {
    const applied = this.scalingController.applyStandaloneCornerScale({
      fixedAnchor: session.gesture.fixedAnchor,
      scale: resolved.measurement.scale,
      target: session.target,
      transform: session.transform
    })
    const finalGeometry = this._readFinalGeometry({
      matchesExpectedState: areTextCornerScaleCanonicalStatesEqual({
        actual: applied.canonicalState,
        expected: resolved.measurement.canonicalState
      }),
      plan: resolved.plan,
      scale: applied.scale,
      session
    })
    const verification = session.runtime.verifyScalePlan({ token, finalGeometry })
    session.state.lastAppliedScale = applied.scale

    return verification.guides
  }

  /** Читает итоговые границы, неподвижную точку и результат шага. */
  private _readFinalGeometry({
    matchesExpectedState,
    plan,
    scale,
    session
  }: {
    matchesExpectedState: boolean
    plan: ScaleSnapPlan
    scale: number
    session: TextCornerScaleSession
  }): FinalScaleGeometry {
    const bounds = getObjectExactBounds({ object: session.target })
    if (!bounds) throw new Error('Текст должен иметь точные границы после скейлинга')

    const anchor = session.target.getPointByOrigin(
      session.transform.originX,
      session.transform.originY
    )

    return Object.freeze({
      bounds,
      fixedAnchor: Object.freeze({ x: anchor.x, y: anchor.y }),
      measuredValues: Object.freeze([scale]),
      domainVerdict: Object.freeze({
        x: didReachGuide({ bounds, constraint: plan.constraints.x, epsilon: plan.verificationEpsilon })
          ? 'satisfied'
          : 'blocked',
        y: didReachGuide({ bounds, constraint: plan.constraints.y, epsilon: plan.verificationEpsilon })
          ? 'satisfied'
          : 'blocked',
        protectedState: isSameScaleGesture({ session }) && matchesExpectedState
          ? 'preserved'
          : 'changed'
      })
    })
  }

  /** Завершает общую обработку и передаёт текущий жест прежней логике. */
  private _continueWithExistingScaling(): false {
    this.finishGesture({ continueWithExistingScaling: true })

    return false
  }
}
