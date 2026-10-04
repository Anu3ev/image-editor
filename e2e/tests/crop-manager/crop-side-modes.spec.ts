import { test, expect } from '../../fixtures/crop-scaling.fixture'
import { CROP_SIDE_SCALING_CASES } from '../../fixtures/data/crop-scaling.data'

test('при изменении ширины crop сохраняет дробную высоту от предыдущего скейлинга', async({
  crop,
  cropScalingImage
}) => {
  await crop.startImageCrop({ id: cropScalingImage.id, allowFrameOverflow: false, preserveAspectRatio: false })
  await crop.dragFrameControlBySourcePixels({ control: 'tr', deltaX: -500, deltaY: 333.5, pointerSteps: 1 })
  const initial = await crop.finishFrameResize()
  const resized = await crop.dragFrameControlBy({ control: 'mr', deltaX: -30, deltaY: 0, pointerSteps: 3 })

  expect(resized.rect.width).toBeLessThan(initial.rect.width)
  expect(resized.frame.scaleY).toBeCloseTo(initial.frame.scaleY, 9)
  expect(resized.frame.top).toBeCloseTo(initial.frame.top, 9)
  expect((await crop.finishFrameResize()).frame.scaleY).toBeCloseTo(initial.frame.scaleY, 9)
})

test('Ctrl отключает удержание боковой ручки crop и позволяет снова прилипнуть', async({
  page,
  crop,
  cropScalingImage,
  snapping
}) => {
  await crop.startImageCrop({ id: cropScalingImage.id, allowFrameOverflow: false })
  const snapped = await crop.dragFrameControlBySourcePixels({
    control: 'mr', deltaX: -500, deltaY: 0, pointerSteps: 1
  })
  const guides = await snapping.getGuideState()
  await page.keyboard.down('Control')
  const released = await crop.continueFrameResizeBy({ deltaX: -2, deltaY: 0 })

  expect(released.rect.width).toBeLessThan(snapped.rect.width)
  expect((await snapping.getGuideState()).guides).toHaveLength(0)

  await page.keyboard.up('Control')
  const restored = await crop.continueFrameResizeBy({ deltaX: 1, deltaY: 0 })
  expect(restored.rect).toEqual(snapped.rect)
  expect(await snapping.getGuideState()).toEqual(guides)
  await crop.finishFrameResize()
})

test('при скейлинге crop сбоку с Alt сохраняет центр и пропорции', async({
  page,
  crop,
  cropScalingImage
}) => {
  const initial = await crop.startImageCrop({ id: cropScalingImage.id, allowFrameOverflow: false })
  await page.keyboard.down('Alt')
  const resized = await crop.dragFrameControlBySourcePixels({
    control: 'ml', deltaX: 250, deltaY: 40, pointerSteps: 4
  })

  expect(resized.rect.width).toBeLessThan(initial.rect.width)
  expect(resized.rect.height).toBeLessThan(initial.rect.height)
  expect(resized.frame.left).toBeCloseTo(initial.frame.left, 9)
  expect(resized.frame.top).toBeCloseTo(initial.frame.top, 9)
  expect(resized.frame.scaleX / resized.frame.scaleY).toBeCloseTo(1, 9)
  expect((await crop.finishFrameResize()).rect).toEqual(resized.rect)
  await page.keyboard.up('Alt')
})

for (const { control, fixedControl, title, deltaX, deltaY, x, y } of CROP_SIDE_SCALING_CASES) {
  test(`при скейлинге crop ${title} снова прилипает после уменьшения до минимума без mouseup`, async({
    crop,
    cropScalingImage,
    snapping
  }) => {
    await crop.startImageCrop({ id: cropScalingImage.id, allowFrameOverflow: false })
    const snapped = await crop.dragFrameControlBySourcePixels({ control, deltaX, deltaY, pointerSteps: 1 })
    const guides = await snapping.getGuideState()
    const minimum = await crop.continueFrameResizeBy({ deltaX: x * 300, deltaY: y * 300 })

    expect(minimum.rect).toMatchObject({ width: 24, height: 16 })
    expect(minimum.frame.scaleX / minimum.frame.scaleY).toBeCloseTo(1, 9)

    const restored = await crop.continueFrameResizeBy({ deltaX: -x * 300, deltaY: -y * 300 })
    expect(restored.rect).toEqual(snapped.rect)
    expect(await snapping.getGuideState()).toEqual(guides)
    expect(guides.guides.length).toBeGreaterThan(0)
    expect((await crop.finishFrameResize()).rect).toEqual(restored.rect)
  })

  test(`при скейлинге crop ${title} у повёрнутого и отражённого изображения сохраняет противоположную сторону`, async({
    crop,
    cropScalingImage,
    images
  }) => {
    const { id } = cropScalingImage
    await images.setAngle({ id, angle: 25 })
    const flipped = await images.flip({ id, axis: x === 0 ? 'y' : 'x' })
    expect(x === 0 ? flipped.flipY : flipped.flipX).toBe(true)
    await crop.startImageCrop({ id, allowFrameOverflow: false })
    const fixed = await crop.frameControls.resolveControlPoint({ control: fixedControl })
    const states = await crop.dragFrameControlSlowlyToSourcePoint({
      control, sourcePoint: { x: 500, y: 333.5 }, steps: 4
    })

    expect(states).toHaveLength(4)
    for (const { state } of states) {
      expect(state.frame.angle).toBe(25)
      expect(state.frame.scaleX / state.frame.scaleY).toBeCloseTo(1, 9)
      expect(state.rect.width).toBeGreaterThan(16)
      expect(state.rect.width).toBeLessThan(1000)
      expect(state.rect.height).toBeLessThan(667)
    }

    const fixedAfter = await crop.frameControls.resolveControlPoint({ control: fixedControl })
    expect(fixedAfter.x).toBeCloseTo(fixed.x, 6)
    expect(fixedAfter.y).toBeCloseTo(fixed.y, 6)
    const live = await crop.requireState()
    expect((await crop.finishFrameResize()).rect).toEqual(live.rect)
  })
}
