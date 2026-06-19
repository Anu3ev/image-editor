import type { ImageManagerEditor } from './types'

/** Параметры конвертации Blob в data URL через worker редактора. */
interface BlobDataUrlConversionParams {
  editor: ImageManagerEditor
  blob: Blob
  contentType: string
}

/**
 * Преобразует SVG-строку в Blob, файл, или base64.
 */
export function exportSVGStringAsFile(
  svgString: string,
  {
    exportAsBase64,
    exportAsBlob,
    fileName = 'image.svg'
  }: {
    exportAsBase64?: boolean,
    exportAsBlob?: boolean,
    fileName?: string
  } = {}
): Blob | Base64URLString | File {
  if (exportAsBlob) {
    return new Blob([svgString], { type: 'image/svg+xml' })
  }

  if (exportAsBase64) {
    return `data:image/svg+xml;base64,${window.btoa(encodeURIComponent(svgString))}`
  }

  return new File([svgString], fileName.replace(/\.[^/.]+$/, '.svg'), { type: 'image/svg+xml' })
}

/**
 * Конвертирует Blob в data URL через worker.
 */
export async function convertBlobToDataUrl({
  editor,
  blob,
  contentType
}: BlobDataUrlConversionParams): Promise<Base64URLString> {
  const bitmap = await createImageBitmap(blob)

  const dataUrl = await editor.workerManager.post(
    'toDataURL',
    {
      contentType,
      quality: 1,
      bitmap
    },
    [bitmap]
  )

  if (typeof dataUrl !== 'string') {
    throw new Error('toDataURL worker должен вернуть строку')
  }

  return dataUrl as Base64URLString
}
