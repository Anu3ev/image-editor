import { FabricImage } from 'fabric'
import ImageManager from '../../src/editor/image-manager'
import { createManagerTestMocks } from './editor-helpers'

type ImageManagerSetupOptions = {
  acceptContentTypes?: string[]
  cloneObjects?: any[]
  cloneBlob?: Blob
  cloneSvgString?: string
  cloneToBlobSucceeds?: boolean
}

export const defaultAcceptContentTypes = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/svg+xml',
  'image/webp'
]

export class MockJsPDF {
  addImage = jest.fn()

  output = jest.fn((type?: string) => {
    if (type === 'datauristring') {
      return 'data:application/pdf;base64,mock-pdf'
    }
    if (type === 'blob') {
      return new Blob(['mock-pdf'], { type: 'application/pdf' })
    }
    return ''
  })
}

export const createWorkerManagerMock = () => ({
  post: jest.fn((action: string) => {
    if (action === 'resizeImage') {
      return Promise.resolve(new Blob(['mock'], { type: 'image/png' }))
    }
    if (action === 'toDataURL') {
      return Promise.resolve('data:image/png;base64,mock')
    }
    return Promise.resolve(null)
  })
})

export const createModuleLoaderMock = () => ({
  loadModule: jest.fn(async() => ({ jsPDF: MockJsPDF }))
})

export const setupImageManagerGlobalMocks = () => {
  const globalRef = globalThis as any
  const originalFetch = globalRef.fetch
  const originalCreateImageBitmap = globalRef.createImageBitmap
  const originalCreateObjectURL = URL.createObjectURL
  const originalRevokeObjectURL = URL.revokeObjectURL

  let blobCounter = 0

  const mockFetch = jest.fn(async() => ({
    blob: async() => new Blob(['mock'], { type: 'image/png' }),
    headers: {
      get: jest.fn(() => 'image/png')
    }
  }))
  const mockCreateImageBitmap = jest.fn(async() => ({}))
  const mockCreateObjectURL = jest.fn(() => `blob:mock-${blobCounter += 1}`)
  const mockRevokeObjectURL = jest.fn()

  globalRef.fetch = mockFetch
  globalRef.createImageBitmap = mockCreateImageBitmap
  URL.createObjectURL = mockCreateObjectURL
  URL.revokeObjectURL = mockRevokeObjectURL

  const restore = () => {
    globalRef.fetch = originalFetch
    globalRef.createImageBitmap = originalCreateImageBitmap
    URL.createObjectURL = originalCreateObjectURL
    URL.revokeObjectURL = originalRevokeObjectURL
  }

  return {
    mockFetch,
    mockCreateImageBitmap,
    mockCreateObjectURL,
    mockRevokeObjectURL,
    restore
  }
}

export const createMockCanvasClone = ({
  objects = [],
  blob = new Blob(['mock'], { type: 'image/png' }),
  svgString = '<svg></svg>',
  toBlobSucceeds = true
}: {
  objects?: any[]
  blob?: Blob
  svgString?: string
  toBlobSucceeds?: boolean
} = {}) => {
  const element = {
    toBlob: jest.fn((callback: (value: Blob | null) => void) => {
      callback(toBlobSucceeds ? blob : null)
    })
  }

  const clone = {
    enableRetinaScaling: true,
    backgroundColor: '',
    viewportTransform: [1, 0, 0, 1, 0, 0] as any,
    getObjects: jest.fn().mockReturnValue(objects),
    getElement: jest.fn().mockReturnValue(element),
    setDimensions: jest.fn(),
    renderAll: jest.fn(),
    dispose: jest.fn(),
    toSVG: jest.fn().mockReturnValue(svgString)
  }

  return { clone, element }
}

const createMockImageElement = (src: string) => {
  const img = new Image()
  img.src = src
  return img
}

const createMockCanvasElement = (dataUrl: string) => {
  const canvas = document.createElement('canvas')
  canvas.toDataURL = jest.fn(() => dataUrl)
  return canvas
}

export const createMockFabricImage = ({
  width = 100,
  height = 100,
  src = 'data:image/png;base64,mock',
  elementType = 'img'
}: {
  width?: number
  height?: number
  src?: string
  elementType?: 'img' | 'canvas'
} = {}) => {
  const image = new FabricImage({ width, height, src })
  image.width = width
  image.height = height

  const element = elementType === 'canvas'
    ? createMockCanvasElement(src)
    : createMockImageElement(src)

  image.getElement = jest.fn(() => element)

  return image
}

export const createMockExportableObject = ({
  svgString = '<svg></svg>',
  blob = new Blob(['mock'], { type: 'image/png' }),
  toBlobSucceeds = true
}: {
  svgString?: string
  blob?: Blob
  toBlobSucceeds?: boolean
} = {}) => {
  const element = {
    toBlob: jest.fn((callback: (value: Blob | null) => void) => {
      callback(toBlobSucceeds ? blob : null)
    })
  }

  const object = {
    toSVG: jest.fn(() => svgString),
    toCanvasElement: jest.fn(() => element)
  }

  return { object, element }
}

export const mockFabricImageFromURL = (images: FabricImage | FabricImage[]) => {
  const spy = jest.spyOn(FabricImage, 'fromURL')

  if (Array.isArray(images)) {
    images.forEach((image) => {
      spy.mockResolvedValueOnce(image)
    })
  } else {
    spy.mockResolvedValue(images)
  }

  return spy
}

export const suppressConsoleWarnings = () => {
  const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
  const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

  return () => {
    warnSpy.mockRestore()
    errorSpy.mockRestore()
  }
}

export const createImageManagerTestSetup = (options: ImageManagerSetupOptions = {}) => {
  const globalMocks = setupImageManagerGlobalMocks()
  const { mockEditor, mockCanvas, mockMontageArea } = createManagerTestMocks()

  mockEditor.options.acceptContentTypes = options.acceptContentTypes || defaultAcceptContentTypes
  mockEditor.canvasManager.scaleMontageAreaToImage = jest.fn()

  const mockWorkerManager = createWorkerManagerMock()
  const mockModuleLoader = createModuleLoaderMock()

  mockEditor.workerManager = mockWorkerManager
  mockEditor.moduleLoader = mockModuleLoader

  const cloneObjects = options.cloneObjects || [
    { id: mockMontageArea.id, visible: true },
    { id: 'object-1', format: 'png', visible: true }
  ]

  const { clone, element } = createMockCanvasClone({
    objects: cloneObjects,
    blob: options.cloneBlob,
    svgString: options.cloneSvgString,
    toBlobSucceeds: options.cloneToBlobSucceeds
  })

  mockCanvas.clone = jest.fn().mockResolvedValue(clone)

  const imageManager = new ImageManager({ editor: mockEditor })

  return {
    imageManager,
    mockEditor,
    mockCanvas,
    mockMontageArea,
    mockWorkerManager,
    mockModuleLoader,
    mockCanvasClone: clone,
    mockCanvasCloneElement: element,
    ...globalMocks
  }
}
