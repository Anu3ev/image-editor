import { test, expect } from '../../fixtures/crop-movement-spacing.fixture'

test('при перемещении crop сохраняет равные расстояния по горизонтали на микродвижениях', async({
  crop, cropSpacing: { frameId, center, before, after }, snapping, editorModel
}) => {
  const { zoom } = await editorModel.getCanvasState()
  await snapping.startObjectDrag({ id: frameId })
  await snapping.dragObjectTo({ id: frameId, left: center.left + 1 / zoom, top: center.top })
  const initial = await crop.requireState()
  const guides = await snapping.getGuideState()
  const halfWidth = (initial.frame.width * initial.frame.scaleX) / 2

  expect(initial.frame.left - halfWidth - before.boundsRight)
    .toBeCloseTo(after.boundsLeft - initial.frame.left - halfWidth, 8)
  expect(guides.spacingGuides).toHaveLength(1)
  expect(guides.spacingGuides[0].type).toBe('horizontal')
  for (const offset of [2, -1, 3]) {
    await snapping.dragObjectTo({ id: frameId, left: center.left + offset / zoom, top: center.top })
    const held = await crop.requireState()
    expect(held.frame).toEqual(initial.frame)
    expect(held.rect).toEqual(initial.rect)
    expect(await snapping.getGuideState()).toEqual(guides)
  }
  await snapping.finishPointerInteraction()
})

test.describe('Равноудалённость crop по вертикали', () => {
  test.use({ cropSpacingAxis: 'vertical' })

  test('при микродвижениях crop сохраняет равные расстояния сверху и снизу', async({
    crop, cropSpacing: { frameId, center, before, after }, snapping, editorModel
  }) => {
    const { zoom } = await editorModel.getCanvasState()
    await snapping.startObjectDrag({ id: frameId })
    await snapping.dragObjectTo({ id: frameId, left: center.left, top: center.top + 1 / zoom })
    const initial = await crop.requireState()
    const guides = await snapping.getGuideState()
    const halfHeight = (initial.frame.height * initial.frame.scaleY) / 2

    expect(initial.frame.top - halfHeight - before.boundsBottom)
      .toBeCloseTo(after.boundsTop - initial.frame.top - halfHeight, 8)
    expect(guides.spacingGuides).toHaveLength(1)
    expect(guides.spacingGuides[0].type).toBe('vertical')
    for (const offset of [2, -1, 3]) {
      await snapping.dragObjectTo({ id: frameId, left: center.left, top: center.top + offset / zoom })
      const held = await crop.requireState()
      expect(held.frame).toEqual(initial.frame)
      expect(held.rect).toEqual(initial.rect)
      expect(await snapping.getGuideState()).toEqual(guides)
    }
    await snapping.finishPointerInteraction()
  })
})
