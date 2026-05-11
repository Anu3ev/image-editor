import { test, expect } from '../../fixtures/editor.fixture'
import { expectWholeWordTextState } from '../../helpers/shape-proportional-word-wrap.helper'
import {
  SHAPE_PROPORTIONAL_TEXT_FONT_SIZE,
  SHAPE_PROPORTIONAL_TWO_WORD_WRAP_SCENARIO,
  SHAPE_SCALING_TOLERANCE
} from '../../fixtures/data/shape-scaling.data'

const SHAPE_PROPORTIONAL_CLIPBOARD_WORD_WRAP_ID = 'shape-proportional-clipboard-word-wrap'

test.describe('Copy/paste после пропорционального сужения шейпа до упора в текст', () => {
  test('после copy/paste сохраняет те же переносы без части слова', async({
    clipboard,
    editorModel,
    shapes
  }) => {
    await test.step('Добавить square с текстом TEST TEST размером 48px', async() => {
      await shapes.addWithText({
        presetKey: 'square',
        text: SHAPE_PROPORTIONAL_TWO_WORD_WRAP_SCENARIO.text,
        fontSize: SHAPE_PROPORTIONAL_TEXT_FONT_SIZE,
        options: {
          id: SHAPE_PROPORTIONAL_CLIPBOARD_WORD_WRAP_ID
        }
      })
    })

    await test.step('Пропорционально сузить square по диагонали до minimum и зафиксировать результат', async() => {
      await shapes.shrinkDiagonallyToMinimum({
        id: SHAPE_PROPORTIONAL_CLIPBOARD_WORD_WRAP_ID,
        corner: 'br'
      })
      await shapes.finishScale({ id: SHAPE_PROPORTIONAL_CLIPBOARD_WORD_WRAP_ID })
    })

    const sourceSnapshot = await shapes.getScaleSnapshot({ id: SHAPE_PROPORTIONAL_CLIPBOARD_WORD_WRAP_ID })
    const sourceText = expectWholeWordTextState({
      text: await shapes.getTextNode({ id: SHAPE_PROPORTIONAL_CLIPBOARD_WORD_WRAP_ID }),
      expectedText: SHAPE_PROPORTIONAL_TWO_WORD_WRAP_SCENARIO.text,
      expectedLines: SHAPE_PROPORTIONAL_TWO_WORD_WRAP_SCENARIO.expectedMinimumLines,
      expectedFontSize: SHAPE_PROPORTIONAL_TEXT_FONT_SIZE
    })

    const pastedShapeId = await test.step('Скопировать minimum shape и вставить его копию', async() => {
      await shapes.select({ id: SHAPE_PROPORTIONAL_CLIPBOARD_WORD_WRAP_ID })
      await clipboard.copy()
      await clipboard.waitForClipboardReady()

      const pasted = await clipboard.paste()

      expect(pasted).toBe(true)
      await editorModel.checkObjectCount({ count: 2 })

      const shapeObjects = await shapes.getShapeObjects()
      const pastedShape = shapeObjects.find((shape) => shape.id !== SHAPE_PROPORTIONAL_CLIPBOARD_WORD_WRAP_ID)

      expect(pastedShape?.id).toBeTruthy()

      return pastedShape?.id as string
    })

    const pastedSnapshot = await shapes.getScaleSnapshot({ id: pastedShapeId })
    const pastedText = expectWholeWordTextState({
      text: await shapes.getTextNode({ id: pastedShapeId }),
      expectedText: SHAPE_PROPORTIONAL_TWO_WORD_WRAP_SCENARIO.text,
      expectedLines: SHAPE_PROPORTIONAL_TWO_WORD_WRAP_SCENARIO.expectedMinimumLines,
      expectedFontSize: sourceText.fontSize
    })

    await test.step('Проверить что copy/paste сохранил minimum layout и текстовый контракт', () => {
      expect(Math.abs(pastedSnapshot.groupBoundsWidth - sourceSnapshot.groupBoundsWidth))
        .toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
      expect(Math.abs(pastedSnapshot.groupBoundsHeight - sourceSnapshot.groupBoundsHeight))
        .toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
      expect(pastedText.lineCount).toBe(sourceText.lineCount)

      shapes.checkNodeInsideGroup({
        snapshot: pastedSnapshot,
        kind: 'shape'
      })
      shapes.checkNodeInsideGroup({
        snapshot: pastedSnapshot,
        kind: 'text'
      })
    })
  })
})
