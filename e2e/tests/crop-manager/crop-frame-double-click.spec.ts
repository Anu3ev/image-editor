import { test, expect } from '../../fixtures/editor.fixture'

test.describe('Двойной клик по crop-области изображения', () => {
  test('не растягивает crop-область до монтажной области, когда overflow выключен', async({
    crop,
    images
  }) => {
    const image = await test.step('Добавить изображение, которое не занимает всю монтажную область', async() => {
      return images.checkCreation({
        imageObject: await images.addFilledImage({
          width: 1000,
          height: 667
        })
      })
    })

    await test.step('Дополнительно уменьшить изображение перед входом в crop mode', async() => {
      await images.scaleHorizontallyFromRight({
        id: image.id,
        scaleX: 0.38
      })

      await images.finishScale({ id: image.id })
    })

    const initialState = await test.step('Войти в image crop с выключенным overflow', async() => {
      return crop.startImageCrop({
        id: image.id,
        allowFrameOverflow: false
      })
    })

    const stateAfterDoubleClick = await test.step('Сделать двойной клик по crop-области', async() => {
      return crop.doubleClickFrame()
    })

    await test.step('Проверить что crop-область осталась в пределах изображения', () => {
      expect(initialState.options.allowFrameOverflow).toBe(false)
      expect(initialState.rect.width).toBeCloseTo(image.width, 5)
      expect(initialState.rect.height).toBeCloseTo(image.height, 5)
      expect(stateAfterDoubleClick.rect.width).toBeCloseTo(initialState.rect.width, 5)
      expect(stateAfterDoubleClick.rect.height).toBeCloseTo(initialState.rect.height, 5)
      expect(stateAfterDoubleClick.frame.scaleX).toBeCloseTo(initialState.frame.scaleX ?? 1, 5)
      expect(stateAfterDoubleClick.frame.scaleY).toBeCloseTo(initialState.frame.scaleY ?? 1, 5)
    })
  })

  test('сохраняет текущие пропорции crop-области, когда keep ratio включён', async({
    crop,
    images
  }) => {
    const image = await test.step('Добавить горизонтальное изображение', async() => {
      return images.checkCreation({
        imageObject: await images.addFilledImage({
          width: 1000,
          height: 667
        })
      })
    })

    const initialState = await test.step('Войти в image crop с пропорциями 1:1', async() => {
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

    const stateAfterDoubleClick = await test.step('Сделать двойной клик по crop-области', async() => {
      return crop.doubleClickFrame()
    })

    await test.step('Проверить что crop-область сохранила пропорции 1:1', () => {
      expect(initialState.options.preserveAspectRatio).toBe(true)
      expect(initialState.effectivePreserveAspectRatio).toBe(true)
      expect(initialState.rect.width / initialState.rect.height).toBeCloseTo(1, 5)
      expect(stateAfterDoubleClick.options.preserveAspectRatio).toBe(true)
      expect(stateAfterDoubleClick.effectivePreserveAspectRatio).toBe(true)
      expect(stateAfterDoubleClick.rect.width / stateAfterDoubleClick.rect.height).toBeCloseTo(1, 5)
      expect(stateAfterDoubleClick.rect.width).toBeLessThan(image.width)
    })
  })

  test('сбрасывает crop-область к полному изображению, когда keep ratio выключен', async({
    crop,
    images
  }) => {
    const image = await test.step('Добавить горизонтальное изображение', async() => {
      return images.checkCreation({
        imageObject: await images.addFilledImage({
          width: 1000,
          height: 667
        })
      })
    })

    const initialState = await test.step('Войти в image crop с пропорциями 1:1 без keep ratio', async() => {
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

    const stateAfterDoubleClick = await test.step('Сделать двойной клик по crop-области', async() => {
      return crop.doubleClickFrame()
    })

    await test.step('Проверить что crop-область заняла всю площадь изображения', () => {
      expect(initialState.options.preserveAspectRatio).toBe(false)
      expect(initialState.rect.width / initialState.rect.height).toBeCloseTo(1, 5)
      expect(stateAfterDoubleClick.options.preserveAspectRatio).toBe(false)
      expect(stateAfterDoubleClick.rect.width).toBeCloseTo(image.width, 5)
      expect(stateAfterDoubleClick.rect.height).toBeCloseTo(image.height, 5)
      expect(stateAfterDoubleClick.rect.width / stateAfterDoubleClick.rect.height)
        .toBeCloseTo(image.width / image.height, 5)
    })
  })
})
