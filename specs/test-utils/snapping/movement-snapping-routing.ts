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

/** Создаёт один из допустимых или оставленных на прежнем пути объектов. */
export function createMovementRoutingTarget({
  kind
}: {
  kind: MovementRoutingTargetKind
}): FabricObject {
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

  if (kind === 'active-selection') {
    return applyMovementGeometry({ target: new ActiveSelection([], {}), id: kind })
  }

  if (kind === 'text' || kind === 'nested-text') {
    const textbox = applyMovementGeometry({ target: new Textbox('Text', {}), id: kind })
    if (kind === 'nested-text') textbox.group = new Group([], {})

    return textbox
  }

  const cropFrame = applyMovementGeometry({ target: new Rect({}), id: kind })
  Object.assign(cropFrame, {
    cropSource: new Rect({})
  })

  return cropFrame
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
