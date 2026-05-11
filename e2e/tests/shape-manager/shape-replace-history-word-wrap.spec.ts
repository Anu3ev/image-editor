import { test, expect } from '../../fixtures/editor.fixture'
import { expectWholeWordTextState } from '../../helpers/shape-proportional-word-wrap.helper'
import {
  SHAPE_PROPORTIONAL_SINGLE_WORD_WRAP_SCENARIO,
  SHAPE_PROPORTIONAL_TEXT_FONT_SIZE,
  SHAPE_SCALING_TOLERANCE
} from '../../fixtures/data/shape-scaling.data'

const SHAPE_REPLACE_HISTORY_WORD_WRAP_ID = 'shape-replace-history-word-wrap'

test.describe('History roundtrip после minimum circle и replace preset', () => {
  test('после undo возвращает minimum circle без переноса части слова на следующую строку', async({
    history,
    shapes
  }) => {
    await test.step('Добавить circle и задать текст TEST размером 48px', async() => {
      await shapes.addWithText({
        presetKey: 'circle',
        text: SHAPE_PROPORTIONAL_SINGLE_WORD_WRAP_SCENARIO.text,
        fontSize: SHAPE_PROPORTIONAL_TEXT_FONT_SIZE,
        options: {
          id: SHAPE_REPLACE_HISTORY_WORD_WRAP_ID
        }
      })
      await history.flushPendingSave()
    })

    const initialSnapshot = await shapes.getScaleSnapshot({ id: SHAPE_REPLACE_HISTORY_WORD_WRAP_ID })
    const initialText = expectWholeWordTextState({
      text: await shapes.getTextNode({ id: SHAPE_REPLACE_HISTORY_WORD_WRAP_ID }),
      expectedText: SHAPE_PROPORTIONAL_SINGLE_WORD_WRAP_SCENARIO.text,
      expectedLines: SHAPE_PROPORTIONAL_SINGLE_WORD_WRAP_SCENARIO.expectedMinimumLines,
      expectedFontSize: SHAPE_PROPORTIONAL_TEXT_FONT_SIZE
    })

    await test.step('Пропорционально сузить circle по диагонали до minimum и зафиксировать результат', async() => {
      await shapes.shrinkDiagonallyToMinimum({
        id: SHAPE_REPLACE_HISTORY_WORD_WRAP_ID,
        corner: 'br'
      })
      await shapes.finishScale({ id: SHAPE_REPLACE_HISTORY_WORD_WRAP_ID })
      await history.flushPendingSave()
    })

    const minimumSnapshot = await shapes.getScaleSnapshot({ id: SHAPE_REPLACE_HISTORY_WORD_WRAP_ID })
    const minimumText = expectWholeWordTextState({
      text: await shapes.getTextNode({ id: SHAPE_REPLACE_HISTORY_WORD_WRAP_ID }),
      expectedText: SHAPE_PROPORTIONAL_SINGLE_WORD_WRAP_SCENARIO.text,
      expectedLines: SHAPE_PROPORTIONAL_SINGLE_WORD_WRAP_SCENARIO.expectedMinimumLines,
      expectedFontSize: SHAPE_PROPORTIONAL_TEXT_FONT_SIZE
    })

    expect(minimumSnapshot.groupBoundsWidth).toBeLessThan(initialSnapshot.groupBoundsWidth)
    expect(minimumSnapshot.groupBoundsHeight).toBeLessThan(initialSnapshot.groupBoundsHeight)

    const replacedShape = await test.step('Заменить circle на square', async() => {
      return shapes.update({
        id: SHAPE_REPLACE_HISTORY_WORD_WRAP_ID,
        presetKey: 'square'
      })
    })
    const replacedSnapshot = await shapes.getScaleSnapshot({ id: SHAPE_REPLACE_HISTORY_WORD_WRAP_ID })
    const replacedText = expectWholeWordTextState({
      text: await shapes.getTextNode({ id: SHAPE_REPLACE_HISTORY_WORD_WRAP_ID }),
      expectedText: SHAPE_PROPORTIONAL_SINGLE_WORD_WRAP_SCENARIO.text,
      expectedLines: SHAPE_PROPORTIONAL_SINGLE_WORD_WRAP_SCENARIO.expectedMinimumLines,
      expectedFontSize: minimumText.fontSize
    })

    shapes.checkUpdate({
      shape: replacedShape,
      presetKey: 'square'
    })

    await test.step('Сделать undo после replace', async() => {
      await history.undo()
    })

    const restoredShape = await shapes.getObject({ id: SHAPE_REPLACE_HISTORY_WORD_WRAP_ID })
    const restoredSnapshot = await shapes.getScaleSnapshot({ id: SHAPE_REPLACE_HISTORY_WORD_WRAP_ID })
    const restoredText = expectWholeWordTextState({
      text: await shapes.getTextNode({ id: SHAPE_REPLACE_HISTORY_WORD_WRAP_ID }),
      expectedText: SHAPE_PROPORTIONAL_SINGLE_WORD_WRAP_SCENARIO.text,
      expectedLines: SHAPE_PROPORTIONAL_SINGLE_WORD_WRAP_SCENARIO.expectedMinimumLines,
      expectedFontSize: minimumText.fontSize
    })

    await test.step('Проверить что undo вернул minimum circle и сохранил слово целиком', () => {
      expect(restoredShape?.shapePresetKey).toBe('circle')
      expect(restoredText.lineCount).toBe(minimumText.lineCount)
      expect(Math.abs(restoredSnapshot.groupBoundsWidth - minimumSnapshot.groupBoundsWidth))
        .toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
      expect(Math.abs(restoredSnapshot.groupBoundsHeight - minimumSnapshot.groupBoundsHeight))
        .toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)

      shapes.checkNodeInsideGroup({
        snapshot: restoredSnapshot,
        kind: 'text'
      })
    })

    await test.step('Сделать redo после undo', async() => {
      await history.redo()
    })

    const redoneShape = await shapes.getObject({ id: SHAPE_REPLACE_HISTORY_WORD_WRAP_ID })
    const redoneSnapshot = await shapes.getScaleSnapshot({ id: SHAPE_REPLACE_HISTORY_WORD_WRAP_ID })
    const redoneText = expectWholeWordTextState({
      text: await shapes.getTextNode({ id: SHAPE_REPLACE_HISTORY_WORD_WRAP_ID }),
      expectedText: SHAPE_PROPORTIONAL_SINGLE_WORD_WRAP_SCENARIO.text,
      expectedLines: SHAPE_PROPORTIONAL_SINGLE_WORD_WRAP_SCENARIO.expectedMinimumLines,
      expectedFontSize: replacedText.fontSize
    })

    await test.step('Проверить что redo снова вернул replace preset и тот же текстовый layout', () => {
      expect(redoneShape?.shapePresetKey).toBe('square')
      expect(redoneText.lineCount).toBe(replacedText.lineCount)
      expect(Math.abs(redoneSnapshot.groupBoundsWidth - replacedSnapshot.groupBoundsWidth))
        .toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
      expect(Math.abs(redoneSnapshot.groupBoundsHeight - replacedSnapshot.groupBoundsHeight))
        .toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)

      shapes.checkNodeInsideGroup({
        snapshot: redoneSnapshot,
        kind: 'text'
      })
    })

    expect(initialText.lineCount).toBe(1)
  })
})
