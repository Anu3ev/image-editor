import { test as editorTest, expect } from './editor.fixture'
import { reapplyImageWithSkew, type ImageTemplateGeometry } from '../helpers/skewed-image.helper'
import { SKEWED_IMAGE_SCALE_SIZE } from './data/snapping-image-scaling.data'

/** Skewed image in the middle of the artboard, away from every artboard edge. */
interface SkewedImageScalingFixtures {
  imageSkew: ImageTemplateGeometry
  skewedImage: { id: string }
}

/** Loads a small skewed image through a template for scale snapping scenarios. */
export const test = editorTest.extend<SkewedImageScalingFixtures>({
  imageSkew: [{ skewX: 20, skewY: 0 }, { option: true }],
  skewedImage: async({ imageSkew, template, canvas, images, editorModel }, use) => {
    images.checkCreation({ imageObject: await images.addFilledImage(SKEWED_IMAGE_SCALE_SIZE) })

    await use(await reapplyImageWithSkew({ geometry: imageSkew, template, canvas, images, editorModel }))
  }
})

export { expect }
