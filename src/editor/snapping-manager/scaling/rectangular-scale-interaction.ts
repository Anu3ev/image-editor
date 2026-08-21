/* eslint-disable no-use-before-define -- Публичные операции расположены перед внутренними расчётами. */
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

/** Источник множителей одного шага прямоугольного скейлинга. */
export type RectangularScaleIntentSource = 'fabric-preview' | 'pointer-projection'

/** Данные события, общие для скейлинга изображения и общего выделения. */
type RectangularScaleStepEvent = Readonly<{
  e?: TPointerEvent | null
  scenePoint?: RectangularScalePoint
}>

/** Проверенные исходные данные одного шага прямоугольного скейлинга. */
type RectangularScaleStepInput = Readonly<{
  intent: ScaleRawIntent
  mode: RectangularScaleGestureMode
}>

/** Допуск при сравнении множителей пропорционального скейлинга. */
const RECTANGULAR_SCALE_INTERACTION_EPSILON = 0.000000001

/** Выбирает режим и возвращает проверенные исходные данные текущего шага. */
export function resolveRectangularScaleStepInput({
  canvas,
  event,
  intentSource,
  projection,
  target
}: {
  canvas: Canvas
  event: RectangularScaleStepEvent
  intentSource: RectangularScaleIntentSource
  projection: RectangularScaleGestureProjection
  target: FabricObject
}): RectangularScaleStepInput | null {
  const pointerEvent = event.e
  if (!pointerEvent) return null

  const mode = resolveRectangularScaleMode({ canvas, pointerEvent, projection })
  const multipliers = resolveRawMultipliers({ event, intentSource, mode, projection, target })
  if (!multipliers || multipliers.x <= 0 || multipliers.y <= 0) return null

  return Object.freeze({
    intent: createRectangularScaleRawIntent({ mode, multipliers, pointerEvent }),
    mode
  })
}

/** Применяет рассчитанный план к Fabric-объекту относительно неподвижной точки жеста. */
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

/** Возвращает положительные множители, фактически применённые к Fabric-объекту. */
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

/** Читает итоговую геометрию после однократного применения плана. */
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

/** Выбирает способ изменения размера по ручке и настройкам Fabric. */
function resolveRectangularScaleMode({
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

/** Читает множители из предварительного результата Fabric или положения указателя. */
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

/** Читает текущие множители относительно неизменяемого начала жеста. */
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

/** Формирует канонические исходные данные общего расчёта прилипания. */
function createRectangularScaleRawIntent({
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

/** Проверяет достижение выбранной направляющей по одной оси. */
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

/** Копирует конечную точку в независимую геометрию скейлинга. */
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

/** Сравнивает конечные множители в пределах допуска. */
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
