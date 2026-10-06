import {
  Canvas,
  Point,
  controlsUtils,
  type FabricObject,
  type Transform
} from 'fabric'
import { ImageEditor } from '../../../src/editor'
import CanvasManager from '../../../src/editor/canvas-manager'
import SnappingManager from '../../../src/editor/snapping-manager'
import type { ScaleSnapEnvironment } from '../../../src/editor/snapping-manager/scaling/scale-snap-candidates'
import type { ScaleSnapCandidateInput } from '../../../src/editor/snapping-manager/scaling/scale-snapping-resolver'
import TextCornerScaleInteractionController, {
  type TextCornerScaleInteractionEvent
} from '../../../src/editor/text-manager/scaling/text-corner-scale-interaction-controller'
import TextCornerScaleMeasurer, {
  type TextCornerScaleMeasurement
} from '../../../src/editor/text-manager/scaling/text-corner-scale-measurer'
import {
  createTextCornerScaleGestureProjection,
  createTextCornerScaleStepProjection,
  type TextCornerScaleGestureProjection
} from '../../../src/editor/text-manager/scaling/text-corner-scale-projection'
import {
  captureTextCornerScaleCanonicalState,
  type TextCornerScaleCanonicalState
} from '../../../src/editor/text-manager/scaling/text-corner-scale-state'
import TextScalingController, {
  type AppliedTextCornerScale
} from '../../../src/editor/text-manager/scaling/text-scaling'
import { BackgroundTextbox } from '../../../src/editor/text-manager/background-textbox'
import { getObjectExactBounds, type ObjectBounds } from '../../../src/editor/utils/geometry'
import { createTextManagerTestSetup } from './manager-setup'
import { createTextScalingTransform } from './scaling'

/** Test text settings for corner scaling. */
export type TextCornerScaleInteractionHarnessOptions = Readonly<{
  strokeUniform?: boolean
  strokeWidth?: number
}>

/** Canonical text properties for testing an individual measurer. */
export type TextCornerScaleMeasurerHarnessOptions = Readonly<{
  fontSize?: number
  text?: string
  width?: number
}>

/** Observable dependencies for one text corner-scaling unit scenario. */
export type TextCornerScaleInteractionHarness = Readonly<{
  applyScaleMock: jest.MockedFunction<TextScalingController['applyStandaloneCornerScale']>
  baselineBounds: ObjectBounds
  baselineCanonicalState: TextCornerScaleCanonicalState
  beginScaleMock: jest.MockedFunction<TextScalingController['beginStandaloneCornerScale']>
  captureEnvironmentMock: jest.MockedFunction<SnappingManager['captureScaleSnapEnvironment']>
  clearScaleMock: jest.MockedFunction<TextScalingController['clearStandaloneCornerScale']>
  prepareLegacyCommitMock: jest.MockedFunction<
    TextScalingController['prepareStandaloneCornerScaleForLegacyCommit']
  >
  controller: TextCornerScaleInteractionController
  fixedAnchor: Readonly<{ x: number; y: number }>
  gesture: TextCornerScaleGestureProjection
  markStepMock: jest.MockedFunction<SnappingManager['markStepHandled']>
  pointerStart: Readonly<{ x: number; y: number }>
  publishGuidesMock: jest.MockedFunction<SnappingManager['publishVerifiedScaleGuides']>
  target: BackgroundTextbox
  transform: Transform
}>

/** Real text measurer and its cleanup after a unit scenario. */
export type TextCornerScaleMeasurerHarness = Readonly<{
  dispose(): void
  measurer: TextCornerScaleMeasurer
  target: BackgroundTextbox
}>

/** Dependencies of the owners of test text corner scaling. */
type TextCornerScaleControllerDependencies = Readonly<{
  applyScaleMock: TextCornerScaleInteractionHarness['applyScaleMock']
  beginScaleMock: TextCornerScaleInteractionHarness['beginScaleMock']
  captureEnvironmentMock: TextCornerScaleInteractionHarness['captureEnvironmentMock']
  clearScaleMock: TextCornerScaleInteractionHarness['clearScaleMock']
  prepareLegacyCommitMock: TextCornerScaleInteractionHarness['prepareLegacyCommitMock']
  markStepMock: TextCornerScaleInteractionHarness['markStepMock']
  publishGuidesMock: TextCornerScaleInteractionHarness['publishGuidesMock']
  target: BackgroundTextbox
}>

/** Creates standalone text with a canonical unit scale. */
function createTextCornerScaleTarget({
  strokeUniform = true,
  strokeWidth = 0
}: TextCornerScaleInteractionHarnessOptions): BackgroundTextbox {
  const target = new BackgroundTextbox('Текст', {
    left: 300,
    top: 200,
    originX: 'left',
    originY: 'top',
    width: 100,
    height: 40,
    fontSize: 20,
    scaleX: 1,
    scaleY: 1,
    skewX: 0,
    skewY: 0,
    stroke: strokeWidth === 0 ? undefined : '#000000',
    strokeUniform,
    strokeWidth
  })
  target.getCoords = jest.fn(() => {
    const left = target.left ?? 0
    const top = target.top ?? 0
    const width = (target.width ?? 0) * (target.scaleX ?? 1)
    const height = (target.height ?? 0) * (target.scaleY ?? 1)

    return [
      new Point(left, top),
      new Point(left + width, top),
      new Point(left + width, top + height),
      new Point(left, top + height)
    ]
  })
  target.controls = controlsUtils.createTextboxDefaultControls()
  target.setCoords()

  return target
}

/** Returns exact bounds or fails the test if the Fabric contract is violated. */
export function getRequiredTextCornerScaleBounds({
  target
}: {
  target: FabricObject
}): ObjectBounds {
  const bounds = getObjectExactBounds({ object: target })
  if (!bounds) throw new Error('Тестовый текст должен иметь точные границы')

  return bounds
}

/** Creates a CanvasManager with only the object-positioning behavior needed by tests. */
function createTextCornerScaleCanvasManager(): CanvasManager {
  const canvasManager: CanvasManager = Object.create(CanvasManager.prototype)
  canvasManager.getObjectPlacement = jest.fn(({ object, originX, originY }) => {
    const resolvedOriginX = originX ?? object.originX ?? 'center'
    const resolvedOriginY = originY ?? object.originY ?? 'center'
    const point = object.getPointByOrigin(resolvedOriginX, resolvedOriginY)

    return {
      left: point.x,
      top: point.y,
      originX: resolvedOriginX,
      originY: resolvedOriginY
    }
  })

  return canvasManager
}

/** Creates the canonical state expected for the specified factor. */
export function createTextCornerScaleCanonicalState({
  harness,
  scale
}: {
  harness: TextCornerScaleInteractionHarness
  scale: number
}): TextCornerScaleCanonicalState {
  const baseline = harness.baselineCanonicalState

  return Object.freeze({
    ...baseline,
    fontSize: baseline.fontSize * scale,
    height: baseline.height * scale,
    inlineFontSizes: Object.freeze(baseline.inlineFontSizes.map((entry) => {
      return Object.freeze({ ...entry, value: entry.value * scale })
    })),
    lineFontSizes: Object.freeze(baseline.lineFontSizes.map((entry) => {
      return Object.freeze({ ...entry, value: entry.value * scale })
    })),
    width: baseline.width * scale
  })
}

/** Applies test geometry around the fixed point and returns the scaling result. */
export function materializeTextCornerScale({
  canonicalState,
  harness,
  scale
}: {
  canonicalState?: TextCornerScaleCanonicalState
  harness: TextCornerScaleInteractionHarness
  scale: number
}): AppliedTextCornerScale {
  const { target, transform } = harness
  const resolvedCanonicalState = canonicalState ?? createTextCornerScaleCanonicalState({ harness, scale })
  target.set({
    fontSize: resolvedCanonicalState.fontSize,
    height: resolvedCanonicalState.height,
    paddingBottom: resolvedCanonicalState.paddingBottom,
    paddingLeft: resolvedCanonicalState.paddingLeft,
    paddingRight: resolvedCanonicalState.paddingRight,
    paddingTop: resolvedCanonicalState.paddingTop,
    radiusBottomLeft: resolvedCanonicalState.radiusBottomLeft,
    radiusBottomRight: resolvedCanonicalState.radiusBottomRight,
    radiusTopLeft: resolvedCanonicalState.radiusTopLeft,
    radiusTopRight: resolvedCanonicalState.radiusTopRight,
    scaleX: resolvedCanonicalState.scaleX,
    scaleY: resolvedCanonicalState.scaleY,
    width: resolvedCanonicalState.width
  })
  target.setPositionByOrigin(
    new Point(harness.fixedAnchor.x, harness.fixedAnchor.y),
    transform.originX,
    transform.originY
  )
  target.setCoords()

  return Object.freeze({
    canonicalState: resolvedCanonicalState,
    scale
  })
}

/** Builds dependencies for the canvas, snapping, and canonical text scaling. */
function createTextCornerScaleController({
  applyScaleMock,
  beginScaleMock,
  captureEnvironmentMock,
  clearScaleMock,
  prepareLegacyCommitMock,
  markStepMock,
  publishGuidesMock,
  target
}: TextCornerScaleControllerDependencies): TextCornerScaleInteractionController {
  const canvasManager = createTextCornerScaleCanvasManager()
  const canvas: Canvas = Object.create(Canvas.prototype)
  canvas.endCurrentTransform = jest.fn()
  target.canvas = canvas

  const snappingManager: SnappingManager = Object.create(SnappingManager.prototype)
  snappingManager.captureScaleSnapEnvironment = captureEnvironmentMock
  snappingManager.markStepHandled = markStepMock
  snappingManager.publishVerifiedScaleGuides = publishGuidesMock

  const editor: ImageEditor = Object.create(ImageEditor.prototype)
  editor.canvas = canvas
  editor.canvasManager = canvasManager
  editor.snappingManager = snappingManager

  const scalingController: TextScalingController = Object.create(TextScalingController.prototype)
  scalingController.beginStandaloneCornerScale = beginScaleMock
  scalingController.applyStandaloneCornerScale = applyScaleMock
  scalingController.clearStandaloneCornerScale = clearScaleMock
  scalingController.prepareStandaloneCornerScaleForLegacyCommit = prepareLegacyCommitMock

  return new TextCornerScaleInteractionController({ editor, scalingController })
}

/** Builds scaling-owner mocks after preparing the gesture geometry. */
function createTextCornerScaleHarnessDependencies({
  fixedAnchor,
  gesture,
  pointerStart,
  target,
  transform
}: {
  fixedAnchor: Readonly<{ x: number; y: number }>
  gesture: TextCornerScaleGestureProjection
  pointerStart: Readonly<{ x: number; y: number }>
  target: BackgroundTextbox
  transform: Transform
}): TextCornerScaleInteractionHarness {
  const captureEnvironmentMock: TextCornerScaleInteractionHarness['captureEnvironmentMock'] = jest.fn((_options) => ({
    candidates: [],
    zoom: 1
  }))
  const markStepMock: TextCornerScaleInteractionHarness['markStepMock'] = jest.fn()
  const publishGuidesMock: TextCornerScaleInteractionHarness['publishGuidesMock'] = jest.fn()
  const beginScaleMock: TextCornerScaleInteractionHarness['beginScaleMock'] = jest.fn((_gesture) => true)
  const applyScaleMock: TextCornerScaleInteractionHarness['applyScaleMock'] = jest.fn()
  const clearScaleMock: TextCornerScaleInteractionHarness['clearScaleMock'] = jest.fn()
  const prepareLegacyCommitMock: TextCornerScaleInteractionHarness['prepareLegacyCommitMock'] = jest.fn()
  const controller = createTextCornerScaleController({
    applyScaleMock,
    beginScaleMock,
    captureEnvironmentMock,
    clearScaleMock,
    prepareLegacyCommitMock,
    markStepMock,
    publishGuidesMock,
    target
  })
  const harness = Object.freeze({
    applyScaleMock,
    baselineBounds: getRequiredTextCornerScaleBounds({ target }),
    baselineCanonicalState: captureTextCornerScaleCanonicalState({ textbox: target }),
    beginScaleMock,
    captureEnvironmentMock,
    clearScaleMock,
    prepareLegacyCommitMock,
    controller,
    fixedAnchor,
    gesture,
    markStepMock,
    pointerStart,
    publishGuidesMock,
    target,
    transform
  })
  applyScaleMock.mockImplementation(({ scale }) => materializeTextCornerScale({ harness, scale }))

  return harness
}

/** Creates a controller, a real Textbox, and observable external dependencies. */
export function createTextCornerScaleInteractionHarness(
  options: TextCornerScaleInteractionHarnessOptions = {}
): TextCornerScaleInteractionHarness {
  const target = createTextCornerScaleTarget(options)
  const transform = createTextScalingTransform({ textbox: target })
  const fixedAnchor = target.getPointByOrigin('left', 'top')
  const pointerStart = target.getPointByOrigin('right', 'bottom')
  const gesture = createTextCornerScaleGestureProjection({ textbox: target, transform, pointerStart })
  if (!gesture) throw new Error('Тестовый угловой жест должен иметь прямоугольную проекцию')

  return createTextCornerScaleHarnessDependencies({
    fixedAnchor: Object.freeze({ x: fixedAnchor.x, y: fixedAnchor.y }),
    gesture,
    pointerStart: Object.freeze({ x: pointerStart.x, y: pointerStart.y }),
    target,
    transform
  })
}

/** Creates a real text measurer with the specified canonical properties. */
export function createTextCornerScaleMeasurerHarness({
  fontSize = 6,
  text = 'X',
  width = 1
}: TextCornerScaleMeasurerHarnessOptions = {}): TextCornerScaleMeasurerHarness {
  const setup = createTextManagerTestSetup()
  const target = new BackgroundTextbox(text, {
    autoExpand: false,
    fontSize,
    left: 100,
    originX: 'left',
    originY: 'top',
    top: 100,
    width
  })
  target.width = width
  const height = target.height ?? target.calcTextHeight()
  target.getCoords = jest.fn(() => [
    new Point(100, 100),
    new Point(100 + width, 100),
    new Point(100 + width, 100 + height),
    new Point(100, 100 + height)
  ])
  target.setCoords()

  const transform = createTextScalingTransform({ textbox: target })
  const pointerStart = new Point(100 + width, 100 + height)
  const gesture = createTextCornerScaleGestureProjection({ textbox: target, transform, pointerStart })
  if (!gesture) throw new Error('Минимальный текст должен поддерживать угловой скейлинг')

  const measurer = new TextCornerScaleMeasurer({
    canvasManager: setup.editor.canvasManager,
    gesture,
    target,
    transform
  })

  return Object.freeze({
    dispose: () => {
      measurer.dispose()
      target.dispose()
      setup.textManager.destroy()
    },
    measurer,
    target
  })
}

/** Returns a guide for the right edge at the specified factor. */
export function createTextCornerScaleRightGuide({
  harness,
  scale
}: {
  harness: TextCornerScaleInteractionHarness
  scale: number
}): ScaleSnapCandidateInput {
  const width = harness.baselineBounds.right - harness.baselineBounds.left

  return {
    id: 'right-guide',
    axis: 'x',
    edge: 'right',
    position: harness.baselineBounds.left + (width * scale),
    category: 'edge'
  }
}

/** Sets an immutable snapping environment for the current gesture. */
export function setTextCornerScaleEnvironment({
  environment,
  harness
}: {
  environment: ScaleSnapEnvironment
  harness: TextCornerScaleInteractionHarness
}): void {
  harness.captureEnvironmentMock.mockReturnValue(environment)
}

/** Creates a corner-scaling start event. */
export function createTextCornerScaleBeginEvent({
  harness
}: {
  harness: TextCornerScaleInteractionHarness
}): TextCornerScaleInteractionEvent {
  return Object.freeze({
    target: harness.target,
    transform: harness.transform,
    pointer: harness.pointerStart,
    scenePoint: harness.pointerStart
  })
}

/** Calculates the pointer position for a proportional factor. */
export function moveTextCornerScalePointer({
  harness,
  scale
}: {
  harness: TextCornerScaleInteractionHarness
  scale: number
}): Readonly<{ x: number; y: number }> {
  return Object.freeze({
    x: harness.fixedAnchor.x + ((harness.pointerStart.x - harness.fixedAnchor.x) * scale),
    y: harness.fixedAnchor.y + ((harness.pointerStart.y - harness.fixedAnchor.y) * scale)
  })
}

/** Creates an event for one pointer movement. */
export function createTextCornerScaleStepEvent({
  harness,
  marker,
  scale
}: {
  harness: TextCornerScaleInteractionHarness
  marker: MouseEvent
  scale: number
}): TextCornerScaleInteractionEvent {
  const pointer = moveTextCornerScalePointer({ harness, scale })

  return Object.freeze({
    target: harness.target,
    transform: harness.transform,
    e: marker,
    pointer,
    scenePoint: pointer
  })
}

/** Creates an exact measurement for the specified factor and moving edges. */
export function createTextCornerScaleInteractionMeasurement({
  bottom,
  harness,
  right,
  scale
}: {
  bottom?: number
  harness: TextCornerScaleInteractionHarness
  right?: number
  scale: number
}): TextCornerScaleMeasurement {
  const width = harness.baselineBounds.right - harness.baselineBounds.left
  const height = harness.baselineBounds.bottom - harness.baselineBounds.top
  const bounds = Object.freeze({
    left: harness.baselineBounds.left,
    right: right ?? harness.baselineBounds.left + (width * scale),
    top: harness.baselineBounds.top,
    bottom: bottom ?? harness.baselineBounds.top + (height * scale)
  })
  const exactBounds = Object.freeze({
    ...bounds,
    centerX: bounds.left + ((bounds.right - bounds.left) / 2),
    centerY: bounds.top + ((bounds.bottom - bounds.top) / 2)
  })
  const previousScale = scale - 0.01
  const rightDelta = right === undefined
    ? width * 0.01
    : Math.max(0.25, Math.abs(exactBounds.right - harness.fixedAnchor.x) * 0.01)
  const bottomDelta = bottom === undefined
    ? height * 0.01
    : Math.max(0.25, Math.abs(exactBounds.bottom - harness.fixedAnchor.y) * 0.01)
  const previousRight = exactBounds.right - rightDelta
  const previousBottom = exactBounds.bottom - bottomDelta
  const previousBounds = Object.freeze({
    left: harness.baselineBounds.left,
    right: previousRight,
    top: harness.baselineBounds.top,
    bottom: previousBottom,
    centerX: harness.baselineBounds.left + ((previousRight - harness.baselineBounds.left) / 2),
    centerY: harness.baselineBounds.top + ((previousBottom - harness.baselineBounds.top) / 2)
  })
  const projection = createTextCornerScaleStepProjection({
    bounds: exactBounds,
    gesture: harness.gesture,
    samples: [Object.freeze({ bounds: previousBounds, scale: previousScale })],
    scale
  })
  if (!projection) throw new Error('Тестовое измерение должно иметь проекцию')

  return Object.freeze({
    canonicalState: createTextCornerScaleCanonicalState({ harness, scale }),
    projection,
    scale
  })
}
