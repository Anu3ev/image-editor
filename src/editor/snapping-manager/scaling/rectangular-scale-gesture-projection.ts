import {
  type FabricObject,
  type Transform
} from 'fabric'
import type { ObjectBounds } from '../../utils/geometry'
import type {
  ScaleProjectionVariable,
  ScaleSceneAxis,
  ScaleSceneEdge
} from './scale-projection'
import type { ScaleProjectionModeInput } from './scale-snapping-resolver'

/** Ручка, за которую можно менять размер прямоугольного объекта. */
export type RectangularScaleControlKey = 'tl' | 'tr' | 'bl' | 'br' | 'ml' | 'mr' | 'mt' | 'mb'

/** Способ изменения размера для выбранной ручки. */
export type RectangularScaleGestureMode = 'horizontal' | 'vertical' | 'free' | 'uniform'

/** Переменная, через которую scale влияет на положение граней прямоугольника. */
export type RectangularScaleProjectionVariable = 'multiplier-x' | 'multiplier-y' | 'uniform-multiplier'

/** Грань внешних bounds прямоугольника в координатах canvas. */
export type RectangularScaleSceneEdge = ScaleSceneEdge

/** Ось внешних bounds прямоугольника в координатах canvas. */
export type RectangularScaleSceneAxis = ScaleSceneAxis

/** Двумерная точка scale-жеста. */
export type RectangularScalePoint = Readonly<{
  x: number
  y: number
}>

/** Множители ширины и высоты относительно начала жеста. */
export type RectangularScaleMultipliers = Readonly<{
  x: number
  y: number
}>

/** Данные Fabric transform, необходимые для расчёта scale. */
export type RectangularScaleGestureTransform = Readonly<{
  target: FabricObject
  action: Transform['action']
  corner: string
  originX: Transform['originX']
  originY: Transform['originY']
  original: Readonly<{
    scaleX: number
    scaleY: number
  }>
}>

/** Зависимость положения одной грани от множителей scale. */
export type RectangularScaleEdgeProjection = Readonly<{
  axis: RectangularScaleSceneAxis
  edge: RectangularScaleSceneEdge
  baselinePosition: number
  coefficients: readonly number[]
}>

/** Расчёт перемещаемых граней для одного режима scale. */
export type RectangularScaleModeProjection = Readonly<{
  mode: RectangularScaleGestureMode
  variables: readonly RectangularScaleProjectionVariable[]
  baselineValues: readonly number[]
  edges: readonly RectangularScaleEdgeProjection[]
}>

/** Исходная геометрия одного scale-жеста прямоугольного top-level объекта. */
export type RectangularScaleGestureProjection = Readonly<{
  controlKey: RectangularScaleControlKey
  control: RectangularScalePoint
  origin: RectangularScalePoint
  pointerStart: RectangularScalePoint
  fixedAnchor: RectangularScalePoint
  u: RectangularScalePoint
  v: RectangularScalePoint
  originalScales: RectangularScaleMultipliers
  baselineBounds: Readonly<ObjectBounds>
}>

/** Четыре угла Fabric в координатах canvas: tl, tr, br, bl. */
type RectangularScaleCorners = Readonly<{
  topLeft: RectangularScalePoint
  topRight: RectangularScalePoint
  bottomRight: RectangularScalePoint
  bottomLeft: RectangularScalePoint
}>

/** Правило выбора грани из координат четырёх углов. */
type RectangularScaleEdgeExtremum = 'minimum' | 'maximum'

/** Вклад ширины и высоты в положение одной грани. */
type RectangularScaleEdgeCoefficients = Readonly<{
  axis: RectangularScaleSceneAxis
  edge: RectangularScaleSceneEdge
  baselinePosition: number
  multiplierX: number
  multiplierY: number
}>

/** Описание грани, необходимое для расчёта её положения. */
type RectangularScaleEdgeDescriptor = Readonly<{
  axis: RectangularScaleSceneAxis
  edge: RectangularScaleSceneEdge
  extremum: RectangularScaleEdgeExtremum
}>

/** Допуск при проверке базисных векторов и коэффициентов. */
const RECTANGULAR_SCALE_PROJECTION_EPSILON = 0.000000001

/** Нормализованные координаты восьми ручек Fabric. */
const RECTANGULAR_SCALE_CONTROL_COORDINATES: Readonly<
  Record<RectangularScaleControlKey, RectangularScalePoint>
> = Object.freeze({
  tl: Object.freeze({ x: 0, y: 0 }),
  tr: Object.freeze({ x: 1, y: 0 }),
  bl: Object.freeze({ x: 0, y: 1 }),
  br: Object.freeze({ x: 1, y: 1 }),
  ml: Object.freeze({ x: 0, y: 0.5 }),
  mr: Object.freeze({ x: 1, y: 0.5 }),
  mt: Object.freeze({ x: 0.5, y: 0 }),
  mb: Object.freeze({ x: 0.5, y: 1 })
})

/** Четыре внешние грани прямоугольника и правило выбора каждой из них. */
const RECTANGULAR_SCALE_EDGE_DESCRIPTORS: readonly RectangularScaleEdgeDescriptor[] = Object.freeze([
  Object.freeze({ axis: 'x', edge: 'left', extremum: 'minimum' }),
  Object.freeze({ axis: 'x', edge: 'right', extremum: 'maximum' }),
  Object.freeze({ axis: 'y', edge: 'top', extremum: 'minimum' }),
  Object.freeze({ axis: 'y', edge: 'bottom', extremum: 'maximum' })
])

/** Переменные scale за левую или правую ручку. */
const HORIZONTAL_PROJECTION_VARIABLES: readonly RectangularScaleProjectionVariable[] = Object.freeze(['multiplier-x'])

/** Переменные scale за верхнюю или нижнюю ручку. */
const VERTICAL_PROJECTION_VARIABLES: readonly RectangularScaleProjectionVariable[] = Object.freeze(['multiplier-y'])

/** Переменные свободного scale за угол. */
const FREE_PROJECTION_VARIABLES: readonly RectangularScaleProjectionVariable[] = Object.freeze([
  'multiplier-x',
  'multiplier-y'
])

/** Переменная пропорционального scale за угол. */
const UNIFORM_PROJECTION_VARIABLES: readonly RectangularScaleProjectionVariable[] = Object.freeze([
  'uniform-multiplier'
])

/** Соответствие переменных прямоугольника переменным общего snapping-resolver. */
const SNAP_VARIABLE_BY_RECTANGULAR_VARIABLE: Readonly<Record<
  RectangularScaleProjectionVariable,
  ScaleProjectionVariable
>> = Object.freeze({
  'multiplier-x': 'scale-x',
  'multiplier-y': 'scale-y',
  'uniform-multiplier': 'uniform-scale'
})

/** Преобразует множители прямоугольника в значения общего snapping-resolver. */
export function createRectangularScaleValues({
  mode,
  multipliers
}: {
  mode: RectangularScaleGestureMode
  multipliers: RectangularScaleMultipliers
}): readonly number[] {
  if (mode === 'horizontal') return Object.freeze([multipliers.x])
  if (mode === 'vertical') return Object.freeze([multipliers.y])
  if (mode === 'uniform') return Object.freeze([multipliers.x])

  return Object.freeze([multipliers.x, multipliers.y])
}

/** Возвращает множители прямоугольника из значений общего snapping-resolver. */
export function resolveRectangularScaleMultipliers({
  projectionMode,
  effectiveValues
}: {
  projectionMode: string
  effectiveValues: readonly number[]
}): RectangularScaleMultipliers {
  const [first, second] = effectiveValues
  if (!Number.isFinite(first)) {
    throw new Error('Rectangular scale values must contain a finite first multiplier')
  }

  if (projectionMode === 'horizontal') return Object.freeze({ x: first, y: 1 })
  if (projectionMode === 'vertical') return Object.freeze({ x: 1, y: first })
  if (projectionMode === 'uniform') return Object.freeze({ x: first, y: first })
  if (projectionMode === 'free') {
    if (second !== undefined && Number.isFinite(second)) {
      return Object.freeze({ x: first, y: second })
    }

    throw new Error('Free rectangular scale requires two finite multipliers')
  }

  throw new Error(`Unsupported rectangular scale projection mode "${projectionMode}"`)
}

/** Копирует точку и запрещает её изменение. */
function createFrozenPoint({ point }: { point: RectangularScalePoint }): RectangularScalePoint {
  return Object.freeze({
    x: point.x,
    y: point.y
  })
}

/** Проверяет, что обе координаты точки являются конечными числами. */
function isFinitePoint({ point }: { point: RectangularScalePoint }): boolean {
  return Number.isFinite(point.x) && Number.isFinite(point.y)
}

/** Преобразует Fabric origin одной оси в число от 0 до 1. */
function resolveOriginCoordinate({
  origin,
  startName,
  endName
}: {
  origin: Transform['originX'] | Transform['originY']
  startName: 'left' | 'top'
  endName: 'right' | 'bottom'
}): number | null {
  if (typeof origin === 'number') {
    return Number.isFinite(origin) ? origin : null
  }
  if (origin === startName) return 0
  if (origin === 'center') return 0.5
  if (origin === endName) return 1

  return null
}

/** Возвращает нормализованную точку, вокруг которой Fabric выполняет scale. */
function resolveTransformOrigin({
  transform
}: {
  transform: RectangularScaleGestureTransform
}): RectangularScalePoint | null {
  const x = resolveOriginCoordinate({
    origin: transform.originX,
    startName: 'left',
    endName: 'right'
  })
  const y = resolveOriginCoordinate({
    origin: transform.originY,
    startName: 'top',
    endName: 'bottom'
  })

  if (x === null || y === null) return null

  return Object.freeze({ x, y })
}

/** Проверяет, что ключ обозначает поддерживаемую ручку scale. */
function isRectangularScaleControlKey(corner: string): corner is RectangularScaleControlKey {
  return Object.prototype.hasOwnProperty.call(RECTANGULAR_SCALE_CONTROL_COORDINATES, corner)
}

/** Проверяет, что действие Fabric соответствует выбранной ручке. */
function isMatchingScaleAction({
  action,
  controlKey
}: {
  action: Transform['action']
  controlKey: RectangularScaleControlKey
}): boolean {
  if (controlKey === 'ml' || controlKey === 'mr') return action === 'scaleX'
  if (controlKey === 'mt' || controlKey === 'mb') return action === 'scaleY'

  return action === 'scale'
}

/** Проверяет, что ручка не совпадает с неподвижной точкой по изменяемым осям. */
function hasValidControlLevers({
  controlKey,
  control,
  origin
}: {
  controlKey: RectangularScaleControlKey
  control: RectangularScalePoint
  origin: RectangularScalePoint
}): boolean {
  const leverX = Math.abs(control.x - origin.x)
  const leverY = Math.abs(control.y - origin.y)
  const requiresX = controlKey !== 'mt' && controlKey !== 'mb'
  const requiresY = controlKey !== 'ml' && controlKey !== 'mr'

  return (!requiresX || leverX > RECTANGULAR_SCALE_PROJECTION_EPSILON)
    && (!requiresY || leverY > RECTANGULAR_SCALE_PROJECTION_EPSILON)
}

/** Читает четыре угла прямоугольника в начале жеста. */
function readRectangularScaleCorners({ target }: { target: FabricObject }): RectangularScaleCorners | null {
  try {
    const sourceCorners = target.getCoords()
    if (sourceCorners.length !== 4) return null
    if (!sourceCorners.every((point) => {
      return isFinitePoint({ point })
    })) return null

    const [topLeft, topRight, bottomRight, bottomLeft] = sourceCorners

    return Object.freeze({
      topLeft: createFrozenPoint({ point: topLeft }),
      topRight: createFrozenPoint({ point: topRight }),
      bottomRight: createFrozenPoint({ point: bottomRight }),
      bottomLeft: createFrozenPoint({ point: bottomLeft })
    })
  } catch {
    return null
  }
}

/** Возвращает вектор между двумя точками canvas. */
function subtractPoints({
  point,
  origin
}: {
  point: RectangularScalePoint
  origin: RectangularScalePoint
}): RectangularScalePoint {
  return Object.freeze({
    x: point.x - origin.x,
    y: point.y - origin.y
  })
}

/** Возвращает определитель базиса, образованного векторами u и v. */
function getBasisDeterminant({
  u,
  v
}: {
  u: RectangularScalePoint
  v: RectangularScalePoint
}): number {
  return (u.x * v.y) - (u.y * v.x)
}

/** Переводит нормализованные координаты прямоугольника в координаты canvas. */
function projectBaselinePoint({
  topLeft,
  u,
  v,
  coordinates
}: {
  topLeft: RectangularScalePoint
  u: RectangularScalePoint
  v: RectangularScalePoint
  coordinates: RectangularScalePoint
}): RectangularScalePoint {
  return Object.freeze({
    x: topLeft.x + (coordinates.x * u.x) + (coordinates.y * v.x),
    y: topLeft.y + (coordinates.x * u.y) + (coordinates.y * v.y)
  })
}

/** Возвращает внешние bounds для четырёх углов прямоугольника. */
function createBoundsFromCorners({ corners }: { corners: RectangularScaleCorners }): Readonly<ObjectBounds> {
  const points = [corners.topLeft, corners.topRight, corners.bottomRight, corners.bottomLeft]
  const xCoordinates = points.map(({ x }) => x)
  const yCoordinates = points.map(({ y }) => y)
  const left = Math.min(...xCoordinates)
  const right = Math.max(...xCoordinates)
  const top = Math.min(...yCoordinates)
  const bottom = Math.max(...yCoordinates)

  return Object.freeze({
    left,
    right,
    top,
    bottom,
    centerX: left + ((right - left) / 2),
    centerY: top + ((bottom - top) / 2)
  })
}

/** Проверяет исходные значения scale Fabric. */
function hasValidOriginalScales({
  original
}: {
  original: RectangularScaleGestureTransform['original']
}): boolean {
  return Number.isFinite(original.scaleX)
    && Number.isFinite(original.scaleY)
    && original.scaleX > RECTANGULAR_SCALE_PROJECTION_EPSILON
    && original.scaleY > RECTANGULAR_SCALE_PROJECTION_EPSILON
}

/** Проверяет входные данные перед расчётом исходной геометрии. */
function canCreateRectangularScaleProjection({
  transform,
  pointerStart,
  controlKey
}: {
  transform: RectangularScaleGestureTransform
  pointerStart: RectangularScalePoint
  controlKey: RectangularScaleControlKey
}): boolean {
  return isMatchingScaleAction({ action: transform.action, controlKey })
    && hasValidOriginalScales({ original: transform.original })
    && isFinitePoint({ point: pointerStart })
}

/**
 * Запоминает исходную геометрию прямоугольного top-level scale-жеста.
 * Возвращает null, если control или affine-состояние не поддерживаются.
 */
export function createRectangularScaleGestureProjection({
  transform,
  pointerStart
}: {
  transform: RectangularScaleGestureTransform
  pointerStart: RectangularScalePoint
}): RectangularScaleGestureProjection | null {
  if (!isRectangularScaleControlKey(transform.corner)) return null
  if (!canCreateRectangularScaleProjection({
    transform,
    pointerStart,
    controlKey: transform.corner
  })) return null

  const origin = resolveTransformOrigin({ transform })
  const control = RECTANGULAR_SCALE_CONTROL_COORDINATES[transform.corner]
  if (!origin || !hasValidControlLevers({ controlKey: transform.corner, control, origin })) return null

  const corners = readRectangularScaleCorners({ target: transform.target })
  if (!corners) return null

  const u = subtractPoints({ point: corners.topRight, origin: corners.topLeft })
  const v = subtractPoints({ point: corners.bottomLeft, origin: corners.topLeft })
  if (Math.abs(getBasisDeterminant({ u, v })) <= RECTANGULAR_SCALE_PROJECTION_EPSILON) return null

  return Object.freeze({
    controlKey: transform.corner,
    control: createFrozenPoint({ point: control }),
    origin,
    pointerStart: createFrozenPoint({ point: pointerStart }),
    fixedAnchor: projectBaselinePoint({ topLeft: corners.topLeft, u, v, coordinates: origin }),
    u,
    v,
    originalScales: Object.freeze({
      x: transform.original.scaleX,
      y: transform.original.scaleY
    }),
    baselineBounds: createBoundsFromCorners({ corners })
  })
}

/** Проверяет, что выбранная ручка поддерживает указанный режим scale. */
function isModeSupportedByControl({
  controlKey,
  mode
}: {
  controlKey: RectangularScaleControlKey
  mode: RectangularScaleGestureMode
}): boolean {
  if (controlKey === 'ml' || controlKey === 'mr') return mode === 'horizontal'
  if (controlKey === 'mt' || controlKey === 'mb') return mode === 'vertical'

  return mode === 'free' || mode === 'uniform'
}

/** Переводит смещение указателя в локальные оси исходного прямоугольника. */
function resolvePointerBasisDelta({
  projection,
  pointer
}: {
  projection: RectangularScaleGestureProjection
  pointer: RectangularScalePoint
}): RectangularScalePoint | null {
  if (!isFinitePoint({ point: pointer })) return null

  const deltaX = pointer.x - projection.pointerStart.x
  const deltaY = pointer.y - projection.pointerStart.y
  const determinant = getBasisDeterminant({ u: projection.u, v: projection.v })
  if (Math.abs(determinant) <= RECTANGULAR_SCALE_PROJECTION_EPSILON) return null

  return Object.freeze({
    x: ((deltaX * projection.v.y) - (deltaY * projection.v.x)) / determinant,
    y: ((projection.u.x * deltaY) - (projection.u.y * deltaX)) / determinant
  })
}

/** Вычисляет независимые множители ширины и высоты. */
function resolveFreeMultipliers({
  projection,
  pointerDelta
}: {
  projection: RectangularScaleGestureProjection
  pointerDelta: RectangularScalePoint
}): RectangularScaleMultipliers {
  const leverX = projection.control.x - projection.origin.x
  const leverY = projection.control.y - projection.origin.y

  return Object.freeze({
    x: Math.abs(leverX) > RECTANGULAR_SCALE_PROJECTION_EPSILON
      ? (leverX + pointerDelta.x) / leverX
      : 1,
    y: Math.abs(leverY) > RECTANGULAR_SCALE_PROJECTION_EPSILON
      ? (leverY + pointerDelta.y) / leverY
      : 1
  })
}

/** Возвращает длину вектора исходной геометрии. */
function getVectorLength({ vector }: { vector: RectangularScalePoint }): number {
  return Math.sqrt((vector.x ** 2) + (vector.y ** 2))
}

/** Вычисляет множитель пропорционального scale так же, как Fabric. */
function resolveUniformMultiplier({
  projection,
  pointerDelta
}: {
  projection: RectangularScaleGestureProjection
  pointerDelta: RectangularScalePoint
}): number | null {
  const leverX = projection.control.x - projection.origin.x
  const leverY = projection.control.y - projection.origin.y
  const currentLeverX = leverX + pointerDelta.x
  const currentLeverY = leverY + pointerDelta.y
  if ((leverX * currentLeverX) < 0 || (leverY * currentLeverY) < 0) return null

  const uLength = getVectorLength({ vector: projection.u })
  const vLength = getVectorLength({ vector: projection.v })
  const baselineDistance = (Math.abs(leverX) * uLength) + (Math.abs(leverY) * vLength)
  if (baselineDistance <= RECTANGULAR_SCALE_PROJECTION_EPSILON) return null

  const currentDistance = (Math.abs(currentLeverX) * uLength)
    + (Math.abs(currentLeverY) * vLength)

  return currentDistance / baselineDistance
}

/**
 * Возвращает множители scale по смещению указателя от начала жеста.
 * Расчёт не зависит от текущей геометрии объекта.
 */
export function resolveRectangularScalePointerMultipliers({
  projection,
  pointer,
  mode
}: {
  projection: RectangularScaleGestureProjection
  pointer: RectangularScalePoint
  mode: RectangularScaleGestureMode
}): RectangularScaleMultipliers | null {
  if (!isModeSupportedByControl({ controlKey: projection.controlKey, mode })) return null

  const pointerDelta = resolvePointerBasisDelta({ projection, pointer })
  if (!pointerDelta) return null

  if (mode === 'uniform') {
    const multiplier = resolveUniformMultiplier({ projection, pointerDelta })
    if (multiplier === null) return null

    return Object.freeze({ x: multiplier, y: multiplier })
  }

  const freeMultipliers = resolveFreeMultipliers({ projection, pointerDelta })
  if (mode === 'horizontal') return Object.freeze({ x: freeMultipliers.x, y: 1 })
  if (mode === 'vertical') return Object.freeze({ x: 1, y: freeMultipliers.y })

  return freeMultipliers
}

/** Вычисляет положение одного угла после scale вокруг неподвижной точки. */
function projectScaledPoint({
  projection,
  multipliers,
  coordinates
}: {
  projection: RectangularScaleGestureProjection
  multipliers: RectangularScaleMultipliers
  coordinates: RectangularScalePoint
}): RectangularScalePoint {
  const localX = coordinates.x - projection.origin.x
  const localY = coordinates.y - projection.origin.y

  return Object.freeze({
    x: projection.fixedAnchor.x
      + (localX * multipliers.x * projection.u.x)
      + (localY * multipliers.y * projection.v.x),
    y: projection.fixedAnchor.y
      + (localX * multipliers.x * projection.u.y)
      + (localY * multipliers.y * projection.v.y)
  })
}

/** Возвращает внешние bounds по рассчитанным координатам углов. */
function createProjectedBounds({
  topLeft,
  topRight,
  bottomRight,
  bottomLeft
}: RectangularScaleCorners): Readonly<ObjectBounds> {
  return createBoundsFromCorners({
    corners: Object.freeze({ topLeft, topRight, bottomRight, bottomLeft })
  })
}

/**
 * Рассчитывает bounds для заданных множителей, не изменяя объект.
 */
export function projectRectangularScaleBounds({
  projection,
  multipliers
}: {
  projection: RectangularScaleGestureProjection
  multipliers: RectangularScaleMultipliers
}): Readonly<ObjectBounds> | null {
  if (!Number.isFinite(multipliers.x) || !Number.isFinite(multipliers.y)) return null

  return createProjectedBounds({
    topLeft: projectScaledPoint({ projection, multipliers, coordinates: RECTANGULAR_SCALE_CONTROL_COORDINATES.tl }),
    topRight: projectScaledPoint({ projection, multipliers, coordinates: RECTANGULAR_SCALE_CONTROL_COORDINATES.tr }),
    bottomRight: projectScaledPoint({ projection, multipliers, coordinates: RECTANGULAR_SCALE_CONTROL_COORDINATES.br }),
    bottomLeft: projectScaledPoint({ projection, multipliers, coordinates: RECTANGULAR_SCALE_CONTROL_COORDINATES.bl })
  })
}

/** Возвращает исходную позицию указанной грани. */
function getBaselineEdgePosition({
  bounds,
  edge
}: {
  bounds: Readonly<ObjectBounds>
  edge: RectangularScaleSceneEdge
}): number {
  if (edge === 'left') return bounds.left
  if (edge === 'right') return bounds.right
  if (edge === 'top') return bounds.top

  return bounds.bottom
}

/** Выбирает локальную координату угла, образующего внешнюю грань. */
function resolveExtremumCoordinate({
  component,
  extremum
}: {
  component: number
  extremum: RectangularScaleEdgeExtremum
}): number {
  if (extremum === 'minimum') return component >= 0 ? 0 : 1

  return component >= 0 ? 1 : 0
}

/** Вычисляет вклад ширины и высоты в положение одной грани. */
function createEdgeCoefficients({
  projection,
  descriptor
}: {
  projection: RectangularScaleGestureProjection
  descriptor: RectangularScaleEdgeDescriptor
}): RectangularScaleEdgeCoefficients {
  const uComponent = descriptor.axis === 'x' ? projection.u.x : projection.u.y
  const vComponent = descriptor.axis === 'x' ? projection.v.x : projection.v.y
  const localX = resolveExtremumCoordinate({ component: uComponent, extremum: descriptor.extremum })
  const localY = resolveExtremumCoordinate({ component: vComponent, extremum: descriptor.extremum })

  return Object.freeze({
    axis: descriptor.axis,
    edge: descriptor.edge,
    baselinePosition: getBaselineEdgePosition({ bounds: projection.baselineBounds, edge: descriptor.edge }),
    multiplierX: (localX - projection.origin.x) * uComponent,
    multiplierY: (localY - projection.origin.y) * vComponent
  })
}

/** Возвращает переменные выбранного режима scale. */
function getModeVariables({
  mode
}: {
  mode: RectangularScaleGestureMode
}): readonly RectangularScaleProjectionVariable[] {
  if (mode === 'horizontal') return HORIZONTAL_PROJECTION_VARIABLES
  if (mode === 'vertical') return VERTICAL_PROJECTION_VARIABLES
  if (mode === 'free') return FREE_PROJECTION_VARIABLES

  return UNIFORM_PROJECTION_VARIABLES
}

/** Выбирает коэффициенты грани, необходимые выбранному режиму scale. */
function resolveModeCoefficients({
  edge,
  mode
}: {
  edge: RectangularScaleEdgeCoefficients
  mode: RectangularScaleGestureMode
}): readonly number[] {
  if (mode === 'horizontal') return Object.freeze([edge.multiplierX])
  if (mode === 'vertical') return Object.freeze([edge.multiplierY])
  if (mode === 'free') return Object.freeze([edge.multiplierX, edge.multiplierY])

  return Object.freeze([edge.multiplierX + edge.multiplierY])
}

/** Проверяет, что выбранный режим действительно перемещает грань. */
function hasActiveModeCoefficient({ coefficients }: { coefficients: readonly number[] }): boolean {
  return coefficients.some((coefficient) => Math.abs(coefficient) > RECTANGULAR_SCALE_PROJECTION_EPSILON)
}

/** Возвращает расчёт перемещаемой грани или null для неподвижной. */
function createModeEdgeProjection({
  edge,
  mode
}: {
  edge: RectangularScaleEdgeCoefficients
  mode: RectangularScaleGestureMode
}): RectangularScaleEdgeProjection | null {
  const coefficients = resolveModeCoefficients({ edge, mode })
  if (!hasActiveModeCoefficient({ coefficients })) return null

  return Object.freeze({
    axis: edge.axis,
    edge: edge.edge,
    baselinePosition: edge.baselinePosition,
    coefficients
  })
}

/**
 * Возвращает расчёт перемещаемых граней для выбранного режима scale.
 * Положение грани считается от исходной позиции до пересечения неподвижной точки.
 */
export function resolveRectangularScaleModeProjection({
  projection,
  mode
}: {
  projection: RectangularScaleGestureProjection
  mode: RectangularScaleGestureMode
}): RectangularScaleModeProjection | null {
  if (!isModeSupportedByControl({ controlKey: projection.controlKey, mode })) return null

  const edges = RECTANGULAR_SCALE_EDGE_DESCRIPTORS
    .map((descriptor) => createEdgeCoefficients({ projection, descriptor }))
    .map((edge) => createModeEdgeProjection({ edge, mode }))
    .filter((edge): edge is RectangularScaleEdgeProjection => edge !== null)
  const variables = getModeVariables({ mode })

  return Object.freeze({
    mode,
    variables,
    baselineValues: Object.freeze(variables.map(() => 1)),
    edges: Object.freeze(edges)
  })
}

/** Возвращает вклад каждой переменной scale в перемещение активной ручки. */
function resolveScaleVariableWeights({
  projection,
  mode
}: {
  projection: RectangularScaleGestureProjection
  mode: RectangularScaleGestureMode
}): readonly number[] {
  const leverX = projection.control.x - projection.origin.x
  const leverY = projection.control.y - projection.origin.y
  const xWeight = Math.abs(leverX) * getVectorLength({ vector: projection.u })
  const yWeight = Math.abs(leverY) * getVectorLength({ vector: projection.v })

  if (mode === 'horizontal') return Object.freeze([xWeight])
  if (mode === 'vertical') return Object.freeze([yWeight])
  if (mode === 'free') return Object.freeze([xWeight, yWeight])

  const uniformVector = {
    x: (leverX * projection.u.x) + (leverY * projection.v.x),
    y: (leverX * projection.u.y) + (leverY * projection.v.y)
  }

  return Object.freeze([getVectorLength({ vector: uniformVector })])
}

/** Преобразует прямоугольную модель в формат общего scale resolver. */
function createScaleProjectionModeInput({
  projection,
  modeProjection
}: {
  projection: RectangularScaleGestureProjection
  modeProjection: RectangularScaleModeProjection
}): ScaleProjectionModeInput {
  const variables = modeProjection.variables.map((variable) => {
    return SNAP_VARIABLE_BY_RECTANGULAR_VARIABLE[variable]
  })

  return Object.freeze({
    id: modeProjection.mode,
    projection: Object.freeze({
      variables: Object.freeze(variables),
      baselineValues: Object.freeze([...modeProjection.baselineValues]),
      variableSceneWeights: resolveScaleVariableWeights({
        projection,
        mode: modeProjection.mode
      }),
      edges: Object.freeze(modeProjection.edges.map(({ edge, coefficients }) => {
        return Object.freeze({ edge, coefficients: Object.freeze([...coefficients]) })
      }))
    })
  })
}

/** Возвращает scale-режимы, доступные выбранной прямоугольной ручке. */
export function createRectangularScaleProjectionModes({
  projection
}: {
  projection: RectangularScaleGestureProjection
}): readonly ScaleProjectionModeInput[] {
  let modes: readonly RectangularScaleGestureMode[] = ['free', 'uniform']

  if (projection.controlKey === 'ml' || projection.controlKey === 'mr') {
    modes = ['horizontal']
  }
  if (projection.controlKey === 'mt' || projection.controlKey === 'mb') {
    modes = ['vertical']
  }

  return Object.freeze(modes.map((mode) => {
    const modeProjection = resolveRectangularScaleModeProjection({ projection, mode })
    if (!modeProjection) {
      throw new Error(`Rectangular scale projection is missing supported mode "${mode}"`)
    }

    return createScaleProjectionModeInput({ projection, modeProjection })
  }))
}

/** Возвращает все scene edges, которые может перемещать выбранная ручка. */
export function resolveRectangularScaleMovingEdges({
  projectionModes
}: {
  projectionModes: readonly ScaleProjectionModeInput[]
}): readonly ScaleSceneEdge[] {
  const edges = new Set<ScaleSceneEdge>()

  for (const { projection } of projectionModes) {
    for (const edge of projection.edges) edges.add(edge.edge)
  }
  if (edges.size === 0) {
    throw new Error('Rectangular scale gesture must contain at least one moving edge')
  }

  return Object.freeze([...edges])
}
