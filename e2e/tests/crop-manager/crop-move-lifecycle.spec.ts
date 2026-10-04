import { test, expect } from '../../fixtures/crop-movement.fixture'

test('при отмене переноса за границу изображения не сохраняет crop и ложные направляющие', async({
  crop, cropMovement: setup, cropScalingImage, history, snapping
}) => {
  const { frameId, initial, imageId } = setup
  const { source } = cropScalingImage
  await crop.events.start()
  await snapping.startObjectDrag({ id: frameId })

  for (const offset of [25, 40, 60]) {
    await snapping.dragObjectTo({ id: frameId, left: source.boundsRight + offset, top: initial.frame.top })
    const live = await crop.requireState()

    expect(live.rect.left + live.rect.width).toBe(source.width)
    expect(live.rect).toMatchObject({ top: initial.rect.top, width: 200, height: 150 })
    expect(live.frame.top).toBeCloseTo(initial.frame.top, 9)
    expect(await snapping.getGuideState()).toEqual({ guides: [], spacingGuides: [] })
    expect(await history.getSerializedStateText()).toBe(setup.serializedHistory)
  }

  const live = await crop.requireState()
  await snapping.finishPointerInteraction()
  expect(await crop.requireState()).toEqual(live)
  expect(await history.getPosition()).toEqual(setup.history)
  await crop.cancel()

  expect(await crop.isActive()).toBe(false)
  expect(await crop.getImageSourceInfo({ id: imageId })).toEqual(setup.source)
  expect(await history.getSerializedStateText()).toBe(setup.serializedHistory)
  expect(await snapping.getGuideState()).toEqual({ guides: [], spacingGuides: [] })
  const events = await crop.events.finish()
  expect(events.filter((event) => event === 'changed').length).toBeGreaterThan(0)
  expect(events.filter((event) => event === 'cancelled')).toHaveLength(1)
  expect(events).not.toContain('applied')
})

test('при применении переноса к границе изображения сохраняет один шаг и восстанавливает undo/redo', async({
  crop, cropMovement: setup, cropScalingImage, history, snapping
}) => {
  const { frameId, initial, imageId } = setup
  const { source } = cropScalingImage
  await crop.events.start()
  await snapping.startObjectDrag({ id: frameId })
  await snapping.dragObjectTo({ id: frameId, left: source.boundsRight + 30, top: initial.frame.top })
  const live = await crop.requireState()

  expect(live.rect.left + live.rect.width).toBe(source.width)
  expect(live.rect).toMatchObject({ top: initial.rect.top, width: 200, height: 150 })
  expect(await snapping.getGuideState()).toEqual({ guides: [], spacingGuides: [] })
  expect(await history.getSerializedStateText()).toBe(setup.serializedHistory)
  await snapping.finishPointerInteraction()
  expect(await crop.requireState()).toEqual(live)
  expect(await history.getPosition()).toEqual(setup.history)

  await crop.apply()
  const applied = await crop.getImageSourceInfo({ id: imageId })
  expect(applied).toMatchObject({ width: 200, height: 150, cropX: live.rect.left, cropY: live.rect.top })
  expect(await history.getPosition()).toEqual({
    currentIndex: setup.history.currentIndex + 1, patchCount: setup.history.patchCount + 1
  })
  expect(await crop.isActive()).toBe(false)
  expect(await snapping.getGuideState()).toEqual({ guides: [], spacingGuides: [] })
  const events = await crop.events.finish()
  expect(events.filter((event) => event === 'changed').length).toBeGreaterThan(0)
  expect(events.filter((event) => event === 'applied')).toHaveLength(1)
  expect(events).not.toContain('cancelled')

  await history.undo()
  expect(await crop.getImageSourceInfo({ id: imageId })).toEqual(setup.source)
  await history.redo()
  expect(await crop.getImageSourceInfo({ id: imageId })).toEqual(applied)
})

test('после отмены указателя crop сохраняет положение и начинает новое перемещение без прежнего удержания', async({
  crop, cropMovement: { frameId, initial, history: initialHistory }, snapping, history
}) => {
  const { left, top } = initial.frame
  await snapping.startObjectDrag({ id: frameId })
  await snapping.dragObjectTo({ id: frameId, left: left + 2, top: top + 2 })
  const held = await crop.requireState()
  expect((await snapping.getGuideState()).guides).toHaveLength(2)

  const cleared = await snapping.cancelPointerInteraction()
  expect(cleared).toEqual({ guides: [], spacingGuides: [] })
  expect(await crop.requireState()).toEqual(held)
  expect(await history.getPosition()).toEqual(initialHistory)

  await snapping.startObjectDrag({ id: frameId })
  const free = await snapping.dragObjectTo({ id: frameId, left: left + 35, top: top + 25 })
  expect(free.left).toBeGreaterThan(held.frame.left + 20)
  expect(free.top).toBeGreaterThan(held.frame.top + 15)
  expect(await snapping.getGuideState()).toEqual({ guides: [], spacingGuides: [] })
  await snapping.finishPointerInteraction()
  expect(await history.getPosition()).toEqual(initialHistory)
})
