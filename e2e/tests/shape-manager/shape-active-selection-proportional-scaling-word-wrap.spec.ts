import { test, expect } from '../../fixtures/editor.fixture'
import { normalizeRenderedText } from '../../helpers/shape-proportional-word-wrap.helper'
import {
  SHAPE_ACTIVE_SELECTION_WORD_WRAP_LEFT_OPTIONS as ACTIVE_SELECTION_WORD_WRAP_LEFT_OPTIONS,
  SHAPE_ACTIVE_SELECTION_WORD_WRAP_RIGHT_OPTIONS as ACTIVE_SELECTION_WORD_WRAP_RIGHT_OPTIONS,
  SHAPE_MULTI_SCALING_TOLERANCE
} from '../../fixtures/data/shape-multi-scaling.data'
import {
  SHAPE_PROPORTIONAL_MINIMUM_TARGET_SIZE,
  SHAPE_PROPORTIONAL_SCALING_CORNERS
} from '../../fixtures/data/shape-scaling.data'

test.describe('Пропорциональное сужение нескольких шейпов по диагонали до упора в текст', () => {
  test.beforeEach(async({ editorModel, shapes }) => {
    const leftShape = await shapes.addAtBounds({
      presetKey: 'square',
      options: ACTIVE_SELECTION_WORD_WRAP_LEFT_OPTIONS
    })
    const rightShape = await shapes.addAtBounds({
      presetKey: 'square',
      options: ACTIVE_SELECTION_WORD_WRAP_RIGHT_OPTIONS
    })

    shapes.checkCreation({
      shape: leftShape,
      presetKey: 'square'
    })
    shapes.checkCreation({
      shape: rightShape,
      presetKey: 'square'
    })

    await editorModel.selectAllObjects()
  })

  for (const cornerScenario of SHAPE_PROPORTIONAL_SCALING_CORNERS) {
    test(`при сужении ${cornerScenario.title} не переносит часть слова ни в одном шейпе`, async({
      selection,
      shapes
    }) => {
      const initialSelectionSnapshot = await test.step('Получить исходное состояние общего выделения', () => {
        return selection.getSnapshot()
      })
      const initialLeftText = await test.step('Получить исходное состояние текста в левом шейпе', () => {
        return shapes.getTextNode({ id: ACTIVE_SELECTION_WORD_WRAP_LEFT_OPTIONS.id })
      })
      const initialRightText = await test.step('Получить исходное состояние текста в правом шейпе', () => {
        return shapes.getTextNode({ id: ACTIVE_SELECTION_WORD_WRAP_RIGHT_OPTIONS.id })
      })

      const liveSelectionSnapshot = await test.step(`Сузить общее выделение ${cornerScenario.title} до minimum во время drag`, async() => {
        return selection.shrinkDiagonallyToMinimum({
          corner: cornerScenario.corner,
          minimumSize: SHAPE_PROPORTIONAL_MINIMUM_TARGET_SIZE
        })
      })
      const liveLeftText = await test.step('Получить текст в левом шейпе во время drag', () => {
        return shapes.getTextNode({ id: ACTIVE_SELECTION_WORD_WRAP_LEFT_OPTIONS.id })
      })
      const liveRightText = await test.step('Получить текст в правом шейпе во время drag', () => {
        return shapes.getTextNode({ id: ACTIVE_SELECTION_WORD_WRAP_RIGHT_OPTIONS.id })
      })

      expect(initialLeftText, 'исходный текст в левом шейпе должен существовать').not.toBeNull()
      expect(initialRightText, 'исходный текст в правом шейпе должен существовать').not.toBeNull()
      expect(liveLeftText, 'текст в левом шейпе во время drag должен существовать').not.toBeNull()
      expect(liveRightText, 'текст в правом шейпе во время drag должен существовать').not.toBeNull()

      if (!initialLeftText || !initialRightText || !liveLeftText || !liveRightText) {
        throw new Error('текст в обоих шейпах должен существовать до и во время drag')
      }

      await test.step('Проверить что во время drag оба текста сохраняют слова целиком', () => {
        expect(liveSelectionSnapshot.boundsWidth)
          .toBeLessThan(initialSelectionSnapshot.boundsWidth - SHAPE_MULTI_SCALING_TOLERANCE.mouseupJump)
        expect(liveSelectionSnapshot.boundsHeight)
          .toBeLessThan(initialSelectionSnapshot.boundsHeight - SHAPE_MULTI_SCALING_TOLERANCE.mouseupJump)

        expect(liveLeftText.lineCount).toBeGreaterThan(initialLeftText.lineCount)
        expect(liveRightText.lineCount).toBeGreaterThan(initialRightText.lineCount)
        expect(liveLeftText.splitByGrapheme).toBe(false)
        expect(liveRightText.splitByGrapheme).toBe(false)
        expect(liveLeftText.fontSize).toBe(initialLeftText.fontSize)
        expect(liveRightText.fontSize).toBe(initialRightText.fontSize)
        expect(normalizeRenderedText({ lines: liveLeftText.lines })).toBe(ACTIVE_SELECTION_WORD_WRAP_LEFT_OPTIONS.text)
        expect(normalizeRenderedText({ lines: liveRightText.lines })).toBe(ACTIVE_SELECTION_WORD_WRAP_RIGHT_OPTIONS.text)
      })

      await test.step('Отпустить мышь и получить итоговое состояние общего выделения', () => {
        return selection.finishScale()
      })
      const finalLeftShape = await test.step('Получить итоговое состояние левого шейпа', () => {
        return shapes.getScaleSnapshot({ id: ACTIVE_SELECTION_WORD_WRAP_LEFT_OPTIONS.id })
      })
      const finalRightShape = await test.step('Получить итоговое состояние правого шейпа', () => {
        return shapes.getScaleSnapshot({ id: ACTIVE_SELECTION_WORD_WRAP_RIGHT_OPTIONS.id })
      })
      const finalLeftText = await test.step('Получить итоговый текст в левом шейпе', () => {
        return shapes.getTextNode({ id: ACTIVE_SELECTION_WORD_WRAP_LEFT_OPTIONS.id })
      })
      const finalRightText = await test.step('Получить итоговый текст в правом шейпе', () => {
        return shapes.getTextNode({ id: ACTIVE_SELECTION_WORD_WRAP_RIGHT_OPTIONS.id })
      })

      expect(finalLeftText, 'итоговый текст в левом шейпе должен существовать').not.toBeNull()
      expect(finalRightText, 'итоговый текст в правом шейпе должен существовать').not.toBeNull()

      if (!finalLeftText || !finalRightText) {
        throw new Error('итоговый текст в обоих шейпах должен существовать')
      }

      await test.step('Проверить что после mouseup тексты остались теми же и без переноса по буквам', () => {
        expect(finalLeftText.lineCount).toBe(liveLeftText.lineCount)
        expect(finalRightText.lineCount).toBe(liveRightText.lineCount)
        expect(finalLeftText.splitByGrapheme).toBe(false)
        expect(finalRightText.splitByGrapheme).toBe(false)
        expect(finalLeftText.fontSize).toBe(liveLeftText.fontSize)
        expect(finalRightText.fontSize).toBe(liveRightText.fontSize)
        expect(normalizeRenderedText({ lines: finalLeftText.lines })).toBe(ACTIVE_SELECTION_WORD_WRAP_LEFT_OPTIONS.text)
        expect(normalizeRenderedText({ lines: finalRightText.lines })).toBe(ACTIVE_SELECTION_WORD_WRAP_RIGHT_OPTIONS.text)

        shapes.checkNodeInsideGroup({
          snapshot: finalLeftShape,
          kind: 'text'
        })
        shapes.checkNodeInsideGroup({
          snapshot: finalRightShape,
          kind: 'text'
        })
      })
    })
  }
})
