/** Проверяет, что src уже является локальным blob/data URL и не требует fetch. */
function isBlobOrDataUrl({ src }: { src: string }): boolean {
  if (src.startsWith('blob:')) return true
  if (src.startsWith('data:')) return true

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
   * Возвращает blob/data URL как есть или создаёт blob URL для удалённого src с кешированием.
   */
  public async getOrCreateForSource({
    src,
    cache
  }: {
    src: string
    cache: Map<string, string>
  }): Promise<string | null> {
    if (isBlobOrDataUrl({ src })) return src

    if (cache.has(src)) {
      return cache.get(src) ?? null
    }

    const blobUrl = await this.fetchAsBlobUrl({ src })
    if (!blobUrl) return null

    cache.set(src, blobUrl)

    return blobUrl
  }

  /**
   * Загружает изображение по URL и возвращает blob URL. При ошибке возвращает null.
   */
  public async fetchAsBlobUrl({ src }: { src: string }): Promise<string | null> {
    try {
      const response = await fetch(src, { mode: 'cors' })

      if (!response.ok) return null

      const blob = await response.blob()
      const blobUrl = this.createObjectUrl({ source: blob })

      return blobUrl
    } catch {
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
