/* eslint-disable no-use-before-define -- Публичные функции держим выше private helpers. */
import type { FabricImage } from 'fabric'

import {
  getCropRectInSource,
  getSourceSize,
  MIN_CROP_FRAME_SIZE
} from './crop-geometry'
import type {
  CropRect,
  CropSession
} from '../types'

/**
 * Возвращает crop rect в координатах результата текущей session.
 */
export function getCropSessionResultRect({ session }: { session: CropSession }): CropRect {
  if (session.mode === 'canvas') {
    return getCanvasCropResultRect({ session })
  }

  return getImageCropResultRect({
    target: session.target,
    frame: session.frame
  })
}

/**
 * Возвращает rounded crop rect без отрицательных размеров.
 */
export function getRoundedCropRect({ rect }: { rect: CropRect }): CropRect {
  return {
    left: Math.round(rect.left),
    top: Math.round(rect.top),
    width: Math.round(rect.width),
    height: Math.round(rect.height)
  }
}

/**
 * Проверяет минимальную валидность crop rect.
 */
export function isValidCropRect({ rect }: { rect: CropRect }): boolean {
  return rect.width >= MIN_CROP_FRAME_SIZE && rect.height >= MIN_CROP_FRAME_SIZE
}

/**
 * Возвращает rect canvas crop от top-left монтажной области.
 */
function getCanvasCropResultRect({ session }: { session: CropSession }): CropRect {
  const rect = getCropRectInSource({
    source: session.source,
    frame: session.frame
  })
  const sourceSize = getSourceSize({ source: session.source })

  return {
    left: rect.left + sourceSize.width / 2,
    top: rect.top + sourceSize.height / 2,
    width: rect.width,
    height: rect.height
  }
}

/**
 * Возвращает rect image crop от top-left текущей видимой области изображения.
 */
function getImageCropResultRect({
  target,
  frame
}: {
  target: FabricImage
  frame: CropSession['frame']
}): CropRect {
  const rect = getCropRectInSource({
    source: target,
    frame
  })
  const sourceLeft = -target.width / 2
  const sourceTop = -target.height / 2

  return {
    left: rect.left - sourceLeft,
    top: rect.top - sourceTop,
    width: rect.width,
    height: rect.height
  }
}
