import { test, expect } from '../../fixtures/crop-scaling.fixture'

test('при перемещении crop удерживает выбранную направляющую рядом с другой', async({
  crop,
  cropScalingImage,
  shapes,
  snapping,
  editorModel
}) => {
  const { id, source } = cropScalingImage
  const { zoom } = await editorModel.getCanvasState()
  const guideX = source.boundsLeft + 150
  const centerY = source.boundsTop + 120
  for (const offset of [0, 2]) {
    shapes.checkCreation({
      shape: await shapes.addAtBounds({
        presetKey: 'square',
        options: { left: guideX + (offset / zoom), top: source.boundsTop + 30, width: 30, height: 30, text: '' }
      }),
      presetKey: 'square'
    })
  }
  const initial = await crop.startImageCrop({ id, size: { width: 200, height: 150 }, allowFrameOverflow: false })
  const frameId = initial.frame.id
  expect(frameId).not.toBeNull()
  if (!frameId) throw new Error('Активная crop-область должна иметь id')
  await snapping.startObjectDrag({ id: frameId })
  const snapped = await snapping.dragObjectTo({ id: frameId, left: guideX, top: centerY })
  const guides = await snapping.getGuideState()
  const snappedCrop = await crop.requireState()

  expect(snapped.left).toBeCloseTo(guideX, 6)
  expect(guides.guides.length).toBeGreaterThan(0)

  for (const offset of [1, 2, -1, 3]) {
    const held = await snapping.dragObjectTo({ id: frameId, left: guideX + (offset / zoom), top: centerY })
    expect(held.left).toBeCloseTo(snapped.left, 9)
    expect(held.top).toBeCloseTo(snapped.top, 9)
    expect((await crop.requireState()).rect).toEqual(snappedCrop.rect)
    expect(await snapping.getGuideState()).toEqual(guides)
  }

  await snapping.finishPointerInteraction()
  expect((await crop.requireState()).rect).toEqual(snappedCrop.rect)
  expect((await snapping.getGuideState()).guides).toHaveLength(0)
})
