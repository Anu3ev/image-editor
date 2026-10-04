import SnappingManager from '../../../src/editor/snapping-manager'
import { createMovementSnapEnvironment } from '../../../src/editor/snapping-manager/movement/movement-snap-candidates'
import { CropFrameInteraction } from '../../../src/editor/crop-manager/interaction/crop-frame-interaction'
import { createCropInteractionFrame } from './frame'
import { createCropGestureHarness } from './interaction'

/** Наблюдаемая граница редактора и настоящий расчёт целей перемещения. */
function createSnapping() {
  const snapping: SnappingManager = Object.create(SnappingManager.prototype)
  const capture = jest.fn(() => createMovementSnapEnvironment({
    zoom: 1,
    sources: [{
      id: 'source',
      edgeCategory: 'domain-boundary',
      bounds: { left: -250, right: 250, top: -166.75, bottom: 166.75, centerX: 0, centerY: 0 }
    }]
  }))
  const publish = jest.fn()
  const markHandled = jest.fn()
  snapping.captureMovementSnapEnvironment = capture
  snapping.publishVerifiedMovementGuides = publish
  snapping.markStepHandled = markHandled

  return { snapping, capture, publish, markHandled }
}

/** Собирает crop drag с настоящим resolver и наблюдаемыми мутациями рамки. */
export function createCropMovementHarness({ allowFrameOverflow = false } = {}) {
  const frame = createCropInteractionFrame({ allowFrameOverflow, width: 200, height: 150 })
  const gesture = createCropGestureHarness({ frame, action: 'drag' })
  const environment = createSnapping()
  const controller = new CropFrameInteraction({ canvas: gesture.canvas, frame, snapping: environment.snapping })

  /** Выполняет действие активного drag с новым или повторным native-событием. */
  const step = ({ x, y, event = new MouseEvent('mousemove') }: { x: number; y: number; event?: MouseEvent }) => {
    const action = gesture.transform.actionHandler
    if (!action) throw new Error('Не подключено действие перемещения crop')
    return action(event, gesture.transform, x, y)
  }

  return { frame, controller, step, ...gesture, ...environment }
}
