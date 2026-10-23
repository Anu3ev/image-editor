import { test, expect } from '../../fixtures/crop-source-geometry.fixture'
import {
  CROP_GEOMETRY_RESIZE_CASES,
  CROP_SOURCE_SKEW_CASES,
  ROTATED_CROP_SOURCE_SKEW,
  STEEP_CROP_SOURCE_SKEW,
  STRICT_CROP_SINGLE_AXIS_OVERFLOW_CASES,
  STRICT_CROP_SOURCE_SKEWS
} from '../../fixtures/data/crop-scaling.data'
import {
  expectCropFrameFitsSource,
  getCropFramePoint,
  getVisibleCropFrameRatio,
  getVisibleCropFrameSize
} from '../../helpers/crop-source-geometry.helper'

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

for (const sourceSkew of STRICT_CROP_SOURCE_SKEWS) {
  test.describe(`Strict crop of an image skewed by ${sourceSkew.skewX}° × ${sourceSkew.skewY}°`, () => {
    test.use({ sourceSkew })

    for (const preserveAspectRatio of [false, true]) {
      const mode = preserveAspectRatio ? 'with aspect ratio preserved' : 'with free aspect ratio'

      test(`starts inside the source and keeps its size on the first move, ${mode}`, async({
        crop, skewedCropImage: { id }
      }) => {
        const initial = await crop.startImageCrop({ id, preserveAspectRatio, allowFrameOverflow: false })

        await test.step('the frame fits inside the source right after start', async() => {
          expectCropFrameFitsSource({ overflow: await crop.sourceFit.getFrameOverflow() })
        })

        await test.step('a micro move does not shrink the frame', async() => {
          const moved = await crop.dragFrameByOffset({ deltaX: 1, deltaY: 1 })

          expect(moved.frame.scaleX).toBeCloseTo(initial.frame.scaleX, 8)
          expect(moved.frame.scaleY).toBeCloseTo(initial.frame.scaleY, 8)
          expectCropFrameFitsSource({ overflow: await crop.sourceFit.getFrameOverflow() })
        })

        await test.step('mouseup keeps the live frame', async() => {
          const last = await crop.requireState()
          const finished = await crop.finishFrameMove()

          expect(finished.frame).toEqual(last.frame)
          expect(finished.rect).toEqual(last.rect)
        })
      })
    }

    test('fits a requested aspect ratio and a proportional reset inside the source', async({
      crop, skewedCropImage: { id }
    }) => {
      await crop.startImageCrop({ id, preserveAspectRatio: true, allowFrameOverflow: false })

      await test.step('a square aspect ratio stays square', async() => {
        const square = await crop.setAspectRatio({ width: 1, height: 1 })

        expect(getVisibleCropFrameRatio(square)).toBeCloseTo(1, 8)
        expectCropFrameFitsSource({ overflow: await crop.sourceFit.getFrameOverflow() })
      })

      await test.step('reset to the source keeps the current proportions', async() => {
        const reset = await crop.resetFrameToSource()

        expect(getVisibleCropFrameRatio(reset)).toBeCloseTo(1, 8)
        expectCropFrameFitsSource({ overflow: await crop.sourceFit.getFrameOverflow() })
      })
    })

    test('keeps a requested aspect ratio when free resizing is enabled', async({
      crop, skewedCropImage: { id }
    }) => {
      const initial = await crop.startImageCrop({
        id, aspectRatio: { width: 1, height: 1 }, preserveAspectRatio: false, allowFrameOverflow: false
      })

      expect(getVisibleCropFrameRatio(initial)).toBeCloseTo(1, 8)
      expectCropFrameFitsSource({ overflow: await crop.sourceFit.getFrameOverflow() })

      const wide = await crop.setAspectRatio({ width: 16, height: 9 })

      expect(getVisibleCropFrameRatio(wide)).toBeCloseTo(16 / 9, 8)
      expectCropFrameFitsSource({ overflow: await crop.sourceFit.getFrameOverflow() })
    })

    for (const preserveAspectRatio of [false, true]) {
      const mode = preserveAspectRatio ? 'with aspect ratio preserved' : 'with free aspect ratio'

      for (const { control, x, y, fixedX, fixedY } of CROP_GEOMETRY_RESIZE_CASES) {
        test(`keeps the fixed side when resized from ${control} past the source edge, ${mode}`, async({
          crop, skewedCropImage: { id }
        }) => {
          const initial = await crop.startImageCrop({
            id, size: { width: 400, height: 250 }, preserveAspectRatio, allowFrameOverflow: false
          })
          const fixedPoint = getCropFramePoint({ state: initial, x: fixedX, y: fixedY })
          const liveStates = await crop.dragFrameControlSlowlyBySourcePixels({
            control, deltaX: x * 400, deltaY: y * 400, steps: 6
          })

          for (const { state, sourceOverflow } of liveStates) {
            const point = getCropFramePoint({ state, x: fixedX, y: fixedY })

            expect(point.x).toBeCloseTo(fixedPoint.x, 6)
            expect(point.y).toBeCloseTo(fixedPoint.y, 6)
            expectCropFrameFitsSource({ overflow: sourceOverflow })
          }

          const last = await crop.requireState()
          expect(await crop.finishFrameResize()).toEqual(last)
        })
      }

      test(`shrinks a frame that starts at the full source size and grows it back to that size, ${mode}`, async({
        crop, skewedCropImage: { id }
      }) => {
        const initial = await crop.startImageCrop({ id, preserveAspectRatio, allowFrameOverflow: false })
        const initialSize = getVisibleCropFrameSize(initial)
        const fixedPoint = getCropFramePoint({ state: initial, x: 0, y: 0 })

        const shrunk = await test.step('dragging the bottom-right handle inward shrinks the frame', async() => {
          await crop.dragFrameControlSlowlyBySourcePixels({ control: 'br', deltaX: -120, deltaY: -120, steps: 4 })
          const state = await crop.requireState()
          const size = getVisibleCropFrameSize(state)

          expect(size.width).toBeLessThan(initialSize.width)
          expect(size.height).toBeLessThan(initialSize.height)

          return state
        })

        await test.step('dragging it back past the source edge restores the full size', async() => {
          const grown = await crop.continueFrameResizeBySourcePixels({ deltaX: 400, deltaY: 400, pointerSteps: 4 })
          const size = getVisibleCropFrameSize(grown)
          const point = getCropFramePoint({ state: grown, x: 0, y: 0 })

          expect(size.width).toBeGreaterThan(getVisibleCropFrameSize(shrunk).width)
          expect(size.width).toBeCloseTo(initialSize.width, 1)
          expect(size.height).toBeCloseTo(initialSize.height, 1)
          expect(point.x).toBeCloseTo(fixedPoint.x, 6)
          expect(point.y).toBeCloseTo(fixedPoint.y, 6)
          expectCropFrameFitsSource({ overflow: await crop.sourceFit.getFrameOverflow() })
          await crop.finishFrameResize()
        })
      })
    }

    test('keeps a frame resized up to the source edge on the next move', async({
      crop, skewedCropImage: { id }
    }) => {
      const initial = await crop.startImageCrop({
        id, size: { width: 400, height: 250 }, preserveAspectRatio: false, allowFrameOverflow: false
      })
      const resized = await test.step('resize past the source edge stops inside the source', async() => {
        await crop.dragFrameControlBySourcePixels({ control: 'mr', deltaX: 900, deltaY: 0 })
        const state = await crop.finishFrameResize()

        expect(state.rect.width).toBeGreaterThan(initial.rect.width)
        expectCropFrameFitsSource({ overflow: await crop.sourceFit.getFrameOverflow() })

        return state
      })

      await test.step('the next micro move keeps the resized frame', async() => {
        const moved = await crop.dragFrameByOffset({ deltaX: 1, deltaY: 1 })

        expect(moved.frame.scaleX).toBeCloseTo(resized.frame.scaleX, 8)
        expect(moved.frame.scaleY).toBeCloseTo(resized.frame.scaleY, 8)
        expect(await crop.finishFrameMove()).toEqual(moved)
      })
    })
  })
}

for (const { sourceSkew, size, keptAxis } of STRICT_CROP_SINGLE_AXIS_OVERFLOW_CASES) {
  test.describe(`Explicit strict crop size on an image skewed by ${sourceSkew.skewX}° × ${sourceSkew.skewY}°`, () => {
    test.use({ sourceSkew })

    for (const preserveAspectRatio of [false, true]) {
      const mode = preserveAspectRatio ? 'with aspect ratio preserved' : 'with free aspect ratio'

      test(`keeps the ${keptAxis} that already fits when the other axis overflows, ${mode}`, async({
        crop, skewedCropImage: { id }
      }) => {
        await crop.startImageCrop({
          id, size: { width: 400, height: 250 }, preserveAspectRatio, allowFrameOverflow: false
        })
        const state = await crop.setSize(size)

        expect(state.rect[keptAxis]).toBe(size[keptAxis])
        expectCropFrameFitsSource({ overflow: await crop.sourceFit.getFrameOverflow() })
      })

      test(`keeps the ${keptAxis} of an explicit start size over a requested aspect ratio, ${mode}`, async({
        crop, skewedCropImage: { id }
      }) => {
        const state = await crop.startImageCrop({
          id, size, aspectRatio: { width: 1, height: 1 }, preserveAspectRatio, allowFrameOverflow: false
        })

        expect(state.rect[keptAxis]).toBe(size[keptAxis])
        expectCropFrameFitsSource({ overflow: await crop.sourceFit.getFrameOverflow() })
      })
    }
  })
}

test.describe(`Strict crop of an image skewed by ${STEEP_CROP_SOURCE_SKEW.skewX}°`, () => {
  test.use({ sourceSkew: STEEP_CROP_SOURCE_SKEW })

  test('fits the frame proportionally when one axis cannot absorb the skew alone', async({
    crop, skewedCropImage: { id, source }
  }) => {
    const initial = await crop.startImageCrop({ id, preserveAspectRatio: false, allowFrameOverflow: false })

    expectCropFrameFitsSource({ overflow: await crop.sourceFit.getFrameOverflow() })
    expect(getVisibleCropFrameRatio(initial)).toBeCloseTo(source.width / source.height, 8)

    const moved = await crop.dragFrameByOffset({ deltaX: 1, deltaY: 1 })

    expect(moved.frame.scaleX).toBeCloseTo(initial.frame.scaleX, 8)
    expect(moved.frame.scaleY).toBeCloseTo(initial.frame.scaleY, 8)
    expect(await crop.finishFrameMove()).toEqual(moved)
  })
})

test.describe(`Strict crop of an image rotated by ${ROTATED_CROP_SOURCE_SKEW.angle}° and skewed`, () => {
  test.use({ sourceSkew: ROTATED_CROP_SOURCE_SKEW })

  test('keeps the center during an Alt resize past the source edge', async({
    crop, page, skewedCropImage: { id }
  }) => {
    const initial = await crop.startImageCrop({
      id, size: { width: 400, height: 250 }, preserveAspectRatio: false, allowFrameOverflow: false
    })
    await page.keyboard.down('Alt')
    const liveStates = await crop.dragFrameControlSlowlyBySourcePixels({
      control: 'br', deltaX: 400, deltaY: 400, steps: 6
    })

    for (const { state, sourceOverflow } of liveStates) {
      expect(state.frame.left).toBeCloseTo(initial.frame.left, 6)
      expect(state.frame.top).toBeCloseTo(initial.frame.top, 6)
      expectCropFrameFitsSource({ overflow: sourceOverflow })
    }
    expect(getVisibleCropFrameSize(liveStates[liveStates.length - 1].state).width)
      .toBeGreaterThan(getVisibleCropFrameSize(initial).width)

    const last = await crop.requireState()
    expect(await crop.finishFrameResize()).toEqual(last)
    await page.keyboard.up('Alt')
  })
})

test('crop of a skewed image with overflow allowed keeps the full source size', async({
  crop, skewedCropImage: { id, source }
}) => {
  const initial = await crop.startImageCrop({ id, preserveAspectRatio: true, allowFrameOverflow: true })

  expect(initial.frame.width).toBe(source.width)
  expect(initial.frame.height).toBe(source.height)
  expect(initial.rect.width).toBeGreaterThan(source.width)
})
