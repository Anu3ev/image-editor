import { Control, Point, Rect } from 'fabric'
import { CropFrame } from '../../../src/editor/crop-manager/domain/crop-frame'

/** Gives a centered test frame a scale-and-translate matrix and center placement instead of the Fabric mock. */
function installCenteredFrameTransform({ frame }: { frame: Rect }): void {
  frame.calcTransformMatrix = () => [frame.scaleX, 0, 0, frame.scaleY, frame.left, frame.top]
  frame.setPositionByOrigin = (center: Point) => {
    frame.set({ left: center.x, top: center.y })
  }
}

/** Creates actual crop source geometry without depending on the incomplete shared Fabric mock. */
export function createCropInteractionFrame({
  allowFrameOverflow,
  width = 1000,
  height = 667
}: {
  allowFrameOverflow: boolean
  width?: number
  height?: number
}): CropFrame {
  const source = new Rect({ width: 1000, height: 667, angle: 0, scaleX: 0.5, scaleY: 0.5 })
  source.calcTransformMatrix = () => [0.5, 0, 0, 0.5, 0, 0]
  const frame = new CropFrame({
    source,
    width,
    height,
    scaleX: 0.5,
    scaleY: 0.5,
    sourceScaleX: 0.5,
    sourceScaleY: 0.5,
    left: 0,
    top: 0,
    angle: 0,
    originX: 'center',
    originY: 'center',
    showGrid: false,
    allowFrameOverflow
  })
  frame.controls = Object.fromEntries(['tl', 'tr', 'bl', 'br', 'ml', 'mr', 'mt', 'mb'].map((key) => [
    key, new Control({ actionHandler: jest.fn(() => false) })
  ]))
  installCenteredFrameTransform({ frame })
  frame.setCoords = jest.fn()

  return frame
}

/** Creates a skewed 1000x667 crop source centered at the origin and a crop frame over it with real matrices. */
export function createSkewedCropSourceFrame({
  skewXDegrees = 0,
  skewYDegrees = 0,
  frameWidth = 1000,
  frameHeight = 667,
  frameLeft = 0
}: {
  skewXDegrees?: number
  skewYDegrees?: number
  frameWidth?: number
  frameHeight?: number
  frameLeft?: number
}): { source: Rect, frame: CropFrame } {
  const tanX = Math.tan((skewXDegrees * Math.PI) / 180)
  const tanY = Math.tan((skewYDegrees * Math.PI) / 180)
  const source = new Rect({
    width: 1000, height: 667, skewX: skewXDegrees, skewY: skewYDegrees, originX: 'center', originY: 'center'
  })
  const frame = new CropFrame({
    source,
    left: frameLeft,
    top: 0,
    width: frameWidth,
    height: frameHeight,
    scaleX: 1,
    scaleY: 1,
    originX: 'center',
    originY: 'center',
    showGrid: false,
    allowFrameOverflow: false
  })
  // Fabric applies skewX, then skewY: x' = (1 + tanX * tanY) * x + tanX * y, y' = tanY * x + y.
  source.calcTransformMatrix = () => [1 + (tanX * tanY), tanY, tanX, 1, 0, 0]
  installCenteredFrameTransform({ frame })

  return { source, frame }
}
