import { test, expect } from '../../fixtures/editor.fixture'
import {
  CROP_CORNER_CASES,
  CROP_MAX_SIZE,
  CROP_MIN_SIZE,
  CROP_RESIZE_CASES,
  CROP_SIDE_CASES
} from '../../fixtures/data/crop.data'

test.describe('Crop mode', () => {
  test('resize из правого нижнего угла сохраняет пропорции без Shift', async({ crop }) => {
    const initialState = await test.step('Войти в crop монтажной области', async() => {
      return crop.startCanvasCrop()
    })

    const resizedState = await test.step('Потянуть область из правого нижнего угла без Shift', async() => {
      return crop.resizeFrameFromControl({
        control: 'br',
        widthRatio: 1.45,
        heightRatio: 1.15
      })
    })

    await test.step('Проверить что область выросла пропорционально', async() => {
      const initialRatio = initialState.rect.width / initialState.rect.height
      const resizedRatio = resizedState.rect.width / resizedState.rect.height

      expect(resizedState.rect.width).toBeGreaterThan(initialState.rect.width)
      expect(resizedState.rect.height).toBeGreaterThan(initialState.rect.height)
      expect(resizedRatio).toBeCloseTo(initialRatio, 1)
    })
  })

  test('resize из левого верхнего угла с Shift меняет стороны независимо', async({ crop }) => {
    const initialState = await test.step('Войти в crop монтажной области', async() => {
      return crop.startCanvasCrop()
    })

    const resizedState = await test.step('Потянуть область из левого верхнего угла с Shift', async() => {
      return crop.resizeFrameFromControl({
        control: 'tl',
        widthRatio: 1.45,
        heightRatio: 1.1,
        shiftKey: true
      })
    })

    await test.step('Проверить что пропорция изменилась', async() => {
      const initialRatio = initialState.rect.width / initialState.rect.height
      const resizedRatio = resizedState.rect.width / resizedState.rect.height

      expect(resizedState.rect.width).toBeGreaterThan(initialState.rect.width)
      expect(resizedState.rect.height).toBeGreaterThan(initialState.rect.height)
      expect(Math.abs(resizedRatio - initialRatio)).toBeGreaterThan(0.1)
    })
  })

  test('resize из правого нижнего угла не выпускает crop-область за максимальный размер', async({
    editorModel,
    crop
  }) => {
    const resizedState = await test.step('Войти в crop и резко увеличить область', async() => {
      await crop.startCanvasCrop()

      return crop.resizeFrameFromControl({
        control: 'br',
        widthRatio: 20,
        heightRatio: 20
      })
    })

    await test.step('Проверить что live-размер ограничен максимумом', async() => {
      expect(resizedState.rect.width).toBe(CROP_MAX_SIZE.width)
      expect(resizedState.rect.height).toBe(CROP_MAX_SIZE.height)
    })

    await test.step('Применить crop и проверить что размер не меняется повторно', async() => {
      await crop.apply()

      const montageAfter = await editorModel.getMontageArea()

      expect(montageAfter.width).toBe(CROP_MAX_SIZE.width)
      expect(montageAfter.height).toBe(CROP_MAX_SIZE.height)
    })
  })

  CROP_CORNER_CASES.forEach(({ control, title }) => {
    test(`resize из ${title} не уменьшает crop-область меньше 16 px`, async({ crop }) => {
      const resizedState = await test.step('Войти в crop и резко уменьшить область', async() => {
        await crop.startCanvasCrop()

        return crop.resizeFrameFromControl({
          control,
          widthRatio: 0.001,
          heightRatio: 0.001
        })
      })

      await test.step('Проверить что live-размер остановился на минимуме', async() => {
        expect(resizedState.rect.width).toBe(CROP_MIN_SIZE.width)
        expect(resizedState.rect.height).toBe(CROP_MIN_SIZE.height)
      })
    })
  })

  CROP_SIDE_CASES.forEach(({ control, title, direction }) => {
    test(`resize ${title} не выпускает crop-область за лимиты`, async({ crop }) => {
      const enlargedState = await test.step('Войти в crop и резко увеличить область', async() => {
        await crop.startCanvasCrop()

        return crop.resizeFrameFromControl({
          control,
          widthRatio: direction === 'horizontal' ? 20 : 1,
          heightRatio: direction === 'vertical' ? 20 : 1
        })
      })

      await test.step('Проверить что live-размер ограничен максимумом по активной оси', async() => {
        if (direction === 'horizontal') {
          expect(enlargedState.rect.width).toBe(CROP_MAX_SIZE.width)
          expect(enlargedState.rect.height).toBeLessThan(CROP_MAX_SIZE.height)
          return
        }

        expect(enlargedState.rect.height).toBe(CROP_MAX_SIZE.height)
        expect(enlargedState.rect.width).toBeLessThan(CROP_MAX_SIZE.width)
      })

      const shrunkState = await test.step('Снова войти в crop и резко уменьшить область', async() => {
        await crop.cancel()
        await crop.startCanvasCrop()

        return crop.resizeFrameFromControl({
          control,
          widthRatio: direction === 'horizontal' ? 0.001 : 1,
          heightRatio: direction === 'vertical' ? 0.001 : 1
        })
      })

      await test.step('Проверить что live-размер остановился на минимуме по активной оси', async() => {
        if (direction === 'horizontal') {
          expect(shrunkState.rect.width).toBe(CROP_MIN_SIZE.width)
          expect(shrunkState.rect.height).toBeGreaterThan(CROP_MIN_SIZE.height)
          return
        }

        expect(shrunkState.rect.height).toBe(CROP_MIN_SIZE.height)
        expect(shrunkState.rect.width).toBeGreaterThan(CROP_MIN_SIZE.width)
      })
    })
  })

  CROP_RESIZE_CASES.forEach(({ control, title, direction }) => {
    test(`быстрый resize из ${title} через противоположную сторону останавливается на 16 px`, async({ crop }) => {
      const resizedState = await test.step('Войти в crop и резко провести pointer за противоположную сторону', async() => {
        await crop.startCanvasCrop()

        return crop.resizeFrameFromControl({
          control,
          widthRatio: -0.25,
          heightRatio: -0.25
        })
      })

      await test.step('Проверить что crop-область зафиксировалась на минимальном размере', async() => {
        if (direction === 'horizontal') {
          expect(resizedState.rect.width).toBe(CROP_MIN_SIZE.width)
          expect(resizedState.rect.height).toBeGreaterThan(CROP_MIN_SIZE.height)
          return
        }

        if (direction === 'vertical') {
          expect(resizedState.rect.height).toBe(CROP_MIN_SIZE.height)
          expect(resizedState.rect.width).toBeGreaterThan(CROP_MIN_SIZE.width)
          return
        }

        expect(resizedState.rect.width).toBe(CROP_MIN_SIZE.width)
        expect(resizedState.rect.height).toBe(CROP_MIN_SIZE.height)
      })
    })
  })

  test('resize с Shift останавливает только сторону, которая дошла до 16 px', async({ crop }) => {
    const initialState = await test.step('Войти в crop монтажной области', async() => {
      return crop.startCanvasCrop()
    })

    const resizedState = await test.step('Сильно сузить область по X и умеренно уменьшить по Y', async() => {
      return crop.resizeFrameFromControl({
        control: 'br',
        widthRatio: 0.001,
        heightRatio: 0.25,
        shiftKey: true
      })
    })

    await test.step('Проверить что X остановился на минимуме, а Y продолжил свободный resize', async() => {
      expect(resizedState.rect.width).toBe(CROP_MIN_SIZE.width)
      expect(resizedState.rect.height).toBeGreaterThan(CROP_MIN_SIZE.height)
      expect(resizedState.rect.height).toBeLessThan(initialState.rect.height)
    })
  })

  test('по умолчанию позволяет применить область больше монтажной области', async({
    editorModel,
    crop
  }) => {
    const montageBefore = await editorModel.getMontageArea()
    const requestedSize = {
      width: montageBefore.width + 160,
      height: montageBefore.height + 120
    }

    const cropState = await test.step('Войти в crop с размером больше монтажной области', async() => {
      return crop.startCanvasCrop({
        size: requestedSize
      })
    })

    await test.step('Проверить что crop-область вышла за границы монтажной области', async() => {
      expect(cropState.options.allowFrameOverflow).toBe(true)
      expect(cropState.rect.left).toBeLessThan(0)
      expect(cropState.rect.top).toBeLessThan(0)
      expect(cropState.rect.width).toBe(requestedSize.width)
      expect(cropState.rect.height).toBe(requestedSize.height)
    })

    await test.step('Применить crop и проверить новый размер монтажной области', async() => {
      await crop.apply()

      const montageAfter = await editorModel.getMontageArea()

      expect(montageAfter.width).toBe(requestedSize.width)
      expect(montageAfter.height).toBe(requestedSize.height)
      expect(await crop.isActive()).toBe(false)
    })
  })

  test('не выпускает crop-область за монтажную область, когда overflow выключен', async({
    editorModel,
    crop
  }) => {
    const montage = await editorModel.getMontageArea()

    const cropState = await test.step('Войти в crop с размером больше монтажной области и выключенным overflow', async() => {
      return crop.startCanvasCrop({
        size: {
          width: montage.width + 160,
          height: montage.height + 120
        },
        allowFrameOverflow: false
      })
    })

    await test.step('Проверить что размер ограничен монтажной областью', async() => {
      expect(cropState.options.allowFrameOverflow).toBe(false)
      expect(cropState.rect.left).toBeGreaterThanOrEqual(0)
      expect(cropState.rect.top).toBeGreaterThanOrEqual(0)
      expect(cropState.rect.width).toBeLessThanOrEqual(montage.width)
      expect(cropState.rect.height).toBeLessThanOrEqual(montage.height)
    })
  })

  test('кроп изображения больше его размера добавляет прозрачные поля без cropX/cropY', async({
    crop,
    images
  }) => {
    const image = await test.step('Добавить изображение', async() => {
      return images.checkCreation({
        imageObject: await images.addFilledImage({
          width: 100,
          height: 80
        })
      })
    })

    const cropState = await test.step('Войти в crop изображения с областью больше объекта', async() => {
      return crop.startImageCrop({
        id: image.id,
        size: {
          width: 140,
          height: 120
        }
      })
    })

    await test.step('Проверить что область crop выходит за изображение', async() => {
      expect(cropState.rect.left).toBeLessThan(0)
      expect(cropState.rect.top).toBeLessThan(0)
      expect(cropState.rect.width).toBe(140)
      expect(cropState.rect.height).toBe(120)
    })

    await test.step('Применить crop и проверить новый source изображения', async() => {
      await crop.apply()

      const imageInfo = await crop.getImageSourceInfo({ id: image.id })

      expect(imageInfo.width).toBe(140)
      expect(imageInfo.height).toBe(120)
      expect(imageInfo.cropX).toBe(0)
      expect(imageInfo.cropY).toBe(0)
      expect(imageInfo.sourceWidth).toBe(140)
      expect(imageInfo.sourceHeight).toBe(120)
    })
  })

  test('не показывает тулбар объекта во время crop изображения и возвращает его после отмены', async({
    crop,
    images,
    toolbar
  }) => {
    const image = await test.step('Добавить и выделить изображение', async() => {
      return images.checkCreation({
        imageObject: await images.addFilledImage({
          width: 120,
          height: 90
        })
      })
    })

    await test.step('Проверить что обычный тулбар изображения видим до crop', async() => {
      await toolbar.waitUntilVisible()
      expect(await toolbar.isVisible()).toBe(true)
    })

    await test.step('Войти в crop и проверить что тулбар скрыт', async() => {
      await crop.startImageCrop({ id: image.id })

      expect(await toolbar.isVisible()).toBe(false)
    })

    await test.step('Отменить crop и проверить что тулбар изображения вернулся', async() => {
      await crop.cancel()
      await toolbar.waitUntilVisible()

      expect(await toolbar.isVisible()).toBe(true)
    })
  })

  test('клик вне crop-области закрывает crop изображения и возвращает выделение на исходное изображение', async({
    editorModel,
    crop,
    images,
    shapes
  }) => {
    const image = await test.step('Добавить изображение для crop', async() => {
      return images.checkCreation({
        imageObject: await images.addFilledImage({
          width: 120,
          height: 90
        })
      })
    })

    const shape = await test.step('Добавить другой объект для клика вне crop-области', async() => {
      return shapes.addAtBounds({
        presetKey: 'square',
        options: {
          id: 'crop-click-outside-shape',
          left: 40,
          top: 40,
          width: 64,
          height: 64
        }
      })
    })

    expect(shape?.id).toBe('crop-click-outside-shape')

    await test.step('Войти в crop изображения и кликнуть по другому объекту', async() => {
      await crop.startImageCrop({ id: image.id })
      await crop.clickObjectCenter({ id: 'crop-click-outside-shape' })
      await crop.waitUntilInactive()
    })

    await test.step('Проверить что выделено исходное изображение, а не объект под кликом', async() => {
      const activeObject = await editorModel.getActiveObject()

      expect(activeObject?.id).toBe(image.id)
      expect(activeObject?.id).not.toBe('crop-click-outside-shape')
    })
  })
})
