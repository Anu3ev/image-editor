import { createTranslator } from '../../../../src/editor/i18n'
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

  it('keeps export errors in English for a Russian editor and preserves the exception message', async() => {
    const setup = createImageManagerTestSetup()
    setup.mockEditor.t = createTranslator({ language: 'ru' })
    setup.mockCanvas.clone.mockRejectedValueOnce(new Error('Custom browser failure'))
    try {
      await expect(setup.imageManager.exportCanvasAsImageFile()).resolves.toBeNull()
      expect(setup.mockEditor.errorManager.emitError).toHaveBeenCalledWith(expect.objectContaining({
        code: 'IMAGE_EXPORT_FAILED',
        origin: 'ImageManager',
        method: 'exportCanvasAsImageFile',
        message: 'Failed to export the image: Custom browser failure'
      }))
    } finally {
      setup.restore()
    }
  })
})
