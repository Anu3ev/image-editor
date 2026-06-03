import { test, expect } from '../../fixtures/editor.fixture'
import {
  FREE_RESIZE_SOURCE_BOUNDARY_CROP_SIZE,
  FREE_RESIZE_SOURCE_BOUNDARY_EXTRA_DRAG_PIXELS,
  FREE_RESIZE_SOURCE_BOUNDARY_IMAGE_SIZE,
  FREE_RESIZE_SOURCE_BOUNDARY_SIDE_CASES,
  FREE_RESIZE_SOURCE_PIXEL_TOLERANCE
} from '../../fixtures/data/crop-frame-free-resize.data'

test.describe('Увеличение crop-области изображения без сохранения пропорций', () => {
  for (const resizeCase of FREE_RESIZE_SOURCE_BOUNDARY_SIDE_CASES) {
    test(`не увеличивает crop-область ${resizeCase.blockedGrowthTitle} после упора ${resizeCase.sideTitle} в границу source`, async({
      crop,
      images
    }) => {
      const image = await test.step('Добавить изображение из пользовательского сценария', async() => {
        return images.checkCreation({
          imageObject: await images.addFilledImage(FREE_RESIZE_SOURCE_BOUNDARY_IMAGE_SIZE)
        })
      })

      const initialState = await test.step(
        'Войти в image crop с запретом выхода за source и свободным resize',
        async() => {
          return crop.startImageCrop({
            id: image.id,
            size: FREE_RESIZE_SOURCE_BOUNDARY_CROP_SIZE,
            allowFrameOverflow: false,
            preserveAspectRatio: false
          })
        }
      )

      const {
        expectedRect,
        stateAtBoundary,
        stateAfterExtraDrag
      } = await test.step('Потянуть control до source-границы и продолжить движение наружу', async() => {
        return crop.dragFreeFrameControlPastSourceBoundary({
          control: resizeCase.control,
          image,
          extraPixels: FREE_RESIZE_SOURCE_BOUNDARY_EXTRA_DRAG_PIXELS
        })
      })

      const stateAfterMouseUp = await test.step('Завершить resize и закрыть crop mode', async() => {
        const state = await crop.finishFrameResize()

        await crop.cancel()

        return state
      })

      await test.step('Проверить что после первого упора crop больше не меняет размер и положение', () => {
        expect(initialState.options.allowFrameOverflow).toBe(false)
        expect(initialState.options.preserveAspectRatio).toBe(false)
        expect(initialState.rect.width).toBeCloseTo(FREE_RESIZE_SOURCE_BOUNDARY_CROP_SIZE.width, 4)
        expect(initialState.rect.height).toBeCloseTo(FREE_RESIZE_SOURCE_BOUNDARY_CROP_SIZE.height, 4)

        expect(Math.abs(stateAtBoundary.rect.left - expectedRect.left))
          .toBeLessThanOrEqual(FREE_RESIZE_SOURCE_PIXEL_TOLERANCE)
        expect(Math.abs(stateAtBoundary.rect.top - expectedRect.top))
          .toBeLessThanOrEqual(FREE_RESIZE_SOURCE_PIXEL_TOLERANCE)
        expect(Math.abs(stateAtBoundary.rect.width - expectedRect.width))
          .toBeLessThanOrEqual(FREE_RESIZE_SOURCE_PIXEL_TOLERANCE)
        expect(Math.abs(stateAtBoundary.rect.height - expectedRect.height))
          .toBeLessThanOrEqual(FREE_RESIZE_SOURCE_PIXEL_TOLERANCE)

        expect(Math.abs(stateAfterExtraDrag.rect.left - stateAtBoundary.rect.left))
          .toBeLessThanOrEqual(FREE_RESIZE_SOURCE_PIXEL_TOLERANCE)
        expect(Math.abs(stateAfterExtraDrag.rect.top - stateAtBoundary.rect.top))
          .toBeLessThanOrEqual(FREE_RESIZE_SOURCE_PIXEL_TOLERANCE)
        expect(Math.abs(stateAfterExtraDrag.rect.width - stateAtBoundary.rect.width))
          .toBeLessThanOrEqual(FREE_RESIZE_SOURCE_PIXEL_TOLERANCE)
        expect(Math.abs(stateAfterExtraDrag.rect.height - stateAtBoundary.rect.height))
          .toBeLessThanOrEqual(FREE_RESIZE_SOURCE_PIXEL_TOLERANCE)

        expect(Math.abs(stateAfterMouseUp.rect.left - stateAtBoundary.rect.left))
          .toBeLessThanOrEqual(FREE_RESIZE_SOURCE_PIXEL_TOLERANCE)
        expect(Math.abs(stateAfterMouseUp.rect.top - stateAtBoundary.rect.top))
          .toBeLessThanOrEqual(FREE_RESIZE_SOURCE_PIXEL_TOLERANCE)
        expect(Math.abs(stateAfterMouseUp.rect.width - stateAtBoundary.rect.width))
          .toBeLessThanOrEqual(FREE_RESIZE_SOURCE_PIXEL_TOLERANCE)
        expect(Math.abs(stateAfterMouseUp.rect.height - stateAtBoundary.rect.height))
          .toBeLessThanOrEqual(FREE_RESIZE_SOURCE_PIXEL_TOLERANCE)
      })
    })
  }
})
