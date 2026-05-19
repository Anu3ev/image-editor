import HistoryManager from '../../../src/editor/history-manager'
import { createSimpleDiffPatcher } from '../shared/diff-patcher'

export type HistoryManagerTestSetupOptions = {
  maxHistoryLength?: number
  initialCanvasWidth?: number
  initialCanvasHeight?: number
}

export const createHistoryManagerTestSetup = (
  options: HistoryManagerTestSetupOptions = {}
) => {
  const {
    maxHistoryLength = 5,
    initialCanvasWidth = 800,
    initialCanvasHeight = 600
  } = options

  let currentWidth = initialCanvasWidth
  let currentHeight = initialCanvasHeight
  let objects: any[] = []

  const mockCanvas = {
    toDatalessObject: jest.fn().mockImplementation(() => ({
      clipPath: null,
      width: currentWidth,
      height: currentHeight,
      version: '5.0.0',
      objects: JSON.parse(JSON.stringify(objects))
    })),
    loadFromJSON: jest.fn().mockImplementation(
      async(state: any, reviver?: (serializedObj: any, fabricObject: any) => void) => {
        const serializedObjects = state?.objects || []
        objects = serializedObjects.map((serializedObj: any) => {
          const fabricObject = { ...serializedObj }
          if (reviver) {
            reviver(serializedObj, fabricObject)
          }
          return fabricObject
        })

        if (typeof state?.width === 'number') {
          currentWidth = state.width
        }
        if (typeof state?.height === 'number') {
          currentHeight = state.height
        }
      }
    ),
    getObjects: jest.fn(() => objects),
    add: jest.fn((obj: any) => {
      objects = [...objects, obj]
    }),
    getWidth: jest.fn(() => currentWidth),
    getHeight: jest.fn(() => currentHeight),
    fire: jest.fn(),
    renderAll: jest.fn(),
    requestRenderAll: jest.fn(),
    enableRetinaScaling: false,
    viewportTransform: [1, 0, 0, 1, 0, 0] as any
  } as any

  Object.defineProperty(mockCanvas, 'width', {
    get: () => currentWidth,
    configurable: true
  })

  Object.defineProperty(mockCanvas, 'height', {
    get: () => currentHeight,
    configurable: true
  })

  const mockEditor = {
    canvas: mockCanvas,
    canvasManager: {
      updateCanvas: jest.fn(),
      placeMontageAreaAtCanonicalScenePosition: jest.fn(),
      refreshMontageDerivedState: jest.fn(),
      centerViewportToMontageArea: jest.fn()
    },
    interactionBlocker: {
      overlayMask: { id: 'overlay-mask', visible: true } as any,
      refresh: jest.fn(),
      ensureOverlay: jest.fn().mockImplementation(() => {
        mockEditor.interactionBlocker.overlayMask = {
          id: 'overlay-mask',
          visible: false
        }
      })
    },
    backgroundManager: {
      removeBackground: jest.fn(),
      backgroundObject: null,
      refresh: jest.fn()
    },
    zoomManager: {
      calculateAndApplyDefaultZoom: jest.fn(),
      updateDefaultZoom: jest.fn()
    },
    panConstraintManager: {
      updateBounds: jest.fn()
    },
    montageArea: {
      id: 'montage-area',
      width: 400,
      height: 300
    } as any,
    errorManager: {
      emitError: jest.fn()
    },
    textManager: {
      commitStandaloneTextScale: jest.fn()
    },
    shapeManager: {
      commitRehydratedShapeLayout: jest.fn()
    },
    options: {
      maxHistoryLength
    }
  } as any

  const historyManager = new HistoryManager({ editor: mockEditor as any })
  const simpleDiffPatcher = createSimpleDiffPatcher()

  historyManager.diffPatcher = simpleDiffPatcher as any

  return {
    historyManager,
    mockEditor,
    mockCanvas,
    getCanvasObjects: () => objects,
    setCanvasObjects: (nextObjects: any[]) => {
      objects = nextObjects
    },
    setCanvasSize: (width: number, height: number) => {
      currentWidth = width
      currentHeight = height
    }
  }
}
