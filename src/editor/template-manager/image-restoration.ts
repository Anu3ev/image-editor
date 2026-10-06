import {
  FabricImage,
  FabricObject,
  Point
} from 'fabric'

import {
  toNumber,
  type Dimensions
} from '../utils/geometry'
import type {
  TemplateCustomData,
  TemplateImageCrop,
  TemplateImageFit,
  TemplateObjectData
} from './types'

/** Tolerance for comparing source dimensions and scale factors. */
const IMAGE_GEOMETRY_EPSILON = 0.000001

/** Point in the template's base artboard coordinate system. */
type PointInfo = {
  x: number
  y: number
}

/** Plan for restoring image dimensions and position. */
type ImageRestorePlan = {
  nextProps: Record<string, number>
  targetWidth: number
  targetHeight: number
  baseScaleX: number
  baseScaleY: number
  hasIntrinsicSize: boolean
}

/** Action to take on the crop area when restoring an image. */
type ImageCropRestoreMode = 'none' | 'preserve' | 'replace'

/** Parameters for calculating restored image geometry. */
type ImageRestorePropsParams = {
  imageFit: TemplateImageFit
  cropMode: ImageCropRestoreMode
  intrinsicWidth: number
  intrinsicHeight: number
  targetWidth: number
  targetHeight: number
  baseScaleX: number
  baseScaleY: number
}

/** Returns the actual dimensions of the loaded image source. */
function getImageIntrinsicSize({ image }: { image: FabricImage }): Dimensions {
  const originalSize = image.getOriginalSize()

  return {
    width: toNumber({ value: originalSize.width, fallback: image.width || 0 }),
    height: toNumber({ value: originalSize.height, fallback: image.height || 0 })
  }
}

/** Validates the saved source dimensions for the crop area. */
function isImageCropMetadata(value: unknown): value is TemplateImageCrop {
  if (!value || typeof value !== 'object') return false

  const { source, sourceWidth, sourceHeight } = value as Partial<TemplateImageCrop>

  return typeof source === 'string'
    && source.length > 0
    && typeof sourceWidth === 'number'
    && Number.isFinite(sourceWidth)
    && sourceWidth > 0
    && typeof sourceHeight === 'number'
    && Number.isFinite(sourceHeight)
    && sourceHeight > 0
}

/** Checks that crop metadata belongs to the original src and its coordinate system. */
function hasMatchingImageCropSource({
  imageCrop,
  originalSerialized,
  sourceSize
}: {
  imageCrop: TemplateImageCrop
  originalSerialized: TemplateObjectData
  sourceSize: Dimensions
}): boolean {
  const hasSameDimensions = Math.abs(imageCrop.sourceWidth - sourceSize.width) <= IMAGE_GEOMETRY_EPSILON
    && Math.abs(imageCrop.sourceHeight - sourceSize.height) <= IMAGE_GEOMETRY_EPSILON

  return hasSameDimensions && imageCrop.source === originalSerialized.src
}

/** Checks that the serialized crop area fits within the current source. */
function isCropInsideSource({
  serialized,
  sourceSize
}: {
  serialized: TemplateObjectData
  sourceSize: Dimensions
}): boolean {
  const cropX = toNumber({ value: serialized.cropX, fallback: 0 })
  const cropY = toNumber({ value: serialized.cropY, fallback: 0 })
  const width = toNumber({ value: serialized.width, fallback: 0 })
  const height = toNumber({ value: serialized.height, fallback: 0 })

  return cropX >= 0
    && cropY >= 0
    && width > 0
    && height > 0
    && cropX + width <= sourceSize.width + IMAGE_GEOMETRY_EPSILON
    && cropY + height <= sourceSize.height + IMAGE_GEOMETRY_EPSILON
}

/** Determines whether to preserve the crop or refill the saved area. */
function resolveImageCropRestoreMode({
  serialized,
  originalSerialized,
  sourceSize
}: {
  serialized: TemplateObjectData
  originalSerialized: TemplateObjectData
  sourceSize: Dimensions
}): ImageCropRestoreMode {
  const isCropValid = isCropInsideSource({ serialized, sourceSize })
  const imageCrop = serialized.customData?.imageCrop

  if (imageCrop !== undefined && !isImageCropMetadata(imageCrop)) return 'replace'

  if (isImageCropMetadata(imageCrop)) {
    return isCropValid && hasMatchingImageCropSource({ imageCrop, originalSerialized, sourceSize })
      ? 'preserve'
      : 'replace'
  }

  const legacyImageFit: unknown = serialized.customData?.imageFit
  if (legacyImageFit !== 'crop') return 'none'

  return isCropValid ? 'preserve' : 'replace'
}

/** Returns the image source fitting rule. */
function resolveImageFit({ customData }: { customData?: TemplateCustomData }): TemplateImageFit {
  return customData?.imageFit === 'stretch' ? 'stretch' : 'contain'
}

/** Adds independent scaling per axis for stretch mode. */
function applyStretchedImageScale({
  nextProps,
  intrinsicWidth,
  intrinsicHeight,
  targetDisplayWidth,
  targetDisplayHeight
}: {
  nextProps: Record<string, number>
  intrinsicWidth: number
  intrinsicHeight: number
  targetDisplayWidth: number
  targetDisplayHeight: number
}): void {
  const nextScaleX = targetDisplayWidth > 0 ? targetDisplayWidth / intrinsicWidth : null
  const nextScaleY = targetDisplayHeight > 0 ? targetDisplayHeight / intrinsicHeight : null

  if (nextScaleX && nextScaleX > 0) nextProps.scaleX = nextScaleX
  if (nextScaleY && nextScaleY > 0) nextProps.scaleY = nextScaleY
}

/** Adds uniform scaling for contain mode. */
function applyContainedImageScale({
  nextProps,
  intrinsicWidth,
  intrinsicHeight,
  targetDisplayWidth,
  targetDisplayHeight
}: {
  nextProps: Record<string, number>
  intrinsicWidth: number
  intrinsicHeight: number
  targetDisplayWidth: number
  targetDisplayHeight: number
}): void {
  if (targetDisplayWidth <= 0 || targetDisplayHeight <= 0) return

  const containScale = Math.min(targetDisplayWidth / intrinsicWidth, targetDisplayHeight / intrinsicHeight)
  if (!Number.isFinite(containScale) || containScale <= 0) return

  nextProps.scaleX = containScale
  nextProps.scaleY = containScale
}

/** Center-crops the new source to fill the saved area. */
function resolveCoveredImageProps({
  intrinsicWidth,
  intrinsicHeight,
  targetDisplayWidth,
  targetDisplayHeight
}: {
  intrinsicWidth: number
  intrinsicHeight: number
  targetDisplayWidth: number
  targetDisplayHeight: number
}): Record<string, number> {
  const nextProps: Record<string, number> = { cropX: 0, cropY: 0 }
  if (intrinsicWidth > 0) nextProps.width = intrinsicWidth
  if (intrinsicHeight > 0) nextProps.height = intrinsicHeight
  if (intrinsicWidth <= 0 || intrinsicHeight <= 0) return nextProps
  if (targetDisplayWidth <= 0 || targetDisplayHeight <= 0) return nextProps

  const targetAspectRatio = targetDisplayWidth / targetDisplayHeight
  const sourceAspectRatio = intrinsicWidth / intrinsicHeight
  let cropWidth = intrinsicWidth
  let cropHeight = intrinsicHeight

  if (sourceAspectRatio > targetAspectRatio) {
    cropWidth = intrinsicHeight * targetAspectRatio
    nextProps.cropX = (intrinsicWidth - cropWidth) / 2
  } else {
    cropHeight = intrinsicWidth / targetAspectRatio
    nextProps.cropY = (intrinsicHeight - cropHeight) / 2
  }

  nextProps.width = cropWidth
  nextProps.height = cropHeight
  nextProps.scaleX = targetDisplayWidth / cropWidth
  nextProps.scaleY = targetDisplayHeight / cropHeight

  return nextProps
}

/** Returns dimensions and scale for the current image source. */
function resolveImageRestoreProps({
  imageFit,
  cropMode,
  intrinsicWidth,
  intrinsicHeight,
  targetWidth,
  targetHeight,
  baseScaleX,
  baseScaleY
}: ImageRestorePropsParams): Record<string, number> {
  if (cropMode === 'preserve') return {}

  const targetDisplayWidth = targetWidth * baseScaleX
  const targetDisplayHeight = targetHeight * baseScaleY
  if (cropMode === 'replace') {
    return resolveCoveredImageProps({
      intrinsicWidth,
      intrinsicHeight,
      targetDisplayWidth,
      targetDisplayHeight
    })
  }

  const nextProps: Record<string, number> = { cropX: 0, cropY: 0 }
  if (intrinsicWidth > 0) nextProps.width = intrinsicWidth
  if (intrinsicHeight > 0) nextProps.height = intrinsicHeight
  if (intrinsicWidth <= 0 || intrinsicHeight <= 0) return nextProps

  const scaleParams = {
    nextProps,
    intrinsicWidth,
    intrinsicHeight,
    targetDisplayWidth,
    targetDisplayHeight
  }

  if (imageFit === 'stretch') {
    applyStretchedImageScale(scaleParams)
  } else {
    applyContainedImageScale(scaleParams)
  }

  return nextProps
}

/** Builds an image restoration plan from the serialized area. */
function createImageRestorePlan({
  image,
  serialized,
  originalSerialized
}: {
  image: FabricImage
  serialized: TemplateObjectData
  originalSerialized: TemplateObjectData
}): ImageRestorePlan {
  const sourceSize = getImageIntrinsicSize({ image })
  const targetWidth = toNumber({ value: serialized.width, fallback: sourceSize.width })
  const targetHeight = toNumber({ value: serialized.height, fallback: sourceSize.height })
  const baseScaleX = toNumber({ value: serialized.scaleX, fallback: image.scaleX || 1 })
  const baseScaleY = toNumber({ value: serialized.scaleY, fallback: image.scaleY || 1 })
  const nextProps = resolveImageRestoreProps({
    imageFit: resolveImageFit({ customData: serialized.customData }),
    cropMode: resolveImageCropRestoreMode({ serialized, originalSerialized, sourceSize }),
    intrinsicWidth: sourceSize.width,
    intrinsicHeight: sourceSize.height,
    targetWidth,
    targetHeight,
    baseScaleX,
    baseScaleY
  })

  return {
    nextProps,
    targetWidth,
    targetHeight,
    baseScaleX,
    baseScaleY,
    hasIntrinsicSize: sourceSize.width > 0 && sourceSize.height > 0
  }
}

/** Removes internal restoration data from the live Fabric object. */
function clearImageRestorationMetadata({ image }: { image: FabricImage }): void {
  const { customData } = image
  if (!customData || typeof customData !== 'object') return

  const storedData = customData as Record<string, unknown>
  if (!('imageCrop' in storedData) && !('imageFit' in storedData)) return

  const nextCustomData = { ...storedData }
  delete nextCustomData.imageCrop
  delete nextCustomData.imageFit

  image.set({
    customData: Object.keys(nextCustomData).length > 0 ? nextCustomData : undefined
  })
}

/** Returns the image position in the template's base-size coordinate system. */
function resolveTemplatePlacement({
  image,
  serialized,
  baseWidth,
  baseHeight,
  useRelativePositions
}: {
  image: FabricImage
  serialized: TemplateObjectData
  baseWidth: number
  baseHeight: number
  useRelativePositions: boolean
}): PointInfo {
  const left = toNumber({ value: serialized.left, fallback: image.left || 0 })
  const top = toNumber({ value: serialized.top, fallback: image.top || 0 })

  if (!useRelativePositions) return { x: left, y: top }

  return {
    x: left * (baseWidth || 1),
    y: top * (baseHeight || 1)
  }
}

/** Calculates the center of the saved image area. */
function resolveImageTemplateCenter({
  image,
  serialized,
  plan,
  baseWidth,
  baseHeight,
  useRelativePositions
}: {
  image: FabricImage
  serialized: TemplateObjectData
  plan: ImageRestorePlan
  baseWidth: number
  baseHeight: number
  useRelativePositions: boolean
}): PointInfo {
  const originalProps = {
    left: image.left,
    top: image.top,
    width: image.width,
    height: image.height,
    scaleX: image.scaleX,
    scaleY: image.scaleY
  }
  const placement = resolveTemplatePlacement({
    image,
    serialized,
    baseWidth,
    baseHeight,
    useRelativePositions
  })

  image.set({
    left: placement.x,
    top: placement.y,
    width: plan.targetWidth,
    height: plan.targetHeight,
    scaleX: plan.baseScaleX,
    scaleY: plan.baseScaleY
  })
  const center = image.getPointByOrigin('center', 'center')

  image.set(originalProps)

  return { x: center.x, y: center.y }
}

/** Returns the image to the template's overall transform coordinate system. */
function restoreImageTemplateCenter({
  image,
  center,
  baseWidth,
  baseHeight,
  useRelativePositions
}: {
  image: FabricImage
  center: PointInfo
  baseWidth: number
  baseHeight: number
  useRelativePositions: boolean
}): void {
  image.setPositionByOrigin(new Point(center.x, center.y), 'center', 'center')
  if (!useRelativePositions) return

  image.set({
    left: toNumber({ value: image.left, fallback: 0 }) / (baseWidth || 1),
    top: toNumber({ value: image.top, fallback: 0 }) / (baseHeight || 1)
  })
}

/** Restores image crop, dimensions, and position from the template. */
export function restoreTemplateImageGeometry({
  revived,
  serialized,
  originalSerialized,
  baseWidth,
  baseHeight,
  useRelativePositions
}: {
  revived: FabricObject
  serialized: TemplateObjectData
  originalSerialized: TemplateObjectData
  baseWidth: number
  baseHeight: number
  useRelativePositions: boolean
}): void {
  const objectType = typeof revived.type === 'string' ? revived.type.toLowerCase() : ''
  if (objectType !== 'image') return

  const image = revived as FabricImage
  const plan = createImageRestorePlan({ image, serialized, originalSerialized })

  if (!plan.hasIntrinsicSize) {
    image.set(plan.nextProps)
    clearImageRestorationMetadata({ image })
    return
  }

  const originalCenter = resolveImageTemplateCenter({
    image,
    serialized,
    plan,
    baseWidth,
    baseHeight,
    useRelativePositions
  })

  image.set(plan.nextProps)
  restoreImageTemplateCenter({
    image,
    center: originalCenter,
    baseWidth,
    baseHeight,
    useRelativePositions
  })
  clearImageRestorationMetadata({ image })
}

/** Writes independent crop and image fitting modes. */
export function preserveSerializedImageGeometry({
  object,
  serialized
}: {
  object: FabricObject
  serialized: TemplateObjectData
}): void {
  const objectType = typeof object.type === 'string' ? object.type.toLowerCase() : ''
  if (objectType !== 'image') return

  const image = object as FabricImage
  const customData = { ...serialized.customData }
  const scaleX = toNumber({ value: serialized.scaleX, fallback: image.scaleX ?? 1 })
  const scaleY = toNumber({ value: serialized.scaleY, fallback: image.scaleY ?? 1 })

  delete customData.imageCrop
  delete customData.imageFit

  if (Math.abs(scaleX - scaleY) > IMAGE_GEOMETRY_EPSILON) {
    customData.imageFit = 'stretch'
  }

  if (image.hasCrop()) {
    const sourceSize = getImageIntrinsicSize({ image })

    if (
      typeof serialized.src === 'string'
      && serialized.src.length > 0
      && sourceSize.width > 0
      && sourceSize.height > 0
    ) {
      const imageCrop: TemplateImageCrop = {
        source: serialized.src,
        sourceWidth: sourceSize.width,
        sourceHeight: sourceSize.height
      }

      customData.imageCrop = imageCrop
    }
  }

  if (Object.keys(customData).length > 0) {
    serialized.customData = customData
  } else {
    delete serialized.customData
  }
}
