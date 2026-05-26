import { test, expect } from '../../fixtures/editor.fixture'

/** Размер монтажной области, который используется в демо по умолчанию. */
const DEFAULT_MONTAGE_SIZE = 512

/** Стартовый размер crop-области для сценария растягивания до монтажной области. */
const SMALLER_CROP_SIZE = 400

/** Drag-target для сценария растягивания crop-области. */
const LARGER_CROP_DRAG_TARGET_SIZE = 513

/** Drag-target для сценария уменьшения crop-области. */
const SHRUNK_CROP_DRAG_TARGET_SIZE = 372

/** Итоговый размер crop-области из пользовательского сценария с off-by-one ошибкой. */
const SHRUNK_CROP_SIZE = 371

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
      expect(montageAfter.width).toBe(SHRUNK_CROP_SIZE)
      expect(montageAfter.height).toBe(SHRUNK_CROP_SIZE)
      expect(indicator.width).toBe(montageAfter.width)
      expect(indicator.height).toBe(montageAfter.height)
    })
  })
})
