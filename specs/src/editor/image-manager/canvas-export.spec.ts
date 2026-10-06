import { createImageManagerTestSetup } from '../../../test-utils/managers/image'

describe('Экспорт монтажной области в файл', () => {
  let restoreGlobals: (() => void) | undefined

  afterEach(() => {
    restoreGlobals?.()
    jest.restoreAllMocks()
  })

  it.each([
    { contentType: 'image/png', fileName: 'canvas.png', format: 'png' },
    { contentType: 'image/jpeg', fileName: 'canvas.jpeg', format: 'jpeg' }
  ])('сохраняет $format без bitmap и лишней конвертации в worker', async({
    contentType,
    fileName,
    format
  }) => {
    const blob = new Blob(['encoded canvas bytes'], { type: contentType })
    const setup = createImageManagerTestSetup({ cloneBlob: blob })
    restoreGlobals = setup.restore

    const result = await setup.imageManager.exportCanvasAsImageFile({ contentType, fileName })

    expect(result).toEqual({ image: expect.any(File), contentType, fileName, format })
    expect(result?.image).toEqual(expect.objectContaining({
      name: fileName,
      size: blob.size,
      type: contentType
    }))
    expect(setup.mockCanvas.fire).toHaveBeenCalledWith('editor:canvas-exported', result)
    expect(setup.mockCanvasClone.dispose).toHaveBeenCalledTimes(1)
    expect(setup.mockCreateImageBitmap).not.toHaveBeenCalled()
    expect(setup.mockWorkerManager.post).not.toHaveBeenCalled()
    expect(setup.mockEditor.errorManager.emitError).not.toHaveBeenCalled()
  })
})
