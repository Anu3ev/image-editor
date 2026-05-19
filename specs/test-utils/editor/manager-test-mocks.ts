import { createMockContainer } from './dom-container'
import { createEditorStub, createCanvasManagerTestStub } from './editor-stub'
import { createCanvasStub } from '../canvas/canvas-stub'
import { createLayerAwareCanvasMock } from '../canvas/layer-aware-canvas'

export const createManagerTestMocks = (containerWidth = 800, containerHeight = 600, options: { withLayerAwareCanvas?: boolean } = {}) => {
  const mockContainer = createMockContainer(containerWidth, containerHeight)

  const mockMontageArea = {
    width: 400,
    height: 300,
    left: 100,
    top: 50,
    set: jest.fn((updates: Record<string, unknown>) => {
      Object.assign(mockMontageArea, updates)
    }),
    setCoords: jest.fn(),
    getBoundingRect: jest.fn().mockReturnValue({
      left: 100,
      top: 50,
      width: 400,
      height: 300
    }),
    id: 'montage-area'
  }

  const baseCanvas = options.withLayerAwareCanvas
    ? createLayerAwareCanvasMock()
    : createCanvasStub()

  const mockCanvas = {
    ...baseCanvas,
    editorContainer: mockContainer,
    wrapperEl: {
      parentNode: mockContainer,
      style: {},
      appendChild: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      getBoundingClientRect: jest.fn().mockReturnValue({
        left: 0,
        top: 0,
        width: containerWidth,
        height: containerHeight
      })
    }
  }

  const mockEditor = {
    ...createEditorStub(),
    canvas: mockCanvas,
    montageArea: mockMontageArea,
    options: {
      ...createEditorStub().options,
      editorContainer: mockContainer
    }
  }

  mockEditor.canvasManager = createCanvasManagerTestStub({
    canvas: mockCanvas,
    montageArea: mockMontageArea,
    getObjects: () => mockCanvas.getObjects()
  })

  return {
    mockContainer,
    mockMontageArea,
    mockCanvas,
    mockEditor
  }
}
