import { test, expect } from '../../fixtures/editor.fixture'
import {
  CROP_IMAGE_HEIGHT_SCALE_RATIO,
  CROP_SQUARE_ASPECT_RATIO,
  CROP_SQUARE_IMAGE_SIZE
} from '../../fixtures/data/crop-frame-visible-aspect-ratio.data'

test('после уменьшения высоты изображения повторно создаёт видимую crop-область 1:1', async({
  crop,
  images,
  snapping
}) => {
  const image = images.checkCreation({
    imageObject: await images.addFilledImage(CROP_SQUARE_IMAGE_SIZE)
  })
  const initialCrop = await crop.startImageCrop({
    id: image.id,
    aspectRatio: CROP_SQUARE_ASPECT_RATIO,
    allowFrameOverflow: false
  })

  expect(initialCrop.frame.id, 'у первой crop-области должен быть id').not.toBeNull()
  if (!initialCrop.frame.id) throw new Error('Первая crop-область должна иметь id')

  const initialBounds = await snapping.getObjectSnapshot({ id: initialCrop.frame.id })
  await crop.cancel()

  const startedScale = await images.scaling.startFromControl({ control: 'mb', id: image.id })
  await images.scaling.dragControlToScenePoint({
    point: {
      x: startedScale.controlPoints.mb.x,
      y: startedScale.controlPoints.mt.y
        + ((startedScale.controlPoints.mb.y - startedScale.controlPoints.mt.y)
          * CROP_IMAGE_HEIGHT_SCALE_RATIO)
    },
    pointerSteps: 5
  })
  const scaledImage = await images.scaling.finish({ id: image.id })
  const repeatedCrop = await crop.startImageCrop({
    id: image.id,
    aspectRatio: CROP_SQUARE_ASPECT_RATIO,
    allowFrameOverflow: false
  })

  expect(repeatedCrop.frame.id, 'у повторной crop-области должен быть id').not.toBeNull()
  if (!repeatedCrop.frame.id) throw new Error('Повторная crop-область должна иметь id')

  const repeatedBounds = await snapping.getObjectSnapshot({ id: repeatedCrop.frame.id })
  await crop.cancel()

  expect(initialBounds.boundsWidth / initialBounds.boundsHeight).toBeCloseTo(1, 5)
  expect(scaledImage.scaleY).toBeLessThan(scaledImage.scaleX)
  expect(repeatedBounds.boundsWidth / repeatedBounds.boundsHeight).toBeCloseTo(1, 5)
})

test('после уменьшения высоты изображения применяет видимую пропорцию 1:1 к активной crop-области', async({
  crop,
  images,
  snapping
}) => {
  const image = images.checkCreation({
    imageObject: await images.addFilledImage(CROP_SQUARE_IMAGE_SIZE)
  })

  const startedScale = await images.scaling.startFromControl({ control: 'mb', id: image.id })
  await images.scaling.dragControlToScenePoint({
    point: {
      x: startedScale.controlPoints.mb.x,
      y: startedScale.controlPoints.mt.y
        + ((startedScale.controlPoints.mb.y - startedScale.controlPoints.mt.y)
          * CROP_IMAGE_HEIGHT_SCALE_RATIO)
    },
    pointerSteps: 5
  })
  await images.scaling.finish({ id: image.id })

  const initialCrop = await crop.startImageCrop({
    id: image.id,
    allowFrameOverflow: false
  })
  expect(initialCrop.frame.id, 'у активной crop-области должен быть id').not.toBeNull()
  if (!initialCrop.frame.id) throw new Error('Активная crop-область должна иметь id')

  const initialBounds = await snapping.getObjectSnapshot({ id: initialCrop.frame.id })
  const squareCrop = await crop.setAspectRatio(CROP_SQUARE_ASPECT_RATIO)
  const squareBounds = await snapping.getObjectSnapshot({ id: initialCrop.frame.id })

  await crop.cancel()

  expect(initialBounds.boundsWidth / initialBounds.boundsHeight).not.toBeCloseTo(1, 2)
  expect(squareCrop.frame.id).toBe(initialCrop.frame.id)
  expect(squareBounds.boundsWidth / squareBounds.boundsHeight).toBeCloseTo(1, 5)
})
