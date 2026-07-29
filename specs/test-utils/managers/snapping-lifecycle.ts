import SnappingManager from '../../../src/editor/snapping-manager'
import type {
  AnchorBuckets,
  GuideLine,
  SpacingGuide
} from '../../../src/editor/snapping-manager/types'
import { createBoundsObject, createSnappingTestContext } from '../canvas/geometry-objects'

/** Доступная тестам часть transient-состояния SnappingManager. */
type SnappingManagerLifecycleState = {
  activeGuides: GuideLine[]
  activeSpacingGuides: SpacingGuide[]
  anchors: AnchorBuckets
  activeMovementSnappingTarget: object | null
  movementSnappingController: {
    startGesture: ({ target }: { target?: object | null }) => boolean
    finishGesture: () => void
  }
}

/**
 * Создаёт SnappingManager и явные spy для проверки terminal lifecycle movement-сессии.
 */
export const createMovementSnappingLifecycleSetup = () => {
  const { editor, canvas } = createSnappingTestContext()
  const manager = new SnappingManager({ editor })
  const state: SnappingManagerLifecycleState = manager as any
  const startGestureMock = jest
    .spyOn(state.movementSnappingController, 'startGesture')
    .mockReturnValue(true)
  const finishGestureMock = jest.spyOn(state.movementSnappingController, 'finishGesture')
  const activeTarget = createBoundsObject({
    left: 100,
    top: 80,
    width: 40,
    height: 30,
    id: 'active-image'
  })

  return {
    manager,
    canvas,
    state,
    activeTarget,
    startGestureMock,
    finishGestureMock
  }
}

/** Добавляет видимые guide и anchors, которые обязан очистить terminal event. */
export const seedVisibleSnappingState = ({
  state
}: {
  state: SnappingManagerLifecycleState
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
