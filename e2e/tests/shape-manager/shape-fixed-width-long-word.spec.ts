import { test, expect } from '../../fixtures/editor.fixture'
import {
  SHAPE_FIXED_WIDTH_LONG_WORD_CORNERS,
  SHAPE_FIXED_WIDTH_TOLERANCE,
  SHAPE_INITIAL_DIAGONAL_SCALE_TEXT
} from '../../fixtures/data/shape-fixed-width-long-word.data'
import {
  addShapeWithExplicitSizeForLongWord,
  addShapeWithInitialTextForLongWord,
  expectExistingShapeText,
  expectLongWordWrappedInsideShape,
  getShapeLongWordState,
  getWrappedLongWordState,
  growWrappedLongWordShapeProportionallyByCorner,
  narrowWrappedLongWordShapeByCorner,
  replaceShapeTextWithLongWord,
  shrinkShapeToMinimumByCorner
} from '../../helpers/shape-fixed-width-long-word.helper'

test.describe('Перенос длинного слова после скейлинга шейпа по диагонали', () => {
  for (const cornerScenario of SHAPE_FIXED_WIDTH_LONG_WORD_CORNERS) {
    test(`после скейлинга ${cornerScenario.title} шейп растёт вниз под длинное слово без расширения по ширине`, async({
      shapes
    }) => {
      const shape = await test.step('Добавить шейп без явно заданных размеров', () => {
        return addShapeWithInitialTextForLongWord({
          shapes,
          id: `shape-diagonal-scale-long-word-${cornerScenario.corner}`
        })
      })

      await test.step('Изменить ширину и высоту скейлингом по диагонали', async() => {
        await shrinkShapeToMinimumByCorner({
          shapes,
          id: shape.id,
          corner: cornerScenario.corner
        })
      })

      const scaledState = await test.step('Получить состояние шейпа после скейлинга', () => {
        return getShapeLongWordState({
          shapes,
          id: shape.id
        })
      })

      await test.step('Заменить текст длинным словом без пробелов', async() => {
        await replaceShapeTextWithLongWord({
          shapes,
          id: shape.id
        })
      })

      const updatedState = await test.step('Получить состояние шейпа после ввода', () => {
        return getShapeLongWordState({
          shapes,
          id: shape.id
        })
      })

      await test.step('Проверить что длинное слово перенеслось вниз и осталось внутри шейпа', () => {
        const scaledText = expectExistingShapeText({
          text: scaledState.text,
          expectedText: SHAPE_INITIAL_DIAGONAL_SCALE_TEXT
        })

        expect(scaledText.lineCount).toBe(1)
        expectLongWordWrappedInsideShape(updatedState)
        expect(Math.abs(updatedState.snapshot.groupBoundsWidth - scaledState.snapshot.groupBoundsWidth))
          .toBeLessThanOrEqual(SHAPE_FIXED_WIDTH_TOLERANCE)
        expect(updatedState.snapshot.groupBoundsHeight)
          .toBeGreaterThan(scaledState.snapshot.groupBoundsHeight + SHAPE_FIXED_WIDTH_TOLERANCE)
      })
    })

    test(`после сужения ${cornerScenario.title} пропорциональный скейлинг не разворачивает длинное слово в одну строку`, async({
      shapes
    }) => {
      const shape = await test.step('Добавить шейп и задать явные размеры небольшим пропорциональным скейлингом', () => {
        return addShapeWithExplicitSizeForLongWord({
          shapes,
          id: `shape-narrow-long-word-proportional-scale-${cornerScenario.corner}`,
          corner: cornerScenario.corner
        })
      })

      await test.step('Ввести длинное слово без пробелов', async() => {
        await replaceShapeTextWithLongWord({
          shapes,
          id: shape.id
        })
      })

      const wrappedState = await test.step('Проверить первичный перенос длинного слова', () => {
        return getWrappedLongWordState({
          shapes,
          id: shape.id
        })
      })

      const narrowState = await test.step('Сузить шейп непропорциональным скейлингом по диагонали', () => {
        return narrowWrappedLongWordShapeByCorner({
          shapes,
          id: shape.id,
          corner: cornerScenario.corner
        })
      })

      expect(narrowState.text.lineCount).toBeGreaterThan(wrappedState.text.lineCount)
      expect(narrowState.snapshot.groupBoundsWidth)
        .toBeLessThan(wrappedState.snapshot.groupBoundsWidth - SHAPE_FIXED_WIDTH_TOLERANCE)

      const proportionalLiveState = await test.step('Немного увеличить шейп пропорциональным скейлингом', () => {
        return growWrappedLongWordShapeProportionallyByCorner({
          shapes,
          id: shape.id,
          corner: cornerScenario.corner
        })
      })

      await test.step('Проверить что пропорциональный скейлинг сохранил переносы длинного слова', () => {
        expect(proportionalLiveState.text.lineCount).toBeGreaterThan(1)
        expect(proportionalLiveState.snapshot.groupBoundsWidth)
          .toBeGreaterThan(narrowState.snapshot.groupBoundsWidth)
        expect(proportionalLiveState.snapshot.groupBoundsWidth)
          .toBeLessThan(wrappedState.snapshot.groupBoundsWidth)
      })
    })
  }
})
