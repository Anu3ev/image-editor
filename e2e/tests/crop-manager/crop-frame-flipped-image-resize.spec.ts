import { test, expect } from '../../fixtures/editor.fixture'
import {
  CROP_FLIPPED_IMAGE_CASES,
  CROP_FLIPPED_IMAGE_RESIZE,
  CROP_FLIPPED_IMAGE_SIZE
} from '../../fixtures/data/crop-frame-flipped-image-resize.data'

for (const flipCase of CROP_FLIPPED_IMAGE_CASES) {
  test(flipCase.title, async({ crop, images, snapping }) => {
    const setup = await test.step('Добавить и отразить изображение, затем начать crop', async() => {
      const image = images.checkCreation({
        imageObject: await images.addFilledImage(CROP_FLIPPED_IMAGE_SIZE)
      })
      const flipped = await images.flip({
        id: image.id,
        axis: flipCase.axis
      })
      const state = await crop.startImageCrop({
        id: image.id,
        allowFrameOverflow: false,
        preserveAspectRatio: true
      })

      expect(state.frame.id, 'у crop frame должен быть id для проверки границ').not.toBeNull()
      if (!state.frame.id) {
        throw new Error('Crop frame должен иметь id для проверки границ')
      }

      return {
        flipped,
        state,
        frameId: state.frame.id,
        bounds: await snapping.getObjectSnapshot({ id: state.frame.id })
      }
    })

    const live = await test.step('Уменьшить crop-область из правого верхнего угла', async() => {
      const state = await crop.dragFrameControlBySourcePixels(CROP_FLIPPED_IMAGE_RESIZE)

      return {
        state,
        bounds: await snapping.getObjectSnapshot({ id: setup.frameId })
      }
    })

    const committed = await test.step('Завершить скейлинг и выйти из crop', async() => {
      const state = await crop.finishFrameResize()
      const bounds = await snapping.getObjectSnapshot({ id: setup.frameId })

      await crop.cancel()

      return { state, bounds }
    })

    await test.step('Проверить направление и итог скейлинга crop-области', async() => {
      expect(setup.flipped.flipX).toBe(flipCase.axis === 'x')
      expect(setup.flipped.flipY).toBe(flipCase.axis === 'y')
      expect(setup.state.options.allowFrameOverflow).toBe(false)
      expect(live.state.rect.width).toBeLessThan(setup.state.rect.width)
      expect(live.state.rect.height).toBeLessThan(setup.state.rect.height)
      expect(live.bounds.boundsLeft).toBeCloseTo(setup.bounds.boundsLeft, 3)
      expect(live.bounds.boundsBottom).toBeCloseTo(setup.bounds.boundsBottom, 3)
      expect(live.bounds.boundsRight).toBeLessThan(setup.bounds.boundsRight)
      expect(live.bounds.boundsTop).toBeGreaterThan(setup.bounds.boundsTop)
      expect(committed.state.rect).toEqual(live.state.rect)
      expect(committed.bounds.boundsLeft).toBeCloseTo(live.bounds.boundsLeft, 3)
      expect(committed.bounds.boundsRight).toBeCloseTo(live.bounds.boundsRight, 3)
      expect(committed.bounds.boundsTop).toBeCloseTo(live.bounds.boundsTop, 3)
      expect(committed.bounds.boundsBottom).toBeCloseTo(live.bounds.boundsBottom, 3)
    })
  })
}
