import { test, expect } from '../../fixtures/crop-source-geometry.fixture'
import { CROP_GEOMETRY_RESIZE_CASES, CROP_SOURCE_SKEW_CASES } from '../../fixtures/data/crop-scaling.data'

for (const { title: sourceTitle, skewX, skewY } of CROP_SOURCE_SKEW_CASES) {
  for (const preserveAspectRatio of [false, true]) {
    const mode = preserveAspectRatio ? 'с сохранением пропорций' : 'без сохранения пропорций'

    test.describe(`${sourceTitle}, ${mode}`, () => {
      test.use({ sourceSkew: { skewX, skewY } })

      for (const { control, title, x, y, fixedX, fixedY } of CROP_GEOMETRY_RESIZE_CASES) {
        test(`при растягивании crop ${title} сохраняет неподвижную сторону и размер после mouseup`, async({
          crop, skewedCropImage: { id }
        }) => {
          const initial = await crop.startImageCrop({
            id, size: { width: 400, height: 250 }, preserveAspectRatio, allowFrameOverflow: true
          })
          const initialWidth = initial.frame.width * initial.frame.scaleX
          const initialHeight = initial.frame.height * initial.frame.scaleY
          const initialFixedX = initial.frame.left + ((fixedX - 0.5) * initialWidth)
          const initialFixedY = initial.frame.top + ((fixedY - 0.5) * initialHeight)
          const liveStates = await crop.dragFrameControlSlowlyBySourcePixels({
            control, deltaX: x * 80, deltaY: y * 80, steps: 4
          })

          expect(liveStates).toHaveLength(4)
          for (const { state: live } of liveStates) {
            const width = live.frame.width * live.frame.scaleX
            const height = live.frame.height * live.frame.scaleY

            expect(live.frame.left + ((fixedX - 0.5) * width)).toBeCloseTo(initialFixedX, 8)
            expect(live.frame.top + ((fixedY - 0.5) * height)).toBeCloseTo(initialFixedY, 8)
            if (x !== 0 || preserveAspectRatio) expect(width).toBeGreaterThan(initialWidth)
            if (y !== 0 || preserveAspectRatio) expect(height).toBeGreaterThan(initialHeight)
            if (!preserveAspectRatio && x === 0) expect(width).toBeCloseTo(initialWidth, 8)
            if (!preserveAspectRatio && y === 0) expect(height).toBeCloseTo(initialHeight, 8)
            if (preserveAspectRatio) expect(width / height).toBeCloseTo(initialWidth / initialHeight, 8)
          }

          const last = await crop.requireState()
          expect(await crop.finishFrameResize()).toEqual(last)
        })
      }
    })
  }
}

test('Ctrl отключает направляющие crop наклонённого изображения и сохраняет неподвижный край', async({
  crop, page, snapping, skewedCropImage: { id }
}) => {
  const initial = await crop.startImageCrop({
    id, size: { width: 400, height: 250 }, preserveAspectRatio: false, allowFrameOverflow: true
  })
  const initialLeft = initial.frame.left - ((initial.frame.width * initial.frame.scaleX) / 2)
  await page.keyboard.down('Control')
  const states = await crop.dragFrameControlSlowlyBySourcePixels({
    control: 'mr', deltaX: 80, deltaY: 0, steps: 4
  })

  for (const { state } of states) {
    const width = state.frame.width * state.frame.scaleX
    expect(state.frame.left - (width / 2)).toBeCloseTo(initialLeft, 8)
    expect(state.frame.scaleY).toBe(initial.frame.scaleY)
  }
  expect((await snapping.getGuideState()).guides).toHaveLength(0)
  const last = await crop.requireState()
  expect(await crop.finishFrameResize()).toEqual(last)
  await page.keyboard.up('Control')
})

test('Shift и Alt сохраняют центр и пропорции crop наклонённого изображения при свободном исходном режиме', async({
  crop, page, skewedCropImage: { id }
}) => {
  const initial = await crop.startImageCrop({
    id, size: { width: 400, height: 250 }, preserveAspectRatio: false, allowFrameOverflow: true
  })
  await page.keyboard.down('Shift')
  await page.keyboard.down('Alt')
  const states = await crop.dragFrameControlSlowlyBySourcePixels({
    control: 'tr', deltaX: 80, deltaY: -50, steps: 4
  })

  for (const { state } of states) {
    expect(state.frame.left).toBeCloseTo(initial.frame.left, 8)
    expect(state.frame.top).toBeCloseTo(initial.frame.top, 8)
    expect(state.frame.scaleX / state.frame.scaleY).toBeCloseTo(initial.frame.scaleX / initial.frame.scaleY, 8)
    expect(state.rect.width).toBeGreaterThan(initial.rect.width)
  }
  const last = await crop.requireState()
  const finished = await crop.finishFrameResize()
  expect(finished.frame).toEqual(last.frame)
  expect(finished.rect).toEqual(last.rect)
  expect(finished.effectivePreserveAspectRatio).toBe(false)
  await page.keyboard.up('Alt')
  await page.keyboard.up('Shift')
})
