import {
  Canvas,
  Point,
  Rect,
  type FabricObject,
  type Transform
} from 'fabric'
import { ImageEditor } from '../../../src/editor'
import SnappingManager from '../../../src/editor/snapping-manager'
import type { ScaleSnapEnvironment } from '../../../src/editor/snapping-manager/scale-snap-candidates'
import type { ScaleSnapCandidateInput } from '../../../src/editor/snapping-manager/scale-snapping-resolver'
import ShapeScaleInteractionController, {
  type ShapeScaleInteractionEvent
} from '../../../src/editor/shape-manager/scaling/shape-scale-interaction-controller'
import type { ShapeScaleControlKey } from '../../../src/editor/shape-manager/scaling/shape-scale-projection'
import ShapeScalingController from '../../../src/editor/shape-manager/scaling/shape-scaling-controller'
import { ShapeGroupObject } from '../../../src/editor/shape-manager/domain/shape-group'
import { getObjectExactBounds, type ObjectBounds } from '../../../src/editor/utils/geometry'

/** Ручка Shape, поддерживаемая тестами взаимодействия при скейлинге. */
export type ShapeScaleInteractionTestControl = Extract<ShapeScaleControlKey, 'br' | 'mr'>

/** Множители локальных осей для расчёта положения указателя. */
export type ShapeScaleInteractionTestMultipliers = Readonly<{
  x: number
  y: number
}>

/** Параметры тестового ShapeGroupObject. */
export type ShapeScaleInteractionHarnessOptions = Readonly<{
  controlKey?: ShapeScaleInteractionTestControl
  width?: number
  height?: number
}>

/** Контроллер, Shape и наблюдаемые зависимости одного тестового жеста скейлинга. */
export type ShapeScaleInteractionHarness = Readonly<{
  controller: ShapeScaleInteractionController
  target: ShapeGroupObject
  transform: Transform
  pointerStart: Readonly<{ x: number; y: number }>
  fixedAnchor: Readonly<{ x: number; y: number }>
  baselineBounds: ObjectBounds
  captureEnvironmentMock: jest.MockedFunction<ImageEditor['snappingManager']['captureScaleSnapEnvironment']>
  claimStepMock: jest.MockedFunction<ImageEditor['snappingManager']['markScaleStepHandled']>
  publishGuidesMock: jest.MockedFunction<ImageEditor['snappingManager']['publishVerifiedScaleGuides']>
  materializeMock: jest.MockedFunction<ShapeScalingController['handleObjectScaling']>
  clearScalingStateMock: jest.MockedFunction<ShapeScalingController['clearState']>
  endCurrentTransformMock: jest.MockedFunction<ImageEditor['canvas']['endCurrentTransform']>
}>

/** Положение ручки и противоположной точки фиксации. */
type ShapeScaleControlGeometry = Readonly<{
  action: 'scale' | 'scaleX'
  corner: ShapeScaleInteractionTestControl
  controlOriginX: 'right'
  controlOriginY: 'bottom' | 'center'
  transformOriginX: 'left'
  transformOriginY: 'top' | 'center'
}>

/** Геометрия ручек, поддерживаемых в тестах. */
const SHAPE_SCALE_CONTROL_GEOMETRY: Readonly<Record<
  ShapeScaleInteractionTestControl,
  ShapeScaleControlGeometry
>> = Object.freeze({
  br: Object.freeze({
    action: 'scale',
    corner: 'br',
    controlOriginX: 'right',
    controlOriginY: 'bottom',
    transformOriginX: 'left',
    transformOriginY: 'top'
  }),
  mr: Object.freeze({
    action: 'scaleX',
    corner: 'mr',
    controlOriginX: 'right',
    controlOriginY: 'center',
    transformOriginX: 'left',
    transformOriginY: 'center'
  })
})

/**
 * Дополняет упрощённый ShapeGroupObject из Jest точными границами объекта без поворота,
 * которые Fabric обычно возвращает через getCoords и getBoundingRect.
 */
function installShapeScaleGeometryContract({
  target
}: {
  target: ShapeGroupObject
}): void {
  target.getBoundingRect = jest.fn(() => {
    const width = (target.width ?? 0) * (target.scaleX ?? 1)
    const height = (target.height ?? 0) * (target.scaleY ?? 1)

    return {
      left: target.left ?? 0,
      top: target.top ?? 0,
      width,
      height
    }
  })
  target.getCoords = jest.fn(() => {
    const { left, top, width, height } = target.getBoundingRect()

    return [
      new Point(left, top),
      new Point(left + width, top),
      new Point(left + width, top + height),
      new Point(left, top + height)
    ]
  })
}

/** Создаёт ShapeGroupObject без поворота и с предсказуемыми границами. */
function createShapeScaleTarget({
  width,
  height
}: {
  width: number
  height: number
}): ShapeGroupObject {
  const shape = new Rect({
    left: 0,
    top: 0,
    originX: 'center',
    originY: 'center',
    width,
    height,
    strokeWidth: 0
  })
  const target = new ShapeGroupObject([shape], {
    left: 300,
    top: 200,
    originX: 'center',
    originY: 'center',
    width,
    height,
    scaleX: 1,
    scaleY: 1,
    skewX: 0,
    skewY: 0,
    shapePresetKey: 'square'
  })

  installShapeScaleGeometryContract({ target })
  target.setCoords()

  return target
}

/** Создаёт минимальный Fabric transform для выбранной ручки Shape. */
function createShapeScaleTransform({
  target,
  geometry
}: {
  target: ShapeGroupObject
  geometry: ShapeScaleControlGeometry
}): Transform {
  const originalScaleX = target.scaleX ?? 1
  const originalScaleY = target.scaleY ?? 1

  return {
    target,
    action: geometry.action,
    corner: geometry.corner,
    scaleX: originalScaleX,
    scaleY: originalScaleY,
    skewX: 0,
    skewY: 0,
    offsetX: 0,
    offsetY: 0,
    originX: geometry.transformOriginX,
    originY: geometry.transformOriginY,
    ex: 0,
    ey: 0,
    lastX: 0,
    lastY: 0,
    theta: 0,
    width: target.width ?? 0,
    height: target.height ?? 0,
    shiftKey: false,
    altKey: false,
    original: {
      scaleX: originalScaleX,
      scaleY: originalScaleY,
      skewX: 0,
      skewY: 0,
      angle: 0,
      left: target.left ?? 0,
      top: target.top ?? 0,
      flipX: false,
      flipY: false,
      originX: geometry.transformOriginX,
      originY: geometry.transformOriginY
    },
    actionPerformed: false
  }
}

/** Возвращает точные границы Shape или завершает тест с ошибкой. */
export function getRequiredShapeScaleBounds({
  target
}: {
  target: FabricObject
}): ObjectBounds {
  const bounds = getObjectExactBounds({ object: target })
  if (!bounds) throw new Error('Тестовый Shape для скейлинга должен иметь точные границы')

  return bounds
}

/** Создаёт направляющую для правой границы относительно начального положения Shape. */
export function createShapeScaleRightGuide({
  harness,
  position = harness.baselineBounds.right
}: {
  harness: ShapeScaleInteractionHarness
  position?: number
}): ScaleSnapCandidateInput {
  return {
    id: 'right-guide',
    axis: 'x',
    edge: 'right',
    position,
    category: 'edge'
  }
}

/** Создаёт направляющую для нижней границы относительно начального положения Shape. */
export function createShapeScaleBottomGuide({
  harness,
  position = harness.baselineBounds.bottom
}: {
  harness: ShapeScaleInteractionHarness
  position?: number
}): ScaleSnapCandidateInput {
  return {
    id: 'bottom-guide',
    axis: 'y',
    edge: 'bottom',
    position,
    category: 'edge'
  }
}

/** Создаёт тестовый ShapeGroupObject и контроллер с наблюдаемыми зависимостями. */
export function createShapeScaleInteractionHarness({
  controlKey = 'br',
  width = 100,
  height = 80
}: ShapeScaleInteractionHarnessOptions = {}): ShapeScaleInteractionHarness {
  const target = createShapeScaleTarget({ width, height })
  const geometry = SHAPE_SCALE_CONTROL_GEOMETRY[controlKey]
  const transform = createShapeScaleTransform({ target, geometry })
  const controlPoint = target.getPointByOrigin(geometry.controlOriginX, geometry.controlOriginY)
  const anchorPoint = target.getPointByOrigin(geometry.transformOriginX, geometry.transformOriginY)
  const captureEnvironmentMock: ShapeScaleInteractionHarness['captureEnvironmentMock'] = jest.fn<
    ScaleSnapEnvironment,
    Parameters<ImageEditor['snappingManager']['captureScaleSnapEnvironment']>
  >(() => ({ candidates: [], zoom: 1 }))
  const claimStepMock: ShapeScaleInteractionHarness['claimStepMock'] = jest.fn()
  const publishGuidesMock: ShapeScaleInteractionHarness['publishGuidesMock'] = jest.fn()
  const materializeMock: ShapeScaleInteractionHarness['materializeMock'] = jest.fn()
  const clearScalingStateMock: ShapeScaleInteractionHarness['clearScalingStateMock'] = jest.fn()
  const endCurrentTransformMock: ShapeScaleInteractionHarness['endCurrentTransformMock'] = jest.fn()
  const snappingManager: SnappingManager = Object.create(SnappingManager.prototype)
  snappingManager.captureScaleSnapEnvironment = captureEnvironmentMock
  snappingManager.markScaleStepHandled = claimStepMock
  snappingManager.publishVerifiedScaleGuides = publishGuidesMock
  const canvas: Canvas = Object.create(Canvas.prototype)
  canvas.altActionKey = 'shiftKey'
  canvas.endCurrentTransform = endCurrentTransformMock
  target.canvas = canvas
  const editor: ImageEditor = Object.create(ImageEditor.prototype)
  editor.canvas = canvas
  editor.snappingManager = snappingManager
  const scalingController: ShapeScalingController = Object.create(ShapeScalingController.prototype)
  scalingController.handleObjectScaling = materializeMock
  scalingController.clearState = clearScalingStateMock

  return Object.freeze({
    controller: new ShapeScaleInteractionController({ editor, scalingController }),
    target,
    transform,
    pointerStart: Object.freeze({ x: controlPoint.x, y: controlPoint.y }),
    fixedAnchor: Object.freeze({ x: anchorPoint.x, y: anchorPoint.y }),
    baselineBounds: getRequiredShapeScaleBounds({ target }),
    captureEnvironmentMock,
    claimStepMock,
    publishGuidesMock,
    materializeMock,
    clearScalingStateMock,
    endCurrentTransformMock
  })
}

/** Задаёт окружение с направляющими и масштабом canvas, которое SnappingManager возвращает в начале жеста. */
export function setShapeScaleEnvironment({
  harness,
  environment
}: {
  harness: ShapeScaleInteractionHarness
  environment: ScaleSnapEnvironment
}): void {
  harness.captureEnvironmentMock.mockReturnValue(environment)
}

/** Создаёт исходное событие мыши с состоянием Ctrl и Shift для одного шага. */
export function createShapeScaleMarker({
  ctrlKey = false,
  shiftKey = false
}: {
  ctrlKey?: boolean
  shiftKey?: boolean
} = {}): MouseEvent {
  return new MouseEvent('pointermove', { ctrlKey, shiftKey })
}

/** Создаёт событие начала скейлинга в точке активной ручки Shape. */
export function createShapeScaleBeginEvent({
  harness
}: {
  harness: ShapeScaleInteractionHarness
}): ShapeScaleInteractionEvent {
  return Object.freeze({
    target: harness.target,
    transform: harness.transform,
    pointer: harness.pointerStart,
    scenePoint: harness.pointerStart
  })
}

/** Рассчитывает положение указателя на canvas по множителям относительно начала жеста. */
export function moveShapeScalePointer({
  harness,
  multipliers
}: {
  harness: ShapeScaleInteractionHarness
  multipliers: ShapeScaleInteractionTestMultipliers
}): Readonly<{ x: number; y: number }> {
  const { fixedAnchor, pointerStart } = harness

  return Object.freeze({
    x: fixedAnchor.x + ((pointerStart.x - fixedAnchor.x) * multipliers.x),
    y: fixedAnchor.y + ((pointerStart.y - fixedAnchor.y) * multipliers.y)
  })
}

/** Создаёт событие object:scaling/mouse:move для заданного положения указателя. */
export function createShapeScaleStepEvent({
  harness,
  marker,
  multipliers
}: {
  harness: ShapeScaleInteractionHarness
  marker: MouseEvent
  multipliers: ShapeScaleInteractionTestMultipliers
}): ShapeScaleInteractionEvent {
  const pointer = moveShapeScalePointer({ harness, multipliers })

  return Object.freeze({
    target: harness.target,
    transform: harness.transform,
    e: marker,
    pointer,
    scenePoint: pointer
  })
}
