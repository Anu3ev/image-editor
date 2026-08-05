import { emitCanvasEvent } from '../../../../test-utils/canvas/events'
import {
  createMovementRoutingSetup,
  createMovementRoutingTarget,
  type MovementRoutingSetup,
  type MovementRoutingTargetKind
} from '../../../../test-utils/snapping/movement-snapping-routing'

/** Типы объектов, для которых уже используется унифицированный расчёт перемещения. */
const UNIFIED_MOVEMENT_TARGETS = [
  { kind: 'image', label: 'изображения' },
  { kind: 'shape', label: 'шейпа' }
] satisfies ReadonlyArray<{
  kind: MovementRoutingTargetKind
  label: string
}>

/** Типы объектов, которые пока используют прежнюю логику перемещения. */
const LEGACY_MOVEMENT_TARGETS = [
  { kind: 'active-selection', label: 'выделения нескольких объектов' },
  { kind: 'crop-frame', label: 'кроп-области' },
  { kind: 'group', label: 'обычной группы объектов' },
  { kind: 'nested-image', label: 'вложенного изображения' },
  { kind: 'nested-shape', label: 'вложенного шейпа' },
  { kind: 'text', label: 'отдельного текста' }
] satisfies ReadonlyArray<{
  kind: MovementRoutingTargetKind
  label: string
}>

let setup: MovementRoutingSetup

beforeEach(() => {
  setup = createMovementRoutingSetup()
})

afterEach(() => {
  setup.manager.destroy()
  jest.restoreAllMocks()
})

it.each(UNIFIED_MOVEMENT_TARGETS)('для $label используется унифицированный расчёт перемещения', ({ kind }) => {
  const target = createMovementRoutingTarget({ kind })
  target.canvas = setup.canvas
  setup.objects.push(target)

  const movementStepMock = jest.spyOn(
    setup.state.movementSnappingController,
    'handleObjectMoving'
  )

  emitCanvasEvent({
    canvas: setup.canvas,
    event: 'mouse:down',
    payload: {
      target,
      transform: { action: 'drag' }
    }
  })
  target.set({ left: 112, top: 93 })

  const movementEvent = {
    target,
    e: new MouseEvent('mousemove'),
    transform: { action: 'drag' }
  }
  emitCanvasEvent({
    canvas: setup.canvas,
    event: 'object:moving',
    payload: movementEvent
  })

  expect(movementStepMock).toHaveReturnedWith(expect.objectContaining({ handled: true }))
  expect(setup.legacyRouteMock).not.toHaveBeenCalled()
  expect(target.left).toBe(112)
  expect(target.top).toBe(93)
})

it.each(LEGACY_MOVEMENT_TARGETS)('для $label сохраняется прежний расчёт перемещения', ({ kind }) => {
  const target = createMovementRoutingTarget({ kind })
  target.canvas = setup.canvas
  setup.objects.push(target)

  const movementStepMock = jest.spyOn(
    setup.state.movementSnappingController,
    'handleObjectMoving'
  )

  emitCanvasEvent({
    canvas: setup.canvas,
    event: 'mouse:down',
    payload: {
      target,
      transform: { action: 'drag' }
    }
  })

  const movementEvent = {
    target,
    e: new MouseEvent('mousemove'),
    transform: { action: 'drag' }
  }
  emitCanvasEvent({
    canvas: setup.canvas,
    event: 'object:moving',
    payload: movementEvent
  })

  expect(movementStepMock).toHaveReturnedWith({ handled: false })
  expect(setup.legacyRouteMock).toHaveBeenCalledTimes(1)
  expect(setup.legacyRouteMock).toHaveBeenCalledWith({ event: movementEvent })
})

it.each(UNIFIED_MOVEMENT_TARGETS)('без активного перетаскивания для $label сохраняется прежний расчёт', ({ kind }) => {
  const target = createMovementRoutingTarget({ kind })
  target.canvas = setup.canvas
  setup.objects.push(target)

  const movementStepMock = jest.spyOn(
    setup.state.movementSnappingController,
    'handleObjectMoving'
  )
  const movementEvent = {
    target,
    e: new MouseEvent('mousemove'),
    transform: { action: 'drag' }
  }

  emitCanvasEvent({
    canvas: setup.canvas,
    event: 'object:moving',
    payload: movementEvent
  })

  expect(movementStepMock).toHaveReturnedWith({ handled: false })
  expect(setup.legacyRouteMock).toHaveBeenCalledTimes(1)
  expect(setup.legacyRouteMock).toHaveBeenCalledWith({ event: movementEvent })
})

it('контроллер завершает только перемещение активного объекта', () => {
  const target = createMovementRoutingTarget({ kind: 'shape' })
  const otherTarget = createMovementRoutingTarget({ kind: 'image' })
  target.canvas = setup.canvas
  setup.objects.push(target, otherTarget)

  emitCanvasEvent({
    canvas: setup.canvas,
    event: 'mouse:down',
    payload: {
      target,
      transform: { action: 'drag' }
    }
  })

  const controller = setup.state.movementSnappingController

  expect(controller.finishGestureForTarget({ target: otherTarget })).toBe(false)
  expect(controller.finishGestureForTarget({ target })).toBe(true)
  expect(controller.finishGestureForTarget({ target })).toBe(false)
})
