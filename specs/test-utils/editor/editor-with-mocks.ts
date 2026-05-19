import { CanvasOptions } from 'fabric'
import { ImageEditor } from '../../../src/editor'
import { createFullOptions } from './options'

export const createEditorWithMocks = (options: Partial<CanvasOptions> = {}) => {
  const fullOptions = createFullOptions(options)

  const initSpy = jest.spyOn(ImageEditor.prototype, 'init').mockImplementation()
  const editor = new ImageEditor('test-canvas', fullOptions)
  initSpy.mockRestore()

  editor.canvasManager = {
    setEditorContainerWidth: jest.fn(),
    setEditorContainerHeight: jest.fn(),
    setCanvasWrapperWidth: jest.fn(),
    setCanvasWrapperHeight: jest.fn(),
    setCanvasCSSWidth: jest.fn(),
    setCanvasCSSHeight: jest.fn(),
    setDefaultScale: jest.fn()
  } as any

  editor.imageManager = {
    importImage: jest.fn().mockResolvedValue(undefined),
    prepareInitialState: jest.fn().mockImplementation(async({ state }) => state),
    calculateScaleFactor: jest.fn().mockReturnValue(1)
  } as any

  editor.historyManager = {
    loadStateFromFullState: jest.fn(),
    saveState: jest.fn(),
    suspendHistory: jest.fn(),
    resumeHistory: jest.fn()
  } as any

  editor.backgroundManager = {
    backgroundObject: null,
    refresh: jest.fn()
  } as any

  editor.shapeManager = {
    addRectangle: jest.fn(),
    commitRehydratedShapeLayout: jest.fn()
  } as any

  editor.panConstraintManager = {
    updateBounds: jest.fn(),
    getPanBounds: jest.fn().mockReturnValue({ minX: 0, maxX: 0, minY: 0, maxY: 0, canPan: true }),
    isPanAllowed: jest.fn().mockReturnValue(true),
    constrainPan: jest.fn((x, y) => ({ x, y })),
    getCurrentOffset: jest.fn().mockReturnValue({ x: 0, y: 0 })
  } as any

  editor.zoomManager = {
    calculateAndApplyDefaultZoom: jest.fn(),
    resetZoom: jest.fn(),
    setZoom: jest.fn(),
    zoom: jest.fn(),
    defaultZoom: 0.8,
    minZoom: 0.1,
    maxZoom: 2
  } as any;

  (editor as any)['_createMontageArea'] = jest.fn();
  (editor as any)['_createClippingArea'] = jest.fn()

  return editor
}
