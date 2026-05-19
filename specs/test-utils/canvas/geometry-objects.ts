import { createCanvasStub } from './canvas-stub'
import { createEditorStub } from '../editor/editor-stub'

export const createPixelGridObject = ({
  left = 0,
  top = 0,
  width = 100,
  height = 100,
  scaleX = 1,
  scaleY = 1,
  strokeWidth = 0,
  strokeUniform = true,
  type = 'Rect'
}: {
  left?: number
  top?: number
  width?: number
  height?: number
  scaleX?: number
  scaleY?: number
  strokeWidth?: number
  strokeUniform?: boolean
  type?: string
} = {}) => {
  const obj: any = {
    left,
    top,
    width,
    height,
    scaleX,
    scaleY,
    strokeWidth,
    strokeUniform,
    type,
    set: jest.fn((props: Record<string, unknown>) => {
      Object.assign(obj, props)
    }),
    setCoords: jest.fn()
  }

  return obj
}

export const createBoundsObject = ({
  left,
  top,
  width,
  height,
  id
}: {
  left: number
  top: number
  width: number
  height: number
  id?: string
}) => {
  const obj: any = {
    left,
    top,
    width,
    height,
    id,
    visible: true,
    set: jest.fn((props: Partial<{ left: number; top: number; width: number; height: number }>) => {
      Object.assign(obj, props)
    }),
    setCoords: jest.fn(),
    getBoundingRect: jest.fn(() => ({
      left: obj.left ?? 0,
      top: obj.top ?? 0,
      width: obj.width ?? 0,
      height: obj.height ?? 0
    }))
  }

  return obj
}

export const createSnappingTestContext = () => {
  const objects: any[] = []

  const selectionContext = {
    save: jest.fn(),
    restore: jest.fn(),
    transform: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    quadraticCurveTo: jest.fn(),
    closePath: jest.fn(),
    stroke: jest.fn(),
    setLineDash: jest.fn(),
    fillText: jest.fn(),
    fill: jest.fn(),
    fillStyle: '',
    font: '',
    textAlign: 'center' as CanvasTextAlign,
    textBaseline: 'middle' as CanvasTextBaseline,
    lineWidth: 0,
    strokeStyle: '',
    measureText: jest.fn(() => ({ width: 10 }))
  }

  const canvas = {
    ...createCanvasStub(),
    requestRenderAll: jest.fn(),
    getZoom: jest.fn().mockReturnValue(1),
    getSelectionContext: jest.fn(() => selectionContext),
    clearContext: jest.fn(),
    contextTop: {},
    forEachObject: jest.fn((cb: (obj: any) => void) => {
      objects.forEach(cb)
    })
  }

  const montageArea = createBoundsObject({
    left: 0,
    top: 0,
    width: 400,
    height: 300,
    id: 'montage-area'
  })

  const editor = {
    ...createEditorStub(),
    canvas,
    montageArea
  }

  return {
    editor,
    canvas,
    objects
  }
}

export const setActiveObjects = (canvas: any, objects: any[]) => {
  canvas.getActiveObjects.mockReturnValue(objects)
  canvas.getActiveObject.mockReturnValue(objects[0] ?? null)
}
