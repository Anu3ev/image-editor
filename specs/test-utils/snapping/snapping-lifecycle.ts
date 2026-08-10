import { ActiveSelection } from 'fabric'
import SnappingManager from '../../../src/editor/snapping-manager'
import type {
  AnchorBuckets,
  GuideLine,
  SpacingGuide
} from '../../../src/editor/snapping-manager/types'
import { createBoundsObject, createSnappingTestContext } from '../canvas/geometry-objects'
import { createMovementRoutingTarget } from './movement-snapping-routing'

/** Доступная тестам часть временного состояния SnappingManager. */
type SnappingManagerLifecycleState = {
  activeGuides: GuideLine[]
  activeSpacingGuides: SpacingGuide[]
  anchors: AnchorBuckets
  movementSnappingController: {
    startGesture: ({ target }: { target?: object | null }) => void
    finishGesture: () => void
    finishGestureForTarget: ({ target }: { target: object }) => boolean
  }
}

/** Направляющие и опорные точки, используемые в сценариях завершения прилипания. */
export type VisibleSnappingState = {
  activeGuides: GuideLine[]
  activeSpacingGuides: SpacingGuide[]
  anchors: AnchorBuckets
}

/**
 * Создаёт SnappingManager и перехватывает вызовы завершения перемещения.
 */
export const createMovementSnappingLifecycleSetup = () => {
  const { editor, canvas } = createSnappingTestContext()
  const manager = new SnappingManager({ editor })
  const state: SnappingManagerLifecycleState = manager as any
  const startGestureMock = jest
    .spyOn(state.movementSnappingController, 'startGesture')
    .mockImplementation(() => undefined)
  const finishGestureMock = jest.spyOn(state.movementSnappingController, 'finishGesture')
  const activeTarget = createBoundsObject({
    left: 100,
    top: 80,
    width: 40,
    height: 30,
    id: 'active-object'
  })
  const finishGestureForTargetMock = jest
    .spyOn(state.movementSnappingController, 'finishGestureForTarget')
    .mockImplementation(({ target }) => target === activeTarget)

  return {
    manager,
    canvas,
    state,
    activeTarget,
    startGestureMock,
    finishGestureMock,
    finishGestureForTargetMock
  }
}

/** Создаёт реальную сессию перемещения общего выделения для проверки завершающих событий. */
export const createActiveSelectionMovementLifecycleSetup = () => {
  const { editor, canvas, objects } = createSnappingTestContext()
  const manager = new SnappingManager({ editor })
  const state: SnappingManagerLifecycleState = manager as any
  const activeTarget = createMovementRoutingTarget({ kind: 'active-selection' })
  if (!(activeTarget instanceof ActiveSelection)) {
    throw new Error('Для проверки завершения нужен ActiveSelection')
  }

  activeTarget.canvas = canvas
  objects.push(activeTarget)
  editor.snappingManager = manager

  return {
    activeTarget,
    canvas,
    children: activeTarget.getObjects(),
    manager,
    state
  }
}

/** Заполняет направляющие и опорные точки, которые должны очищаться при завершении. */
export const seedVisibleSnappingState = ({
  state
}: {
  state: VisibleSnappingState
}): void => {
  state.activeGuides = [{
    type: 'vertical',
    position: 100
  }]
  state.activeSpacingGuides = [{
    type: 'horizontal',
    axis: 100,
    refStart: 10,
    refEnd: 20,
    activeStart: 30,
    activeEnd: 40,
    distance: 10
  }]
  state.anchors = {
    vertical: [100],
    horizontal: [80]
  }
}
