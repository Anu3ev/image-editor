import { test, expect } from '../../../fixtures/skewed-image-scaling.fixture'
import {
  SKEWED_IMAGE_EDGE_CASES,
  SKEWED_IMAGE_MAX_POINTER_STEPS,
  SKEWED_IMAGE_POINTER_STEP_PX
} from '../../../fixtures/data/snapping-image-scaling.data'
import { getImageBoundsEdge } from '../../../helpers/skewed-image.helper'

for (const { imageSkew, control, edge, directionX, directionY } of SKEWED_IMAGE_EDGE_CASES) {
  test.describe(`Scaling an image skewed by ${imageSkew.skewX}° × ${imageSkew.skewY}°`, () => {
    test.use({ imageSkew })

    test(`puts its ${edge} edge on the artboard guide when scaled from ${control}`, async({
      editorModel, images, snapping, skewedImage: { id }
    }) => {
      const montage = await editorModel.getMontageAreaBounds()
      const artboardEdge = montage[edge]
      await images.scaling.startFromControl({ control, id })

      const snapped = await test.step('the guide appears when the edge reaches the artboard side', async() => {
        for (let step = 1; step <= SKEWED_IMAGE_MAX_POINTER_STEPS; step += 1) {
          const snapshot = await images.scaling.dragControlBy({
            deltaX: directionX * SKEWED_IMAGE_POINTER_STEP_PX,
            deltaY: directionY * SKEWED_IMAGE_POINTER_STEP_PX
          })
          const { guides } = await snapping.getGuideState()
          if (guides.some(({ position }) => Math.abs(position - artboardEdge) < 0.5)) return snapshot
        }

        throw new Error(`The ${edge} artboard guide did not appear`)
      })

      await test.step('the image edge lies on the guide instead of past it', async() => {
        expect(getImageBoundsEdge({ snapshot: snapped, edge })).toBeCloseTo(artboardEdge, 0)
      })

      await test.step('mouseup keeps the image edge on the guide', async() => {
        const committed = await images.scaling.finish({ id })

        expect(getImageBoundsEdge({ snapshot: committed, edge })).toBeCloseTo(artboardEdge, 0)
        expect(committed.skewX).toBe(imageSkew.skewX)
        expect(committed.skewY).toBe(imageSkew.skewY)
      })
    })
  })
}
