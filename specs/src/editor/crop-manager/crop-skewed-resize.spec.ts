import type { Transform } from 'fabric'

import SnappingManager from '../../../../src/editor/snapping-manager'
import { getCropRectInSource } from '../../../../src/editor/crop-manager/domain/crop-geometry'
import { createActiveCropManager } from '../../../test-utils/crop/manager'
import { createSkewedCropSourceFrame } from '../../../test-utils/crop/frame'
import { createCropTransform } from '../../../test-utils/crop/interaction'

/** Strict crop session on a horizontally skewed source with a spy on published guides. */
function createSkewedStrictCrop({ skewXDegrees = 12 }: { skewXDegrees?: number } = {}) {
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

describe('strict crop resize on a skewed source', () => {
  it('fits a frame resized from the right handle and hides the guide it moved off', () => {
    const { cropManager, session, source, frame, publishVerifiedScaleGuides } = createSkewedStrictCrop()
    frame.set({ scaleX: 3, left: -300 + 600 })
    const transform: Transform = {
      ...createCropTransform({ frame, action: 'scale' }),
      corner: 'mr',
      originX: 'left',
      originY: 'center'
    }

    const fitted = cropManager['_fitNonRectangularSourceResize']({ session, transform })

    const rect = getCropRectInSource({ source, frame })
    expect(fitted).toBe(true)
    expect(rect.left + rect.width).toBeCloseTo(500, 8)
    expect(frame.left - ((frame.width * frame.scaleX) / 2)).toBeCloseTo(-300, 8)
    expect(publishVerifiedScaleGuides).toHaveBeenCalledWith({ guides: [] })
  })

  it('keeps the guides of a frame that already fits', () => {
    const { cropManager, session, frame, publishVerifiedScaleGuides } = createSkewedStrictCrop()
    const transform = createCropTransform({ frame, action: 'scale' })

    expect(cropManager['_fitNonRectangularSourceResize']({ session, transform })).toBe(true)
    expect(publishVerifiedScaleGuides).not.toHaveBeenCalled()
  })

  it('leaves the regular clamp to a frame that is a rectangle in source coordinates', () => {
    const { cropManager, session, frame } = createSkewedStrictCrop({ skewXDegrees: 0 })
    frame.set({ scaleX: 3 })

    expect(cropManager['_fitNonRectangularSourceResize']({
      session, transform: createCropTransform({ frame, action: 'scale' })
    })).toBe(false)
  })

  it('leaves the regular clamp to a move, to overflow mode and to an impossible fit', () => {
    const { cropManager, session, frame } = createSkewedStrictCrop()

    expect(cropManager['_fitNonRectangularSourceResize']({
      session, transform: createCropTransform({ frame, action: 'drag' })
    })).toBe(false)

    frame.set({ left: 900 })
    expect(cropManager['_fitNonRectangularSourceResize']({
      session, transform: createCropTransform({ frame, action: 'scale' })
    })).toBe(false)

    session.options.allowFrameOverflow = true
    expect(cropManager['_fitNonRectangularSourceResize']({
      session, transform: createCropTransform({ frame, action: 'scale' })
    })).toBe(false)
  })
})
