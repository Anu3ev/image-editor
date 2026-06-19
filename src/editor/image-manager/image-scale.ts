import type {
  FabricImage,
  FabricObject,
  Rect
} from 'fabric'

/** Режим масштабирования, который влияет на расчёт scale factor. */
export type ImageScaleType = 'contain' | 'cover' | 'image-contain' | 'image-cover'

/** Рассчитывает scale factor изображения относительно монтажной области. */
export function calculateImageScaleFactor({
  montageArea,
  imageObject,
  scaleType = 'contain'
}: {
  montageArea: Rect | null
  imageObject: FabricImage | FabricObject | null
  scaleType?: ImageScaleType
}): number {
  if (!montageArea || !imageObject) return 1

  const { width: canvasWidth, height: canvasHeight } = montageArea
  const { width: imageWidth, height: imageHeight } = imageObject

  if (scaleType === 'contain' || scaleType === 'image-contain') {
    return Math.min(canvasWidth / imageWidth, canvasHeight / imageHeight)
  }

  if (scaleType === 'cover' || scaleType === 'image-cover') {
    return Math.max(canvasWidth / imageWidth, canvasHeight / imageHeight)
  }

  return 1
}
