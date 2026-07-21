/** Базовые размеры тестового изображения для e2e-сценариев. */
export const IMAGE_BASE_SIZE = {
  width: 333,
  height: 222
}

/** Дробный коэффициент скейлинга изображения, на котором раньше всплывала проблема с позиционированием. */
export const IMAGE_SCALING_FACTOR = 0.337

/** Допуск для e2e-проверок позиции и геометрии изображения. */
export const IMAGE_TOLERANCE = {
  position: 1.5,
  geometry: 2
}

/** Размер монтажной области для проверки JPEG-экспорта. */
export const IMAGE_EXPORT_MONTAGE_SIZE = {
  width: 128,
  height: 128
}

/** Заливка, у которой легко заметить осветление edge-пикселей при лишнем clipPath. */
export const IMAGE_EXPORT_EDGE_FILL = '#4a90e2'

/** Максимальное расхождение edge-пикселя и внутреннего пикселя после JPEG-кодирования. */
export const IMAGE_EXPORT_EDGE_COLOR_TOLERANCE = 8

/** Объект, который целиком находится вне монтажной области и не должен попасть в экспорт. */
export const IMAGE_OUTSIDE_MONTAGE_OBJECT = {
  width: 32,
  height: 32,
  left: -48,
  top: 24
}

/** Нижняя граница белого пикселя после JPEG-кодирования. */
export const IMAGE_EXPORT_WHITE_PIXEL_MIN_CHANNEL = 245

/** Ожидаемая последовательность байтов в экспортированном файле. */
export type ImageExportFileSignature = {
  bytes: number[]
  offset: number
}

/** Параметры формата, в который экспортируется монтажная область. */
export type ImageExportFormat = {
  contentType: string
  fileName: string
  format: string
  label: string
  signatures: ImageExportFileSignature[]
}

/** Поддерживаемые варианты публичного экспорта монтажной области. */
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
