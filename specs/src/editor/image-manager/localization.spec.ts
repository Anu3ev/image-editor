import { createTranslator } from '../../../../src/editor/i18n'
import ErrorManager from '../../../../src/editor/error-manager'
import { createCanvasExportRequest } from '../../../../src/editor/image-manager/canvas-export'
import { createObjectExportRequest } from '../../../../src/editor/image-manager/object-export'
import { exportSVGStringAsFile } from '../../../../src/editor/image-manager/export-utils'
import { getContentTypeFromExtension } from '../../../../src/editor/image-manager/image-format'
import { createImageManagerTestSetup } from '../../../test-utils/managers/image'

describe('ImageManager localized filenames and English diagnostics', () => {
  afterEach(() => jest.restoreAllMocks())

  it('localizes default filenames and preserves custom names', () => {
    const t = createTranslator({ language: 'ru' })
    expect(createCanvasExportRequest({ options: {}, t }).fileName).toBe(t('image.filenames.defaultPng'))
    expect(createObjectExportRequest({ options: { contentType: 'image/webp' }, t }).fileName)
      .toBe(t('image.filenames.defaultWithFormat', { format: 'webp' }))
    expect(exportSVGStringAsFile('<svg/>', { t })).toMatchObject({ name: t('image.filenames.defaultSvg') })
    expect(createCanvasExportRequest({ options: { fileName: 'my-file.png' }, t }).fileName).toBe('my-file.png')
    expect(createObjectExportRequest({ options: { fileName: 'my-file.webp' }, t }).fileName).toBe('my-file.webp')
  })

  it('reports English URL warnings and preserves diagnostic data', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const result = getContentTypeFromExtension({ url: 'invalid-url', acceptContentTypes: [] })
    expect(result).toBe('application/octet-stream')
    expect(warn).toHaveBeenCalledWith(
      'Failed to determine the file extension from the URL:',
      'invalid-url',
      expect.objectContaining({ name: 'TypeError' })
    )
  })

  it.each([
    ['en', 'Couldn\'t export the image.'],
    ['ru', 'Не удалось экспортировать изображение.']
  ])('emits localized export notifications with unchanged diagnostics for %s', async(language, userMessage) => {
    const setup = createImageManagerTestSetup()
    const errorManager = new ErrorManager({ editor: setup.mockEditor })
    setup.mockEditor.errorManager = errorManager
    setup.mockEditor.t = createTranslator({ language })
    setup.mockCanvas.clone.mockRejectedValueOnce(new Error('Custom browser failure'))
    jest.spyOn(console, 'error').mockImplementation(() => {})
    try {
      await expect(setup.imageManager.exportCanvasAsImageFile({ fileName: 'customer.png' })).resolves.toBeNull()
      const event = {
        code: 'IMAGE_EXPORT_FAILED',
        origin: 'ImageManager',
        method: 'exportCanvasAsImageFile',
        message: 'Failed to export the image: Custom browser failure',
        userMessage,
        data: {
          contentType: 'image/png',
          fileName: 'customer.png',
          exportAsBase64: false,
          exportAsBlob: false
        }
      }
      expect(setup.mockCanvas.fire).toHaveBeenCalledWith('editor:error', event)
      expect(errorManager.buffer).toStrictEqual([{ type: 'editor:error', ...event }])
      expect(console.error).toHaveBeenCalledWith(
        'ImageManager. exportCanvasAsImageFile. IMAGE_EXPORT_FAILED. Failed to export the image: Custom browser failure',
        event.data
      )
    } finally {
      setup.restore()
    }
  })

  it.each([
    {
      sizeType: 'max' as const,
      message: 'The image exceeds the maximum canvas size and will be reduced to fit 800×600 while preserving its aspect ratio.',
      userMessage: 'Меняем размер изображения, чтобы оно поместилось в 800 × 600 пикселей, сохраняя пропорции.'
    },
    {
      sizeType: 'min' as const,
      message: 'The image is smaller than the minimum canvas size and will be enlarged to meet 40×30 while preserving its aspect ratio.',
      userMessage: 'Меняем размер изображения с сохранением пропорций. Минимальный размер: 40 × 30 пикселей.'
    }
  ])('localizes $sizeType resize warnings while retaining the worker payload', async({ sizeType, message, userMessage }) => {
    const setup = createImageManagerTestSetup()
    const errorManager = new ErrorManager({ editor: setup.mockEditor })
    setup.mockEditor.errorManager = errorManager
    setup.mockEditor.t = createTranslator({ language: 'ru' })
    jest.spyOn(console, 'warn').mockImplementation(() => {})
    const data = {
      dataURL: 'data:image/png;base64,original',
      sizeType,
      contentType: 'image/png',
      quality: 1,
      maxWidth: 800,
      maxHeight: 600,
      minWidth: 40,
      minHeight: 30
    }
    try {
      await expect(setup.imageManager.resizeImageToBoundaries(data)).resolves.toBeInstanceOf(Blob)
      const event = {
        code: 'IMAGE_RESIZE_WARNING',
        origin: 'ImageManager',
        method: 'resizeImageToBoundaries',
        message,
        userMessage,
        data
      }
      expect(setup.mockCanvas.fire).toHaveBeenCalledWith('editor:warning', event)
      expect(errorManager.buffer).toStrictEqual([{ type: 'editor:warning', ...event }])
      expect(setup.mockWorkerManager.post).toHaveBeenCalledWith('resizeImage', data)
      expect(errorManager.buffer[0].data).toBe(setup.mockCanvas.fire.mock.calls[0][1].data)
      expect(console.warn).toHaveBeenCalledWith(
        `ImageManager. resizeImageToBoundaries. IMAGE_RESIZE_WARNING. ${message}`,
        data
      )
    } finally {
      setup.restore()
    }
  })
})
