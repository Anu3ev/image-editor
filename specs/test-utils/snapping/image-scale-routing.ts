import SnappingManager from '../../../src/editor/snapping-manager'
import {
  type ImageScaleSnappingController,
  type ImageScaleTransformEvent
} from '../../../src/editor/snapping-manager/scaling/image-scale-snapping-controller'
import type {
  AnchorBuckets,
  GuideLine,
  SpacingGuide
} from '../../../src/editor/snapping-manager/types'
import { createSnappingTestContext } from '../canvas/geometry-objects'
import {
  createImageScaleSnappingHarness,
  type ImageScaleSnappingHarness
} from './image-scale-snapping-controller'

/** Entry boundary to the previous scaling logic checked by the focused spec. */
type LegacyObjectScalingRoute = (input: {
  event: ImageScaleTransformEvent
}) => unknown

/** Part of SnappingManager's internal state needed by image-scaling routing tests. */
export type ImageScaleRoutingManagerState = {
  activeGuides: GuideLine[]
  activeSpacingGuides: SpacingGuide[]
  anchors: AnchorBuckets
  imageScaleSnappingController: ImageScaleSnappingController
  _resolveObjectScalingTargetContext: LegacyObjectScalingRoute
  _handleInteractionCancelled: (event: Event) => void
}

/** SnappingManager, an image gesture, and observable boundaries for one routing scenario. */
export type ImageScaleRoutingSetup = Readonly<{
  canvas: ReturnType<typeof createSnappingTestContext>['canvas']
  image: ImageScaleSnappingHarness
  legacyRouteMock: jest.SpiedFunction<LegacyObjectScalingRoute>
  manager: SnappingManager
  state: ImageScaleRoutingManagerState
}>

/** Creates a SnappingManager with a real image scale controller behind canvas events. */
export function createImageScaleRoutingSetup(): ImageScaleRoutingSetup {
  const {
    editor,
    canvas,
    objects
  } = createSnappingTestContext()
  const image = createImageScaleSnappingHarness()
  const manager = new SnappingManager({ editor })
  const state: ImageScaleRoutingManagerState = manager as any

  editor.snappingManager = manager
  canvas.altActionKey = 'shiftKey'
  canvas.uniScaleKey = 'shiftKey'
  canvas.uniformScaling = false
  image.target.canvas = canvas
  objects.push(image.target)

  const legacyRouteMock = jest.spyOn(state, '_resolveObjectScalingTargetContext')

  return Object.freeze({
    canvas,
    image,
    legacyRouteMock,
    manager,
    state
  })
}
