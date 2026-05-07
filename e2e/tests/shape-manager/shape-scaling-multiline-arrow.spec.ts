import { test, expect } from '../../fixtures/editor.fixture'
import {
  SHAPE_SCALING_TOLERANCE
} from '../../fixtures/data/shape-scaling.data'
import {
  MULTILINE_ARROW_TEXT,
  MULTILINE_ARROW_SCALE_CYCLES,
  MULTILINE_ARROW_EXPAND_BASE_SCALE,
  MULTILINE_ARROW_EXPAND_SCALE_STEP
} from '../../fixtures/data/shape-scaling-multiline-arrow.data'
import {
  readStableMinimumGeometry
} from '../../helpers/shape-scaling-geometry.helper'
import type { ShapeScaleSnapshot } from '../../types'
import type { StableMinimumGeometry } from '../../helpers/shape-scaling-geometry.helper'

test.describe('Vertical scaling шейпа с многострочным текстом', () => {
  test('в одном непрерывном vertical drag текст и shape не должны смещаться, когда ручка несколько раз возвращается вниз до упора', async({
    shapes
  }) => {
    const createdShape = await test.step('Добавить arrow-right-fat тем же способом, что и в браузерном скрипте', async() => {
      return shapes.add({
        presetKey: 'arrow-right-fat',
        options: {
          text: MULTILINE_ARROW_TEXT
        }
      })
    })

    shapes.checkCreation({
      shape: createdShape,
      presetKey: 'arrow-right-fat'
    })

    const minimumStates: Array<{
      phase: string
      snapshot: ShapeScaleSnapshot
      lineCount: number
    }> = []
    let baselineGeometry: StableMinimumGeometry | null = null
    let baselineLineCount: number | null = null

    for (let cycleIndex = 0; cycleIndex < MULTILINE_ARROW_SCALE_CYCLES; cycleIndex += 1) {
      const cycleNumber = cycleIndex + 1

      await test.step(`Цикл ${cycleNumber}: в той же drag-сессии потянуть ручку вверх`, async() => {
        await shapes.scaleVerticallyFromTop({
          objectIndex: 0,
          scaleY: MULTILINE_ARROW_EXPAND_BASE_SCALE + (cycleIndex * MULTILINE_ARROW_EXPAND_SCALE_STEP)
        })
      })

      const liveMinimumSnapshot = await test.step(`Цикл ${cycleNumber}: в той же drag-сессии вернуть ручку вниз до упора`, async() => {
        return shapes.shrinkToMinimumHeight({
          objectIndex: 0,
          edge: 'top'
        })
      })

      const liveText = await test.step(`Цикл ${cycleNumber}: получить состояние текста на нижнем упоре`, async() => {
        return shapes.getTextNode({ objectIndex: 0 })
      })

      expect(liveText, `цикл ${cycleNumber}: текст на нижнем упоре должен существовать`).not.toBeNull()

      if (!liveText) {
        throw new Error(`цикл ${cycleNumber}: текст на нижнем упоре должен существовать`)
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

    const finalSnapshot = await test.step('Отпустить мышь после последнего возврата вниз и получить финальное состояние', async() => {
      return shapes.finishScale({ objectIndex: 0 })
    })
    const finalText = await test.step('Получить состояние текста после mouseup', async() => {
      return shapes.getTextNode({ objectIndex: 0 })
    })

    expect(finalText, 'текст после mouseup должен существовать').not.toBeNull()

    if (!finalText) {
      throw new Error('текст после mouseup должен существовать')
    }

    if (!baselineGeometry || baselineLineCount === null) {
      throw new Error('первый нижний упор должен определить базовую геометрию для сравнения')
    }

    minimumStates.push({
      phase: 'после mouseup',
      snapshot: finalSnapshot,
      lineCount: finalText.lineCount
    })

    await test.step('Проверить что каждый возврат вниз даёт ту же геометрию текста и shape внутри группы', () => {
      for (const state of minimumStates) {
        const phase = state.phase
        const geometry = readStableMinimumGeometry({
          snapshot: state.snapshot,
          phase
        })

        expect(state.lineCount, `${phase}: число строк не должно меняться на нижнем упоре`).toBe(baselineLineCount)

        expect(
          Math.abs(geometry.groupWidth - baselineGeometry.groupWidth),
          `${phase}: ширина группы не должна меняться на нижнем упоре`
        )
          .toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
        expect(
          Math.abs(geometry.groupHeight - baselineGeometry.groupHeight),
          `${phase}: высота группы не должна меняться на нижнем упоре`
        )
          .toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)

        expect(
          Math.abs(geometry.shapeOffsetLeft - baselineGeometry.shapeOffsetLeft),
          `${phase}: shape не должен смещаться внутри группы по X`
        )
          .toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
        expect(
          Math.abs(geometry.shapeOffsetTop - baselineGeometry.shapeOffsetTop),
          `${phase}: shape не должен смещаться внутри группы по Y`
        )
          .toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
        expect(
          Math.abs(geometry.shapeWidth - baselineGeometry.shapeWidth),
          `${phase}: ширина shape внутри группы не должна меняться`
        )
          .toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
        expect(
          Math.abs(geometry.shapeHeight - baselineGeometry.shapeHeight),
          `${phase}: высота shape внутри группы не должна меняться`
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
          kind: 'shape'
        })
        shapes.checkNodeInsideGroup({
          snapshot: state.snapshot,
          kind: 'text'
        })
      }
    })
  })
})
