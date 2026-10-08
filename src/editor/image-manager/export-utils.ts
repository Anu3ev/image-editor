import { english, type Translate } from '../i18n'
import type { ImageManagerEditor } from './types'

/** Options for converting a Blob to a data URL through the editor worker. */
interface BlobDataUrlConversionParams {
  editor: ImageManagerEditor
  blob: Blob
  contentType: string
}

/**
 * Converts an SVG string to a Blob, file, or base64.
 */
export function exportSVGStringAsFile(
  svgString: string,
  {
    exportAsBase64,
    exportAsBlob,
    t = english,
    fileName = t('image.filenames.defaultSvg')
  }: {
    exportAsBase64?: boolean,
    exportAsBlob?: boolean,
    fileName?: string
    t?: Translate
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
 * Converts a Blob to a data URL through the worker.
 */
export async function convertBlobToDataUrl({
  editor,
  blob,
  contentType
}: BlobDataUrlConversionParams): Promise<Base64URLString> {
  const bitmap = await createImageBitmap(blob)

  try {
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
      throw new Error('The toDataURL worker must return a string')
    }

    return dataUrl as Base64URLString
  } finally {
    // After a successful transfer, close() is safe; if sending fails, it releases the local bitmap.
    bitmap.close()
  }
}
