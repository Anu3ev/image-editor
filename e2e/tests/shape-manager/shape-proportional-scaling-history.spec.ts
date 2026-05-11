import { test, expect } from '../../fixtures/editor.fixture'
import {
  normalizeRenderedText,
  shouldAssertExactMinimumLines,
  shrinkShapeDiagonallyToWordWrapMinimum
} from '../../helpers/shape-proportional-word-wrap.helper'
import {
  SHAPE_PROPORTIONAL_EXPAND_BASE_SCALE,
  SHAPE_PROPORTIONAL_EXPAND_SCALE_STEP,
  SHAPE_PROPORTIONAL_MULTI_WORD_WRAP_SCENARIOS,
  SHAPE_PROPORTIONAL_SCALING_CORNERS,
  SHAPE_PROPORTIONAL_SCALING_CYCLES,
  SHAPE_PROPORTIONAL_TEXT_FONT_SIZE,
  SHAPE_SCALING_TOLERANCE
} from '../../fixtures/data/shape-scaling.data'

test.describe('История пропорционального сужения шейпа по диагонали', () => {
  for (const textScenario of SHAPE_PROPORTIONAL_MULTI_WORD_WRAP_SCENARIOS) {
    test.describe(`когда текст "${textScenario.text}"`, () => {
      for (const cornerScenario of SHAPE_PROPORTIONAL_SCALING_CORNERS) {
        test(`после undo и redo сужения ${cornerScenario.title} сохраняет те же переносы без части слова`, async({
          history,
          shapes
        }) => {
          await test.step('Добавить квадратный шейп и задать текст через editing path', async() => {
            await shapes.addWithText({
              presetKey: 'square',
              text: textScenario.text,
              fontSize: SHAPE_PROPORTIONAL_TEXT_FONT_SIZE
            })
            await history.flushPendingSave()
          })

          const initialSnapshot = await test.step('Получить исходное состояние шейпа и текста', async() => {
            const snapshot = await shapes.getScaleSnapshot({ objectIndex: 0 })
            const text = await shapes.getTextNode({ objectIndex: 0 })

            return {
              snapshot,
              text
            }
          })

          expect(initialSnapshot.text, 'исходный текст должен существовать').not.toBeNull()

          const initialText = initialSnapshot.text

          if (!initialText) {
            throw new Error('исходный текст должен существовать')
          }

          for (let cycleIndex = 0; cycleIndex < SHAPE_PROPORTIONAL_SCALING_CYCLES; cycleIndex += 1) {
            const expandedScale = SHAPE_PROPORTIONAL_EXPAND_BASE_SCALE
              + (cycleIndex * SHAPE_PROPORTIONAL_EXPAND_SCALE_STEP)

            await test.step(`Цикл ${cycleIndex + 1}: потянуть угол наружу и вернуть обратно до упора`, async() => {
              await shapes.scaleDiagonallyProportionally({
                objectIndex: 0,
                corner: cornerScenario.corner,
                scale: expandedScale
              })
              await shrinkShapeDiagonallyToWordWrapMinimum({
                shapes,
                objectIndex: 0,
                corner: cornerScenario.corner,
                expectedLineCount: textScenario.expectedMinimumLines.length
              })
            })
          }

          await test.step('Отпустить мышь после последнего возврата на minimum', async() => {
            await shapes.finishScale({ objectIndex: 0 })
          })

          const finalState = await test.step('Получить итоговое состояние после сужения', async() => {
            const snapshot = await shapes.getScaleSnapshot({ objectIndex: 0 })
            const text = await shapes.getTextNode({ objectIndex: 0 })

            return {
              snapshot,
              text
            }
          })

          expect(finalState.text, 'итоговый текст после сужения должен существовать').not.toBeNull()

          const finalText = finalState.text

          if (!finalText) {
            throw new Error('итоговый текст после сужения должен существовать')
          }

          await test.step('Сделать undo и получить восстановленное состояние', async() => {
            await history.undo()
          })

          const undoneState = await test.step('Получить состояние после undo', async() => {
            const snapshot = await shapes.getScaleSnapshot({ objectIndex: 0 })
            const text = await shapes.getTextNode({ objectIndex: 0 })

            return {
              snapshot,
              text
            }
          })

          await test.step('Сделать redo и получить повторно применённое состояние', async() => {
            await history.redo()
          })

          const redoneState = await test.step('Получить состояние после redo', async() => {
            const snapshot = await shapes.getScaleSnapshot({ objectIndex: 0 })
            const text = await shapes.getTextNode({ objectIndex: 0 })

            return {
              snapshot,
              text
            }
          })

          expect(undoneState.text, 'текст после undo должен существовать').not.toBeNull()
          expect(redoneState.text, 'текст после redo должен существовать').not.toBeNull()

          const undoneText = undoneState.text
          const redoneText = redoneState.text

          if (!undoneText || !redoneText) {
            throw new Error('текст после undo и redo должен существовать')
          }

          await test.step('Проверить что undo возвращает исходный layout, а redo восстанавливает слова без переноса по буквам', () => {
            const expectedRenderedText = normalizeRenderedText({
              lines: textScenario.expectedMinimumLines
            })
            const shouldAssertExactLines = shouldAssertExactMinimumLines({
              exactMinimumCorners: textScenario.exactMinimumCorners,
              corner: cornerScenario.corner
            })

            expect(initialText.lineCount).toBe(1)
            expect(finalText.lineCount).toBeGreaterThan(initialText.lineCount)
            expect(finalText.splitByGrapheme).toBe(false)
            expect(normalizeRenderedText({ lines: finalText.lines })).toBe(expectedRenderedText)

            if (shouldAssertExactLines) {
              expect(finalText.lines).toEqual(textScenario.expectedMinimumLines)
              expect(finalText.lineCount).toBe(textScenario.expectedMinimumLines.length)
            } else {
              expect(finalText.lineCount).toBeLessThanOrEqual(textScenario.expectedMinimumLines.length)
            }

            expect(Math.abs(undoneState.snapshot.groupBoundsWidth - initialSnapshot.snapshot.groupBoundsWidth))
              .toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
            expect(Math.abs(undoneState.snapshot.groupBoundsHeight - initialSnapshot.snapshot.groupBoundsHeight))
              .toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
            expect(undoneText.lineCount).toBe(initialText.lineCount)
            expect(undoneText.fontSize).toBe(initialText.fontSize)
            expect(undoneText.splitByGrapheme).toBe(false)
            expect(normalizeRenderedText({ lines: undoneText.lines })).toBe(expectedRenderedText)

            expect(Math.abs(redoneState.snapshot.groupBoundsWidth - finalState.snapshot.groupBoundsWidth))
              .toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
            expect(Math.abs(redoneState.snapshot.groupBoundsHeight - finalState.snapshot.groupBoundsHeight))
              .toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
            expect(redoneText.lineCount).toBe(finalText.lineCount)
            expect(redoneText.fontSize).toBe(finalText.fontSize)
            expect(redoneText.splitByGrapheme).toBe(false)
            expect(normalizeRenderedText({ lines: redoneText.lines })).toBe(expectedRenderedText)

            if (shouldAssertExactLines) {
              expect(redoneText.lines).toEqual(textScenario.expectedMinimumLines)
            }
          })
        })
      }
    })
  }
})
