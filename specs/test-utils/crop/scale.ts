import SnappingManager from '../../../src/editor/snapping-manager'
import { createScaleSnapCandidates } from '../../../src/editor/snapping-manager/scaling/scale-snap-candidates'
import { CropFrameInteraction } from '../../../src/editor/crop-manager/interaction/crop-frame-interaction'
import { createCropInteractionFrame } from './frame'
import { createCropGestureHarness } from './interaction'

/** Creates an observable environment for the shared crop-scaling resolver. */
function createSnapping() {
  const snapping: SnappingManager = Object.create(SnappingManager.prototype)
  const capture: jest.MockedFunction<SnappingManager['captureScaleSnapEnvironment']> = jest.fn(({ targetEdges }) => ({
    zoom: 1,
    candidates: createScaleSnapCandidates({
      targetEdges,
      sources: [{
        id: 'source',
        edgeCategory: 'domain-boundary',
        bounds: { left: -250, right: 250, top: -166.75, bottom: 166.75, centerX: 0, centerY: 0 }
      }]
    })
  }))
  const publish = jest.fn()
  const markHandled = jest.fn()
  snapping.captureScaleSnapEnvironment = capture
  snapping.publishVerifiedScaleGuides = publish
  snapping.markStepHandled = markHandled

  return { snapping, capture, publish, markHandled }
}

/** Builds the crop-scaling owner with a real resolver and an observable Fabric boundary. */
export function createCropScaleHarness({ allowFrameOverflow = false } = {}) {
  const frame = createCropInteractionFrame({ allowFrameOverflow })
  const gesture = createCropGestureHarness({ frame, action: 'scale' })
  const environment = createSnapping()
  const originalControls = frame.controls
  const controller = new CropFrameInteraction({ canvas: gesture.canvas, frame, snapping: environment.snapping })

  /** Invokes the handle action with a new or redelivered native event. */
  const step = ({ x, y, event = new MouseEvent('mousemove') }: { x: number; y: number; event?: MouseEvent }) => {
    const action = frame.controls.tr.actionHandler
    if (!action) throw new Error('Нет обработчика правой верхней ручки crop')
    return action(event, gesture.transform, x, y)
  }

  return { frame, controller, originalControls, step, ...gesture, ...environment }
}
