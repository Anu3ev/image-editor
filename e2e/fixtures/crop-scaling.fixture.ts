import { test as editorTest, expect } from './editor.fixture'
import { EDGE_IMAGE_CROP_SOURCE_SIZE } from './data/crop-size-indicator.data'
import type { SnappingObjectSnapshot } from '../types'

/** Source image for testing crop scaling with real mouse input. */
interface CropScalingFixtures {
  cropScalingImage: { id: string; source: SnappingObjectSnapshot }
}

/** Isolated image with an odd height; the scenario starts cropping itself. */
export const test = editorTest.extend<CropScalingFixtures>({
  cropScalingImage: async({ images }, use) => {
    const image = images.checkCreation({
      imageObject: await images.addFilledImage(EDGE_IMAGE_CROP_SOURCE_SIZE)
    })
    const source = await images.getSnapshot({ id: image.id })
    expect(source.width).toBe(EDGE_IMAGE_CROP_SOURCE_SIZE.width)
    expect(source.height).toBe(EDGE_IMAGE_CROP_SOURCE_SIZE.height)

    await use({ id: image.id, source })
  }
})

export { expect }
