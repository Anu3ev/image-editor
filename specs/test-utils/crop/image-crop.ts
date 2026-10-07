import {
  FabricImage,
  Point,
  Rect
} from 'fabric'

import type { ImageEditor } from '../../../src/editor'
import { createEditorStub } from '../editor/editor-stub'

/** Horizontal origin supported by FabricImage in image crop unit tests. */
type CropOriginX = 'left' | 'center' | 'right'

/** Vertical origin supported by FabricImage in image crop unit tests. */
type CropOriginY = 'top' | 'center' | 'bottom'

/**
 * Image target with the runtime methods used by image crop mutation.
 */
export type CropImageTarget = FabricImage & {
  width: number
  height: number
  cropX: number
  cropY: number
  left: number
  top: number
  element: HTMLCanvasElement
  originX?: CropOriginX
  originY?: CropOriginY
  canvas: ImageEditor['canvas']
  setElement: jest.Mock
  setCoords: jest.Mock
  setPositionByOrigin: jest.Mock<void, [Point, CropOriginX, CropOriginY]>
}

/**
 * Frame with the minimal contract required to position the crop result.
 */
export type CropFrameStub = Rect & {
  getCenterPoint: () => Point
}

/**
 * Canvas context from the shared jest setup with a mock drawImage function.
 */
export type CropCanvasContext = CanvasRenderingContext2D & {
  beginPath: jest.Mock
  drawImage: jest.Mock
  lineTo: jest.Mock
  moveTo: jest.Mock
  restore: jest.Mock
  save: jest.Mock
  setLineDash: jest.Mock
  stroke: jest.Mock
}

/**
 * Returns the shared mock 2D context from the jest setup.
 */
export function getCropCanvasContext(): CropCanvasContext {
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('2d canvas context должен существовать в unit-тестах image crop')
  }

  return context as CropCanvasContext
}

/**
 * Resets mock calls on the canvas context reused by the jest setup.
 */
export function resetCropCanvasContext(): CropCanvasContext {
  const context = getCropCanvasContext()

  context.beginPath.mockClear()
  context.drawImage.mockClear()
  context.lineTo.mockClear()
  context.moveTo.mockClear()
  context.restore.mockClear()
  context.save.mockClear()
  context.setLineDash.mockClear()
  context.stroke.mockClear()

  return context
}

/**
 * Creates an image source for crop mutation unit tests.
 */
export function createCropImageSource({
  width,
  height
}: {
  width: number
  height: number
}): HTMLCanvasElement {
  const source = document.createElement('canvas')

  source.width = width
  source.height = height

  return source
}

/**
 * Creates a FabricImage with a contract sufficient for testing image crop mutation.
 */
export function createCropImageTarget({
  width,
  height,
  cropX = 0,
  cropY = 0
}: {
  width: number
  height: number
  cropX?: number
  cropY?: number
}): CropImageTarget {
  const source = createCropImageSource({
    width,
    height
  })
  const target = new FabricImage(source, {
    width,
    height,
    cropX,
    cropY
  }) as CropImageTarget

  Object.assign(target, {
    width,
    height,
    cropX,
    cropY,
    element: source
  })
  target.canvas = createEditorStub().canvas
  target.canvas.getElement = jest.fn(() => document.createElement('canvas'))
  target.left = 0
  target.top = 0
  target.setElement = jest.fn((nextSource: HTMLCanvasElement) => {
    target.element = nextSource
  })
  target.setCoords = jest.fn()
  target.setPositionByOrigin = jest.fn((point: Point, originX: CropOriginX, originY: CropOriginY) => {
    target.left = point.x
    target.top = point.y
    target.originX = originX
    target.originY = originY
  })

  return target
}

/**
 * Creates a frame with a fixed center for testing result positioning.
 */
export function createCropFrameStub({
  centerX,
  centerY
}: {
  centerX: number
  centerY: number
}): CropFrameStub {
  const frame = new Rect({
    left: centerX,
    top: centerY,
    width: 1,
    height: 1
  }) as CropFrameStub

  frame.getCenterPoint = () => new Point(centerX, centerY)

  return frame
}
