import type { ImageEditor } from '../../../../src/editor'
import { applyImageCrop } from '../../../../src/editor/crop-manager/mutation/crop-apply'
import { createEditorStub } from '../../../test-utils/editor/editor-stub'
import {
  createCropFrameStub,
  createCropImageTarget,
  getCropCanvasContext,
  resetCropCanvasContext
} from '../../../test-utils/crop/image-crop'

describe('crop apply', () => {
  beforeEach(() => {
    resetCropCanvasContext()
  })

  it('для crop внутри изображения обновляет cropX/cropY без замены source', () => {
    const editor = createEditorStub() as ImageEditor
    const target = createCropImageTarget({
      width: 100,
      height: 80,
      cropX: 10,
      cropY: 20
    })
    const frame = createCropFrameStub({
      centerX: 320,
      centerY: 240
    })

    const result = applyImageCrop({
      editor,
      target,
      frame,
      rect: {
        left: 5,
        top: 6,
        width: 40,
        height: 30
      }
    })

    expect(result).toEqual({
      mode: 'image',
      target,
      rect: {
        left: 5,
        top: 6,
        width: 40,
        height: 30
      }
    })
    expect(target.cropX).toBe(15)
    expect(target.cropY).toBe(26)
    expect(target.width).toBe(40)
    expect(target.height).toBe(30)
    expect(target.setElement).not.toHaveBeenCalled()
    expect(target.setPositionByOrigin).toHaveBeenCalledWith(frame.getCenterPoint(), 'center', 'center')
  })

  it('для crop за пределами изображения создаёт прозрачный source с нужным смещением контента', () => {
    const editor = createEditorStub() as ImageEditor
    const context = getCropCanvasContext()
    const target = createCropImageTarget({
      width: 100,
      height: 80,
      cropX: 3,
      cropY: 4
    })
    const source = target.getElement()
    const frame = createCropFrameStub({
      centerX: 360,
      centerY: 260
    })

    const result = applyImageCrop({
      editor,
      target,
      frame,
      rect: {
        left: -10,
        top: -5,
        width: 120,
        height: 100
      }
    })

    const [transparentSource, appliedSize] = target.setElement.mock.calls[0] ?? []

    expect(result?.rect).toEqual({
      left: -10,
      top: -5,
      width: 120,
      height: 100
    })
    expect(transparentSource).toBeInstanceOf(HTMLCanvasElement)
    expect(transparentSource.width).toBe(120)
    expect(transparentSource.height).toBe(100)
    expect(appliedSize).toEqual({
      width: 120,
      height: 100
    })
    expect(target.cropX).toBe(0)
    expect(target.cropY).toBe(0)
    expect(context.drawImage).toHaveBeenCalledWith(source, 3, 4, 100, 80, 10, 5, 100, 80)
  })
})
