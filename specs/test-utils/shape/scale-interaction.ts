import {
  Canvas,
  Point,
  Rect,
  type FabricObject,
  type Transform
} from 'fabric'
import { english } from '../../../src/editor/i18n'
import { ImageEditor } from '../../../src/editor'
import SnappingManager from '../../../src/editor/snapping-manager'
import type { ScaleSnapEnvironment } from '../../../src/editor/snapping-manager/scaling/scale-snap-candidates'
import type { ScaleSnapCandidateInput } from '../../../src/editor/snapping-manager/scaling/scale-snapping-resolver'
import ShapeScaleInteractionController, {
  type ShapeScaleInteractionEvent
} from '../../../src/editor/shape-manager/scaling/shape-scale-interaction-controller'
import type { RectangularScaleControlKey } from '../../../src/editor/snapping-manager/scaling/rectangular-scale-gesture-projection'
import ShapeScalingController from '../../../src/editor/shape-manager/scaling/shape-scaling-controller'
import { ShapeGroupObject } from '../../../src/editor/shape-manager/domain/shape-group'
import { getObjectExactBounds, type ObjectBounds } from '../../../src/editor/utils/geometry'

/** Shape handle supported by scaling interaction tests. */
export type ShapeScaleInteractionTestControl = Extract<RectangularScaleControlKey, 'br' | 'mr'>

/** Local-axis factors for calculating the pointer position. */
export type ShapeScaleInteractionTestMultipliers = Readonly<{
  x: number
  y: number
}>

/** Parameters for the test ShapeGroupObject. */
export type ShapeScaleInteractionHarnessOptions = Readonly<{
  controlKey?: ShapeScaleInteractionTestControl
  width?: number
  height?: number
}>

/** Controller, Shape, and observable dependencies for one scaling test gesture. */
export type ShapeScaleInteractionHarness = Readonly<{
  controller: ShapeScaleInteractionController
  target: ShapeGroupObject
  transform: Transform
  pointerStart: Readonly<{ x: number; y: number }>
  fixedAnchor: Readonly<{ x: number; y: number }>
  baselineBounds: ObjectBounds
  captureEnvironmentMock: jest.MockedFunction<ImageEditor['snappingManager']['captureScaleSnapEnvironment']>
  claimStepMock: jest.MockedFunction<ImageEditor['snappingManager']['markStepHandled']>
  publishGuidesMock: jest.MockedFunction<ImageEditor['snappingManager']['publishVerifiedScaleGuides']>
  materializeMock: jest.MockedFunction<ShapeScalingController['handleObjectScaling']>
  clearScalingStateMock: jest.MockedFunction<ShapeScalingController['clearState']>
  endCurrentTransformMock: jest.MockedFunction<ImageEditor['canvas']['endCurrentTransform']>
}>

/** Position of the handle and the opposite fixed point. */
type ShapeScaleControlGeometry = Readonly<{
  action: 'scale' | 'scaleX'
  corner: ShapeScaleInteractionTestControl
  controlOriginX: 'right'
  controlOriginY: 'bottom' | 'center'
  transformOriginX: 'left'
  transformOriginY: 'top' | 'center'
}>

/** Geometry of handles supported in tests. */
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
 * Adds exact unrotated object bounds to Jest's simplified ShapeGroupObject,
 * as Fabric normally returns through getCoords and getBoundingRect.
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

/** Creates an unrotated ShapeGroupObject with predictable bounds. */
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

/** Creates a minimal Fabric transform for the selected Shape handle. */
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

/** Returns the exact Shape bounds or fails the test. */
export function getRequiredShapeScaleBounds({
  target
}: {
  target: FabricObject
}): ObjectBounds {
  const bounds = getObjectExactBounds({ object: target })
  if (!bounds) throw new Error('Тестовый Shape для скейлинга должен иметь точные границы')

  return bounds
}

/** Creates a guide for the right edge relative to the Shape's initial position. */
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

/** Creates a guide for the bottom edge relative to the Shape's initial position. */
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

/** Creates a test ShapeGroupObject and a controller with observable dependencies. */
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
  snappingManager.markStepHandled = claimStepMock
  snappingManager.publishVerifiedScaleGuides = publishGuidesMock
  const canvas: Canvas = Object.create(Canvas.prototype)
  canvas.altActionKey = 'shiftKey'
  canvas.endCurrentTransform = endCurrentTransformMock
  target.canvas = canvas
  const editor: ImageEditor = Object.assign(Object.create(ImageEditor.prototype), { t: english })
  editor.canvas = canvas
  editor.snappingManager = snappingManager
  snappingManager.editor = editor
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

/** Sets the environment with guides and canvas scale that SnappingManager returns at the start of a gesture. */
export function setShapeScaleEnvironment({
  harness,
  environment
}: {
  harness: ShapeScaleInteractionHarness
  environment: ScaleSnapEnvironment
}): void {
  harness.captureEnvironmentMock.mockReturnValue(environment)
}

/** Creates a native mouse event with Ctrl and Shift state for one step. */
export function createShapeScaleMarker({
  ctrlKey = false,
  shiftKey = false
}: {
  ctrlKey?: boolean
  shiftKey?: boolean
} = {}): MouseEvent {
  return new MouseEvent('pointermove', { ctrlKey, shiftKey })
}

/** Creates a scaling-start event at the active Shape handle. */
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

/** Calculates the pointer position on the canvas from factors relative to the gesture start. */
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

/** Creates an object:scaling/mouse:move event for the specified pointer position. */
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
