import { Rect } from 'fabric'

import { resolveCropFrameResizePreserveAspectRatio } from '../../../../src/editor/crop-manager/domain/crop-resize-mode'

/** Минимальный target с runtime-полями crop resize mode. */
type CropResizeModeTarget = Rect & {
  preserveAspectRatio?: boolean
  cropActiveResizePreserveAspectRatio?: boolean | null
}

describe('crop resize mode', () => {
  it('инвертирует base preserveAspectRatio только когда нет active resize override', () => {
    const target = new Rect({ width: 100, height: 100 }) as CropResizeModeTarget

    target.preserveAspectRatio = true
    expect(resolveCropFrameResizePreserveAspectRatio({ target, shiftKey: false })).toBe(true)
    expect(resolveCropFrameResizePreserveAspectRatio({ target, shiftKey: true })).toBe(false)
  })

  it('active resize override имеет приоритет над Shift и base preserveAspectRatio', () => {
    const target = new Rect({ width: 100, height: 100 }) as CropResizeModeTarget

    target.preserveAspectRatio = false
    target.cropActiveResizePreserveAspectRatio = false

    expect(resolveCropFrameResizePreserveAspectRatio({ target, shiftKey: false })).toBe(false)
    expect(resolveCropFrameResizePreserveAspectRatio({ target, shiftKey: true })).toBe(false)
  })
})
