import {
  ActiveSelection,
  Canvas,
  Point,
  Rect,
  controlsUtils,
  type FabricObject,
  type TOriginX,
  type TOriginY,
  type Transform
} from 'fabric'

import { ImageEditor } from '../../../src/editor'
import ActiveSelectionScaleInteractionController, {
  type ActiveSelectionScaleInteractionEvent
} from '../../../src/editor/selection-manager/scaling/active-selection-scale-interaction-controller'
import type {
  RectangularScaleControlKey,
  RectangularScaleMultipliers
} from '../../../src/editor/snapping-manager/scaling/rectangular-scale-gesture-projection'
import type { ScaleSnapEnvironment } from '../../../src/editor/snapping-manager/scaling/scale-snap-candidates'
import SnappingManager from '../../../src/editor/snapping-manager'
import ShapeManager from '../../../src/editor/shape-manager'
import { ShapeGroupObject } from '../../../src/editor/shape-manager/domain/shape-group'
import { applyShapeCornerFreeScaleControls } from '../../../src/editor/shape-manager/scaling/shape-controls'
import {
  getObjectExactBounds,
  type ObjectBounds
} from '../../../src/editor/utils/geometry'
import { createMockFabricImage } from '../managers/image'
import { installRectangularScaleGeometryContract } from '../snapping/rectangular-scale-gesture-projection'

/** Параметры тестового скейлинга выделения из двух изображений. */
export type ActiveSelectionScaleHarnessOptions = Readonly<{
  angle?: number
  centered?: boolean
  controlKey?: RectangularScaleControlKey
  originalScaleX?: number
  originalScaleY?: number
  uniformScaling?: boolean
}>

/** Параметры тестового скейлинга выделения из двух шейпов. */
export type ShapeActiveSelectionScaleHarnessOptions = Readonly<{
  angle?: number
  centered?: boolean
  clampedMultipliers?: RectangularScaleMultipliers
  controlKey?: RectangularScaleControlKey
  originalScaleX?: number
  originalScaleY?: number
  supported?: boolean
  uniformScaling?: boolean
}>

/** Общие наблюдаемые зависимости тестового скейлинга ActiveSelection. */
interface ActiveSelectionScaleHarnessDependencies {
  readonly applyShapeSelectionPreviewMock: jest.MockedFunction<
    ImageEditor['shapeManager']['applyActiveSelectionScalePreview']
  >
  readonly clearShapeSelectionPreviewStateMock: jest.MockedFunction<
    ImageEditor['shapeManager']['clearActiveSelectionScalePreviewState']
  >
  readonly captureEnvironmentMock: jest.MockedFunction<
    ImageEditor['snappingManager']['captureScaleSnapEnvironment']
  >
  readonly editor: ImageEditor
  readonly endCurrentTransformMock: jest.MockedFunction<Canvas['endCurrentTransform']>
  readonly markHandledMock: jest.MockedFunction<ImageEditor['snappingManager']['markScaleStepHandled']>
  readonly publishGuidesMock: jest.MockedFunction<
    ImageEditor['snappingManager']['publishVerifiedScaleGuides']
  >
  readonly supportsShapeSelectionMock: jest.MockedFunction<
    ImageEditor['shapeManager']['supportsActiveSelectionScaling']
  >
}

/** Общая геометрия тестового жеста для любого поддерживаемого состава выделения. */
interface ActiveSelectionScaleEventHarness {
  readonly controlKey: RectangularScaleControlKey
  readonly fixedAnchor: Point
  readonly pointerStart: Point
  readonly target: ActiveSelection
  readonly transform: Transform
  /** Применяет предварительный результат Fabric перед проверкой одного шага. */
  readonly applyFabricPreview: (multipliers: RectangularScaleMultipliers) => void
}

/** ShapeManager и его наблюдаемые методы для одного тестового контроллера. */
interface ActiveSelectionShapeManagerDependencies {
  readonly applyShapeSelectionPreviewMock: ActiveSelectionScaleHarnessDependencies['applyShapeSelectionPreviewMock']
  readonly clearShapeSelectionPreviewStateMock: ActiveSelectionScaleHarnessDependencies['clearShapeSelectionPreviewStateMock']
  readonly shapeManager: ShapeManager
  readonly supportsShapeSelectionMock: ActiveSelectionScaleHarnessDependencies['supportsShapeSelectionMock']
}

/** Наблюдаемые зависимости одного тестового жеста общего выделения. */
export interface ActiveSelectionScaleHarness extends ActiveSelectionScaleEventHarness,
  ActiveSelectionScaleHarnessDependencies {
  readonly baselineBounds: ObjectBounds
  readonly children: readonly ReturnType<typeof createMockFabricImage>[]
  readonly controller: ActiveSelectionScaleInteractionController
}

/** Наблюдаемые зависимости одного тестового жеста выделения из шейпов. */
export interface ShapeActiveSelectionScaleHarness extends ActiveSelectionScaleEventHarness,
  ActiveSelectionScaleHarnessDependencies {
  readonly baselineBounds: ObjectBounds
  readonly children: readonly ShapeGroupObject[]
  readonly controller: ActiveSelectionScaleInteractionController
}

/** Неподвижная и подвижная точки привязки одной стандартной ручки. */
type ActiveSelectionScaleControlOrigins = Readonly<{
  fixedX: TOriginX
  fixedY: TOriginY
  movingX: TOriginX
  movingY: TOriginY
}>

/** Точки привязки всех восьми стандартных ручек. */
const ACTIVE_SELECTION_SCALE_CONTROL_ORIGINS: Readonly<
Record<RectangularScaleControlKey, ActiveSelectionScaleControlOrigins>
> = Object.freeze({
  tl: { fixedX: 'right', fixedY: 'bottom', movingX: 'left', movingY: 'top' },
  tr: { fixedX: 'left', fixedY: 'bottom', movingX: 'right', movingY: 'top' },
  bl: { fixedX: 'right', fixedY: 'top', movingX: 'left', movingY: 'bottom' },
  br: { fixedX: 'left', fixedY: 'top', movingX: 'right', movingY: 'bottom' },
  ml: { fixedX: 'right', fixedY: 'center', movingX: 'left', movingY: 'center' },
  mr: { fixedX: 'left', fixedY: 'center', movingX: 'right', movingY: 'center' },
  mt: { fixedX: 'center', fixedY: 'bottom', movingX: 'center', movingY: 'top' },
  mb: { fixedX: 'center', fixedY: 'top', movingX: 'center', movingY: 'bottom' }
})

/** Устанавливает детерминированную геометрию тестового выделения. */
function installSelectionGeometryContract({
  target
}: {
  target: ActiveSelection
}): void {
  const angle = (target.angle * Math.PI) / 180
  const cosine = Math.cos(angle)
  const sine = Math.sin(angle)

  installRectangularScaleGeometryContract({
    target,
    sourceGeometry: {
      topLeft: { x: 240, y: 180 },
      u: {
        x: target.width * target.scaleX * cosine,
        y: target.width * target.scaleX * sine
      },
      v: {
        x: -target.height * target.scaleY * sine,
        y: target.height * target.scaleY * cosine
      },
      transformOriginal: {
        scaleX: target.scaleX,
        scaleY: target.scaleY
      }
    }
  })
}

/** Создаёт два изображения с различающимися размерами и локальными преобразованиями. */
function createSelectionImages(): readonly ReturnType<typeof createMockFabricImage>[] {
  const first = createMockFabricImage({ width: 80, height: 60 })
  const second = createMockFabricImage({ width: 70, height: 90 })

  first.set({
    angle: 7,
    cropX: 3,
    cropY: 4,
    flipX: true,
    left: 180,
    originX: 'left',
    originY: 'top',
    scaleX: 0.9,
    scaleY: 1.1,
    skewX: 2,
    skewY: -1,
    top: 160
  })
  second.set({
    angle: -9,
    cropX: 5,
    cropY: 6,
    flipY: true,
    left: 310,
    originX: 'right',
    originY: 'bottom',
    scaleX: 1.2,
    scaleY: 0.8,
    skewX: -2,
    skewY: 3,
    top: 230
  })

  if (first.width <= 0 || first.height <= 0) throw new Error('Первое тестовое изображение должно иметь размер')
  if (second.width <= 0 || second.height <= 0) throw new Error('Второе тестовое изображение должно иметь размер')

  return Object.freeze([first, second])
}

/** Создаёт два доменных объекта шейпа с различающимися размерами. */
function createSelectionShapes(): readonly ShapeGroupObject[] {
  const first = new ShapeGroupObject([
    new Rect({ width: 80, height: 60, strokeWidth: 0 })
  ], {
    left: 180,
    top: 160,
    width: 80,
    height: 60,
    shapePresetKey: 'square'
  })
  const second = new ShapeGroupObject([
    new Rect({ width: 70, height: 90, strokeWidth: 0 })
  ], {
    left: 310,
    top: 230,
    width: 70,
    height: 90,
    shapePresetKey: 'square'
  })

  if (first.width <= 0 || first.height <= 0) throw new Error('Первый тестовый шейп должен иметь размер')
  if (second.width <= 0 || second.height <= 0) throw new Error('Второй тестовый шейп должен иметь размер')

  return Object.freeze([first, second])
}

/** Создаёт контрактный ShapeManager с наблюдаемыми методами общего скейлинга. */
function createShapeManagerDependencies({
  supportsShapeSelection
}: {
  supportsShapeSelection: boolean
}): ActiveSelectionShapeManagerDependencies {
  const supportsShapeSelectionMock: ActiveSelectionScaleHarness['supportsShapeSelectionMock'] = jest.fn<
    boolean,
    Parameters<ImageEditor['shapeManager']['supportsActiveSelectionScaling']>
  >(() => supportsShapeSelection)
  const applyShapeSelectionPreviewMock: ActiveSelectionScaleHarness['applyShapeSelectionPreviewMock'] = jest.fn<
    ReturnType<ImageEditor['shapeManager']['applyActiveSelectionScalePreview']>,
    Parameters<ImageEditor['shapeManager']['applyActiveSelectionScalePreview']>
  >(({ selection }) => ({ scaleX: selection.scaleX, scaleY: selection.scaleY }))
  const clearShapeSelectionPreviewStateMock: ActiveSelectionScaleHarness['clearShapeSelectionPreviewStateMock'] = jest.fn<
    ReturnType<ImageEditor['shapeManager']['clearActiveSelectionScalePreviewState']>,
    Parameters<ImageEditor['shapeManager']['clearActiveSelectionScalePreviewState']>
  >()
  const shapeManager: ShapeManager = Object.create(ShapeManager.prototype)

  shapeManager.supportsActiveSelectionScaling = supportsShapeSelectionMock
  shapeManager.applyActiveSelectionScalePreview = applyShapeSelectionPreviewMock
  shapeManager.clearActiveSelectionScalePreviewState = clearShapeSelectionPreviewStateMock

  if (shapeManager.supportsActiveSelectionScaling !== supportsShapeSelectionMock) {
    throw new Error('ShapeManager должен использовать наблюдаемую проверку состава выделения')
  }
  if (shapeManager.applyActiveSelectionScalePreview !== applyShapeSelectionPreviewMock) {
    throw new Error('ShapeManager должен использовать наблюдаемое применение масштаба')
  }
  if (shapeManager.clearActiveSelectionScalePreviewState !== clearShapeSelectionPreviewStateMock) {
    throw new Error('ShapeManager должен использовать наблюдаемую очистку временного масштаба')
  }

  return Object.freeze({
    applyShapeSelectionPreviewMock,
    clearShapeSelectionPreviewStateMock,
    shapeManager,
    supportsShapeSelectionMock
  })
}

/** Создаёт минимальный Canvas для одного тестового жеста скейлинга. */
function createScaleTestCanvas({
  endCurrentTransformMock,
  uniformScaling
}: {
  endCurrentTransformMock: ActiveSelectionScaleHarness['endCurrentTransformMock']
  uniformScaling: boolean
}): Canvas {
  const canvas = Object.assign(Object.create(Canvas.prototype), {
    altActionKey: 'shiftKey',
    endCurrentTransform: endCurrentTransformMock,
    off: jest.fn(),
    on: jest.fn(),
    uniformScaling,
    uniScaleKey: 'shiftKey',
    viewportTransform: [1, 0, 0, 1, 0, 0]
  }) as Canvas

  if (canvas.endCurrentTransform !== endCurrentTransformMock) {
    throw new Error('Тестовый canvas должен использовать наблюдаемое завершение преобразования')
  }
  if (canvas.uniformScaling !== uniformScaling) {
    throw new Error('Тестовый canvas должен сохранять режим пропорционального скейлинга')
  }

  return canvas
}

/** Создаёт холст и зависимости SnappingManager без полного жизненного цикла редактора. */
function createControllerDependencies({
  supportsShapeSelection,
  target,
  uniformScaling
}: {
  supportsShapeSelection: boolean
  target: ActiveSelection
  uniformScaling: boolean
}): ActiveSelectionScaleHarnessDependencies {
  const captureEnvironmentMock: ActiveSelectionScaleHarness['captureEnvironmentMock'] = jest.fn<
    ScaleSnapEnvironment,
    Parameters<ImageEditor['snappingManager']['captureScaleSnapEnvironment']>
  >(() => Object.freeze({ candidates: Object.freeze([]), zoom: 1 }))
  const markHandledMock: ActiveSelectionScaleHarness['markHandledMock'] = jest.fn()
  const publishGuidesMock: ActiveSelectionScaleHarness['publishGuidesMock'] = jest.fn()
  const endCurrentTransformMock: ActiveSelectionScaleHarness['endCurrentTransformMock'] = jest.fn()
  const snappingManager: SnappingManager = Object.create(SnappingManager.prototype)
  const shapeDependencies = createShapeManagerDependencies({ supportsShapeSelection })
  const canvas = createScaleTestCanvas({ endCurrentTransformMock, uniformScaling })
  const editor: ImageEditor = Object.create(ImageEditor.prototype)

  snappingManager.captureScaleSnapEnvironment = captureEnvironmentMock
  snappingManager.markScaleStepHandled = markHandledMock
  snappingManager.publishVerifiedScaleGuides = publishGuidesMock
  editor.canvas = canvas
  editor.shapeManager = shapeDependencies.shapeManager
  editor.snappingManager = snappingManager
  target.canvas = canvas

  if (editor.canvas !== canvas) throw new Error('Тестовый редактор должен использовать подготовленный canvas')
  if (target.canvas !== canvas) throw new Error('Общее выделение должно принадлежать тому же canvas')

  return Object.freeze({
    applyShapeSelectionPreviewMock: shapeDependencies.applyShapeSelectionPreviewMock,
    clearShapeSelectionPreviewStateMock: shapeDependencies.clearShapeSelectionPreviewStateMock,
    captureEnvironmentMock,
    editor,
    endCurrentTransformMock,
    markHandledMock,
    publishGuidesMock,
    supportsShapeSelectionMock: shapeDependencies.supportsShapeSelectionMock
  })
}

/** Возвращает действие стандартной боковой или угловой ручки. */
function resolveScaleAction({
  controlKey
}: {
  controlKey: RectangularScaleControlKey
}): Transform['action'] {
  if (controlKey === 'ml' || controlKey === 'mr') return 'scaleX'
  if (controlKey === 'mt' || controlKey === 'mb') return 'scaleY'

  return 'scale'
}

/** Создаёт преобразование Fabric для выбранной ручки общего выделения. */
function createSelectionTransform({
  centered,
  controlKey,
  target
}: {
  centered: boolean
  controlKey: RectangularScaleControlKey
  target: ActiveSelection
}): Transform {
  const origins = ACTIVE_SELECTION_SCALE_CONTROL_ORIGINS[controlKey]
  const originX = centered ? 'center' : origins.fixedX
  const originY = centered ? 'center' : origins.fixedY

  return {
    target,
    action: resolveScaleAction({ controlKey }),
    corner: controlKey,
    scaleX: target.scaleX,
    scaleY: target.scaleY,
    skewX: 0,
    skewY: 0,
    offsetX: 0,
    offsetY: 0,
    originX,
    originY,
    ex: 0,
    ey: 0,
    lastX: 0,
    lastY: 0,
    theta: 0,
    width: target.width,
    height: target.height,
    shiftKey: false,
    altKey: centered,
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
      originX,
      originY
    },
    actionPerformed: false
  }
}

/** Возвращает точные границы общего выделения или завершает тест с ошибкой. */
export function getRequiredActiveSelectionBounds({
  target
}: {
  target: ActiveSelection
}): ObjectBounds {
  const bounds = getObjectExactBounds({ object: target })
  if (!bounds) throw new Error('Тестовое общее выделение должно иметь точные границы')
  if (bounds.right <= bounds.left || bounds.bottom <= bounds.top) {
    throw new Error('Точные границы общего выделения должны иметь положительный размер')
  }

  return bounds
}

/** Сохраняет локальное состояние всех изображений тестового общего выделения. */
export function captureActiveSelectionImageLocalStates({
  children
}: {
  children: ActiveSelectionScaleHarness['children']
}) {
  if (children.length < 2) throw new Error('Тестовое общее выделение должно содержать минимум два изображения')

  return Object.freeze(children.map((target) => {
    const state = {
      angle: target.angle ?? 0,
      cropX: target.cropX ?? 0,
      cropY: target.cropY ?? 0,
      flipX: Boolean(target.flipX),
      flipY: Boolean(target.flipY),
      height: target.height,
      left: target.left,
      originX: target.originX,
      originY: target.originY,
      scaleX: target.scaleX,
      scaleY: target.scaleY,
      skewX: target.skewX ?? 0,
      skewY: target.skewY ?? 0,
      top: target.top,
      width: target.width
    }
    const numericState = [
      state.angle,
      state.cropX,
      state.cropY,
      state.height,
      state.left,
      state.scaleX,
      state.scaleY,
      state.skewX,
      state.skewY,
      state.top,
      state.width
    ]
    if (!numericState.every(Number.isFinite)) {
      throw new Error('Локальное состояние тестового изображения должно содержать конечные числа')
    }

    return Object.freeze(state)
  }))
}

/** Проверяет множители одного тестового шага скейлинга общего выделения. */
function assertActiveSelectionScaleMultipliers({
  multipliers
}: {
  multipliers: RectangularScaleMultipliers
}): void {
  if (![multipliers.x, multipliers.y].every(Number.isFinite)) {
    throw new Error('Множители тестового ActiveSelection должны быть конечными')
  }
  if (multipliers.x <= 0 || multipliers.y <= 0) {
    throw new Error('Множители тестового ActiveSelection должны быть положительными')
  }
}

/** Создаёт реальное общее выделение и устанавливает его тестовую геометрию. */
function createActiveSelectionTarget({
  angle,
  children,
  originalScaleX,
  originalScaleY
}: {
  angle: number
  children: readonly FabricObject[]
  originalScaleX: number
  originalScaleY: number
}): ActiveSelection {
  const target = new ActiveSelection([...children], {
    angle,
    flipX: false,
    flipY: false,
    height: 180,
    lockScalingFlip: false,
    lockScalingX: false,
    lockScalingY: false,
    originX: 'center',
    originY: 'center',
    scaleX: originalScaleX,
    scaleY: originalScaleY,
    skewX: 0,
    skewY: 0,
    width: 210
  })
  target.controls = controlsUtils.createObjectDefaultControls()
  installSelectionGeometryContract({ target })
  target.setCoords()

  return target
}

/** Создаёт применение предварительного масштаба Fabric к тестовому выделению. */
function createFabricScalePreview({
  fixedAnchor,
  target,
  transform
}: {
  fixedAnchor: Point
  target: ActiveSelection
  transform: Transform
}): ActiveSelectionScaleEventHarness['applyFabricPreview'] {
  if (transform.target !== target) throw new Error('Тестовое преобразование должно принадлежать выделению')
  if (![fixedAnchor.x, fixedAnchor.y].every(Number.isFinite)) {
    throw new Error('Неподвижная точка тестового выделения должна содержать конечные координаты')
  }

  return (multipliers) => {
    assertActiveSelectionScaleMultipliers({ multipliers })

    target.set({
      scaleX: transform.original.scaleX * multipliers.x,
      scaleY: transform.original.scaleY * multipliers.y
    })
    target.setPositionByOrigin(fixedAnchor, transform.originX, transform.originY)
    target.setCoords()
  }
}

/** Создаёт контроллер с реальным ActiveSelection и наблюдаемыми зависимостями. */
export function createActiveSelectionScaleHarness({
  angle = 0,
  centered = false,
  controlKey = 'mr',
  originalScaleX = 1,
  originalScaleY = 1,
  uniformScaling = true
}: ActiveSelectionScaleHarnessOptions = {}): ActiveSelectionScaleHarness {
  const children = createSelectionImages()
  const target = createActiveSelectionTarget({
    angle,
    children,
    originalScaleX,
    originalScaleY
  })

  const transform = createSelectionTransform({ centered, controlKey, target })
  const origins = ACTIVE_SELECTION_SCALE_CONTROL_ORIGINS[controlKey]
  const fixedAnchor = target.getPointByOrigin(transform.originX, transform.originY)
  const pointerStart = target.getPointByOrigin(origins.movingX, origins.movingY)
  const baselineBounds = getRequiredActiveSelectionBounds({ target })
  const dependencies = createControllerDependencies({
    supportsShapeSelection: false,
    target,
    uniformScaling
  })

  return Object.freeze({
    baselineBounds,
    children,
    controlKey,
    fixedAnchor,
    pointerStart,
    target,
    transform,
    ...dependencies,
    controller: new ActiveSelectionScaleInteractionController({ editor: dependencies.editor }),
    applyFabricPreview: createFabricScalePreview({ fixedAnchor, target, transform })
  })
}

/** Создаёт контроллер с выделением из шейпов и наблюдаемым контрактом ShapeManager. */
export function createShapeActiveSelectionScaleHarness({
  angle = 0,
  centered = false,
  clampedMultipliers,
  controlKey = 'mr',
  originalScaleX = 1,
  originalScaleY = 1,
  supported = true,
  uniformScaling = true
}: ShapeActiveSelectionScaleHarnessOptions = {}): ShapeActiveSelectionScaleHarness {
  const children = createSelectionShapes()
  const target = createActiveSelectionTarget({
    angle,
    children,
    originalScaleX,
    originalScaleY
  })
  applyShapeCornerFreeScaleControls({ target })
  const transform = createSelectionTransform({ centered, controlKey, target })
  const origins = ACTIVE_SELECTION_SCALE_CONTROL_ORIGINS[controlKey]
  const fixedAnchor = target.getPointByOrigin(transform.originX, transform.originY)
  const pointerStart = target.getPointByOrigin(origins.movingX, origins.movingY)
  const baselineBounds = getRequiredActiveSelectionBounds({ target })
  const dependencies = createControllerDependencies({
    supportsShapeSelection: supported,
    target,
    uniformScaling
  })

  if (clampedMultipliers) {
    assertActiveSelectionScaleMultipliers({ multipliers: clampedMultipliers })
    dependencies.applyShapeSelectionPreviewMock.mockImplementation(({ selection, transform: currentTransform }) => {
      selection.set({
        scaleX: originalScaleX * clampedMultipliers.x,
        scaleY: originalScaleY * clampedMultipliers.y
      })
      selection.setPositionByOrigin(fixedAnchor, currentTransform.originX, currentTransform.originY)
      selection.setCoords()
      currentTransform.scaleX = selection.scaleX
      currentTransform.scaleY = selection.scaleY

      return { scaleX: selection.scaleX, scaleY: selection.scaleY }
    })
  }

  return Object.freeze({
    baselineBounds,
    children,
    controlKey,
    fixedAnchor,
    pointerStart,
    target,
    transform,
    ...dependencies,
    controller: new ActiveSelectionScaleInteractionController({ editor: dependencies.editor }),
    applyFabricPreview: createFabricScalePreview({ fixedAnchor, target, transform })
  })
}

/** Создаёт `mouse:down` с преобразованием Fabric выбранной ручки. */
export function createActiveSelectionScaleStartEvent({
  harness
}: {
  harness: ActiveSelectionScaleEventHarness
}): ActiveSelectionScaleInteractionEvent {
  if (harness.transform.target !== harness.target) {
    throw new Error('Начальное преобразование Fabric должно принадлежать общему выделению')
  }
  if (harness.transform.corner !== harness.controlKey) {
    throw new Error('Начальное преобразование Fabric должно использовать выбранную ручку')
  }

  return Object.freeze({
    target: harness.target,
    transform: harness.transform,
    e: new MouseEvent('pointerdown'),
    pointer: harness.pointerStart,
    scenePoint: harness.pointerStart
  })
}

/** Имитирует предварительное преобразование Fabric и создаёт событие текущего шага. */
export function createActiveSelectionScaleStepEvent({
  harness,
  marker,
  multipliers
}: {
  harness: ActiveSelectionScaleEventHarness
  marker: MouseEvent
  multipliers: RectangularScaleMultipliers
}): ActiveSelectionScaleInteractionEvent {
  harness.applyFabricPreview(multipliers)

  return Object.freeze({
    target: harness.target,
    transform: harness.transform,
    e: marker,
    pointer: harness.pointerStart,
    scenePoint: harness.pointerStart
  })
}

/** Создаёт запасной `mouse:move` без предварительного преобразования выделения Fabric. */
export function createActiveSelectionScaleMouseMoveEvent({
  harness,
  marker,
  multipliers
}: {
  harness: ActiveSelectionScaleEventHarness
  marker: MouseEvent
  multipliers: RectangularScaleMultipliers
}): ActiveSelectionScaleInteractionEvent {
  assertActiveSelectionScaleMultipliers({ multipliers })

  const { fixedAnchor, pointerStart } = harness
  const pointer = new Point(
    fixedAnchor.x + ((pointerStart.x - fixedAnchor.x) * multipliers.x),
    fixedAnchor.y + ((pointerStart.y - fixedAnchor.y) * multipliers.y)
  )

  return Object.freeze({
    target: harness.target,
    transform: harness.transform,
    e: marker,
    pointer,
    scenePoint: pointer
  })
}
