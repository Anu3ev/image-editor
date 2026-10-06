import { test as cropTest, expect } from './crop-scaling.fixture'
import type { CropStateInfo, SnappingObjectSnapshot } from '../types'

/** Equal-spacing axis and an isolated scene with two crop neighbors. */
interface CropSpacingFixtures {
  cropSpacingAxis: 'horizontal' | 'vertical'
  cropSpacing: {
    frameId: string
    initial: CropStateInfo
    before: SnappingObjectSnapshot
    after: SnappingObjectSnapshot
    center: { left: number; top: number }
  }
}

/** Two neighbors with a gap exceeding the normal snapping threshold. */
export const test = cropTest.extend<CropSpacingFixtures>({
  cropSpacingAxis: ['horizontal', { option: true }],
  cropSpacing: async({ crop, cropScalingImage: { id, source }, shapes, snapping, cropSpacingAxis }, use) => {
    const horizontal = cropSpacingAxis === 'horizontal'
    const neighbors: SnappingObjectSnapshot[] = []
    for (const index of [0, 1]) {
      const shape = shapes.checkCreation({
        shape: await shapes.addAtBounds({
          presetKey: 'square',
          options: {
            left: source.boundsLeft + (horizontal ? 50 + index * 220 : 50),
            top: source.boundsTop + (horizontal ? 30 : 20 + index * 220),
            width: 40,
            height: 40,
            text: ''
          }
        }),
        presetKey: 'square'
      })
      neighbors.push(await snapping.getObjectSnapshot({ id: shape.id }))
    }
    const [before, after] = neighbors
    const initial = await crop.startImageCrop({ id, size: { width: 200, height: 150 }, allowFrameOverflow: false })
    const frameId = initial.frame.id
    if (!frameId) throw new Error('Активная crop-область должна иметь id')
    const center = {
      left: horizontal ? (before.boundsRight + after.boundsLeft) / 2 : source.boundsLeft + 110,
      top: horizontal ? source.boundsTop + 90 : (before.boundsBottom + after.boundsTop) / 2
    }

    await use({ frameId, initial, before, after, center })
  }
})

export { expect }
