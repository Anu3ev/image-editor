import { test, expect } from '../../fixtures/editor.fixture'
import {
  normalizeRenderedText,
  shouldAssertExactMinimumLines,
  shrinkShapeDiagonallyToWordWrapMinimum
} from '../../helpers/shape-proportional-word-wrap.helper'
import {
  SHAPE_PROPORTIONAL_EXPAND_BASE_SCALE,
  SHAPE_PROPORTIONAL_EXPAND_SCALE_STEP,
  SHAPE_PROPORTIONAL_SCALING_CORNERS,
  SHAPE_PROPORTIONAL_SCALING_CYCLES,
  SHAPE_PROPORTIONAL_THREE_WORD_WRAP_SCENARIO,
  SHAPE_PROPORTIONAL_TEXT_FONT_SIZE,
  SHAPE_PROPORTIONAL_WORD_WRAP_SCENARIOS,
  SHAPE_SCALING_TOLERANCE
} from '../../fixtures/data/shape-scaling.data'

test.describe('Пропорциональное сужение шейпа по диагонали до упора в текст', () => {
  for (const textScenario of SHAPE_PROPORTIONAL_WORD_WRAP_SCENARIOS) {
    test.describe(`когда текст "${textScenario.text}"`, () => {
      for (const cornerScenario of SHAPE_PROPORTIONAL_SCALING_CORNERS) {
        test(`при сужении ${cornerScenario.title} не переносит часть слова`, async({
          shapes
        }) => {
          await test.step('Добавить квадратный шейп и задать текст через editing path', async() => {
            await shapes.addWithText({
              presetKey: 'square',
              text: textScenario.text,
              fontSize: SHAPE_PROPORTIONAL_TEXT_FONT_SIZE
            })
          })

          const initialSnapshot = await test.step('Получить исходное состояние шейпа', async() => {
            return shapes.getScaleSnapshot({ objectIndex: 0 })
          })
          const initialText = await test.step('Получить исходное состояние текста', async() => {
            return shapes.getTextNode({ objectIndex: 0 })
          })
          const minimumStates: Array<{
            snapshot: typeof initialSnapshot
            lines: string[]
            lineCount: number
            splitByGrapheme: boolean
            fontSize: number
          }> = []

          for (let cycleIndex = 0; cycleIndex < SHAPE_PROPORTIONAL_SCALING_CYCLES; cycleIndex += 1) {
            const cycleNumber = cycleIndex + 1
            const expandedScale = SHAPE_PROPORTIONAL_EXPAND_BASE_SCALE
              + (cycleIndex * SHAPE_PROPORTIONAL_EXPAND_SCALE_STEP)

            await test.step(`Цикл ${cycleNumber}: потянуть угол наружу`, async() => {
              await shapes.scaleDiagonallyProportionally({
                objectIndex: 0,
                corner: cornerScenario.corner,
                scale: expandedScale
              })
            })

            const minimumState = await test.step(`Цикл ${cycleNumber}: вернуть угол обратно до упора`, async() => {
              return shrinkShapeDiagonallyToWordWrapMinimum({
                shapes,
                objectIndex: 0,
                corner: cornerScenario.corner,
                expectedLineCount: textScenario.expectedMinimumLines.length
              })
            })
            const {
              snapshot: liveSnapshot,
              text: liveText
            } = minimumState

            minimumStates.push({
              snapshot: liveSnapshot,
              lines: liveText.lines,
              lineCount: liveText.lineCount,
              splitByGrapheme: liveText.splitByGrapheme,
              fontSize: liveText.fontSize
            })
          }

          const firstMinimumState = minimumStates[0]

          expect(initialText, 'исходный текст должен существовать').not.toBeNull()
          expect(firstMinimumState, 'должно существовать первое состояние на minimum').toBeDefined()

          if (!initialText || !firstMinimumState) {
            throw new Error('исходный текст и первое состояние на minimum должны существовать')
          }

          await test.step('Проверить что каждый возврат на minimum не включает перенос по буквам', () => {
            const expectedRenderedText = normalizeRenderedText({
              lines: textScenario.expectedMinimumLines
            })
            const shouldAssertExactLines = shouldAssertExactMinimumLines({
              exactMinimumCorners: textScenario.exactMinimumCorners,
              corner: cornerScenario.corner
            })

            expect(initialText.lineCount).toBe(1)
            expect(firstMinimumState.snapshot.groupBoundsWidth)
              .toBeLessThan(initialSnapshot.groupBoundsWidth - SHAPE_SCALING_TOLERANCE.direction)
            expect(firstMinimumState.snapshot.groupBoundsHeight)
              .toBeLessThan(initialSnapshot.groupBoundsHeight - SHAPE_SCALING_TOLERANCE.direction)
            expect(firstMinimumState.fontSize).toBe(initialText.fontSize)
            expect(firstMinimumState.splitByGrapheme).toBe(false)

            if (textScenario.expectWrap) {
              expect(firstMinimumState.lineCount).toBeGreaterThan(initialText.lineCount)
            }

            if (!textScenario.expectWrap) {
              expect(firstMinimumState.lineCount).toBe(initialText.lineCount)
            }

            if (shouldAssertExactLines) {
              expect(firstMinimumState.lines).toEqual(textScenario.expectedMinimumLines)
              expect(firstMinimumState.lineCount).toBe(textScenario.expectedMinimumLines.length)
            } else {
              expect(firstMinimumState.lineCount).toBeLessThanOrEqual(textScenario.expectedMinimumLines.length)
            }

            for (const state of minimumStates) {
              expect(state.lines).toHaveLength(state.lineCount)
              expect(state.lineCount).toBe(firstMinimumState.lineCount)
              expect(state.splitByGrapheme).toBe(false)
              expect(state.fontSize).toBe(initialText.fontSize)
              expect(normalizeRenderedText({ lines: state.lines })).toBe(expectedRenderedText)

              if (shouldAssertExactLines) {
                expect(state.lines).toEqual(textScenario.expectedMinimumLines)
              }
            }
          })

          const lastMinimumState = minimumStates[minimumStates.length - 1]
          await test.step('Отпустить мышь после последнего возврата на minimum', async() => {
            await shapes.finishScale({ objectIndex: 0 })
          })
          const finalText = await test.step('Получить финальное состояние текста', async() => {
            return shapes.getTextNode({ objectIndex: 0 })
          })

          expect(finalText, 'итоговый текст должен существовать').not.toBeNull()
          expect(lastMinimumState, 'должно существовать последнее состояние на minimum').toBeDefined()

          if (!finalText || !lastMinimumState) {
            throw new Error('итоговый текст и последнее состояние на minimum должны существовать')
          }

          await test.step('Проверить что после mouseup перенос по буквам не появился', () => {
            const expectedRenderedText = normalizeRenderedText({
              lines: textScenario.expectedMinimumLines
            })
            const shouldAssertExactLines = shouldAssertExactMinimumLines({
              exactMinimumCorners: textScenario.exactMinimumCorners,
              corner: cornerScenario.corner
            })

            expect(finalText.text).toBe(textScenario.text)
            expect(finalText.lines).toHaveLength(finalText.lineCount)
            expect(finalText.splitByGrapheme).toBe(false)
            expect(finalText.fontSize).toBe(lastMinimumState.fontSize)
            expect(finalText.lineCount).toBe(lastMinimumState.lineCount)
            expect(normalizeRenderedText({ lines: finalText.lines })).toBe(expectedRenderedText)

            if (shouldAssertExactLines) {
              expect(finalText.lines).toEqual(textScenario.expectedMinimumLines)
            }
          })
        })
      }
    })
  }
})

test.describe('Пропорциональное сужение шейпа по диагонали при авторасширении текста', () => {
  for (const cornerScenario of SHAPE_PROPORTIONAL_SCALING_CORNERS) {
    // eslint-disable-next-line max-len
    test(`при сужении ${cornerScenario.title} не выпускает текст за пределы шейпа во время drag и после mouseup`, async({
      shapes
    }) => {
      await test.step('Добавить шейп с текстом без явных размеров и с дефолтным auto-expand', async() => {
        await shapes.addShapeWithText({
          text: SHAPE_PROPORTIONAL_THREE_WORD_WRAP_SCENARIO.text,
          fontSize: SHAPE_PROPORTIONAL_TEXT_FONT_SIZE
        })
      })

      await test.step('Явно выбрать шейп перед началом скейлинга', async() => {
        await shapes.select({ objectIndex: 0 })
      })

      await test.step('Начать сужение по диагонали и дойти до переноса каждого слова на новую строку', async() => {
        await shapes.scaleDiagonallyProportionally({
          objectIndex: 0,
          corner: cornerScenario.corner,
          scale: 0.92
        })
      })

      const minimumState = await test.step('Поймать live-состояние, в котором текст уже перенёсся на три строки', async() => {
        return shrinkShapeDiagonallyToWordWrapMinimum({
          shapes,
          objectIndex: 0,
          corner: cornerScenario.corner,
          expectedLineCount: SHAPE_PROPORTIONAL_THREE_WORD_WRAP_SCENARIO.expectedMinimumLines.length
        })
      })

      const {
        snapshot: liveSnapshot,
        text: liveText
      } = minimumState

      await test.step('Проверить что во время drag текст уже разложился по словам, но остаётся внутри шейпа', () => {
        expect(liveText.lines).toEqual(SHAPE_PROPORTIONAL_THREE_WORD_WRAP_SCENARIO.expectedMinimumLines)
        expect(liveText.lineCount).toBe(SHAPE_PROPORTIONAL_THREE_WORD_WRAP_SCENARIO.expectedMinimumLines.length)
        expect(liveSnapshot.textBoundsLeft, 'левая граница текста в live preview должна существовать').not.toBeNull()
        expect(liveSnapshot.textBoundsTop, 'верхняя граница текста в live preview должна существовать').not.toBeNull()
        expect(liveSnapshot.textBoundsRight, 'правая граница текста в live preview должна существовать').not.toBeNull()
        expect(liveSnapshot.textBoundsBottom, 'нижняя граница текста в live preview должна существовать').not.toBeNull()

        if (
          liveSnapshot.textBoundsLeft === null
          || liveSnapshot.textBoundsTop === null
          || liveSnapshot.textBoundsRight === null
          || liveSnapshot.textBoundsBottom === null
        ) {
          throw new Error('границы текста в live preview должны существовать')
        }

        expect.soft(liveSnapshot.textBoundsLeft).toBeGreaterThanOrEqual(
          liveSnapshot.groupBoundsLeft - SHAPE_SCALING_TOLERANCE.mouseupJump
        )
        expect.soft(liveSnapshot.textBoundsTop).toBeGreaterThanOrEqual(
          liveSnapshot.groupBoundsTop - SHAPE_SCALING_TOLERANCE.mouseupJump
        )
        expect.soft(liveSnapshot.textBoundsRight).toBeLessThanOrEqual(
          liveSnapshot.groupBoundsRight + SHAPE_SCALING_TOLERANCE.mouseupJump
        )
        expect.soft(liveSnapshot.textBoundsBottom).toBeLessThanOrEqual(
          liveSnapshot.groupBoundsBottom + SHAPE_SCALING_TOLERANCE.mouseupJump
        )
      })

      const finalSnapshot = await test.step('Отпустить мышь и получить финальное состояние шейпа', async() => {
        return shapes.finishScale({ objectIndex: 0 })
      })
      const finalText = await test.step('Получить финальное состояние текста после mouseup', async() => {
        return shapes.getTextNode({ objectIndex: 0 })
      })

      await test.step('Проверить что после mouseup текст остаётся на трёх строках и уже точно находится внутри шейпа', () => {
        expect(finalText, 'итоговый текст после mouseup должен существовать').not.toBeNull()

        if (!finalText) {
          throw new Error('итоговый текст после mouseup должен существовать')
        }

        expect(finalText.lines).toEqual(SHAPE_PROPORTIONAL_THREE_WORD_WRAP_SCENARIO.expectedMinimumLines)
        expect(finalText.lineCount).toBe(SHAPE_PROPORTIONAL_THREE_WORD_WRAP_SCENARIO.expectedMinimumLines.length)
        shapes.checkNodeInsideGroup({
          snapshot: finalSnapshot,
          kind: 'text',
          tolerance: SHAPE_SCALING_TOLERANCE.mouseupJump
        })
      })
    })
  }
})
