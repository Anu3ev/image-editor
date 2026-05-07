import { test, expect } from '../../fixtures/editor.fixture'
import {
  SHAPE_SCALING_TOLERANCE
} from '../../fixtures/data/shape-scaling.data'
import {
  MULTILINE_ARROW_TEXT,
  MULTILINE_ARROW_SCALE_CYCLES,
  MULTILINE_ARROW_EXPAND_BASE_SCALE,
  MULTILINE_ARROW_EXPAND_SCALE_STEP,
  MULTILINE_ARROW_SINGLE_SHAPE_ID,
  MULTILINE_ARROW_SINGLE_SHAPE_BOUNDS,
  MULTILINE_ARROW_SINGLE_SHAPE_SCENARIOS
} from '../../fixtures/data/shape-scaling-multiline-arrow.data'
import {
  readStableMinimumGeometry
} from '../../helpers/shape-scaling-geometry.helper'
import type {
  ShapeScaleSnapshot
} from '../../types'
import type {
  StableMinimumGeometry
} from '../../helpers/shape-scaling-geometry.helper'

test.describe('Скейлинг multiline arrow-right-fat с разных сторон', () => {
  test.beforeEach(async({ editorModel, shapes }) => {
    const montageBounds = await editorModel.getMontageAreaBounds()
    const createdShape = await shapes.addAtBounds({
      presetKey: 'arrow-right-fat',
      options: {
        id: MULTILINE_ARROW_SINGLE_SHAPE_ID,
        left: montageBounds.left + MULTILINE_ARROW_SINGLE_SHAPE_BOUNDS.leftOffset,
        top: montageBounds.top + MULTILINE_ARROW_SINGLE_SHAPE_BOUNDS.topOffset,
        width: MULTILINE_ARROW_SINGLE_SHAPE_BOUNDS.width,
        height: MULTILINE_ARROW_SINGLE_SHAPE_BOUNDS.height,
        text: MULTILINE_ARROW_TEXT
      }
    })

    shapes.checkCreation({
      shape: createdShape,
      presetKey: 'arrow-right-fat'
    })
  })

  for (const scenario of MULTILINE_ARROW_SINGLE_SHAPE_SCENARIOS) {
    test(scenario.title, async({ shapes }) => {
      const minimumStates: Array<{
        phase: string
        snapshot: ShapeScaleSnapshot
        lineCount: number
      }> = []
      let baselineGeometry: StableMinimumGeometry | null = null
      let baselineLineCount: number | null = null

      for (let cycleIndex = 0; cycleIndex < MULTILINE_ARROW_SCALE_CYCLES; cycleIndex += 1) {
        const cycleNumber = cycleIndex + 1
        const expandedScale = MULTILINE_ARROW_EXPAND_BASE_SCALE + (cycleIndex * MULTILINE_ARROW_EXPAND_SCALE_STEP)
        let liveMinimumStepTitle = `Цикл ${cycleNumber}: вернуть правую ручку обратно до упора`

        if (scenario.axis === 'horizontal') {
          liveMinimumStepTitle = scenario.edge === 'right'
            ? `Цикл ${cycleNumber}: вернуть правую ручку обратно до упора`
            : `Цикл ${cycleNumber}: вернуть левую ручку обратно до упора`

          await test.step(
            scenario.edge === 'right'
              ? `Цикл ${cycleNumber}: потянуть правую ручку дальше вправо`
              : `Цикл ${cycleNumber}: потянуть левую ручку дальше влево`,
            async() => {
              if (scenario.edge === 'right') {
                await shapes.scaleHorizontallyFromRight({
                  id: MULTILINE_ARROW_SINGLE_SHAPE_ID,
                  scaleX: expandedScale
                })
                return
              }

              await shapes.scaleHorizontallyFromLeft({
                id: MULTILINE_ARROW_SINGLE_SHAPE_ID,
                scaleX: expandedScale
              })
            }
          )
        }

        if (scenario.axis === 'diagonal') {
          liveMinimumStepTitle = scenario.corner === 'br'
            ? `Цикл ${cycleNumber}: вернуть правый нижний угол обратно до упора`
            : `Цикл ${cycleNumber}: вернуть правый верхний угол обратно до упора`

          await test.step(
            scenario.corner === 'br'
              ? `Цикл ${cycleNumber}: потянуть правый нижний угол наружу`
              : `Цикл ${cycleNumber}: потянуть правый верхний угол наружу`,
            async() => {
              await shapes.scaleDiagonallyProportionally({
                id: MULTILINE_ARROW_SINGLE_SHAPE_ID,
                corner: scenario.corner,
                scale: expandedScale
              })
            }
          )
        }

        const liveMinimumSnapshot = await test.step(liveMinimumStepTitle, async() => {
          if (scenario.axis === 'horizontal') {
            return shapes.shrinkToMinimumWidth({
              id: MULTILINE_ARROW_SINGLE_SHAPE_ID,
              edge: scenario.edge
            })
          }

          return shapes.shrinkDiagonallyToMinimum({
            id: MULTILINE_ARROW_SINGLE_SHAPE_ID,
            corner: scenario.corner
          })
        })

        const liveText = await test.step(`Цикл ${cycleNumber}: получить состояние текста на minimum`, async() => {
          return shapes.getTextNode({
            id: MULTILINE_ARROW_SINGLE_SHAPE_ID
          })
        })

        expect(liveText, `цикл ${cycleNumber}: текст на minimum должен существовать`).not.toBeNull()

        if (!liveText) {
          throw new Error(`цикл ${cycleNumber}: текст на minimum должен существовать`)
        }

        const phase = `цикл ${cycleNumber} live`
        const geometry = readStableMinimumGeometry({
          snapshot: liveMinimumSnapshot,
          phase
        })

        if (!baselineGeometry) {
          baselineGeometry = geometry
          baselineLineCount = liveText.lineCount
        }

        minimumStates.push({
          phase,
          snapshot: liveMinimumSnapshot,
          lineCount: liveText.lineCount
        })
      }

      const finalSnapshot = await test.step('Отпустить мышь после последнего возврата на minimum', async() => {
        return shapes.finishScale({
          id: MULTILINE_ARROW_SINGLE_SHAPE_ID
        })
      })
      const finalText = await test.step('Получить состояние текста после mouseup', async() => {
        return shapes.getTextNode({
          id: MULTILINE_ARROW_SINGLE_SHAPE_ID
        })
      })

      expect(finalText, 'текст после mouseup должен существовать').not.toBeNull()

      if (!finalText) {
        throw new Error('текст после mouseup должен существовать')
      }

      if (!baselineGeometry || baselineLineCount === null) {
        throw new Error('первый minimum должен определить базовую геометрию для сравнения')
      }

      minimumStates.push({
        phase: 'после mouseup',
        snapshot: finalSnapshot,
        lineCount: finalText.lineCount
      })

      await test.step('Проверить, что все возвраты на minimum дают ту же геометрию шейпа и текста', () => {
        for (const state of minimumStates) {
          const phase = state.phase
          const geometry = readStableMinimumGeometry({
            snapshot: state.snapshot,
            phase
          })

          expect(state.lineCount, `${phase}: число строк не должно меняться`).toBe(baselineLineCount)

          expect(
            Math.abs(geometry.groupWidth - baselineGeometry.groupWidth),
            `${phase}: ширина группы не должна меняться`
          )
            .toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
          expect(
            Math.abs(geometry.groupHeight - baselineGeometry.groupHeight),
            `${phase}: высота группы не должна меняться`
          )
            .toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)

          expect(
            Math.abs(geometry.shapeOffsetLeft - baselineGeometry.shapeOffsetLeft),
            `${phase}: шейп не должен смещаться внутри группы по X`
          )
            .toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
          expect(
            Math.abs(geometry.shapeOffsetTop - baselineGeometry.shapeOffsetTop),
            `${phase}: шейп не должен смещаться внутри группы по Y`
          )
            .toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
          expect(
            Math.abs(geometry.shapeWidth - baselineGeometry.shapeWidth),
            `${phase}: ширина шейпа внутри группы не должна меняться`
          )
            .toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
          expect(
            Math.abs(geometry.shapeHeight - baselineGeometry.shapeHeight),
            `${phase}: высота шейпа внутри группы не должна меняться`
          )
            .toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)

          expect(
            Math.abs(geometry.textOffsetLeft - baselineGeometry.textOffsetLeft),
            `${phase}: текст не должен смещаться внутри группы по X`
          )
            .toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
          expect(
            Math.abs(geometry.textOffsetTop - baselineGeometry.textOffsetTop),
            `${phase}: текст не должен смещаться внутри группы по Y`
          )
            .toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
          expect(
            Math.abs(geometry.textWidth - baselineGeometry.textWidth),
            `${phase}: ширина текста не должна меняться`
          )
            .toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
          expect(
            Math.abs(geometry.textHeight - baselineGeometry.textHeight),
            `${phase}: высота текста не должна меняться`
          )
            .toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)

          shapes.checkNodeInsideGroup({
            snapshot: state.snapshot,
            kind: 'shape',
            tolerance: SHAPE_SCALING_TOLERANCE.mouseupJump
          })
          shapes.checkNodeInsideGroup({
            snapshot: state.snapshot,
            kind: 'text',
            tolerance: SHAPE_SCALING_TOLERANCE.mouseupJump
          })
        }
      })
    })
  }
})
