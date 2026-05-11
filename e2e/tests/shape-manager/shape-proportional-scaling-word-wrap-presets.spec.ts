import { test, expect } from '../../fixtures/editor.fixture'
import {
  expectProportionalFinalMinimumState,
  expectProportionalLiveMinimumState
} from '../../helpers/shape-proportional-word-wrap.helper'
import {
  SHAPE_PROPORTIONAL_SCALING_CORNERS,
  SHAPE_PROPORTIONAL_SINGLE_WORD_WRAP_SCENARIO,
  SHAPE_PROPORTIONAL_TEXT_FONT_SIZE,
  SHAPE_PROPORTIONAL_WORD_WRAP_PRESET_KEYS
} from '../../fixtures/data/shape-scaling.data'

test.describe('Пропорциональное сужение шейпа по диагонали до упора в текст у всех пресетов', () => {
  const textScenario = SHAPE_PROPORTIONAL_SINGLE_WORD_WRAP_SCENARIO

  for (const presetKey of SHAPE_PROPORTIONAL_WORD_WRAP_PRESET_KEYS) {
    test.describe(`когда выбран пресет "${presetKey}"`, () => {
      for (const cornerScenario of SHAPE_PROPORTIONAL_SCALING_CORNERS) {
        test(`при сужении ${cornerScenario.title} до упора сохраняет слово целиком`, async({
          shapes
        }) => {
          await test.step('Добавить шейп выбранного пресета и задать текст через editing path', async() => {
            await shapes.addWithText({
              presetKey,
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

          expect(initialText, 'исходный текст должен существовать').not.toBeNull()

          if (!initialText) {
            throw new Error('исходный текст должен существовать')
          }

          const liveSnapshot = await test.step('Сузить шейп по диагонали до минимального допустимого размера', async() => {
            return shapes.shrinkDiagonallyToMinimum({
              corner: cornerScenario.corner,
              objectIndex: 0
            })
          })
          const liveText = await test.step('Получить состояние текста во время shrink до упора', async() => {
            return shapes.getTextNode({ objectIndex: 0 })
          })

          expect(liveText, 'текст во время shrink до упора должен существовать').not.toBeNull()

          if (!liveText) {
            throw new Error('текст во время shrink до упора должен существовать')
          }

          await test.step('Проверить что во время drag шейп дошёл до minimum по текстовому контракту', () => {
            expectProportionalLiveMinimumState({
              initialSnapshot,
              liveSnapshot,
              liveText,
              initialFontSize: initialText.fontSize,
              expectedLines: textScenario.expectedMinimumLines,
              expectedText: textScenario.text
            })

            shapes.checkNodeInsideGroup({
              snapshot: liveSnapshot,
              kind: 'text'
            })
          })

          const finalSnapshot = await test.step('Отпустить мышь и получить итоговое состояние шейпа', async() => {
            return shapes.finishScale({ objectIndex: 0 })
          })
          const finalText = await test.step('Получить итоговое состояние текста', async() => {
            return shapes.getTextNode({ objectIndex: 0 })
          })

          expect(finalText, 'итоговый текст должен существовать').not.toBeNull()

          if (!finalText) {
            throw new Error('итоговый текст должен существовать')
          }

          await test.step('Проверить что после mouseup minimum и текст без splitByGrapheme сохранились', () => {
            expectProportionalFinalMinimumState({
              liveSnapshot,
              finalSnapshot,
              liveText,
              finalText,
              expectedLines: textScenario.expectedMinimumLines,
              expectedText: textScenario.text
            })

            shapes.checkNodeInsideGroup({
              snapshot: finalSnapshot,
              kind: 'text'
            })
          })
        })
      }
    })
  }
})
