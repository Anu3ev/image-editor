import {
  Group,
  Point,
  type FabricObject
} from 'fabric'
import type {
  ShapeScaleControlKey,
  ShapeScaleGestureMode,
  ShapeScaleGestureTransform,
  ShapeScaleMultipliers,
  ShapeScalePoint
} from '../../../src/editor/shape-manager/scaling/shape-scale-projection'
import type { ShapeGroup } from '../../../src/editor/shape-manager/types'
import type { ObjectBounds } from '../../../src/editor/utils/geometry'

/** Параметры тестовой геометрии одного жеста скейлинга Shape. */
export type ShapeScaleProjectionFixtureOptions = Readonly<{
  controlKey: ShapeScaleControlKey
  angle?: number
  width?: number
  height?: number
  centerX?: number
  centerY?: number
  centered?: boolean
  originalScaleX?: number
  originalScaleY?: number
}>

/** Полный набор исходной геометрии для тестов расчёта скейлинга. */
export type ShapeScaleProjectionFixture = Readonly<{
  target: ShapeGroup
  transform: ShapeScaleGestureTransform
  transformOriginal: {
    scaleX: number
    scaleY: number
  }
  pointerStart: ShapeScalePoint
  control: ShapeScalePoint
  origin: ShapeScalePoint
  fixedAnchor: ShapeScalePoint
  topLeft: ShapeScalePoint
  u: ShapeScalePoint
  v: ShapeScalePoint
  sourceCorners: readonly Point[]
  baselineBounds: ObjectBounds
  getCoordsMock: jest.Mock<Point[], []>
}>

/** Один сценарий ручки и угла поворота для параметризованных тестов. */
export type ShapeScaleControlRotationCase = Readonly<{
  controlKey: ShapeScaleControlKey
  angle: number
}>

/** Все восемь ручек скейлинга Shape. */
export const SHAPE_SCALE_CONTROL_KEYS: readonly ShapeScaleControlKey[] = Object.freeze([
  'tl', 'tr', 'bl', 'br', 'ml', 'mr', 'mt', 'mb'
])

/** Набор углов для объектов без поворота и повёрнутых объектов. */
export const SHAPE_SCALE_TEST_ANGLES: readonly number[] = Object.freeze([0, 30, 90])

/** Все сочетания восьми ручек и трёх углов. */
export const SHAPE_SCALE_CONTROL_ROTATION_CASES: readonly ShapeScaleControlRotationCase[] = Object.freeze(
  SHAPE_SCALE_CONTROL_KEYS.reduce<ShapeScaleControlRotationCase[]>((cases, controlKey) => {
    SHAPE_SCALE_TEST_ANGLES.forEach((angle) => {
      cases.push(Object.freeze({ controlKey, angle }))
    })

    return cases
  }, [])
)

/** Нормализованные локальные координаты ручек скейлинга. */
const CONTROL_COORDINATES: Readonly<Record<ShapeScaleControlKey, ShapeScalePoint>> = Object.freeze({
  tl: Object.freeze({ x: 0, y: 0 }),
  tr: Object.freeze({ x: 1, y: 0 }),
  bl: Object.freeze({ x: 0, y: 1 }),
  br: Object.freeze({ x: 1, y: 1 }),
  ml: Object.freeze({ x: 0, y: 0.5 }),
  mr: Object.freeze({ x: 1, y: 0.5 }),
  mt: Object.freeze({ x: 0.5, y: 0 }),
  mb: Object.freeze({ x: 0.5, y: 1 })
})

/** Постоянное смещение указателя относительно центра ручки. */
const POINTER_HIT_OFFSET: ShapeScalePoint = Object.freeze({ x: 3, y: -2 })

/** Возвращает действие Fabric, соответствующее выбранной ручке. */
function resolveScaleAction({ controlKey }: { controlKey: string }): ShapeScaleGestureTransform['action'] {
  if (controlKey === 'ml' || controlKey === 'mr') return 'scaleX'
  if (controlKey === 'mt' || controlKey === 'mb') return 'scaleY'

  return 'scale'
}

/** Переводит градусы в радианы. */
function toRadians({ angle }: { angle: number }): number {
  return angle * (Math.PI / 180)
}

/** Создаёт базис повёрнутого прямоугольника по его видимой ширине и высоте. */
function createBasis({
  angle,
  width,
  height
}: {
  angle: number
  width: number
  height: number
}): { u: ShapeScalePoint; v: ShapeScalePoint } {
  const radians = toRadians({ angle })
  const cosine = Math.cos(radians)
  const sine = Math.sin(radians)

  return {
    u: Object.freeze({
      x: width * cosine,
      y: width * sine
    }),
    v: Object.freeze({
      x: -height * sine,
      y: height * cosine
    })
  }
}

/** Возвращает противоположную точку фиксации либо центр при скейлинге от центра. */
function resolveFixtureOrigin({
  control,
  centered
}: {
  control: ShapeScalePoint
  centered: boolean
}): ShapeScalePoint {
  if (centered) return Object.freeze({ x: 0.5, y: 0.5 })

  return Object.freeze({
    x: control.x === 0.5 ? 0.5 : 1 - control.x,
    y: control.y === 0.5 ? 0.5 : 1 - control.y
  })
}

/** Переводит локальные нормализованные координаты в координаты canvas. */
function projectFixturePoint({
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

/** Создаёт исходные координаты углов в порядке Fabric: tl, tr, br, bl. */
function createFixtureCorners({
  topLeft,
  u,
  v
}: {
  topLeft: ShapeScalePoint
  u: ShapeScalePoint
  v: ShapeScalePoint
}): Point[] {
  const topRight = projectFixturePoint({ topLeft, u, v, coordinates: CONTROL_COORDINATES.tr })
  const bottomRight = projectFixturePoint({ topLeft, u, v, coordinates: CONTROL_COORDINATES.br })
  const bottomLeft = projectFixturePoint({ topLeft, u, v, coordinates: CONTROL_COORDINATES.bl })

  return [
    new Point(topLeft.x, topLeft.y),
    new Point(topRight.x, topRight.y),
    new Point(bottomRight.x, bottomRight.y),
    new Point(bottomLeft.x, bottomLeft.y)
  ]
}

/** Вычисляет точные охватывающие границы по координатам углов. */
function createFixtureBounds({ points }: { points: readonly ShapeScalePoint[] }): ObjectBounds {
  const xCoordinates = points.map(({ x }) => x)
  const yCoordinates = points.map(({ y }) => y)
  const left = Math.min(...xCoordinates)
  const right = Math.max(...xCoordinates)
  const top = Math.min(...yCoordinates)
  const bottom = Math.max(...yCoordinates)

  return {
    left,
    right,
    top,
    bottom,
    centerX: left + ((right - left) / 2),
    centerY: top + ((bottom - top) / 2)
  }
}

/** Создаёт тестовый Shape с управляемым результатом getCoords. */
function createFixtureTarget({
  sourceCorners,
  width,
  height,
  centerX,
  centerY,
  angle,
  originalScaleX,
  originalScaleY
}: {
  sourceCorners: Point[]
  width: number
  height: number
  centerX: number
  centerY: number
  angle: number
  originalScaleX: number
  originalScaleY: number
}): { target: ShapeGroup; getCoordsMock: jest.Mock<Point[], []> } {
  const target = new Group([], {
    left: centerX,
    top: centerY,
    width,
    height,
    angle,
    scaleX: originalScaleX,
    scaleY: originalScaleY,
    skewX: 0,
    skewY: 0
  }) as ShapeGroup
  const getCoordsMock = jest.fn(() => sourceCorners)

  target.shapeComposite = true
  target.getCoords = getCoordsMock

  return { target, getCoordsMock }
}

/** Создаёт полный набор исходной геометрии для жеста скейлинга Shape. */
export function createShapeScaleProjectionFixture({
  controlKey,
  angle = 0,
  width = 200,
  height = 100,
  centerX = 400,
  centerY = 300,
  centered = false,
  originalScaleX = 1.25,
  originalScaleY = 0.8
}: ShapeScaleProjectionFixtureOptions): ShapeScaleProjectionFixture {
  const control = CONTROL_COORDINATES[controlKey]
  const origin = resolveFixtureOrigin({ control, centered })
  const { u, v } = createBasis({ angle, width, height })
  const topLeft = Object.freeze({
    x: centerX - ((u.x + v.x) / 2),
    y: centerY - ((u.y + v.y) / 2)
  })
  const sourceCorners = createFixtureCorners({ topLeft, u, v })
  const { target, getCoordsMock } = createFixtureTarget({
    sourceCorners,
    width,
    height,
    centerX,
    centerY,
    angle,
    originalScaleX,
    originalScaleY
  })
  const transformOriginal = { scaleX: originalScaleX, scaleY: originalScaleY }
  const fixedAnchor = projectFixturePoint({ topLeft, u, v, coordinates: origin })
  const controlPoint = projectFixturePoint({ topLeft, u, v, coordinates: control })
  const pointerStart = Object.freeze({
    x: controlPoint.x + POINTER_HIT_OFFSET.x,
    y: controlPoint.y + POINTER_HIT_OFFSET.y
  })

  return Object.freeze({
    target,
    transform: Object.freeze({
      target,
      action: resolveScaleAction({ controlKey }),
      corner: controlKey,
      originX: origin.x,
      originY: origin.y,
      original: transformOriginal
    }),
    transformOriginal,
    pointerStart,
    control,
    origin,
    fixedAnchor,
    topLeft,
    u,
    v,
    sourceCorners,
    baselineBounds: createFixtureBounds({ points: sourceCorners }),
    getCoordsMock
  })
}

/** Создаёт transform для произвольного Fabric-объекта. */
export function createShapeScaleGestureTransform({
  target,
  corner = 'br'
}: {
  target: FabricObject
  corner?: string
}): ShapeScaleGestureTransform {
  return {
    target,
    action: resolveScaleAction({ controlKey: corner }),
    corner,
    originX: 'left',
    originY: 'top',
    original: {
      scaleX: 1,
      scaleY: 1
    }
  }
}

/** Возвращает режим свободного скейлинга для указанной ручки. */
export function resolveFixtureFreeMode({
  controlKey
}: {
  controlKey: ShapeScaleControlKey
}): ShapeScaleGestureMode {
  if (controlKey === 'ml' || controlKey === 'mr') return 'horizontal'
  if (controlKey === 'mt' || controlKey === 'mb') return 'vertical'

  return 'free'
}

/** Рассчитывает новое положение указателя по заданным множителям размеров. */
export function moveFixturePointer({
  fixture,
  multipliers
}: {
  fixture: ShapeScaleProjectionFixture
  multipliers: ShapeScaleMultipliers
}): ShapeScalePoint {
  const leverX = fixture.control.x - fixture.origin.x
  const leverY = fixture.control.y - fixture.origin.y
  const deltaX = leverX * (multipliers.x - 1)
  const deltaY = leverY * (multipliers.y - 1)

  return Object.freeze({
    x: fixture.pointerStart.x + (deltaX * fixture.u.x) + (deltaY * fixture.v.x),
    y: fixture.pointerStart.y + (deltaX * fixture.u.y) + (deltaY * fixture.v.y)
  })
}

/** Независимо рассчитывает ожидаемые границы Shape по заданным множителям. */
export function projectFixtureBounds({
  fixture,
  multipliers
}: {
  fixture: ShapeScaleProjectionFixture
  multipliers: ShapeScaleMultipliers
}): ObjectBounds {
  const coordinates = [
    CONTROL_COORDINATES.tl,
    CONTROL_COORDINATES.tr,
    CONTROL_COORDINATES.br,
    CONTROL_COORDINATES.bl
  ]
  const points = coordinates.map((coordinate) => {
    const localX = coordinate.x - fixture.origin.x
    const localY = coordinate.y - fixture.origin.y

    return {
      x: fixture.fixedAnchor.x + (localX * multipliers.x * fixture.u.x)
        + (localY * multipliers.y * fixture.v.x),
      y: fixture.fixedAnchor.y + (localX * multipliers.x * fixture.u.y)
        + (localY * multipliers.y * fixture.v.y)
    }
  })

  return createFixtureBounds({ points })
}
