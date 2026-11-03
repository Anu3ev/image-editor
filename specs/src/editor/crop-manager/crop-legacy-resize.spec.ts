import type { Transform } from 'fabric'

import SnappingManager from '../../../../src/editor/snapping-manager'
import { getCropRectInSource } from '../../../../src/editor/crop-manager/domain/crop-geometry'
import { createActiveCropManager } from '../../../test-utils/crop/manager'
import { createSkewedCropSourceFrame } from '../../../test-utils/crop/frame'
import { createCropTransform } from '../../../test-utils/crop/interaction'

/** Strict crop session on a source with the given skew and a spy on published guides. */
function createStrictCrop({ skewXDegrees }: { skewXDegrees: number }) {
  const context = createActiveCropManager({ preserveAspectRatio: false, showDimmedArea: false })
  const { source, frame } = createSkewedCropSourceFrame({ skewXDegrees, frameWidth: 400, frameHeight: 250 })
  const snappingManager: SnappingManager = Object.create(SnappingManager.prototype)
  const publishVerifiedScaleGuides = jest.fn()
  snappingManager.publishVerifiedScaleGuides = publishVerifiedScaleGuides
  context.editor.snappingManager = snappingManager
  context.session.source = source
  context.session.frame = frame
  context.session.options.allowFrameOverflow = false
  context.session.effectivePreserveAspectRatio = false

  return { ...context, source, frame, publishVerifiedScaleGuides }
}

/** Fabric transform of the right side handle, which keeps the left side fixed. */
function createRightSideTransform({ frame }: { frame: ReturnType<typeof createStrictCrop>['frame'] }): Transform {
  const transform = createCropTransform({ frame, action: 'scale' })

  return {
    ...transform,
    corner: 'mr',
    originX: 'left',
    originY: 'center',
    original: { ...transform.original, originX: 'left', originY: 'center' }
  }
}

describe('strict legacy crop resize', () => {
  for (const skewXDegrees of [0, 12]) {
    it(`fits a frame resized past the source edge and keeps its left side (skew ${skewXDegrees}°)`, () => {
      const { cropManager, session, source, frame, publishVerifiedScaleGuides } = createStrictCrop({ skewXDegrees })
      const transform = createRightSideTransform({ frame })
      frame.set({ scaleX: 3, left: -300 + 600 })

      expect(cropManager['_fitLegacyResizeToSource']({ session, transform })).toBe(true)

      const rect = getCropRectInSource({ source, frame })
      expect(rect.left + rect.width).toBeCloseTo(500, 8)
      expect(frame.left - ((frame.width * frame.scaleX) / 2)).toBeCloseTo(-300, 8)
      expect(publishVerifiedScaleGuides).toHaveBeenCalledWith({ guides: [] })
    })
  }

  it('keeps the guides of a frame that already fits', () => {
    const { cropManager, session, frame, publishVerifiedScaleGuides } = createStrictCrop({ skewXDegrees: 12 })

    expect(cropManager['_fitLegacyResizeToSource']({
      session, transform: createCropTransform({ frame, action: 'scale' })
    })).toBe(true)
    expect(publishVerifiedScaleGuides).not.toHaveBeenCalled()
  })

  it('returns to the last size that fit when no allowed size fits', () => {
    const { cropManager, session, frame } = createStrictCrop({ skewXDegrees: 12 })
    const transform = createRightSideTransform({ frame })
    frame.set({ scaleX: 1.2, left: -300 + 240 })
    cropManager['_fitLegacyResizeToSource']({ session, transform })
    const fitted = { center: frame.getCenterPoint(), scaleX: frame.scaleX }

    frame.set({ left: 900 })
    expect(cropManager['_fitLegacyResizeToSource']({ session, transform })).toBe(true)

    expect(frame.scaleX).toBe(fitted.scaleX)
    expect(frame.getCenterPoint().x).toBeCloseTo(fitted.center.x, 8)
  })

  it('returns to the start of the gesture and hides its guides when its first step cannot fit', () => {
    const { cropManager, session, frame, publishVerifiedScaleGuides } = createStrictCrop({ skewXDegrees: 12 })
    const start = { center: frame.getCenterPoint(), scaleX: frame.scaleX }
    // Fabric stores the frame's own position in the transform, next to the origin of the gesture.
    const transform = createRightSideTransform({ frame })
    frame.set({ scaleX: 1.2, left: 900 })

    expect(cropManager['_fitLegacyResizeToSource']({ session, transform })).toBe(true)

    expect(frame.scaleX).toBe(start.scaleX)
    expect(frame.getCenterPoint().x).toBeCloseTo(start.center.x, 8)
    expect(frame.getCenterPoint().y).toBeCloseTo(start.center.y, 8)
    expect(publishVerifiedScaleGuides).toHaveBeenCalledWith({ guides: [] })
  })

  for (const { zoom, isHeld } of [{ zoom: 1, isHeld: false }, { zoom: 0.25, isHeld: true }]) {
    it(`${isHeld ? 'holds' : 'does not hold'} a side 3 source pixels short of the edge at zoom ${zoom}`, () => {
      const { cropManager, editor, session, source, frame } = createStrictCrop({ skewXDegrees: 12 })
      jest.mocked(editor.canvas.getZoom).mockReturnValue(zoom)
      const transform = createRightSideTransform({ frame })
      frame.set({ scaleX: 3, left: -300 + 600 })
      cropManager['_fitLegacyResizeToSource']({ session, transform })
      const edgeScaleX = frame.scaleX
      const scaleX = edgeScaleX - (3 / frame.width)
      frame.set({ scaleX, left: -300 + ((frame.width * scaleX) / 2) })

      cropManager['_fitLegacyResizeToSource']({ session, transform })

      const rect = getCropRectInSource({ source, frame })
      expect(rect.left + rect.width).toBeCloseTo(isHeld ? 500 : 497, 8)
    })
  }

  it('leaves moves and overflow mode to the regular clamp', () => {
    const { cropManager, session, frame } = createStrictCrop({ skewXDegrees: 12 })

    expect(cropManager['_fitLegacyResizeToSource']({
      session, transform: createCropTransform({ frame, action: 'drag' })
    })).toBe(false)

    session.options.allowFrameOverflow = true
    expect(cropManager['_fitLegacyResizeToSource']({
      session, transform: createCropTransform({ frame, action: 'scale' })
    })).toBe(false)
  })
})
