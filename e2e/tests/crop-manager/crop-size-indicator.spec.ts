import { test, expect } from '../../fixtures/editor.fixture'
import {
  CROP_SIZE_INSIDE_SNAP_THRESHOLD,
  FULL_CROP_MONTAGE_SIZES,
  FULL_CROP_SNAP_THRESHOLD_CORNER_CASES,
  FULL_CROP_SNAP_THRESHOLD_SIDE_CASES,
  LARGER_CROP_TARGET_SIZE,
  SHRUNK_CROP_TARGET_SIZE,
  SMALLER_CROP_SIZE,
  SNAP_RELEASE_MARGIN_IN_SOURCE_PIXELS,
  SNAP_THRESHOLD_MONTAGE_SIZE,
  SNAP_THRESHOLD_SCREEN_PIXELS
} from '../../fixtures/data/crop-size-indicator.data'

test.describe('Индикатор размеров crop-области', () => {
  test('при растягивании crop-области показывает размер, который применится после crop', async({
    editorModel,
    crop
  }) => {
    await test.step('Войти в crop с областью меньше монтажной', async() => {
      await crop.startCanvasCrop({
        size: {
          width: SMALLER_CROP_SIZE,
          height: SMALLER_CROP_SIZE
        }
      })
    })

    const liveState = await test.step('Растянуть crop-область', async() => {
      return crop.dragFrameFromControlToSize({
        control: 'br',
        size: {
          width: LARGER_CROP_TARGET_SIZE,
          height: LARGER_CROP_TARGET_SIZE
        }
      })
    })

    const indicator = await test.step('Получить текст индикатора до mouseup', async() => {
      return editorModel.requireObjectSizeIndicator()
    })

    await test.step('Завершить resize и применить crop', async() => {
      await crop.finishFrameResize()
      await crop.apply()
    })

    const montageAfter = await test.step('Получить размер монтажной области после crop', async() => {
      return editorModel.getMontageArea()
    })

    await test.step('Проверить что индикатор совпал с применённым размером', () => {
      expect(indicator.width).toBe(Math.round(liveState.rect.width))
      expect(indicator.height).toBe(Math.round(liveState.rect.height))
      expect(indicator.width).toBe(montageAfter.width)
      expect(indicator.height).toBe(montageAfter.height)
    })
  })

  test('при уменьшении crop-области показывает размер, который применится после crop', async({
    editorModel,
    crop
  }) => {
    await test.step('Войти в crop монтажной области', async() => {
      await crop.startCanvasCrop()
    })

    const liveState = await test.step('Уменьшить crop-область до пользовательского размера', async() => {
      return crop.dragFrameFromControlToSize({
        control: 'br',
        size: {
          width: SHRUNK_CROP_TARGET_SIZE,
          height: SHRUNK_CROP_TARGET_SIZE
        }
      })
    })

    const indicator = await test.step('Получить текст индикатора до mouseup', async() => {
      return editorModel.requireObjectSizeIndicator()
    })

    await test.step('Завершить resize и применить crop', async() => {
      await crop.finishFrameResize()
      await crop.apply()
    })

    const montageAfter = await test.step('Получить размер монтажной области после crop', async() => {
      return editorModel.getMontageArea()
    })

    await test.step('Проверить что индикатор совпал с применённым размером', () => {
      expect(indicator.width).toBe(Math.round(liveState.rect.width))
      expect(indicator.height).toBe(Math.round(liveState.rect.height))
      expect(montageAfter.width).toBe(SHRUNK_CROP_TARGET_SIZE)
      expect(montageAfter.height).toBe(SHRUNK_CROP_TARGET_SIZE)
      expect(indicator.width).toBe(montageAfter.width)
      expect(indicator.height).toBe(montageAfter.height)
    })
  })

  test('при image crop 1:1 не округляет ширину до 668 после упора в высоту source', async({
    editorModel,
    crop,
    images
  }) => {
    const image = await test.step('Добавить изображение шире квадратной crop-области', async() => {
      return images.checkCreation({
        imageObject: await images.addFilledImage({
          width: 1000,
          height: 667
        })
      })
    })

    const initialState = await test.step('Войти в image crop 1:1 с запретом выхода за source', async() => {
      return crop.startImageCrop({
        id: image.id,
        aspectRatio: {
          width: 1,
          height: 1
        },
        allowFrameOverflow: false,
        preserveAspectRatio: true
      })
    })

    const liveState = await test.step('Потянуть верхнюю сторону наружу после упора в высоту source', async() => {
      return crop.dragFrameFromControlToSize({
        control: 'mt',
        size: {
          width: initialState.rect.width,
          height: initialState.rect.height + 80
        }
      })
    })

    const indicator = await test.step('Получить текст индикатора до mouseup', async() => {
      return editorModel.requireObjectSizeIndicator()
    })

    await test.step('Завершить resize и закрыть crop mode', async() => {
      await crop.finishFrameResize()
      await crop.cancel()
    })

    await test.step('Проверить что indicator показывает фактический квадрат source', () => {
      expect(liveState.rect.width).toBeCloseTo(667, 5)
      expect(liveState.rect.height).toBeCloseTo(667, 5)
      expect(indicator.width).toBe(667)
      expect(indicator.height).toBe(667)
    })
  })

  test.describe('уменьшение полного crop около snap-порога', () => {
    test.beforeEach(async({ canvas, crop }) => {
      await canvas.setMontageResolution({
        width: SNAP_THRESHOLD_MONTAGE_SIZE,
        height: SNAP_THRESHOLD_MONTAGE_SIZE
      })

      await crop.startCanvasCrop()
    })

    for (const cropCase of FULL_CROP_SNAP_THRESHOLD_CORNER_CASES) {
      test(`при уменьшении полного crop из ${cropCase.title} внутри snap-порога не показывает минус один пиксель`, async({
        editorModel,
        crop
      }) => {
        const heldState = await test.step('Уменьшить crop внутри snap-порога', async() => {
          return crop.dragFrameFromControlToSize({
            control: cropCase.control,
            size: {
              width: CROP_SIZE_INSIDE_SNAP_THRESHOLD,
              height: CROP_SIZE_INSIDE_SNAP_THRESHOLD
            }
          })
        })

        const heldIndicator = await test.step('Получить индикатор пока snap держит край', async() => {
          return editorModel.requireObjectSizeIndicator()
        })

        const canvasState = await test.step('Получить текущий zoom canvas', async() => {
          return editorModel.getCanvasState()
        })
        expect(canvasState.zoom).toBeGreaterThan(0)
        if (canvasState.zoom <= 0) {
          throw new Error('Zoom canvas должен быть больше нуля для расчёта snap-порога')
        }

        const snapThresholdInSourcePixels = Math.ceil(SNAP_THRESHOLD_SCREEN_PIXELS / canvasState.zoom)
        const cropSizeOutsideSnapThreshold = SNAP_THRESHOLD_MONTAGE_SIZE
          - snapThresholdInSourcePixels
          - SNAP_RELEASE_MARGIN_IN_SOURCE_PIXELS

        const releasedState = await test.step('Продолжить уменьшение crop за snap-порог', async() => {
          return crop.continueFrameResizeFromControlToSize({
            control: cropCase.control,
            size: {
              width: cropSizeOutsideSnapThreshold,
              height: cropSizeOutsideSnapThreshold
            }
          })
        })

        const releasedIndicator = await test.step('Получить индикатор после выхода из snap-порога', async() => {
          return editorModel.requireObjectSizeIndicator()
        })

        await test.step('Завершить resize', async() => {
          await crop.finishFrameResize()
        })

        await test.step('Проверить удержание и выход из snap-порога', () => {
          expect(Math.round(heldState.rect.width)).toBe(SNAP_THRESHOLD_MONTAGE_SIZE)
          expect(Math.round(heldState.rect.height)).toBe(SNAP_THRESHOLD_MONTAGE_SIZE)
          expect(heldIndicator.width).toBe(SNAP_THRESHOLD_MONTAGE_SIZE)
          expect(heldIndicator.height).toBe(SNAP_THRESHOLD_MONTAGE_SIZE)
          expect(Math.round(releasedState.rect.width)).toBeLessThanOrEqual(
            SNAP_THRESHOLD_MONTAGE_SIZE - snapThresholdInSourcePixels
          )
          expect(Math.round(releasedState.rect.height)).toBeLessThanOrEqual(
            SNAP_THRESHOLD_MONTAGE_SIZE - snapThresholdInSourcePixels
          )
          expect(releasedIndicator.width).toBe(Math.round(releasedState.rect.width))
          expect(releasedIndicator.height).toBe(Math.round(releasedState.rect.height))
        })
      })
    }

    for (const cropCase of FULL_CROP_SNAP_THRESHOLD_SIDE_CASES) {
      test(`при уменьшении полного crop из ${cropCase.title} внутри snap-порога не показывает минус один пиксель по активной оси`, async({
        editorModel,
        crop
      }) => {
        await test.step('Отключить сохранение пропорций для проверки snap по одной оси', async() => {
          const state = await crop.setPreserveAspectRatio({
            preserveAspectRatio: false
          })

          expect(state.options.preserveAspectRatio).toBe(false)
        })

        const heldSize = cropCase.axis === 'horizontal'
          ? {
            width: CROP_SIZE_INSIDE_SNAP_THRESHOLD,
            height: SNAP_THRESHOLD_MONTAGE_SIZE
          }
          : {
            width: SNAP_THRESHOLD_MONTAGE_SIZE,
            height: CROP_SIZE_INSIDE_SNAP_THRESHOLD
          }

        const heldState = await test.step('Уменьшить crop внутри snap-порога', async() => {
          return crop.dragFrameFromControlToSize({
            control: cropCase.control,
            size: heldSize
          })
        })

        const heldIndicator = await test.step('Получить индикатор пока snap держит край', async() => {
          return editorModel.requireObjectSizeIndicator()
        })

        const canvasState = await test.step('Получить текущий zoom canvas', async() => {
          return editorModel.getCanvasState()
        })
        expect(canvasState.zoom).toBeGreaterThan(0)
        if (canvasState.zoom <= 0) {
          throw new Error('Zoom canvas должен быть больше нуля для расчёта snap-порога')
        }

        const snapThresholdInSourcePixels = Math.ceil(SNAP_THRESHOLD_SCREEN_PIXELS / canvasState.zoom)
        const cropSizeOutsideSnapThreshold = SNAP_THRESHOLD_MONTAGE_SIZE
          - snapThresholdInSourcePixels
          - SNAP_RELEASE_MARGIN_IN_SOURCE_PIXELS
        const releasedSize = cropCase.axis === 'horizontal'
          ? {
            width: cropSizeOutsideSnapThreshold,
            height: SNAP_THRESHOLD_MONTAGE_SIZE
          }
          : {
            width: SNAP_THRESHOLD_MONTAGE_SIZE,
            height: cropSizeOutsideSnapThreshold
          }

        const releasedState = await test.step('Продолжить уменьшение crop за snap-порог', async() => {
          return crop.continueFrameResizeFromControlToSize({
            control: cropCase.control,
            size: releasedSize
          })
        })

        const releasedIndicator = await test.step('Получить индикатор после выхода из snap-порога', async() => {
          return editorModel.requireObjectSizeIndicator()
        })

        await test.step('Завершить resize', async() => {
          await crop.finishFrameResize()
        })

        await test.step('Проверить удержание и выход из snap-порога по активной оси', () => {
          expect(Math.round(heldState.rect.width)).toBe(SNAP_THRESHOLD_MONTAGE_SIZE)
          expect(Math.round(heldState.rect.height)).toBe(SNAP_THRESHOLD_MONTAGE_SIZE)
          expect(heldIndicator.width).toBe(SNAP_THRESHOLD_MONTAGE_SIZE)
          expect(heldIndicator.height).toBe(SNAP_THRESHOLD_MONTAGE_SIZE)
          expect(releasedIndicator.width).toBe(Math.round(releasedState.rect.width))
          expect(releasedIndicator.height).toBe(Math.round(releasedState.rect.height))

          if (cropCase.axis === 'horizontal') {
            expect(Math.round(releasedState.rect.width)).toBeLessThanOrEqual(
              SNAP_THRESHOLD_MONTAGE_SIZE - snapThresholdInSourcePixels
            )
            expect(Math.round(releasedState.rect.height)).toBe(SNAP_THRESHOLD_MONTAGE_SIZE)

            return
          }

          expect(Math.round(releasedState.rect.width)).toBe(SNAP_THRESHOLD_MONTAGE_SIZE)
          expect(Math.round(releasedState.rect.height)).toBeLessThanOrEqual(
            SNAP_THRESHOLD_MONTAGE_SIZE - snapThresholdInSourcePixels
          )
        })
      })
    }
  })

  for (const montageSize of FULL_CROP_MONTAGE_SIZES) {
    test(`при полном crop ${montageSize.width}x${montageSize.height} показывает размер монтажной области`, async({
      editorModel,
      canvas,
      crop
    }) => {
      await test.step('Задать размер монтажной области', async() => {
        await canvas.setMontageResolution(montageSize)
      })

      await test.step('Войти в crop монтажной области', async() => {
        await crop.startCanvasCrop()
      })

      const liveState = await test.step('Потянуть crop-область без изменения полного размера', async() => {
        return crop.dragFrameFromControlToSize({
          control: 'br',
          size: montageSize
        })
      })

      const indicator = await test.step('Получить текст индикатора до mouseup', async() => {
        return editorModel.requireObjectSizeIndicator()
      })

      await test.step('Завершить resize и применить crop', async() => {
        await crop.finishFrameResize()
        await crop.apply()
      })

      const montageAfter = await test.step('Получить размер монтажной области после crop', async() => {
        return editorModel.getMontageArea()
      })

      await test.step('Проверить что полный crop не потерял пиксель', () => {
        expect(Math.round(liveState.rect.width)).toBe(montageSize.width)
        expect(Math.round(liveState.rect.height)).toBe(montageSize.height)
        expect(indicator.width).toBe(montageSize.width)
        expect(indicator.height).toBe(montageSize.height)
        expect(montageAfter.width).toBe(montageSize.width)
        expect(montageAfter.height).toBe(montageSize.height)
      })
    })
  }
})
