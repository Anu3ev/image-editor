import { expect } from '@playwright/test'

import type { CropSourceOverflowInfo, CropStateInfo } from '../types'

/** Overflow in source pixels that still counts as fitting the source after floating-point math. */
const SOURCE_FIT_TOLERANCE = 0.000001

/** Checks that the unrounded crop frame does not extend beyond its source on either axis. */
export function expectCropFrameFitsSource({ overflow }: { overflow: CropSourceOverflowInfo }): void {
  expect(overflow.x, 'the crop frame must not extend beyond the source horizontally')
    .toBeLessThanOrEqual(SOURCE_FIT_TOLERANCE)
  expect(overflow.y, 'the crop frame must not extend beyond the source vertically')
    .toBeLessThanOrEqual(SOURCE_FIT_TOLERANCE)
}

/** Returns the visible width-to-height ratio of the crop frame on the canvas. */
export function getVisibleCropFrameRatio({ frame }: CropStateInfo): number {
  return (frame.width * frame.scaleX) / (frame.height * frame.scaleY)
}

/**
 * Returns the scene point at a relative position of an unrotated crop frame, for example `{ x: 1, y: 0.5 }`
 * for the middle of its right side.
 */
export function getCropFramePoint({
  state: { frame },
  x,
  y
}: {
  state: CropStateInfo
  x: number
  y: number
}): { x: number, y: number } {
  return {
    x: frame.left + ((x - 0.5) * frame.width * frame.scaleX),
    y: frame.top + ((y - 0.5) * frame.height * frame.scaleY)
  }
}

/** Returns the visible size of the crop frame on the canvas. */
export function getVisibleCropFrameSize({ frame }: CropStateInfo): { width: number, height: number } {
  return {
    width: frame.width * frame.scaleX,
    height: frame.height * frame.scaleY
  }
}
