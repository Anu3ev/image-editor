/** Checks whether src is already a local blob URL and needs no preparation. */
function isBlobUrl({ src }: { src: string }): boolean {
  return src.startsWith('blob:')
}

/** Checks whether src is a data URL and needs local preparation. */
function isDataUrl({ src }: { src: string }): boolean {
  return src.toLowerCase().startsWith('data:')
}

/** Checks whether the data URL declares an image type. */
function isImageDataUrl({ src }: { src: string }): boolean {
  return src.toLowerCase().startsWith('data:image/')
}

/** Checks whether the browser API failed to read the image src and the original src can be kept. */
function isRecoverableImageReadError({ error }: { error: unknown }): boolean {
  if (error instanceof TypeError) return true
  if (typeof DOMException !== 'undefined' && error instanceof DOMException) return true

  return false
}

/**
 * Tracks blob URLs created by ImageManager and releases them on destroy.
 */
export default class BlobUrlRegistry {
  /**
   * Blob URLs to release through URL.revokeObjectURL.
   */
  private urls: string[] = []

  /**
   * Creates a blob URL for a local Blob/File and tracks it for later revocation.
   */
  public createObjectUrl({ source }: { source: Blob | MediaSource }): string {
    const blobUrl = URL.createObjectURL(source)
    this.urls.push(blobUrl)

    return blobUrl
  }

  /**
   * Returns a blob URL unchanged or creates a cached blob URL for a data/remote src.
   */
  public async getOrCreateForSource({
    src,
    cache
  }: {
    src: string
    cache: Map<string, string>
  }): Promise<string | null> {
    if (isBlobUrl({ src })) return src

    const cachedBlobUrl = cache.get(src)
    if (cachedBlobUrl) return cachedBlobUrl

    if (isDataUrl({ src })) {
      const blobUrl = await this.createObjectUrlFromDataUrl({ src })
      if (!blobUrl) return null

      cache.set(src, blobUrl)

      return blobUrl
    }

    const blobUrl = await this.fetchAsBlobUrl({ src })
    if (!blobUrl) return null

    cache.set(src, blobUrl)

    return blobUrl
  }

  /**
   * Creates a blob URL for an image data URL. Returns null if the browser API cannot read src.
   */
  public async createObjectUrlFromDataUrl({ src }: { src: string }): Promise<string | null> {
    if (!isImageDataUrl({ src })) return null

    const blob = await this.fetchImageDataUrlAsBlob({ src })
    if (!blob) return null

    return this.createObjectUrl({ source: blob })
  }

  /**
   * Reads an image data URL through the browser fetch/blob API.
   */
  private async fetchImageDataUrlAsBlob({ src }: { src: string }): Promise<Blob | null> {
    try {
      const response = await fetch(src)
      if (!response.ok) return null

      const blob = await response.blob()
      if (!blob.type.toLowerCase().startsWith('image/')) return null

      return blob
    } catch (error) {
      if (!isRecoverableImageReadError({ error })) throw error

      return null
    }
  }

  /**
   * Loads an image by URL and returns a blob URL. Returns null if the browser API cannot read src.
   */
  public async fetchAsBlobUrl({ src }: { src: string }): Promise<string | null> {
    try {
      const response = await fetch(src, { mode: 'cors' })

      if (!response.ok) return null

      const blob = await response.blob()
      const blobUrl = this.createObjectUrl({ source: blob })

      return blobUrl
    } catch (error) {
      if (!isRecoverableImageReadError({ error })) throw error

      return null
    }
  }

  /**
   * Releases all blob URLs created by this registry.
   */
  public revokeAll(): void {
    this.urls.forEach((url) => URL.revokeObjectURL(url))
    this.urls = []
  }
}
