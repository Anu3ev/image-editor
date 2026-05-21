/* eslint-disable no-use-before-define -- Публичные mutation functions держим выше private helpers. */
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
 * Размер применяемого image crop.
 */
type AppliedImageCropSize = {
  width: number
  height: number
}

/**
 * Координаты копирования видимой части изображения в прозрачный crop canvas.
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
 * Применяет кроп монтажной области.
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
 * Применяет кроп изображения.
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
 * Применяет source-pixel crop rect к FabricImage.
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
 * Возвращает true, если crop полностью попадает в текущую видимую область изображения.
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
 * Применяет crop через обычные cropX/cropY без создания нового image source.
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
 * Создаёт прозрачный image source, если crop выходит за текущие границы изображения.
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
 * Возвращает document для создания transparent crop canvas.
 */
function getCanvasOwnerDocument({ target }: { target: FabricImage }): Document | null {
  const canvasElement = target.canvas?.getElement()
  if (canvasElement?.ownerDocument) return canvasElement.ownerDocument
  if (typeof document !== 'undefined') return document

  return null
}

/**
 * Считает пересечение crop rect с текущей видимой областью изображения.
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
 * Сдвигает содержимое canvas так, чтобы выбранная область стала новым началом монтажной области.
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
