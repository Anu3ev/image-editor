import { loadSVGFromURL } from 'fabric'
import ImageManager from '../../../../src/editor/image-manager'
import {
  createImageManagerTestSetup,
  createMockCanvasClone,
  createMockExportableObject,
  createMockFabricImage,
  mockFabricImageFromURL,
  suppressConsoleWarnings
} from '../../../test-utils/image-manager-helpers'

describe('ImageManager', () => {
  let imageManager: ImageManager
  let mockEditor: any
  let mockCanvas: any
  let mockWorkerManager: any
  let mockModuleLoader: any
  let mockFetch: jest.Mock
  let mockCreateImageBitmap: jest.Mock
  let mockCreateObjectURL: jest.Mock
  let mockRevokeObjectURL: jest.Mock
  let restoreGlobals: () => void

  beforeEach(() => {
    const setup = createImageManagerTestSetup()
    imageManager = setup.imageManager
    mockEditor = setup.mockEditor
    mockCanvas = setup.mockCanvas
    mockWorkerManager = setup.mockWorkerManager
    mockModuleLoader = setup.mockModuleLoader
    mockFetch = setup.mockFetch
    mockCreateImageBitmap = setup.mockCreateImageBitmap
    mockCreateObjectURL = setup.mockCreateObjectURL
    mockRevokeObjectURL = setup.mockRevokeObjectURL
    restoreGlobals = setup.restore

    jest.clearAllMocks()
  })

  afterEach(() => {
    restoreGlobals()
  })

  describe('prepareInitialState', () => {
    it('заменяет src у image-объектов на blob URL и не мутирует исходный state', async() => {
      const initialState: any = {
        version: '5.0.0',
        width: 100,
        height: 100,
        objects: [
          { type: 'image', src: 'https://example.com/a.png' },
          { type: 'rect', fill: '#fff' }
        ]
      }

      const prepared = await imageManager.prepareInitialState({ state: initialState })

      expect(initialState.objects[0].src).toBe('https://example.com/a.png')
      expect(prepared.objects?.[0].src).toMatch(/^blob:mock-\d+$/)
      expect(prepared.objects?.[1]).toEqual(expect.objectContaining({ type: 'rect' }))
      expect(mockFetch).toHaveBeenCalledWith('https://example.com/a.png', { mode: 'cors' })
      expect(mockCreateObjectURL).toHaveBeenCalledTimes(1)
    })

    it('кеширует blob URL для одинаковых src и не делает повторных fetch', async() => {
      const initialState: any = {
        version: '5.0.0',
        width: 100,
        height: 100,
        objects: [
          { type: 'image', src: 'https://example.com/same.png' },
          { type: 'image', src: 'https://example.com/same.png' }
        ]
      }

      const prepared = await imageManager.prepareInitialState({ state: initialState })

      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(mockCreateObjectURL).toHaveBeenCalledTimes(1)
      expect(prepared.objects?.[0].src).toBe(prepared.objects?.[1].src)
      expect(prepared.objects?.[0].src).toMatch(/^blob:mock-\d+$/)
    })

    it('рекурсивно заменяет src у изображений во вложенных objects', async() => {
      const initialState: any = {
        version: '5.0.0',
        width: 100,
        height: 100,
        objects: [
          {
            type: 'group',
            objects: [
              { type: 'image', src: 'https://example.com/nested.png' }
            ]
          }
        ]
      }

      const prepared = await imageManager.prepareInitialState({ state: initialState })

      const nestedSrc = prepared.objects?.[0]?.objects?.[0]?.src
      expect(nestedSrc).toMatch(/^blob:mock-\d+$/)
      expect(mockFetch).toHaveBeenCalledWith('https://example.com/nested.png', { mode: 'cors' })
    })

    it('не трогает blob/data URL и не делает fetch', async() => {
      const initialState: any = {
        version: '5.0.0',
        width: 100,
        height: 100,
        objects: [
          { type: 'image', src: 'blob:already' },
          { type: 'image', src: 'data:image/png;base64,abc' }
        ]
      }

      const prepared = await imageManager.prepareInitialState({ state: initialState })

      expect(prepared.objects?.[0].src).toBe('blob:already')
      expect(prepared.objects?.[1].src).toBe('data:image/png;base64,abc')
      expect(mockFetch).not.toHaveBeenCalled()
      expect(mockCreateObjectURL).not.toHaveBeenCalled()
    })

    it('при неуспешной загрузке оставляет исходный src (fallback)', async() => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        blob: async() => new Blob(['mock'], { type: 'image/png' }),
        headers: { get: jest.fn(() => 'image/png') }
      })

      const initialState: any = {
        version: '5.0.0',
        width: 100,
        height: 100,
        objects: [
          { type: 'image', src: 'https://example.com/fail.png' }
        ]
      }

      const prepared = await imageManager.prepareInitialState({ state: initialState })

      expect(prepared.objects?.[0].src).toBe('https://example.com/fail.png')
      expect(mockCreateObjectURL).not.toHaveBeenCalled()
    })
  })

  describe('importImage', () => {
    it('returns null when source is missing', async() => {
      const result = await imageManager.importImage({ source: null as any })

      expect(result).toBeNull()
      expect(mockEditor.historyManager.suspendHistory).not.toHaveBeenCalled()
      expect(mockEditor.errorManager.emitError).not.toHaveBeenCalled()
    })

    it('rejects invalid content type', async() => {
      const file = new File(['mock'], 'image.tiff', { type: 'image/tiff' })

      const result = await imageManager.importImage({ source: file })

      expect(result).toBeNull()
      expect(mockEditor.errorManager.emitError).toHaveBeenCalledWith(expect.objectContaining({
        code: 'INVALID_CONTENT_TYPE'
      }))
      expect(mockEditor.historyManager.suspendHistory).not.toHaveBeenCalled()
    })

    it('emits error and resumes history for invalid source type', async() => {
      const result = await imageManager.importImage({ source: { type: 'image/png' } as any })

      expect(result).toBeNull()
      expect(mockEditor.historyManager.suspendHistory).toHaveBeenCalled()
      expect(mockEditor.historyManager.resumeHistory).toHaveBeenCalled()
      expect(mockEditor.errorManager.emitError).toHaveBeenCalledWith(expect.objectContaining({
        code: 'INVALID_SOURCE_TYPE'
      }))
    })

    it('imports file image and adds it to canvas', async() => {
      const image = createMockFabricImage({ width: 200, height: 150 })
      mockFabricImageFromURL(image)

      const file = new File(['mock'], 'image.png', { type: 'image/png' })
      const result = await imageManager.importImage({ source: file })

      expect(result).toEqual(expect.objectContaining({
        image,
        format: 'png',
        contentType: 'image/png'
      }))
      expect(mockCreateObjectURL).toHaveBeenCalledWith(file)
      expect(mockCanvas.add).toHaveBeenCalledWith(image)
      expect(mockCanvas.centerObject).toHaveBeenCalledWith(image)
      expect(mockCanvas.setActiveObject).toHaveBeenCalledWith(image)
      expect(mockCanvas.renderAll).toHaveBeenCalled()
      expect(mockEditor.historyManager.saveState).toHaveBeenCalled()
      expect(mockCanvas.fire).toHaveBeenCalledWith('editor:image-imported', expect.objectContaining({
        image,
        format: 'png'
      }))
      expect(image.id).toBe('image-mock-nanoid-123')
      expect(image.format).toBe('png')
      expect(image.customData).toBeNull()
    })

    it('imports image from URL and uses fetch', async() => {
      jest.spyOn(imageManager, 'getContentType').mockResolvedValue('image/png')
      const image = createMockFabricImage({ width: 200, height: 150 })
      mockFabricImageFromURL(image)

      const result = await imageManager.importImage({ source: 'https://example.com/image.png' })

      expect(result).toEqual(expect.objectContaining({ image }))
      expect(mockFetch).toHaveBeenCalledWith('https://example.com/image.png', { mode: 'cors' })
      expect(mockCreateObjectURL).toHaveBeenCalled()
    })

    it('imports SVG through loadSVGFromURL', async() => {
      const svgFile = new File(['<svg></svg>'], 'image.svg', { type: 'image/svg+xml' })

      const mockLoadSVGFromURL = loadSVGFromURL as jest.MockedFunction<typeof loadSVGFromURL>
      mockLoadSVGFromURL.mockResolvedValue({ objects: [], options: {} } as any)

      const result = await imageManager.importImage({ source: svgFile, withoutAdding: true })

      expect(result).toEqual(expect.objectContaining({ format: 'svg' }))
      expect(mockLoadSVGFromURL).toHaveBeenCalled()
      expect(mockCanvas.fire).toHaveBeenCalledWith('editor:image-imported', expect.objectContaining({
        format: 'svg'
      }))
    })

    it('rescales montage when scale-montage is selected', async() => {
      const image = createMockFabricImage({ width: 200, height: 150 })
      mockFabricImageFromURL(image)

      const file = new File(['mock'], 'image.png', { type: 'image/png' })
      await imageManager.importImage({ source: file, scale: 'scale-montage', withoutAdding: true })

      expect(mockEditor.canvasManager.scaleMontageAreaToImage).toHaveBeenCalledWith({
        object: image,
        withoutSave: true
      })
      expect(mockCanvas.add).not.toHaveBeenCalled()
    })

    it('fits object when image-contain with scale factor < 1', async() => {
      const image = createMockFabricImage({ width: 200, height: 150 })
      mockFabricImageFromURL(image)

      jest.spyOn(imageManager, 'calculateScaleFactor').mockReturnValue(0.5)

      const file = new File(['mock'], 'image.png', { type: 'image/png' })
      await imageManager.importImage({ source: file, scale: 'image-contain', withoutAdding: true })

      expect(mockEditor.transformManager.fitObject).toHaveBeenCalledWith({
        object: image,
        type: 'contain',
        withoutSave: true
      })
    })

    it('fits object when image-cover and image exceeds montage', async() => {
      const image = createMockFabricImage({ width: 800, height: 600 })
      mockFabricImageFromURL(image)

      const file = new File(['mock'], 'image.png', { type: 'image/png' })
      await imageManager.importImage({ source: file, scale: 'image-cover', withoutAdding: true })

      expect(mockEditor.transformManager.fitObject).toHaveBeenCalledWith({
        object: image,
        type: 'cover',
        withoutSave: true
      })
    })

    it('returns early when withoutAdding is true', async() => {
      const image = createMockFabricImage({ width: 200, height: 150 })
      mockFabricImageFromURL(image)

      const file = new File(['mock'], 'image.png', { type: 'image/png' })
      const result = await imageManager.importImage({ source: file, withoutAdding: true })

      expect(result).toEqual(expect.objectContaining({ image }))
      expect(mockCanvas.add).not.toHaveBeenCalled()
      expect(mockCanvas.centerObject).not.toHaveBeenCalled()
      expect(mockCanvas.setActiveObject).not.toHaveBeenCalled()
      expect(mockEditor.historyManager.saveState).not.toHaveBeenCalled()
      expect(mockCanvas.fire).toHaveBeenCalledWith('editor:image-imported', expect.any(Object))
    })

    it('downscales oversized image before import', async() => {
      const original = createMockFabricImage({
        width: 5000,
        height: 5000,
        src: 'data:image/png;base64,original'
      })
      const resized = createMockFabricImage({ width: 1000, height: 1000 })
      mockFabricImageFromURL([original, resized])

      const resizeSpy = jest.spyOn(imageManager, 'resizeImageToBoundaries')
        .mockResolvedValue(new Blob(['resized'], { type: 'image/png' }))

      const file = new File(['mock'], 'image.png', { type: 'image/png' })
      await imageManager.importImage({ source: file })

      expect(resizeSpy).toHaveBeenCalledWith(expect.objectContaining({
        dataURL: 'data:image/png;base64,original',
        sizeType: 'max'
      }))
      expect(mockCreateObjectURL).toHaveBeenCalledTimes(2)
    })

    it('upscales undersized image before import', async() => {
      const original = createMockFabricImage({
        width: 10,
        height: 10,
        src: 'data:image/png;base64,small'
      })
      const resized = createMockFabricImage({ width: 32, height: 32 })
      mockFabricImageFromURL([original, resized])

      const resizeSpy = jest.spyOn(imageManager, 'resizeImageToBoundaries')
        .mockResolvedValue(new Blob(['resized'], { type: 'image/png' }))

      const file = new File(['mock'], 'image.png', { type: 'image/png' })
      await imageManager.importImage({ source: file })

      expect(resizeSpy).toHaveBeenCalledWith(expect.objectContaining({
        dataURL: 'data:image/png;base64,small',
        sizeType: 'min'
      }))
      expect(mockCreateObjectURL).toHaveBeenCalledTimes(2)
    })
  })

  describe('resizeImageToBoundaries', () => {
    it('emits warning and resizes to max size', async() => {
      const result = await imageManager.resizeImageToBoundaries({
        dataURL: 'data:image/png;base64,mock',
        sizeType: 'max'
      })

      expect(result).toBeInstanceOf(Blob)
      expect(mockEditor.errorManager.emitWarning).toHaveBeenCalledWith(expect.objectContaining({
        code: 'IMAGE_RESIZE_WARNING'
      }))
      expect(mockWorkerManager.post).toHaveBeenCalledWith('resizeImage', expect.objectContaining({
        sizeType: 'max'
      }))
    })

    it('emits warning for min size', async() => {
      await imageManager.resizeImageToBoundaries({
        dataURL: 'data:image/png;base64,mock',
        sizeType: 'min'
      })

      expect(mockEditor.errorManager.emitWarning).toHaveBeenCalledWith(expect.objectContaining({
        code: 'IMAGE_RESIZE_WARNING'
      }))
    })

    it('skips warning when emitMessage is false', async() => {
      await imageManager.resizeImageToBoundaries({
        dataURL: 'data:image/png;base64,mock',
        emitMessage: false
      })

      expect(mockEditor.errorManager.emitWarning).not.toHaveBeenCalled()
    })

    it('returns base64 when asBase64 is true', async() => {
      jest.spyOn(imageManager, 'getContentTypeFromUrl').mockResolvedValue('image/png')
      mockWorkerManager.post = jest.fn((action: string) => {
        if (action === 'resizeImage') {
          return Promise.resolve(new Blob(['mock'], { type: 'image/png' }))
        }
        return Promise.resolve('data:image/png;base64,converted')
      })

      const result = await imageManager.resizeImageToBoundaries({
        dataURL: 'data:image/png;base64,mock',
        asBase64: true
      })

      expect(result).toBe('data:image/png;base64,converted')
      expect(mockWorkerManager.post).toHaveBeenCalledWith('toDataURL', expect.any(Object), expect.any(Array))
    })
  })

  describe('exportCanvasAsImageFile', () => {
    it('exports canvas as PNG file by default', async() => {
      const result = await imageManager.exportCanvasAsImageFile()

      expect(result).toEqual(expect.objectContaining({
        format: 'png',
        contentType: 'image/png',
        fileName: 'image.png'
      }))
      expect(mockCanvas.clone).toHaveBeenCalled()
      expect(mockCanvas.fire).toHaveBeenCalledWith('editor:canvas-exported', expect.any(Object))
    })

    it('exports canvas as Blob when exportAsBlob is true', async() => {
      const result = await imageManager.exportCanvasAsImageFile({ exportAsBlob: true })

      expect(result?.image).toBeInstanceOf(Blob)
      expect(mockCanvas.fire).toHaveBeenCalledWith('editor:canvas-exported', expect.any(Object))
    })

    it('exports canvas as base64 when exportAsBase64 is true', async() => {
      mockWorkerManager.post.mockResolvedValueOnce('data:image/png;base64,canvas')

      const result = await imageManager.exportCanvasAsImageFile({ exportAsBase64: true })

      expect(result).toEqual(expect.objectContaining({
        image: 'data:image/png;base64,canvas'
      }))
      expect(mockCreateImageBitmap).toHaveBeenCalled()
    })

    it('sets white background for JPG export', async() => {
      const { clone } = createMockCanvasClone({
        objects: [{ id: mockEditor.montageArea.id, visible: true }]
      })
      mockCanvas.clone.mockResolvedValueOnce(clone)

      await imageManager.exportCanvasAsImageFile({ contentType: 'image/jpeg', exportAsBlob: true })

      expect(clone.backgroundColor).toBe('#ffffff')
    })

    it('exports canvas as PDF base64', async() => {
      mockWorkerManager.post.mockResolvedValueOnce('data:image/png;base64,canvas')

      const result = await imageManager.exportCanvasAsImageFile({
        contentType: 'application/pdf',
        exportAsBase64: true
      })

      expect(mockModuleLoader.loadModule).toHaveBeenCalled()
      expect(result).toEqual(expect.objectContaining({
        format: 'pdf',
        contentType: 'application/pdf',
        image: 'data:application/pdf;base64,mock-pdf'
      }))
    })

    it('exports canvas as SVG when all objects are SVG', async() => {
      const { clone } = createMockCanvasClone({
        objects: [
          { id: mockEditor.montageArea.id, format: 'svg', visible: true },
          { id: 'obj-1', format: 'svg', visible: true }
        ]
      })
      mockCanvas.clone.mockResolvedValueOnce(clone)

      const result = await imageManager.exportCanvasAsImageFile({ contentType: 'image/svg+xml' })

      expect(clone.toSVG).toHaveBeenCalled()
      expect(result).toEqual(expect.objectContaining({
        contentType: 'image/svg+xml',
        fileName: 'image.svg'
      }))
    })

    it('adjusts extension when requested SVG has non-SVG objects', async() => {
      const { clone } = createMockCanvasClone({
        objects: [
          { id: mockEditor.montageArea.id, format: 'svg', visible: true },
          { id: 'obj-1', format: 'png', visible: true }
        ]
      })
      mockCanvas.clone.mockResolvedValueOnce(clone)

      const result = await imageManager.exportCanvasAsImageFile({
        contentType: 'image/svg+xml',
        fileName: 'vector.svg'
      })

      expect(result?.fileName).toBe('vector.png')
    })

    it('emits error when canvas blob creation fails', async() => {
      const { clone } = createMockCanvasClone({
        objects: [{ id: mockEditor.montageArea.id, visible: true }],
        toBlobSucceeds: false
      })
      mockCanvas.clone.mockResolvedValueOnce(clone)

      const result = await imageManager.exportCanvasAsImageFile()

      expect(result).toBeNull()
      expect(mockEditor.errorManager.emitError).toHaveBeenCalledWith(expect.objectContaining({
        code: 'IMAGE_EXPORT_FAILED'
      }))
    })
  })

  describe('exportObjectAsImageFile', () => {
    it('returns null when no active object', async() => {
      mockCanvas.getActiveObject.mockReturnValue(null)

      const result = await imageManager.exportObjectAsImageFile()

      expect(result).toBeNull()
      expect(mockEditor.errorManager.emitError).toHaveBeenCalledWith(expect.objectContaining({
        code: 'NO_OBJECT_SELECTED'
      }))
    })

    it('exports SVG object as SVG file', async() => {
      const { object } = createMockExportableObject()
      mockCanvas.getActiveObject.mockReturnValue(object)

      const result = await imageManager.exportObjectAsImageFile({ contentType: 'image/svg+xml' })

      expect(result).toEqual(expect.objectContaining({
        contentType: 'image/svg+xml',
        fileName: 'image.svg'
      }))
      expect(mockCanvas.fire).toHaveBeenCalledWith('editor:object-exported', expect.any(Object))
    })

    it('exports FabricImage as base64', async() => {
      const image = createMockFabricImage({ width: 200, height: 150 })
      mockCanvas.getActiveObject.mockReturnValue(image)

      mockWorkerManager.post.mockResolvedValueOnce('data:image/png;base64,object')

      const result = await imageManager.exportObjectAsImageFile({ exportAsBase64: true })

      expect(result).toEqual(expect.objectContaining({
        image: 'data:image/png;base64,object'
      }))
    })

    it('exports object as Blob when exportAsBlob is true', async() => {
      const { object } = createMockExportableObject()
      mockCanvas.getActiveObject.mockReturnValue(object)

      const result = await imageManager.exportObjectAsImageFile({ exportAsBlob: true })

      expect(result?.image).toBeInstanceOf(Blob)
    })

    it('exports object as File by default', async() => {
      const { object } = createMockExportableObject()
      mockCanvas.getActiveObject.mockReturnValue(object)

      const result = await imageManager.exportObjectAsImageFile()

      expect(result?.image).toBeInstanceOf(File)
      expect(result?.contentType).toBe('image/png')
    })

    it('emits error when object blob creation fails', async() => {
      const { object } = createMockExportableObject({ toBlobSucceeds: false })
      mockCanvas.getActiveObject.mockReturnValue(object)

      const result = await imageManager.exportObjectAsImageFile()

      expect(result).toBeNull()
      expect(mockEditor.errorManager.emitError).toHaveBeenCalledWith(expect.objectContaining({
        code: 'IMAGE_EXPORT_FAILED'
      }))
    })
  })

  describe('utils', () => {
    it('gets allowed formats from content types', () => {
      imageManager.acceptContentTypes = ['image/png', 'image/svg+xml']

      expect(imageManager.getAllowedFormatsFromContentTypes()).toEqual(['png', 'svg'])
    })

    it('checks allowed content types', () => {
      expect(imageManager.isAllowedContentType('image/png')).toBe(true)
      expect(imageManager.isAllowedContentType('image/gif')).toBe(false)
    })

    it('gets content type from file or URL', async() => {
      const file = new File(['mock'], 'image.png', { type: 'image/png' })
      expect(await imageManager.getContentType(file)).toBe('image/png')

      jest.spyOn(imageManager, 'getContentTypeFromUrl').mockResolvedValue('image/jpeg')
      expect(await imageManager.getContentType('https://example.com/image.jpg')).toBe('image/jpeg')
    })

    it('gets content type from data URL', async() => {
      const result = await imageManager.getContentTypeFromUrl('data:image/webp;base64,abc')
      expect(result).toBe('image/webp')
    })

    it('gets content type from HEAD response', async() => {
      mockFetch.mockResolvedValueOnce({
        headers: { get: jest.fn(() => 'image/jpeg; charset=utf-8') }
      })

      const result = await imageManager.getContentTypeFromUrl('https://example.com/image.jpg')

      expect(result).toBe('image/jpeg')
      expect(mockFetch).toHaveBeenCalledWith('https://example.com/image.jpg', { method: 'HEAD' })
    })

    it('falls back to extension when HEAD fails', async() => {
      const restoreConsole = suppressConsoleWarnings()
      mockFetch.mockRejectedValueOnce(new Error('head failed'))

      const result = await imageManager.getContentTypeFromUrl('https://example.com/image.png')

      expect(result).toBe('image/png')
      restoreConsole()
    })

    it('falls back to octet-stream for invalid URL', () => {
      const restoreConsole = suppressConsoleWarnings()
      const result = imageManager.getContentTypeFromExtension('not-a-url')

      expect(result).toBe('application/octet-stream')
      restoreConsole()
    })

    it('calculates scale factor for contain and cover', () => {
      const contain = imageManager.calculateScaleFactor({
        imageObject: { width: 200, height: 100 } as any,
        scaleType: 'contain'
      })
      const cover = imageManager.calculateScaleFactor({
        imageObject: { width: 200, height: 100 } as any,
        scaleType: 'cover'
      })

      expect(contain).toBe(2)
      expect(cover).toBe(3)
    })

    it('returns 1 when montage area is missing', () => {
      const previousMontage = imageManager.editor.montageArea
      imageManager.editor.montageArea = null

      const result = imageManager.calculateScaleFactor({
        imageObject: { width: 200, height: 100 } as any,
        scaleType: 'contain'
      })

      expect(result).toBe(1)
      imageManager.editor.montageArea = previousMontage
    })

    it('extracts format from content type', () => {
      expect(imageManager.getFormatFromContentType('image/svg+xml')).toBe('svg')
      expect(imageManager.getFormatFromContentType('application/pdf')).toBe('pdf')
      expect(imageManager.getFormatFromContentType('')).toBe('')
    })
  })

  describe('revokeBlobUrls', () => {
    it('revokes all created blob URLs', () => {
      (imageManager as any)._createdBlobUrls = ['blob:mock-1', 'blob:mock-2']

      imageManager.revokeBlobUrls()

      expect(mockRevokeObjectURL.mock.calls[0][0]).toBe('blob:mock-1')
      expect(mockRevokeObjectURL.mock.calls[1][0]).toBe('blob:mock-2')
      expect((imageManager as any)._createdBlobUrls).toEqual([])
    })
  })
})
