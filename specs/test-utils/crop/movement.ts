import { ImageEditor } from '../../../src/editor'
import { english } from '../../../src/editor/i18n'
import SnappingManager from '../../../src/editor/snapping-manager'
import { createMovementSnapEnvironment } from '../../../src/editor/snapping-manager/movement/movement-snap-candidates'
import { CropFrameInteraction } from '../../../src/editor/crop-manager/interaction/crop-frame-interaction'
import { createCropInteractionFrame } from './frame'
import { createCropGestureHarness } from './interaction'

/** Observable editor boundary and real movement-target calculation. */
function createSnapping() {
  const snapping: SnappingManager = Object.create(SnappingManager.prototype)
  snapping.editor = Object.assign(Object.create(ImageEditor.prototype), { t: english })
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

/** Builds a crop drag with a real resolver and observable frame mutations. */
export function createCropMovementHarness({ allowFrameOverflow = false } = {}) {
  const frame = createCropInteractionFrame({ allowFrameOverflow, width: 200, height: 150 })
  const gesture = createCropGestureHarness({ frame, action: 'drag' })
  const environment = createSnapping()
  const controller = new CropFrameInteraction({ canvas: gesture.canvas, frame, snapping: environment.snapping })

  /** Performs the active drag action with a new or repeated native event. */
  const step = ({ x, y, event = new MouseEvent('mousemove') }: { x: number; y: number; event?: MouseEvent }) => {
    const action = gesture.transform.actionHandler
    if (!action) throw new Error('Не подключено действие перемещения crop')
    return action(event, gesture.transform, x, y)
  }

  return { frame, controller, step, ...gesture, ...environment }
}
