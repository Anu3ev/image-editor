import type { jsPDF } from 'jspdf'
import { english, type Translate } from '../i18n'
/* eslint-disable no-use-before-define -- Keep the public entry point above the internal export details. */

import type {
  exportCanvasAsImageFileOptions,
  ImageManagerEditor,
  SuccessfulExportResult
} from './types'
import { getFormatFromContentType } from './image-format'
import {
  convertBlobToDataUrl,
  exportSVGStringAsFile
} from './export-utils'

/** Prepared artboard export options. */
export interface CanvasExportRequest {
  fileName: string
  contentType: string
  exportAsBase64: boolean
  exportAsBlob: boolean
  exportContentType: string
  format: string
  isPDF: boolean
}

/** Dimensions of the artboard being exported. */
interface CanvasExportSize {
  width: number
  height: number
}

/** Snapshot that can be returned as SVG without rasterization. */
interface CanvasSvgExportSnapshot extends CanvasExportSize {
  type: 'svg'
  svgString: string
}

/** Snapshot that must be exported through a canvas bitmap. */
interface CanvasRasterExportSnapshot extends CanvasExportSize {
  type: 'raster'
  blob: Blob
  allCanvasItemsAreSVG: boolean
}

/** Snapshot of the cloned artboard. */
export type CanvasExportSnapshot = CanvasSvgExportSnapshot | CanvasRasterExportSnapshot

/** jsPDF module, loaded lazily for PDF export. */
interface JsPDFModule {
  jsPDF: typeof jsPDF
}

/**
 * Normalizes canvas export input options.
 */
export function createCanvasExportRequest({
  options,
  t = english
}: {
  t?: Translate
  options: exportCanvasAsImageFileOptions
}): CanvasExportRequest {
  const {
    fileName = t('image.filenames.defaultPng'),
    contentType = 'image/png',
    exportAsBase64 = false,
    exportAsBlob = false
  } = options
  const isPDF = contentType === 'application/pdf'
  const exportContentType = isPDF ? 'image/jpeg' : contentType
  const format = getFormatFromContentType(exportContentType)

  return {
    fileName,
    contentType,
    exportAsBase64,
    exportAsBlob,
    exportContentType,
    format,
    isPDF
  }
}

/**
 * Creates an artboard snapshot at its original scale.
 */
export async function createCanvasExportSnapshot({
  editor,
  request
}: {
  editor: ImageManagerEditor
  request: CanvasExportRequest
}): Promise<CanvasExportSnapshot> {
  const { canvas, canvasManager } = editor
  const {
    left,
    top,
    width,
    height
  } = canvasManager.getMontageAreaSceneBounds()
  const tmpCanvas = await canvas.clone(['id', 'format', 'locked'])

  try {
    prepareClonedCanvasForExport({
      editor,
      tmpCanvas,
      left,
      top,
      width,
      height,
      contentType: request.exportContentType
    })

    const allCanvasItemsAreSVG = tmpCanvas.getObjects()
      .filter((object) => object.format)
      .every((object) => object.format === 'svg')

    if (request.format === 'svg' && allCanvasItemsAreSVG) {
      return {
        type: 'svg',
        svgString: tmpCanvas.toSVG(),
        width,
        height
      }
    }

    return {
      type: 'raster',
      blob: await createCanvasBlob({
        t: editor.t,
        canvasElement: tmpCanvas.getElement(),
        contentType: request.exportContentType
      }),
      allCanvasItemsAreSVG,
      width,
      height
    }
  } finally {
    tmpCanvas.dispose()
  }
}

/**
 * Prepares a canvas clone for artboard export.
 */
function prepareClonedCanvasForExport({
  editor,
  tmpCanvas,
  left,
  top,
  width,
  height,
  contentType
}: {
  editor: ImageManagerEditor
  tmpCanvas: Awaited<ReturnType<ImageManagerEditor['canvas']['clone']>>
  left: number
  top: number
  width: number
  height: number
  contentType: string
}): void {
  tmpCanvas.enableRetinaScaling = false

  if (['image/jpg', 'image/jpeg'].includes(contentType)) {
    tmpCanvas.backgroundColor = '#ffffff'
  }

  hideMontageArea({ editor, tmpCanvas })
  hideInteractionBlockerOverlay({ editor, tmpCanvas })

  // The export bitmap is already limited to the artboard dimensions. Leaving
  // the canvas-level clipPath in the clone makes the canvas antialias this edge,
  // giving the JPG a noticeable gray border.
  tmpCanvas.clipPath = undefined

  tmpCanvas.viewportTransform = [1, 0, 0, 1, -left, -top]
  tmpCanvas.setDimensions({ width, height }, { backstoreOnly: true })
  tmpCanvas.renderAll()
}

/**
 * Hides the internal artboard object in the canvas clone.
 */
function hideMontageArea({
  editor,
  tmpCanvas
}: {
  editor: ImageManagerEditor
  tmpCanvas: Awaited<ReturnType<ImageManagerEditor['canvas']['clone']>>
}): void {
  const tmpCanvasMontageArea = tmpCanvas.getObjects().find((object) => {
    return object.id === editor.montageArea.id
  })

  if (tmpCanvasMontageArea) {
    tmpCanvasMontageArea.visible = false
  }
}

/**
 * Hides the interaction-blocking overlay in the canvas clone.
 */
function hideInteractionBlockerOverlay({
  editor,
  tmpCanvas
}: {
  editor: ImageManagerEditor
  tmpCanvas: Awaited<ReturnType<ImageManagerEditor['canvas']['clone']>>
}): void {
  const overlayMaskId = editor.interactionBlocker?.overlayMask?.id
  if (!editor.interactionBlocker?.isBlocked || !overlayMaskId) return

  const tmpCanvasOverlayMask = tmpCanvas.getObjects().find((object) => {
    return object.id === overlayMaskId
  })

  if (tmpCanvasOverlayMask) {
    tmpCanvasOverlayMask.visible = false
  }
}

/**
 * Creates a Blob from a canvas element.
 */
async function createCanvasBlob({
  canvasElement,
  contentType,
  t
}: {
  canvasElement: HTMLCanvasElement
  t: Translate
  contentType: string
}): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvasElement.toBlob(
      (canvasBlob) => {
        if (canvasBlob) {
          resolve(canvasBlob)
        } else {
          reject(new Error(t('image.errors.canvasBlobCreationFailed')))
        }
      },
      contentType,
      1
    )
  })
}

/**
 * Exports the prepared snapshot in the requested format.
 */
export async function exportCanvasSnapshot({
  editor,
  request,
  snapshot
}: {
  editor: ImageManagerEditor
  request: CanvasExportRequest
  snapshot: CanvasExportSnapshot
}): Promise<SuccessfulExportResult> {
  if (snapshot.type === 'svg') {
    return exportCanvasSvgSnapshot({
      editor,
      request,
      snapshot
    })
  }

  if (request.exportAsBlob) {
    return emitCanvasExported({
      editor,
      request,
      image: snapshot.blob,
      contentType: request.exportContentType
    })
  }

  if (!request.isPDF && !request.exportAsBase64) {
    return exportCanvasFile({ editor, request, snapshot })
  }

  const dataUrl = await convertBlobToDataUrl({
    editor,
    blob: snapshot.blob,
    contentType: request.exportContentType
  })

  if (request.isPDF) {
    return exportCanvasPdf({
      editor,
      request,
      snapshot,
      dataUrl
    })
  }

  return emitCanvasExported({
    editor,
    request,
    image: dataUrl,
    contentType: request.exportContentType
  })
}

/**
 * Exports an SVG snapshot without rasterization.
 */
function exportCanvasSvgSnapshot({
  editor,
  request,
  snapshot
}: {
  editor: ImageManagerEditor
  request: CanvasExportRequest
  snapshot: CanvasSvgExportSnapshot
}): SuccessfulExportResult {
  return emitCanvasExported({
    editor,
    request,
    image: exportSVGStringAsFile(snapshot.svgString, {
      exportAsBase64: request.exportAsBase64,
      exportAsBlob: request.exportAsBlob,
      fileName: request.fileName
    }),
    format: 'svg',
    contentType: 'image/svg+xml',
    fileName: request.fileName.replace(/\.[^/.]+$/, '.svg')
  })
}

/**
 * Exports a raster snapshot to PDF.
 */
async function exportCanvasPdf({
  editor,
  request,
  snapshot,
  dataUrl
}: {
  editor: ImageManagerEditor
  request: CanvasExportRequest
  snapshot: CanvasRasterExportSnapshot
  dataUrl: Base64URLString
}): Promise<SuccessfulExportResult> {
  const pxToMm = 0.264583
  const pdfWidth = snapshot.width * pxToMm
  const pdfHeight = snapshot.height * pxToMm
  const JsPDF = (await editor.moduleLoader.loadModule<JsPDFModule>('jspdf')).jsPDF
  const pdf = new JsPDF({
    orientation: pdfWidth > pdfHeight ? 'landscape' : 'portrait',
    unit: 'mm',
    format: [pdfWidth, pdfHeight]
  })

  pdf.addImage(String(dataUrl), 'JPG', 0, 0, pdfWidth, pdfHeight)

  if (request.exportAsBase64) {
    const pdfBase64 = pdf.output('datauristring')

    if (typeof pdfBase64 !== 'string') {
      throw new Error(editor.t('image.errors.pdfDataUriExpected'))
    }

    return emitCanvasExported({
      editor,
      request,
      image: pdfBase64 as Base64URLString,
      format: 'pdf',
      contentType: 'application/pdf'
    })
  }

  return emitCanvasExported({
    editor,
    request,
    image: new File([pdf.output('blob')], request.fileName, { type: 'application/pdf' }),
    format: 'pdf',
    contentType: 'application/pdf'
  })
}

/**
 * Exports a raster snapshot as a regular File.
 */
function exportCanvasFile({
  editor,
  request,
  snapshot
}: {
  editor: ImageManagerEditor
  request: CanvasExportRequest
  snapshot: CanvasRasterExportSnapshot
}): SuccessfulExportResult {
  const fileName = request.format === 'svg' && !snapshot.allCanvasItemsAreSVG
    ? request.fileName.replace(/\.[^/.]+$/, '.png')
    : request.fileName

  return emitCanvasExported({
    editor,
    request,
    image: new File([snapshot.blob], fileName, { type: request.exportContentType }),
    contentType: request.exportContentType,
    fileName
  })
}

/**
 * Emits the successful canvas export event and returns the payload.
 */
function emitCanvasExported({
  editor,
  request,
  image,
  format = request.format,
  contentType,
  fileName = request.fileName
}: {
  editor: ImageManagerEditor
  request: CanvasExportRequest
  image: File | Blob | Base64URLString
  format?: string
  contentType: string
  fileName?: string
}): SuccessfulExportResult {
  const data = {
    image,
    format,
    contentType,
    fileName
  }

  editor.canvas.fire('editor:canvas-exported', data)

  return data
}
