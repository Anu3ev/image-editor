import { test, expect } from '../../fixtures/crop-movement.fixture'

test('при перемещении crop удерживает обе направляющие и отпускает их за пределами зоны прилипания', async({
  crop, cropMovement: { frameId, initial }, snapping, editorModel
}) => {
  const { left, top } = initial.frame
  const { zoom } = await editorModel.getCanvasState()
  await snapping.startObjectDrag({ id: frameId })
  await snapping.dragObjectTo({ id: frameId, left: left + 35, top: top + 25 })
  const snapped = await snapping.dragObjectTo({ id: frameId, left, top })
  const heldCrop = await crop.requireState()
  const guides = await snapping.getGuideState()

  expect(guides.guides).toHaveLength(2)
  expect(snapped.left).toBeCloseTo(left, 8)
  expect(snapped.top).toBeCloseTo(top, 8)
  for (const offset of [1, -2, 3, -1]) {
    const held = await snapping.dragObjectTo({
      id: frameId, left: left + offset / zoom, top: top - offset / zoom
    })
    expect(held.left).toBeCloseTo(snapped.left, 9)
    expect(held.top).toBeCloseTo(snapped.top, 9)
    expect((await crop.requireState()).rect).toEqual(heldCrop.rect)
    expect(await snapping.getGuideState()).toEqual(guides)
  }

  const released = await snapping.dragObjectTo({ id: frameId, left: left + 35, top: top + 25 })
  expect(released.left).toBeGreaterThan(snapped.left + 20)
  expect(released.top).toBeGreaterThan(snapped.top + 15)
  expect(await snapping.getGuideState()).toEqual({ guides: [], spacingGuides: [] })
  await snapping.finishPointerInteraction()
})

test('Ctrl отключает удержание при перемещении crop и позволяет снова прилипнуть без mouseup', async({
  crop, cropMovement: { frameId, initial }, snapping, editorModel
}) => {
  const { left, top } = initial.frame
  const { zoom } = await editorModel.getCanvasState()
  await snapping.startObjectDrag({ id: frameId })
  await snapping.dragObjectTo({ id: frameId, left: left + 1 / zoom, top: top + 1 / zoom })
  const held = await crop.requireState()
  const guides = await snapping.getGuideState()
  expect(guides.guides).toHaveLength(2)

  const free = await snapping.dragObjectTo({
    id: frameId, left: left + 2 / zoom, top: top + 2 / zoom, ctrlKey: true
  })
  expect(free.left).toBeGreaterThan(held.frame.left)
  expect(free.top).toBeGreaterThan(held.frame.top)
  expect(await snapping.getGuideState()).toEqual({ guides: [], spacingGuides: [] })

  await snapping.dragObjectTo({ id: frameId, left: left + 1 / zoom, top: top + 1 / zoom })
  expect((await crop.requireState()).rect).toEqual(held.rect)
  expect(await snapping.getGuideState()).toEqual(guides)
  await snapping.finishPointerInteraction()
})

test('после zoom и pan сохраняет направляющие и размер при перемещении crop', async({
  crop, cropMovement: { frameId, initial }, snapping, editorModel
}) => {
  const before = await editorModel.getCanvasViewportTransform()
  await editorModel.zoomInUntilViewportCanMove()
  await editorModel.dragViewportBySpaceMouse({ deltaX: -24, deltaY: -18 })
  const after = await editorModel.getCanvasViewportTransform()
  expect(after.zoom).toBeGreaterThan(before.zoom)
  expect(after.x).not.toBeCloseTo(before.x, 5)
  const { left, top } = initial.frame
  await snapping.startObjectDrag({ id: frameId })

  for (const offset of [2, -1, 3]) {
    await snapping.dragObjectTo({ id: frameId, left: left + offset / after.zoom, top: top - offset / after.zoom })
    const held = await crop.requireState()
    expect(held.frame.left).toBeCloseTo(left, 9)
    expect(held.frame.top).toBeCloseTo(top, 9)
    expect(held.rect).toEqual(initial.rect)
    expect((await snapping.getGuideState()).guides).toHaveLength(2)
  }
  await snapping.finishPointerInteraction()
})
