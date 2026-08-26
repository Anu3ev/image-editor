import { test, expect } from '../../fixtures/editor.fixture'
import {
  IMAGE_SOURCE_RESTORE_ROUTE_MOCK,
  IMAGE_SOURCE_RESTORE_SOURCE_SIZE
} from '../../fixtures/data/image-source-restore.data'
import {
  TEMPLATE_BOUNDS_TOLERANCE,
  TEMPLATE_ROUNDTRIP_BASE_RESOLUTION,
  TEMPLATE_ROUNDTRIP_CROPPED_IMAGE_SOURCE,
  TEMPLATE_ROUNDTRIP_IMAGE_CROP_SIZE
} from '../../fixtures/data/template-manager.data'

test.use({ editorRouteMocks: [IMAGE_SOURCE_RESTORE_ROUTE_MOCK] })

test('после кропа изображение сохраняет видимую область при повторном применении шаблона', async({
  canvas,
  crop,
  editorModel,
  images,
  template
}) => {
  await canvas.setMontageResolution(TEMPLATE_ROUNDTRIP_BASE_RESOLUTION)
  const image = images.checkCreation({
    imageObject: await images.addColorGridImage(TEMPLATE_ROUNDTRIP_CROPPED_IMAGE_SOURCE)
  })

  await crop.startImageCrop({
    id: image.id,
    size: TEMPLATE_ROUNDTRIP_IMAGE_CROP_SIZE,
    allowFrameOverflow: true
  })
  await crop.moveActiveCropFrameToImageRightEdge({ image })
  await crop.apply()

  const croppedBounds = await images.getSnapshot({ id: image.id })
  const croppedDataUrl = await images.exportObjectAsBase64({ id: image.id })
  const croppedDataUrlSize = await images.getDataUrlSize({ dataUrl: croppedDataUrl })
  const croppedPixel = await images.getDataUrlPixelColor({
    dataUrl: croppedDataUrl,
    x: Math.floor(croppedDataUrlSize.width * 0.25),
    y: Math.floor(croppedDataUrlSize.height * 0.75)
  })
  const serializedTemplate = await template.serializeSelection()

  expect(serializedTemplate).not.toBeNull()
  expect(serializedTemplate?.objects).toHaveLength(1)
  if (!serializedTemplate) throw new Error('После crop должен быть создан шаблон с изображением')

  await editorModel.deleteSelectedObject()
  await editorModel.checkObjectCount({ count: 0 })

  const insertedCount = await template.applyTemplate({ template: serializedTemplate })
  const restoredBounds = await images.getSnapshot({ objectIndex: 0 })
  const restoredDataUrl = await images.exportObjectAsBase64({ objectIndex: 0 })
  const restoredDataUrlSize = await images.getDataUrlSize({ dataUrl: restoredDataUrl })
  const restoredPixel = await images.getDataUrlPixelColor({
    dataUrl: restoredDataUrl,
    x: Math.floor(restoredDataUrlSize.width * 0.25),
    y: Math.floor(restoredDataUrlSize.height * 0.75)
  })

  expect(insertedCount).toBe(1)
  expect(restoredBounds.boundsWidth).toBeCloseTo(croppedBounds.boundsWidth, 2)
  expect(restoredBounds.boundsHeight).toBeCloseTo(croppedBounds.boundsHeight, 2)
  expect(restoredDataUrlSize).toEqual(croppedDataUrlSize)
  expect(restoredPixel).toEqual(croppedPixel)
  expect(restoredPixel.alpha).toBe(255)
})

test('после замены src изображение заполняет прежнюю область без пустых полей', async({
  canvas,
  crop,
  editorModel,
  images,
  template
}) => {
  await canvas.setMontageResolution(TEMPLATE_ROUNDTRIP_BASE_RESOLUTION)
  const image = images.checkCreation({
    imageObject: await images.addColorGridImage(TEMPLATE_ROUNDTRIP_CROPPED_IMAGE_SOURCE)
  })

  await crop.startImageCrop({
    id: image.id,
    size: TEMPLATE_ROUNDTRIP_IMAGE_CROP_SIZE,
    allowFrameOverflow: true
  })
  await crop.moveActiveCropFrameToImageRightEdge({ image })
  await crop.apply()

  const croppedBounds = await images.getSnapshot({ id: image.id })
  const serializedTemplate = await template.serializeSelection()

  expect(serializedTemplate?.objects).toHaveLength(1)
  if (!serializedTemplate) throw new Error('После crop должен быть создан шаблон с изображением')

  const [serializedImage] = serializedTemplate.objects
  serializedImage.src = IMAGE_SOURCE_RESTORE_ROUTE_MOCK.url

  await editorModel.deleteSelectedObject()

  const insertedCount = await template.applyTemplate({ template: serializedTemplate })
  const [restoredBounds, sourceInfo, restoredDataUrl] = await Promise.all([
    images.getSnapshot({ objectIndex: 0 }),
    images.getSourceInfo({ objectIndex: 0 }),
    images.exportObjectAsBase64({ objectIndex: 0 })
  ])
  const restoredSize = await images.getDataUrlSize({ dataUrl: restoredDataUrl })
  const [topLeftPixel, bottomRightPixel] = await Promise.all([
    images.getDataUrlPixelColor({
      dataUrl: restoredDataUrl,
      x: Math.floor(restoredSize.width * 0.1),
      y: Math.floor(restoredSize.height * 0.1)
    }),
    images.getDataUrlPixelColor({
      dataUrl: restoredDataUrl,
      x: Math.floor(restoredSize.width * 0.9),
      y: Math.floor(restoredSize.height * 0.9)
    })
  ])

  expect(insertedCount).toBe(1)
  expect(sourceInfo).toEqual(expect.objectContaining({
    sourceWidth: IMAGE_SOURCE_RESTORE_SOURCE_SIZE.width,
    sourceHeight: IMAGE_SOURCE_RESTORE_SOURCE_SIZE.height
  }))
  expect(restoredBounds.boundsWidth).toBeCloseTo(croppedBounds.boundsWidth, 2)
  expect(restoredBounds.boundsHeight).toBeCloseTo(croppedBounds.boundsHeight, 2)
  expect(Math.abs(restoredBounds.boundsLeft - croppedBounds.boundsLeft)).toBeLessThan(TEMPLATE_BOUNDS_TOLERANCE)
  expect(Math.abs(restoredBounds.boundsTop - croppedBounds.boundsTop)).toBeLessThan(TEMPLATE_BOUNDS_TOLERANCE)
  expect(topLeftPixel.alpha).toBe(255)
  expect(bottomRightPixel.alpha).toBe(255)
})
