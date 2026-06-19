/** MIME-тип, который используется, когда формат источника определить нельзя. */
const FALLBACK_CONTENT_TYPE = 'application/octet-stream'

/** Карта MIME-типов, построенная по допустимым contentType редактора. */
interface MimeTypeByExtension {
  [extension: string]: string
}

/** Возвращает subtype из MIME-типа, например `png`, `jpeg` или `svg`. */
export function getFormatFromContentType(contentType = ''): string {
  const match = contentType.match(/^[^/]+\/([^+;]+)/)

  return match ? match[1] : ''
}

/** Получает список расширений, которые соответствуют допустимым MIME-типам. */
export function getAllowedFormatsFromContentTypes({
  acceptContentTypes
}: {
  acceptContentTypes: string[]
}): string[] {
  return acceptContentTypes
    .map((contentType) => getFormatFromContentType(contentType))
    .filter((format) => format !== '')
}

/** Проверяет, входит ли MIME-тип в список разрешённых contentType. */
export function isAllowedContentType({
  contentType = '',
  acceptContentTypes
}: {
  contentType?: string
  acceptContentTypes: string[]
}): boolean {
  return acceptContentTypes.includes(contentType)
}

/** Строит lookup расширение -> MIME-тип из разрешённых contentType. */
function createMimeTypeMap({
  acceptContentTypes
}: {
  acceptContentTypes: string[]
}): MimeTypeByExtension {
  const mimeTypes: MimeTypeByExtension = {}

  acceptContentTypes.forEach((contentType) => {
    const format = getFormatFromContentType(contentType)

    if (format !== '') {
      mimeTypes[format] = contentType
    }
  })

  return mimeTypes
}

/** Определяет MIME-тип по расширению файла в URL. */
export function getContentTypeFromExtension({
  url,
  acceptContentTypes
}: {
  url: string
  acceptContentTypes: string[]
}): string {
  try {
    const urlObject = new URL(url)
    const extension = urlObject.pathname.split('.').pop()?.toLowerCase()
    const mimeTypes = createMimeTypeMap({ acceptContentTypes })

    return extension ? mimeTypes[extension] || FALLBACK_CONTENT_TYPE : FALLBACK_CONTENT_TYPE
  } catch (error) {
    console.warn('Не удалось определить расширение из URL:', url, error)

    return FALLBACK_CONTENT_TYPE
  }
}

/** Получает MIME-тип изображения через data URL, HEAD-запрос или расширение URL. */
export async function getContentTypeFromUrl({
  src,
  acceptContentTypes
}: {
  src: string
  acceptContentTypes: string[]
}): Promise<string> {
  if (src.startsWith('data:')) {
    const match = src.match(/^data:([^;]+)/)

    return match ? match[1] : FALLBACK_CONTENT_TYPE
  }

  try {
    const response = await fetch(src, { method: 'HEAD' })
    const contentType = response.headers.get('content-type')

    if (contentType && contentType.startsWith('image/')) {
      return contentType.split(';')[0]
    }
  } catch (error) {
    console.warn('HEAD запрос неудачен, определяем тип по расширению:', error)
  }

  return getContentTypeFromExtension({ url: src, acceptContentTypes })
}

/** Получает MIME-тип изображения из File или URL-источника. */
export async function getContentType({
  source,
  acceptContentTypes
}: {
  source: File | string
  acceptContentTypes: string[]
}): Promise<string> {
  if (typeof source === 'string') {
    return getContentTypeFromUrl({ src: source, acceptContentTypes })
  }

  return source.type || FALLBACK_CONTENT_TYPE
}
