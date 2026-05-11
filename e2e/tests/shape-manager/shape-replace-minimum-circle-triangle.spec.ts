import { test, expect } from '../../fixtures/editor.fixture'
import { expectWholeWordTextState } from '../../helpers/shape-proportional-word-wrap.helper'
import {
  SHAPE_PROPORTIONAL_SINGLE_WORD_WRAP_SCENARIO,
  SHAPE_PROPORTIONAL_TEXT_FONT_SIZE
} from '../../fixtures/data/shape-scaling.data'
import {
  SHAPE_REPLACE_TOLERANCE
} from '../../fixtures/data/shape-replace.data'

const SHAPE_REPLACE_MINIMUM_CIRCLE_TRIANGLE_ID = 'shape-replace-minimum-circle-triangle'

test.describe('Замена minimum circle на triangle', () => {
  test('после замены triangle пропорционально вырастает так, чтобы текст оставался внутри фигуры', async({
    shapes
  }) => {
    await test.step('Добавить circle с текстом TEST размером 48px', async() => {
      await shapes.addWithText({
        presetKey: 'circle',
        text: SHAPE_PROPORTIONAL_SINGLE_WORD_WRAP_SCENARIO.text,
        fontSize: SHAPE_PROPORTIONAL_TEXT_FONT_SIZE,
        options: {
          id: SHAPE_REPLACE_MINIMUM_CIRCLE_TRIANGLE_ID
        }
      })
    })

    const initialSnapshot = await test.step('Получить исходную геометрию circle', () => {
      return shapes.getScaleSnapshot({ id: SHAPE_REPLACE_MINIMUM_CIRCLE_TRIANGLE_ID })
    })
    const initialText = expectWholeWordTextState({
      text: await shapes.getTextNode({ id: SHAPE_REPLACE_MINIMUM_CIRCLE_TRIANGLE_ID }),
      expectedText: SHAPE_PROPORTIONAL_SINGLE_WORD_WRAP_SCENARIO.text,
      expectedLines: SHAPE_PROPORTIONAL_SINGLE_WORD_WRAP_SCENARIO.expectedMinimumLines,
      expectedFontSize: SHAPE_PROPORTIONAL_TEXT_FONT_SIZE
    })

    await test.step('Пропорционально уменьшить circle до minimum', async() => {
      await shapes.shrinkDiagonallyToMinimum({
        id: SHAPE_REPLACE_MINIMUM_CIRCLE_TRIANGLE_ID,
        corner: 'br'
      })
      await shapes.finishScale({ id: SHAPE_REPLACE_MINIMUM_CIRCLE_TRIANGLE_ID })
    })

    const minimumSnapshot = await test.step('Получить геометрию minimum circle', () => {
      return shapes.getScaleSnapshot({ id: SHAPE_REPLACE_MINIMUM_CIRCLE_TRIANGLE_ID })
    })
    const minimumText = expectWholeWordTextState({
      text: await shapes.getTextNode({ id: SHAPE_REPLACE_MINIMUM_CIRCLE_TRIANGLE_ID }),
      expectedText: SHAPE_PROPORTIONAL_SINGLE_WORD_WRAP_SCENARIO.text,
      expectedLines: SHAPE_PROPORTIONAL_SINGLE_WORD_WRAP_SCENARIO.expectedMinimumLines,
      expectedFontSize: initialText.fontSize
    })

    expect(minimumSnapshot.groupBoundsWidth).toBeLessThan(initialSnapshot.groupBoundsWidth)
    expect(minimumSnapshot.groupBoundsHeight).toBeLessThan(initialSnapshot.groupBoundsHeight)

    const updatedShape = await test.step('Заменить minimum circle на triangle', async() => {
      return shapes.update({
        id: SHAPE_REPLACE_MINIMUM_CIRCLE_TRIANGLE_ID,
        presetKey: 'triangle'
      })
    })
    const updatedSnapshot = await test.step('Получить геометрию после замены на triangle', () => {
      return shapes.getScaleSnapshot({ id: SHAPE_REPLACE_MINIMUM_CIRCLE_TRIANGLE_ID })
    })
    const updatedText = expectWholeWordTextState({
      text: await shapes.getTextNode({ id: SHAPE_REPLACE_MINIMUM_CIRCLE_TRIANGLE_ID }),
      expectedText: SHAPE_PROPORTIONAL_SINGLE_WORD_WRAP_SCENARIO.text,
      expectedLines: SHAPE_PROPORTIONAL_SINGLE_WORD_WRAP_SCENARIO.expectedMinimumLines,
      expectedFontSize: minimumText.fontSize
    })

    await test.step('Проверить что triangle вырос под текст и текст остался внутри фигуры', () => {
      shapes.checkUpdate({
        shape: updatedShape,
        presetKey: 'triangle'
      })

      expect(updatedSnapshot.groupBoundsWidth)
        .toBeGreaterThan(minimumSnapshot.groupBoundsWidth + SHAPE_REPLACE_TOLERANCE)
      expect(updatedSnapshot.groupBoundsHeight)
        .toBeGreaterThan(minimumSnapshot.groupBoundsHeight + SHAPE_REPLACE_TOLERANCE)
      expect(updatedText.lineCount).toBe(minimumText.lineCount)

      shapes.checkNodeInsideGroup({
        snapshot: updatedSnapshot,
        kind: 'shape'
      })
      shapes.checkNodeInsideGroup({
        snapshot: updatedSnapshot,
        kind: 'text'
      })
    })
  })
})
