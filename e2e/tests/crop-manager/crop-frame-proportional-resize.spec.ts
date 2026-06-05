import { test, expect } from '../../fixtures/editor.fixture'
import {
  PROPORTIONAL_CENTER_GUIDE_BOUNDARY_DRAG_PIXELS,
  PROPORTIONAL_CENTER_GUIDE_CROP_SIZE,
  PROPORTIONAL_CENTER_GUIDE_HOLD_CASES,
  PROPORTIONAL_CENTER_GUIDE_HOLD_DRAG_PIXELS,
  PROPORTIONAL_CENTER_GUIDE_IMAGE_SIZE,
  PROPORTIONAL_CENTER_GUIDE_SLOW_BOUNDARY_STEPS
} from '../../fixtures/data/crop-frame-proportional-resize.data'

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

/**
 * Смещение source-точки, которое оставляет курсор внутри изображения, но уже в зоне boundary snap.
 */
const SOURCE_BOUNDARY_SNAP_INSIDE_OFFSET = 1

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
      expect(Math.abs(initialState.rect.width - (initialState.rect.height * (4 / 3))))
        .toBeLessThanOrEqual(SOURCE_PIXEL_TOLERANCE)
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

test.describe('Удержание размера пропорциональной crop-области на центральных направляющих', () => {
  test('при увеличении из левого нижнего угла до source-границы оставляет правый верхний угол на месте', async({
    editorModel,
    crop,
    images
  }) => {
    const image = await test.step('Добавить изображение 1000x667', async() => {
      return images.checkCreation({
        imageObject: await images.addFilledImage({
          ...PROPORTIONAL_CENTER_GUIDE_IMAGE_SIZE,
          scale: 'image-contain'
        })
      })
    })

    const positionedState = await test.step('Подготовить crop 430x287 с правой и верхней гранью на центральных guide', async() => {
      return crop.startProportionalImageCropAtMontageCenterGuides({
        image,
        size: PROPORTIONAL_CENTER_GUIDE_CROP_SIZE,
        alignedEdges: {
          horizontalEdge: 'right',
          verticalEdge: 'top'
        }
      })
    })

    const fixedRight = positionedState.rect.left + positionedState.rect.width
    const fixedTop = positionedState.rect.top
    const expectedSourceBoundarySize = {
      width: Math.round(image.width / 2),
      height: Math.round(image.height / 2)
    }
    const expectedRect = {
      left: fixedRight - expectedSourceBoundarySize.width,
      top: fixedTop,
      width: expectedSourceBoundarySize.width,
      height: expectedSourceBoundarySize.height
    }

    await test.step('Потянуть левый нижний угол наружу до source-границы', async() => {
      await crop.dragFrameControlBySourcePixels({
        control: 'bl',
        deltaX: -PROPORTIONAL_CENTER_GUIDE_BOUNDARY_DRAG_PIXELS,
        deltaY: PROPORTIONAL_CENTER_GUIDE_BOUNDARY_DRAG_PIXELS,
        pointerSteps: 12
      })
    })

    const liveState = await test.step('Проверить live-индикатор и текущее состояние crop', async() => {
      const indicator = await editorModel.requireObjectSizeIndicator()

      expect(indicator.width).toBe(Math.round(expectedRect.width))
      expect(indicator.height).toBe(Math.round(expectedRect.height))

      return crop.requireState()
    })

    const stateAfterMouseUp = await test.step('Завершить resize и закрыть crop mode', async() => {
      const state = await crop.finishFrameResize()

      await crop.cancel()

      return state
    })

    await test.step('Проверить что crop дошёл до source-границы без сдвига правого верхнего угла', () => {
      expect(Math.abs(liveState.rect.top - expectedRect.top)).toBeLessThanOrEqual(SOURCE_PIXEL_TOLERANCE)
      expect(Math.abs(liveState.rect.left + liveState.rect.width - fixedRight))
        .toBeLessThanOrEqual(SOURCE_PIXEL_TOLERANCE)
      expect(Math.abs(liveState.rect.left - expectedRect.left)).toBeLessThanOrEqual(SOURCE_PIXEL_TOLERANCE)
      expect(Math.abs(liveState.rect.top + liveState.rect.height - image.height)).toBeLessThanOrEqual(SOURCE_PIXEL_TOLERANCE)
      expect(Math.abs(liveState.rect.width - expectedRect.width)).toBeLessThanOrEqual(SOURCE_PIXEL_TOLERANCE)
      expect(Math.abs(liveState.rect.height - expectedRect.height)).toBeLessThanOrEqual(SOURCE_PIXEL_TOLERANCE)

      expect(stateAfterMouseUp.rect.top).toBeCloseTo(liveState.rect.top, 4)
      expect(Math.abs(stateAfterMouseUp.rect.left + stateAfterMouseUp.rect.width - fixedRight))
        .toBeLessThanOrEqual(SOURCE_PIXEL_TOLERANCE)
      expect(stateAfterMouseUp.rect.width).toBeCloseTo(liveState.rect.width, 4)
      expect(stateAfterMouseUp.rect.height).toBeCloseTo(liveState.rect.height, 4)
    })
  })

  test('при повторном увеличении из левого нижнего угла без mouseup не двигает правый верхний угол', async({
    crop,
    images
  }) => {
    const image = await test.step('Добавить изображение 1000x667', async() => {
      return images.checkCreation({
        imageObject: await images.addFilledImage({
          ...PROPORTIONAL_CENTER_GUIDE_IMAGE_SIZE,
          scale: 'image-contain'
        })
      })
    })

    const positionedState = await test.step('Подготовить crop 430x287 с правой и верхней гранью на центральных guide', async() => {
      return crop.startProportionalImageCropAtMontageCenterGuides({
        image,
        size: PROPORTIONAL_CENTER_GUIDE_CROP_SIZE,
        alignedEdges: {
          horizontalEdge: 'right',
          verticalEdge: 'top'
        }
      })
    })

    const fixedRight = positionedState.rect.left + positionedState.rect.width
    const fixedTop = positionedState.rect.top
    const expectedSize = {
      width: Math.round(image.width / 2),
      height: Math.round(image.height / 2)
    }

    const firstGrowthState = await test.step('Потянуть левый нижний угол наружу до source-границы', async() => {
      return crop.dragFrameControlBySourcePixels({
        control: 'bl',
        deltaX: -PROPORTIONAL_CENTER_GUIDE_BOUNDARY_DRAG_PIXELS,
        deltaY: PROPORTIONAL_CENTER_GUIDE_BOUNDARY_DRAG_PIXELS,
        pointerSteps: 12
      })
    })

    const shrinkState = await test.step('Не отпуская control, уменьшить crop-область', async() => {
      return crop.continueFrameResizeBySourcePixels({
        deltaX: PROPORTIONAL_CENTER_GUIDE_BOUNDARY_DRAG_PIXELS - PROPORTIONAL_CENTER_GUIDE_HOLD_DRAG_PIXELS,
        deltaY: -PROPORTIONAL_CENTER_GUIDE_BOUNDARY_DRAG_PIXELS + PROPORTIONAL_CENTER_GUIDE_HOLD_DRAG_PIXELS,
        pointerSteps: 12
      })
    })

    const secondGrowthState = await test.step('Не отпуская control, снова увеличить crop-область до source-границы', async() => {
      return crop.continueFrameResizeBySourcePixels({
        deltaX: -PROPORTIONAL_CENTER_GUIDE_BOUNDARY_DRAG_PIXELS + PROPORTIONAL_CENTER_GUIDE_HOLD_DRAG_PIXELS,
        deltaY: PROPORTIONAL_CENTER_GUIDE_BOUNDARY_DRAG_PIXELS - PROPORTIONAL_CENTER_GUIDE_HOLD_DRAG_PIXELS,
        pointerSteps: 12
      })
    })

    const stateAfterMouseUp = await test.step('Завершить resize и закрыть crop mode', async() => {
      const state = await crop.finishFrameResize()

      await crop.cancel()

      return state
    })

    await test.step('Проверить что правый верхний угол не участвует в live resize', () => {
      for (const state of [firstGrowthState, shrinkState, secondGrowthState, stateAfterMouseUp]) {
        expect(Math.abs(state.rect.top - fixedTop)).toBeLessThanOrEqual(SOURCE_PIXEL_TOLERANCE)
        expect(Math.abs(state.rect.left + state.rect.width - fixedRight))
          .toBeLessThanOrEqual(SOURCE_PIXEL_TOLERANCE)
      }

      expect(Math.abs(firstGrowthState.rect.width - expectedSize.width)).toBeLessThanOrEqual(SOURCE_PIXEL_TOLERANCE)
      expect(Math.abs(firstGrowthState.rect.height - expectedSize.height)).toBeLessThanOrEqual(SOURCE_PIXEL_TOLERANCE)
      expect(Math.abs(secondGrowthState.rect.width - expectedSize.width)).toBeLessThanOrEqual(SOURCE_PIXEL_TOLERANCE)
      expect(Math.abs(secondGrowthState.rect.height - expectedSize.height)).toBeLessThanOrEqual(SOURCE_PIXEL_TOLERANCE)
      expect(secondGrowthState.rect.width).toBeCloseTo(firstGrowthState.rect.width, 4)
      expect(secondGrowthState.rect.height).toBeCloseTo(firstGrowthState.rect.height, 4)
      expect(shrinkState.rect.width).toBeLessThan(firstGrowthState.rect.width - SOURCE_PIXEL_TOLERANCE)
      expect(shrinkState.rect.height).toBeLessThan(firstGrowthState.rect.height - SOURCE_PIXEL_TOLERANCE)
    })
  })

  test('при медленном скейлинге из левого нижнего угла к source-границе не выводит crop за source', async({
    crop,
    images
  }) => {
    const image = await test.step('Добавить изображение 1000x667', async() => {
      return images.checkCreation({
        imageObject: await images.addFilledImage({
          ...PROPORTIONAL_CENTER_GUIDE_IMAGE_SIZE,
          scale: 'image-contain'
        })
      })
    })

    const positionedState = await test.step('Подготовить crop 430x287 с правой и верхней гранью на центральных guide', async() => {
      return crop.startProportionalImageCropAtMontageCenterGuides({
        image,
        size: PROPORTIONAL_CENTER_GUIDE_CROP_SIZE,
        alignedEdges: {
          horizontalEdge: 'right',
          verticalEdge: 'top'
        }
      })
    })

    const fixedRight = positionedState.rect.left + positionedState.rect.width
    const fixedTop = positionedState.rect.top
    const expectedSize = {
      width: Math.round(image.width / 2),
      height: Math.round(image.height / 2)
    }

    const liveSteps = await test.step('Медленно потянуть левый нижний угол к source-границе', async() => {
      return crop.dragFrameControlSlowlyToSourcePoint({
        control: 'bl',
        sourcePoint: {
          x: 0,
          y: image.height
        },
        steps: PROPORTIONAL_CENTER_GUIDE_SLOW_BOUNDARY_STEPS
      })
    })
    expect(liveSteps.length, 'медленный resize должен вернуть live-состояния').toBeGreaterThan(0)
    const firstLiveStep = liveSteps[0]
    if (!firstLiveStep) {
      throw new Error('Первое live-состояние медленного resize должно существовать')
    }

    const stateAtBoundary = liveSteps[liveSteps.length - 1]?.state
    expect(stateAtBoundary, 'последнее live-состояние медленного resize должно существовать').toBeDefined()
    if (!stateAtBoundary) {
      throw new Error('Последнее live-состояние медленного resize должно существовать')
    }

    const stateAfterMouseUp = await test.step('Завершить resize и закрыть crop mode', async() => {
      const state = await crop.finishFrameResize()

      await crop.cancel()

      return state
    })
    const widestLiveStep = liveSteps.reduce((current, next) => {
      return next.state.rect.width > current.state.rect.width ? next : current
    }, firstLiveStep)
    const visibleIndicatorSteps = liveSteps.filter((step) => {
      return step.indicator.visible
        && step.indicator.width !== null
        && step.indicator.height !== null
    })
    const boundaryStepIndex = liveSteps.findIndex(({ state }) => {
      const bottomGap = image.height - state.rect.top - state.rect.height

      return state.rect.left <= SOURCE_PIXEL_TOLERANCE || bottomGap <= SOURCE_PIXEL_TOLERANCE
    })
    const visibleBoundarySteps = liveSteps.slice(Math.max(boundaryStepIndex, 0)).filter((step) => {
      return step.indicator.visible
        && step.indicator.width !== null
        && step.indicator.height !== null
    })
    const firstIndicatorStep = visibleIndicatorSteps[0]
    const lastIndicatorStep = visibleIndicatorSteps[visibleIndicatorSteps.length - 1]
    const widestIndicatorStep = firstIndicatorStep
      ? visibleIndicatorSteps.reduce((current, next) => {
        if (current.indicator.width === null) return next
        if (next.indicator.width === null) return current

        return next.indicator.width > current.indicator.width ? next : current
      }, firstIndicatorStep)
      : null
    const expectedIndicatorSize = {
      width: Math.round(image.width / 2),
      height: Math.round(image.height / 2)
    }
    const observedIndicatorSizes = visibleIndicatorSteps.map((step) => {
      return `${step.indicator.width}x${step.indicator.height}`
    })
    const observedBoundarySizes = visibleBoundarySteps.map((step) => {
      return `${step.indicator.width}x${step.indicator.height}`
    })
    const liveRectSummary = liveSteps.map(({ state, indicator }) => {
      const bottomGap = image.height - state.rect.top - state.rect.height

      return [
        `left=${state.rect.left.toFixed(3)}`,
        `bottomGap=${bottomGap.toFixed(3)}`,
        `size=${state.rect.width.toFixed(3)}x${state.rect.height.toFixed(3)}`,
        `indicator=${indicator.width}x${indicator.height}`
      ].join(' ')
    })

    await test.step('Проверить что crop остался внутри source и правый верхний угол не сдвинулся', () => {
      expect(boundaryStepIndex, `live resize должен дойти до source-границы: ${liveRectSummary.join(' -> ')}`)
        .toBeGreaterThanOrEqual(0)
      expect(visibleIndicatorSteps.length).toBeGreaterThan(0)
      expect(visibleBoundarySteps.length, 'у source-границы должен быть видимый indicator').toBeGreaterThan(0)
      expect(widestLiveStep.state.rect.width).toBeLessThanOrEqual(expectedSize.width + SOURCE_PIXEL_TOLERANCE)
      expect(widestLiveStep.state.rect.height).toBeLessThanOrEqual(expectedSize.height + SOURCE_PIXEL_TOLERANCE)

      expect(widestIndicatorStep, 'в live resize должен быть видимый максимальный индикатор').not.toBeNull()
      if (!widestIndicatorStep) {
        throw new Error('В live resize должен быть видимый максимальный индикатор')
      }
      expect(widestIndicatorStep.indicator.width, `live-размеры: ${observedIndicatorSizes.join(' -> ')}`)
        .toBe(expectedIndicatorSize.width)
      expect(widestIndicatorStep.indicator.height, `live-размеры: ${observedIndicatorSizes.join(' -> ')}`)
        .toBe(expectedIndicatorSize.height)
      expect(lastIndicatorStep, 'последний live-индикатор у source-границы должен существовать').toBeDefined()
      if (!lastIndicatorStep) {
        throw new Error('Последний live-индикатор у source-границы должен существовать')
      }
      expect(lastIndicatorStep.indicator.width, `live-размеры: ${observedIndicatorSizes.join(' -> ')}`)
        .toBe(expectedIndicatorSize.width)
      expect(lastIndicatorStep.indicator.height, `live-размеры: ${observedIndicatorSizes.join(' -> ')}`)
        .toBe(expectedIndicatorSize.height)

      for (const step of visibleBoundarySteps) {
        expect(step.indicator.width, `live-размеры у source-границы: ${observedBoundarySizes.join(' -> ')}`)
          .toBe(expectedIndicatorSize.width)
        expect(step.indicator.height, `live-размеры у source-границы: ${observedBoundarySizes.join(' -> ')}`)
          .toBe(expectedIndicatorSize.height)
      }

      for (const { state, indicator } of liveSteps) {
        expect(Math.abs(state.rect.top - fixedTop)).toBeLessThanOrEqual(SOURCE_PIXEL_TOLERANCE)
        expect(Math.abs(state.rect.left + state.rect.width - fixedRight))
          .toBeLessThanOrEqual(SOURCE_PIXEL_TOLERANCE)
        expect(state.rect.left).toBeGreaterThanOrEqual(-SOURCE_PIXEL_TOLERANCE)
        expect(state.rect.top + state.rect.height).toBeLessThanOrEqual(image.height + SOURCE_PIXEL_TOLERANCE)
        expect(state.rect.width).toBeLessThanOrEqual(expectedSize.width + SOURCE_PIXEL_TOLERANCE)
        expect(state.rect.height).toBeLessThanOrEqual(expectedSize.height + SOURCE_PIXEL_TOLERANCE)

        if (indicator.visible && indicator.width !== null && indicator.height !== null) {
          expect(indicator.width).toBeLessThanOrEqual(expectedIndicatorSize.width + SOURCE_PIXEL_TOLERANCE)
          expect(indicator.height).toBeLessThanOrEqual(expectedIndicatorSize.height + SOURCE_PIXEL_TOLERANCE)
        }
      }

      expect(Math.abs(stateAfterMouseUp.rect.top - fixedTop)).toBeLessThanOrEqual(SOURCE_PIXEL_TOLERANCE)
      expect(Math.abs(stateAfterMouseUp.rect.left + stateAfterMouseUp.rect.width - fixedRight))
        .toBeLessThanOrEqual(SOURCE_PIXEL_TOLERANCE)
      expect(stateAfterMouseUp.rect.left).toBeGreaterThanOrEqual(-SOURCE_PIXEL_TOLERANCE)
      expect(stateAfterMouseUp.rect.top + stateAfterMouseUp.rect.height)
        .toBeLessThanOrEqual(image.height + SOURCE_PIXEL_TOLERANCE)
      expect(stateAfterMouseUp.rect.width).toBeCloseTo(stateAtBoundary.rect.width, 4)
      expect(stateAfterMouseUp.rect.height).toBeCloseTo(stateAtBoundary.rect.height, 4)
    })
  })

  test('при медленном скейлинге из левого нижнего угла внутри snap-зоны показывает 500x334', async({
    editorModel,
    crop,
    images,
    page
  }) => {
    await page.setViewportSize({
      width: 1920,
      height: 900
    })
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await editorModel.waitForReady()

    const image = await test.step('Добавить изображение 1000x667', async() => {
      return images.checkCreation({
        imageObject: await images.addFilledImage({
          ...PROPORTIONAL_CENTER_GUIDE_IMAGE_SIZE,
          scale: 'image-contain'
        })
      })
    })
    const expectedIndicatorSize = {
      width: Math.round(image.width / 2),
      height: Math.round(image.height / 2)
    }
    const positionedState = await test.step('Подготовить crop 430x287 с правой и верхней гранью на центральных guide', async() => {
      const startedState = await crop.startImageCrop({
        id: image.id,
        size: PROPORTIONAL_CENTER_GUIDE_CROP_SIZE,
        allowFrameOverflow: false,
        preserveAspectRatio: true
      })

      expect(startedState.options.allowFrameOverflow).toBe(false)
      expect(startedState.options.preserveAspectRatio).toBe(true)
      expect(Math.round(startedState.rect.width)).toBe(PROPORTIONAL_CENTER_GUIDE_CROP_SIZE.width)
      expect(Math.round(startedState.rect.height)).toBe(PROPORTIONAL_CENTER_GUIDE_CROP_SIZE.height)

      return crop.moveFrameEdgesToMontageCenterGuides({
        horizontalEdge: 'right',
        verticalEdge: 'top'
      })
    })
    const fixedRight = positionedState.rect.left + positionedState.rect.width
    const fixedTop = positionedState.rect.top

    await test.step('Проверить что guide snap зафиксировал правую грань в середине source', () => {
      expect(fixedRight).toBe(expectedIndicatorSize.width)
      expect(Math.abs(fixedTop - (image.height / 2))).toBeLessThanOrEqual(SOURCE_PIXEL_TOLERANCE)
    })

    const liveSteps = await test.step('Медленно потянуть левый нижний угол внутрь source-boundary snap-зоны', async() => {
      return crop.dragFrameControlSlowlyToSourcePoint({
        control: 'bl',
        sourcePoint: {
          x: SOURCE_BOUNDARY_SNAP_INSIDE_OFFSET,
          y: image.height - SOURCE_BOUNDARY_SNAP_INSIDE_OFFSET
        },
        steps: PROPORTIONAL_CENTER_GUIDE_SLOW_BOUNDARY_STEPS
      })
    })
    expect(liveSteps.length, 'медленный resize должен вернуть live-состояния').toBeGreaterThan(0)

    const finalLiveStep = liveSteps[liveSteps.length - 1]
    expect(finalLiveStep, 'последнее live-состояние внутри snap-зоны должно существовать').toBeDefined()
    if (!finalLiveStep) {
      throw new Error('Последнее live-состояние внутри snap-зоны должно существовать')
    }

    const visibleIndicatorSteps = liveSteps.filter((step) => {
      return step.indicator.visible
        && step.indicator.width !== null
        && step.indicator.height !== null
    })
    const finalIndicatorStep = visibleIndicatorSteps[visibleIndicatorSteps.length - 1]
    const observedIndicatorSizes = visibleIndicatorSteps.map((step) => {
      return `${step.indicator.width}x${step.indicator.height}`
    })

    const stateAfterMouseUp = await test.step('Завершить resize и закрыть crop mode', async() => {
      const state = await crop.finishFrameResize()

      await crop.cancel()

      return state
    })

    await test.step('Проверить live-индикатор и fixed правый верхний угол', () => {
      expect(finalIndicatorStep, 'последний видимый indicator внутри snap-зоны должен существовать').toBeDefined()
      if (!finalIndicatorStep) {
        throw new Error('Последний видимый indicator внутри snap-зоны должен существовать')
      }

      expect(finalIndicatorStep.indicator.width, `live-размеры: ${observedIndicatorSizes.join(' -> ')}`)
        .toBe(expectedIndicatorSize.width)
      expect(finalIndicatorStep.indicator.height, `live-размеры: ${observedIndicatorSizes.join(' -> ')}`)
        .toBe(expectedIndicatorSize.height)
      expect(Math.abs(finalLiveStep.state.rect.left + finalLiveStep.state.rect.width - fixedRight))
        .toBeLessThanOrEqual(SOURCE_PIXEL_TOLERANCE)
      expect(Math.abs(finalLiveStep.state.rect.top - fixedTop)).toBeLessThanOrEqual(SOURCE_PIXEL_TOLERANCE)
      expect(finalLiveStep.state.rect.left).toBeGreaterThanOrEqual(-SOURCE_PIXEL_TOLERANCE)
      expect(finalLiveStep.state.rect.top + finalLiveStep.state.rect.height)
        .toBeLessThanOrEqual(image.height + SOURCE_PIXEL_TOLERANCE)
      expect(stateAfterMouseUp.rect.width).toBeCloseTo(finalLiveStep.state.rect.width, 4)
      expect(stateAfterMouseUp.rect.height).toBeCloseTo(finalLiveStep.state.rect.height, 4)
    })
  })

  test('после упора слева и снизу скейлинг из правого верхнего угла показывает полный размер source', async({
    crop,
    images
  }) => {
    const image = await test.step('Добавить изображение 1000x667', async() => {
      return images.checkCreation({
        imageObject: await images.addFilledImage({
          ...PROPORTIONAL_CENTER_GUIDE_IMAGE_SIZE,
          scale: 'image-contain'
        })
      })
    })

    await test.step('Подготовить crop 430x287 с правой и верхней гранью на центральных guide', async() => {
      await crop.startImageCrop({
        id: image.id,
        allowFrameOverflow: false,
        preserveAspectRatio: true
      })

      const resizedState = await crop.dragFrameFromControlToSize({
        control: 'br',
        size: PROPORTIONAL_CENTER_GUIDE_CROP_SIZE
      })
      await crop.finishFrameResize()

      expect(Math.abs(resizedState.rect.width - PROPORTIONAL_CENTER_GUIDE_CROP_SIZE.width)).toBeLessThanOrEqual(SOURCE_PIXEL_TOLERANCE)
      expect(Math.abs(resizedState.rect.height - PROPORTIONAL_CENTER_GUIDE_CROP_SIZE.height)).toBeLessThanOrEqual(SOURCE_PIXEL_TOLERANCE)

      await crop.moveFrameEdgesToMontageCenterGuides({
        horizontalEdge: 'right',
        verticalEdge: 'top'
      })

      await crop.dragFrameControlSlowlyToSourcePoint({
        control: 'bl',
        sourcePoint: {
          x: SOURCE_BOUNDARY_SNAP_INSIDE_OFFSET,
          y: image.height - SOURCE_BOUNDARY_SNAP_INSIDE_OFFSET
        },
        steps: PROPORTIONAL_CENTER_GUIDE_SLOW_BOUNDARY_STEPS
      })
      await crop.finishFrameResize()
    })

    const liveSteps = await test.step('Медленно потянуть правый верхний угол внутрь source-boundary snap-зоны', async() => {
      return crop.dragFrameControlSlowlyToSourcePoint({
        control: 'tr',
        sourcePoint: {
          x: image.width - SOURCE_BOUNDARY_SNAP_INSIDE_OFFSET,
          y: SOURCE_BOUNDARY_SNAP_INSIDE_OFFSET
        },
        steps: PROPORTIONAL_CENTER_GUIDE_SLOW_BOUNDARY_STEPS
      })
    })
    expect(liveSteps.length, 'медленный resize должен вернуть live-состояния').toBeGreaterThan(0)

    const finalLiveStep = liveSteps[liveSteps.length - 1]
    expect(finalLiveStep, 'последнее live-состояние полного resize должно существовать').toBeDefined()
    if (!finalLiveStep) {
      throw new Error('Последнее live-состояние полного resize должно существовать')
    }

    const visibleIndicatorSteps = liveSteps.filter((step) => {
      return step.indicator.visible
        && step.indicator.width !== null
        && step.indicator.height !== null
    })
    const finalIndicatorStep = visibleIndicatorSteps[visibleIndicatorSteps.length - 1]
    const observedIndicatorSizes = visibleIndicatorSteps.map((step) => {
      return `${step.indicator.width}x${step.indicator.height}`
    })

    const stateAfterMouseUp = await test.step('Завершить resize и закрыть crop mode', async() => {
      const state = await crop.finishFrameResize()

      await crop.cancel()

      return state
    })

    await test.step('Проверить что правый верхний resize дошёл до полного source-размера', () => {
      expect(finalIndicatorStep, 'последний видимый indicator полного resize должен существовать').toBeDefined()
      if (!finalIndicatorStep) {
        throw new Error('Последний видимый indicator полного resize должен существовать')
      }

      expect(finalIndicatorStep.indicator.width, `live-размеры: ${observedIndicatorSizes.join(' -> ')}`)
        .toBe(image.width)
      expect(finalIndicatorStep.indicator.height, `live-размеры: ${observedIndicatorSizes.join(' -> ')}`)
        .toBe(image.height)
      expect(finalLiveStep.state.rect.left).toBeGreaterThanOrEqual(-SOURCE_PIXEL_TOLERANCE)
      expect(finalLiveStep.state.rect.top).toBeGreaterThanOrEqual(-SOURCE_PIXEL_TOLERANCE)
      expect(finalLiveStep.state.rect.left + finalLiveStep.state.rect.width)
        .toBeLessThanOrEqual(image.width + SOURCE_PIXEL_TOLERANCE)
      expect(finalLiveStep.state.rect.top + finalLiveStep.state.rect.height)
        .toBeLessThanOrEqual(image.height + SOURCE_PIXEL_TOLERANCE)
      expect(stateAfterMouseUp.rect.width).toBeCloseTo(finalLiveStep.state.rect.width, 4)
      expect(stateAfterMouseUp.rect.height).toBeCloseTo(finalLiveStep.state.rect.height, 4)
    })
  })

  test('после упора слева и снизу правый control не добавляет лишний пиксель', async({
    editorModel,
    crop,
    images
  }) => {
    const image = await test.step('Добавить изображение 1000x667', async() => {
      return images.checkCreation({
        imageObject: await images.addFilledImage({
          ...PROPORTIONAL_CENTER_GUIDE_IMAGE_SIZE,
          scale: 'image-contain'
        })
      })
    })

    await test.step('Подготовить crop 430x287 с правой и верхней гранью на центральных guide', async() => {
      await crop.startImageCrop({
        id: image.id,
        allowFrameOverflow: false,
        preserveAspectRatio: true
      })

      const resizedState = await crop.dragFrameFromControlToSize({
        control: 'br',
        size: PROPORTIONAL_CENTER_GUIDE_CROP_SIZE
      })
      await crop.finishFrameResize()

      expect(Math.abs(resizedState.rect.width - PROPORTIONAL_CENTER_GUIDE_CROP_SIZE.width)).toBeLessThanOrEqual(SOURCE_PIXEL_TOLERANCE)
      expect(Math.abs(resizedState.rect.height - PROPORTIONAL_CENTER_GUIDE_CROP_SIZE.height)).toBeLessThanOrEqual(SOURCE_PIXEL_TOLERANCE)

      return crop.moveFrameEdgesToMontageCenterGuides({
        horizontalEdge: 'right',
        verticalEdge: 'top'
      })
    })

    await test.step('Довести левый нижний угол до source-boundary snap и завершить resize', async() => {
      await crop.dragFrameControlSlowlyToSourcePoint({
        control: 'bl',
        sourcePoint: {
          x: SOURCE_BOUNDARY_SNAP_INSIDE_OFFSET,
          y: image.height - SOURCE_BOUNDARY_SNAP_INSIDE_OFFSET
        },
        steps: PROPORTIONAL_CENTER_GUIDE_SLOW_BOUNDARY_STEPS
      })
      await crop.finishFrameResize()
    })

    await test.step('Потянуть правый control на один source-пиксель', async() => {
      await crop.dragFrameControlBySourcePixels({
        control: 'mr',
        deltaX: 1,
        deltaY: 0
      })
    })

    const indicator = await test.step('Получить live-индикатор после правого control', async() => {
      return editorModel.requireObjectSizeIndicator()
    })

    await test.step('Проверить что правый control не дал 501x334', () => {
      expect(indicator.width).toBe(500)
      expect(indicator.height).toBe(334)
    })
  })

  for (const cropCase of PROPORTIONAL_CENTER_GUIDE_HOLD_CASES) {
    test(cropCase.title, async({
      editorModel,
      crop,
      images
    }) => {
      const image = await test.step('Добавить изображение 1000x667', async() => {
        return images.checkCreation({
          imageObject: await images.addFilledImage({
            ...PROPORTIONAL_CENTER_GUIDE_IMAGE_SIZE,
            scale: 'image-contain'
          })
        })
      })

      const positionedState = await test.step('Подготовить пропорциональный image crop у центральных направляющих', async() => {
        return crop.startProportionalImageCropAtMontageCenterGuides({
          image,
          size: PROPORTIONAL_CENTER_GUIDE_CROP_SIZE,
          alignedEdges: cropCase.alignedEdges
        })
      })
      const expectedSize = {
        width: Math.round(positionedState.rect.width),
        height: Math.round(positionedState.rect.height)
      }

      await test.step('Потянуть выбранный угол немного наружу', async() => {
        await crop.dragFrameControlBySourcePixels({
          control: cropCase.control,
          deltaX: cropCase.deltaX * PROPORTIONAL_CENTER_GUIDE_HOLD_DRAG_PIXELS,
          deltaY: cropCase.deltaY * PROPORTIONAL_CENTER_GUIDE_HOLD_DRAG_PIXELS
        })
      })

      const liveState = await test.step('Проверить live-индикатор и текущее состояние crop', async() => {
        const indicator = await editorModel.requireObjectSizeIndicator()

        expect(indicator.width).toBe(expectedSize.width)
        expect(indicator.height).toBe(expectedSize.height)

        return crop.requireState()
      })

      const stateAfterMouseUp = await test.step('Завершить resize и закрыть crop mode', async() => {
        const state = await crop.finishFrameResize()

        await crop.cancel()

        return state
      })

      await test.step('Проверить что небольшой drag не изменил размер и положение crop', () => {
        expect(liveState.rect.left).toBeCloseTo(positionedState.rect.left, 4)
        expect(liveState.rect.top).toBeCloseTo(positionedState.rect.top, 4)
        expect(liveState.rect.width).toBeCloseTo(positionedState.rect.width, 4)
        expect(liveState.rect.height).toBeCloseTo(positionedState.rect.height, 4)
        expect(stateAfterMouseUp.rect.left).toBeCloseTo(positionedState.rect.left, 4)
        expect(stateAfterMouseUp.rect.top).toBeCloseTo(positionedState.rect.top, 4)
        expect(stateAfterMouseUp.rect.width).toBeCloseTo(positionedState.rect.width, 4)
        expect(stateAfterMouseUp.rect.height).toBeCloseTo(positionedState.rect.height, 4)
      })
    })
  }
})
