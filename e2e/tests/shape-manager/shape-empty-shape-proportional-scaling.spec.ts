import { test, expect } from '../../fixtures/editor.fixture'
import {
  EMPTY_SHAPE_PROPORTIONAL_REVERSE_DRAG,
  EMPTY_SHAPE_PROPORTIONAL_SCALING_CORNERS
} from '../../fixtures/data/shape-empty-shape-proportional-scaling.data'
import {
  SHAPE_SCALING_TOLERANCE
} from '../../fixtures/data/shape-scaling.data'

test.describe('Пропорциональный скейлинг пустого шейпа по диагонали', () => {
  test.beforeEach(async({ shapes }) => {
    await shapes.addEmptyTextShape()
  })

  for (const cornerCase of EMPTY_SHAPE_PROPORTIONAL_SCALING_CORNERS) {
    test(`при уменьшении ${cornerCase.title} шейп в live-режиме доходит до точки и не дёргается после mouseup`, async({
      shapes
    }) => {
      const initialSnapshot = await test.step('Получить исходное состояние шейпа', async() => {
        return shapes.getScaleSnapshot({ objectIndex: 0 })
      })

      const liveSnapshot = await test.step(`Сжать пустой шейп пропорционально ${cornerCase.title}`, async() => {
        return shapes.shrinkDiagonallyToMinimum({
          corner: cornerCase.corner,
          objectIndex: 0
        })
      })

      await test.step('Проверить что во время drag ширина и высота уже дошли почти до точки', () => {
        expect(liveSnapshot.groupBoundsWidth)
          .toBeLessThan(initialSnapshot.groupBoundsWidth - SHAPE_SCALING_TOLERANCE.direction)
        expect(liveSnapshot.groupBoundsHeight)
          .toBeLessThan(initialSnapshot.groupBoundsHeight - SHAPE_SCALING_TOLERANCE.direction)
        expect(liveSnapshot.groupBoundsWidth).toBeLessThanOrEqual(1 + SHAPE_SCALING_TOLERANCE.mouseupJump)
        expect(liveSnapshot.groupBoundsHeight).toBeLessThanOrEqual(1 + SHAPE_SCALING_TOLERANCE.mouseupJump)

        shapes.checkNodeInsideGroup({ snapshot: liveSnapshot, kind: 'shape' })
      })

      const finalSnapshot = await test.step('Завершить скейлинг и получить финальное состояние', async() => {
        return shapes.finishScale({ objectIndex: 0 })
      })

      await test.step('Проверить что после mouseup размер не дёрнулся и шейп остался точкой', async() => {
        const widthJump = Math.abs(finalSnapshot.groupBoundsWidth - liveSnapshot.groupBoundsWidth)
        const heightJump = Math.abs(finalSnapshot.groupBoundsHeight - liveSnapshot.groupBoundsHeight)
        const shape = await shapes.getFirstShape()

        expect(widthJump).toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
        expect(heightJump).toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
        expect(finalSnapshot.groupBoundsWidth).toBeLessThanOrEqual(1 + SHAPE_SCALING_TOLERANCE.mouseupJump)
        expect(finalSnapshot.groupBoundsHeight).toBeLessThanOrEqual(1 + SHAPE_SCALING_TOLERANCE.mouseupJump)
        expect(shape.width).toBeCloseTo(1, 4)
        expect(shape.height).toBeCloseTo(1, 4)
        expect(shape.scaleX).toBe(1)
        expect(shape.scaleY).toBe(1)
      })
    })
  }

  test('после упора в точку пустой шейп можно сразу тянуть обратно, не отпуская мышь', async({
    shapes
  }) => {
    const minimumSnapshot = await test.step('Сжать пустой шейп пропорционально до точки', async() => {
      return shapes.shrinkDiagonallyToMinimum({
        corner: EMPTY_SHAPE_PROPORTIONAL_REVERSE_DRAG.corner,
        objectIndex: 0
      })
    })

    const expandedSnapshot = await test.step('Не отпуская мышь, сразу потянуть тот же угол обратно', async() => {
      return shapes.scaleDiagonallyProportionally({
        scale: EMPTY_SHAPE_PROPORTIONAL_REVERSE_DRAG.expandedScale,
        corner: EMPTY_SHAPE_PROPORTIONAL_REVERSE_DRAG.corner,
        objectIndex: 0
      })
    })

    await test.step('Проверить что ширина и высота снова растут уже в той же drag-сессии', () => {
      expect(expandedSnapshot.groupBoundsWidth)
        .toBeGreaterThan(minimumSnapshot.groupBoundsWidth + SHAPE_SCALING_TOLERANCE.direction)
      expect(expandedSnapshot.groupBoundsHeight)
        .toBeGreaterThan(minimumSnapshot.groupBoundsHeight + SHAPE_SCALING_TOLERANCE.direction)

      shapes.checkNodeInsideGroup({ snapshot: expandedSnapshot, kind: 'shape' })
    })

    const finalSnapshot = await test.step('Завершить скейлинг и получить финальное состояние', async() => {
      return shapes.finishScale({ objectIndex: 0 })
    })

    await test.step('Проверить что после mouseup обратное расширение не дёрнулось', () => {
      const widthJump = Math.abs(finalSnapshot.groupBoundsWidth - expandedSnapshot.groupBoundsWidth)
      const heightJump = Math.abs(finalSnapshot.groupBoundsHeight - expandedSnapshot.groupBoundsHeight)

      expect(widthJump).toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
      expect(heightJump).toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
    })
  })
})
