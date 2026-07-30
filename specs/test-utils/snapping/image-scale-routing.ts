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

/** Граница входа в прежнюю логику scale, которую проверяет focused spec. */
type LegacyObjectScalingRoute = (input: {
  event: ImageScaleTransformEvent
}) => unknown

/** Часть внутреннего состояния SnappingManager, необходимая routing-тестам Image scale. */
export type ImageScaleRoutingManagerState = {
  activeGuides: GuideLine[]
  activeSpacingGuides: SpacingGuide[]
  anchors: AnchorBuckets
  imageScaleSnappingController: ImageScaleSnappingController
  _resolveObjectScalingTargetContext: LegacyObjectScalingRoute
}

/** SnappingManager, Image-жест и наблюдаемые границы одного routing-сценария. */
export type ImageScaleRoutingSetup = Readonly<{
  canvas: ReturnType<typeof createSnappingTestContext>['canvas']
  image: ImageScaleSnappingHarness
  legacyRouteMock: jest.SpiedFunction<LegacyObjectScalingRoute>
  manager: SnappingManager
  state: ImageScaleRoutingManagerState
}>

/** Создаёт SnappingManager с реальным Image scale-controller за canvas-событиями. */
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
