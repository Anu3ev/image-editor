import { test, expect } from '../../fixtures/crop-scaling.fixture'
import { CROP_SIDE_SCALING_CASES } from '../../fixtures/data/crop-scaling.data'

test.beforeEach(async({ cropScalingImage: { id, source }, images }) => {
  await images.setStroke({ id, stroke: '#222222', strokeWidth: 20 })
  await images.moveBoundsTo({ id, left: source.boundsLeft + 43, top: source.boundsTop + 67 })
})

for (const { control, title, x, y } of CROP_SIDE_SCALING_CASES) {
  test(`при скейлинге crop ${title} прилипает к краю изображения без учёта его обводки`, async({
    crop, cropScalingImage: { id }, snapping
  }) => {
    const initial = await crop.startImageCrop({ id, allowFrameOverflow: false, preserveAspectRatio: false })
    const { frame } = initial
    const position = x !== 0
      ? frame.left - ((x * frame.width * frame.scaleX) / 2)
      : frame.top - ((y * frame.height * frame.scaleY) / 2)
    const type = x !== 0 ? 'vertical' : 'horizontal'
    const resized = await crop.dragFrameControlBySourcePixels({
      control, deltaX: x * 2, deltaY: y * 2, pointerSteps: 1
    })

    expect(resized.rect).toEqual(initial.rect)
    const acquired = (await snapping.getGuideState()).guides.find((guide) => guide.type === type)
    expect(acquired?.position).toBeCloseTo(position, 8)

    for (const offset of [1, 1, -2]) {
      const held = await crop.continueFrameResizeBy({ deltaX: x * offset, deltaY: y * offset })
      const guide = (await snapping.getGuideState()).guides.find((item) => item.type === type)
      expect(held.rect).toEqual(initial.rect)
      expect(guide?.position).toBeCloseTo(position, 8)
    }
    expect((await crop.finishFrameResize()).rect).toEqual(initial.rect)
  })

  test(`при перемещении crop к краю ${title} не учитывает обводку изображения`, async({
    crop, cropScalingImage: { id, source }, snapping, editorModel
  }) => {
    const initial = await crop.startImageCrop({ id, size: { width: 200, height: 150 }, allowFrameOverflow: false })
    const { frame } = initial
    if (!frame.id) throw new Error('Активная crop-область должна иметь id')
    const { zoom } = await editorModel.getCanvasState()
    const left = frame.left - ((x * (source.width - frame.width) * frame.scaleX) / 2)
    const top = frame.top - ((y * (source.height - frame.height) * frame.scaleY) / 2)
    const position = x !== 0
      ? frame.left - ((x * source.width * frame.scaleX) / 2)
      : frame.top - ((y * source.height * frame.scaleY) / 2)
    const type = x !== 0 ? 'vertical' : 'horizontal'
    await snapping.startObjectDrag({ id: frame.id })

    for (const offset of [1, 2, 3, 1]) {
      await snapping.dragObjectTo({ id: frame.id, left: left + ((x * offset) / zoom), top: top + ((y * offset) / zoom) })
      const held = await crop.requireState()
      const guide = (await snapping.getGuideState()).guides.find((item) => item.type === type)

      expect(held.frame.left).toBeCloseTo(left, 8)
      expect(held.frame.top).toBeCloseTo(top, 8)
      expect(held.rect).toMatchObject({ width: 200, height: 150 })
      expect(guide?.position).toBeCloseTo(position, 8)
    }
    const live = await crop.requireState()
    await snapping.finishPointerInteraction()
    expect(await crop.requireState()).toEqual(live)
  })
}
