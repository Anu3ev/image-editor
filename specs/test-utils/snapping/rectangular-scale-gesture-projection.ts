import {
  Point,
  Rect,
  type FabricObject,
  type TOriginX,
  type TOriginY
} from 'fabric'
import type { ImageEditor } from '../../../src/editor'
import type {
  RectangularScaleControlKey,
  RectangularScaleGestureMode,
  RectangularScaleGestureTransform,
  RectangularScaleMultipliers,
  RectangularScalePoint
} from '../../../src/editor/snapping-manager/scaling/rectangular-scale-gesture-projection'
import type { ScaleSnapEnvironment } from '../../../src/editor/snapping-manager/scaling/scale-snap-candidates'
import type { ObjectBounds } from '../../../src/editor/utils/geometry'

/** Test geometry parameters for one rectangular scaling gesture. */
export type RectangularScaleProjectionFixtureOptions = Readonly<{
  controlKey: RectangularScaleControlKey
  angle?: number
  width?: number
  height?: number
  centerX?: number
  centerY?: number
  centered?: boolean
  originalScaleX?: number
  originalScaleY?: number
}>

/** Full set of initial geometry for scaling calculation tests. */
export type RectangularScaleProjectionFixture = Readonly<{
  target: FabricObject
  transform: RectangularScaleGestureTransform
  transformOriginal: {
    scaleX: number
    scaleY: number
  }
  pointerStart: RectangularScalePoint
  control: RectangularScalePoint
  origin: RectangularScalePoint
  fixedAnchor: RectangularScalePoint
  topLeft: RectangularScalePoint
  u: RectangularScalePoint
  v: RectangularScalePoint
  sourceCorners: readonly Point[]
  baselineBounds: ObjectBounds
  getCoordsMock: jest.Mock<Point[], []>
}>

/** One handle-and-rotation-angle scenario for parameterized tests. */
export type RectangularScaleControlRotationCase = Readonly<{
  controlKey: RectangularScaleControlKey
  angle: number
}>

/** Initial geometry of the rectangular object before scaling starts. */
type RectangularScaleSourceGeometry = Readonly<{
  topLeft: RectangularScalePoint
  u: RectangularScalePoint
  v: RectangularScalePoint
  transformOriginal: Readonly<{
    scaleX: number
    scaleY: number
  }>
}>

/** Minimal test environment contract for setting a guide. */
type RectangularScaleGuideHarness = Readonly<{
  baselineBounds: ObjectBounds
  captureEnvironmentMock: jest.MockedFunction<
    ImageEditor['snappingManager']['captureScaleSnapEnvironment']
  >
}>

/** Vectors of the rectangle's local axes at the current scale. */
type RectangularScaleBasis = Readonly<{
  u: RectangularScalePoint
  v: RectangularScalePoint
}>

/** All eight rectangular scaling handles. */
export const RECTANGULAR_SCALE_CONTROL_KEYS: readonly RectangularScaleControlKey[] = Object.freeze([
  'tl', 'tr', 'bl', 'br', 'ml', 'mr', 'mt', 'mb'
])

/** Set of angles for unrotated and rotated objects. */
export const RECTANGULAR_SCALE_TEST_ANGLES: readonly number[] = Object.freeze([0, 30, 90])

/** All combinations of eight handles and three angles. */
export const RECTANGULAR_SCALE_CONTROL_ROTATION_CASES: readonly RectangularScaleControlRotationCase[] = Object.freeze(
  RECTANGULAR_SCALE_CONTROL_KEYS.reduce<RectangularScaleControlRotationCase[]>((cases, controlKey) => {
    RECTANGULAR_SCALE_TEST_ANGLES.forEach((angle) => {
      cases.push(Object.freeze({ controlKey, angle }))
    })

    return cases
  }, [])
)

/** Normalized local coordinates of scaling handles. */
const CONTROL_COORDINATES: Readonly<Record<RectangularScaleControlKey, RectangularScalePoint>> = Object.freeze({
  tl: Object.freeze({ x: 0, y: 0 }),
  tr: Object.freeze({ x: 1, y: 0 }),
  bl: Object.freeze({ x: 0, y: 1 }),
  br: Object.freeze({ x: 1, y: 1 }),
  ml: Object.freeze({ x: 0, y: 0.5 }),
  mr: Object.freeze({ x: 1, y: 0.5 }),
  mt: Object.freeze({ x: 0.5, y: 0 }),
  mb: Object.freeze({ x: 0.5, y: 1 })
})

/** Constant pointer offset relative to the handle center. */
const POINTER_HIT_OFFSET: RectangularScalePoint = Object.freeze({ x: 3, y: -2 })

/** Returns the Fabric action corresponding to the selected handle. */
function resolveScaleAction({ controlKey }: { controlKey: string }): RectangularScaleGestureTransform['action'] {
  if (controlKey === 'ml' || controlKey === 'mr') return 'scaleX'
  if (controlKey === 'mt' || controlKey === 'mb') return 'scaleY'

  return 'scale'
}

/** Converts degrees to radians. */
function toRadians({ angle }: { angle: number }): number {
  return angle * (Math.PI / 180)
}

/** Creates a basis for the rotated rectangle from its visible width and height. */
function createBasis({
  angle,
  width,
  height
}: {
  angle: number
  width: number
  height: number
}): { u: RectangularScalePoint; v: RectangularScalePoint } {
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

/** Returns the opposite fixed point, or the center when scaling from the center. */
function resolveFixtureOrigin({
  control,
  centered
}: {
  control: RectangularScalePoint
  centered: boolean
}): RectangularScalePoint {
  if (centered) return Object.freeze({ x: 0.5, y: 0.5 })

  return Object.freeze({
    x: control.x === 0.5 ? 0.5 : 1 - control.x,
    y: control.y === 0.5 ? 0.5 : 1 - control.y
  })
}

/** Converts normalized local coordinates to canvas coordinates. */
function projectFixturePoint({
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

/** Creates initial corner coordinates in Fabric order: tl, tr, br, bl. */
function createFixtureCorners({
  topLeft,
  u,
  v
}: {
  topLeft: RectangularScalePoint
  u: RectangularScalePoint
  v: RectangularScalePoint
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

/** Calculates exact enclosing bounds from corner coordinates. */
function createFixtureBounds({ points }: { points: readonly RectangularScalePoint[] }): ObjectBounds {
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

/** Converts a Fabric anchor point to a normalized coordinate along one axis. */
function resolveOriginCoordinate({
  end,
  origin,
  start
}: {
  end: 'bottom' | 'right'
  origin: TOriginX | TOriginY
  start: 'left' | 'top'
}): number {
  if (typeof origin === 'number') return origin
  if (origin === start) return 0
  if (origin === end) return 1

  return 0.5
}

/** Checks the test rectangle's initial geometry. */
function assertSourceGeometry({
  sourceGeometry
}: {
  sourceGeometry: RectangularScaleSourceGeometry
}): void {
  const { topLeft, transformOriginal, u, v } = sourceGeometry
  const coordinates = [topLeft.x, topLeft.y, u.x, u.y, v.x, v.y]

  if (!coordinates.every(Number.isFinite)) {
    throw new Error('Исходная геометрия тестового прямоугольника должна содержать конечные числа')
  }
  if (transformOriginal.scaleX <= 0 || transformOriginal.scaleY <= 0) {
    throw new Error('Исходный масштаб тестового прямоугольника должен быть положительным')
  }
}

/** Scales the rectangle's initial axes using the object's current state. */
function resolveCurrentBasis({
  sourceGeometry,
  target
}: {
  sourceGeometry: RectangularScaleSourceGeometry
  target: FabricObject
}): RectangularScaleBasis {
  const multiplierX = target.scaleX / sourceGeometry.transformOriginal.scaleX
  const multiplierY = target.scaleY / sourceGeometry.transformOriginal.scaleY

  return {
    u: {
      x: sourceGeometry.u.x * multiplierX,
      y: sourceGeometry.u.y * multiplierX
    },
    v: {
      x: sourceGeometry.v.x * multiplierY,
      y: sourceGeometry.v.y * multiplierY
    }
  }
}

/** Returns the bounding rectangle of the object's four corners. */
function createBoundingRect({
  points
}: {
  points: readonly RectangularScalePoint[]
}): Readonly<{ left: number; top: number; width: number; height: number }> {
  const bounds = createFixtureBounds({ points })

  return {
    left: bounds.left,
    top: bounds.top,
    width: bounds.right - bounds.left,
    height: bounds.bottom - bounds.top
  }
}

/** Sets shared deterministic geometry for the rectangular object. */
export function installRectangularScaleGeometryContract({
  sourceGeometry,
  target
}: {
  sourceGeometry: RectangularScaleSourceGeometry
  target: FabricObject
}): void {
  assertSourceGeometry({ sourceGeometry })
  let topLeft = new Point(sourceGeometry.topLeft.x, sourceGeometry.topLeft.y)

  const projectPoint = (originX: TOriginX, originY: TOriginY): Point => {
    const x = resolveOriginCoordinate({ origin: originX, start: 'left', end: 'right' })
    const y = resolveOriginCoordinate({ origin: originY, start: 'top', end: 'bottom' })
    const { u, v } = resolveCurrentBasis({ sourceGeometry, target })

    return new Point(
      topLeft.x + (x * u.x) + (y * v.x),
      topLeft.y + (x * u.y) + (y * v.y)
    )
  }

  target.getPointByOrigin = projectPoint
  target.getCoords = () => [
    projectPoint('left', 'top'),
    projectPoint('right', 'top'),
    projectPoint('right', 'bottom'),
    projectPoint('left', 'bottom')
  ]
  target.getBoundingRect = () => createBoundingRect({ points: target.getCoords() })
  target.setPositionByOrigin = (point, originX, originY) => {
    const projectedOrigin = projectPoint(originX, originY)
    topLeft = new Point(
      topLeft.x + point.x - projectedOrigin.x,
      topLeft.y + point.y - projectedOrigin.y
    )
    const ownOrigin = projectPoint(target.originX, target.originY)
    target.left = ownOrigin.x
    target.top = ownOrigin.y
  }
  target.setCoords = jest.fn()

  const ownOrigin = projectPoint(target.originX, target.originY)
  target.left = ownOrigin.x
  target.top = ownOrigin.y
}

/** Creates a test rectangle with a controllable getCoords result. */
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
}): { target: FabricObject; getCoordsMock: jest.Mock<Point[], []> } {
  const target = new Rect({
    left: centerX,
    top: centerY,
    width,
    height,
    angle,
    scaleX: originalScaleX,
    scaleY: originalScaleY,
    skewX: 0,
    skewY: 0
  })
  const getCoordsMock = jest.fn(() => sourceCorners)

  target.getCoords = getCoordsMock

  return { target, getCoordsMock }
}

/** Creates the full set of initial geometry for a rectangular scaling gesture. */
export function createRectangularScaleProjectionFixture({
  controlKey,
  angle = 0,
  width = 200,
  height = 100,
  centerX = 400,
  centerY = 300,
  centered = false,
  originalScaleX = 1.25,
  originalScaleY = 0.8
}: RectangularScaleProjectionFixtureOptions): RectangularScaleProjectionFixture {
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

/** Returns the free-scaling mode for the specified handle. */
export function resolveFixtureFreeMode({
  controlKey
}: {
  controlKey: RectangularScaleControlKey
}): RectangularScaleGestureMode {
  if (controlKey === 'ml' || controlKey === 'mr') return 'horizontal'
  if (controlKey === 'mt' || controlKey === 'mb') return 'vertical'

  return 'free'
}

/** Calculates a new pointer position from the specified dimension factors. */
export function moveFixturePointer({
  fixture,
  multipliers
}: {
  fixture: RectangularScaleProjectionFixture
  multipliers: RectangularScaleMultipliers
}): RectangularScalePoint {
  const leverX = fixture.control.x - fixture.origin.x
  const leverY = fixture.control.y - fixture.origin.y
  const deltaX = leverX * (multipliers.x - 1)
  const deltaY = leverY * (multipliers.y - 1)

  return Object.freeze({
    x: fixture.pointerStart.x + (deltaX * fixture.u.x) + (deltaY * fixture.v.x),
    y: fixture.pointerStart.y + (deltaX * fixture.u.y) + (deltaY * fixture.v.y)
  })
}

/** Independently calculates the expected rectangle bounds from the specified factors. */
export function projectFixtureBounds({
  fixture,
  multipliers
}: {
  fixture: RectangularScaleProjectionFixture
  multipliers: RectangularScaleMultipliers
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

/** Sets one guide relative to the rectangular object's initial edge. */
export function useRectangularScaleGuide({
  axis,
  candidateIdPrefix,
  edge,
  harness,
  offset,
  zoom = 1
}: {
  axis: 'x' | 'y'
  candidateIdPrefix: string
  edge: 'bottom' | 'left' | 'right' | 'top'
  harness: RectangularScaleGuideHarness
  offset: number
  zoom?: number
}): number {
  if (!Number.isFinite(offset)) throw new Error('Смещение тестовой направляющей должно быть конечным')
  if (!Number.isFinite(zoom) || zoom <= 0) {
    throw new Error('Масштаб тестового окружения должен быть положительным')
  }

  const position = harness.baselineBounds[edge] + offset
  const candidate: ScaleSnapEnvironment['candidates'][number] = Object.freeze({
    id: `${candidateIdPrefix}-${edge}-guide`,
    axis,
    edge,
    position,
    category: 'edge'
  })
  harness.captureEnvironmentMock.mockReturnValue(Object.freeze({
    candidates: Object.freeze([candidate]),
    zoom
  }))

  return position
}
