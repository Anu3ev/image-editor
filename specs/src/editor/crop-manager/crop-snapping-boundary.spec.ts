import { Rect } from 'fabric'

import { createActiveCropManager } from '../../../test-utils/crop/manager'

it('сохраняет прежние точные границы источника только для активной crop-рамки', () => {
  const { cropManager, session: { source, frame } } = createActiveCropManager({ showDimmedArea: false })
  source.set({ width: 200, height: 100, strokeWidth: 20 })
  source.getBoundingRect = jest.fn(() => ({ left: 10.25, top: 20.5, width: 220.75, height: 120.625 }))

  try {
    const boundary = cropManager.getFrameSnappingBoundary(frame)

    expect(boundary?.object).toBe(source)
    expect(boundary?.bounds).toEqual({
      left: 10.25, right: 231, top: 20.5, bottom: 141.125, centerX: 120.625, centerY: 80.8125
    })
    expect(cropManager.getFrameSnappingBoundary(source)).toBeUndefined()
    expect(cropManager.getFrameSnappingBoundary(new Rect({}))).toBeUndefined()

    cropManager.cancel()

    expect(cropManager.getFrameSnappingBoundary(frame)).toBeUndefined()
    expect(cropManager.isActive).toBe(false)
  } finally {
    cropManager.destroy()
  }
})
