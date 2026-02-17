import InteractionBlocker from '../../../../src/editor/interaction-blocker'

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
    set: jest.fn()
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
    },
    shapeManager: {
      addRectangle: jest.fn(() => overlayMask)
    }
  }

  const interactionBlocker = new InteractionBlocker({ editor: mockEditor as never })

  return {
    interactionBlocker,
    mockEditor
  }
}

describe('InteractionBlocker', () => {
  beforeEach(() => {
    jest.clearAllMocks()
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
