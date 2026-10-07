import { Control, Point, Rect } from 'fabric'
import { CropFrame } from '../../../src/editor/crop-manager/domain/crop-frame'

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
  frame.calcTransformMatrix = () => [frame.scaleX, 0, 0, frame.scaleY, frame.left, frame.top]
  frame.setPositionByOrigin = (center: Point) => {
    frame.set({ left: center.x, top: center.y })
  }
  frame.setCoords = jest.fn()

  return frame
}
