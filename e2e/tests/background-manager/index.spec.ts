import { test, expect } from '../../fixtures/editor.fixture'
import {
  BROWSER_RESIZE_COVER_TOLERANCE,
  BROWSER_RESIZE_NARROW_VIEWPORT,
  BROWSER_RESIZE_TOLERANCE,
  BROWSER_RESIZE_WIDE_VIEWPORT
} from '../../fixtures/data/browser-resize.data'
import {
  BACKGROUND_COLOR,
  BACKGROUND_IMAGE_SOURCE,
  BACKGROUND_IMAGE_UPDATED_RESOLUTION,
  BACKGROUND_LINEAR_GRADIENT,
  BACKGROUND_UPDATED_RESOLUTION
} from '../../fixtures/data/background.data'

test.describe('Фон монтажной области', () => {
  test('цветовой фон после изменения resolution повторяет новую монтажную область', async({
    background,
    canvas,
    editorModel
  }) => {
    await test.step('Установить цветовой фон', async() => {
      await background.setColor({ color: BACKGROUND_COLOR })
    })

    await test.step('Изменить размер монтажной области', async() => {
      await canvas.setMontageResolution(BACKGROUND_UPDATED_RESOLUTION)
    })

    await test.step('Проверить что цветовой фон совпал с новой монтажной областью', async() => {
      const backgroundObject = await background.getObject()
      const montageBounds = await editorModel.getMontageAreaBounds()

      expect(backgroundObject?.backgroundType).toBe('color')
      expect(backgroundObject?.fill).toBe(BACKGROUND_COLOR)
      expect(Math.abs((backgroundObject?.boundsLeft ?? 0) - montageBounds.left)).toBeLessThanOrEqual(1)
      expect(Math.abs((backgroundObject?.boundsTop ?? 0) - montageBounds.top)).toBeLessThanOrEqual(1)
      expect(Math.abs((backgroundObject?.boundsWidth ?? 0) - montageBounds.width)).toBeLessThanOrEqual(1)
      expect(Math.abs((backgroundObject?.boundsHeight ?? 0) - montageBounds.height)).toBeLessThanOrEqual(1)
    })
  })

  test('градиентный фон после изменения resolution повторяет новую монтажную область', async({
    background,
    canvas,
    editorModel
  }) => {
    await test.step('Установить линейный градиентный фон', async() => {
      await background.setLinearGradient(BACKGROUND_LINEAR_GRADIENT)
    })

    await test.step('Изменить размер монтажной области', async() => {
      await canvas.setMontageResolution(BACKGROUND_UPDATED_RESOLUTION)
    })

    await test.step('Проверить что градиентный фон совпал с новой монтажной областью', async() => {
      const backgroundObject = await background.getObject()
      const montageBounds = await editorModel.getMontageAreaBounds()

      expect(backgroundObject?.backgroundType).toBe('gradient')
      expect(backgroundObject?.hasGradientFill).toBe(true)
      expect(Math.abs((backgroundObject?.boundsLeft ?? 0) - montageBounds.left)).toBeLessThanOrEqual(1)
      expect(Math.abs((backgroundObject?.boundsTop ?? 0) - montageBounds.top)).toBeLessThanOrEqual(1)
      expect(Math.abs((backgroundObject?.boundsWidth ?? 0) - montageBounds.width)).toBeLessThanOrEqual(1)
      expect(Math.abs((backgroundObject?.boundsHeight ?? 0) - montageBounds.height)).toBeLessThanOrEqual(1)
    })
  })

  test('фоновое изображение после изменения resolution продолжает заполнять монтажную область по cover', async({
    background,
    canvas,
    editorModel
  }) => {
    await test.step('Установить фоновое изображение', async() => {
      await background.setImage({ imageSource: BACKGROUND_IMAGE_SOURCE })
    })

    await test.step('Изменить размер монтажной области на портретный', async() => {
      await canvas.setMontageResolution(BACKGROUND_IMAGE_UPDATED_RESOLUTION)
    })

    await test.step('Проверить что изображение продолжает покрывать монтажную область', async() => {
      const backgroundObject = await background.getObject()
      const montageBounds = await editorModel.getMontageAreaBounds()
      const widthMatchesMontage = Math.abs((backgroundObject?.boundsWidth ?? 0) - montageBounds.width) <= 1.5
      const heightMatchesMontage = Math.abs((backgroundObject?.boundsHeight ?? 0) - montageBounds.height) <= 1.5

      expect(backgroundObject?.backgroundType).toBe('image')
      expect(backgroundObject?.boundsCenterX).toBeCloseTo(montageBounds.centerX, 1)
      expect(backgroundObject?.boundsCenterY).toBeCloseTo(montageBounds.centerY, 1)
      expect(backgroundObject?.boundsWidth ?? 0).toBeGreaterThanOrEqual(montageBounds.width - 1.5)
      expect(backgroundObject?.boundsHeight ?? 0).toBeGreaterThanOrEqual(montageBounds.height - 1.5)
      expect(widthMatchesMontage || heightMatchesMontage).toBe(true)
    })
  })

  test('цветовой фон после сужения окна браузера остаётся ровно по монтажной области', async({
    background,
    editorModel
  }) => {
    await test.step('Установить цветовой фон', async() => {
      await background.setColor({ color: BACKGROUND_COLOR })
    })

    await test.step('Сузить окно браузера', async() => {
      await editorModel.resizeViewport(BROWSER_RESIZE_NARROW_VIEWPORT)
    })

    await test.step('Проверить что цветовой фон остался на монтажной области', async() => {
      const backgroundObject = await background.getObject()
      const montageBounds = await editorModel.getMontageAreaBounds()

      expect(backgroundObject?.backgroundType).toBe('color')
      expect(backgroundObject?.fill).toBe(BACKGROUND_COLOR)
      expect(Math.abs((backgroundObject?.boundsLeft ?? 0) - montageBounds.left)).toBeLessThanOrEqual(BROWSER_RESIZE_TOLERANCE)
      expect(Math.abs((backgroundObject?.boundsTop ?? 0) - montageBounds.top)).toBeLessThanOrEqual(BROWSER_RESIZE_TOLERANCE)
      expect(Math.abs((backgroundObject?.boundsWidth ?? 0) - montageBounds.width)).toBeLessThanOrEqual(BROWSER_RESIZE_TOLERANCE)
      expect(Math.abs((backgroundObject?.boundsHeight ?? 0) - montageBounds.height)).toBeLessThanOrEqual(BROWSER_RESIZE_TOLERANCE)
    })
  })

  test('градиентный фон после расширения окна браузера остаётся ровно по монтажной области', async({
    background,
    editorModel
  }) => {
    await test.step('Установить линейный градиентный фон', async() => {
      await background.setLinearGradient(BACKGROUND_LINEAR_GRADIENT)
    })

    await test.step('Расширить окно браузера', async() => {
      await editorModel.resizeViewport(BROWSER_RESIZE_WIDE_VIEWPORT)
    })

    await test.step('Проверить что градиентный фон остался на монтажной области', async() => {
      const backgroundObject = await background.getObject()
      const montageBounds = await editorModel.getMontageAreaBounds()

      expect(backgroundObject?.backgroundType).toBe('gradient')
      expect(backgroundObject?.hasGradientFill).toBe(true)
      expect(Math.abs((backgroundObject?.boundsLeft ?? 0) - montageBounds.left)).toBeLessThanOrEqual(BROWSER_RESIZE_TOLERANCE)
      expect(Math.abs((backgroundObject?.boundsTop ?? 0) - montageBounds.top)).toBeLessThanOrEqual(BROWSER_RESIZE_TOLERANCE)
      expect(Math.abs((backgroundObject?.boundsWidth ?? 0) - montageBounds.width)).toBeLessThanOrEqual(BROWSER_RESIZE_TOLERANCE)
      expect(Math.abs((backgroundObject?.boundsHeight ?? 0) - montageBounds.height)).toBeLessThanOrEqual(BROWSER_RESIZE_TOLERANCE)
    })
  })

  test('после сужения и повторного расширения окна фоновое изображение продолжает покрывать монтажную область', async({
    background,
    editorModel
  }) => {
    await test.step('Установить фоновое изображение', async() => {
      await background.setImage({ imageSource: BACKGROUND_IMAGE_SOURCE })
    })

    await test.step('Сузить окно браузера', async() => {
      await editorModel.resizeViewport(BROWSER_RESIZE_NARROW_VIEWPORT)
    })

    await test.step('Проверить что после сужения изображение всё ещё покрывает монтажную область', async() => {
      const backgroundObject = await background.getObject()
      const montageBounds = await editorModel.getMontageAreaBounds()
      const widthMatchesMontage = Math.abs((backgroundObject?.boundsWidth ?? 0) - montageBounds.width)
        <= BROWSER_RESIZE_COVER_TOLERANCE
      const heightMatchesMontage = Math.abs((backgroundObject?.boundsHeight ?? 0) - montageBounds.height)
        <= BROWSER_RESIZE_COVER_TOLERANCE

      expect(backgroundObject?.backgroundType).toBe('image')
      expect(backgroundObject?.boundsCenterX).toBeCloseTo(montageBounds.centerX, 1)
      expect(backgroundObject?.boundsCenterY).toBeCloseTo(montageBounds.centerY, 1)
      expect(backgroundObject?.boundsWidth ?? 0).toBeGreaterThanOrEqual(montageBounds.width - BROWSER_RESIZE_COVER_TOLERANCE)
      expect(backgroundObject?.boundsHeight ?? 0).toBeGreaterThanOrEqual(montageBounds.height - BROWSER_RESIZE_COVER_TOLERANCE)
      expect(widthMatchesMontage || heightMatchesMontage).toBe(true)
    })

    await test.step('Снова расширить окно браузера', async() => {
      await editorModel.resizeViewport(BROWSER_RESIZE_WIDE_VIEWPORT)
    })

    await test.step('Проверить что после повторного расширения изображение всё ещё покрывает монтажную область', async() => {
      const backgroundObject = await background.getObject()
      const montageBounds = await editorModel.getMontageAreaBounds()
      const widthMatchesMontage = Math.abs((backgroundObject?.boundsWidth ?? 0) - montageBounds.width)
        <= BROWSER_RESIZE_COVER_TOLERANCE
      const heightMatchesMontage = Math.abs((backgroundObject?.boundsHeight ?? 0) - montageBounds.height)
        <= BROWSER_RESIZE_COVER_TOLERANCE

      expect(backgroundObject?.backgroundType).toBe('image')
      expect(backgroundObject?.boundsCenterX).toBeCloseTo(montageBounds.centerX, 1)
      expect(backgroundObject?.boundsCenterY).toBeCloseTo(montageBounds.centerY, 1)
      expect(backgroundObject?.boundsWidth ?? 0).toBeGreaterThanOrEqual(montageBounds.width - BROWSER_RESIZE_COVER_TOLERANCE)
      expect(backgroundObject?.boundsHeight ?? 0).toBeGreaterThanOrEqual(montageBounds.height - BROWSER_RESIZE_COVER_TOLERANCE)
      expect(widthMatchesMontage || heightMatchesMontage).toBe(true)
    })
  })
})
