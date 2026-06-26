/** Проверяет, что src уже является локальным blob URL и не требует подготовки. */
function isBlobUrl({ src }: { src: string }): boolean {
  return src.startsWith('blob:')
}

/** Проверяет, что src является data URL и требует локальной подготовки. */
function isDataUrl({ src }: { src: string }): boolean {
  return src.toLowerCase().startsWith('data:')
}

/** Проверяет, что data URL заявлен как image. */
function isImageDataUrl({ src }: { src: string }): boolean {
  return src.toLowerCase().startsWith('data:image/')
}

/** Проверяет, что browser API не смог прочитать image src и можно оставить исходный src. */
function isRecoverableImageReadError({ error }: { error: unknown }): boolean {
  if (error instanceof TypeError) return true
  if (typeof DOMException !== 'undefined' && error instanceof DOMException) return true

  return false
}

/**
 * Хранит blob URL, созданные ImageManager, и освобождает их при destroy.
 */
export default class BlobUrlRegistry {
  /**
   * Blob URL, которые нужно освободить через URL.revokeObjectURL.
   */
  private urls: string[] = []

  /**
   * Создаёт blob URL для локального Blob/File и запоминает его для последующего revoke.
   */
  public createObjectUrl({ source }: { source: Blob | MediaSource }): string {
    const blobUrl = URL.createObjectURL(source)
    this.urls.push(blobUrl)

    return blobUrl
  }

  /**
   * Возвращает blob URL как есть или создаёт blob URL для data/remote src с кешированием.
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
   * Создаёт blob URL для image data URL. Если browser API не смог прочитать src, возвращает null.
   */
  public async createObjectUrlFromDataUrl({ src }: { src: string }): Promise<string | null> {
    if (!isImageDataUrl({ src })) return null

    const blob = await this.fetchImageDataUrlAsBlob({ src })
    if (!blob) return null

    return this.createObjectUrl({ source: blob })
  }

  /**
   * Читает image data URL через browser fetch/blob API.
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
   * Загружает изображение по URL и возвращает blob URL. Если browser API не смог прочитать src, возвращает null.
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
   * Освобождает все blob URL, созданные этим registry.
   */
  public revokeAll(): void {
    this.urls.forEach((url) => URL.revokeObjectURL(url))
    this.urls = []
  }
}
