import {
  ActiveSelection,
  FabricObject,
  Group,
  Rect,
  Textbox,
  type BasicTransformEvent,
  type TPointerEvent
} from 'fabric'
import SnappingManager from '../../../src/editor/snapping-manager'
import { MovementSnappingController } from '../../../src/editor/snapping-manager/movement/movement-snapping-controller'
import { ShapeGroupObject } from '../../../src/editor/shape-manager/domain/shape-group'
import { createSnappingTestContext } from '../canvas/geometry-objects'
import { createMockFabricImage } from '../managers/image'

/** Object type in a movement-routing check. */
export type MovementRoutingTargetKind =
  | 'active-selection'
  | 'active-selection-empty'
  | 'active-selection-images'
  | 'active-selection-shapes'
  | 'active-selection-single-image'
  | 'active-selection-texts'
  | 'active-selection-with-crop-frame'
  | 'active-selection-with-group'
  | 'active-selection-with-nested-image'
  | 'active-selection-with-scaled-text'
  | 'active-selection-with-unknown-object'
  | 'crop-frame'
  | 'group'
  | 'image'
  | 'nested-group'
  | 'nested-image'
  | 'nested-shape'
  | 'nested-text'
  | 'shape'
  | 'text'

/** Movement event accepted by the previous SnappingManager branch. */
type MovementRoutingEvent = BasicTransformEvent<TPointerEvent> & {
  target?: FabricObject | null
  e?: TPointerEvent | null
}

/** Call to the previous movement branch. */
type LegacyMovementRoute = (input: {
  event: MovementRoutingEvent
}) => unknown

/** Internal part of SnappingManager checked by focused routing tests. */
export type MovementRoutingManagerState = {
  movementSnappingController: MovementSnappingController
  _resolveObjectMovementContext: LegacyMovementRoute
}

/** SnappingManager and observable boundaries for one routing scenario. */
export type MovementRoutingSetup = Readonly<{
  canvas: ReturnType<typeof createSnappingTestContext>['canvas']
  legacyRouteMock: jest.SpiedFunction<LegacyMovementRoute>
  manager: SnappingManager
  objects: ReturnType<typeof createSnappingTestContext>['objects']
  state: MovementRoutingManagerState
}>

/** Adds the full geometry needed by the shared movement controller to an object. */
function applyMovementGeometry<T extends FabricObject>({
  target,
  id
}: {
  target: T
  id: string
}): T {
  Object.assign(target, {
    id,
    left: 100,
    top: 80,
    width: 30,
    height: 30,
    scaleX: 1,
    scaleY: 1,
    visible: true
  })

  target.set = jest.fn((properties: Record<string, unknown>) => {
    Object.assign(target, properties)

    return target
  })
  target.setCoords = jest.fn()
  target.getBoundingRect = jest.fn(() => ({
    left: target.left,
    top: target.top,
    width: target.width * target.scaleX,
    height: target.height * target.scaleY
  }))

  return target
}

/** Creates a top-level or nested group for testing routing. */
function createGroupMovementRoutingTarget({
  kind
}: {
  kind: MovementRoutingTargetKind
}): Group | null {
  if (kind !== 'group' && kind !== 'nested-group') return null

  const group = applyMovementGeometry({
    target: new Group([
      new Rect({ width: 10, height: 10 }),
      new Rect({ width: 10, height: 10 })
    ], {}),
    id: kind
  })
  if (kind === 'nested-group') group.group = new Group([], {})

  return group
}

/** Creates a single object for testing movement routing. */
function createSingleMovementRoutingTarget({
  kind
}: {
  kind: MovementRoutingTargetKind
}): FabricObject | null {
  if (kind === 'image' || kind === 'nested-image') {
    const image = applyMovementGeometry({
      target: createMockFabricImage({ width: 30, height: 30 }),
      id: kind
    })
    if (kind === 'nested-image') image.group = new Group([], {})

    return image
  }

  if (kind === 'shape' || kind === 'nested-shape') {
    const shape = applyMovementGeometry({
      target: new ShapeGroupObject([], {}),
      id: kind
    })
    if (kind === 'nested-shape') shape.group = new Group([], {})

    return shape
  }

  const group = createGroupMovementRoutingTarget({ kind })
  if (group) return group

  if (kind === 'text' || kind === 'nested-text') {
    const textbox = applyMovementGeometry({ target: new Textbox('Text', {}), id: kind })
    if (kind === 'nested-text') textbox.group = new Group([], {})

    return textbox
  }

  if (kind !== 'crop-frame') return null

  const cropFrame = applyMovementGeometry({ target: new Rect({}), id: kind })
  Object.assign(cropFrame, {
    cropSource: new Rect({})
  })

  return cropFrame
}

/** Creates a supported multi-object selection composition. */
function createSupportedActiveSelection({
  kind
}: {
  kind: MovementRoutingTargetKind
}): FabricObject | null {
  const supportedKinds: MovementRoutingTargetKind[] = [
    'active-selection',
    'active-selection-images',
    'active-selection-shapes',
    'active-selection-texts'
  ]
  if (!supportedKinds.includes(kind)) return null

  const image = createMockFabricImage({ width: 30, height: 30 })
  const secondImage = createMockFabricImage({ width: 30, height: 30 })
  const shape = new ShapeGroupObject([], {})
  const secondShape = new ShapeGroupObject([], {})
  const text = new Textbox('Text', {})
  const secondText = new Textbox('Second text', {})
  let objects: FabricObject[] = [image, shape, text]

  if (kind === 'active-selection-images') objects = [image, secondImage]
  if (kind === 'active-selection-shapes') objects = [shape, secondShape]
  if (kind === 'active-selection-texts') objects = [text, secondText]

  return applyMovementGeometry({
    target: new ActiveSelection(objects, {}),
    id: kind
  })
}

/** Creates an invalid multi-object selection state to test rejection of the new path. */
function createInvalidActiveSelectionState({
  kind
}: {
  kind: MovementRoutingTargetKind
}): FabricObject | null {
  if (kind === 'active-selection-empty' || kind === 'active-selection-single-image') {
    const objects = kind === 'active-selection-empty'
      ? []
      : [createMockFabricImage({ width: 30, height: 30 })]

    return applyMovementGeometry({
      target: new ActiveSelection(objects, {}),
      id: kind
    })
  }

  if (kind === 'active-selection-with-nested-image') {
    const nestedImage = createMockFabricImage({ width: 30, height: 30 })
    const parent = new Group([nestedImage], {})
    const selection = new ActiveSelection([nestedImage, new Textbox('Text', {})], {})
    nestedImage.parent = parent

    return applyMovementGeometry({
      target: selection,
      id: kind
    })
  }

  if (kind === 'active-selection-with-scaled-text') {
    const selection = new ActiveSelection([
      new Textbox('Text', {}),
      createMockFabricImage({ width: 30, height: 30 })
    ], {})
    const target = applyMovementGeometry({ target: selection, id: kind })
    target.set({ scaleX: 1.2, scaleY: 1.2 })

    return target
  }

  return null
}

/** Creates an unsupported multi-object selection composition. */
function createUnsupportedActiveSelection({
  kind
}: {
  kind: MovementRoutingTargetKind
}): FabricObject | null {
  if (kind === 'active-selection-with-group') {
    return applyMovementGeometry({
      target: new ActiveSelection([new Group([], {}), new Textbox('Text', {})], {}),
      id: kind
    })
  }

  if (kind === 'active-selection-with-unknown-object' || kind === 'active-selection-with-crop-frame') {
    const unsupportedObject = new Rect({})
    if (kind === 'active-selection-with-crop-frame') {
      Object.assign(unsupportedObject, { cropSource: new Rect({}) })
    }

    return applyMovementGeometry({
      target: new ActiveSelection([unsupportedObject, new Textbox('Text', {})], {}),
      id: kind
    })
  }

  return null
}

/** Creates one of the supported objects or an object kept on the previous path. */
export function createMovementRoutingTarget({
  kind
}: {
  kind: MovementRoutingTargetKind
}): FabricObject {
  const target = createSingleMovementRoutingTarget({ kind })
    ?? createSupportedActiveSelection({ kind })
    ?? createInvalidActiveSelectionState({ kind })
    ?? createUnsupportedActiveSelection({ kind })

  if (!target) {
    throw new Error(`Неизвестный тип объекта для проверки перемещения: ${kind}`)
  }

  return target
}

/** Creates a SnappingManager with an observable previous movement branch. */
export function createMovementRoutingSetup(): MovementRoutingSetup {
  const {
    editor,
    canvas,
    objects
  } = createSnappingTestContext()
  const manager = new SnappingManager({ editor })
  const state: MovementRoutingManagerState = manager as any
  const legacyRouteMock = jest
    .spyOn(state, '_resolveObjectMovementContext')
    .mockReturnValue(null)

  editor.snappingManager = manager

  return Object.freeze({
    canvas,
    legacyRouteMock,
    manager,
    objects,
    state
  })
}
