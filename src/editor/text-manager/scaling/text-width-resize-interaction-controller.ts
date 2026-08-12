import {
  controlsUtils,
  Point,
  type FabricObject,
  type TPointerEvent,
  type Transform
} from 'fabric'
import type { ImageEditor } from '../..'
import { getObjectExactBounds, type ObjectBounds } from '../../utils/geometry'
import {
  createScaleGestureBaseline,
  type FinalScaleGeometry,
  type PlannedScaleConstraint,
  type ScaleSnapPlan,
  type VerifiedScaleGuide
} from '../../snapping-manager/scaling/scale-snapping-resolver'
import {
  ScaleSnappingRuntime,
  type ScalePlanToken
} from '../../snapping-manager/scaling/scale-snapping-runtime'
import type { EditorTextbox } from '../types'
import { BackgroundTextbox } from '../background-textbox'
import { applyCanonicalTextboxWidth, MINIMUM_TEXT_WIDTH } from './text-width-materialization'
import TextWidthResizeMeasurer, {
  type TextWidthResizeMeasurement
} from './text-width-resize-measurer'
import { resolveTextWidthSnapMeasurement } from './text-width-resize-plan'
import {
  createTextWidthResizeGestureProjection,
  TEXT_WIDTH_PROJECTION_MODE,
  type TextWidthResizeGestureProjection
} from './text-width-resize-projection'

/** Данные события Fabric, необходимые для изменения ширины отдельного текста. */
export type TextWidthResizeInteractionEvent = Readonly<{
  target?: FabricObject | null
  e?: TPointerEvent | null
  transform?: Transform | null
}>

/** Свойства текста и трансформации, которые изменение ширины не должно менять. */
type TextWidthResizeProtectedState = Readonly<{
  angle: number
  controlKey: string
  flipX: boolean
  flipY: boolean
  fontSize: number
  originX: Transform['originX']
  originY: Transform['originY']
  paddingBottom: number
  paddingLeft: number
  paddingRight: number
  paddingTop: number
  radiusBottomLeft: number
  radiusBottomRight: number
  radiusTopLeft: number
  radiusTopRight: number
  scaleX: number
  scaleY: number
  skewX: number
  skewY: number
}>

/** Временное состояние одного активного изменения ширины текста. */
type TextWidthResizeSession = Readonly<{
  measurer: TextWidthResizeMeasurer
  projection: TextWidthResizeGestureProjection
  protectedState: TextWidthResizeProtectedState
  runtime: ScaleSnappingRuntime
  target: EditorTextbox
  transform: Transform
}>

/** Ширина и уточнённый план после пересчёта переноса строк. */
type ResolvedTextWidthResizeStep = Readonly<{
  plan: ScaleSnapPlan
  width: number
}>

/** Допуск при проверке свойств текста и неподвижной точки. */
const TEXT_WIDTH_RESIZE_STATE_EPSILON = 0.000000001

/** Проверяет, что событие относится к отдельному Textbox. */
function resolveStandaloneTextbox({
  event
}: {
  event: TextWidthResizeInteractionEvent
}): EditorTextbox | null {
  const { target } = event
  if (!(target instanceof BackgroundTextbox) || target.group) return null
  if (target.shapeNodeType === 'text') return null

  return target
}

/** Запоминает значения, которые изменение ширины не должно затрагивать. */
function captureProtectedTextState({
  target,
  transform
}: {
  target: EditorTextbox
  transform: Transform
}): TextWidthResizeProtectedState {
  return Object.freeze({
    angle: target.angle ?? 0,
    controlKey: transform.corner,
    flipX: Boolean(target.flipX),
    flipY: Boolean(target.flipY),
    fontSize: target.fontSize ?? 16,
    originX: transform.originX,
    originY: transform.originY,
    paddingBottom: target.paddingBottom ?? 0,
    paddingLeft: target.paddingLeft ?? 0,
    paddingRight: target.paddingRight ?? 0,
    paddingTop: target.paddingTop ?? 0,
    radiusBottomLeft: target.radiusBottomLeft ?? 0,
    radiusBottomRight: target.radiusBottomRight ?? 0,
    radiusTopLeft: target.radiusTopLeft ?? 0,
    radiusTopRight: target.radiusTopRight ?? 0,
    scaleX: target.scaleX ?? 1,
    scaleY: target.scaleY ?? 1,
    skewX: target.skewX ?? 0,
    skewY: target.skewY ?? 0
  })
}

/** Проверяет, что изменение ширины выполняется относительно центра объекта. */
function isCenteredResize({ transform }: { transform: Transform }): boolean {
  const isCenterOrigin = (origin: Transform['originX'] | Transform['originY']): boolean => {
    return origin === 'center' || origin === 0.5
  }

  return isCenterOrigin(transform.originX) && isCenterOrigin(transform.originY)
}

/** Возвращает каноническую ширину из точного положения указателя. */
function resolvePointerTextWidth({
  session,
  scenePoint
}: {
  session: TextWidthResizeSession
  scenePoint?: Readonly<{ x: number; y: number }> | null
}): number | null {
  const { target, transform } = session
  const { width, scaleX = 1 } = target
  if (!Number.isFinite(width) || !Number.isFinite(scaleX) || scaleX <= 0) return null

  const horizontalPadding = (target.paddingLeft ?? 0) + (target.paddingRight ?? 0)
  if (!scenePoint) {
    const pointerWidth = width - horizontalPadding

    return Number.isFinite(pointerWidth) ? Math.max(MINIMUM_TEXT_WIDTH, pointerWidth) : null
  }

  const localPoint = controlsUtils.getLocalPoint(
    transform,
    transform.originX,
    transform.originY,
    scenePoint.x,
    scenePoint.y
  )
  const expectedDirection = transform.corner === 'mr' ? 1 : -1
  if ((localPoint.x * expectedDirection) <= 0) return null

  const multiplier = isCenteredResize({ transform }) ? 2 : 1
  const strokePadding = (target.strokeWidth ?? 0) / (target.strokeUniform ? scaleX : 1)
  const nativeWidth = Math.abs((localPoint.x * multiplier) / scaleX) - strokePadding
  const pointerWidth = nativeWidth - horizontalPadding

  return Number.isFinite(pointerWidth) ? Math.max(MINIMUM_TEXT_WIDTH, pointerWidth) : null
}

/** Читает состояние Ctrl из текущего события указателя. */
function isSnappingDisabled({ event }: { event?: TPointerEvent | null }): boolean {
  return Boolean(event && 'ctrlKey' in event && event.ctrlKey === true)
}

/** Проверяет, что свойства объекта и трансформации всё ещё относятся к исходному жесту. */
function isSameResizeGesture({ session }: { session: TextWidthResizeSession }): boolean {
  const { protectedState, target, transform } = session

  return transform.target === target
    && transform.corner === protectedState.controlKey
    && transform.originX === protectedState.originX
    && transform.originY === protectedState.originY
    && Math.abs((target.angle ?? 0) - protectedState.angle) <= TEXT_WIDTH_RESIZE_STATE_EPSILON
    && Math.abs((target.scaleX ?? 1) - protectedState.scaleX) <= TEXT_WIDTH_RESIZE_STATE_EPSILON
    && Math.abs((target.scaleY ?? 1) - protectedState.scaleY) <= TEXT_WIDTH_RESIZE_STATE_EPSILON
}

/** Применяет ширину, пересчитывает перенос строк и восстанавливает неподвижную точку. */
function applyTextWidth({
  session,
  width
}: {
  session: TextWidthResizeSession
  width: number
}): void {
  const { fixedAnchor } = session.projection
  const { target, transform } = session
  applyCanonicalTextboxWidth({ textbox: target, width })

  target.setPositionByOrigin(
    new Point(fixedAnchor.x, fixedAnchor.y),
    transform.originX,
    transform.originY
  )
  target.setCoords()
  target.dirty = true
}

/** Проверяет, что выбранная направляющая достигнута после пересчёта текста. */
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

/** Проверяет все свойства, которые изменение ширины не должно менять. */
function isProtectedTextStatePreserved({ session }: { session: TextWidthResizeSession }): boolean {
  const { protectedState, target } = session
  const currentValues = [
    target.angle ?? 0,
    target.fontSize ?? 16,
    target.paddingBottom ?? 0,
    target.paddingLeft ?? 0,
    target.paddingRight ?? 0,
    target.paddingTop ?? 0,
    target.radiusBottomLeft ?? 0,
    target.radiusBottomRight ?? 0,
    target.radiusTopLeft ?? 0,
    target.radiusTopRight ?? 0,
    target.scaleX ?? 1,
    target.scaleY ?? 1,
    target.skewX ?? 0,
    target.skewY ?? 0
  ]
  const initialValues = [
    protectedState.angle,
    protectedState.fontSize,
    protectedState.paddingBottom,
    protectedState.paddingLeft,
    protectedState.paddingRight,
    protectedState.paddingTop,
    protectedState.radiusBottomLeft,
    protectedState.radiusBottomRight,
    protectedState.radiusTopLeft,
    protectedState.radiusTopRight,
    protectedState.scaleX,
    protectedState.scaleY,
    protectedState.skewX,
    protectedState.skewY
  ]

  return currentValues.every((value, index) => {
    return Math.abs(value - initialValues[index]) <= TEXT_WIDTH_RESIZE_STATE_EPSILON
  }) && Boolean(target.flipX) === protectedState.flipX
    && Boolean(target.flipY) === protectedState.flipY
}

/** Читает итоговую геометрию после применения плана изменения ширины. */
function readFinalTextGeometry({
  plan,
  session
}: {
  plan: ScaleSnapPlan
  session: TextWidthResizeSession
}): FinalScaleGeometry | null {
  const { target, transform } = session
  const bounds = getObjectExactBounds({ object: target })
  const { width } = target
  if (!bounds || !Number.isFinite(width)) return null

  const fixedAnchor = target.getPointByOrigin(transform.originX, transform.originY)
  const protectedState = isProtectedTextStatePreserved({ session }) ? 'preserved' : 'changed'

  return Object.freeze({
    bounds,
    fixedAnchor: Object.freeze({ x: fixedAnchor.x, y: fixedAnchor.y }),
    measuredValues: Object.freeze([width]),
    domainVerdict: Object.freeze({
      x: didReachGuide({ constraint: plan.constraints.x, bounds, epsilon: plan.verificationEpsilon })
        ? 'satisfied'
        : 'blocked',
      y: didReachGuide({ constraint: plan.constraints.y, bounds, epsilon: plan.verificationEpsilon })
        ? 'satisfied'
        : 'blocked',
      protectedState
    })
  })
}

/**
 * Управляет изменением ширины отдельного Textbox и общим состоянием удержания направляющих.
 */
export default class TextWidthResizeInteractionController {
  /** Редактор и общее окружение прилипания. */
  private readonly editor: ImageEditor

  /** Текущий поддержанный жест или null вне изменения ширины текста. */
  private session: TextWidthResizeSession | null = null

  /** Создаёт контроллер изменения ширины текста. */
  constructor({ editor }: { editor: ImageEditor }) {
    this.editor = editor
  }

  /** Фиксирует исходную геометрию поддерживаемого жеста. */
  public beginGesture(event: TextWidthResizeInteractionEvent): boolean {
    this.finishGesture()

    const target = resolveStandaloneTextbox({ event })
    const { transform } = event
    if (!target || !transform) return false

    target.setCoords()
    const projection = createTextWidthResizeGestureProjection({ textbox: target, transform })
    if (!projection) return false

    const environment = this.editor.snappingManager.captureScaleSnapEnvironment({
      activeObject: target,
      targetEdges: projection.movingEdges
    })
    const baseline = createScaleGestureBaseline({
      bounds: projection.baselineBounds,
      fixedAnchor: projection.fixedAnchor,
      projectionModes: projection.projectionModes,
      candidates: environment.candidates,
      zoom: environment.zoom
    })
    const runtime = new ScaleSnappingRuntime()
    runtime.startSession({ baseline })
    this.session = Object.freeze({
      measurer: new TextWidthResizeMeasurer({ target, gesture: projection }),
      projection,
      protectedState: captureProtectedTextState({ target, transform }),
      runtime,
      target,
      transform
    })

    return true
  }

  /** Рассчитывает, применяет и проверяет один штатный шаг `object:resizing`. */
  public handleObjectResizing(event: TextWidthResizeInteractionEvent): boolean {
    try {
      return this._handleObjectResizing(event)
    } catch (error) {
      this.finishGesture()
      throw error
    }
  }

  /** Выполняет один поддержанный шаг изменения ширины текста. */
  private _handleObjectResizing(event: TextWidthResizeInteractionEvent): boolean {
    const { session } = this
    if (!session) return false
    if (event.target !== session.target || event.transform !== session.transform) {
      return this._finishUnsupportedResizeSession()
    }
    if (!isSameResizeGesture({ session })) return this._finishUnsupportedResizeSession()
    if (!isProtectedTextStatePreserved({ session })) return this._finishUnsupportedResizeSession()

    const marker = event.e ?? event
    const duplicate = session.runtime.getDuplicateStep({ marker })
    if (duplicate) {
      const guides = duplicate.verification?.guides ?? []
      if (duplicate.verification) {
        this.editor.snappingManager.publishVerifiedScaleGuides({ guides })
      }

      return true
    }

    const measurement = this._measurePointerStep({ event, session })
    if (!measurement) return this._finishUnsupportedResizeSession()

    this._applyPointerStep({
      event,
      marker,
      measurement,
      session
    })

    return true
  }

  /** Измеряет точную геометрию текста для текущего положения указателя. */
  private _measurePointerStep({
    event,
    session
  }: {
    event: TextWidthResizeInteractionEvent
    session: TextWidthResizeSession
  }): TextWidthResizeMeasurement | null {
    const scenePoint = event.e ? this.editor.canvas.getScenePoint(event.e) : null
    const pointerWidth = resolvePointerTextWidth({ session, scenePoint })
    if (pointerWidth === null) return null

    return session.measurer.measure({ width: pointerWidth })
  }

  /** Рассчитывает, применяет и проверяет один новый шаг указателя. */
  private _applyPointerStep({
    event,
    marker,
    measurement,
    session
  }: {
    event: TextWidthResizeInteractionEvent
    marker: object
    measurement: TextWidthResizeMeasurement
    session: TextWidthResizeSession
  }): void {
    const step = session.runtime.resolveScalePlan({
      marker,
      stepProjection: measurement.projection,
      intent: Object.freeze({
        projectionMode: TEXT_WIDTH_PROJECTION_MODE,
        values: Object.freeze([measurement.width]),
        modifiers: Object.freeze({
          ctrlKey: isSnappingDisabled({ event: event.e }),
          shiftKey: false
        })
      })
    })
    if (step.kind === 'duplicate') {
      throw new Error('Шаг изменения ширины не должен повторно становиться дубликатом после первой проверки')
    }

    const resolvedStep = this._resolveTextWidthStep({
      plan: step.plan,
      session,
      token: step.token,
      pointerWidth: measurement.width
    })
    const guides = this._applyAndVerifyStep({
      plan: resolvedStep.plan,
      session,
      token: step.token,
      width: resolvedStep.width
    })
    if (!guides) {
      throw new Error('Не удалось применить и проверить план изменения ширины текста')
    }

    this.editor.snappingManager.publishVerifiedScaleGuides({ guides })
    this.editor.canvas.requestRenderAll()
  }

  /** Идемпотентно завершает активное изменение ширины и очищает направляющие. */
  public finishGesture(): boolean {
    const { session } = this
    const didCleanup = session?.runtime.finishSession().didCleanup ?? false
    session?.measurer.dispose()
    this.session = null

    if (didCleanup) this.editor.snappingManager.publishVerifiedScaleGuides({ guides: [] })

    return didCleanup
  }

  /** Завершает сессию только при удалении её Textbox. */
  public finishGestureForTarget({ target }: { target: FabricObject }): boolean {
    if (!this.session || this.session.target !== target) return false

    this.finishGesture()

    return true
  }

  /** Прерывает трансформацию Fabric после отмены события указателя. */
  public interruptGesture({ event }: { event?: PointerEvent | TouchEvent } = {}): boolean {
    if (!this.session) return false

    try {
      this.editor.canvas.endCurrentTransform(event)
    } finally {
      this.finishGesture()
    }

    return true
  }

  /** Применяет рассчитанную ширину и проверяет фактическую геометрию. */
  private _applyAndVerifyStep({
    plan,
    session,
    token,
    width
  }: {
    plan: ScaleSnapPlan
    session: TextWidthResizeSession
    token: ScalePlanToken
    width: number
  }): readonly VerifiedScaleGuide[] | null {
    applyTextWidth({ session, width })
    const finalGeometry = readFinalTextGeometry({ plan, session })
    if (!finalGeometry) return null

    const verification = session.runtime.verifyScalePlan({ token, finalGeometry })

    return verification.guides
  }

  /** Уточняет выбранное прилипание по переносу строк без изменения живого Textbox. */
  private _resolveTextWidthStep({
    plan,
    session,
    token,
    pointerWidth
  }: {
    plan: ScaleSnapPlan
    session: TextWidthResizeSession
    token: ScalePlanToken
    pointerWidth: number
  }): ResolvedTextWidthResizeStep {
    if (!plan.constraints.x && !plan.constraints.y) {
      return Object.freeze({ plan, width: pointerWidth })
    }

    const measurement = resolveTextWidthSnapMeasurement({ plan, measurer: session.measurer })
    if (!measurement) return Object.freeze({ plan, width: pointerWidth })

    const refinedPlan = session.runtime.refineScalePlan({
      token,
      refinement: Object.freeze({
        effectiveValues: Object.freeze([measurement.width]),
        stepProjection: measurement.projection
      })
    })

    return Object.freeze({ plan: refinedPlan, width: measurement.width })
  }

  /** Завершает неподдержанную сессию перед обычной обработкой TextManager. */
  private _finishUnsupportedResizeSession(): false {
    this.finishGesture()

    return false
  }
}
