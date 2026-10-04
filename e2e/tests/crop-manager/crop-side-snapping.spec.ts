import { test, expect } from '../../fixtures/crop-scaling.fixture'
import { CROP_SIDE_SCALING_CASES } from '../../fixtures/data/crop-scaling.data'

test('при скейлинге crop справа удерживает размер рядом с конкурирующей направляющей', async({
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
        top: source.boundsTop + 20,
        width: 30,
        height: 30,
        text: ''
      }
    }),
    presetKey: 'square'
  })
  await crop.startImageCrop({ id, allowFrameOverflow: false })
  const snapped = await crop.dragFrameControlBySourcePixels({
    control: 'mr', deltaX: -500, deltaY: 0, pointerSteps: 1
  })
  const guides = await snapping.getGuideState()
  const indicator = await editorModel.requireObjectSizeIndicator()

  expect(snapped.rect.width).toBe(500)
  expect(guides.guides.length).toBeGreaterThan(0)

  for (const delta of [1, 1, -3, 2]) {
    const held = await crop.continueFrameResizeBy({ deltaX: -delta, deltaY: 0 })

    expect(held.rect).toEqual(snapped.rect)
    expect(held.frame.scaleX).toBeCloseTo(snapped.frame.scaleX, 9)
    expect(held.frame.scaleY).toBeCloseTo(snapped.frame.scaleY, 9)
    expect(await snapping.getGuideState()).toEqual(guides)
    expect(await editorModel.requireObjectSizeIndicator()).toEqual(indicator)
  }

  expect((await crop.finishFrameResize()).rect).toEqual(snapped.rect)
  expect((await snapping.getGuideState()).guides).toHaveLength(0)
})

for (const { control, fixedControl, title, deltaX, deltaY, x, y } of CROP_SIDE_SCALING_CASES) {
  test(`при пропорциональном скейлинге crop ${title} удерживает размер и противоположную сторону`, async({
    crop,
    cropScalingImage,
    snapping,
    editorModel
  }) => {
    await crop.startImageCrop({ id: cropScalingImage.id, allowFrameOverflow: false })
    const fixed = await crop.frameControls.resolveControlPoint({ control: fixedControl })
    const snapped = await crop.dragFrameControlBySourcePixels({ control, deltaX, deltaY, pointerSteps: 1 })
    const guides = await snapping.getGuideState()

    expect(snapped.rect).toMatchObject({ width: 500, height: 334 })
    expect(guides.guides.length).toBeGreaterThan(0)

    for (const delta of [1, 1, -3, 2]) {
      const held = await crop.continueFrameResizeBy({ deltaX: x * delta, deltaY: y * delta })
      const currentFixed = await crop.frameControls.resolveControlPoint({ control: fixedControl })

      expect(held.rect).toEqual(snapped.rect)
      expect(held.frame.scaleX).toBeCloseTo(snapped.frame.scaleX, 9)
      expect(held.frame.scaleY).toBeCloseTo(snapped.frame.scaleY, 9)
      expect(currentFixed.x).toBeCloseTo(fixed.x, 6)
      expect(currentFixed.y).toBeCloseTo(fixed.y, 6)
      expect(await snapping.getGuideState()).toEqual(guides)
      expect(await editorModel.requireObjectSizeIndicator()).toMatchObject({ width: 500, height: 334 })
    }

    expect((await crop.finishFrameResize()).rect).toEqual(snapped.rect)
    expect((await snapping.getGuideState()).guides).toHaveLength(0)
  })

  test(`при свободном скейлинге crop ${title} не меняет размер по другой оси`, async({
    crop,
    cropScalingImage,
    snapping
  }) => {
    const initial = await crop.startImageCrop({
      id: cropScalingImage.id, allowFrameOverflow: false, preserveAspectRatio: false
    })
    const snapped = await crop.dragFrameControlBySourcePixels({ control, deltaX, deltaY, pointerSteps: 1 })
    const guides = await snapping.getGuideState()
    const untouched = x === 0 ? 'width' : 'height'
    const changed = x === 0 ? 'height' : 'width'

    expect(snapped.rect[changed]).toBeLessThan(initial.rect[changed])
    expect(snapped.rect[untouched]).toBe(initial.rect[untouched])
    expect(guides.guides.length).toBeGreaterThan(0)

    for (const delta of [1, 1, -3, 2]) {
      const held = await crop.continueFrameResizeBy({ deltaX: x * delta, deltaY: y * delta })
      expect(held.rect).toEqual(snapped.rect)
      expect(held.frame.scaleX).toBeCloseTo(snapped.frame.scaleX, 9)
      expect(held.frame.scaleY).toBeCloseTo(snapped.frame.scaleY, 9)
      expect(await snapping.getGuideState()).toEqual(guides)
    }

    expect((await crop.finishFrameResize()).rect).toEqual(snapped.rect)
  })
}
