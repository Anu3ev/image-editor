import type { Rect } from 'fabric'

import { fitResizedCropFrameToSource } from '../../../../src/editor/crop-manager/domain/crop-anchored-fit'
import { getCropRectInSource } from '../../../../src/editor/crop-manager/domain/crop-geometry'
import { createSkewedCropSourceFrame } from '../../../test-utils/crop/frame'

/** Top-left corner of the 400x250 test frame inside the 1000x667 source, away from every source edge. */
const FIXED_CORNER = { x: -300, y: -200 }

/** Scales the frame the way a Fabric resize does: its top-left corner stays at FIXED_CORNER. */
function resizeFromTopLeft({ frame, scaleX, scaleY }: { frame: Rect, scaleX: number, scaleY: number }): void {
  frame.set({
    scaleX,
    scaleY,
    left: FIXED_CORNER.x + ((frame.width * scaleX) / 2),
    top: FIXED_CORNER.y + ((frame.height * scaleY) / 2)
  })
}

/** Returns the top-left corner of the unrotated test frame. */
function getTopLeft({ frame }: { frame: Rect }): { x: number, y: number } {
  return {
    x: frame.left - ((frame.width * frame.scaleX) / 2),
    y: frame.top - ((frame.height * frame.scaleY) / 2)
  }
}

describe('crop anchored fit', () => {
  it('shrinks a frame resized from the right side to the source edge and keeps its left side', () => {
    const { source, frame } = createSkewedCropSourceFrame({ skewXDegrees: 12, frameWidth: 400, frameHeight: 250 })
    resizeFromTopLeft({ frame, scaleX: 3, scaleY: 1 })

    const result = fitResizedCropFrameToSource({
      source, frame, originX: 'left', originY: 'top', axes: { x: true, y: false }, preserveAspectRatio: false
    })

    const rect = getCropRectInSource({ source, frame })
    expect(result).toBe('shrunk')
    expect(rect.left + rect.width).toBeCloseTo(500, 8)
    expect(getTopLeft({ frame }).x).toBeCloseTo(FIXED_CORNER.x, 8)
    expect(getTopLeft({ frame }).y).toBeCloseTo(FIXED_CORNER.y, 8)
    expect(frame.scaleY).toBe(1)
  })

  it('keeps the frame proportions in a proportional corner resize', () => {
    const { source, frame } = createSkewedCropSourceFrame({ skewXDegrees: 12, frameWidth: 400, frameHeight: 250 })
    resizeFromTopLeft({ frame, scaleX: 3, scaleY: 3 })

    fitResizedCropFrameToSource({
      source, frame, originX: 'left', originY: 'top', axes: { x: true, y: true }, preserveAspectRatio: true
    })

    const rect = getCropRectInSource({ source, frame })
    expect(frame.scaleX).toBeCloseTo(frame.scaleY, 10)
    expect(Math.max(rect.left + rect.width - 500, rect.top + rect.height - 333.5)).toBeCloseTo(0, 6)
    expect(getTopLeft({ frame }).x).toBeCloseTo(FIXED_CORNER.x, 8)
  })

  it('keeps the size closest to the requested one in a free corner resize', () => {
    const { source, frame } = createSkewedCropSourceFrame({ skewXDegrees: 12, frameWidth: 400, frameHeight: 250 })
    resizeFromTopLeft({ frame, scaleX: 3, scaleY: 3 })

    fitResizedCropFrameToSource({
      source, frame, originX: 'left', originY: 'top', axes: { x: true, y: true }, preserveAspectRatio: false
    })

    const rect = getCropRectInSource({ source, frame })
    expect(rect.left + rect.width).toBeCloseTo(500, 6)
    expect(rect.top + rect.height).toBeCloseTo(333.5, 6)
    expect(getTopLeft({ frame }).y).toBeCloseTo(FIXED_CORNER.y, 8)
  })

  it('does not change a frame that already fits the source', () => {
    const { source, frame } = createSkewedCropSourceFrame({ skewXDegrees: 12, frameWidth: 400, frameHeight: 250 })
    resizeFromTopLeft({ frame, scaleX: 1.2, scaleY: 1.2 })
    const { left, top, scaleX, scaleY } = frame

    const result = fitResizedCropFrameToSource({
      source, frame, originX: 'left', originY: 'top', axes: { x: true, y: true }, preserveAspectRatio: false
    })

    expect(result).toBe('unchanged')
    expect(frame.left).toBe(left)
    expect(frame.top).toBe(top)
    expect(frame.scaleX).toBe(scaleX)
    expect(frame.scaleY).toBe(scaleY)
  })

  it('keeps the center of a frame resized around it on a vertically skewed source', () => {
    const { source, frame } = createSkewedCropSourceFrame({ skewYDegrees: -8, frameWidth: 400, frameHeight: 250 })
    frame.set({ scaleX: 3, scaleY: 3 })

    const result = fitResizedCropFrameToSource({
      source, frame, originX: 'center', originY: 'center', axes: { x: true, y: true }, preserveAspectRatio: true
    })

    const rect = getCropRectInSource({ source, frame })
    expect(result).toBe('shrunk')
    expect(frame.left).toBeCloseTo(0, 8)
    expect(frame.top).toBeCloseTo(0, 8)
    expect(Math.max(rect.left + rect.width - 500, rect.top + rect.height - 333.5)).toBeCloseTo(0, 6)
  })

  it('reports an impossible fit instead of collapsing a frame whose fixed point is outside the source', () => {
    const { source, frame } = createSkewedCropSourceFrame({ skewXDegrees: 12, frameWidth: 400, frameHeight: 250 })
    frame.set({ left: 900 })
    const { scaleX, scaleY } = frame

    const result = fitResizedCropFrameToSource({
      source, frame, originX: 'left', originY: 'top', axes: { x: true, y: true }, preserveAspectRatio: false
    })

    expect(result).toBe('impossible')
    expect(frame.scaleX).toBe(scaleX)
    expect(frame.scaleY).toBe(scaleY)
  })

  it('reports an impossible fit when only a frame below the minimum crop size would fit', () => {
    const { source, frame } = createSkewedCropSourceFrame({ skewXDegrees: 12, frameWidth: 400, frameHeight: 250 })
    // The left side at x = 470 stays inside the slanted source edge, which leaves room for about 3.4 source pixels.
    frame.set({ left: 470 + 200 })

    const result = fitResizedCropFrameToSource({
      source, frame, originX: 'left', originY: 'center', axes: { x: true, y: false }, preserveAspectRatio: false
    })

    expect(result).toBe('impossible')
  })
})
