/** Base test-image dimensions for e2e scenarios. */
export const IMAGE_BASE_SIZE = {
  width: 333,
  height: 222
}

/** Fractional image scale factor that previously exposed a positioning issue. */
export const IMAGE_SCALING_FACTOR = 0.337

/** Tolerance for e2e checks of image position and geometry. */
export const IMAGE_TOLERANCE = {
  position: 1.5,
  geometry: 2
}

/** Artboard dimensions for testing JPEG export. */
export const IMAGE_EXPORT_MONTAGE_SIZE = {
  width: 128,
  height: 128
}

/** Fill that makes edge-pixel lightening from a redundant clipPath easy to see. */
export const IMAGE_EXPORT_EDGE_FILL = '#4a90e2'

/** Maximum difference between an edge pixel and an interior pixel after JPEG encoding. */
export const IMAGE_EXPORT_EDGE_COLOR_TOLERANCE = 8

/** Object fully outside the artboard that must not appear in the export. */
export const IMAGE_OUTSIDE_MONTAGE_OBJECT = {
  width: 32,
  height: 32,
  left: -48,
  top: 24
}

/** Lower threshold for a white pixel after JPEG encoding. */
export const IMAGE_EXPORT_WHITE_PIXEL_MIN_CHANNEL = 245

/** Expected byte sequence in the exported file. */
export type ImageExportFileSignature = {
  bytes: number[]
  offset: number
}

/** Options for the format used to export the artboard. */
export type ImageExportFormat = {
  contentType: string
  fileName: string
  format: string
  label: string
  signatures: ImageExportFileSignature[]
}

/** Supported public artboard-export variants. */
export const IMAGE_EXPORT_FORMATS: ImageExportFormat[] = [
  {
    label: 'JPG',
    contentType: 'image/jpeg',
    fileName: 'image.jpg',
    format: 'jpeg',
    signatures: [{ offset: 0, bytes: [0xff, 0xd8] }]
  },
  {
    label: 'JPEG',
    contentType: 'image/jpeg',
    fileName: 'image.jpeg',
    format: 'jpeg',
    signatures: [{ offset: 0, bytes: [0xff, 0xd8] }]
  },
  {
    label: 'PNG',
    contentType: 'image/png',
    fileName: 'image.png',
    format: 'png',
    signatures: [{ offset: 0, bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] }]
  },
  {
    label: 'WEBP',
    contentType: 'image/webp',
    fileName: 'image.webp',
    format: 'webp',
    signatures: [
      { offset: 0, bytes: [0x52, 0x49, 0x46, 0x46] },
      { offset: 8, bytes: [0x57, 0x45, 0x42, 0x50] }
    ]
  },
  {
    label: 'PDF',
    contentType: 'application/pdf',
    fileName: 'image.pdf',
    format: 'pdf',
    signatures: [{ offset: 0, bytes: [0x25, 0x50, 0x44, 0x46] }]
  }
]
