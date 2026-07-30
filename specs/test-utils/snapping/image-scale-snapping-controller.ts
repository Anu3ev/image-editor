import {
  Canvas,
  FabricImage,
  Point,
  controlsUtils,
  type TOriginX,
  type TOriginY,
  type Transform
} from 'fabric'

import { ImageEditor } from '../../../src/editor'
import {
  ImageScaleSnappingController,
  type ImageScaleMouseMoveEvent,
  type ImageScaleStartEvent,
  type ImageScaleTransformEvent
} from '../../../src/editor/snapping-manager/scaling/image-scale-snapping-controller'
import type {
  RectangularScaleControlKey,
  RectangularScaleMultipliers
} from '../../../src/editor/snapping-manager/scaling/rectangular-scale-gesture-projection'
import SnappingManager from '../../../src/editor/snapping-manager'
import type { ScaleSnapEnvironment } from '../../../src/editor/snapping-manager/scaling/scale-snap-candidates'
import { getObjectExactBounds, type ObjectBounds } from '../../../src/editor/utils/geometry'
import { createMockFabricImage } from '../managers/image'
import {
  createRectangularScaleProjectionFixture,
  moveFixturePointer,
  type RectangularScaleProjectionFixture
} from './rectangular-scale-gesture-projection'

/** Параметры тестового Image scale-жеста. */
export type ImageScaleSnappingHarnessOptions = Readonly<{
  angle?: number
  centered?: boolean
  controlKey?: RectangularScaleControlKey
  height?: number
  minScaleLimit?: number
  originalScaleX?: number
  originalScaleY?: number
  uniformScaling?: boolean
  width?: number
}>

/** Наблюдаемые зависимости и исходная геометрия одного Image scale-жеста. */
export type ImageScaleSnappingHarness = Readonly<{
  baselineBounds: ObjectBounds
  captureEnvironmentMock: jest.MockedFunction<
    ImageEditor['snappingManager']['captureScaleSnapEnvironment']
  >
  controlKey: RectangularScaleControlKey
  controller: ImageScaleSnappingController
  fixedAnchor: Point
  pointerStart: Point
  setMock: jest.SpiedFunction<FabricImage['set']>
  setPositionByOriginMock: jest.SpiedFunction<FabricImage['setPositionByOrigin']>
  target: FabricImage
  transform: Transform
  applyFabricPreview: (multipliers: RectangularScaleMultipliers) => void
  resolvePointer: (multipliers: RectangularScaleMultipliers) => Point
}>

/** Векторы текущих локальных осей тестового Image. */
type ImageScaleGeometryBasis = Readonly<{
  u: Readonly<{ x: number; y: number }>
  v: Readonly<{ x: number; y: number }>
}>

/** Editor и наблюдаемое окружение, необходимые Image scale-controller. */
type ImageScaleControllerDependencies = Readonly<{
  captureEnvironmentMock: ImageScaleSnappingHarness['captureEnvironmentMock']
  editor: ImageEditor
}>

/** Создаёт реальный FabricImage с управляемой исходной геометрией. */
function createImageScaleTarget({
  angle,
  height,
  originalScaleX,
  originalScaleY,
  width
}: {
  angle: number
  height: number
  originalScaleX: number
  originalScaleY: number
  width: number
}): FabricImage {
  if (!Number.isFinite(width) || width <= 0) throw new Error('Ширина тестового Image должна быть положительной')
  if (!Number.isFinite(height) || height <= 0) throw new Error('Высота тестового Image должна быть положительной')
  if (!Number.isFinite(angle)) throw new Error('Угол тестового Image должен быть конечным')
  if (!Number.isFinite(originalScaleX) || originalScaleX <= 0) {
    throw new Error('Исходный scaleX тестового Image должен быть положительным')
  }
  if (!Number.isFinite(originalScaleY) || originalScaleY <= 0) {
    throw new Error('Исходный scaleY тестового Image должен быть положительным')
  }

  const target = createMockFabricImage({ width, height })
  target.set({
    left: 320,
    top: 240,
    originX: 'center',
    originY: 'center',
    width,
    height,
    scaleX: originalScaleX,
    scaleY: originalScaleY,
    angle,
    skewX: 0,
    skewY: 0,
    flipX: false,
    flipY: false,
    strokeWidth: 0,
    lockScalingX: false,
    lockScalingY: false
  })

  return target
}

/** Имитирует ограничение положительного scale, которое Fabric применяет внутри `set`. */
function installImageMinimumScaleContract({
  minScaleLimit,
  target
}: {
  minScaleLimit: number | undefined
  target: FabricImage
}): void {
  if (minScaleLimit === undefined) return
  if (!Number.isFinite(minScaleLimit) || minScaleLimit <= 0) {
    throw new Error('Минимальный scale тестового Image должен быть положительным')
  }

  let scaleX = target.scaleX
  let scaleY = target.scaleY
  target.minScaleLimit = minScaleLimit
  Object.defineProperties(target, {
    scaleX: {
      configurable: true,
      enumerable: true,
      get: () => scaleX,
      set: (value: number) => {
        scaleX = Math.max(value, minScaleLimit)
      }
    },
    scaleY: {
      configurable: true,
      enumerable: true,
      get: () => scaleY,
      set: (value: number) => {
        scaleY = Math.max(value, minScaleLimit)
      }
    }
  })
}

/** Переводит Fabric origin одной оси в нормализованную координату. */
function resolveOriginCoordinate({
  end,
  origin,
  start
}: {
  end: 'right' | 'bottom'
  origin: TOriginX | TOriginY
  start: 'left' | 'top'
}): number {
  if (typeof origin === 'number') return origin
  if (origin === start) return 0
  if (origin === end) return 1

  return 0.5
}

/** Масштабирует исходные оси fixture по текущим scale Image. */
function resolveScaledFixtureBasis({
  fixture,
  target
}: {
  fixture: RectangularScaleProjectionFixture
  target: FabricImage
}): ImageScaleGeometryBasis {
  const multiplierX = target.scaleX / fixture.transformOriginal.scaleX
  const multiplierY = target.scaleY / fixture.transformOriginal.scaleY

  return {
    u: {
      x: fixture.u.x * multiplierX,
      y: fixture.u.y * multiplierX
    },
    v: {
      x: fixture.v.x * multiplierY,
      y: fixture.v.y * multiplierY
    }
  }
}

/** Возвращает axis-aligned bounds четырёх углов тестового Image. */
function createImageScaleBoundingRect({
  points
}: {
  points: readonly Point[]
}): Readonly<{ left: number; top: number; width: number; height: number }> {
  const xCoordinates = points.map(({ x }) => x)
  const yCoordinates = points.map(({ y }) => y)
  const left = Math.min(...xCoordinates)
  const top = Math.min(...yCoordinates)

  return {
    left,
    top,
    width: Math.max(...xCoordinates) - left,
    height: Math.max(...yCoordinates) - top
  }
}

/** Устанавливает FabricImage детерминированный affine-контракт тестового прямоугольника. */
function installImageScaleGeometryContract({
  fixture,
  target
}: {
  fixture: RectangularScaleProjectionFixture
  target: FabricImage
}): void {
  let topLeft = new Point(fixture.topLeft.x, fixture.topLeft.y)

  const projectPoint = (originX: TOriginX, originY: TOriginY) => {
    const x = resolveOriginCoordinate({ origin: originX, start: 'left', end: 'right' })
    const y = resolveOriginCoordinate({ origin: originY, start: 'top', end: 'bottom' })
    const { u, v } = resolveScaledFixtureBasis({ fixture, target })

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
  target.getBoundingRect = () => createImageScaleBoundingRect({
    points: target.getCoords()
  })
  target.setPositionByOrigin = (point, originX, originY) => {
    const x = resolveOriginCoordinate({ origin: originX, start: 'left', end: 'right' })
    const y = resolveOriginCoordinate({ origin: originY, start: 'top', end: 'bottom' })
    const { u, v } = resolveScaledFixtureBasis({ fixture, target })
    topLeft = new Point(
      point.x - (x * u.x) - (y * v.x),
      point.y - (x * u.y) - (y * v.y)
    )
    const ownOrigin = projectPoint(target.originX, target.originY)
    target.left = ownOrigin.x
    target.top = ownOrigin.y
  }
  target.setCoords = () => undefined

  const ownOrigin = projectPoint(target.originX, target.originY)
  target.left = ownOrigin.x
  target.top = ownOrigin.y
}

/** Создаёт полный Fabric transform выбранной ручки. */
function createImageScaleTransform({
  fixture,
  target
}: {
  fixture: RectangularScaleProjectionFixture
  target: FabricImage
}): Transform {
  return {
    target,
    action: fixture.transform.action,
    corner: fixture.transform.corner,
    scaleX: target.scaleX,
    scaleY: target.scaleY,
    skewX: 0,
    skewY: 0,
    offsetX: 0,
    offsetY: 0,
    originX: fixture.transform.originX,
    originY: fixture.transform.originY,
    ex: 0,
    ey: 0,
    lastX: 0,
    lastY: 0,
    theta: 0,
    width: target.width,
    height: target.height,
    shiftKey: false,
    altKey: fixture.transform.originX === 0.5
      && fixture.transform.originY === 0.5,
    original: {
      scaleX: target.scaleX,
      scaleY: target.scaleY,
      skewX: 0,
      skewY: 0,
      angle: target.angle,
      left: target.left,
      top: target.top,
      flipX: false,
      flipY: false,
      originX: fixture.transform.originX,
      originY: fixture.transform.originY
    },
    actionPerformed: false
  }
}

/** Создаёт editor dependencies без запуска полного ImageEditor lifecycle. */
function createImageScaleControllerDependencies({
  target,
  uniformScaling
}: {
  target: FabricImage
  uniformScaling: boolean
}): ImageScaleControllerDependencies {
  const captureEnvironmentMock: ImageScaleSnappingHarness['captureEnvironmentMock'] = jest.fn<
    ScaleSnapEnvironment,
    Parameters<ImageEditor['snappingManager']['captureScaleSnapEnvironment']>
  >(() => Object.freeze({ candidates: Object.freeze([]), zoom: 1 }))
  const snappingManager: SnappingManager = Object.create(SnappingManager.prototype)
  snappingManager.captureScaleSnapEnvironment = captureEnvironmentMock
  const editor: ImageEditor = Object.create(ImageEditor.prototype)
  const canvas = Object.assign(Object.create(Canvas.prototype), {
    altActionKey: 'shiftKey',
    uniformScaling,
    uniScaleKey: 'shiftKey',
    viewportTransform: [1, 0, 0, 1, 0, 0]
  }) as Canvas
  editor.canvas = canvas
  editor.snappingManager = snappingManager
  target.canvas = canvas

  return Object.freeze({ captureEnvironmentMock, editor })
}

/** Возвращает точные границы тестового Image или завершает тест с ошибкой. */
export function getRequiredImageScaleBounds({
  target
}: {
  target: FabricImage
}): ObjectBounds {
  const bounds = getObjectExactBounds({ object: target })
  if (!bounds) throw new Error('Тестовый Image должен иметь точные границы')
  if (bounds.right <= bounds.left || bounds.bottom <= bounds.top) {
    throw new Error('Точные границы тестового Image должны иметь положительный размер')
  }

  return bounds
}

/** Проверяет оба множителя, используемых test-support слоем. */
function assertFiniteMultipliers({
  multipliers
}: {
  multipliers: RectangularScaleMultipliers
}): void {
  if (!Number.isFinite(multipliers.x)) throw new Error('Raw multiplier X тестового Image должен быть конечным')
  if (!Number.isFinite(multipliers.y)) throw new Error('Raw multiplier Y тестового Image должен быть конечным')
}

/** Создаёт независимый расчёт pointer position через общую affine fixture. */
function createPointerResolver({
  fixture
}: {
  fixture: RectangularScaleProjectionFixture
}): (multipliers: RectangularScaleMultipliers) => Point {
  return (multipliers) => {
    assertFiniteMultipliers({ multipliers })
    const point = moveFixturePointer({ fixture, multipliers })

    return new Point(point.x, point.y)
  }
}

/** Создаёт Image scale-controller с реальным runtime и наблюдаемым окружением. */
export function createImageScaleSnappingHarness({
  angle = 0,
  centered = false,
  controlKey = 'mr',
  height = 80,
  minScaleLimit,
  originalScaleX = 1,
  originalScaleY = 1,
  uniformScaling = true,
  width = 100
}: ImageScaleSnappingHarnessOptions = {}): ImageScaleSnappingHarness {
  const options = { angle, height, originalScaleX, originalScaleY, width }
  const fixture = createRectangularScaleProjectionFixture({
    angle,
    centered,
    controlKey,
    height: height * originalScaleY,
    originalScaleX,
    originalScaleY,
    width: width * originalScaleX
  })
  const target = createImageScaleTarget(options)
  installImageMinimumScaleContract({ minScaleLimit, target })
  target.controls = controlsUtils.createObjectDefaultControls()
  installImageScaleGeometryContract({ fixture, target })
  const transform = createImageScaleTransform({ fixture, target })
  const pointerStart = new Point(fixture.pointerStart.x, fixture.pointerStart.y)
  const fixedAnchor = target.getPointByOrigin(transform.originX, transform.originY)
  const baselineBounds = getRequiredImageScaleBounds({ target })
  const originalSetPositionByOrigin = target.setPositionByOrigin.bind(target)
  const originalSetCoords = target.setCoords.bind(target)
  const { captureEnvironmentMock, editor } = createImageScaleControllerDependencies({
    target,
    uniformScaling
  })

  return Object.freeze({
    baselineBounds,
    captureEnvironmentMock,
    controlKey,
    controller: new ImageScaleSnappingController({ editor }),
    fixedAnchor,
    pointerStart,
    target,
    transform,
    setMock: jest.spyOn(target, 'set'),
    setPositionByOriginMock: jest.spyOn(target, 'setPositionByOrigin'),
    applyFabricPreview: (multipliers) => {
      assertFiniteMultipliers({ multipliers })
      target.scaleX = transform.original.scaleX * multipliers.x
      target.scaleY = transform.original.scaleY * multipliers.y
      originalSetPositionByOrigin(fixedAnchor, transform.originX, transform.originY)
      originalSetCoords()
    },
    resolvePointer: createPointerResolver({ fixture })
  })
}

/** Создаёт mouse:down с Fabric transform выбранной ручки. */
export function createImageScaleStartEvent({
  harness
}: {
  harness: ImageScaleSnappingHarness
}): ImageScaleStartEvent {
  if (harness.transform.target !== harness.target) {
    throw new Error('Начальный transform должен принадлежать тестовому Image')
  }
  if (harness.transform.corner !== harness.controlKey) {
    throw new Error('Начальный transform должен использовать выбранную ручку')
  }

  return Object.freeze({
    target: harness.target,
    transform: harness.transform,
    e: new MouseEvent('pointerdown'),
    pointer: harness.pointerStart,
    viewportPoint: harness.pointerStart,
    scenePoint: harness.pointerStart
  }) as ImageScaleStartEvent
}

/** Преобразует короткий scalar input теста в множители выбранной ручки. */
function resolveScaleStepMultipliers({
  controlKey,
  multiplier
}: {
  controlKey: RectangularScaleControlKey
  multiplier: number
}): RectangularScaleMultipliers {
  if (controlKey === 'mt' || controlKey === 'mb') {
    return Object.freeze({ x: 1, y: multiplier })
  }
  if (controlKey === 'ml' || controlKey === 'mr') {
    return Object.freeze({ x: multiplier, y: 1 })
  }

  return Object.freeze({ x: multiplier, y: multiplier })
}

/** Имитирует Fabric preview и создаёт соответствующее событие `object:scaling`. */
export function createImageScaleStepEvent({
  harness,
  marker,
  multiplier,
  multipliers = multiplier === undefined
    ? { x: 1, y: 1 }
    : resolveScaleStepMultipliers({ controlKey: harness.controlKey, multiplier })
}: {
  harness: ImageScaleSnappingHarness
  marker: MouseEvent
  multiplier?: number
  multipliers?: RectangularScaleMultipliers
}): ImageScaleTransformEvent {
  assertFiniteMultipliers({ multipliers })
  harness.applyFabricPreview(multipliers)
  const pointer = harness.resolvePointer(multipliers)

  return Object.freeze({
    target: harness.target,
    transform: harness.transform,
    e: marker,
    pointer,
    scenePoint: pointer
  }) as ImageScaleTransformEvent
}

/** Создаёт `mouse:move` fallback без предварительной мутации активного Image. */
export function createImageScaleMouseMoveEvent({
  harness,
  marker,
  multipliers
}: {
  harness: ImageScaleSnappingHarness
  marker: MouseEvent
  multipliers: RectangularScaleMultipliers
}): ImageScaleMouseMoveEvent {
  assertFiniteMultipliers({ multipliers })
  const pointer = harness.resolvePointer(multipliers)

  return Object.freeze({
    target: harness.target,
    transform: harness.transform,
    e: marker,
    pointer,
    scenePoint: pointer
  }) as ImageScaleMouseMoveEvent
}

/** Устанавливает одну направляющую относительно исходной границы Image. */
export function useImageScaleGuide({
  axis,
  edge,
  harness,
  offset,
  zoom = 1
}: {
  axis: 'x' | 'y'
  edge: 'left' | 'right' | 'top' | 'bottom'
  harness: ImageScaleSnappingHarness
  offset: number
  zoom?: number
}): number {
  if (!Number.isFinite(offset)) throw new Error('Смещение тестовой направляющей должно быть конечным')
  if (!Number.isFinite(zoom) || zoom <= 0) throw new Error('Zoom тестового окружения должен быть положительным')

  const position = harness.baselineBounds[edge] + offset
  const candidate: ScaleSnapEnvironment['candidates'][number] = Object.freeze({
    id: `image-${edge}-guide`,
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
