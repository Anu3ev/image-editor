import { test, expect } from '../../fixtures/crop-scaling.fixture'

for (const axis of ['x', 'y'] as const) {
  test(`при перемещении crop повёрнутого и отражённого по ${axis} изображения сохраняет размер и ограничение источником`, async({
    crop, cropScalingImage: { id }, images, snapping, editorModel
  }) => {
    await images.setAngle({ id, angle: 25 })
    const flipped = await images.flip({ id, axis })
    expect(axis === 'x' ? flipped.flipX : flipped.flipY).toBe(true)
    const initial = await crop.startImageCrop({ id, size: { width: 200, height: 150 }, allowFrameOverflow: false })
    const frameId = initial.frame.id
    if (!frameId) throw new Error('Активная crop-область должна иметь id')
    const { left, top } = initial.frame
    const { zoom } = await editorModel.getCanvasState()
    await snapping.startObjectDrag({ id: frameId })
    await snapping.dragObjectTo({ id: frameId, left: left + 400, top: top + 300 })
    const limited = await crop.requireState()

    expect(limited.rect.left).toBeGreaterThanOrEqual(0)
    expect(limited.rect.top).toBeGreaterThanOrEqual(0)
    expect(limited.rect.left + limited.rect.width).toBeLessThanOrEqual(1000)
    expect(limited.rect.top + limited.rect.height).toBeLessThanOrEqual(667)
    expect(limited.rect).toMatchObject({ width: 200, height: 150 })
    expect(limited.frame.angle).toBe(25)

    for (const offset of [1, -2, 3]) {
      await snapping.dragObjectTo({ id: frameId, left: left + offset / zoom, top: top - offset / zoom })
      const held = await crop.requireState()
      expect(held.frame.left).toBeCloseTo(left, 8)
      expect(held.frame.top).toBeCloseTo(top, 8)
      expect(held.rect).toEqual(initial.rect)
      expect((await snapping.getGuideState()).guides).toHaveLength(2)
    }
    const live = await crop.requireState()
    await snapping.finishPointerInteraction()
    expect(await crop.requireState()).toEqual(live)
  })
}

test('при разрешённом выходе за источник crop перемещается наружу без изменения размеров', async({
  crop, cropScalingImage: { id, source }, snapping
}) => {
  const initial = await crop.startImageCrop({ id, size: { width: 200, height: 150 }, allowFrameOverflow: true })
  const frameId = initial.frame.id
  if (!frameId) throw new Error('Активная crop-область должна иметь id')
  await snapping.startObjectDrag({ id: frameId })
  await snapping.dragObjectTo({ id: frameId, left: source.boundsRight + 70, top: initial.frame.top + 25 })
  const moved = await crop.requireState()

  expect(moved.rect.left).toBeGreaterThan(source.width)
  expect(moved.rect).toMatchObject({ width: 200, height: 150 })
  expect(moved.frame.scaleX).toBe(initial.frame.scaleX)
  expect(moved.frame.scaleY).toBe(initial.frame.scaleY)
  await snapping.finishPointerInteraction()
  expect(await crop.requireState()).toEqual(moved)
})
