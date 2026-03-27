import { test, expect } from '../../fixtures/editor.fixture'
import {
  TEXT_DIAGONAL_SCALING_FACTORS,
  TEXT_RESIZING_TOLERANCE,
  TEXT_SCALING_REGRESSION_WIDTH,
  TEXT_VERTICAL_SCALING_FACTOR
} from '../../fixtures/data/text-resizing.data'

test.describe('Скейлинг обычного текста после ручного сужения', () => {
  test.beforeEach(async({ text }) => {
    await text.addRegressionText()
  })

  test('после ручного сужения скейлинг по диагонали использует новую ширину как базовую', async({
    text
  }) => {
    const initialSnapshot = await test.step('Получить исходное состояние текстового объекта', async() => {
      return text.getResizeSnapshot({ objectIndex: 0 })
    })

    const targetWidth = Math.min(
      TEXT_SCALING_REGRESSION_WIDTH,
      Math.max(80, initialSnapshot.width - 80)
    )

    await test.step('Сузить текстовый объект вручную и зафиксировать новую ширину', async() => {
      await text.resizeFromRightToWidth({
        objectIndex: 0,
        width: targetWidth
      })
      await text.finishResize({ objectIndex: 0 })
    })

    const narrowedSnapshot = await test.step('Получить состояние после ручного сужения', async() => {
      return text.getResizeSnapshot({ objectIndex: 0 })
    })

    await test.step('Масштабировать текстовый объект по диагонали', async() => {
      await text.scaleDiagonallyFromBottomRight({
        objectIndex: 0,
        scaleX: TEXT_DIAGONAL_SCALING_FACTORS.scaleX,
        scaleY: TEXT_DIAGONAL_SCALING_FACTORS.scaleY
      })
    })

    const scaledSnapshot = await test.step('Завершить скейлинг и получить финальное состояние', async() => {
      await text.finishScale({ objectIndex: 0 })
      return text.getResizeSnapshot({ objectIndex: 0 })
    })

    const expectedWidthFromNewBase = narrowedSnapshot.width * TEXT_DIAGONAL_SCALING_FACTORS.scaleX
    const expectedWidthFromOriginalBase = initialSnapshot.width * TEXT_DIAGONAL_SCALING_FACTORS.scaleX

    await test.step('Проверить что новой базой стала вручную заданная ширина, а не исходная', () => {
      expect(Math.abs(scaledSnapshot.width - expectedWidthFromNewBase))
        .toBeLessThanOrEqual(TEXT_RESIZING_TOLERANCE.mouseupJump)
      expect(Math.abs(scaledSnapshot.width - expectedWidthFromOriginalBase)).toBeGreaterThan(20)
      expect(scaledSnapshot.width).toBeGreaterThan(narrowedSnapshot.width + 1)
      expect(scaledSnapshot.scaleX).toBe(1)
      expect(scaledSnapshot.scaleY).toBe(1)
    })
  })
})
