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

/** Тип объекта в проверке маршрутизации перемещения. */
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
  | 'nested-image'
  | 'nested-shape'
  | 'nested-text'
  | 'shape'
  | 'text'

/** Событие перемещения, которое принимает прежняя ветка SnappingManager. */
type MovementRoutingEvent = BasicTransformEvent<TPointerEvent> & {
  target?: FabricObject | null
  e?: TPointerEvent | null
}

/** Вызов прежней ветки перемещения. */
type LegacyMovementRoute = (input: {
  event: MovementRoutingEvent
}) => unknown

/** Внутренняя часть SnappingManager, которую проверяют точечные тесты маршрутизации. */
export type MovementRoutingManagerState = {
  movementSnappingController: MovementSnappingController
  _resolveObjectMovementContext: LegacyMovementRoute
}

/** SnappingManager и наблюдаемые границы одного сценария маршрутизации. */
export type MovementRoutingSetup = Readonly<{
  canvas: ReturnType<typeof createSnappingTestContext>['canvas']
  legacyRouteMock: jest.SpiedFunction<LegacyMovementRoute>
  manager: SnappingManager
  objects: ReturnType<typeof createSnappingTestContext>['objects']
  state: MovementRoutingManagerState
}>

/** Добавляет объекту полную геометрию, необходимую общему контроллеру перемещения. */
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

/** Создаёт одиночный объект для проверки маршрутизации перемещения. */
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

  if (kind === 'group') {
    return applyMovementGeometry({ target: new Group([], {}), id: kind })
  }

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

/** Создаёт поддерживаемый состав общего выделения. */
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

/** Создаёт некорректное состояние общего выделения для проверки отказа от нового пути. */
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

/** Создаёт неподдерживаемый состав общего выделения. */
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

/** Создаёт один из допустимых или оставленных на прежнем пути объектов. */
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

/** Создаёт SnappingManager с наблюдаемой прежней веткой перемещения. */
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
