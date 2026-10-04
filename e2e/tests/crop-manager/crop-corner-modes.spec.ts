import { test, expect } from '../../fixtures/crop-scaling.fixture'

test('после уменьшения crop до минимума снова прилипает в той же сессии', async({
  crop,
  cropScalingImage,
  snapping
}) => {
  await crop.startImageCrop({ id: cropScalingImage.id, allowFrameOverflow: false })
  const snapped = await crop.dragFrameControlBySourcePixels({
    control: 'tr', deltaX: -500, deltaY: 333.5, pointerSteps: 1
  })
  const guides = await snapping.getGuideState()
  const minimum = await crop.continueFrameResizeBy({ deltaX: -300, deltaY: 300 })

  expect(minimum.rect).toMatchObject({ width: 24, height: 16 })
  expect(minimum.frame.scaleX / minimum.frame.scaleY).toBeCloseTo(1, 9)

  const restored = await crop.continueFrameResizeBy({ deltaX: 300, deltaY: -300 })

  expect(restored.rect).toEqual(snapped.rect)
  expect(await snapping.getGuideState()).toEqual(guides)
  expect(guides.guides).toHaveLength(2)
  expect((await crop.finishFrameResize()).rect).toEqual(restored.rect)
})

test('при скейлинге crop за угол с Alt сохраняет центр и пропорции', async({
  page,
  crop,
  cropScalingImage
}) => {
  const initial = await crop.startImageCrop({ id: cropScalingImage.id, allowFrameOverflow: false })
  await page.keyboard.down('Alt')
  const resized = await crop.dragFrameControlBySourcePixels({
    control: 'tr', deltaX: -250, deltaY: 166.75, pointerSteps: 4
  })

  expect(resized.rect.width).toBeLessThan(initial.rect.width)
  expect(resized.rect.height).toBeLessThan(initial.rect.height)
  expect(resized.rect.width).toBeGreaterThan(16)
  expect(resized.frame.left).toBeCloseTo(initial.frame.left, 9)
  expect(resized.frame.top).toBeCloseTo(initial.frame.top, 9)
  expect(resized.frame.scaleX / resized.frame.scaleY).toBeCloseTo(1, 9)
  expect((await crop.finishFrameResize()).rect).toEqual(resized.rect)
  await page.keyboard.up('Alt')
})

for (const axis of ['x', 'y'] as const) {
  test(`при угловом скейлинге повёрнутого и отражённого по ${axis} изображения сохраняет неподвижный угол crop`, async({
    crop,
    cropScalingImage,
    images
  }) => {
    const { id } = cropScalingImage
    await images.setAngle({ id, angle: 25 })
    const flipped = await images.flip({ id, axis })
    expect(axis === 'x' ? flipped.flipX : flipped.flipY).toBe(true)
    await crop.startImageCrop({ id, allowFrameOverflow: false })
    const fixed = await crop.frameControls.resolveControlPoint({ control: 'bl' })
    const states = await crop.dragFrameControlSlowlyToSourcePoint({
      control: 'tr', sourcePoint: { x: 500, y: 333.5 }, steps: 4
    })

    expect(states).toHaveLength(4)
    for (const { state } of states) {
      expect(state.frame.angle).toBe(25)
      expect(state.frame.scaleX / state.frame.scaleY).toBeCloseTo(1, 9)
      expect(state.rect.width).toBeGreaterThan(16)
      expect(state.rect.width).toBeLessThan(1000)
      expect(state.rect.height).toBeLessThan(667)
    }

    const fixedAfter = await crop.frameControls.resolveControlPoint({ control: 'bl' })
    expect(fixedAfter.x).toBeCloseTo(fixed.x, 6)
    expect(fixedAfter.y).toBeCloseTo(fixed.y, 6)
    const live = await crop.requireState()
    const finished = await crop.finishFrameResize()
    expect(finished.rect).toEqual(live.rect)
    expect(finished.frame.angle).toBe(live.frame.angle)
  })
}
