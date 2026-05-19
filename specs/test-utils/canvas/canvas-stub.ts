import type { AnyFn } from '../shared/types'

const createCanvasElementBoundsMock = () => jest.fn().mockReturnValue({
  left: 0,
  top: 0,
  width: 800,
  height: 600
})

const createCanvasWrapperStub = () => ({
  parentNode: null as HTMLElement | null,
  style: {},
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  getBoundingClientRect: createCanvasElementBoundsMock()
})

const createUpperCanvasElementStub = () => ({
  style: {},
  getBoundingClientRect: createCanvasElementBoundsMock()
})

export const createCanvasStub = () => {
  const handlers: Record<string, AnyFn[]> = {}
  const clipPath = {
    left: 100,
    top: 50,
    width: 400,
    height: 300,
    set: jest.fn((updates: Record<string, unknown>) => {
      Object.assign(clipPath, updates)
    }),
    setCoords: jest.fn()
  }
  const canvas = {
    on: jest.fn((evt: string, fn: AnyFn) => {
      handlers[evt] = handlers[evt] || []
      handlers[evt].push(fn)
    }),
    off: jest.fn((evt: string, fn: AnyFn) => {
      if (!handlers[evt]) return
      handlers[evt] = handlers[evt].filter((h) => h !== fn)
    }),
    set: jest.fn(),
    setCursor: jest.fn(),
    requestRenderAll: jest.fn(),
    setViewportTransform: jest.fn(),
    discardActiveObject: jest.fn(),
    getActiveObject: jest.fn(),
    getActiveObjects: jest.fn().mockReturnValue([]),
    setActiveObject: jest.fn(),
    viewportTransform: [1, 0, 0, 1, 0, 0] as any,
    getWidth: jest.fn().mockReturnValue(800),
    getHeight: jest.fn().mockReturnValue(600),
    getZoom: jest.fn().mockReturnValue(1),
    setDimensions: jest.fn(),
    fire: jest.fn(),
    renderAll: jest.fn(),
    centerObject: jest.fn(),
    zoomToPoint: jest.fn(),
    getCenterPoint: jest.fn().mockReturnValue({ x: 400, y: 300 }),
    getPointer: jest.fn().mockReturnValue({ x: 0, y: 0 }),
    getViewportPoint: jest.fn().mockReturnValue({ x: 0, y: 0 }),
    clear: jest.fn(),
    add: jest.fn(),
    remove: jest.fn(),
    getObjects: jest.fn().mockReturnValue([]),
    clipPath,
    editorContainer: null as HTMLElement | null,
    wrapperEl: createCanvasWrapperStub(),
    lowerCanvasEl: { style: {} },
    upperCanvasEl: createUpperCanvasElementStub(),
    __handlers: handlers
  }
  return canvas as any
}
