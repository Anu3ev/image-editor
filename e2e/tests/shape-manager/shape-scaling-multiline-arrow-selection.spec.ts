import { test, expect } from '../../fixtures/editor.fixture'
import {
  SHAPE_SCALING_TOLERANCE
} from '../../fixtures/data/shape-scaling.data'
import {
  MULTILINE_ARROW_TEXT,
  MULTILINE_ARROW_SCALE_CYCLES,
  MULTILINE_ARROW_EXPAND_BASE_SCALE,
  MULTILINE_ARROW_EXPAND_SCALE_STEP,
  MULTILINE_ARROW_SELECTION_MINIMUM_SIZE,
  MULTILINE_ARROW_SELECTION_SHAPES,
  MULTILINE_ARROW_SELECTION_SCENARIOS
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

test.describe('Скейлинг общего выделения из multiline arrow-right-fat', () => {
  test.beforeEach(async({ editorModel, shapes }) => {
    const montageBounds = await editorModel.getMontageAreaBounds()

    for (const shapeConfig of MULTILINE_ARROW_SELECTION_SHAPES) {
      const createdShape = await shapes.addAtBounds({
        presetKey: 'arrow-right-fat',
        options: {
          id: shapeConfig.id,
          left: montageBounds.left + shapeConfig.leftOffset,
          top: montageBounds.top + shapeConfig.topOffset,
          width: shapeConfig.width,
          height: shapeConfig.height,
          text: MULTILINE_ARROW_TEXT
        }
      })

      shapes.checkCreation({
        shape: createdShape,
        presetKey: 'arrow-right-fat'
      })
    }

    await editorModel.checkObjectCount({ count: MULTILINE_ARROW_SELECTION_SHAPES.length })
    await editorModel.selectAllObjects()
  })

  for (const scenario of MULTILINE_ARROW_SELECTION_SCENARIOS) {
    test(scenario.title, async({ selection, shapes }) => {
      const minimumStates: Array<{
        phase: string
        shapes: Array<{
          id: string
          snapshot: ShapeScaleSnapshot
          lineCount: number
        }>
      }> = []
      const baselineGeometryById = new Map<string, StableMinimumGeometry>()
      const baselineLineCountById = new Map<string, number>()

      for (let cycleIndex = 0; cycleIndex < MULTILINE_ARROW_SCALE_CYCLES; cycleIndex += 1) {
        const cycleNumber = cycleIndex + 1
        const expandedScale = MULTILINE_ARROW_EXPAND_BASE_SCALE + (cycleIndex * MULTILINE_ARROW_EXPAND_SCALE_STEP)
        let shrinkStepTitle = `Цикл ${cycleNumber}: вернуть правую ручку общего выделения обратно до упора`

        if (scenario.axis === 'horizontal') {
          await test.step(`Цикл ${cycleNumber}: потянуть правую ручку общего выделения дальше вправо`, async() => {
            await selection.scaleHorizontallyFromRight({
              scaleX: expandedScale
            })
          })
        }

        if (scenario.axis === 'vertical') {
          shrinkStepTitle = `Цикл ${cycleNumber}: вернуть верхнюю ручку общего выделения обратно до упора`

          await test.step(`Цикл ${cycleNumber}: потянуть верхнюю ручку общего выделения дальше вверх`, async() => {
            await selection.scaleVerticallyFromTop({
              scaleY: expandedScale
            })
          })
        }

        if (scenario.axis === 'diagonal') {
          shrinkStepTitle = scenario.corner === 'br'
            ? `Цикл ${cycleNumber}: вернуть правый нижний угол общего выделения обратно до упора`
            : `Цикл ${cycleNumber}: вернуть правый верхний угол общего выделения обратно до упора`

          await test.step(
            scenario.corner === 'br'
              ? `Цикл ${cycleNumber}: потянуть правый нижний угол общего выделения наружу`
              : `Цикл ${cycleNumber}: потянуть правый верхний угол общего выделения наружу`,
            async() => {
              if (scenario.corner === 'br') {
                await selection.scaleDiagonallyFromBottomRight({
                  scaleX: expandedScale,
                  scaleY: expandedScale
                })
                return
              }

              await selection.scaleDiagonallyFromTopRight({
                scaleX: expandedScale,
                scaleY: expandedScale
              })
            }
          )
        }

        await test.step(shrinkStepTitle, async() => {
          if (scenario.axis === 'horizontal') {
            await selection.shrinkHorizontallyFromRightToMinimum({
              minimumSize: MULTILINE_ARROW_SELECTION_MINIMUM_SIZE
            })
            return
          }

          if (scenario.axis === 'vertical') {
            await selection.shrinkVerticallyFromTopToMinimum({
              minimumSize: MULTILINE_ARROW_SELECTION_MINIMUM_SIZE
            })
            return
          }

          if (scenario.corner === 'br') {
            await selection.shrinkDiagonallyFromBottomRightToMinimum({
              minimumSize: MULTILINE_ARROW_SELECTION_MINIMUM_SIZE
            })
            return
          }

          await selection.shrinkDiagonallyFromTopRightToMinimum({
            minimumSize: MULTILINE_ARROW_SELECTION_MINIMUM_SIZE
          })
        })

        const shapesAtMinimum: Array<{
          id: string
          snapshot: ShapeScaleSnapshot
          lineCount: number
        }> = []

        for (const shapeConfig of MULTILINE_ARROW_SELECTION_SHAPES) {
          const snapshot = await test.step(`Цикл ${cycleNumber}: получить состояние ${shapeConfig.id} на minimum`, async() => {
            return shapes.getScaleSnapshot({
              id: shapeConfig.id
            })
          })
          const text = await test.step(`Цикл ${cycleNumber}: получить текст внутри ${shapeConfig.id} на minimum`, async() => {
            return shapes.getTextNode({
              id: shapeConfig.id
            })
          })

          expect(text, `цикл ${cycleNumber}: текст внутри ${shapeConfig.id} должен существовать`).not.toBeNull()

          if (!text) {
            throw new Error(`цикл ${cycleNumber}: текст внутри ${shapeConfig.id} должен существовать`)
          }

          const phase = `цикл ${cycleNumber} live ${shapeConfig.id}`
          const geometry = readStableMinimumGeometry({
            snapshot,
            phase
          })

          if (!baselineGeometryById.has(shapeConfig.id)) {
            baselineGeometryById.set(shapeConfig.id, geometry)
            baselineLineCountById.set(shapeConfig.id, text.lineCount)
          }

          shapesAtMinimum.push({
            id: shapeConfig.id,
            snapshot,
            lineCount: text.lineCount
          })
        }

        minimumStates.push({
          phase: `цикл ${cycleNumber} live`,
          shapes: shapesAtMinimum
        })
      }

      await test.step('Отпустить мышь после последнего возврата на minimum', async() => {
        await selection.finishScale()
      })

      const finalShapesState: Array<{
        id: string
        snapshot: ShapeScaleSnapshot
        lineCount: number
      }> = []

      for (const shapeConfig of MULTILINE_ARROW_SELECTION_SHAPES) {
        const snapshot = await test.step(`Получить состояние ${shapeConfig.id} после mouseup`, async() => {
          return shapes.getScaleSnapshot({
            id: shapeConfig.id
          })
        })
        const text = await test.step(`Получить текст внутри ${shapeConfig.id} после mouseup`, async() => {
          return shapes.getTextNode({
            id: shapeConfig.id
          })
        })

        expect(text, `после mouseup: текст внутри ${shapeConfig.id} должен существовать`).not.toBeNull()

        if (!text) {
          throw new Error(`после mouseup: текст внутри ${shapeConfig.id} должен существовать`)
        }

        finalShapesState.push({
          id: shapeConfig.id,
          snapshot,
          lineCount: text.lineCount
        })
      }

      minimumStates.push({
        phase: 'после mouseup',
        shapes: finalShapesState
      })

      await test.step('Проверить, что обе фигуры после каждого возврата на minimum остаются в той же геометрии', () => {
        for (const state of minimumStates) {
          for (const shapeState of state.shapes) {
            const baselineGeometry = baselineGeometryById.get(shapeState.id)
            const baselineLineCount = baselineLineCountById.get(shapeState.id)

            if (!baselineGeometry || baselineLineCount === undefined) {
              throw new Error(`${shapeState.id}: первый minimum должен определить базовую геометрию`)
            }

            const phase = `${state.phase} ${shapeState.id}`
            const geometry = readStableMinimumGeometry({
              snapshot: shapeState.snapshot,
              phase
            })

            expect(shapeState.lineCount, `${phase}: число строк не должно меняться`).toBe(baselineLineCount)

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
              snapshot: shapeState.snapshot,
              kind: 'shape',
              tolerance: SHAPE_SCALING_TOLERANCE.mouseupJump
            })
            shapes.checkNodeInsideGroup({
              snapshot: shapeState.snapshot,
              kind: 'text',
              tolerance: SHAPE_SCALING_TOLERANCE.mouseupJump
            })
          }
        }
      })
    })
  }
})
