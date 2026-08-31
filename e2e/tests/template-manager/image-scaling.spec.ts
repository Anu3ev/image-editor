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

test('шаблон сохраняет размеры изображений из растянутого общего выделения', async({
  canvas,
  editorModel,
  images,
  selection,
  template
}) => {
  await canvas.setMontageResolution(TEMPLATE_ROUNDTRIP_BASE_RESOLUTION)
  const montage = await editorModel.getMontageAreaBounds()
  const first = images.checkCreation({
    imageObject: await images.addFilledImage({
      width: 120,
      height: 99,
      withoutSelection: true
    })
  })
  const second = images.checkCreation({
    imageObject: await images.addFilledImage({
      width: 90,
      height: 110,
      withoutSelection: true
    })
  })

  await images.moveBoundsTo({ id: first.id, left: montage.left + 80, top: montage.top + 120 })
  await images.moveBoundsTo({ id: second.id, left: montage.left + 250, top: montage.top + 170 })
  await editorModel.selectAllObjects()

  const initial = await selection.getCompositionSnapshot()

  await selection.scaling.startFromControl({ control: 'mr' })
  await selection.scaling.dragControlToScenePoint({
    point: { x: initial.selection.boundsRight + 80, y: initial.selection.centerY }
  })
  await selection.scaling.finish()

  const scaled = await Promise.all([images.getSnapshot({ id: first.id }), images.getSnapshot({ id: second.id })])
  const beforeSerialization = await selection.getCompositionSnapshot()
  const serializedTemplate = await template.serializeSelection()
  const afterSerialization = await selection.getCompositionSnapshot()

  expect(serializedTemplate?.objects).toHaveLength(2)
  expect(serializedTemplate?.objects.every(({ customData }) => {
    if (!customData || typeof customData !== 'object') return false

    return 'imageFit' in customData && customData.imageFit === 'stretch'
  })).toBe(true)
  expect(afterSerialization).toEqual(beforeSerialization)
  if (!serializedTemplate) throw new Error('Общее выделение должно сериализоваться в шаблон')

  await editorModel.deleteSelectedObject()
  expect(await template.applyTemplate({ template: serializedTemplate })).toBe(2)

  const restored = await Promise.all([images.getSnapshot({ objectIndex: 0 }), images.getSnapshot({ objectIndex: 1 })])

  for (const [index, restoredImage] of restored.entries()) {
    const scaledImage = scaled[index]
    if (!scaledImage) throw new Error('До применения шаблона должны существовать оба изображения')

    expect(restoredImage.boundsLeft).toBeCloseTo(scaledImage.boundsLeft, 2)
    expect(restoredImage.boundsTop).toBeCloseTo(scaledImage.boundsTop, 2)
    expect(restoredImage.boundsWidth).toBeCloseTo(scaledImage.boundsWidth, 2)
    expect(restoredImage.boundsHeight).toBeCloseTo(scaledImage.boundsHeight, 2)
  }
})

test('шаблон сохраняет геометрию повёрнутого изображения из растянутого общего выделения', async({
  canvas,
  editorModel,
  images,
  selection,
  template
}) => {
  await canvas.setMontageResolution(TEMPLATE_ROUNDTRIP_BASE_RESOLUTION)
  const montage = await editorModel.getMontageAreaBounds()
  const first = images.checkCreation({
    imageObject: await images.addFilledImage({ width: 120, height: 99, withoutSelection: true })
  })
  const second = images.checkCreation({
    imageObject: await images.addFilledImage({ width: 90, height: 110, withoutSelection: true })
  })

  await images.moveBoundsTo({ id: first.id, left: montage.left + 80, top: montage.top + 120 })
  await images.moveBoundsTo({ id: second.id, left: montage.left + 250, top: montage.top + 170 })
  await images.setAngle({ id: first.id, angle: 27 })
  await editorModel.selectAllObjects()

  const initial = await selection.getCompositionSnapshot()

  await selection.scaling.startFromControl({ control: 'mr' })
  await selection.scaling.dragControlToScenePoint({
    point: { x: initial.selection.boundsRight + 80, y: initial.selection.centerY }
  })
  await selection.scaling.finish()

  const scaled = await Promise.all([images.getSnapshot({ id: first.id }), images.getSnapshot({ id: second.id })])
  const scaledMatrices = await Promise.all([
    images.getTransformMatrix({ id: first.id }),
    images.getTransformMatrix({ id: second.id })
  ])
  const serializedTemplate = await template.serializeSelection()

  expect(scaled[0].angle).toBeCloseTo(27, 5)
  expect(serializedTemplate?.objects).toHaveLength(2)
  if (!serializedTemplate) throw new Error('Общее выделение должно сериализоваться в шаблон')

  await editorModel.deleteSelectedObject()
  expect(await template.applyTemplate({ template: serializedTemplate })).toBe(2)

  const restored = await Promise.all([images.getSnapshot({ objectIndex: 0 }), images.getSnapshot({ objectIndex: 1 })])
  const restoredMatrices = await Promise.all([
    images.getTransformMatrix({ objectIndex: 0 }),
    images.getTransformMatrix({ objectIndex: 1 })
  ])

  for (const [index, restoredImage] of restored.entries()) {
    const scaledImage = scaled[index]
    const scaledMatrix = scaledMatrices[index]
    const restoredMatrix = restoredMatrices[index]
    if (!scaledImage || !scaledMatrix || !restoredMatrix) {
      throw new Error('До и после применения шаблона должны существовать оба изображения')
    }

    expect(restoredImage.width).toBeCloseTo(scaledImage.width, 5)
    expect(restoredImage.height).toBeCloseTo(scaledImage.height, 5)
    for (const [componentIndex, component] of restoredMatrix.entries()) {
      expect(component).toBeCloseTo(scaledMatrix[componentIndex]!, 2)
    }
  }
})
