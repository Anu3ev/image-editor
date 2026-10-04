import { resolveCropFrameResizePreserveAspectRatio } from '../../../../src/editor/crop-manager/domain/crop-resize-mode'
import { CropFrame } from '../../../../src/editor/crop-manager/domain/crop-frame'

describe('crop resize mode', () => {
  it('инвертирует base preserveAspectRatio только когда нет active resize override', () => {
    const target = new CropFrame({ width: 100, height: 100, showGrid: false })

    target.preserveAspectRatio = true
    expect(resolveCropFrameResizePreserveAspectRatio({ target, shiftKey: false })).toBe(true)
    expect(resolveCropFrameResizePreserveAspectRatio({ target, shiftKey: true })).toBe(false)
  })

  it('при свободном resize включает сохранение пропорций только с Shift', () => {
    const target = new CropFrame({ width: 100, height: 100, showGrid: false, preserveAspectRatio: false })

    expect(resolveCropFrameResizePreserveAspectRatio({ target, shiftKey: false })).toBe(false)
    expect(resolveCropFrameResizePreserveAspectRatio({ target, shiftKey: true })).toBe(true)
  })

  it('active resize override имеет приоритет над Shift и base preserveAspectRatio', () => {
    const target = new CropFrame({ width: 100, height: 100, showGrid: false })

    target.preserveAspectRatio = false
    target.cropActiveResizePreserveAspectRatio = false

    expect(resolveCropFrameResizePreserveAspectRatio({ target, shiftKey: false })).toBe(false)
    expect(resolveCropFrameResizePreserveAspectRatio({ target, shiftKey: true })).toBe(false)
  })
})
