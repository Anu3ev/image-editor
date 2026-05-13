import { Rect } from 'fabric'
import InteractionBlocker from '../../../../src/editor/interaction-blocker'
import { addRectangleToCanvas } from '../../../../src/editor/utils/primitive-shapes'

export const addRectangleToCanvasMock = addRectangleToCanvas as jest.MockedFunction<typeof addRectangleToCanvas>

export type MockCanvasObject = {
  evented: boolean
  selectable: boolean
}

export type InteractionBlockerTestSetup = {
  canvasObjects: MockCanvasObject[]
  interactionBlocker: InteractionBlocker
  mockEditor: {
    canvas: {
      add: jest.Mock
      discardActiveObject: jest.Mock
      fire: jest.Mock
      lowerCanvasEl: { style: Record<string, string> }
      remove: jest.Mock
      requestRenderAll: jest.Mock
      selection: boolean
      skipTargetFind: boolean
      upperCanvasEl: { style: Record<string, string> }
    }
    canvasManager: {
      getMontageAreaSceneBounds: jest.Mock
      getObjects: jest.Mock<MockCanvasObject[], []>
    }
    historyManager: {
      flushDeferredSaveAfterUnblock: jest.Mock
      resumeHistory: jest.Mock
      suspendHistory: jest.Mock
    }
    layerManager: {
      bringToFront: jest.Mock
    }
    montageArea: {
      getBoundingRect: jest.Mock
      setCoords: jest.Mock
    }
    options: {
      overlayMaskColor: string
    }
  }
  overlayMask: Rect
}

export type AnimationFrameTestMocks = {
  cancelAnimationFrameMock: jest.Mock<void, [number]>
  requestAnimationFrameMock: jest.Mock<number, [FrameRequestCallback]>
  restore: () => void
}

const createOverlayMask = (): Rect => {
  const overlayMask = new Rect({ visible: false })

  overlayMask.id = 'overlay-mask'
  jest.spyOn(overlayMask, 'set')
  jest.spyOn(overlayMask, 'setCoords')

  return overlayMask
}

export const createInteractionBlockerTestSetup = ({
  withOverlay = true
}: {
  withOverlay?: boolean
} = {}): InteractionBlockerTestSetup => {
  const canvasObjects: MockCanvasObject[] = [
    { evented: true, selectable: true },
    { evented: true, selectable: true }
  ]

  const overlayMask = createOverlayMask()
  const mockEditor: InteractionBlockerTestSetup['mockEditor'] = {
    canvas: {
      add: jest.fn(),
      discardActiveObject: jest.fn(),
      fire: jest.fn(),
      lowerCanvasEl: { style: {} },
      remove: jest.fn(),
      requestRenderAll: jest.fn(),
      selection: true,
      skipTargetFind: false,
      upperCanvasEl: { style: {} }
    },
    canvasManager: {
      getMontageAreaSceneBounds: jest.fn(() => ({
        left: 0,
        top: 0,
        right: 400,
        bottom: 300,
        width: 400,
        height: 300,
        center: {
          x: 200,
          y: 150
        }
      })),
      getObjects: jest.fn(() => canvasObjects)
    },
    historyManager: {
      flushDeferredSaveAfterUnblock: jest.fn(),
      resumeHistory: jest.fn(),
      suspendHistory: jest.fn()
    },
    layerManager: {
      bringToFront: jest.fn()
    },
    montageArea: {
      getBoundingRect: jest.fn(() => ({
        left: 100,
        top: 50,
        width: 400,
        height: 300
      })),
      setCoords: jest.fn()
    },
    options: {
      overlayMaskColor: 'rgba(0,0,0,0.5)'
    }
  }

  addRectangleToCanvasMock.mockReturnValue(overlayMask)

  const interactionBlocker = new InteractionBlocker({ editor: mockEditor as never })

  if (withOverlay) {
    interactionBlocker.overlayMask = overlayMask
  }

  return {
    canvasObjects,
    interactionBlocker,
    mockEditor,
    overlayMask
  }
}

export const mockAnimationFrame = (): AnimationFrameTestMocks => {
  const requestAnimationFrame = window.requestAnimationFrame
  const cancelAnimationFrame = window.cancelAnimationFrame
  const requestAnimationFrameMock = jest.fn<number, [FrameRequestCallback]>(() => 42)
  const cancelAnimationFrameMock = jest.fn<void, [number]>()

  window.requestAnimationFrame = requestAnimationFrameMock
  window.cancelAnimationFrame = cancelAnimationFrameMock

  return {
    requestAnimationFrameMock,
    cancelAnimationFrameMock,
    restore: () => {
      window.requestAnimationFrame = requestAnimationFrame
      window.cancelAnimationFrame = cancelAnimationFrame
    }
  }
}
