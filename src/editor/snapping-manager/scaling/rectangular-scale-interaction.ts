/* eslint-disable no-use-before-define -- Public operations appear before internal calculations. */
import {
  Point,
  type Canvas,
  type FabricObject,
  type TPointerEvent,
  type Transform
} from 'fabric'

import { getObjectExactBounds, type ObjectBounds } from '../../utils/geometry'
import {
  createRectangularScaleValues,
  resolveRectangularScaleMultipliers,
  resolveRectangularScalePointerMultipliers,
  type RectangularScaleGestureMode,
  type RectangularScaleGestureProjection,
  type RectangularScaleMultipliers,
  type RectangularScalePoint
} from './rectangular-scale-gesture-projection'
import type {
  FinalScaleGeometry,
  ScaleRawIntent,
  ScaleSnapPlan
} from './scale-snapping-resolver'

/** Source of factors for one rectangular scaling step. */
export type RectangularScaleIntentSource = 'fabric-preview' | 'pointer-projection'

/** Event data shared by image and active selection scaling. */
type RectangularScaleStepEvent = Readonly<{
  e?: TPointerEvent | null
  scenePoint?: RectangularScalePoint
}>

/** Validated inputs for one rectangular scaling step. */
type RectangularScaleStepInput = Readonly<{
  intent: ScaleRawIntent
  mode: RectangularScaleGestureMode
}>

/** Tolerance for comparing proportional scale factors. */
const RECTANGULAR_SCALE_INTERACTION_EPSILON = 0.000000001

/** Selects a mode and returns validated inputs for the current step. */
export function resolveRectangularScaleStepInput({
  canvas,
  event,
  intentSource,
  mode: requestedMode,
  projection,
  target
}: {
  canvas: Canvas
  event: RectangularScaleStepEvent
  intentSource: RectangularScaleIntentSource
  mode?: RectangularScaleGestureMode
  projection: RectangularScaleGestureProjection
  target: FabricObject
}): RectangularScaleStepInput | null {
  const pointerEvent = event.e
  if (!pointerEvent) return null

  const mode = requestedMode ?? resolveRectangularScaleGestureMode({ canvas, pointerEvent, projection })
  const multipliers = resolveRawMultipliers({ event, intentSource, mode, projection, target })
  if (!multipliers || multipliers.x <= 0 || multipliers.y <= 0) return null

  return Object.freeze({
    intent: createRectangularScaleIntent({ mode, multipliers, pointerEvent }),
    mode
  })
}

/** Applies the calculated plan to a Fabric object relative to the gesture's fixed point. */
export function applyRectangularScalePlan({
  plan,
  projection,
  target,
  transform
}: {
  plan: ScaleSnapPlan
  projection: RectangularScaleGestureProjection
  target: FabricObject
  transform: Transform
}): void {
  const multipliers = resolveRectangularScaleMultipliers({
    projectionMode: plan.projectionMode,
    effectiveValues: plan.effectiveValues
  })
  if (multipliers.x <= 0 || multipliers.y <= 0) {
    throw new Error('План прямоугольного скейлинга должен содержать положительные множители')
  }

  target.set({
    scaleX: projection.originalScales.x * multipliers.x,
    scaleY: projection.originalScales.y * multipliers.y
  })
  transform.scaleX = target.scaleX
  transform.scaleY = target.scaleY
  target.setPositionByOrigin(
    new Point(projection.fixedAnchor.x, projection.fixedAnchor.y),
    transform.originX,
    transform.originY
  )
  target.setCoords()
}

/** Returns positive factors actually applied to the Fabric object. */
export function readAppliedRectangularScaleMultipliers({
  projection,
  target
}: {
  projection: RectangularScaleGestureProjection
  target: FabricObject
}): RectangularScaleMultipliers {
  const multipliers = readRectangularScaleMultipliers({ projection, target })
  if (!multipliers || multipliers.x <= 0 || multipliers.y <= 0) {
    throw new Error('Прямоугольный скейлинг должен содержать положительные применённые множители')
  }

  return multipliers
}

/** Reads final geometry after applying the plan exactly once. */
export function readFinalRectangularScaleGeometry({
  mode,
  multipliers,
  plan,
  protectedStatePreserved,
  target,
  transform
}: {
  mode: RectangularScaleGestureMode
  multipliers: RectangularScaleMultipliers
  plan: ScaleSnapPlan
  protectedStatePreserved: boolean
  target: FabricObject
  transform: Transform
}): FinalScaleGeometry {
  const bounds = getObjectExactBounds({ object: target })
  if (!bounds) throw new Error('Прямоугольному скейлингу нужны точные итоговые границы')

  const anchor = target.getPointByOrigin(transform.originX, transform.originY)

  return Object.freeze({
    bounds,
    fixedAnchor: createScaleScenePoint({ point: anchor }),
    measuredValues: createRectangularScaleValues({ mode, multipliers }),
    domainVerdict: Object.freeze({
      x: didReachScaleConstraint({
        bounds,
        constraint: plan.constraints.x,
        epsilon: plan.verificationEpsilon
      }) ? 'satisfied' : 'blocked',
      y: didReachScaleConstraint({
        bounds,
        constraint: plan.constraints.y,
        epsilon: plan.verificationEpsilon
      }) ? 'satisfied' : 'blocked',
      protectedState: protectedStatePreserved ? 'preserved' : 'changed'
    })
  })
}

/** Selects the resizing mode from the control and Fabric settings. */
export function resolveRectangularScaleGestureMode({
  canvas,
  pointerEvent,
  projection
}: {
  canvas: Canvas
  pointerEvent: TPointerEvent
  projection: RectangularScaleGestureProjection
}): RectangularScaleGestureMode {
  const { controlKey } = projection
  if (controlKey === 'ml' || controlKey === 'mr') return 'horizontal'
  if (controlKey === 'mt' || controlKey === 'mb') return 'vertical'

  const { uniformScaling, uniScaleKey } = canvas
  const uniformIsToggled = Boolean(uniScaleKey && Reflect.get(pointerEvent, uniScaleKey) === true)
  const usesUniformScale = (uniformScaling && !uniformIsToggled)
    || (!uniformScaling && uniformIsToggled)

  return usesUniformScale ? 'uniform' : 'free'
}

/** Reads factors from Fabric's preliminary result or the pointer position. */
function resolveRawMultipliers({
  event,
  intentSource,
  mode,
  projection,
  target
}: {
  event: RectangularScaleStepEvent
  intentSource: RectangularScaleIntentSource
  mode: RectangularScaleGestureMode
  projection: RectangularScaleGestureProjection
  target: FabricObject
}): RectangularScaleMultipliers | null {
  if (intentSource === 'pointer-projection') {
    if (!event.scenePoint) return null

    return resolveRectangularScalePointerMultipliers({
      projection,
      pointer: event.scenePoint,
      mode
    })
  }

  const multipliers = readRectangularScaleMultipliers({ projection, target })
  if (!multipliers) return null
  if (mode === 'uniform' && !areNumbersNear({
    first: multipliers.x,
    second: multipliers.y
  })) return null

  return multipliers
}

/** Reads current factors relative to the immutable gesture start state. */
function readRectangularScaleMultipliers({
  projection,
  target
}: {
  projection: RectangularScaleGestureProjection
  target: FabricObject
}): RectangularScaleMultipliers | null {
  const x = target.scaleX / projection.originalScales.x
  const y = target.scaleY / projection.originalScales.y
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null

  return Object.freeze({ x, y })
}

/** Builds canonical inputs for the shared snapping calculation. */
export function createRectangularScaleIntent({
  mode,
  multipliers,
  pointerEvent
}: {
  mode: RectangularScaleGestureMode
  multipliers: RectangularScaleMultipliers
  pointerEvent: TPointerEvent
}): ScaleRawIntent {
  return Object.freeze({
    projectionMode: mode,
    values: createRectangularScaleValues({ mode, multipliers }),
    modifiers: Object.freeze({
      ctrlKey: 'ctrlKey' in pointerEvent && pointerEvent.ctrlKey === true,
      shiftKey: 'shiftKey' in pointerEvent && pointerEvent.shiftKey === true
    })
  })
}

/** Checks whether the selected guide was reached on one axis. */
function didReachScaleConstraint({
  bounds,
  constraint,
  epsilon
}: {
  bounds: ObjectBounds
  constraint: ScaleSnapPlan['constraints']['x']
  epsilon: number
}): boolean {
  if (!constraint) return true

  return Math.abs(bounds[constraint.candidate.edge] - constraint.expectedPosition) <= epsilon
}

/** Copies a finite point into independent scaling geometry. */
function createScaleScenePoint({
  point
}: {
  point: RectangularScalePoint
}): RectangularScalePoint {
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    throw new Error('Точка прямоугольного скейлинга должна содержать конечные координаты')
  }

  return Object.freeze({ x: point.x, y: point.y })
}

/** Compares finite factors within tolerance. */
function areNumbersNear({
  first,
  second
}: {
  first: number
  second: number
}): boolean {
  return Number.isFinite(first)
    && Number.isFinite(second)
    && Math.abs(first - second) <= RECTANGULAR_SCALE_INTERACTION_EPSILON
}
