import { test as cropTest, expect } from './crop-scaling.fixture'
import { reapplyImageWithSkew, type ImageTemplateGeometry } from '../helpers/skewed-image.helper'
import type { SnappingObjectSnapshot } from '../types'

/** Source skew that should preserve the previous crop behavior. */
interface CropSourceGeometryFixtures {
  sourceSkew: ImageTemplateGeometry
  skewedCropImage: { id: string; source: SnappingObjectSnapshot }
}

/** Loads a skewed image through a template without changing internal crop state. */
export const test = cropTest.extend<CropSourceGeometryFixtures>({
  sourceSkew: [{ skewX: 12, skewY: 0 }, { option: true }],
  skewedCropImage: async({ cropScalingImage, sourceSkew, template, canvas, images, editorModel }, use) => {
    const { id } = await reapplyImageWithSkew({ geometry: sourceSkew, template, canvas, images, editorModel })
    const source = await images.getSnapshot({ id })
    expect(source.width).toBe(cropScalingImage.source.width)
    expect(source.height).toBe(cropScalingImage.source.height)

    await use({ id, source })
  }
})

export { expect }
