import { getRoundedCropRect } from '../../../../src/editor/crop-manager/domain/crop-result'

describe('crop-result', () => {
  it('округляет половину source-пикселя вверх без потери пикселя от floating-point погрешности', () => {
    const sourceSize = {
      width: 1000,
      height: 667
    }
    const upperRect = getRoundedCropRect({
      sourceSize,
      rect: {
        left: 0,
        top: 0,
        width: 500,
        height: 333.49999999999994
      }
    })
    const lowerRect = getRoundedCropRect({
      sourceSize,
      rect: {
        left: 0,
        top: 333.49999999999994,
        width: 500,
        height: 333.5
      }
    })

    expect(upperRect.width).toBe(500)
    expect(upperRect.height).toBe(334)
    expect(lowerRect.top).toBe(333)
    expect(lowerRect.height).toBe(334)
    expect(lowerRect.top + lowerRect.height).toBe(667)
  })
})
