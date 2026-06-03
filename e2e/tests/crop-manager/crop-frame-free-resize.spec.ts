import { test, expect } from '../../fixtures/editor.fixture'
import type {
  CropRectInfo,
  CropStateInfo
} from '../../types'

/**
 * Допуск сравнения source-пикселей после реальных pointer events.
 */
const SOURCE_PIXEL_TOLERANCE = 2

/**
 * Размер crop frame из пользовательского сценария regression.
 */
const CENTERED_FREE_CROP_SIZE = {
  width: 511,
  height: 302
}

/**
 * Дополнительный drag за source-границу после первого упора.
 */
const SOURCE_BOUNDARY_EXTRA_DRAG_PIXELS = 80

/**
 * Параметры проверки source-boundary regression для свободного resize.
 */
type FreeResizeSourceBoundaryAssertionParams = {
  initialState: CropStateInfo
  stateAtBoundary: CropStateInfo
  stateAfterExtraDrag: CropStateInfo
  stateAfterMouseUp: CropStateInfo
  expectedBoundaryRect: CropRectInfo
}

/**
 * Проверяет, что свободный resize не продолжает рост после первого упора в source.
 */
function assertFreeResizeStoppedAtSourceBoundary({
  initialState,
  stateAtBoundary,
  stateAfterExtraDrag,
  stateAfterMouseUp,
  expectedBoundaryRect
}: FreeResizeSourceBoundaryAssertionParams): void {
  expect(initialState.options.allowFrameOverflow).toBe(false)
  expect(initialState.options.preserveAspectRatio).toBe(false)
  expect(initialState.rect.width).toBeCloseTo(CENTERED_FREE_CROP_SIZE.width, 4)
  expect(initialState.rect.height).toBeCloseTo(CENTERED_FREE_CROP_SIZE.height, 4)

  expect(
    Math.abs(stateAtBoundary.rect.left - expectedBoundaryRect.left)
  ).toBeLessThanOrEqual(SOURCE_PIXEL_TOLERANCE)
  expect(
    Math.abs(stateAtBoundary.rect.top - expectedBoundaryRect.top)
  ).toBeLessThanOrEqual(SOURCE_PIXEL_TOLERANCE)
  expect(
    Math.abs(stateAtBoundary.rect.width - expectedBoundaryRect.width)
  ).toBeLessThanOrEqual(SOURCE_PIXEL_TOLERANCE)
  expect(
    Math.abs(stateAtBoundary.rect.height - expectedBoundaryRect.height)
  ).toBeLessThanOrEqual(SOURCE_PIXEL_TOLERANCE)

  expect(
    Math.abs(stateAfterExtraDrag.rect.left - stateAtBoundary.rect.left)
  ).toBeLessThanOrEqual(SOURCE_PIXEL_TOLERANCE)
  expect(
    Math.abs(stateAfterExtraDrag.rect.top - stateAtBoundary.rect.top)
  ).toBeLessThanOrEqual(SOURCE_PIXEL_TOLERANCE)
  expect(
    Math.abs(stateAfterExtraDrag.rect.width - stateAtBoundary.rect.width)
  ).toBeLessThanOrEqual(SOURCE_PIXEL_TOLERANCE)
  expect(
    Math.abs(stateAfterExtraDrag.rect.height - stateAtBoundary.rect.height)
  ).toBeLessThanOrEqual(SOURCE_PIXEL_TOLERANCE)

  expect(
    Math.abs(stateAfterMouseUp.rect.left - stateAtBoundary.rect.left)
  ).toBeLessThanOrEqual(SOURCE_PIXEL_TOLERANCE)
  expect(
    Math.abs(stateAfterMouseUp.rect.top - stateAtBoundary.rect.top)
  ).toBeLessThanOrEqual(SOURCE_PIXEL_TOLERANCE)
  expect(
    Math.abs(stateAfterMouseUp.rect.width - stateAtBoundary.rect.width)
  ).toBeLessThanOrEqual(SOURCE_PIXEL_TOLERANCE)
  expect(
    Math.abs(stateAfterMouseUp.rect.height - stateAtBoundary.rect.height)
  ).toBeLessThanOrEqual(SOURCE_PIXEL_TOLERANCE)
}

test.describe('Увеличение crop-области изображения без сохранения пропорций', () => {
  test('не увеличивает crop-область вниз после упора верхней стороны в границу source', async({
    crop,
    images
  }) => {
    const image = await test.step('Добавить изображение из пользовательского сценария', async() => {
      return images.checkCreation({
        imageObject: await images.addFilledImage({
          width: 1000,
          height: 667
        })
      })
    })

    const initialState = await test.step(
      'Войти в image crop с запретом выхода за source и свободным resize',
      async() => {
        return crop.startImageCrop({
          id: image.id,
          size: CENTERED_FREE_CROP_SIZE,
          allowFrameOverflow: false,
          preserveAspectRatio: false
        })
      }
    )

    const expectedBoundaryRect = {
      left: initialState.rect.left,
      top: 0,
      width: initialState.rect.width,
      height: initialState.rect.top + initialState.rect.height
    }

    const stateAtBoundary = await test.step('Потянуть верхний control до верхней границы source', async() => {
      return crop.dragFrameControlBySourcePixels({
        control: 'mt',
        deltaX: 0,
        deltaY: -initialState.rect.top,
        pointerSteps: 12
      })
    })

    const stateAfterExtraDrag = await test.step('Продолжить движение верхнего control за границу source', async() => {
      return crop.continueFrameResizeBySourcePixels({
        deltaX: 0,
        deltaY: -SOURCE_BOUNDARY_EXTRA_DRAG_PIXELS,
        pointerSteps: 8
      })
    })

    const stateAfterMouseUp = await test.step('Завершить resize и закрыть crop mode', async() => {
      const state = await crop.finishFrameResize()

      await crop.cancel()

      return state
    })

    await test.step('Проверить что после упора crop не растёт в другие стороны', () => {
      assertFreeResizeStoppedAtSourceBoundary({
        initialState,
        stateAtBoundary,
        stateAfterExtraDrag,
        stateAfterMouseUp,
        expectedBoundaryRect
      })
    })
  })
})
