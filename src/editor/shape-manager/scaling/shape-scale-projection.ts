import {
  ActiveSelection,
  type FabricObject,
  type Transform
} from 'fabric'
import type { ObjectBounds } from '../../utils/geometry'
import { isShapeGroup } from '../domain/shape-reference'

/** Ручка, за которую можно менять размер одиночного Shape. */
export type ShapeScaleControlKey = 'tl' | 'tr' | 'bl' | 'br' | 'ml' | 'mr' | 'mt' | 'mb'

/** Способ изменения размера для выбранной ручки. */
export type ShapeScaleGestureMode = 'horizontal' | 'vertical' | 'free' | 'uniform'

/** Переменная, через которую scale влияет на положение граней Shape. */
export type ShapeScaleProjectionVariable = 'multiplier-x' | 'multiplier-y' | 'uniform-multiplier'

/** Грань внешних bounds Shape в координатах canvas. */
export type ShapeScaleSceneEdge = 'left' | 'right' | 'top' | 'bottom'

/** Ось внешних bounds Shape в координатах canvas. */
export type ShapeScaleSceneAxis = 'x' | 'y'

/** Двумерная точка scale-жеста. */
export type ShapeScalePoint = Readonly<{
  x: number
  y: number
}>

/** Множители ширины и высоты относительно начала жеста. */
export type ShapeScaleMultipliers = Readonly<{
  x: number
  y: number
}>

/** Данные Fabric transform, необходимые для расчёта scale. */
export type ShapeScaleGestureTransform = Readonly<{
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
export type ShapeScaleEdgeProjection = Readonly<{
  axis: ShapeScaleSceneAxis
  edge: ShapeScaleSceneEdge
  baselinePosition: number
  coefficients: readonly number[]
}>

/** Расчёт перемещаемых граней для одного режима scale. */
export type ShapeScaleModeProjection = Readonly<{
  mode: ShapeScaleGestureMode
  variables: readonly ShapeScaleProjectionVariable[]
  baselineValues: readonly number[]
  edges: readonly ShapeScaleEdgeProjection[]
}>

/** Исходная геометрия одного scale-жеста одиночного Shape. */
export type ShapeScaleGestureProjection = Readonly<{
  controlKey: ShapeScaleControlKey
  control: ShapeScalePoint
  origin: ShapeScalePoint
  pointerStart: ShapeScalePoint
  fixedAnchor: ShapeScalePoint
  u: ShapeScalePoint
  v: ShapeScalePoint
  originalScales: ShapeScaleMultipliers
  baselineBounds: Readonly<ObjectBounds>
}>

/** Четыре угла Fabric в координатах canvas: tl, tr, br, bl. */
type ShapeScaleCorners = Readonly<{
  topLeft: ShapeScalePoint
  topRight: ShapeScalePoint
  bottomRight: ShapeScalePoint
  bottomLeft: ShapeScalePoint
}>

/** Правило выбора грани из координат четырёх углов. */
type ShapeScaleEdgeExtremum = 'minimum' | 'maximum'

/** Вклад ширины и высоты в положение одной грани. */
type ShapeScaleEdgeCoefficients = Readonly<{
  axis: ShapeScaleSceneAxis
  edge: ShapeScaleSceneEdge
  baselinePosition: number
  multiplierX: number
  multiplierY: number
}>

/** Описание грани, необходимое для расчёта её положения. */
type ShapeScaleEdgeDescriptor = Readonly<{
  axis: ShapeScaleSceneAxis
  edge: ShapeScaleSceneEdge
  extremum: ShapeScaleEdgeExtremum
}>

/** Допуск при проверке базисных векторов и коэффициентов. */
const SHAPE_SCALE_PROJECTION_EPSILON = 0.000000001

/** Нормализованные координаты восьми ручек Fabric. */
const SHAPE_SCALE_CONTROL_COORDINATES: Readonly<Record<ShapeScaleControlKey, ShapeScalePoint>> = Object.freeze({
  tl: Object.freeze({ x: 0, y: 0 }),
  tr: Object.freeze({ x: 1, y: 0 }),
  bl: Object.freeze({ x: 0, y: 1 }),
  br: Object.freeze({ x: 1, y: 1 }),
  ml: Object.freeze({ x: 0, y: 0.5 }),
  mr: Object.freeze({ x: 1, y: 0.5 }),
  mt: Object.freeze({ x: 0.5, y: 0 }),
  mb: Object.freeze({ x: 0.5, y: 1 })
})

/** Четыре внешние грани Shape и правило выбора каждой из них. */
const SHAPE_SCALE_EDGE_DESCRIPTORS: readonly ShapeScaleEdgeDescriptor[] = Object.freeze([
  Object.freeze({ axis: 'x', edge: 'left', extremum: 'minimum' }),
  Object.freeze({ axis: 'x', edge: 'right', extremum: 'maximum' }),
  Object.freeze({ axis: 'y', edge: 'top', extremum: 'minimum' }),
  Object.freeze({ axis: 'y', edge: 'bottom', extremum: 'maximum' })
])

/** Переменные scale за левую или правую ручку. */
const HORIZONTAL_PROJECTION_VARIABLES: readonly ShapeScaleProjectionVariable[] = Object.freeze(['multiplier-x'])

/** Переменные scale за верхнюю или нижнюю ручку. */
const VERTICAL_PROJECTION_VARIABLES: readonly ShapeScaleProjectionVariable[] = Object.freeze(['multiplier-y'])

/** Переменные свободного scale за угол. */
const FREE_PROJECTION_VARIABLES: readonly ShapeScaleProjectionVariable[] = Object.freeze([
  'multiplier-x',
  'multiplier-y'
])

/** Переменная пропорционального scale за угол. */
const UNIFORM_PROJECTION_VARIABLES: readonly ShapeScaleProjectionVariable[] = Object.freeze([
  'uniform-multiplier'
])

/** Копирует точку и запрещает её изменение. */
function createFrozenPoint({ point }: { point: ShapeScalePoint }): ShapeScalePoint {
  return Object.freeze({
    x: point.x,
    y: point.y
  })
}

/** Проверяет, что обе координаты точки являются конечными числами. */
function isFinitePoint({ point }: { point: ShapeScalePoint }): boolean {
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
  transform: ShapeScaleGestureTransform
}): ShapeScalePoint | null {
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
function isShapeScaleControlKey(corner: string): corner is ShapeScaleControlKey {
  return Object.prototype.hasOwnProperty.call(SHAPE_SCALE_CONTROL_COORDINATES, corner)
}

/** Проверяет, что действие Fabric соответствует выбранной ручке. */
function isMatchingScaleAction({
  action,
  controlKey
}: {
  action: Transform['action']
  controlKey: ShapeScaleControlKey
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
  controlKey: ShapeScaleControlKey
  control: ShapeScalePoint
  origin: ShapeScalePoint
}): boolean {
  const leverX = Math.abs(control.x - origin.x)
  const leverY = Math.abs(control.y - origin.y)
  const requiresX = controlKey !== 'mt' && controlKey !== 'mb'
  const requiresY = controlKey !== 'ml' && controlKey !== 'mr'

  return (!requiresX || leverX > SHAPE_SCALE_PROJECTION_EPSILON)
    && (!requiresY || leverY > SHAPE_SCALE_PROJECTION_EPSILON)
}

/** Читает четыре угла Shape в начале жеста. */
function readShapeScaleCorners({ target }: { target: FabricObject }): ShapeScaleCorners | null {
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
  point: ShapeScalePoint
  origin: ShapeScalePoint
}): ShapeScalePoint {
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
  u: ShapeScalePoint
  v: ShapeScalePoint
}): number {
  return (u.x * v.y) - (u.y * v.x)
}

/** Переводит нормализованные координаты Shape в координаты canvas. */
function projectBaselinePoint({
  topLeft,
  u,
  v,
  coordinates
}: {
  topLeft: ShapeScalePoint
  u: ShapeScalePoint
  v: ShapeScalePoint
  coordinates: ShapeScalePoint
}): ShapeScalePoint {
  return Object.freeze({
    x: topLeft.x + (coordinates.x * u.x) + (coordinates.y * v.x),
    y: topLeft.y + (coordinates.x * u.y) + (coordinates.y * v.y)
  })
}

/** Возвращает внешние bounds для четырёх углов Shape. */
function createBoundsFromCorners({ corners }: { corners: ShapeScaleCorners }): Readonly<ObjectBounds> {
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

/** Проверяет, что объект можно безопасно передать новой логике snapping Shape. */
function isSupportedShapeScaleTarget({
  target
}: {
  target: FabricObject
}): boolean {
  if (target instanceof ActiveSelection || !isShapeGroup(target) || target.group) return false
  if (Boolean(target.flipX) || Boolean(target.flipY)) return false
  if (Boolean(target.locked) || Boolean(target.lockScalingX) || Boolean(target.lockScalingY)) return false

  const skewX = target.skewX ?? 0
  const skewY = target.skewY ?? 0

  return Number.isFinite(skewX)
    && Number.isFinite(skewY)
    && Math.abs(skewX) <= SHAPE_SCALE_PROJECTION_EPSILON
    && Math.abs(skewY) <= SHAPE_SCALE_PROJECTION_EPSILON
}

/** Проверяет исходные значения scale Fabric. */
function hasValidOriginalScales({
  original
}: {
  original: ShapeScaleGestureTransform['original']
}): boolean {
  return Number.isFinite(original.scaleX)
    && Number.isFinite(original.scaleY)
    && original.scaleX > SHAPE_SCALE_PROJECTION_EPSILON
    && original.scaleY > SHAPE_SCALE_PROJECTION_EPSILON
}

/** Проверяет входные данные перед расчётом исходной геометрии. */
function canCreateShapeScaleProjection({
  transform,
  pointerStart,
  controlKey
}: {
  transform: ShapeScaleGestureTransform
  pointerStart: ShapeScalePoint
  controlKey: ShapeScaleControlKey
}): boolean {
  return isSupportedShapeScaleTarget({ target: transform.target })
    && isMatchingScaleAction({ action: transform.action, controlKey })
    && hasValidOriginalScales({ original: transform.original })
    && isFinitePoint({ point: pointerStart })
}

/**
 * Запоминает исходную геометрию scale-жеста одиночного Shape.
 * Возвращает null, если жест не поддерживается новым snapping.
 */
export function createShapeScaleGestureProjection({
  transform,
  pointerStart
}: {
  transform: ShapeScaleGestureTransform
  pointerStart: ShapeScalePoint
}): ShapeScaleGestureProjection | null {
  if (!isShapeScaleControlKey(transform.corner)) return null
  if (!canCreateShapeScaleProjection({
    transform,
    pointerStart,
    controlKey: transform.corner
  })) return null

  const origin = resolveTransformOrigin({ transform })
  const control = SHAPE_SCALE_CONTROL_COORDINATES[transform.corner]
  if (!origin || !hasValidControlLevers({ controlKey: transform.corner, control, origin })) return null

  const corners = readShapeScaleCorners({ target: transform.target })
  if (!corners) return null

  const u = subtractPoints({ point: corners.topRight, origin: corners.topLeft })
  const v = subtractPoints({ point: corners.bottomLeft, origin: corners.topLeft })
  if (Math.abs(getBasisDeterminant({ u, v })) <= SHAPE_SCALE_PROJECTION_EPSILON) return null

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
  controlKey: ShapeScaleControlKey
  mode: ShapeScaleGestureMode
}): boolean {
  if (controlKey === 'ml' || controlKey === 'mr') return mode === 'horizontal'
  if (controlKey === 'mt' || controlKey === 'mb') return mode === 'vertical'

  return mode === 'free' || mode === 'uniform'
}

/** Переводит смещение указателя в локальные оси исходного Shape. */
function resolvePointerBasisDelta({
  projection,
  pointer
}: {
  projection: ShapeScaleGestureProjection
  pointer: ShapeScalePoint
}): ShapeScalePoint | null {
  if (!isFinitePoint({ point: pointer })) return null

  const deltaX = pointer.x - projection.pointerStart.x
  const deltaY = pointer.y - projection.pointerStart.y
  const determinant = getBasisDeterminant({ u: projection.u, v: projection.v })
  if (Math.abs(determinant) <= SHAPE_SCALE_PROJECTION_EPSILON) return null

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
  projection: ShapeScaleGestureProjection
  pointerDelta: ShapeScalePoint
}): ShapeScaleMultipliers {
  const leverX = projection.control.x - projection.origin.x
  const leverY = projection.control.y - projection.origin.y

  return Object.freeze({
    x: Math.abs(leverX) > SHAPE_SCALE_PROJECTION_EPSILON
      ? (leverX + pointerDelta.x) / leverX
      : 1,
    y: Math.abs(leverY) > SHAPE_SCALE_PROJECTION_EPSILON
      ? (leverY + pointerDelta.y) / leverY
      : 1
  })
}

/** Возвращает длину вектора исходной геометрии. */
function getVectorLength({ vector }: { vector: ShapeScalePoint }): number {
  return Math.sqrt((vector.x ** 2) + (vector.y ** 2))
}

/** Вычисляет множитель пропорционального scale так же, как Fabric. */
function resolveUniformMultiplier({
  projection,
  pointerDelta
}: {
  projection: ShapeScaleGestureProjection
  pointerDelta: ShapeScalePoint
}): number | null {
  const leverX = projection.control.x - projection.origin.x
  const leverY = projection.control.y - projection.origin.y
  const currentLeverX = leverX + pointerDelta.x
  const currentLeverY = leverY + pointerDelta.y
  if ((leverX * currentLeverX) < 0 || (leverY * currentLeverY) < 0) return null

  const uLength = getVectorLength({ vector: projection.u })
  const vLength = getVectorLength({ vector: projection.v })
  const baselineDistance = (Math.abs(leverX) * uLength) + (Math.abs(leverY) * vLength)
  if (baselineDistance <= SHAPE_SCALE_PROJECTION_EPSILON) return null

  const currentDistance = (Math.abs(currentLeverX) * uLength)
    + (Math.abs(currentLeverY) * vLength)

  return currentDistance / baselineDistance
}

/**
 * Возвращает множители scale по смещению указателя от начала жеста.
 * Расчёт не зависит от текущей геометрии Shape.
 */
export function resolveShapeScalePointerMultipliers({
  projection,
  pointer,
  mode
}: {
  projection: ShapeScaleGestureProjection
  pointer: ShapeScalePoint
  mode: ShapeScaleGestureMode
}): ShapeScaleMultipliers | null {
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
  projection: ShapeScaleGestureProjection
  multipliers: ShapeScaleMultipliers
  coordinates: ShapeScalePoint
}): ShapeScalePoint {
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
}: ShapeScaleCorners): Readonly<ObjectBounds> {
  return createBoundsFromCorners({
    corners: Object.freeze({ topLeft, topRight, bottomRight, bottomLeft })
  })
}

/**
 * Рассчитывает bounds для заданных множителей, не изменяя Shape.
 */
export function projectShapeScaleBounds({
  projection,
  multipliers
}: {
  projection: ShapeScaleGestureProjection
  multipliers: ShapeScaleMultipliers
}): Readonly<ObjectBounds> | null {
  if (!Number.isFinite(multipliers.x) || !Number.isFinite(multipliers.y)) return null

  return createProjectedBounds({
    topLeft: projectScaledPoint({ projection, multipliers, coordinates: SHAPE_SCALE_CONTROL_COORDINATES.tl }),
    topRight: projectScaledPoint({ projection, multipliers, coordinates: SHAPE_SCALE_CONTROL_COORDINATES.tr }),
    bottomRight: projectScaledPoint({ projection, multipliers, coordinates: SHAPE_SCALE_CONTROL_COORDINATES.br }),
    bottomLeft: projectScaledPoint({ projection, multipliers, coordinates: SHAPE_SCALE_CONTROL_COORDINATES.bl })
  })
}

/** Возвращает исходную позицию указанной грани. */
function getBaselineEdgePosition({
  bounds,
  edge
}: {
  bounds: Readonly<ObjectBounds>
  edge: ShapeScaleSceneEdge
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
  extremum: ShapeScaleEdgeExtremum
}): number {
  if (extremum === 'minimum') return component >= 0 ? 0 : 1

  return component >= 0 ? 1 : 0
}

/** Вычисляет вклад ширины и высоты в положение одной грани. */
function createEdgeCoefficients({
  projection,
  descriptor
}: {
  projection: ShapeScaleGestureProjection
  descriptor: ShapeScaleEdgeDescriptor
}): ShapeScaleEdgeCoefficients {
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
  mode: ShapeScaleGestureMode
}): readonly ShapeScaleProjectionVariable[] {
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
  edge: ShapeScaleEdgeCoefficients
  mode: ShapeScaleGestureMode
}): readonly number[] {
  if (mode === 'horizontal') return Object.freeze([edge.multiplierX])
  if (mode === 'vertical') return Object.freeze([edge.multiplierY])
  if (mode === 'free') return Object.freeze([edge.multiplierX, edge.multiplierY])

  return Object.freeze([edge.multiplierX + edge.multiplierY])
}

/** Проверяет, что выбранный режим действительно перемещает грань. */
function hasActiveModeCoefficient({ coefficients }: { coefficients: readonly number[] }): boolean {
  return coefficients.some((coefficient) => Math.abs(coefficient) > SHAPE_SCALE_PROJECTION_EPSILON)
}

/** Возвращает расчёт перемещаемой грани или null для неподвижной. */
function createModeEdgeProjection({
  edge,
  mode
}: {
  edge: ShapeScaleEdgeCoefficients
  mode: ShapeScaleGestureMode
}): ShapeScaleEdgeProjection | null {
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
export function resolveShapeScaleModeProjection({
  projection,
  mode
}: {
  projection: ShapeScaleGestureProjection
  mode: ShapeScaleGestureMode
}): ShapeScaleModeProjection | null {
  if (!isModeSupportedByControl({ controlKey: projection.controlKey, mode })) return null

  const edges = SHAPE_SCALE_EDGE_DESCRIPTORS
    .map((descriptor) => createEdgeCoefficients({ projection, descriptor }))
    .map((edge) => createModeEdgeProjection({ edge, mode }))
    .filter((edge): edge is ShapeScaleEdgeProjection => edge !== null)
  const variables = getModeVariables({ mode })

  return Object.freeze({
    mode,
    variables,
    baselineValues: Object.freeze(variables.map(() => 1)),
    edges: Object.freeze(edges)
  })
}
