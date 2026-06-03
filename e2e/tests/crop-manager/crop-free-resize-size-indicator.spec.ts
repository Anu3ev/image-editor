import { test, expect } from '../../fixtures/editor.fixture'
import {
  FREE_RESIZE_INDICATOR_BOUNDARY_OVERSHOOT_PIXELS,
  FREE_RESIZE_INDICATOR_FULL_WIDTH_CASES,
  FREE_RESIZE_INDICATOR_SOURCE_IMAGE_SIZE
} from '../../fixtures/data/crop-free-resize-size-indicator.data'

test.describe('Индикатор размеров image crop без сохранения пропорций', () => {
  for (const resizeCase of FREE_RESIZE_INDICATOR_FULL_WIDTH_CASES) {
    test(`после растягивания квадратной crop-области ${resizeCase.title} показывает 1000x667, а не 999x667`, async({
      crop,
      editorModel,
      images
    }) => {
      const image = await test.step('Добавить изображение из пользовательского сценария', async() => {
        return images.checkCreation({
          imageObject: await images.addFilledImage(FREE_RESIZE_INDICATOR_SOURCE_IMAGE_SIZE)
        })
      })

      const initialState = await test.step('Войти в image crop 1:1 со свободным resize внутри source', async() => {
        return crop.startImageCrop({
          id: image.id,
          aspectRatio: {
            width: 1,
            height: 1
          },
          allowFrameOverflow: false,
          preserveAspectRatio: false
        })
      })

      const stateAfterFirstStretch = await test.step('Дотянуть первую сторону crop-области до границы source', async() => {
        await crop.dragFreeFrameControlToSourceBoundary({
          control: resizeCase.firstControl,
          image,
          overshootPixels: FREE_RESIZE_INDICATOR_BOUNDARY_OVERSHOOT_PIXELS
        })

        return crop.finishFrameResize()
      })

      const liveState = await test.step('Дотянуть вторую сторону crop-области до противоположной границы source', async() => {
        return crop.dragFreeFrameControlToSourceBoundary({
          control: resizeCase.secondControl,
          image,
          overshootPixels: FREE_RESIZE_INDICATOR_BOUNDARY_OVERSHOOT_PIXELS
        })
      })

      const indicator = await test.step('Считать live-индикатор размеров до mouseup', async() => {
        return editorModel.requireObjectSizeIndicator()
      })

      const stateAfterMouseUp = await test.step('Завершить resize и закрыть crop mode', async() => {
        const state = await crop.finishFrameResize()

        await crop.cancel()

        return state
      })

      await test.step('Проверить что crop дотянулся до полной ширины изображения без потери пикселя в индикаторе', () => {
        expect(initialState.options.allowFrameOverflow).toBe(false)
        expect(initialState.options.preserveAspectRatio).toBe(false)
        expect(Math.round(initialState.rect.width)).toBe(667)
        expect(Math.round(initialState.rect.height)).toBe(667)

        if (resizeCase.firstBoundary === 'left') {
          expect(Math.round(stateAfterFirstStretch.rect.left)).toBe(0)
        } else {
          expect(Math.round(stateAfterFirstStretch.rect.left + stateAfterFirstStretch.rect.width)).toBe(image.width)
        }
        expect(Math.round(stateAfterFirstStretch.rect.height)).toBe(667)

        expect(Math.round(liveState.rect.width)).toBe(1000)
        expect(Math.round(liveState.rect.height)).toBe(667)
        expect(Math.round(stateAfterMouseUp.rect.width)).toBe(1000)
        expect(Math.round(stateAfterMouseUp.rect.height)).toBe(667)

        expect(indicator.width).toBe(1000)
        expect(indicator.height).toBe(667)
      })
    })
  }
})
