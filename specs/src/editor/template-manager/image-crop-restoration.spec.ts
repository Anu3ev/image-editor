import { util } from 'fabric'
import { nanoid } from 'nanoid'

import type { TemplateDefinition } from '../../../../src/editor/template-manager'
import { createPlacementTestImage } from '../../../test-utils/canvas/placement'
import {
  createImageTemplateDefinition,
  createTemplateManagerTestSetup
} from '../../../test-utils/managers/template'

/** Размер монтажной области для проверки восстановления изображений. */
const MONTAGE_BOUNDS = {
  left: 100,
  top: 50,
  width: 810,
  height: 1080
} as const

/** Исходник, относительно которого сохранена crop-область. */
const CROPPED_SOURCE = {
  source: 'original-source.png',
  sourceWidth: 2000,
  sourceHeight: 2000
} as const

describe('TemplateManager: изображение после crop', () => {
  beforeEach(() => {
    const nanoidMock = nanoid as jest.MockedFunction<typeof nanoid>

    jest.restoreAllMocks()
    nanoidMock.mockReset()
    nanoidMock.mockReturnValue('template-image-id')
    jest.clearAllMocks()
  })

  it('для того же src сохраняет crop-область и разный масштаб по осям', async() => {
    const { manager, editor } = createTemplateManagerTestSetup({
      useRealCanvasManager: true,
      montageBounds: MONTAGE_BOUNDS
    })
    const revivedImage = createPlacementTestImage({
      id: 'template-image',
      left: 0.2,
      top: 0.1,
      width: 858,
      height: 858,
      scaleX: 0.3,
      scaleY: 0.2,
      cropX: 571,
      cropY: 571,
      intrinsicWidth: 2000,
      intrinsicHeight: 2000
    })
    const prepareImageSourcesMock = editor.imageManager.prepareSerializedImageSources as jest.Mock

    prepareImageSourcesMock.mockImplementation(async({ state }: { state: TemplateDefinition }) => ({
      ...state,
      objects: state.objects.map((object) => ({
        ...object,
        src: 'blob:prepared-source'
      }))
    }))

    jest.spyOn(util, 'enlivenObjects').mockResolvedValue([revivedImage as never])

    const result = await manager.applyTemplate({
      template: createImageTemplateDefinition({
        left: 0.2,
        top: 0.1,
        width: 858,
        height: 858,
        scaleX: 0.3,
        scaleY: 0.2,
        cropX: 571,
        cropY: 571,
        src: CROPPED_SOURCE.source,
        imageFit: 'stretch',
        imageCrop: CROPPED_SOURCE
      })
    })

    expect(result).toEqual([revivedImage])
    expect(prepareImageSourcesMock).toHaveBeenCalledTimes(1)
    expect(revivedImage).toEqual(expect.objectContaining({
      width: 858,
      height: 858,
      scaleX: 0.3,
      scaleY: 0.2,
      cropX: 571,
      cropY: 571
    }))
    expect(editor.errorManager.emitError).not.toHaveBeenCalled()
  })

  it('для другого src того же размера заново заполняет сохранённую область', async() => {
    const { manager, editor } = createTemplateManagerTestSetup({
      useRealCanvasManager: true,
      montageBounds: MONTAGE_BOUNDS
    })
    const revivedImage = createPlacementTestImage({
      id: 'template-image',
      left: 0.2,
      top: 0.1,
      width: 833,
      height: 833,
      scaleX: 0.256,
      scaleY: 0.256,
      cropY: 1167,
      customData: {
        templateField: 'product-image',
        imageCrop: CROPPED_SOURCE
      },
      intrinsicWidth: 2000,
      intrinsicHeight: 2000
    })

    jest.spyOn(util, 'enlivenObjects').mockResolvedValue([revivedImage as never])

    const result = await manager.applyTemplate({
      template: createImageTemplateDefinition({
        left: 0.2,
        top: 0.1,
        width: 833,
        height: 833,
        scaleX: 0.256,
        scaleY: 0.256,
        cropY: 1167,
        src: 'replacement-source.png',
        imageCrop: CROPPED_SOURCE
      })
    })

    expect(result).toEqual([revivedImage])
    expect(revivedImage).toEqual(expect.objectContaining({
      width: 2000,
      height: 2000,
      cropX: 0,
      cropY: 0
    }))
    expect(revivedImage.scaleX).toBeCloseTo(0.106624, 6)
    expect(revivedImage.scaleY).toBeCloseTo(0.106624, 6)
    expect(revivedImage.customData).toEqual({ templateField: 'product-image' })
    expect(editor.errorManager.emitError).not.toHaveBeenCalled()
  })

  it('для того же src с другими исходными размерами заново заполняет сохранённую область', async() => {
    const { manager } = createTemplateManagerTestSetup({
      useRealCanvasManager: true,
      montageBounds: MONTAGE_BOUNDS
    })
    const revivedImage = createPlacementTestImage({
      id: 'template-image',
      left: 0.2,
      top: 0.1,
      width: 858,
      height: 858,
      scaleX: 0.256,
      scaleY: 0.256,
      cropX: 571,
      cropY: 571,
      intrinsicWidth: 160,
      intrinsicHeight: 120
    })

    jest.spyOn(util, 'enlivenObjects').mockResolvedValue([revivedImage as never])

    const result = await manager.applyTemplate({
      template: createImageTemplateDefinition({
        left: 0.2,
        top: 0.1,
        width: 858,
        height: 858,
        scaleX: 0.256,
        scaleY: 0.256,
        cropX: 571,
        cropY: 571,
        src: CROPPED_SOURCE.source,
        imageCrop: CROPPED_SOURCE
      })
    })

    expect(result).toEqual([revivedImage])
    expect(revivedImage.cropX).toBe(20)
    expect(revivedImage.cropY).toBe(0)
    expect(revivedImage.width).toBe(120)
    expect(revivedImage.height).toBe(120)
    expect(revivedImage.scaleX).toBeCloseTo(1.8304, 6)
    expect(revivedImage.scaleY).toBeCloseTo(1.8304, 6)
  })

  it('для другого src сохраняет видимый размер изображения с разным масштабом по осям', async() => {
    const { manager } = createTemplateManagerTestSetup({
      useRealCanvasManager: true,
      montageBounds: MONTAGE_BOUNDS
    })
    const revivedImage = createPlacementTestImage({
      id: 'template-image',
      left: 0.2,
      top: 0.1,
      width: 858,
      height: 858,
      scaleX: 0.3,
      scaleY: 0.2,
      cropX: 571,
      cropY: 571,
      intrinsicWidth: 2000,
      intrinsicHeight: 2000
    })

    jest.spyOn(util, 'enlivenObjects').mockResolvedValue([revivedImage as never])

    const result = await manager.applyTemplate({
      template: createImageTemplateDefinition({
        left: 0.2,
        top: 0.1,
        width: 858,
        height: 858,
        scaleX: 0.3,
        scaleY: 0.2,
        cropX: 571,
        cropY: 571,
        src: 'replacement-source.png',
        imageFit: 'stretch',
        imageCrop: CROPPED_SOURCE
      })
    })

    expect(result).toEqual([revivedImage])
    expect(revivedImage.cropX).toBe(0)
    expect(revivedImage.cropY).toBeCloseTo(333.333333, 6)
    expect(revivedImage.width).toBe(2000)
    expect(revivedImage.height).toBeCloseTo(1333.333333, 6)
    expect(revivedImage.scaleX).toBeCloseTo(0.1287, 6)
    expect(revivedImage.scaleY).toBeCloseTo(0.1287, 6)
    expect(revivedImage.width * revivedImage.scaleX).toBeCloseTo(858 * 0.3, 6)
    expect(revivedImage.height * revivedImage.scaleY).toBeCloseTo(858 * 0.2, 6)
  })

  it('для старого crop-шаблона сохраняет crop-область, которая помещается в исходник', async() => {
    const { manager } = createTemplateManagerTestSetup({
      useRealCanvasManager: true,
      montageBounds: MONTAGE_BOUNDS
    })
    const revivedImage = createPlacementTestImage({
      id: 'template-image',
      left: 0.2,
      top: 0.1,
      width: 858,
      height: 858,
      scaleX: 0.256,
      scaleY: 0.256,
      cropX: 571,
      cropY: 571,
      intrinsicWidth: 2000,
      intrinsicHeight: 2000
    })

    jest.spyOn(util, 'enlivenObjects').mockResolvedValue([revivedImage as never])

    const result = await manager.applyTemplate({
      template: createImageTemplateDefinition({
        left: 0.2,
        top: 0.1,
        width: 858,
        height: 858,
        scaleX: 0.256,
        scaleY: 0.256,
        cropX: 571,
        cropY: 571,
        legacyCropMode: true
      })
    })

    expect(result).toEqual([revivedImage])
    expect(revivedImage.cropX).toBe(571)
    expect(revivedImage.cropY).toBe(571)
    expect(revivedImage.width).toBe(858)
    expect(revivedImage.height).toBe(858)
  })

  it('для старого crop-шаблона заново заполняет область, если прежний crop выходит за границы', async() => {
    const { manager } = createTemplateManagerTestSetup({
      useRealCanvasManager: true,
      montageBounds: MONTAGE_BOUNDS
    })
    const revivedImage = createPlacementTestImage({
      id: 'template-image',
      left: 0.2,
      top: 0.1,
      width: 833,
      height: 833,
      scaleX: 0.256,
      scaleY: 0.256,
      cropY: 1167,
      intrinsicWidth: 160,
      intrinsicHeight: 120
    })

    jest.spyOn(util, 'enlivenObjects').mockResolvedValue([revivedImage as never])

    const result = await manager.applyTemplate({
      template: createImageTemplateDefinition({
        left: 0.2,
        top: 0.1,
        width: 833,
        height: 833,
        scaleX: 0.256,
        scaleY: 0.256,
        cropY: 1167,
        legacyCropMode: true
      })
    })

    expect(result).toEqual([revivedImage])
    expect(revivedImage.cropX).toBe(20)
    expect(revivedImage.cropY).toBe(0)
    expect(revivedImage.width).toBe(120)
    expect(revivedImage.height).toBe(120)
    expect(revivedImage.scaleX).toBeCloseTo(1.777066667, 6)
    expect(revivedImage.scaleY).toBeCloseTo(1.777066667, 6)
  })

  it('при сохранении записывает crop отдельно от разного масштаба по осям', () => {
    const { manager, editor } = createTemplateManagerTestSetup({ useRealCanvasManager: true })
    const existingCustomData = { templateField: 'product-image' }
    const image = createPlacementTestImage({
      id: 'cropped-image',
      left: 120,
      top: 160,
      width: 858,
      height: 858,
      scaleX: 0.3,
      scaleY: 0.2,
      cropped: true,
      intrinsicWidth: 2000,
      intrinsicHeight: 2000
    })

    image.toDatalessObject.mockReturnValue({
      ...image.toDatalessObject(),
      src: CROPPED_SOURCE.source,
      customData: existingCustomData
    })
    editor.canvas.getActiveObject.mockReturnValue(image)

    const template = manager.serializeSelection()

    expect(template?.objects).toHaveLength(1)
    expect(template?.objects[0]?.customData).toEqual({
      templateField: 'product-image',
      imageFit: 'stretch',
      imageCrop: CROPPED_SOURCE
    })
    expect(existingCustomData).toEqual({ templateField: 'product-image' })
  })

  it('при повторном сохранении обычного изображения удаляет устаревшие crop-данные', () => {
    const { manager, editor } = createTemplateManagerTestSetup({ useRealCanvasManager: true })
    const existingCustomData = {
      templateField: 'product-image',
      imageFit: 'crop',
      imageCrop: CROPPED_SOURCE
    }
    const image = createPlacementTestImage({
      id: 'restored-image',
      left: 120,
      top: 160,
      width: 2000,
      height: 2000,
      scaleX: 0.256,
      scaleY: 0.256,
      intrinsicWidth: 2000,
      intrinsicHeight: 2000
    })

    image.toDatalessObject.mockReturnValue({
      ...image.toDatalessObject(),
      customData: existingCustomData
    })
    editor.canvas.getActiveObject.mockReturnValue(image)

    const template = manager.serializeSelection()

    expect(template?.objects[0]?.customData).toEqual({ templateField: 'product-image' })
    expect(existingCustomData).toEqual({
      templateField: 'product-image',
      imageFit: 'crop',
      imageCrop: CROPPED_SOURCE
    })
  })
})
