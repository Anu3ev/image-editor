import {
  Canvas,
  FabricImage,
  Point,
  controlsUtils,
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
  installRectangularScaleGeometryContract,
  moveFixturePointer,
  type RectangularScaleProjectionFixture
} from './rectangular-scale-gesture-projection'

/** Параметры тестового скейлинга изображения. */
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

/** Наблюдаемые зависимости и исходная геометрия одного скейлинга изображения. */
export type ImageScaleSnappingHarness = Readonly<{
  baselineBounds: ObjectBounds
  captureEnvironmentMock: jest.MockedFunction<
    ImageEditor['snappingManager']['captureScaleSnapEnvironment']
  >
  controlKey: RectangularScaleControlKey
  controller: ImageScaleSnappingController
  endCurrentTransformMock: jest.MockedFunction<Canvas['endCurrentTransform']>
  fixedAnchor: Point
  pointerStart: Point
  setMock: jest.SpiedFunction<FabricImage['set']>
  setPositionByOriginMock: jest.SpiedFunction<FabricImage['setPositionByOrigin']>
  target: FabricImage
  transform: Transform
  applyFabricPreview: (multipliers: RectangularScaleMultipliers) => void
  resolvePointer: (multipliers: RectangularScaleMultipliers) => Point
}>

/** Редактор и наблюдаемое окружение контроллера скейлинга изображения. */
type ImageScaleControllerDependencies = Readonly<{
  captureEnvironmentMock: ImageScaleSnappingHarness['captureEnvironmentMock']
  editor: ImageEditor
  endCurrentTransformMock: ImageScaleSnappingHarness['endCurrentTransformMock']
}>

/** Создаёт FabricImage с управляемой исходной геометрией. */
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
  if (!Number.isFinite(width) || width <= 0) throw new Error('Ширина тестового изображения должна быть положительной')
  if (!Number.isFinite(height) || height <= 0) throw new Error('Высота тестового изображения должна быть положительной')
  if (!Number.isFinite(angle)) throw new Error('Угол тестового изображения должен быть конечным')
  if (!Number.isFinite(originalScaleX) || originalScaleX <= 0) {
    throw new Error('Исходный scaleX тестового изображения должен быть положительным')
  }
  if (!Number.isFinite(originalScaleY) || originalScaleY <= 0) {
    throw new Error('Исходный scaleY тестового изображения должен быть положительным')
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

/** Имитирует минимальный положительный масштаб, который Fabric применяет внутри `set`. */
function installImageMinimumScaleContract({
  minScaleLimit,
  target
}: {
  minScaleLimit: number | undefined
  target: FabricImage
}): void {
  if (minScaleLimit === undefined) return
  if (!Number.isFinite(minScaleLimit) || minScaleLimit <= 0) {
    throw new Error('Минимальный масштаб тестового изображения должен быть положительным')
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

/** Создаёт полное описание преобразования Fabric для выбранной ручки. */
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

/** Создаёт зависимости контроллера без запуска полного жизненного цикла ImageEditor. */
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
  const endCurrentTransformMock: ImageScaleSnappingHarness['endCurrentTransformMock'] = jest.fn()
  const canvas = Object.assign(Object.create(Canvas.prototype), {
    altActionKey: 'shiftKey',
    endCurrentTransform: endCurrentTransformMock,
    uniformScaling,
    uniScaleKey: 'shiftKey',
    viewportTransform: [1, 0, 0, 1, 0, 0]
  }) as Canvas
  editor.canvas = canvas
  editor.snappingManager = snappingManager
  target.canvas = canvas

  return Object.freeze({
    captureEnvironmentMock,
    editor,
    endCurrentTransformMock
  })
}

/** Возвращает точные границы тестового изображения или завершает тест с ошибкой. */
export function getRequiredImageScaleBounds({
  target
}: {
  target: FabricImage
}): ObjectBounds {
  const bounds = getObjectExactBounds({ object: target })
  if (!bounds) throw new Error('Тестовое изображение должно иметь точные границы')
  if (bounds.right <= bounds.left || bounds.bottom <= bounds.top) {
    throw new Error('Точные границы тестового изображения должны иметь положительный размер')
  }

  return bounds
}

/** Проверяет оба множителя, используемых тестовой инфраструктурой. */
function assertFiniteMultipliers({
  multipliers
}: {
  multipliers: RectangularScaleMultipliers
}): void {
  if (!Number.isFinite(multipliers.x)) throw new Error('Множитель X тестового изображения должен быть конечным')
  if (!Number.isFinite(multipliers.y)) throw new Error('Множитель Y тестового изображения должен быть конечным')
}

/** Рассчитывает положение указателя по общей модели прямоугольного скейлинга. */
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

/** Создаёт контроллер скейлинга изображения с рабочей логикой и наблюдаемым окружением. */
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
  installRectangularScaleGeometryContract({ sourceGeometry: fixture, target })
  const transform = createImageScaleTransform({ fixture, target })
  const pointerStart = new Point(fixture.pointerStart.x, fixture.pointerStart.y)
  const fixedAnchor = target.getPointByOrigin(transform.originX, transform.originY)
  const baselineBounds = getRequiredImageScaleBounds({ target })
  const originalSetPositionByOrigin = target.setPositionByOrigin.bind(target)
  const originalSetCoords = target.setCoords.bind(target)
  const {
    captureEnvironmentMock,
    editor,
    endCurrentTransformMock
  } = createImageScaleControllerDependencies({ target, uniformScaling })

  return Object.freeze({
    baselineBounds,
    captureEnvironmentMock,
    controlKey,
    controller: new ImageScaleSnappingController({ editor }),
    endCurrentTransformMock,
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

/** Создаёт `mouse:down` с преобразованием Fabric для выбранной ручки. */
export function createImageScaleStartEvent({
  harness
}: {
  harness: ImageScaleSnappingHarness
}): ImageScaleStartEvent {
  if (harness.transform.target !== harness.target) {
    throw new Error('Начальное преобразование должно принадлежать тестовому изображению')
  }
  if (harness.transform.corner !== harness.controlKey) {
    throw new Error('Начальное преобразование должно использовать выбранную ручку')
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

/** Преобразует одно значение из теста в множители выбранной ручки. */
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

/** Имитирует предварительный результат Fabric и создаёт событие `object:scaling`. */
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

/** Создаёт резервное событие `mouse:move` без предварительного изменения изображения. */
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
