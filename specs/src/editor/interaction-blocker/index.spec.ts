import InteractionBlocker from '../../../../src/editor/interaction-blocker'
import { addRectangleToCanvas } from '../../../../src/editor/utils/primitive-shapes'

jest.mock('../../../../src/editor/utils/primitive-shapes', () => ({
  addRectangleToCanvas: jest.fn()
}))

const addRectangleToCanvasMock = addRectangleToCanvas as jest.Mock

type InteractionBlockerTestSetup = {
  interactionBlocker: InteractionBlocker
  mockEditor: {
    canvas: {
      discardActiveObject: jest.Mock
      fire: jest.Mock
      lowerCanvasEl: { style: Record<string, string> }
      requestRenderAll: jest.Mock
      selection: boolean
      skipTargetFind: boolean
      upperCanvasEl: { style: Record<string, string> }
    }
    canvasManager: {
      getMontageAreaSceneBounds: jest.Mock
      getObjects: jest.Mock
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
    shapeManager: {
      addRectangle: jest.Mock
    }
  }
}

/**
 * Создаёт окружение для тестов interaction blocker.
 */
const createInteractionBlockerTestSetup = (): InteractionBlockerTestSetup => {
  const canvasObjects = [
    { evented: true, selectable: true },
    { evented: true, selectable: true }
  ]

  const overlayMask = {
    id: 'overlay-mask',
    visible: false,
    set: jest.fn(),
    setCoords: jest.fn()
  }

  const mockEditor = {
    canvas: {
      discardActiveObject: jest.fn(),
      fire: jest.fn(),
      lowerCanvasEl: { style: {} },
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
  interactionBlocker.overlayMask = overlayMask as never

  return {
    interactionBlocker,
    mockEditor
  }
}

describe('InteractionBlocker', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('объект overlay повторяет размеры и позицию монтажной области', () => {
    const { interactionBlocker } = createInteractionBlockerTestSetup()

    interactionBlocker.ensureOverlay()

    expect(interactionBlocker.overlayMask?.set).toHaveBeenCalledWith(expect.objectContaining({
      width: 400,
      height: 300,
      left: 200,
      top: 150,
      originX: 'center',
      originY: 'center',
      scaleX: 1,
      scaleY: 1,
      angle: 0,
      flipX: false,
      flipY: false
    }))
    expect(interactionBlocker.overlayMask?.visible).toBe(false)
    expect(interactionBlocker.overlayMask?.setCoords).toHaveBeenCalled()
  })

  it('при блокировке редактора объект overlay появляется поверх монтажной области и отключает интерактивность', () => {
    const { interactionBlocker, mockEditor } = createInteractionBlockerTestSetup()

    interactionBlocker.block()

    expect(interactionBlocker.isBlocked).toBe(true)
    expect(interactionBlocker.overlayMask?.visible).toBe(true)
    expect(mockEditor.canvas.selection).toBe(false)
    expect(mockEditor.canvas.skipTargetFind).toBe(true)
    expect(mockEditor.canvas.upperCanvasEl.style.pointerEvents).toBe('none')
    expect(mockEditor.canvas.lowerCanvasEl.style.pointerEvents).toBe('none')
    expect(mockEditor.canvasManager.getObjects().every((object) => !object.evented && !object.selectable)).toBe(true)
    expect(mockEditor.layerManager.bringToFront).toHaveBeenCalledWith(interactionBlocker.overlayMask, { withoutSave: true })
  })

  it('вызывает flushDeferredSaveAfterUnblock после unblock', () => {
    const { interactionBlocker, mockEditor } = createInteractionBlockerTestSetup()
    jest.clearAllMocks()

    interactionBlocker.isBlocked = true
    interactionBlocker.unblock()

    expect(mockEditor.historyManager.suspendHistory).toHaveBeenCalledTimes(1)
    expect(mockEditor.historyManager.resumeHistory).toHaveBeenCalledTimes(1)
    expect(mockEditor.historyManager.flushDeferredSaveAfterUnblock).toHaveBeenCalledTimes(1)
  })

  it('не вызывает flushDeferredSaveAfterUnblock если unblock не выполнился', () => {
    const { interactionBlocker, mockEditor } = createInteractionBlockerTestSetup()

    interactionBlocker.unblock()

    expect(mockEditor.historyManager.flushDeferredSaveAfterUnblock).not.toHaveBeenCalled()
  })
})
