import { test as cropTest, expect } from './crop-scaling.fixture'
import type { SnappingObjectSnapshot } from '../types'

/** Source skew that should preserve the previous crop behavior. */
interface CropSourceGeometryFixtures {
  sourceSkew: { skewX: number; skewY: number }
  skewedCropImage: { id: string; source: SnappingObjectSnapshot }
}

/** Loads a skewed image through a template without changing internal crop state. */
export const test = cropTest.extend<CropSourceGeometryFixtures>({
  sourceSkew: [{ skewX: 12, skewY: 0 }, { option: true }],
  skewedCropImage: async({ cropScalingImage, sourceSkew, template, canvas, images, editorModel }, use) => {
    const definition = await template.serializeSelection({ withBackground: false })
    if (!definition || definition.objects.length !== 1) throw new Error('Шаблон должен содержать одно изображение')
    Object.assign(definition.objects[0], sourceSkew)
    await canvas.clearCanvas()
    expect(await template.applyTemplate({ template: definition })).toBe(1)
    const image = images.checkCreation({ imageObject: (await editorModel.getObjects())[0] })
    const source = await images.getSnapshot({ id: image.id })
    const geometry = await images.scaling.getSnapshot({ id: image.id })
    expect(geometry.skewX).toBe(sourceSkew.skewX)
    expect(geometry.skewY).toBe(sourceSkew.skewY)
    expect(source.width).toBe(cropScalingImage.source.width)
    expect(source.height).toBe(cropScalingImage.source.height)

    await use({ id: image.id, source })
  }
})

export { expect }
