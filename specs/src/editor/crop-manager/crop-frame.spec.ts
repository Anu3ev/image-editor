import { Rect } from 'fabric'

import {
  createCropFrame,
  CropFrame
} from '../../../../src/editor/crop-manager/domain/crop-frame'
import { resetCropCanvasContext } from '../../../test-utils/crop/image-crop'

describe('crop frame', () => {
  it('по умолчанию включает preserveAspectRatio, overflow и не привязывается к source', () => {
    const defaultFrame = new CropFrame({
      width: 90,
      height: 60,
      showGrid: false
    })
    const unlockedFrame = new CropFrame({
      width: 90,
      height: 60,
      showGrid: false,
      preserveAspectRatio: false
    })

    expect(defaultFrame.preserveAspectRatio).toBe(true)
    expect(defaultFrame.cropAllowFrameOverflow).toBe(true)
    expect(defaultFrame.cropSource).toBeNull()
    expect(unlockedFrame.preserveAspectRatio).toBe(false)
    expect(unlockedFrame.cropAllowFrameOverflow).toBe(true)
    expect(unlockedFrame.cropSource).toBeNull()
  })

  it('создаёт frame с source-ограничениями активной crop session', () => {
    const source = new Rect({
      left: 200,
      top: 150,
      width: 1000,
      height: 667,
      scaleX: 0.5,
      scaleY: 0.25,
      angle: 12,
      originX: 'center',
      originY: 'center'
    })
    const frame = createCropFrame({
      source,
      cropSize: {
        width: 300,
        height: 300
      },
      showGrid: false,
      allowFrameOverflow: false,
      preserveAspectRatio: true
    })

    expect(frame).toBeInstanceOf(CropFrame)
    expect(frame.cropSource).toBe(source)
    expect(frame.cropAllowFrameOverflow).toBe(false)
    expect(frame.cropSourceScaleX).toBe(0.5)
    expect(frame.cropSourceScaleY).toBe(0.25)
    expect(frame.preserveAspectRatio).toBe(true)
  })

  it('рисует сетку третей, когда showGrid включён', () => {
    const context = resetCropCanvasContext()
    const frame = new CropFrame({
      width: 90,
      height: 60,
      showGrid: true
    })

    frame._render(context)

    expect(context.save).toHaveBeenCalledTimes(1)
    expect(context.setLineDash).toHaveBeenCalledWith([])
    expect(context.beginPath).toHaveBeenCalledTimes(4)
    expect(context.moveTo).toHaveBeenCalledWith(-15, -30)
    expect(context.lineTo).toHaveBeenCalledWith(-15, 30)
    expect(context.moveTo).toHaveBeenCalledWith(-45, -10)
    expect(context.lineTo).toHaveBeenCalledWith(45, -10)
    expect(context.stroke).toHaveBeenCalledTimes(4)
    expect(context.restore).toHaveBeenCalledTimes(1)
  })

  it('не рисует сетку третей, когда showGrid выключен', () => {
    const context = resetCropCanvasContext()
    const frame = new CropFrame({
      width: 90,
      height: 60,
      showGrid: false
    })

    frame._render(context)

    expect(context.save).not.toHaveBeenCalled()
    expect(context.setLineDash).not.toHaveBeenCalled()
    expect(context.beginPath).not.toHaveBeenCalled()
    expect(context.moveTo).not.toHaveBeenCalled()
    expect(context.lineTo).not.toHaveBeenCalled()
    expect(context.stroke).not.toHaveBeenCalled()
    expect(context.restore).not.toHaveBeenCalled()
  })

  it('возвращает snapping bounds без учёта stroke и control padding', () => {
    const frame = new CropFrame({
      left: 200,
      top: 150,
      width: 100,
      height: 60,
      scaleX: 2,
      scaleY: 0.5,
      originX: 'center',
      originY: 'center',
      strokeWidth: 12,
      strokeUniform: true,
      showGrid: false
    })

    frame.calcTransformMatrix = jest.fn(() => [2, 0, 0, 0.5, 200, 150])

    const bounds = frame.getObjectSnappingBounds()

    expect(bounds.left).toBe(100)
    expect(bounds.right).toBe(300)
    expect(bounds.top).toBe(135)
    expect(bounds.bottom).toBe(165)
    expect(bounds.centerX).toBe(200)
    expect(bounds.centerY).toBe(150)
  })
})
