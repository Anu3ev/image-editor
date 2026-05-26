import { test, expect } from '../../fixtures/editor.fixture'

/** Размер монтажной области, который используется в демо по умолчанию. */
const DEFAULT_MONTAGE_SIZE = 512

/** Стартовый размер crop-области для сценария растягивания до монтажной области. */
const SMALLER_CROP_SIZE = 400

/** Drag-target для сценария растягивания crop-области. */
const LARGER_CROP_DRAG_TARGET_SIZE = 513

/** Drag-target для сценария уменьшения crop-области. */
const SHRUNK_CROP_DRAG_TARGET_SIZE = 372

/** Размеры монтажной области, на которых полный crop не должен терять пиксель. */
const FULL_CROP_MONTAGE_SIZES = [
  {
    width: 1027,
    height: 1027
  },
  {
    width: 767,
    height: 768
  },
  {
    width: 1024,
    height: 1025
  },
  {
    width: 2048,
    height: 2049
  }
] as const

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
      return crop.dragFrameFromControl({
        control: 'br',
        widthRatio: LARGER_CROP_DRAG_TARGET_SIZE / SMALLER_CROP_SIZE,
        heightRatio: LARGER_CROP_DRAG_TARGET_SIZE / SMALLER_CROP_SIZE
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
      return crop.dragFrameFromControl({
        control: 'br',
        widthRatio: SHRUNK_CROP_DRAG_TARGET_SIZE / DEFAULT_MONTAGE_SIZE,
        heightRatio: SHRUNK_CROP_DRAG_TARGET_SIZE / DEFAULT_MONTAGE_SIZE
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
      expect(montageAfter.width).toBe(SHRUNK_CROP_DRAG_TARGET_SIZE)
      expect(montageAfter.height).toBe(SHRUNK_CROP_DRAG_TARGET_SIZE)
      expect(indicator.width).toBe(montageAfter.width)
      expect(indicator.height).toBe(montageAfter.height)
    })
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
        return crop.dragFrameFromControl({
          control: 'br',
          widthRatio: 1,
          heightRatio: 1
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
