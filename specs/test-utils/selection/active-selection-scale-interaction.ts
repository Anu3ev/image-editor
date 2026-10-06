import {
  ActiveSelection,
  Canvas,
  Point,
  Rect,
  controlsUtils,
  type FabricObject,
  type TMat2D,
  type TOriginX,
  type TOriginY,
  type Transform
} from 'fabric'

import { ImageEditor } from '../../../src/editor'
import CanvasManager from '../../../src/editor/canvas-manager'
import ErrorManager from '../../../src/editor/error-manager'
import HistoryManager from '../../../src/editor/history-manager'
// eslint-disable-next-line max-len
import ActiveSelectionScaleInteractionController from '../../../src/editor/selection-manager/scaling/active-selection-scale-interaction-controller'
import type {
  ActiveSelectionScaleInteractionEvent
} from '../../../src/editor/selection-manager/scaling/active-selection-scale-session'
import {
  createRectangularScaleGestureProjection,
  createRectangularScaleProjectionModes,
  createRectangularScaleValues,
  type RectangularScaleControlKey,
  type RectangularScaleGestureMode,
  type RectangularScaleGestureProjection,
  type RectangularScaleMultipliers
} from '../../../src/editor/snapping-manager/scaling/rectangular-scale-gesture-projection'
import type { ScaleSnapEnvironment } from '../../../src/editor/snapping-manager/scaling/scale-snap-candidates'
import SnappingManager from '../../../src/editor/snapping-manager'
import ShapeManager from '../../../src/editor/shape-manager'
import { ShapeGroupObject } from '../../../src/editor/shape-manager/domain/shape-group'
import { applyShapeCornerFreeScaleControls } from '../../../src/editor/shape-manager/scaling/shape-controls'
import TextManager from '../../../src/editor/text-manager'
import { BackgroundTextbox } from '../../../src/editor/text-manager/background-textbox'
import type { ActiveSelectionTextScaleMeasurement } from '../../../src/editor/text-manager/scaling/active-selection-scale-measurer'
import { captureTextCornerScaleCanonicalState } from '../../../src/editor/text-manager/scaling/text-corner-scale-state'
import {
  getObjectExactBounds,
  type ObjectBounds
} from '../../../src/editor/utils/geometry'
import { createMockFabricImage } from '../managers/image'
import { createCanvasManagerTestStub } from '../editor/editor-stub'
import { installRectangularScaleGeometryContract } from '../snapping/rectangular-scale-gesture-projection'

/** Parameters for test scaling of a selection containing two images. */
export type ActiveSelectionScaleHarnessOptions = Readonly<{
  angle?: number
  centered?: boolean
  controlKey?: RectangularScaleControlKey
  originalScaleX?: number
  originalScaleY?: number
  uniformScaling?: boolean
}>

/** Parameters for test scaling of a selection containing two shapes. */
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

/** Parameters for test scaling of a selection containing two standalone text objects. */
export type TextActiveSelectionScaleHarnessOptions = Readonly<{
  angle?: number
  centered?: boolean
  controlKey?: RectangularScaleControlKey
  supported?: boolean
  uniformScaling?: boolean
}>

/** Image parameters in a test multi-object selection containing text. */
export type ImageTextActiveSelectionScaleHarnessOptions = Readonly<{
  imageAngle?: number
  imageFlipX?: boolean
}>

/** Shared observable dependencies for ActiveSelection scaling tests. */
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
  readonly endHistoryActionMock: jest.MockedFunction<ImageEditor['historyManager']['endAction']>
  readonly markHandledMock: jest.MockedFunction<ImageEditor['snappingManager']['markStepHandled']>
  readonly publishGuidesMock: jest.MockedFunction<
    ImageEditor['snappingManager']['publishVerifiedScaleGuides']
  >
  readonly supportsShapeSelectionMock: jest.MockedFunction<
    ImageEditor['shapeManager']['supportsActiveSelectionScaling']
  >
  readonly applyTextSelectionPreviewMock: jest.MockedFunction<
    ImageEditor['textManager']['applyActiveSelectionScalePreview']
  >
  readonly beginTextSelectionScalingMock: jest.MockedFunction<
    ImageEditor['textManager']['beginActiveSelectionScaling']
  >
  readonly clearTextSelectionScalingMock: jest.MockedFunction<
    ImageEditor['textManager']['clearActiveSelectionScaling']
  >
  readonly confirmTextSelectionScalePreviewMock: jest.MockedFunction<
    ImageEditor['textManager']['confirmActiveSelectionScalePreview']
  >
  readonly measureTextSelectionScaleMock: jest.MockedFunction<
    ImageEditor['textManager']['measureActiveSelectionScale']
  >
  readonly resolveTextSelectionScaleStepMock: jest.MockedFunction<
    ImageEditor['textManager']['resolveActiveSelectionScaleStep']
  >
  readonly restoreTextSelectionScalePreviewMock: jest.MockedFunction<
    ImageEditor['textManager']['restoreActiveSelectionScalePreview']
  >
  readonly supportsTextSelectionMock: jest.MockedFunction<
    ImageEditor['textManager']['supportsActiveSelectionScaling']
  >
}

/** Shared test gesture geometry for any supported selection composition. */
interface ActiveSelectionScaleEventHarness {
  readonly controlKey: RectangularScaleControlKey
  readonly fixedAnchor: Point
  readonly pointerStart: Point
  readonly target: ActiveSelection
  readonly transform: Transform
  /** Applies Fabric's preliminary result before checking one step. */
  readonly applyFabricPreview: (multipliers: RectangularScaleMultipliers) => void
}

/** Shared initial geometry of one ActiveSelection test gesture. */
interface ActiveSelectionScaleGestureSetup {
  readonly baselineBounds: ObjectBounds
  readonly controlKey: RectangularScaleControlKey
  readonly fixedAnchor: Point
  readonly pointerStart: Point
  readonly target: ActiveSelection
  readonly transform: Transform
}

/** ShapeManager and its observable methods for one test controller. */
interface ActiveSelectionShapeManagerDependencies {
  readonly applyShapeSelectionPreviewMock: ActiveSelectionScaleHarnessDependencies['applyShapeSelectionPreviewMock']
  readonly clearShapeSelectionPreviewStateMock: ActiveSelectionScaleHarnessDependencies['clearShapeSelectionPreviewStateMock']
  readonly shapeManager: ShapeManager
  readonly supportsShapeSelectionMock: ActiveSelectionScaleHarnessDependencies['supportsShapeSelectionMock']
}

/** Observable TextManager methods that process one live step. */
interface ActiveSelectionTextScaleStepMocks {
  readonly applyTextSelectionPreviewMock: ActiveSelectionScaleHarnessDependencies['applyTextSelectionPreviewMock']
  readonly measureTextSelectionScaleMock: ActiveSelectionScaleHarnessDependencies['measureTextSelectionScaleMock']
  readonly resolveTextSelectionScaleStepMock: ActiveSelectionScaleHarnessDependencies['resolveTextSelectionScaleStepMock']
}

/** TextManager and its observable multi-object scaling methods. */
interface ActiveSelectionTextManagerDependencies extends ActiveSelectionTextScaleStepMocks {
  readonly beginTextSelectionScalingMock: ActiveSelectionScaleHarnessDependencies['beginTextSelectionScalingMock']
  readonly clearTextSelectionScalingMock: ActiveSelectionScaleHarnessDependencies['clearTextSelectionScalingMock']
  readonly confirmTextSelectionScalePreviewMock: ActiveSelectionScaleHarnessDependencies[
    'confirmTextSelectionScalePreviewMock'
  ]
  readonly restoreTextSelectionScalePreviewMock: ActiveSelectionScaleHarnessDependencies[
    'restoreTextSelectionScalePreviewMock'
  ]
  readonly supportsTextSelectionMock: ActiveSelectionScaleHarnessDependencies['supportsTextSelectionMock']
  readonly textManager: TextManager
}

/** Observable dependencies of one multi-object selection test gesture. */
export interface ActiveSelectionScaleHarness extends ActiveSelectionScaleEventHarness,
  ActiveSelectionScaleHarnessDependencies {
  readonly baselineBounds: ObjectBounds
  readonly children: readonly ReturnType<typeof createMockFabricImage>[]
  readonly controller: ActiveSelectionScaleInteractionController
}

/** Observable dependencies of one test gesture on a selection of shapes. */
export interface ShapeActiveSelectionScaleHarness extends ActiveSelectionScaleEventHarness,
  ActiveSelectionScaleHarnessDependencies {
  readonly baselineBounds: ObjectBounds
  readonly children: readonly ShapeGroupObject[]
  readonly controller: ActiveSelectionScaleInteractionController
}

/** Observable dependencies of one test gesture on a selection of text objects. */
export interface TextActiveSelectionScaleHarness extends ActiveSelectionScaleEventHarness,
  ActiveSelectionScaleHarnessDependencies {
  readonly baselineBounds: ObjectBounds
  readonly children: readonly BackgroundTextbox[]
  readonly controller: ActiveSelectionScaleInteractionController
  readonly projection: RectangularScaleGestureProjection
}

/** Image-and-text composition for testing scaling routing. */
export interface ImageTextActiveSelectionScaleHarness extends ActiveSelectionScaleEventHarness,
  ActiveSelectionScaleHarnessDependencies {
  readonly baselineBounds: ObjectBounds
  readonly children: readonly [ReturnType<typeof createMockFabricImage>, BackgroundTextbox]
  readonly controller: ActiveSelectionScaleInteractionController
  readonly image: ReturnType<typeof createMockFabricImage>
  readonly projection: RectangularScaleGestureProjection
  readonly text: BackgroundTextbox
}

/** Fixed and moving anchor points for one standard handle. */
type ActiveSelectionScaleControlOrigins = Readonly<{
  fixedX: TOriginX
  fixedY: TOriginY
  movingX: TOriginX
  movingY: TOriginY
}>

/** Anchor points for all eight standard handles. */
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

/** Sets deterministic geometry for the test selection. */
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

/** Creates two images with different dimensions and local transforms. */
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

/** Creates two shape domain objects with different dimensions. */
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

/** Creates two canonical standalone text objects with different geometry. */
function createSelectionTexts(): readonly BackgroundTextbox[] {
  const first = new BackgroundTextbox('Первый текст', {
    fontSize: 24,
    left: 180,
    originX: 'left',
    originY: 'top',
    strokeWidth: 0,
    top: 160,
    width: 110
  })
  const second = new BackgroundTextbox('Второй текст', {
    fontSize: 30,
    left: 310,
    originX: 'left',
    originY: 'top',
    strokeWidth: 0,
    top: 230,
    width: 125
  })

  first.initDimensions()
  first.set({ width: 110 })
  second.initDimensions()
  second.set({ width: 125 })

  if (first.width <= 0 || first.height <= 0) throw new Error('Первый тестовый текст должен иметь размер')
  if (second.width <= 0 || second.height <= 0) throw new Error('Второй тестовый текст должен иметь размер')

  return Object.freeze([first, second])
}

/** Returns the position of a named origin along one axis. */
function resolveTextOriginFactor({ origin }: { origin: TOriginX | TOriginY }): number {
  if (typeof origin === 'number') return origin
  if (origin === 'center') return 0.5
  if (origin === 'right' || origin === 'bottom') return 1

  return 0
}

/** Sets a child's visible-bounds geometry, accounting for the temporary frame. */
export function installSelectionChildGeometryContract({
  selection,
  target
}: {
  selection: ActiveSelection
  target: FabricObject
}): void {
  target.setPositionByOrigin = (point, originX, originY) => {
    target.left = point.x - ((target.width * target.scaleX) * resolveTextOriginFactor({ origin: originX }))
    target.top = point.y - ((target.height * target.scaleY) * resolveTextOriginFactor({ origin: originY }))

    return target
  }
  target.getPointByOrigin = (originX, originY) => {
    const localX = target.left + ((target.width * target.scaleX) * resolveTextOriginFactor({ origin: originX }))
    const localY = target.top + ((target.height * target.scaleY) * resolveTextOriginFactor({ origin: originY }))
    if (target.group !== selection) return new Point(localX, localY)

    const radians = (selection.angle * Math.PI) / 180
    const scaledX = localX * selection.scaleX
    const scaledY = localY * selection.scaleY

    return new Point(
      selection.left + (scaledX * Math.cos(radians)) - (scaledY * Math.sin(radians)),
      selection.top + (scaledX * Math.sin(radians)) + (scaledY * Math.cos(radians))
    )
  }
  target.getCoords = () => [
    target.getPointByOrigin('left', 'top'),
    target.getPointByOrigin('right', 'top'),
    target.getPointByOrigin('right', 'bottom'),
    target.getPointByOrigin('left', 'bottom')
  ]
  target.getBoundingRect = () => {
    const corners = target.getCoords()
    const xCoordinates = corners.map(({ x }) => x)
    const yCoordinates = corners.map(({ y }) => y)
    const left = Math.min(...xCoordinates)
    const top = Math.min(...yCoordinates)

    return {
      height: Math.max(...yCoordinates) - top,
      left,
      top,
      width: Math.max(...xCoordinates) - left
    }
  }
}

/** Text session data required by the observable TextManager. */
type ActiveSelectionTextScaleTestContract = Readonly<{
  fixedAnchor: Point
  projection: RectangularScaleGestureProjection
  supported: boolean
  transform: Transform
}>

/** Calculates the bounds of a linear test projection for the supplied values. */
function projectTextSelectionBounds({
  mode,
  multipliers,
  projection
}: {
  mode: RectangularScaleGestureMode
  multipliers: RectangularScaleMultipliers
  projection: RectangularScaleGestureProjection
}): ObjectBounds {
  const projectionMode = createRectangularScaleProjectionModes({ projection })
    .find(({ id }) => id === mode)
  if (!projectionMode) throw new Error(`Тестовая проекция должна содержать режим ${mode}`)

  const values = createRectangularScaleValues({ mode, multipliers })
  const bounds = { ...projection.baselineBounds }
  projectionMode.projection.edges.forEach(({ coefficients, edge }) => {
    bounds[edge] = coefficients.reduce((position, coefficient, index) => {
      return position + (coefficient * (values[index] - projectionMode.projection.baselineValues[index]))
    }, projection.baselineBounds[edge])
  })
  bounds.centerX = bounds.left + ((bounds.right - bounds.left) / 2)
  bounds.centerY = bounds.top + ((bounds.bottom - bounds.top) / 2)

  if (bounds.right <= bounds.left || bounds.bottom <= bounds.top) {
    throw new Error('Тестовое измерение текстов должно иметь положительный размер')
  }

  return Object.freeze(bounds)
}

/** Creates a contract-compliant TextManager measurement for testing the routing of one step. */
function createTextSelectionMeasurement({
  children,
  mode,
  multipliers,
  projection,
  selection
}: {
  children: readonly BackgroundTextbox[]
  mode: RectangularScaleGestureMode
  multipliers: RectangularScaleMultipliers
  projection: RectangularScaleGestureProjection
  selection: ActiveSelection
}): ActiveSelectionTextScaleMeasurement {
  const projectionMode = createRectangularScaleProjectionModes({ projection })
    .find(({ id }) => id === mode)
  if (!projectionMode) throw new Error(`Тестовая проекция должна содержать режим ${mode}`)

  const bounds = projectTextSelectionBounds({ mode, multipliers, projection })
  const values = createRectangularScaleValues({ mode, multipliers })

  return Object.freeze({
    affineChildren: Object.freeze([]),
    bounds,
    children: Object.freeze(children.map((target) => Object.freeze({
      canonicalState: captureTextCornerScaleCanonicalState({ textbox: target }),
      center: Object.freeze({ x: target.left, y: target.top }),
      target
    }))),
    domainChildren: Object.freeze([]),
    domainMeasurement: null,
    frame: Object.freeze({
      center: Object.freeze({ x: 0, y: 0 }),
      height: selection.height * multipliers.y,
      scaleX: multipliers.x,
      scaleY: multipliers.y,
      width: selection.width * multipliers.x
    }),
    mode,
    multipliers: Object.freeze({ ...multipliers }),
    projection: Object.freeze({
      bounds,
      projection: Object.freeze({
        ...projectionMode.projection,
        baselineValues: values
      })
    }),
    values
  })
}

/** Creates a contract-compliant ShapeManager with observable multi-object scaling methods. */
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
  const resolveScaleControlModeMock: jest.MockedFunction<
    ImageEditor['shapeManager']['resolveActiveSelectionScaleControlMode']
  > = jest.fn(({ event, transform }) => {
    const isCorner = transform.corner === 'tl'
      || transform.corner === 'tr'
      || transform.corner === 'bl'
      || transform.corner === 'br'
    if (!isCorner) return null

    return event && 'shiftKey' in event && event.shiftKey ? 'free' : 'uniform'
  })
  const shapeManager: ShapeManager = Object.create(ShapeManager.prototype)

  shapeManager.supportsActiveSelectionScaling = supportsShapeSelectionMock
  shapeManager.applyActiveSelectionScalePreview = applyShapeSelectionPreviewMock
  shapeManager.clearActiveSelectionScalePreviewState = clearShapeSelectionPreviewStateMock
  shapeManager.resolveActiveSelectionScaleControlMode = resolveScaleControlModeMock

  if (shapeManager.supportsActiveSelectionScaling !== supportsShapeSelectionMock) {
    throw new Error('ShapeManager должен использовать наблюдаемую проверку состава выделения')
  }
  if (shapeManager.applyActiveSelectionScalePreview !== applyShapeSelectionPreviewMock) {
    throw new Error('ShapeManager должен использовать наблюдаемое применение масштаба')
  }
  if (shapeManager.clearActiveSelectionScalePreviewState !== clearShapeSelectionPreviewStateMock) {
    throw new Error('ShapeManager должен использовать наблюдаемую очистку временного масштаба')
  }
  if (shapeManager.resolveActiveSelectionScaleControlMode !== resolveScaleControlModeMock) {
    throw new Error('ShapeManager должен использовать наблюдаемый режим угловой ручки')
  }

  return Object.freeze({
    applyShapeSelectionPreviewMock,
    clearShapeSelectionPreviewStateMock,
    shapeManager,
    supportsShapeSelectionMock
  })
}

/** Creates observable methods for measuring and applying one text step. */
function createTextScaleStepMocks({
  children,
  contract,
  target
}: {
  children: readonly BackgroundTextbox[]
  contract?: ActiveSelectionTextScaleTestContract
  target: ActiveSelection
}): ActiveSelectionTextScaleStepMocks {
  const measureTextSelectionScaleMock: ActiveSelectionTextScaleStepMocks['measureTextSelectionScaleMock'] = jest.fn<
    ReturnType<ImageEditor['textManager']['measureActiveSelectionScale']>,
    Parameters<ImageEditor['textManager']['measureActiveSelectionScale']>
  >(({ mode, multipliers, selection }) => {
    if (!contract || selection !== target) {
      throw new Error('Измерение текста требует активной тестовой сессии')
    }

    return createTextSelectionMeasurement({ children, mode, multipliers, projection: contract.projection, selection })
  })
  const resolveTextSelectionScaleStepMock: ActiveSelectionTextScaleStepMocks['resolveTextSelectionScaleStepMock'] = jest.fn<
    ReturnType<ImageEditor['textManager']['resolveActiveSelectionScaleStep']>,
    Parameters<ImageEditor['textManager']['resolveActiveSelectionScaleStep']>
  >(({ pointerMeasurement }) => Object.freeze({ measurement: pointerMeasurement, refinement: null }))
  const applyTextSelectionPreviewMock: ActiveSelectionTextScaleStepMocks['applyTextSelectionPreviewMock'] = jest.fn<
    ReturnType<ImageEditor['textManager']['applyActiveSelectionScalePreview']>,
    Parameters<ImageEditor['textManager']['applyActiveSelectionScalePreview']>
  >(({ measurement, selection }) => {
    if (!contract || selection !== target) {
      throw new Error('Применение текста требует активной тестовой сессии')
    }

    selection.set({
      scaleX: measurement.frame.scaleX,
      scaleY: measurement.frame.scaleY
    })
    selection.setPositionByOrigin(
      contract.fixedAnchor,
      contract.transform.originX,
      contract.transform.originY
    )
    selection.setCoords()

    return measurement.multipliers
  })

  return Object.freeze({
    applyTextSelectionPreviewMock,
    measureTextSelectionScaleMock,
    resolveTextSelectionScaleStepMock
  })
}

/** Creates a contract-compliant TextManager with observable multi-object scaling methods. */
function createTextManagerDependencies({
  children,
  contract,
  target
}: {
  children: readonly BackgroundTextbox[]
  contract?: ActiveSelectionTextScaleTestContract
  target: ActiveSelection
}): ActiveSelectionTextManagerDependencies {
  const supportsTextSelectionMock: ActiveSelectionTextManagerDependencies['supportsTextSelectionMock'] = jest.fn<
    ReturnType<ImageEditor['textManager']['supportsActiveSelectionScaling']>,
    Parameters<ImageEditor['textManager']['supportsActiveSelectionScaling']>
  >(() => contract?.supported ?? false)
  const beginTextSelectionScalingMock: ActiveSelectionTextManagerDependencies['beginTextSelectionScalingMock'] = jest.fn<
    ReturnType<ImageEditor['textManager']['beginActiveSelectionScaling']>,
    Parameters<ImageEditor['textManager']['beginActiveSelectionScaling']>
  >(() => contract?.supported ?? false)
  const clearTextSelectionScalingMock: ActiveSelectionTextManagerDependencies['clearTextSelectionScalingMock'] = jest.fn<
    ReturnType<ImageEditor['textManager']['clearActiveSelectionScaling']>,
    Parameters<ImageEditor['textManager']['clearActiveSelectionScaling']>
  >(() => Boolean(contract))
  const confirmTextSelectionScalePreviewMock: ActiveSelectionTextManagerDependencies[
    'confirmTextSelectionScalePreviewMock'
  ] = jest.fn<
    ReturnType<ImageEditor['textManager']['confirmActiveSelectionScalePreview']>,
    Parameters<ImageEditor['textManager']['confirmActiveSelectionScalePreview']>
  >(() => Boolean(contract))
  const restoreTextSelectionScalePreviewMock: ActiveSelectionTextManagerDependencies[
    'restoreTextSelectionScalePreviewMock'
  ] = jest.fn<
    ReturnType<ImageEditor['textManager']['restoreActiveSelectionScalePreview']>,
    Parameters<ImageEditor['textManager']['restoreActiveSelectionScalePreview']>
  >(() => false)
  const textManager: TextManager = Object.create(TextManager.prototype)
  const stepMocks = createTextScaleStepMocks({ children, contract, target })

  textManager.supportsActiveSelectionScaling = supportsTextSelectionMock
  textManager.beginActiveSelectionScaling = beginTextSelectionScalingMock
  textManager.measureActiveSelectionScale = stepMocks.measureTextSelectionScaleMock
  textManager.resolveActiveSelectionScaleStep = stepMocks.resolveTextSelectionScaleStepMock
  textManager.applyActiveSelectionScalePreview = stepMocks.applyTextSelectionPreviewMock
  textManager.clearActiveSelectionScaling = clearTextSelectionScalingMock
  textManager.confirmActiveSelectionScalePreview = confirmTextSelectionScalePreviewMock
  textManager.restoreActiveSelectionScalePreview = restoreTextSelectionScalePreviewMock

  return Object.freeze({
    beginTextSelectionScalingMock,
    clearTextSelectionScalingMock,
    confirmTextSelectionScalePreviewMock,
    restoreTextSelectionScalePreviewMock,
    ...stepMocks,
    supportsTextSelectionMock,
    textManager
  })
}

/** Creates a minimal Canvas for one scaling test gesture. */
function createScaleTestCanvas({
  endCurrentTransformMock,
  uniformScaling
}: {
  endCurrentTransformMock: ActiveSelectionScaleHarness['endCurrentTransformMock']
  uniformScaling: boolean
}): Canvas {
  let activeObject: FabricObject | null = null
  const canvas = Object.assign(Object.create(Canvas.prototype), {
    altActionKey: 'shiftKey',
    discardActiveObject: jest.fn(() => {
      const selection = activeObject
      if (selection instanceof ActiveSelection) {
        selection.removeAll().forEach((object) => {
          object.set({
            scaleX: object.scaleX * selection.scaleX,
            scaleY: object.scaleY * selection.scaleY
          })
        })
      }
      activeObject = null

      return canvas
    }),
    endCurrentTransform: endCurrentTransformMock,
    getActiveObject: jest.fn(() => activeObject),
    off: jest.fn(),
    on: jest.fn(),
    requestRenderAll: jest.fn(() => canvas),
    setActiveObject: jest.fn((object: FabricObject) => {
      activeObject = object

      return canvas
    }),
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

/** Builds a minimal editor with the owners of one test gesture. */
function createScaleTestEditor({
  canvas,
  endHistoryActionMock,
  shapeManager,
  snappingManager,
  target,
  textManager
}: {
  canvas: Canvas
  endHistoryActionMock: ActiveSelectionScaleHarnessDependencies['endHistoryActionMock']
  shapeManager: ShapeManager
  snappingManager: SnappingManager
  target: ActiveSelection
  textManager: TextManager
}): ImageEditor {
  const canvasManager: CanvasManager = Object.assign(
    Object.create(CanvasManager.prototype),
    createCanvasManagerTestStub({
      canvas,
      getObjects: () => target.getObjects(),
      montageArea: { height: 600, left: 400, top: 300, width: 800 }
    })
  )
  const editor: ImageEditor = Object.create(ImageEditor.prototype)
  const historyManager: HistoryManager = Object.create(HistoryManager.prototype)

  editor.canvas = canvas
  editor.canvasManager = canvasManager
  editor.errorManager = new ErrorManager({ editor })
  historyManager.endAction = endHistoryActionMock
  editor.historyManager = historyManager
  editor.shapeManager = shapeManager
  editor.snappingManager = snappingManager
  editor.textManager = textManager
  target.canvas = canvas
  canvas.setActiveObject(target)

  if (editor.canvas !== canvas) throw new Error('Тестовый редактор должен использовать подготовленный canvas')
  if (target.canvas !== canvas) throw new Error('Общее выделение должно принадлежать тому же canvas')

  return editor
}

/** Creates a canvas and SnappingManager dependencies without the full editor lifecycle. */
function createControllerDependencies({
  supportsShapeSelection,
  target,
  textChildren = Object.freeze([]),
  textContract,
  uniformScaling
}: {
  supportsShapeSelection: boolean
  target: ActiveSelection
  textChildren?: readonly BackgroundTextbox[]
  textContract?: ActiveSelectionTextScaleTestContract
  uniformScaling: boolean
}): ActiveSelectionScaleHarnessDependencies {
  const captureEnvironmentMock: ActiveSelectionScaleHarness['captureEnvironmentMock'] = jest.fn<
    ScaleSnapEnvironment,
    Parameters<ImageEditor['snappingManager']['captureScaleSnapEnvironment']>
  >(() => Object.freeze({ candidates: Object.freeze([]), zoom: 1 }))
  const markHandledMock: ActiveSelectionScaleHarness['markHandledMock'] = jest.fn()
  const publishGuidesMock: ActiveSelectionScaleHarness['publishGuidesMock'] = jest.fn()
  const endCurrentTransformMock: ActiveSelectionScaleHarness['endCurrentTransformMock'] = jest.fn()
  const endHistoryActionMock: ActiveSelectionScaleHarness['endHistoryActionMock'] = jest.fn()
  const snappingManager: SnappingManager = Object.create(SnappingManager.prototype)
  const shapeDependencies = createShapeManagerDependencies({ supportsShapeSelection })
  const textDependencies = createTextManagerDependencies({
    children: textChildren,
    contract: textContract,
    target
  })
  const canvas = createScaleTestCanvas({ endCurrentTransformMock, uniformScaling })

  snappingManager.captureScaleSnapEnvironment = captureEnvironmentMock
  snappingManager.markStepHandled = markHandledMock
  snappingManager.publishVerifiedScaleGuides = publishGuidesMock
  const editor = createScaleTestEditor({
    canvas,
    endHistoryActionMock,
    shapeManager: shapeDependencies.shapeManager,
    snappingManager,
    target,
    textManager: textDependencies.textManager
  })

  return Object.freeze({
    applyShapeSelectionPreviewMock: shapeDependencies.applyShapeSelectionPreviewMock,
    applyTextSelectionPreviewMock: textDependencies.applyTextSelectionPreviewMock,
    beginTextSelectionScalingMock: textDependencies.beginTextSelectionScalingMock,
    clearShapeSelectionPreviewStateMock: shapeDependencies.clearShapeSelectionPreviewStateMock,
    clearTextSelectionScalingMock: textDependencies.clearTextSelectionScalingMock,
    confirmTextSelectionScalePreviewMock: textDependencies.confirmTextSelectionScalePreviewMock,
    captureEnvironmentMock,
    editor,
    endCurrentTransformMock,
    endHistoryActionMock,
    markHandledMock,
    measureTextSelectionScaleMock: textDependencies.measureTextSelectionScaleMock,
    publishGuidesMock,
    resolveTextSelectionScaleStepMock: textDependencies.resolveTextSelectionScaleStepMock,
    restoreTextSelectionScalePreviewMock: textDependencies.restoreTextSelectionScalePreviewMock,
    supportsShapeSelectionMock: shapeDependencies.supportsShapeSelectionMock,
    supportsTextSelectionMock: textDependencies.supportsTextSelectionMock
  })
}

/** Returns the action for a standard side or corner handle. */
function resolveScaleAction({
  controlKey
}: {
  controlKey: RectangularScaleControlKey
}): Transform['action'] {
  if (controlKey === 'ml' || controlKey === 'mr') return 'scaleX'
  if (controlKey === 'mt' || controlKey === 'mb') return 'scaleY'

  return 'scale'
}

/** Creates a Fabric transform for the selected multi-object selection handle. */
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

/** Returns the exact bounds of the multi-object selection or fails the test. */
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

/** Builds identical initial gesture geometry for all supported compositions. */
function createSelectionScaleGestureSetup({
  centered,
  controlKey,
  target
}: {
  centered: boolean
  controlKey: RectangularScaleControlKey
  target: ActiveSelection
}): ActiveSelectionScaleGestureSetup {
  const transform = createSelectionTransform({ centered, controlKey, target })
  const origins = ACTIVE_SELECTION_SCALE_CONTROL_ORIGINS[controlKey]
  const fixedAnchor = target.getPointByOrigin(transform.originX, transform.originY)
  const pointerStart = target.getPointByOrigin(origins.movingX, origins.movingY)

  return Object.freeze({
    baselineBounds: getRequiredActiveSelectionBounds({ target }),
    controlKey,
    fixedAnchor,
    pointerStart,
    target,
    transform
  })
}

/** Saves the local state of all images in the test multi-object selection. */
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

/** Checks the factors for one multi-object selection scaling test step. */
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

/** Creates a real multi-object selection and sets its test geometry. */
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

/** Creates a function that applies Fabric's preliminary scale to the test selection. */
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

/** Creates a controller with a real ActiveSelection and observable dependencies. */
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
  const gesture = createSelectionScaleGestureSetup({ centered, controlKey, target })
  const dependencies = createControllerDependencies({
    supportsShapeSelection: false,
    target,
    uniformScaling
  })

  return Object.freeze({
    children,
    ...gesture,
    ...dependencies,
    controller: new ActiveSelectionScaleInteractionController({ editor: dependencies.editor }),
    applyFabricPreview: createFabricScalePreview(gesture)
  })
}

/** Prepares two text objects inside a canonical test frame. */
function createTextSelectionTarget({
  angle
}: {
  angle: number
}): Readonly<{
  children: readonly BackgroundTextbox[]
  target: ActiveSelection
}> {
  const children = createSelectionTexts()
  const target = createActiveSelectionTarget({
    angle,
    children,
    originalScaleX: 1,
    originalScaleY: 1
  })

  children.forEach((text) => {
    const center = text.getRelativeCenterPoint()
    text.set({
      group: target,
      left: center.x - target.left - (text.width / 2),
      top: center.y - target.top - (text.height / 2)
    })
    installSelectionChildGeometryContract({ selection: target, target: text })
  })
  target.calcTransformMatrix = jest.fn((): TMat2D => {
    const radians = (target.angle * Math.PI) / 180

    return [
      Math.cos(radians),
      Math.sin(radians),
      -Math.sin(radians),
      Math.cos(radians),
      target.left,
      target.top
    ]
  })

  if (target.getObjects().length !== children.length) {
    throw new Error('Тестовая рамка должна содержать оба подготовленных текста')
  }

  return Object.freeze({ children, target })
}

/** Creates a rectangular projection of the selected text-frame handle. */
function createTextSelectionScaleProjection({
  controlKey,
  gesture
}: {
  controlKey: RectangularScaleControlKey
  gesture: ActiveSelectionScaleGestureSetup
}): RectangularScaleGestureProjection {
  const projection = createRectangularScaleGestureProjection({
    pointerStart: gesture.pointerStart,
    transform: {
      action: resolveScaleAction({ controlKey }),
      corner: controlKey,
      originX: gesture.transform.originX,
      originY: gesture.transform.originY,
      original: {
        scaleX: 1,
        scaleY: 1
      },
      target: gesture.target
    }
  })
  if (!projection) throw new Error('Тестовое выделение из текстов должно иметь проекцию скейлинга')

  return projection
}

/** Creates a controller with a selection of shapes and an observable ShapeManager contract. */
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
  const gesture = createSelectionScaleGestureSetup({ centered, controlKey, target })
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
      selection.setPositionByOrigin(gesture.fixedAnchor, currentTransform.originX, currentTransform.originY)
      selection.setCoords()
      currentTransform.scaleX = selection.scaleX
      currentTransform.scaleY = selection.scaleY

      return { scaleX: selection.scaleX, scaleY: selection.scaleY }
    })
  }

  return Object.freeze({
    children,
    ...gesture,
    ...dependencies,
    controller: new ActiveSelectionScaleInteractionController({ editor: dependencies.editor }),
    applyFabricPreview: createFabricScalePreview(gesture)
  })
}

/** Creates a controller with a selection of text objects and an observable TextManager contract. */
export function createTextActiveSelectionScaleHarness({
  angle = 0,
  centered = false,
  controlKey = 'mr',
  supported = true,
  uniformScaling = true
}: TextActiveSelectionScaleHarnessOptions = {}): TextActiveSelectionScaleHarness {
  const { children, target } = createTextSelectionTarget({ angle })
  const gesture = createSelectionScaleGestureSetup({ centered, controlKey, target })
  const projection = createTextSelectionScaleProjection({ controlKey, gesture })

  const dependencies = createControllerDependencies({
    supportsShapeSelection: false,
    target,
    textChildren: children,
    textContract: {
      fixedAnchor: gesture.fixedAnchor,
      projection,
      supported,
      transform: gesture.transform
    },
    uniformScaling
  })

  return Object.freeze({
    children,
    ...gesture,
    projection,
    ...dependencies,
    controller: new ActiveSelectionScaleInteractionController({ editor: dependencies.editor }),
    applyFabricPreview: createFabricScalePreview(gesture)
  })
}

/** Creates a multi-object selection containing one image and one canonical text object. */
export function createImageTextActiveSelectionScaleHarness({
  imageAngle = 0,
  imageFlipX = false
}: ImageTextActiveSelectionScaleHarnessOptions = {}): ImageTextActiveSelectionScaleHarness {
  const textHarness = createTextActiveSelectionScaleHarness()
  const [text] = textHarness.children
  if (!text) throw new Error('Тестовое выделение должно содержать текст')

  const image = createMockFabricImage({ width: 90, height: 70 })
  image.set({
    angle: imageAngle,
    flipX: imageFlipX,
    flipY: false,
    group: textHarness.target,
    scaleX: 1,
    scaleY: 1,
    skewX: 0,
    skewY: 0,
    strokeWidth: 0
  })
  jest.spyOn(textHarness.target, 'getObjects').mockReturnValue([image, text])

  if (image.group !== textHarness.target) throw new Error('Изображение должно принадлежать тестовому выделению')
  const children: ImageTextActiveSelectionScaleHarness['children'] = Object.freeze([image, text])

  return Object.freeze({
    ...textHarness,
    children,
    image,
    text
  })
}

/** Creates a `mouse:down` with the Fabric transform for the selected handle. */
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

/** Simulates Fabric's preliminary transform and creates an event for the current step. */
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

/** Creates a fallback `mouse:move` without Fabric's preliminary selection transform. */
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
