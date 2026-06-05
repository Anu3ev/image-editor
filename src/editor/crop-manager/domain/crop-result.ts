/* eslint-disable no-use-before-define -- Публичные функции держим выше private helpers. */
import type { FabricImage } from 'fabric'

import {
  getCropRectInSource,
  getSourceSize,
  MIN_CROP_FRAME_SIZE
} from './crop-geometry'
import type {
  CropRect,
  CropSession,
  CropSize
} from '../types'

/** Допуск округления crop-result на границе .5 после floating-point вычислений. */
const CROP_RESULT_ROUNDING_EPSILON = 0.000001

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
 * Возвращает pixel-rect без отрицательных размеров.
 */
export function getRoundedCropRect({
  rect,
  sourceSize
}: {
  rect: CropRect
  sourceSize?: CropSize
}): CropRect {
  const width = Math.max(0, roundCropValue({ value: rect.width }))
  const height = Math.max(0, roundCropValue({ value: rect.height }))

  return {
    left: resolveRoundedCropStart({
      start: rect.left,
      length: width,
      sourceLength: sourceSize?.width
    }),
    top: resolveRoundedCropStart({
      start: rect.top,
      length: height,
      sourceLength: sourceSize?.height
    }),
    width,
    height
  }
}

/**
 * Округляет crop-координату или размер с микродопуском к погрешности double arithmetic.
 */
function roundCropValue({ value }: { value: number }): number {
  return Math.round(value + CROP_RESULT_ROUNDING_EPSILON)
}

/**
 * Возвращает округлённую start-координату, не выпуская rect за source при известной source-size.
 */
function resolveRoundedCropStart({
  start,
  length,
  sourceLength
}: {
  start: number
  length: number
  sourceLength?: number
}): number {
  const roundedStart = roundCropValue({ value: start })
  if (sourceLength === undefined) return roundedStart

  const roundedSourceLength = Math.max(0, roundCropValue({ value: sourceLength }))
  const maxStart = Math.max(0, roundedSourceLength - length)

  return Math.min(Math.max(0, roundedStart), maxStart)
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
