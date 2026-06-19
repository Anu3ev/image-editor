/* eslint-disable no-use-before-define -- Публичный entrypoint держим выше внутренних деталей экспорта. */
import type { jsPDF } from 'jspdf'

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

/** Подготовленные опции экспорта монтажной области. */
export interface CanvasExportRequest {
  fileName: string
  contentType: string
  exportAsBase64: boolean
  exportAsBlob: boolean
  exportContentType: string
  format: string
  isPDF: boolean
}

/** Размер экспортируемой монтажной области. */
interface CanvasExportSize {
  width: number
  height: number
}

/** Snapshot, который можно вернуть как SVG без rasterize. */
interface CanvasSvgExportSnapshot extends CanvasExportSize {
  type: 'svg'
  svgString: string
}

/** Snapshot, который нужно экспортировать через canvas bitmap. */
interface CanvasRasterExportSnapshot extends CanvasExportSize {
  type: 'raster'
  blob: Blob
  allCanvasItemsAreSVG: boolean
}

/** Snapshot клонированной монтажной области. */
export type CanvasExportSnapshot = CanvasSvgExportSnapshot | CanvasRasterExportSnapshot

/** Модуль jsPDF, который загружается лениво при PDF-экспорте. */
interface JsPDFModule {
  jsPDF: typeof jsPDF
}

/**
 * Нормализует входные опции canvas export.
 */
export function createCanvasExportRequest({
  options
}: {
  options: exportCanvasAsImageFileOptions
}): CanvasExportRequest {
  const {
    fileName = 'image.png',
    contentType = 'image/png',
    exportAsBase64 = false,
    exportAsBlob = false
  } = options
  const isPDF = contentType === 'application/pdf'
  const exportContentType = isPDF ? 'image/jpg' : contentType
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
 * Создаёт snapshot монтажной области в исходном масштабе.
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
 * Готовит клон canvas к экспорту монтажной области.
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

  tmpCanvas.viewportTransform = [1, 0, 0, 1, -left, -top]
  tmpCanvas.setDimensions({ width, height }, { backstoreOnly: true })
  tmpCanvas.renderAll()
}

/**
 * Скрывает служебную монтажную область в клоне canvas.
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
 * Скрывает overlay блокировки взаимодействия в клоне canvas.
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
 * Создаёт Blob из canvas element.
 */
async function createCanvasBlob({
  canvasElement,
  contentType
}: {
  canvasElement: HTMLCanvasElement
  contentType: string
}): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvasElement.toBlob(
      (canvasBlob) => {
        if (canvasBlob) {
          resolve(canvasBlob)
        } else {
          reject(new Error('Failed to create Blob from canvas'))
        }
      },
      contentType,
      1
    )
  })
}

/**
 * Экспортирует подготовленный snapshot в требуемый формат.
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

  if (request.exportAsBase64) {
    return emitCanvasExported({
      editor,
      request,
      image: dataUrl,
      contentType: request.exportContentType
    })
  }

  return exportCanvasFile({
    editor,
    request,
    snapshot
  })
}

/**
 * Экспортирует SVG snapshot без rasterize.
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
 * Экспортирует raster snapshot в PDF.
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
      throw new Error('jsPDF должен вернуть data URI строку')
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
 * Экспортирует raster snapshot как обычный File.
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
 * Отправляет событие успешного экспорта canvas и возвращает payload.
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
