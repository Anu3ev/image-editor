import { CropFrame } from '../../../../src/editor/crop-manager/domain/crop-frame'
import { resetCropCanvasContext } from '../../../test-utils/crop/image-crop'

describe('crop frame', () => {
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
})
