import { Rect, type Canvas, type FabricObject } from 'fabric'

import type { ImageEditor } from '../../../src/editor'
import type { CropSession } from '../../../src/editor/crop-manager/types'
import { CropFrame } from '../../../src/editor/crop-manager/domain/crop-frame'
import CropManager from '../../../src/editor/crop-manager'
import { createEditorStub } from '../editor/editor-stub'
import { createCropScaleHarness } from './scale'

/** Active CropManager with a minimal runtime session. */
type ActiveCropManagerFixture = {
  cropManager: CropManager
  editor: ImageEditor
  session: CropSession
}

/** Creates a minimal crop manager runtime session for unit checks. */
export const createMinimalSession = ({
  preserveAspectRatio = true,
  showDimmedArea = true
}: {
  preserveAspectRatio?: boolean
  showDimmedArea?: boolean
} = {}): CropSession => {
  const source = new Rect({ width: 100, height: 100 })
  const frame = new CropFrame({
    width: 50,
    height: 50,
    showGrid: false,
    preserveAspectRatio
  })

  source.calcTransformMatrix = jest.fn().mockReturnValue([1, 0, 0, 1, 0, 0])
  frame.calcTransformMatrix = jest.fn().mockReturnValue([1, 0, 0, 1, 0, 0])
  frame.on = jest.fn()
  frame.off = jest.fn()

  return {
    mode: 'canvas',
    source,
    target: null,
    frame,
    options: {
      preserveAspectRatio,
      allowFrameOverflow: true,
      showGrid: true,
      cancelOnSelectionClear: true,
      showDimmedArea
    },
    previousActiveObject: null,
    interactivity: [],
    sourceBoundFrameState: null,
    effectivePreserveAspectRatio: preserveAspectRatio
  }
}

/** Sets the initial canvas settings that the crop overlay must restore. */
export const prepareCanvasOverlayState = ({
  canvas,
  overlayImage
}: {
  canvas: Canvas
  overlayImage: FabricObject
}): void => {
  canvas.overlayImage = overlayImage
  canvas.overlayVpt = true
  canvas.controlsAboveOverlay = false
}

/** Creates a CropManager with an active minimal runtime session. */
export const createActiveCropManager = ({
  preserveAspectRatio = true,
  showDimmedArea = true
}: {
  preserveAspectRatio?: boolean
  showDimmedArea?: boolean
} = {}): ActiveCropManagerFixture => {
  const editor = createEditorStub() as ImageEditor
  const cropManager = new CropManager({ editor })
  const session = createMinimalSession({
    preserveAspectRatio,
    showDimmedArea
  })

  cropManager['_session'] = session

  return {
    cropManager,
    editor,
    session
  }
}

/** Creates an active crop with scaling started and the source object temporarily disabled. */
export function createScalingCropManager() {
  const harness = createCropScaleHarness()
  const context = createActiveCropManager({ showDimmedArea: false })
  const { cropManager, editor, session } = context
  const source = harness.frame.cropSource
  if (!source) throw new Error('У crop-жеста должен быть источник')

  harness.canvas.remove = jest.fn(() => [])
  harness.canvas.discardActiveObject = editor.canvas.discardActiveObject
  harness.frame.off = jest.fn(() => harness.frame)
  editor.canvas = harness.canvas
  session.frame = harness.frame
  session.source = source
  session.interactivity = [{ object: source, selectable: true, evented: true }]
  source.set({ selectable: false, evented: false })
  cropManager['_frameInteraction'] = harness.controller
  harness.start()

  return { ...context, ...harness, source }
}
