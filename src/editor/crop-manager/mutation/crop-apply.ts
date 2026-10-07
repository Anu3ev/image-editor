/* eslint-disable no-use-before-define -- Keep public mutation functions above private helpers. */
import {
  Point,
  type FabricImage,
  type FabricObject,
  type Rect
} from 'fabric'

import type { ImageEditor } from '../../index'
import { MIN_CROP_FRAME_SIZE } from '../domain/crop-geometry'
import { isValidCropRect } from '../domain/crop-result'
import type {
  CropApplyResult,
  CropRect
} from '../types'

/**
 * Size of the image crop being applied.
 */
type AppliedImageCropSize = {
  width: number
  height: number
}

/**
 * Coordinates for copying the visible image region to a transparent crop canvas.
 */
type ImageCropDrawRect = {
  sourceX: number
  sourceY: number
  sourceWidth: number
  sourceHeight: number
  destinationX: number
  destinationY: number
}

/**
 * Applies an artboard crop.
 */
export function applyCanvasCrop({
  editor,
  frame,
  rect
}: {
  editor: ImageEditor
  frame: Rect
  rect: CropRect
}): CropApplyResult | null {
  if (!isValidCropRect({ rect })) return null

  moveCanvasContentAfterCrop({
    editor,
    frame,
    offset: new Point(-rect.left, -rect.top)
  })
  editor.canvasManager.setResolutionWidth(rect.width, { withoutSave: true })
  editor.canvasManager.setResolutionHeight(rect.height, { withoutSave: true })
  editor.canvas.renderAll()

  return {
    mode: 'canvas',
    target: null,
    rect
  }
}

/**
 * Applies an image crop.
 */
export function applyImageCrop({
  editor,
  target,
  frame,
  rect
}: {
  editor: ImageEditor
  target: FabricImage
  frame: Rect
  rect: CropRect
}): CropApplyResult | null {
  if (!isValidCropRect({ rect })) return null

  const imageRect = applyCropRectToImage({
    target,
    frame,
    rect
  })
  if (!imageRect) return null

  editor.canvas.renderAll()

  return {
    mode: 'image',
    target,
    rect: imageRect
  }
}

/**
 * Applies a crop rect in source pixels to a FabricImage.
 */
function applyCropRectToImage({
  target,
  frame,
  rect
}: {
  target: FabricImage
  frame: Rect
  rect: CropRect
}): CropRect | null {
  const width = Math.max(MIN_CROP_FRAME_SIZE, rect.width)
  const height = Math.max(MIN_CROP_FRAME_SIZE, rect.height)
  const size = {
    width,
    height
  }

  if (isCropInsideVisibleImage({ target, rect })) {
    applyInnerCropRectToImage({
      target,
      size,
      rect
    })
  } else {
    const cropCanvas = createTransparentCropCanvas({
      target,
      size,
      rect
    })
    if (!cropCanvas) return null

    target.setElement(cropCanvas, size)
    target.set({
      cropX: 0,
      cropY: 0,
      width,
      height
    })
  }

  target.setPositionByOrigin(frame.getCenterPoint(), 'center', 'center')
  target.setCoords()

  return {
    left: rect.left,
    top: rect.top,
    width,
    height
  }
}

/**
 * Returns true if the crop fits entirely within the currently visible image area.
 */
function isCropInsideVisibleImage({
  target,
  rect
}: {
  target: FabricImage
  rect: CropRect
}): boolean {
  return rect.left >= 0
    && rect.top >= 0
    && rect.left + rect.width <= target.width
    && rect.top + rect.height <= target.height
}

/**
 * Applies the crop using the standard cropX/cropY values without creating a new image source.
 */
function applyInnerCropRectToImage({
  target,
  size,
  rect
}: {
  target: FabricImage
  size: AppliedImageCropSize
  rect: CropRect
}): void {
  const cropX = (target.cropX ?? 0) + rect.left
  const cropY = (target.cropY ?? 0) + rect.top

  target.set({
    cropX,
    cropY,
    width: size.width,
    height: size.height
  })
}

/**
 * Creates a transparent image source if the crop extends beyond the current image bounds.
 */
function createTransparentCropCanvas({
  target,
  size,
  rect
}: {
  target: FabricImage
  size: AppliedImageCropSize
  rect: CropRect
}): HTMLCanvasElement | null {
  const source = target.getElement()
  const ownerDocument = getCanvasOwnerDocument({ target })
  if (!source || !ownerDocument) return null

  const canvas = ownerDocument.createElement('canvas')
  canvas.width = Math.round(size.width)
  canvas.height = Math.round(size.height)

  const context = canvas.getContext('2d')
  if (!context) return null

  const drawRect = getVisibleImageDrawRect({
    target,
    size,
    rect
  })
  if (!drawRect) return canvas

  context.drawImage(
    source,
    drawRect.sourceX,
    drawRect.sourceY,
    drawRect.sourceWidth,
    drawRect.sourceHeight,
    drawRect.destinationX,
    drawRect.destinationY,
    drawRect.sourceWidth,
    drawRect.sourceHeight
  )

  return canvas
}

/**
 * Returns the document used to create the transparent crop canvas.
 */
function getCanvasOwnerDocument({ target }: { target: FabricImage }): Document | null {
  const canvasElement = target.canvas?.getElement()
  if (canvasElement?.ownerDocument) return canvasElement.ownerDocument
  if (typeof document !== 'undefined') return document

  return null
}

/**
 * Calculates the intersection of the crop rect and the currently visible image area.
 */
function getVisibleImageDrawRect({
  target,
  size,
  rect
}: {
  target: FabricImage
  size: AppliedImageCropSize
  rect: CropRect
}): ImageCropDrawRect | null {
  const visibleLeft = Math.max(0, rect.left)
  const visibleTop = Math.max(0, rect.top)
  const visibleRight = Math.min(target.width, rect.left + size.width)
  const visibleBottom = Math.min(target.height, rect.top + size.height)
  const sourceWidth = visibleRight - visibleLeft
  const sourceHeight = visibleBottom - visibleTop
  if (sourceWidth <= 0 || sourceHeight <= 0) return null

  return {
    sourceX: (target.cropX ?? 0) + visibleLeft,
    sourceY: (target.cropY ?? 0) + visibleTop,
    sourceWidth,
    sourceHeight,
    destinationX: visibleLeft - rect.left,
    destinationY: visibleTop - rect.top
  }
}

/**
 * Shifts the canvas contents so that the selected area becomes the new artboard origin.
 */
function moveCanvasContentAfterCrop({
  editor,
  frame,
  offset
}: {
  editor: ImageEditor
  frame: Rect
  offset: Point
}): void {
  const objects = editor.canvasManager.getObjects()

  objects.forEach((object: FabricObject) => {
    if (object === frame) return

    object.set({
      left: (object.left ?? 0) + offset.x,
      top: (object.top ?? 0) + offset.y
    })
    object.setCoords()
  })
}
