import { test, expect } from '../../fixtures/crop-scaling.fixture'
import { EDGE_IMAGE_CROP_MIDDLE_GUIDE_DRAG_CASES } from '../../fixtures/data/crop-size-indicator.data'

test('при микродвижениях удерживает crop на выбранной направляющей рядом с другой', async({
  crop,
  cropScalingImage,
  shapes,
  snapping,
  editorModel
}) => {
  const { id, source } = cropScalingImage
  const { zoom } = await editorModel.getCanvasState()
  shapes.checkCreation({
    shape: await shapes.addAtBounds({
      presetKey: 'square',
      options: {
        left: ((source.boundsLeft + source.boundsRight) / 2) - (2 / zoom),
        top: ((source.boundsTop + source.boundsBottom) / 2) + (2 / zoom),
        width: 30,
        height: 30,
        text: ''
      }
    }),
    presetKey: 'square'
  })
  await crop.startImageCrop({ id, allowFrameOverflow: false, preserveAspectRatio: true })
  const snapped = await crop.dragFrameControlBySourcePixels({
    control: 'tr',
    deltaX: -500,
    deltaY: 333.5,
    pointerSteps: 1
  })
  const guides = await snapping.getGuideState()
  const indicator = await editorModel.requireObjectSizeIndicator()

  expect(snapped.rect.width).toBe(500)
  expect(snapped.rect.height).toBe(334)
  expect(guides.guides.length).toBeGreaterThan(0)

  for (const delta of [1, 1, -3, 2]) {
    const held = await crop.continueFrameResizeBy({ deltaX: -delta, deltaY: delta })

    for (const field of ['left', 'top', 'scaleX', 'scaleY'] as const) {
      expect(held.frame[field]).toBeCloseTo(snapped.frame[field], 9)
    }
    expect(held.rect).toEqual(snapped.rect)
    expect(await snapping.getGuideState()).toEqual(guides)
    expect(await editorModel.requireObjectSizeIndicator()).toEqual(indicator)
  }

  const finished = await crop.finishFrameResize()

  for (const field of ['left', 'top', 'scaleX', 'scaleY'] as const) {
    expect(finished.frame[field]).toBeCloseTo(snapped.frame[field], 9)
  }
  expect(finished.rect).toEqual(snapped.rect)
  expect((await snapping.getGuideState()).guides).toHaveLength(0)
})

for (const { control, title, deltaX, deltaY } of EDGE_IMAGE_CROP_MIDDLE_GUIDE_DRAG_CASES) {
  test(`при скейлинге из ${title} удерживает обе середины изображения и размер после mouseup`, async({
    crop,
    cropScalingImage,
    snapping,
    editorModel
  }) => {
    await crop.startImageCrop({ id: cropScalingImage.id, allowFrameOverflow: false })
    const snapped = await crop.dragFrameControlBySourcePixels({
      control, deltaX: deltaX * 500, deltaY: deltaY * 333.5, pointerSteps: 1
    })
    const guides = await snapping.getGuideState()

    expect(snapped.rect.width).toBe(500)
    expect(snapped.rect.height).toBe(334)
    expect(guides.guides).toHaveLength(2)

    for (const delta of [1, 1, -3, 2]) {
      const held = await crop.continueFrameResizeBy({ deltaX: deltaX * delta, deltaY: deltaY * delta })
      expect(held.rect).toEqual(snapped.rect)
      expect(held.frame.scaleX).toBeCloseTo(snapped.frame.scaleX, 9)
      expect(held.frame.scaleY).toBeCloseTo(snapped.frame.scaleY, 9)
      expect(await snapping.getGuideState()).toEqual(guides)
      expect(await editorModel.requireObjectSizeIndicator()).toMatchObject({ width: 500, height: 334 })
    }

    expect((await crop.finishFrameResize()).rect).toEqual(snapped.rect)
    expect((await snapping.getGuideState()).guides).toHaveLength(0)
  })
}

test('отпускает crop после выхода из зоны удержания и снова прилипает при возврате', async({
  crop,
  cropScalingImage,
  snapping
}) => {
  await crop.startImageCrop({ id: cropScalingImage.id, allowFrameOverflow: false })
  const snapped = await crop.dragFrameControlBySourcePixels({
    control: 'tr', deltaX: -500, deltaY: 333.5, pointerSteps: 1
  })
  const guides = await snapping.getGuideState()
  const released = await crop.continueFrameResizeBy({ deltaX: -30, deltaY: 30 })

  expect(released.rect.width).toBeLessThan(snapped.rect.width)
  expect(released.rect.height).toBeLessThan(snapped.rect.height)
  expect((await snapping.getGuideState()).guides).toHaveLength(0)

  const reacquired = await crop.continueFrameResizeBy({ deltaX: 30, deltaY: -30 })

  expect(reacquired.rect).toEqual(snapped.rect)
  expect(await snapping.getGuideState()).toEqual(guides)
  expect((await crop.finishFrameResize()).rect).toEqual(reacquired.rect)
})

test('Ctrl отключает удержание crop и позволяет снова прилипнуть после отпускания клавиши', async({
  page,
  crop,
  cropScalingImage,
  snapping
}) => {
  await crop.startImageCrop({ id: cropScalingImage.id, allowFrameOverflow: false })
  const snapped = await crop.dragFrameControlBySourcePixels({
    control: 'tr', deltaX: -500, deltaY: 333.5, pointerSteps: 1
  })
  const guides = await snapping.getGuideState()

  await page.keyboard.down('Control')
  const unsnapped = await crop.continueFrameResizeBy({ deltaX: -2, deltaY: 2 })

  expect(unsnapped.rect.width).toBeLessThan(snapped.rect.width)
  expect((await snapping.getGuideState()).guides).toHaveLength(0)

  await page.keyboard.up('Control')
  const reacquired = await crop.continueFrameResizeBy({ deltaX: 1, deltaY: -1 })

  expect(reacquired.rect).toEqual(snapped.rect)
  expect(await snapping.getGuideState()).toEqual(guides)
  expect((await crop.finishFrameResize()).rect).toEqual(reacquired.rect)
})

test('при свободном скейлинге crop отпускает одну ось, продолжая удерживать другую', async({
  crop,
  cropScalingImage,
  snapping
}) => {
  await crop.startImageCrop({ id: cropScalingImage.id, allowFrameOverflow: false, preserveAspectRatio: false })
  const snapped = await crop.dragFrameControlBySourcePixels({
    control: 'tr', deltaX: -500, deltaY: 333.5, pointerSteps: 1
  })
  const guides = await snapping.getGuideState()

  expect(guides.guides).toHaveLength(2)
  expect(snapped.rect).toMatchObject({ width: 500, height: 334 })

  for (const delta of [10, 5, 5]) {
    const released = await crop.continueFrameResizeBy({ deltaX: -delta, deltaY: 0 })
    const current = await snapping.getGuideState()

    expect(released.rect.height).toBe(snapped.rect.height)
    expect(released.frame.top).toBeCloseTo(snapped.frame.top, 9)
    expect(released.rect.width).toBeLessThan(snapped.rect.width)
    expect(current.guides).toEqual(guides.guides.filter((guide) => guide.type === 'horizontal'))
  }

  const live = await crop.requireState()
  expect((await crop.finishFrameResize()).rect).toEqual(live.rect)
})
