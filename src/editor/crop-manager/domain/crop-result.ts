/* eslint-disable no-use-before-define -- Keep public functions above private helpers. */
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

/** Rounding tolerance for crop results near the .5 boundary after floating-point calculations. */
const CROP_RESULT_ROUNDING_EPSILON = 0.000001

/**
 * Returns the crop rect in the coordinate system of the current session result.
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
 * Returns a pixel rect without negative dimensions.
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
 * Rounds a crop coordinate or dimension with a small tolerance for double-precision arithmetic errors.
 */
function roundCropValue({ value }: { value: number }): number {
  return Math.round(value + CROP_RESULT_ROUNDING_EPSILON)
}

/**
 * Returns the rounded start coordinate, keeping the rect within the source when the source size is known.
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
 * Checks the basic validity of the crop rect.
 */
export function isValidCropRect({ rect }: { rect: CropRect }): boolean {
  return rect.width >= MIN_CROP_FRAME_SIZE && rect.height >= MIN_CROP_FRAME_SIZE
}

/**
 * Returns the canvas crop rect relative to the top-left corner of the artboard.
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
 * Returns the image crop rect relative to the top-left corner of the currently visible image area.
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
