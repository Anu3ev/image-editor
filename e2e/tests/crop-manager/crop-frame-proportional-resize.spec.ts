import { test, expect } from '../../fixtures/editor.fixture'

/**
 * Допуск сравнения source-пикселей после реальных pointer events.
 */
const SOURCE_PIXEL_TOLERANCE = 2
const SNAP_APPROACH_OFFSET = 4
const SNAP_HOLD_DRAG_PIXELS = 4
const SNAP_RELEASE_DRAG_PIXELS = 12
const SNAP_REFERENCE_SHAPE_SIZE = 64
const SNAP_REFERENCE_SHAPE_GAP = 24
const SNAP_REFERENCE_SHAPE_OFFSET = 72

const CROP_FRAME_SNAPPING_RESIZE_CASES = [
  {
    title: 'при сужении сверху удерживает квадратную crop-область на горизонтальной направляющей',
    control: 'mt',
    referenceId: 'vertical-snap-reference',
    guideType: 'horizontal',
    continueDeltaX: 0,
    continueDeltaY: SNAP_HOLD_DRAG_PIXELS,
    releaseDeltaX: 0,
    releaseDeltaY: SNAP_RELEASE_DRAG_PIXELS
  },
  {
    title: 'при сужении слева удерживает квадратную crop-область на вертикальной направляющей',
    control: 'ml',
    referenceId: 'horizontal-snap-reference',
    guideType: 'vertical',
    continueDeltaX: SNAP_HOLD_DRAG_PIXELS,
    continueDeltaY: 0,
    releaseDeltaX: SNAP_RELEASE_DRAG_PIXELS,
    releaseDeltaY: 0
  },
  {
    title: 'при сужении из левого верхнего угла удерживает квадратную crop-область на направляющей',
    control: 'tl',
    referenceId: 'diagonal-snap-reference',
    guideType: 'horizontal',
    continueDeltaX: SNAP_HOLD_DRAG_PIXELS,
    continueDeltaY: SNAP_HOLD_DRAG_PIXELS,
    releaseDeltaX: SNAP_RELEASE_DRAG_PIXELS,
    releaseDeltaY: SNAP_RELEASE_DRAG_PIXELS
  }
] as const

/**
 * Сценарии resize уменьшенного квадратного image crop после переноса в середину source.
 */
const CENTERED_SOURCE_BOUNDARY_RESIZE_CASES = [
  {
    title: 'после уменьшения и переноса в середину не продолжает расти при скейлинге из левого верхнего угла',
    control: 'tl'
  },
  {
    title: 'после уменьшения и переноса в середину не продолжает расти при скейлинге из правого верхнего угла',
    control: 'tr'
  },
  {
    title: 'после уменьшения и переноса в середину не продолжает расти при скейлинге из левого нижнего угла',
    control: 'bl'
  },
  {
    title: 'после уменьшения и переноса в середину не продолжает расти при скейлинге из правого нижнего угла',
    control: 'br'
  },
  {
    title: 'после уменьшения и переноса в середину не продолжает расти при скейлинге левой стороны',
    control: 'ml'
  },
  {
    title: 'после уменьшения и переноса в середину не продолжает расти при скейлинге правой стороны',
    control: 'mr'
  },
  {
    title: 'после уменьшения и переноса в середину не продолжает расти при скейлинге верхней стороны',
    control: 'mt'
  },
  {
    title: 'после уменьшения и переноса в середину не продолжает расти при скейлинге нижней стороны',
    control: 'mb'
  }
] as const

test.describe('Увеличение crop-области изображения с фиксированной пропорцией', () => {
  test('не увеличивает crop-область по диагонали, если квадрат 1:1 уже упёрся в высоту изображения', async({
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

    const initialState = await test.step('Войти в image crop с пропорцией 1:1 и запретом выхода за source', async() => {
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

    const liveState = await test.step('Попытаться увеличить crop-область по диагонали во время live resize', async() => {
      return crop.dragFrameFromControlToSize({
        control: 'tr',
        size: {
          width: initialState.rect.width + 80,
          height: initialState.rect.height + 80
        }
      })
    })

    const stateAfterMouseUp = await test.step('Завершить resize и закрыть crop mode', async() => {
      const state = await crop.finishFrameResize()

      await crop.cancel()

      return state
    })

    await test.step('Проверить что скейлинг по диагонали не изменил размер и положение crop', () => {
      expect(initialState.options.allowFrameOverflow).toBe(false)
      expect(initialState.options.preserveAspectRatio).toBe(true)
      expect(initialState.rect.width).toBeCloseTo(initialState.rect.height, 5)
      expect(liveState.rect.width).toBeCloseTo(initialState.rect.width, 5)
      expect(liveState.rect.height).toBeCloseTo(initialState.rect.height, 5)
      expect(liveState.rect.left).toBeCloseTo(initialState.rect.left, 5)
      expect(liveState.rect.top).toBeCloseTo(initialState.rect.top, 5)
      expect(stateAfterMouseUp.rect.width).toBeCloseTo(initialState.rect.width, 5)
      expect(stateAfterMouseUp.rect.height).toBeCloseTo(initialState.rect.height, 5)
      expect(stateAfterMouseUp.rect.left).toBeCloseTo(initialState.rect.left, 5)
      expect(stateAfterMouseUp.rect.top).toBeCloseTo(initialState.rect.top, 5)
    })
  })

  test('не увеличивает crop-область вправо, если квадрат 1:1 уже упёрся в высоту изображения', async({
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

    const initialState = await test.step('Войти в image crop с пропорцией 1:1 и запретом выхода за source', async() => {
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

    const liveState = await test.step('Попытаться увеличить crop-область вправо во время live resize', async() => {
      return crop.dragFrameFromControlToSize({
        control: 'mr',
        size: {
          width: initialState.rect.width + 80,
          height: initialState.rect.height
        }
      })
    })

    const stateAfterMouseUp = await test.step('Завершить resize и закрыть crop mode', async() => {
      const state = await crop.finishFrameResize()

      await crop.cancel()

      return state
    })

    await test.step('Проверить что live resize не увеличил crop и не сдвинул левую границу', () => {
      expect(initialState.options.allowFrameOverflow).toBe(false)
      expect(initialState.options.preserveAspectRatio).toBe(true)
      expect(initialState.rect.width).toBeCloseTo(initialState.rect.height, 5)
      expect(liveState.rect.width).toBeCloseTo(initialState.rect.width, 5)
      expect(liveState.rect.height).toBeCloseTo(initialState.rect.height, 5)
      expect(liveState.rect.left).toBeCloseTo(initialState.rect.left, 5)
      expect(stateAfterMouseUp.rect.width).toBeCloseTo(initialState.rect.width, 5)
      expect(stateAfterMouseUp.rect.height).toBeCloseTo(initialState.rect.height, 5)
      expect(stateAfterMouseUp.rect.left).toBeCloseTo(initialState.rect.left, 5)
    })
  })

  test('не увеличивает crop-область вверх, если квадрат 1:1 уже упёрся в высоту изображения', async({
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

    const initialState = await test.step('Войти в image crop с пропорцией 1:1 и запретом выхода за source', async() => {
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

    const liveState = await test.step('Попытаться увеличить crop-область вверх во время live resize', async() => {
      return crop.dragFrameFromControlToSize({
        control: 'mt',
        size: {
          width: initialState.rect.width,
          height: initialState.rect.height + 80
        }
      })
    })

    const stateAfterMouseUp = await test.step('Завершить resize и закрыть crop mode', async() => {
      const state = await crop.finishFrameResize()

      await crop.cancel()

      return state
    })

    await test.step('Проверить что вертикальный скейлинг не изменил размер и положение crop', () => {
      expect(initialState.options.allowFrameOverflow).toBe(false)
      expect(initialState.options.preserveAspectRatio).toBe(true)
      expect(initialState.rect.width).toBeCloseTo(initialState.rect.height, 5)
      expect(liveState.rect.width).toBeCloseTo(initialState.rect.width, 5)
      expect(liveState.rect.height).toBeCloseTo(initialState.rect.height, 5)
      expect(liveState.rect.left).toBeCloseTo(initialState.rect.left, 5)
      expect(liveState.rect.top).toBeCloseTo(initialState.rect.top, 5)
      expect(stateAfterMouseUp.rect.width).toBeCloseTo(initialState.rect.width, 5)
      expect(stateAfterMouseUp.rect.height).toBeCloseTo(initialState.rect.height, 5)
      expect(stateAfterMouseUp.rect.left).toBeCloseTo(initialState.rect.left, 5)
      expect(stateAfterMouseUp.rect.top).toBeCloseTo(initialState.rect.top, 5)
    })
  })

  for (const resizeCase of CENTERED_SOURCE_BOUNDARY_RESIZE_CASES) {
    test(resizeCase.title, async({
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

      await test.step('Войти в image crop 1:1, уменьшить crop-область и перенести её в середину', async() => {
        await crop.startCenteredSmallSquareImageCrop({ image })
      })

      const {
        expectedRect,
        stateAtBoundary,
        stateAfterExtraDrag
      } = await test.step('Потянуть control до source-границы и продолжить движение наружу', async() => {
        return crop.dragFrameControlPastSourceBoundary({
          control: resizeCase.control,
          image
        })
      })

      const stateAfterMouseUp = await test.step('Завершить resize и закрыть crop mode', async() => {
        const state = await crop.finishFrameResize()

        await crop.cancel()

        return state
      })

      await test.step('Проверить что после первого упора crop больше не меняет размер и положение', () => {
        expect(Math.abs(stateAtBoundary.rect.left - expectedRect.left)).toBeLessThanOrEqual(SOURCE_PIXEL_TOLERANCE)
        expect(Math.abs(stateAtBoundary.rect.top - expectedRect.top)).toBeLessThanOrEqual(SOURCE_PIXEL_TOLERANCE)
        expect(Math.abs(stateAtBoundary.rect.width - expectedRect.width)).toBeLessThanOrEqual(SOURCE_PIXEL_TOLERANCE)
        expect(Math.abs(stateAtBoundary.rect.height - expectedRect.height)).toBeLessThanOrEqual(SOURCE_PIXEL_TOLERANCE)

        expect(stateAfterExtraDrag.rect.left).toBeCloseTo(stateAtBoundary.rect.left, 4)
        expect(stateAfterExtraDrag.rect.top).toBeCloseTo(stateAtBoundary.rect.top, 4)
        expect(stateAfterExtraDrag.rect.width).toBeCloseTo(stateAtBoundary.rect.width, 4)
        expect(stateAfterExtraDrag.rect.height).toBeCloseTo(stateAtBoundary.rect.height, 4)

        expect(stateAfterMouseUp.rect.left).toBeCloseTo(stateAtBoundary.rect.left, 4)
        expect(stateAfterMouseUp.rect.top).toBeCloseTo(stateAtBoundary.rect.top, 4)
        expect(stateAfterMouseUp.rect.width).toBeCloseTo(stateAtBoundary.rect.width, 4)
        expect(stateAfterMouseUp.rect.height).toBeCloseTo(stateAtBoundary.rect.height, 4)
      })
    })
  }

  test('не сдвигает crop-область вправо, если квадрат 1:1 уже упёрся в высоту изображения и левую сторону тянут наружу по шагам', async({
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

    const initialState = await test.step('Войти в image crop с пропорцией 1:1 и запретом выхода за source', async() => {
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

    const liveSizes = Array.from({ length: 8 }, (_value, index) => {
      return {
        width: initialState.rect.width + index + 1,
        height: initialState.rect.height
      }
    })

    const liveStates = await test.step('Потянуть левый control наружу по коротким live-шагам', async() => {
      return crop.dragFrameFromControlToSizes({
        control: 'ml',
        sizes: liveSizes
      })
    })

    const stateAfterMouseUp = await test.step('Завершить resize и закрыть crop mode', async() => {
      const state = await crop.finishFrameResize()

      await crop.cancel()

      return state
    })

    await test.step('Проверить что ни один live-шаг не изменил размер crop и не сдвинул frame вправо', () => {
      expect(initialState.options.allowFrameOverflow).toBe(false)
      expect(initialState.options.preserveAspectRatio).toBe(true)
      expect(initialState.rect.width).toBeCloseTo(initialState.rect.height, 5)
      expect(liveStates.length).toBe(liveSizes.length)

      for (const liveState of liveStates) {
        expect(Math.abs(liveState.rect.width - initialState.rect.width)).toBeLessThanOrEqual(SOURCE_PIXEL_TOLERANCE)
        expect(Math.abs(liveState.rect.height - initialState.rect.height)).toBeLessThanOrEqual(SOURCE_PIXEL_TOLERANCE)
        expect(Math.abs(liveState.rect.left - initialState.rect.left)).toBeLessThanOrEqual(SOURCE_PIXEL_TOLERANCE)
        expect(Math.abs(liveState.frame.left - initialState.frame.left)).toBeLessThanOrEqual(1)
      }

      expect(Math.abs(stateAfterMouseUp.rect.width - initialState.rect.width)).toBeLessThanOrEqual(SOURCE_PIXEL_TOLERANCE)
      expect(Math.abs(stateAfterMouseUp.rect.height - initialState.rect.height)).toBeLessThanOrEqual(SOURCE_PIXEL_TOLERANCE)
      expect(Math.abs(stateAfterMouseUp.rect.left - initialState.rect.left)).toBeLessThanOrEqual(SOURCE_PIXEL_TOLERANCE)
      expect(Math.abs(stateAfterMouseUp.frame.left - initialState.frame.left)).toBeLessThanOrEqual(1)
    })
  })

  // eslint-disable-next-line max-len
  test('не сдвигает crop-область влево, если прямоугольник 4:3 уже упёрся в высоту изображения и левую сторону тянут наружу по шагам', async({
    crop,
    images
  }) => {
    const image = await test.step('Добавить изображение шире crop-области 4:3', async() => {
      return images.checkCreation({
        imageObject: await images.addFilledImage({
          width: 1000,
          height: 667
        })
      })
    })

    const initialState = await test.step('Войти в image crop с пропорцией 4:3 и запретом выхода за source', async() => {
      return crop.startImageCrop({
        id: image.id,
        aspectRatio: {
          width: 4,
          height: 3
        },
        allowFrameOverflow: false,
        preserveAspectRatio: true
      })
    })

    const liveSizes = Array.from({ length: 8 }, (_value, index) => {
      return {
        width: initialState.rect.width + index + 1,
        height: initialState.rect.height
      }
    })

    const liveStates = await test.step('Потянуть левый control наружу по коротким live-шагам', async() => {
      return crop.dragFrameFromControlToSizes({
        control: 'ml',
        sizes: liveSizes
      })
    })

    const stateAfterMouseUp = await test.step('Завершить resize и закрыть crop mode', async() => {
      const state = await crop.finishFrameResize()

      await crop.cancel()

      return state
    })

    await test.step('Проверить что ни один live-шаг не изменил размер crop и не сдвинул frame влево', () => {
      expect(initialState.options.allowFrameOverflow).toBe(false)
      expect(initialState.options.preserveAspectRatio).toBe(true)
      expect(initialState.rect.width / initialState.rect.height).toBeCloseTo(4 / 3, 5)
      expect(liveStates.length).toBe(liveSizes.length)

      for (const liveState of liveStates) {
        expect(Math.abs(liveState.rect.width - initialState.rect.width)).toBeLessThanOrEqual(SOURCE_PIXEL_TOLERANCE)
        expect(Math.abs(liveState.rect.height - initialState.rect.height)).toBeLessThanOrEqual(SOURCE_PIXEL_TOLERANCE)
        expect(Math.abs(liveState.rect.left - initialState.rect.left)).toBeLessThanOrEqual(SOURCE_PIXEL_TOLERANCE)
        expect(Math.abs(liveState.frame.left - initialState.frame.left)).toBeLessThanOrEqual(1)
      }

      expect(Math.abs(stateAfterMouseUp.rect.width - initialState.rect.width)).toBeLessThanOrEqual(SOURCE_PIXEL_TOLERANCE)
      expect(Math.abs(stateAfterMouseUp.rect.height - initialState.rect.height)).toBeLessThanOrEqual(SOURCE_PIXEL_TOLERANCE)
      expect(Math.abs(stateAfterMouseUp.rect.left - initialState.rect.left)).toBeLessThanOrEqual(SOURCE_PIXEL_TOLERANCE)
      expect(Math.abs(stateAfterMouseUp.frame.left - initialState.frame.left)).toBeLessThanOrEqual(1)
    })
  })
})

test.describe('Уменьшение crop-области изображения с фиксированной пропорцией и прилипанием', () => {
  for (const resizeCase of CROP_FRAME_SNAPPING_RESIZE_CASES) {
    test(resizeCase.title, async({
      crop,
      images,
      shapes,
      snapping
    }) => {
      const image = await test.step('Добавить изображение шире квадратной crop-области', async() => {
        return images.checkCreation({
          imageObject: await images.addFilledImage({
            width: 1000,
            height: 667
          })
        })
      })

      const imageSnapshot = await test.step('Получить bounds изображения', async() => {
        return images.getSnapshot({ id: image.id })
      })

      const measuredState = await test.step('Измерить стартовые bounds будущей crop-области', async() => {
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

      expect(measuredState.frame.id, 'у crop frame должен быть id для измерения bounds').not.toBeNull()
      if (!measuredState.frame.id) {
        throw new Error('Crop frame должен иметь id для измерения bounds')
      }

      const measuredFrame = await snapping.getObjectSnapshot({ id: measuredState.frame.id })
      await crop.cancel()

      const isHorizontalGuide = resizeCase.guideType === 'horizontal'
      const initialCropStart = isHorizontalGuide ? measuredFrame.boundsTop : measuredFrame.boundsLeft
      const referencePosition = initialCropStart + SNAP_REFERENCE_SHAPE_OFFSET

      await test.step('Добавить shape с границей внутри будущей crop-области', async() => {
        const shape = await shapes.addAtBounds({
          presetKey: 'square',
          options: {
            id: resizeCase.referenceId,
            left: isHorizontalGuide
              ? imageSnapshot.boundsRight + SNAP_REFERENCE_SHAPE_GAP
              : referencePosition,
            top: isHorizontalGuide
              ? referencePosition
              : imageSnapshot.boundsBottom + SNAP_REFERENCE_SHAPE_GAP,
            width: SNAP_REFERENCE_SHAPE_SIZE,
            height: SNAP_REFERENCE_SHAPE_SIZE,
            text: ''
          }
        })

        shapes.checkCreation({ shape, presetKey: 'square' })
      })

      const reference = await snapping.getObjectSnapshot({ id: resizeCase.referenceId })
      const guidePosition = isHorizontalGuide ? reference.boundsTop : reference.boundsLeft
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

      expect(initialState.frame.id, 'у active crop frame должен быть id для проверки bounds').not.toBeNull()
      if (!initialState.frame.id) {
        throw new Error('Active crop frame должен иметь id для проверки bounds')
      }

      const activeFrame = await snapping.getObjectSnapshot({ id: initialState.frame.id })
      const initialCropEnd = isHorizontalGuide ? activeFrame.boundsBottom : activeFrame.boundsRight
      const frameScale = isHorizontalGuide ? initialState.frame.scaleY : initialState.frame.scaleX
      const snappedSize = (initialCropEnd - guidePosition) / Math.abs(frameScale)
      const requestedSize = snappedSize + (SNAP_APPROACH_OFFSET / Math.abs(frameScale))
      const stateAtSnap = await test.step('Потянуть control почти до направляющей', async() => {
        return crop.dragFrameFromControlToSize({
          control: resizeCase.control,
          size: {
            width: requestedSize,
            height: requestedSize
          }
        })
      })
      const guideState = await snapping.getGuideState()
      const stateAfterHold = await test.step('Продолжить движение внутри зоны удержания', async() => {
        return crop.continueFrameResizeBy({
          deltaX: resizeCase.continueDeltaX,
          deltaY: resizeCase.continueDeltaY
        })
      })
      const stateAfterRelease = await test.step('Выйти из зоны удержания и продолжить уменьшение', async() => {
        return crop.continueFrameResizeBy({
          deltaX: resizeCase.releaseDeltaX,
          deltaY: resizeCase.releaseDeltaY
        })
      })
      const guideStateAfterRelease = await snapping.getGuideState()

      const stateAfterMouseUp = await test.step('Завершить resize и закрыть crop mode', async() => {
        const state = await crop.finishFrameResize()

        await crop.cancel()

        return state
      })

      await test.step('Проверить что snap сразу сохранил пропорции и удержал обе оси', () => {
        expect(initialState.options.allowFrameOverflow).toBe(false)
        expect(initialState.options.preserveAspectRatio).toBe(true)
        expect(guideState.guides).toEqual(expect.arrayContaining([
          expect.objectContaining({
            type: resizeCase.guideType,
            position: guidePosition
          })
        ]))
        expect(Math.abs(stateAtSnap.rect.width - snappedSize)).toBeLessThanOrEqual(SOURCE_PIXEL_TOLERANCE)
        expect(Math.abs(stateAtSnap.rect.height - snappedSize)).toBeLessThanOrEqual(SOURCE_PIXEL_TOLERANCE)
        expect(stateAtSnap.rect.width).toBeCloseTo(stateAtSnap.rect.height, 4)
        expect(stateAfterHold.rect.width).toBeCloseTo(stateAtSnap.rect.width, 4)
        expect(stateAfterHold.rect.height).toBeCloseTo(stateAtSnap.rect.height, 4)
        expect(stateAfterRelease.rect.width).toBeLessThan(stateAfterHold.rect.width - SOURCE_PIXEL_TOLERANCE)
        expect(stateAfterRelease.rect.height).toBeLessThan(stateAfterHold.rect.height - SOURCE_PIXEL_TOLERANCE)
        expect(stateAfterRelease.rect.width).toBeCloseTo(stateAfterRelease.rect.height, 4)
        expect(guideStateAfterRelease.guides).not.toEqual(expect.arrayContaining([
          expect.objectContaining({
            type: resizeCase.guideType,
            position: guidePosition
          })
        ]))
        expect(stateAfterMouseUp.rect.width).toBeCloseTo(stateAfterRelease.rect.width, 4)
        expect(stateAfterMouseUp.rect.height).toBeCloseTo(stateAfterRelease.rect.height, 4)
      })
    })
  }
})
