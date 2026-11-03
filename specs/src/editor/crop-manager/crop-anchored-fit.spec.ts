import type { Rect } from 'fabric'

import {
  fitResizedCropFrameToSource,
  type CropAnchoredFitResult,
  type CropResizeAxes
} from '../../../../src/editor/crop-manager/domain/crop-anchored-fit'
import { getCropRectInSource } from '../../../../src/editor/crop-manager/domain/crop-geometry'
import { createSkewedCropSourceFrame } from '../../../test-utils/crop/frame'

/** Hold distance at a source edge, in source pixels. */
const EDGE_HOLD_DISTANCE = 1

/** How far short of the source edge a held frame stops, in source pixels. */
const SHORTFALL_PIXELS = 0.5

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

/** Fits a frame resized from its top-left corner, which stays at FIXED_CORNER. */
function fitFromTopLeft({
  source,
  frame,
  axes,
  preserveAspectRatio,
  edgeHoldDistance = EDGE_HOLD_DISTANCE
}: {
  source: Rect
  frame: Rect
  axes: CropResizeAxes
  preserveAspectRatio: boolean
  edgeHoldDistance?: number
}): CropAnchoredFitResult {
  return fitResizedCropFrameToSource({
    source,
    frame,
    originX: 'left',
    originY: 'top',
    axes,
    preserveAspectRatio,
    edgeHoldDistance
  })
}

/** Returns the scale at which a frame resized from its top-left corner past the source edge fits without a hold. */
function getEdgeScale({
  source,
  frame,
  axes,
  preserveAspectRatio
}: {
  source: Rect
  frame: Rect
  axes: CropResizeAxes
  preserveAspectRatio: boolean
}): { scaleX: number, scaleY: number } {
  const initial = { scaleX: frame.scaleX, scaleY: frame.scaleY }
  resizeFromTopLeft({ frame, scaleX: axes.x ? 3 : frame.scaleX, scaleY: axes.y ? 3 : frame.scaleY })
  fitFromTopLeft({ source, frame, axes, preserveAspectRatio, edgeHoldDistance: 0 })
  const fitted = { scaleX: frame.scaleX, scaleY: frame.scaleY }
  resizeFromTopLeft({ frame, ...initial })

  return fitted
}

describe('crop anchored fit', () => {
  it('shrinks a frame resized from the right side to the source edge and keeps its left side', () => {
    const { source, frame } = createSkewedCropSourceFrame({ skewXDegrees: 12, frameWidth: 400, frameHeight: 250 })
    resizeFromTopLeft({ frame, scaleX: 3, scaleY: 1 })

    const result = fitFromTopLeft({ source, frame, axes: { x: true, y: false }, preserveAspectRatio: false })

    const rect = getCropRectInSource({ source, frame })
    expect(result).toBe('fitted')
    expect(rect.left + rect.width).toBeCloseTo(500, 8)
    expect(getTopLeft({ frame }).x).toBeCloseTo(FIXED_CORNER.x, 8)
    expect(getTopLeft({ frame }).y).toBeCloseTo(FIXED_CORNER.y, 8)
    expect(frame.scaleY).toBe(1)
  })

  it('keeps the frame proportions in a proportional corner resize', () => {
    const { source, frame } = createSkewedCropSourceFrame({ skewXDegrees: 12, frameWidth: 400, frameHeight: 250 })
    resizeFromTopLeft({ frame, scaleX: 3, scaleY: 3 })

    fitFromTopLeft({ source, frame, axes: { x: true, y: true }, preserveAspectRatio: true })

    const rect = getCropRectInSource({ source, frame })
    expect(frame.scaleX).toBeCloseTo(frame.scaleY, 10)
    expect(Math.max(rect.left + rect.width - 500, rect.top + rect.height - 333.5)).toBeCloseTo(0, 6)
    expect(getTopLeft({ frame }).x).toBeCloseTo(FIXED_CORNER.x, 8)
  })

  it('keeps the size closest to the requested one in a free corner resize', () => {
    const { source, frame } = createSkewedCropSourceFrame({ skewXDegrees: 12, frameWidth: 400, frameHeight: 250 })
    resizeFromTopLeft({ frame, scaleX: 3, scaleY: 3 })

    fitFromTopLeft({ source, frame, axes: { x: true, y: true }, preserveAspectRatio: false })

    const rect = getCropRectInSource({ source, frame })
    expect(rect.left + rect.width).toBeCloseTo(500, 6)
    expect(rect.top + rect.height).toBeCloseTo(333.5, 6)
    expect(getTopLeft({ frame }).y).toBeCloseTo(FIXED_CORNER.y, 8)
  })

  it('does not change a frame that already fits the source', () => {
    const { source, frame } = createSkewedCropSourceFrame({ skewXDegrees: 12, frameWidth: 400, frameHeight: 250 })
    resizeFromTopLeft({ frame, scaleX: 1.2, scaleY: 1.2 })
    const { left, top, scaleX, scaleY } = frame

    const result = fitFromTopLeft({ source, frame, axes: { x: true, y: true }, preserveAspectRatio: false })

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
      source,
      frame,
      originX: 'center',
      originY: 'center',
      axes: { x: true, y: true },
      preserveAspectRatio: true,
      edgeHoldDistance: EDGE_HOLD_DISTANCE
    })

    const rect = getCropRectInSource({ source, frame })
    expect(result).toBe('fitted')
    expect(frame.left).toBeCloseTo(0, 8)
    expect(frame.top).toBeCloseTo(0, 8)
    expect(Math.max(rect.left + rect.width - 500, rect.top + rect.height - 333.5)).toBeCloseTo(0, 6)
  })

  it('reports an impossible fit instead of collapsing a frame whose fixed point is outside the source', () => {
    const { source, frame } = createSkewedCropSourceFrame({ skewXDegrees: 12, frameWidth: 400, frameHeight: 250 })
    frame.set({ left: 900 })
    const { scaleX, scaleY } = frame

    const result = fitFromTopLeft({ source, frame, axes: { x: true, y: true }, preserveAspectRatio: false })

    expect(result).toBe('impossible')
    expect(frame.scaleX).toBe(scaleX)
    expect(frame.scaleY).toBe(scaleY)
  })

  it('reports an impossible fit when only a frame below the minimum crop size would fit', () => {
    const { source, frame } = createSkewedCropSourceFrame({ skewXDegrees: 12, frameWidth: 400, frameHeight: 250 })
    // The left side at x = 470 stays inside the slanted source edge, which leaves room for about 3.4 source pixels.
    frame.set({ left: 470 + 200 })

    const result = fitResizedCropFrameToSource({
      source,
      frame,
      originX: 'left',
      originY: 'center',
      axes: { x: true, y: false },
      preserveAspectRatio: false,
      edgeHoldDistance: EDGE_HOLD_DISTANCE
    })

    expect(result).toBe('impossible')
  })

  it('holds a side that stops less than the hold distance short of the source edge at that edge', () => {
    const { source, frame } = createSkewedCropSourceFrame({ skewXDegrees: 12, frameWidth: 400, frameHeight: 250 })
    const edgeScaleX = getEdgeScale({ source, frame, axes: { x: true, y: false }, preserveAspectRatio: false }).scaleX
    resizeFromTopLeft({ frame, scaleX: edgeScaleX - (SHORTFALL_PIXELS / frame.width), scaleY: 1 })

    const result = fitFromTopLeft({ source, frame, axes: { x: true, y: false }, preserveAspectRatio: false })

    const rect = getCropRectInSource({ source, frame })
    expect(result).toBe('fitted')
    expect(rect.left + rect.width).toBeCloseTo(500, 8)
    expect(getTopLeft({ frame }).x).toBeCloseTo(FIXED_CORNER.x, 8)
  })

  it('leaves a side that stops further than the hold distance from the source edge', () => {
    const { source, frame } = createSkewedCropSourceFrame({ skewXDegrees: 12, frameWidth: 400, frameHeight: 250 })
    const edgeScaleX = getEdgeScale({ source, frame, axes: { x: true, y: false }, preserveAspectRatio: false }).scaleX
    const scaleX = edgeScaleX - (SHORTFALL_PIXELS / frame.width)
    resizeFromTopLeft({ frame, scaleX, scaleY: 1 })

    const edgeHoldDistance = SHORTFALL_PIXELS / 2

    const result = fitFromTopLeft({ source, frame, axes: { x: true, y: false }, preserveAspectRatio: false, edgeHoldDistance })

    expect(result).toBe('unchanged')
    expect(frame.scaleX).toBe(scaleX)
  })

  it('holds a proportional resize at the first source edge it nearly reaches', () => {
    const { source, frame } = createSkewedCropSourceFrame({ skewXDegrees: 12, frameWidth: 400, frameHeight: 250 })
    const edgeScale = getEdgeScale({ source, frame, axes: { x: true, y: true }, preserveAspectRatio: true }).scaleX
    const scale = edgeScale - (SHORTFALL_PIXELS / frame.width)
    resizeFromTopLeft({ frame, scaleX: scale, scaleY: scale })

    fitFromTopLeft({ source, frame, axes: { x: true, y: true }, preserveAspectRatio: true })

    expect(frame.scaleX).toBeCloseTo(edgeScale, 10)
    expect(frame.scaleY).toBeCloseTo(edgeScale, 10)
  })

  it('holds each side of a free corner resize at the source edge it nearly reaches', () => {
    const { source, frame } = createSkewedCropSourceFrame({ skewXDegrees: 12, frameWidth: 400, frameHeight: 250 })
    const edge = getEdgeScale({ source, frame, axes: { x: true, y: true }, preserveAspectRatio: false })
    resizeFromTopLeft({
      frame,
      scaleX: edge.scaleX - (SHORTFALL_PIXELS / frame.width),
      scaleY: edge.scaleY - (SHORTFALL_PIXELS / frame.height)
    })

    fitFromTopLeft({ source, frame, axes: { x: true, y: true }, preserveAspectRatio: false })

    const rect = getCropRectInSource({ source, frame })
    expect(rect.left + rect.width).toBeCloseTo(500, 6)
    expect(rect.top + rect.height).toBeCloseTo(333.5, 6)
  })
})
