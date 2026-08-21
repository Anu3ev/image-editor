import { test, expect } from '../../fixtures/editor.fixture'
import {
  TEMPLATE_ROUNDTRIP_BASE_RESOLUTION,
  TEMPLATE_ROUNDTRIP_IMAGE_SCALE_X,
  TEMPLATE_ROUNDTRIP_IMAGE_SIZE
} from '../../fixtures/data/template-manager.data'

test('после скейлинга изображение сохраняет размер при повторном применении шаблона', async({
  canvas,
  editorModel,
  images,
  template
}) => {
  const scaled = await test.step('Добавить изображение и увеличить его ширину', async() => {
    await canvas.setMontageResolution(TEMPLATE_ROUNDTRIP_BASE_RESOLUTION)
    const image = images.checkCreation({
      imageObject: await images.addFilledImage(TEMPLATE_ROUNDTRIP_IMAGE_SIZE)
    })
    const initial = await images.getSnapshot({ id: image.id })
    const result = await images.scaling.resizeFromRight({
      id: image.id,
      scaleX: TEMPLATE_ROUNDTRIP_IMAGE_SCALE_X
    })

    expect(result.boundsWidth).toBeGreaterThan(initial.boundsWidth)
    expect(result.boundsHeight).toBeCloseTo(initial.boundsHeight, 2)

    return result
  })

  const serializedTemplate = await test.step('Сохранить масштабированное изображение как шаблон', async() => {
    const result = await template.serializeSelection()

    expect(result).not.toBeNull()
    expect(result?.objects).toHaveLength(1)
    if (!result) throw new Error('После скейлинга должен быть создан шаблон с изображением')

    return result
  })

  await test.step('Удалить изображение и применить сохранённый шаблон', async() => {
    await editorModel.deleteSelectedObject()
    await editorModel.checkObjectCount({ count: 0 })

    const insertedCount = await template.applyTemplate({ template: serializedTemplate })
    const restored = await images.getSnapshot({ objectIndex: 0 })

    expect(insertedCount).toBe(1)
    expect(restored.scaleX).toBeCloseTo(scaled.scaleX, 3)
    expect(restored.scaleY).toBeCloseTo(scaled.scaleY, 3)
    expect(restored.boundsWidth).toBeCloseTo(scaled.boundsWidth, 2)
    expect(restored.boundsHeight).toBeCloseTo(scaled.boundsHeight, 2)
  })
})
