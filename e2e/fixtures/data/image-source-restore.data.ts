import { Buffer } from 'node:buffer'
import type { CanvasFullState } from '../../../src/editor/history-manager'
import type { TemplateDefinition } from '../../types'

/** Source-case description for the e2e image-restoration test. */
type ImageSourceRestoreCase = {
  historyForbiddenPayloads: readonly string[]
  initialState: CanvasFullState
  initialStateImageId: string
  initialStateTestName: string
  label: string
  source: string
  template: TemplateDefinition
  templateTestName: string
}

/** Mock response for an image loaded by URL in e2e tests. */
type ImageSourceRestoreRouteMock = {
  body: string
  contentType: string
  url: string
}

/** Test-image dimensions for all source cases. */
export const IMAGE_SOURCE_RESTORE_SOURCE_SIZE = {
  width: 160,
  height: 120
} as const

/** Test-image SVG markup for all source cases. */
const IMAGE_SOURCE_RESTORE_MARKUP = [
  '<svg xmlns="http://www.w3.org/2000/svg"',
  ` width="${IMAGE_SOURCE_RESTORE_SOURCE_SIZE.width}" height="${IMAGE_SOURCE_RESTORE_SOURCE_SIZE.height}">`,
  `<rect width="${IMAGE_SOURCE_RESTORE_SOURCE_SIZE.width}"`,
  ` height="${IMAGE_SOURCE_RESTORE_SOURCE_SIZE.height}" fill="#f28f3b"/>`,
  `<rect x="${IMAGE_SOURCE_RESTORE_SOURCE_SIZE.width / 2}"`,
  ` width="${IMAGE_SOURCE_RESTORE_SOURCE_SIZE.width / 2}"`,
  ` height="${IMAGE_SOURCE_RESTORE_SOURCE_SIZE.height}" fill="#2457ff"/>`,
  '</svg>'
].join('')

/** Artboard resolution for source-restoration scenarios. */
export const IMAGE_SOURCE_RESTORE_RESOLUTION = {
  width: 400,
  height: 300
} as const

/** Shared serialized image fields that do not depend on the lifecycle path. */
const IMAGE_SOURCE_RESTORE_BASE_OBJECT = {
  cropX: 0,
  cropY: 0,
  format: 'svg',
  width: 160,
  height: 120,
  evented: true,
  selectable: true,
  lockMovementX: false,
  lockMovementY: false,
  lockRotation: false,
  lockScalingX: false,
  lockScalingY: false,
  lockSkewingX: false,
  lockSkewingY: false,
  type: 'Image',
  version: '7.2.0',
  originX: 'left',
  originY: 'top',
  scaleX: 1,
  scaleY: 1,
  angle: 0,
  flipX: false,
  flipY: false,
  opacity: 1,
  visible: true,
  crossOrigin: 'anonymous',
  filters: []
} as const

/** Auxiliary artboard for the initialState fixture. */
const IMAGE_SOURCE_RESTORE_MONTAGE_OBJECT = {
  id: 'montage-area',
  type: 'Rect',
  version: '7.2.0',
  originX: 'center',
  originY: 'center',
  left: IMAGE_SOURCE_RESTORE_RESOLUTION.width / 2,
  top: IMAGE_SOURCE_RESTORE_RESOLUTION.height / 2,
  width: IMAGE_SOURCE_RESTORE_RESOLUTION.width,
  height: IMAGE_SOURCE_RESTORE_RESOLUTION.height,
  fill: '#ffffff',
  stroke: null,
  strokeWidth: 0,
  selectable: false,
  evented: false,
  hasBorders: false,
  hasControls: false,
  objectCaching: false,
  noScaleCache: true
} as const

/** Base64 source of the test SVG image. */
const IMAGE_SOURCE_RESTORE_BASE64_SOURCE = `data:image/svg+xml;base64,${Buffer
  .from(IMAGE_SOURCE_RESTORE_MARKUP)
  .toString('base64')}`

/** Non-base64 data URL for the test SVG image. */
const IMAGE_SOURCE_RESTORE_DATA_URL_SOURCE = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
  IMAGE_SOURCE_RESTORE_MARKUP
)}`

/** CDN-like URL always intercepted by a route mock in e2e tests. */
const IMAGE_SOURCE_RESTORE_REMOTE_SOURCE = 'https://static.insales-cdn.com/e2e/image-source-restore.svg'

/** Expected object count after restoring one image source. */
export const IMAGE_SOURCE_RESTORE_OBJECT_COUNT = 1

/** Route mock for an image loaded by URL. */
export const IMAGE_SOURCE_RESTORE_ROUTE_MOCK: ImageSourceRestoreRouteMock = {
  body: IMAGE_SOURCE_RESTORE_MARKUP,
  contentType: 'image/svg+xml',
  url: IMAGE_SOURCE_RESTORE_REMOTE_SOURCE
}

/**
 * Creates a template with one image object and the specified src.
 */
function createTemplateWithImageSource({
  id,
  src
}: {
  id: string
  src: string
}): TemplateDefinition {
  return {
    id,
    meta: {
      baseWidth: IMAGE_SOURCE_RESTORE_RESOLUTION.width,
      baseHeight: IMAGE_SOURCE_RESTORE_RESOLUTION.height,
      positionsNormalized: true
    },
    objects: [
      {
        ...IMAGE_SOURCE_RESTORE_BASE_OBJECT,
        id: `${id}-image`,
        left: 0.2,
        top: 0.2,
        src
      }
    ]
  }
}

/**
 * Creates an initialState with one image object and the specified src.
 */
function createInitialStateWithImageSource({
  id,
  src
}: {
  id: string
  src: string
}): CanvasFullState {
  return {
    version: '7.2.0',
    width: IMAGE_SOURCE_RESTORE_RESOLUTION.width,
    height: IMAGE_SOURCE_RESTORE_RESOLUTION.height,
    clipPath: null,
    objects: [
      IMAGE_SOURCE_RESTORE_MONTAGE_OBJECT,
      {
        ...IMAGE_SOURCE_RESTORE_BASE_OBJECT,
        id: `${id}-image`,
        left: 80,
        top: 60,
        src
      }
    ]
  }
}

/** Image src cases that should work identically for templates and initialState. */
export const IMAGE_SOURCE_RESTORE_CASES: ImageSourceRestoreCase[] = [
  {
    initialStateImageId: 'initial-state-image-source-base64-image',
    label: 'Картинка в base64',
    source: IMAGE_SOURCE_RESTORE_BASE64_SOURCE,
    historyForbiddenPayloads: [
      IMAGE_SOURCE_RESTORE_BASE64_SOURCE,
      'data:image/svg+xml;base64'
    ],
    templateTestName:
      'картинка в base64 из шаблона после scale остаётся blob-ссылкой и не возвращает исходные данные в историю',
    initialStateTestName:
      'картинка в base64 из начального состояния загружается как blob-ссылка и не возвращает исходные данные в историю',
    template: createTemplateWithImageSource({
      id: 'template-image-source-base64',
      src: IMAGE_SOURCE_RESTORE_BASE64_SOURCE
    }),
    initialState: createInitialStateWithImageSource({
      id: 'initial-state-image-source-base64',
      src: IMAGE_SOURCE_RESTORE_BASE64_SOURCE
    })
  },
  {
    initialStateImageId: 'initial-state-image-source-data-url-image',
    label: 'Картинка из data URL без base64',
    source: IMAGE_SOURCE_RESTORE_DATA_URL_SOURCE,
    historyForbiddenPayloads: [
      IMAGE_SOURCE_RESTORE_DATA_URL_SOURCE,
      'data:image/svg+xml;charset=utf-8'
    ],
    templateTestName:
      'картинка из data URL без base64 после scale остаётся blob-ссылкой и не возвращает исходные данные в историю',
    // eslint-disable-next-line max-len
    initialStateTestName: 'картинка из data URL без base64 в начальном состоянии загружается как blob-ссылка и не возвращает исходные данные в историю',
    template: createTemplateWithImageSource({
      id: 'template-image-source-data-url',
      src: IMAGE_SOURCE_RESTORE_DATA_URL_SOURCE
    }),
    initialState: createInitialStateWithImageSource({
      id: 'initial-state-image-source-data-url',
      src: IMAGE_SOURCE_RESTORE_DATA_URL_SOURCE
    })
  },
  {
    initialStateImageId: 'initial-state-image-source-link-image',
    label: 'Картинка по ссылке',
    source: IMAGE_SOURCE_RESTORE_REMOTE_SOURCE,
    historyForbiddenPayloads: [
      IMAGE_SOURCE_RESTORE_REMOTE_SOURCE
    ],
    templateTestName:
      'картинка по ссылке из шаблона после scale остаётся blob-ссылкой и не возвращает исходную ссылку в историю',
    // eslint-disable-next-line max-len
    initialStateTestName: 'картинка по ссылке из начального состояния загружается как blob-ссылка и не возвращает исходную ссылку в историю',
    template: createTemplateWithImageSource({
      id: 'template-image-source-link',
      src: IMAGE_SOURCE_RESTORE_REMOTE_SOURCE
    }),
    initialState: createInitialStateWithImageSource({
      id: 'initial-state-image-source-link',
      src: IMAGE_SOURCE_RESTORE_REMOTE_SOURCE
    })
  }
]
