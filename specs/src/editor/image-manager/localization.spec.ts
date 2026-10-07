import { createTranslator } from '../../../../src/editor/i18n'
import { createCanvasExportRequest } from '../../../../src/editor/image-manager/canvas-export'
import { createObjectExportRequest } from '../../../../src/editor/image-manager/object-export'
import { exportSVGStringAsFile } from '../../../../src/editor/image-manager/export-utils'
import { getContentTypeFromExtension } from '../../../../src/editor/image-manager/image-format'
import { createImageManagerTestSetup } from '../../../test-utils/managers/image'

describe('ImageManager message and filename localization', () => {
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

  it('localizes URL warnings and preserves diagnostic data', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
    const result = getContentTypeFromExtension({ url: 'invalid-url', acceptContentTypes: [], t: createTranslator({ language: 'ru' }) })
    expect(result).toBe('application/octet-stream')
    expect(warn).toHaveBeenCalledWith(
      'Не удалось определить расширение файла из URL:',
      'invalid-url',
      expect.objectContaining({ name: 'TypeError' })
    )
  })

  it('localizes export errors and preserves the original exception message', async() => {
    const setup = createImageManagerTestSetup()
    setup.mockEditor.t = createTranslator({ language: 'ru' })
    setup.mockCanvas.clone.mockRejectedValueOnce(new Error('Custom browser failure'))
    try {
      await expect(setup.imageManager.exportCanvasAsImageFile()).resolves.toBeNull()
      expect(setup.mockEditor.errorManager.emitError).toHaveBeenCalledWith(expect.objectContaining({
        code: 'IMAGE_EXPORT_FAILED',
        message: 'Не удалось экспортировать изображение: Custom browser failure'
      }))
    } finally {
      setup.restore()
    }
  })
})
