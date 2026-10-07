import { english, type Translate } from '../i18n'

/** MIME type used when the source format cannot be determined. */
const FALLBACK_CONTENT_TYPE = 'application/octet-stream'

/** MIME type map built from the editor's allowed contentType values. */
interface MimeTypeByExtension {
  [extension: string]: string
}

/** Checks whether the source is a runtime blob URL. */
function isBlobUrl({ src }: { src: string }): boolean {
  return src.startsWith('blob:')
}

/** Returns the subtype from a MIME type, for example `png`, `jpeg`, or `svg`. */
export function getFormatFromContentType(contentType = ''): string {
  const match = contentType.match(/^[^/]+\/([^+;]+)/)

  return match ? match[1] : ''
}

/** Gets the list of extensions corresponding to the allowed MIME types. */
export function getAllowedFormatsFromContentTypes({
  acceptContentTypes
}: {
  acceptContentTypes: string[]
}): string[] {
  return acceptContentTypes
    .map((contentType) => getFormatFromContentType(contentType))
    .filter((format) => format !== '')
}

/** Checks whether a MIME type is among the allowed contentType values. */
export function isAllowedContentType({
  contentType = '',
  acceptContentTypes
}: {
  contentType?: string
  acceptContentTypes: string[]
}): boolean {
  return acceptContentTypes.includes(contentType)
}

/** Builds an extension -> MIME type lookup from the allowed contentType values. */
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

/** Determines the MIME type from the file extension in the URL. */
export function getContentTypeFromExtension({
  url,
  acceptContentTypes,
  t = english
}: {
  url: string
  t?: Translate
  acceptContentTypes: string[]
}): string {
  try {
    const urlObject = new URL(url)
    const extension = urlObject.pathname.split('.').pop()?.toLowerCase()
    const mimeTypes = createMimeTypeMap({ acceptContentTypes })

    return extension ? mimeTypes[extension] || FALLBACK_CONTENT_TYPE : FALLBACK_CONTENT_TYPE
  } catch (error) {
    console.warn(t('image.warnings.urlExtensionDetectionFailed'), url, error)

    return FALLBACK_CONTENT_TYPE
  }
}

/** Gets an image's MIME type from a blob URL through the browser Blob API. */
async function getContentTypeFromBlobUrl({ src, t }: { src: string; t: Translate }): Promise<string> {
  try {
    const response = await fetch(src)
    const blob = await response.blob()

    if (blob.type && blob.type.startsWith('image/')) {
      return blob.type.split(';')[0]
    }
  } catch (error) {
    console.warn(t('image.warnings.blobMimeTypeDetectionFailed'), error)
  }

  return FALLBACK_CONTENT_TYPE
}

/** Gets an image's MIME type through a blob URL, data URL, HEAD request, or URL extension. */
export async function getContentTypeFromUrl({
  src,
  acceptContentTypes,
  t = english
}: {
  src: string
  t?: Translate
  acceptContentTypes: string[]
}): Promise<string> {
  if (isBlobUrl({ src })) {
    return getContentTypeFromBlobUrl({ src, t })
  }

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
    console.warn(t('image.warnings.headRequestFailed'), error)
  }

  return getContentTypeFromExtension({ url: src, acceptContentTypes, t })
}

/** Gets an image's MIME type from a File or URL source. */
export async function getContentType({
  source,
  acceptContentTypes,
  t = english
}: {
  source: File | string
  t?: Translate
  acceptContentTypes: string[]
}): Promise<string> {
  if (typeof source === 'string') {
    return getContentTypeFromUrl({ src: source, acceptContentTypes, t })
  }

  return source.type || FALLBACK_CONTENT_TYPE
}
