import { test, expect } from '../../fixtures/editor.fixture'
import type { ShapeScaleSnapshot } from '../../types'
import {
  SHAPE_SCALING_LIVE_REVERSE_STEPS,
  SHAPE_SCALING_STROKE_WIDTH,
  SHAPE_SCALING_TOLERANCE
} from '../../fixtures/data/shape-scaling.data'

test.describe('Вертикальный скейлинг пустого шейпа', () => {
  test.beforeEach(async({ shapes }) => {
    await shapes.addEmptyTextShape()
  })

  // eslint-disable-next-line max-len
  test('быстрый скейлинг вниз за нижний контролл упирается в высоту 1px и не дёргается после отпускания мыши', async({
    shapes
  }) => {
    const initialSnapshot = await test.step('Получить исходное состояние шейпа', async() => {
      return shapes.getScaleSnapshot({ objectIndex: 0 })
    })

    const liveSnapshot = await test.step('Уменьшить высоту шейпа до 1px вертикальным скейлингом', async() => {
      return shapes.shrinkToMinimumHeight({ objectIndex: 0 })
    })

    await test.step('Проверить что во время скейлинга шейп уже дошёл до высоты 1px', () => {
      expect(liveSnapshot.groupBoundsHeight).toBeLessThan(initialSnapshot.groupBoundsHeight)
      expect(liveSnapshot.groupBoundsHeight).toBeLessThanOrEqual(1 + SHAPE_SCALING_TOLERANCE.mouseupJump)
      shapes.checkNodeInsideGroup({ snapshot: liveSnapshot, kind: 'shape' })
    })

    const finalSnapshot = await test.step('Завершить скейлинг и получить финальное состояние', async() => {
      return shapes.finishScale({ objectIndex: 0 })
    })

    await test.step('Проверить что после отпускания мыши шейп не дёрнулся и остался высотой 1px', async() => {
      const heightJump = Math.abs(finalSnapshot.groupBoundsHeight - liveSnapshot.groupBoundsHeight)
      const topJump = Math.abs(finalSnapshot.groupBoundsTop - liveSnapshot.groupBoundsTop)
      const bottomJump = Math.abs(finalSnapshot.groupBoundsBottom - liveSnapshot.groupBoundsBottom)
      const shape = await shapes.getFirstShape()

      expect(heightJump).toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
      expect(topJump).toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
      expect(bottomJump).toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
      expect(shape.height).toBe(1)
      expect(shape.scaleX).toBe(1)
      expect(shape.scaleY).toBe(1)
    })
  })

  // eslint-disable-next-line max-len
  test('быстрый скейлинг вверх за верхний контролл упирается в высоту 1px без рывка после отпускания мыши', async({
    shapes
  }) => {
    const initialSnapshot = await test.step('Получить исходное состояние шейпа', async() => {
      return shapes.getScaleSnapshot({ objectIndex: 0 })
    })

    const liveSnapshot = await test.step('Уменьшить высоту шейпа до 1px вертикальным скейлингом', async() => {
      return shapes.shrinkToMinimumHeight({
        edge: 'top',
        objectIndex: 0
      })
    })

    await test.step('Проверить что во время скейлинга шейп уже дошёл до высоты 1px', () => {
      expect(liveSnapshot.groupBoundsHeight).toBeLessThan(initialSnapshot.groupBoundsHeight)
      expect(liveSnapshot.groupBoundsHeight).toBeLessThanOrEqual(1 + SHAPE_SCALING_TOLERANCE.mouseupJump)
      shapes.checkNodeInsideGroup({ snapshot: liveSnapshot, kind: 'shape' })
    })

    const finalSnapshot = await test.step('Завершить скейлинг и получить финальное состояние', async() => {
      return shapes.finishScale({ objectIndex: 0 })
    })

    await test.step('Проверить что после отпускания мыши шейп не дёрнулся и остался высотой 1px', async() => {
      const heightJump = Math.abs(finalSnapshot.groupBoundsHeight - liveSnapshot.groupBoundsHeight)
      const topJump = Math.abs(finalSnapshot.groupBoundsTop - liveSnapshot.groupBoundsTop)
      const bottomJump = Math.abs(finalSnapshot.groupBoundsBottom - liveSnapshot.groupBoundsBottom)
      const shape = await shapes.getFirstShape()

      expect(heightJump).toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
      expect(topJump).toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
      expect(bottomJump).toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
      expect(shape.height).toBe(1)
      expect(shape.scaleX).toBe(1)
      expect(shape.scaleY).toBe(1)
    })
  })

  test('после упора в высоту 1px пустой шейп можно сразу тянуть обратно, не отпуская мышь', async({
    shapes
  }) => {
    const minimumSnapshot = await test.step('Сжать шейп по вертикали до высоты 1px', async() => {
      return shapes.shrinkToMinimumHeight({ objectIndex: 0 })
    })

    const expandedSnapshot = await test.step('Не отпуская мышь, сразу потянуть шейп обратно вниз', async() => {
      return shapes.scaleVerticallyFromBottom({
        scaleY: 0.9,
        objectIndex: 0
      })
    })

    await test.step('Проверить что высота снова растёт и шейп остаётся внутри границ группы', () => {
      expect(expandedSnapshot.groupBoundsHeight)
        .toBeGreaterThan(minimumSnapshot.groupBoundsHeight + SHAPE_SCALING_TOLERANCE.direction)
      shapes.checkNodeInsideGroup({ snapshot: expandedSnapshot, kind: 'shape' })
    })
  })
})

test.describe('Вертикальный скейлинг шейпа с текстом', () => {
  test.describe('Текст в одну строку', () => {
    test.beforeEach(async({ shapes }) => {
      const shape = await shapes.add({
        presetKey: 'square',
        options: {
          width: 200,
          height: 320,
          text: 'TEST',
          textStyle: {
            fontSize: 72
          }
        }
      })

      shapes.checkCreation({
        shape,
        presetKey: 'square'
      })
    })

    test('быстрый скейлинг вниз за нижнюю ручку упирается в текст без уменьшения шрифта и без изменения переносов строк', async({
      shapes
    }) => {
      const initialSnapshot = await test.step('Получить исходное состояние шейпа', async() => {
        return shapes.getScaleSnapshot({ objectIndex: 0 })
      })
      const initialText = await test.step('Получить исходное состояние текстового узла', async() => {
        return shapes.getTextNode({ objectIndex: 0 })
      })

      const minimumSnapshot = await test.step('Сжать шейп вниз до упора в текст во время скейлинга', async() => {
        return shapes.shrinkToMinimumHeight({ objectIndex: 0 })
      })
      const minimumText = await test.step('Получить состояние текста в точке упора', async() => {
        return shapes.getTextNode({ objectIndex: 0 })
      })

      const blockedFurtherShrinkSnapshot = await test.step('Попробовать ещё сильнее уменьшить высоту, не отпуская мышь', async() => {
        return shapes.scaleVerticallyFromBottom({
          scaleY: 0.05,
          objectIndex: 0
        })
      })

      await test.step('Проверить что шейп упёрся в текст, а сам текст не деформировался', () => {
        expect(minimumSnapshot.groupBoundsHeight).toBeLessThan(initialSnapshot.groupBoundsHeight)
        expect(Math.abs(minimumSnapshot.groupBoundsWidth - initialSnapshot.groupBoundsWidth))
          .toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
        expect(Math.abs(blockedFurtherShrinkSnapshot.groupBoundsHeight - minimumSnapshot.groupBoundsHeight))
          .toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
        expect(Math.abs(blockedFurtherShrinkSnapshot.groupBoundsWidth - minimumSnapshot.groupBoundsWidth))
          .toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
        expect(minimumText?.fontSize).toBe(initialText?.fontSize)
        expect(minimumText?.lineCount).toBe(initialText?.lineCount)
        expect(Math.abs((minimumText?.width ?? 0) - (initialText?.width ?? 0)))
          .toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
        shapes.checkNodeInsideGroup({ snapshot: minimumSnapshot, kind: 'shape' })
        shapes.checkNodeInsideGroup({ snapshot: minimumSnapshot, kind: 'text' })
        shapes.checkNodeInsideGroup({ snapshot: blockedFurtherShrinkSnapshot, kind: 'shape' })
        shapes.checkNodeInsideGroup({ snapshot: blockedFurtherShrinkSnapshot, kind: 'text' })
      })

      const finalSnapshot = await test.step('Завершить скейлинг и получить финальное состояние', async() => {
        return shapes.finishScale({ objectIndex: 0 })
      })
      const finalText = await test.step('Получить финальное состояние текстового узла', async() => {
        return shapes.getTextNode({ objectIndex: 0 })
      })

      await test.step('Проверить отсутствие рывка после отпускания мыши и сохранение переносов строк', () => {
        const heightJump = Math.abs(finalSnapshot.groupBoundsHeight - minimumSnapshot.groupBoundsHeight)
        const widthJump = Math.abs(finalSnapshot.groupBoundsWidth - minimumSnapshot.groupBoundsWidth)
        const topJump = Math.abs(finalSnapshot.groupBoundsTop - minimumSnapshot.groupBoundsTop)
        const bottomJump = Math.abs(finalSnapshot.groupBoundsBottom - minimumSnapshot.groupBoundsBottom)

        expect(heightJump).toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
        expect(widthJump).toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
        expect(topJump).toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
        expect(bottomJump).toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
        expect(finalText?.fontSize).toBe(initialText?.fontSize)
        expect(finalText?.lineCount).toBe(initialText?.lineCount)
        expect(Math.abs((finalText?.width ?? 0) - (initialText?.width ?? 0)))
          .toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
        shapes.checkNodeInsideGroup({ snapshot: finalSnapshot, kind: 'shape' })
        shapes.checkNodeInsideGroup({ snapshot: finalSnapshot, kind: 'text' })
      })
    })

    test('быстрый скейлинг вверх за верхнюю ручку тоже упирается в текст без изменения переносов строк', async({
      shapes
    }) => {
      const initialSnapshot = await test.step('Получить исходное состояние шейпа', async() => {
        return shapes.getScaleSnapshot({ objectIndex: 0 })
      })
      const initialText = await test.step('Получить исходное состояние текста', async() => {
        return shapes.getTextNode({ objectIndex: 0 })
      })

      const minimumSnapshot = await test.step('Сжать шейп вверх до упора в текст во время скейлинга', async() => {
        return shapes.shrinkToMinimumHeight({
          edge: 'top',
          objectIndex: 0
        })
      })
      const minimumText = await test.step('Получить состояние текста в точке упора', async() => {
        return shapes.getTextNode({ objectIndex: 0 })
      })

      await test.step('Проверить что шейп упёрся в текст, а переносы строк не изменились', () => {
        expect(minimumSnapshot.groupBoundsHeight).toBeLessThan(initialSnapshot.groupBoundsHeight)
        expect(Math.abs(minimumSnapshot.groupBoundsWidth - initialSnapshot.groupBoundsWidth))
          .toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
        expect(minimumText?.fontSize).toBe(initialText?.fontSize)
        expect(minimumText?.lineCount).toBe(initialText?.lineCount)
        expect(Math.abs((minimumText?.width ?? 0) - (initialText?.width ?? 0)))
          .toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
        shapes.checkNodeInsideGroup({ snapshot: minimumSnapshot, kind: 'shape' })
        shapes.checkNodeInsideGroup({ snapshot: minimumSnapshot, kind: 'text' })
      })

      const finalSnapshot = await test.step('Завершить скейлинг и получить финальное состояние', async() => {
        return shapes.finishScale({ objectIndex: 0 })
      })
      const finalText = await test.step('Получить финальное состояние текста', async() => {
        return shapes.getTextNode({ objectIndex: 0 })
      })

      await test.step('Проверить отсутствие рывка после отпускания мыши и сохранение переносов строк', () => {
        const heightJump = Math.abs(finalSnapshot.groupBoundsHeight - minimumSnapshot.groupBoundsHeight)
        const widthJump = Math.abs(finalSnapshot.groupBoundsWidth - minimumSnapshot.groupBoundsWidth)
        const topJump = Math.abs(finalSnapshot.groupBoundsTop - minimumSnapshot.groupBoundsTop)
        const bottomJump = Math.abs(finalSnapshot.groupBoundsBottom - minimumSnapshot.groupBoundsBottom)

        expect(heightJump).toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
        expect(widthJump).toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
        expect(topJump).toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
        expect(bottomJump).toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
        expect(finalText?.fontSize).toBe(initialText?.fontSize)
        expect(finalText?.lineCount).toBe(initialText?.lineCount)
        shapes.checkNodeInsideGroup({ snapshot: finalSnapshot, kind: 'shape' })
        shapes.checkNodeInsideGroup({ snapshot: finalSnapshot, kind: 'text' })
      })
    })
  })

  test('после сужения шейпа и переноса текста на новую строку минимальная высота становится больше', async({
    shapes
  }) => {
    await test.step('Добавить широкий шейп с текстом в одну строку', async() => {
      const shape = await shapes.add({
        presetKey: 'square',
        options: {
          width: 300,
          height: 320,
          text: 'TEST TEST',
          textStyle: {
            fontSize: 72
          }
        }
      })

      shapes.checkCreation({
        shape,
        presetKey: 'square'
      })
    })

    const initialText = await test.step('Получить исходное состояние текста', async() => {
      return shapes.getTextNode({ objectIndex: 0 })
    })

    await test.step('Сжать широкий шейп по вертикали до упора в текст и зафиксировать состояние', async() => {
      await shapes.shrinkToMinimumHeight({ objectIndex: 0 })
      await shapes.finishScale({ objectIndex: 0 })
    })

    const wideMinimumSnapshot = await test.step('Получить состояние широкого шейпа после сжатия по высоте', async() => {
      return shapes.getScaleSnapshot({ objectIndex: 0 })
    })

    await test.step('Сузить шейп по горизонтали до переноса текста и зафиксировать ширину', async() => {
      await shapes.scaleHorizontallyFromRight({
        scaleX: 0.55,
        objectIndex: 0
      })
      await shapes.finishScale({ objectIndex: 0 })
    })

    const wrappedSnapshot = await test.step('Получить состояние шейпа после переноса текста на новую строку', async() => {
      return shapes.getScaleSnapshot({ objectIndex: 0 })
    })

    const wrappedText = await test.step('Получить состояние текста после переноса на новую строку', async() => {
      return shapes.getTextNode({ objectIndex: 0 })
    })

    await test.step('Попробовать ещё раз сжать узкий шейп по вертикали и зафиксировать результат', async() => {
      await shapes.shrinkToMinimumHeight({ objectIndex: 0 })
      await shapes.finishScale({ objectIndex: 0 })
    })

    const finalSnapshot = await test.step('Получить состояние шейпа после повторного сжатия по высоте', async() => {
      return shapes.getScaleSnapshot({ objectIndex: 0 })
    })

    const finalText = await test.step('Получить состояние текста после повторного сжатия по высоте', async() => {
      return shapes.getTextNode({ objectIndex: 0 })
    })

    await test.step('Проверить что перенос на новую строку увеличил минимальную высоту, а повторное сужение осталось стабильным', () => {
      const heightJump = Math.abs(finalSnapshot.groupBoundsHeight - wrappedSnapshot.groupBoundsHeight)
      const topJump = Math.abs(finalSnapshot.groupBoundsTop - wrappedSnapshot.groupBoundsTop)
      const bottomJump = Math.abs(finalSnapshot.groupBoundsBottom - wrappedSnapshot.groupBoundsBottom)

      expect(wrappedText?.lineCount).toBeGreaterThan(initialText?.lineCount ?? 0)
      expect(wrappedSnapshot.groupBoundsHeight)
        .toBeGreaterThan(wideMinimumSnapshot.groupBoundsHeight + SHAPE_SCALING_TOLERANCE.direction)
      expect(heightJump).toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
      expect(topJump).toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
      expect(bottomJump).toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
      expect(finalText?.fontSize).toBe(initialText?.fontSize)
      expect(finalText?.lineCount).toBe(wrappedText?.lineCount)
      shapes.checkNodeInsideGroup({ snapshot: finalSnapshot, kind: 'shape' })
      shapes.checkNodeInsideGroup({ snapshot: finalSnapshot, kind: 'text' })
    })
  })
})

test.describe('После упора по высоте шейп продолжает нормально меняться по ширине', () => {
  test('после упора в текст по высоте шейп продолжает сужаться по ширине без рывка после отпускания мыши', async({
    shapes
  }) => {
    await test.step('Добавить шейп с текстом и запасом по высоте', async() => {
      const shape = await shapes.add({
        presetKey: 'square',
        options: {
          width: 220,
          height: 320,
          text: 'TEST TEST',
          textStyle: {
            fontSize: 72
          }
        }
      })

      shapes.checkCreation({
        shape,
        presetKey: 'square'
      })
    })

    await test.step('Сжать шейп по вертикали до упора в текст и зафиксировать состояние', async() => {
      await shapes.shrinkToMinimumHeight({ objectIndex: 0 })
      await shapes.finishScale({ objectIndex: 0 })
    })

    const minimumHeightSnapshot = await test.step('Получить состояние шейпа после сжатия по высоте', async() => {
      return shapes.getScaleSnapshot({ objectIndex: 0 })
    })

    const liveSnapshot = await test.step('Сузить тот же шейп по горизонтали до переноса строк', async() => {
      return shapes.scaleHorizontallyFromRight({
        scaleX: 0.55,
        objectIndex: 0
      })
    })
    const liveText = await test.step('Получить состояние текста во время сужения по ширине', async() => {
      return shapes.getTextNode({ objectIndex: 0 })
    })

    await test.step('Проверить что шейп действительно сужается по ширине, а текст и шейп остаются внутри границ группы', () => {
      expect(liveSnapshot.groupBoundsWidth)
        .toBeLessThan(minimumHeightSnapshot.groupBoundsWidth - SHAPE_SCALING_TOLERANCE.direction)
      expect(liveText?.lineCount).toBeGreaterThan(1)
      shapes.checkNodeInsideGroup({ snapshot: liveSnapshot, kind: 'shape' })
      shapes.checkNodeInsideGroup({ snapshot: liveSnapshot, kind: 'text' })
    })

    const finalSnapshot = await test.step('Завершить скейлинг по ширине и получить финальное состояние', async() => {
      return shapes.finishScale({ objectIndex: 0 })
    })

    await test.step('Проверить отсутствие рывка после отпускания мыши', () => {
      const widthJump = Math.abs(finalSnapshot.groupBoundsWidth - liveSnapshot.groupBoundsWidth)
      const heightJump = Math.abs(finalSnapshot.groupBoundsHeight - liveSnapshot.groupBoundsHeight)
      const rightJump = Math.abs(finalSnapshot.groupBoundsRight - liveSnapshot.groupBoundsRight)
      const bottomJump = Math.abs(finalSnapshot.groupBoundsBottom - liveSnapshot.groupBoundsBottom)

      expect(widthJump).toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
      expect(heightJump).toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
      expect(rightJump).toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
      expect(bottomJump).toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
      shapes.checkNodeInsideGroup({ snapshot: finalSnapshot, kind: 'shape' })
      shapes.checkNodeInsideGroup({ snapshot: finalSnapshot, kind: 'text' })
    })
  })

  test('после упора в минимальную ширину и минимальную высоту шейп снова расширяется по ширине', async({
    shapes
  }) => {
    await test.step('Добавить шейп с текстом', async() => {
      const shape = await shapes.add({
        presetKey: 'square',
        options: {
          width: 220,
          height: 320,
          text: 'TEST',
          textStyle: {
            fontSize: 72
          }
        }
      })

      shapes.checkCreation({
        shape,
        presetKey: 'square'
      })
    })

    await test.step('Сжать шейп до минимальной ширины и зафиксировать состояние', async() => {
      await shapes.shrinkToMinimumWidth({ objectIndex: 0 })
      await shapes.finishScale({ objectIndex: 0 })
    })

    await test.step('Сжать шейп до упора в текст и зафиксировать состояние', async() => {
      await shapes.shrinkToMinimumHeight({ objectIndex: 0 })
      await shapes.finishScale({ objectIndex: 0 })
    })

    const minimumSnapshot = await test.step('Получить состояние после упора в минимальную ширину и минимальную высоту', async() => {
      return shapes.getScaleSnapshot({ objectIndex: 0 })
    })

    const liveSnapshot = await test.step('Сразу растянуть шейп обратно по горизонтали', async() => {
      return shapes.scaleHorizontallyFromRight({
        scaleX: 1.4,
        objectIndex: 0
      })
    })

    await test.step('Проверить что ширина снова растёт, а текст и шейп остаются внутри границ группы', () => {
      expect(liveSnapshot.groupBoundsWidth)
        .toBeGreaterThan(minimumSnapshot.groupBoundsWidth + SHAPE_SCALING_TOLERANCE.direction)
      shapes.checkNodeInsideGroup({ snapshot: liveSnapshot, kind: 'shape' })
      shapes.checkNodeInsideGroup({ snapshot: liveSnapshot, kind: 'text' })
    })

    const finalSnapshot = await test.step('Завершить скейлинг по ширине и получить финальное состояние', async() => {
      return shapes.finishScale({ objectIndex: 0 })
    })

    await test.step('Проверить отсутствие рывка после отпускания мыши', () => {
      const widthJump = Math.abs(finalSnapshot.groupBoundsWidth - liveSnapshot.groupBoundsWidth)
      const heightJump = Math.abs(finalSnapshot.groupBoundsHeight - liveSnapshot.groupBoundsHeight)

      expect(widthJump).toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
      expect(heightJump).toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
      shapes.checkNodeInsideGroup({ snapshot: finalSnapshot, kind: 'shape' })
      shapes.checkNodeInsideGroup({ snapshot: finalSnapshot, kind: 'text' })
    })
  })
})

test.describe('Скейлинг шейпа с текстом по диагонали', () => {
  test('при скейлинге по диагонали с зажатым Shift квадратный шейп остаётся пропорциональным', async({
    shapes
  }) => {
    await test.step('Добавить квадратный шейп с текстом', async() => {
      await shapes.addShapeWithText({
        presetKey: 'square',
        width: 220,
        height: 220,
        text: 'TEST',
        fontSize: 72
      })
    })

    const initialSnapshot = await test.step('Получить исходное состояние квадратного шейпа', async() => {
      return shapes.getScaleSnapshot({ objectIndex: 0 })
    })

    const liveSnapshot = await test.step('Скейлить шейп по диагонали пропорционально с Shift', async() => {
      return shapes.scaleDiagonallyProportionally({
        scale: 1.4,
        corner: 'br',
        objectIndex: 0
      })
    })

    await test.step('Проверить что ширина и высота выросли одинаково уже во время скейлинга', () => {
      const proportionalDiff = Math.abs(liveSnapshot.groupBoundsWidth - liveSnapshot.groupBoundsHeight)

      expect(liveSnapshot.groupBoundsWidth)
        .toBeGreaterThan(initialSnapshot.groupBoundsWidth + SHAPE_SCALING_TOLERANCE.direction)
      expect(liveSnapshot.groupBoundsHeight)
        .toBeGreaterThan(initialSnapshot.groupBoundsHeight + SHAPE_SCALING_TOLERANCE.direction)
      expect(proportionalDiff).toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
      shapes.checkNodeInsideGroup({ snapshot: liveSnapshot, kind: 'shape' })
      shapes.checkNodeInsideGroup({ snapshot: liveSnapshot, kind: 'text' })
    })

    const finalSnapshot = await test.step('Завершить скейлинг и получить финальное состояние', async() => {
      return shapes.finishScale({ objectIndex: 0 })
    })

    await test.step('Проверить что после отпускания мыши шейп остался пропорциональным', async() => {
      const widthJump = Math.abs(finalSnapshot.groupBoundsWidth - liveSnapshot.groupBoundsWidth)
      const heightJump = Math.abs(finalSnapshot.groupBoundsHeight - liveSnapshot.groupBoundsHeight)
      const proportionalDiff = Math.abs(finalSnapshot.groupBoundsWidth - finalSnapshot.groupBoundsHeight)
      const shape = await shapes.getFirstShape()

      expect(widthJump).toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
      expect(heightJump).toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
      expect(proportionalDiff).toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
      expect(Math.abs(shape.width - shape.height)).toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
      expect(shape.scaleX).toBe(1)
      expect(shape.scaleY).toBe(1)
    })
  })

  test('при скейлинге по диагонали без Shift квадратный шейп может стать непропорциональным', async({
    shapes
  }) => {
    await test.step('Добавить пропорциональный квадратный шейп с текстом', async() => {
      await shapes.addShapeWithText({
        presetKey: 'square',
        width: 220,
        height: 220,
        text: 'TEST',
        fontSize: 72
      })
    })

    const initialSnapshot = await test.step('Получить исходное состояние пропорционального шейпа', async() => {
      return shapes.getScaleSnapshot({ objectIndex: 0 })
    })

    const liveSnapshot = await test.step('Скейлить шейп по диагонали без Shift', async() => {
      return shapes.scaleDiagonally({
        scaleX: 1.4,
        scaleY: 0.7,
        corner: 'br',
        objectIndex: 0
      })
    })

    await test.step('Проверить что шейп стал непропорциональным уже во время скейлинга', () => {
      expect(liveSnapshot.groupBoundsWidth)
        .toBeGreaterThan(initialSnapshot.groupBoundsWidth + SHAPE_SCALING_TOLERANCE.direction)
      expect(liveSnapshot.groupBoundsHeight)
        .toBeLessThan(initialSnapshot.groupBoundsHeight - SHAPE_SCALING_TOLERANCE.direction)
      expect(Math.abs(liveSnapshot.groupBoundsWidth - liveSnapshot.groupBoundsHeight))
        .toBeGreaterThan(SHAPE_SCALING_TOLERANCE.direction)
      shapes.checkNodeInsideGroup({ snapshot: liveSnapshot, kind: 'shape' })
      shapes.checkNodeInsideGroup({ snapshot: liveSnapshot, kind: 'text' })
    })

    const finalSnapshot = await test.step('Завершить скейлинг и получить финальное состояние', async() => {
      return shapes.finishScale({ objectIndex: 0 })
    })

    await test.step('Проверить что непропорциональный результат сохранился без рывка', async() => {
      const widthJump = Math.abs(finalSnapshot.groupBoundsWidth - liveSnapshot.groupBoundsWidth)
      const heightJump = Math.abs(finalSnapshot.groupBoundsHeight - liveSnapshot.groupBoundsHeight)
      const shape = await shapes.getFirstShape()

      expect(widthJump).toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
      expect(heightJump).toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
      expect(Math.abs(shape.width - shape.height)).toBeGreaterThan(SHAPE_SCALING_TOLERANCE.direction)
      expect(shape.scaleX).toBe(1)
      expect(shape.scaleY).toBe(1)
    })
  })

  test('при скейлинге по диагонали текст в одну строку сразу переносится и увеличивает высоту шейпа', async({
    shapes
  }) => {
    await test.step('Добавить шейп с текстом в одну строку и минимальной высотой', async() => {
      await shapes.addShapeWithText({
        presetKey: 'square',
        width: 220,
        height: 120,
        text: 'TEST',
        fontSize: 72
      })
    })

    const initialSnapshot = await test.step('Получить исходное состояние шейпа', async() => {
      return shapes.getScaleSnapshot({ objectIndex: 0 })
    })
    const initialText = await test.step('Получить исходное состояние текста', async() => {
      return shapes.getTextNode({ objectIndex: 0 })
    })

    const liveSnapshot = await test.step('Сжать шейп по диагонали за верхний правый угол', async() => {
      return shapes.scaleDiagonally({
        scaleX: 0.45,
        scaleY: 0.6,
        corner: 'tr',
        objectIndex: 0
      })
    })
    const liveText = await test.step('Получить состояние текста во время уменьшения ширины путём скейлинга по диагонали', async() => {
      return shapes.getTextNode({ objectIndex: 0 })
    })

    await test.step('Проверить что текст начал переноситься, а высота шейпа выросла', () => {
      expect(liveSnapshot.groupBoundsWidth)
        .toBeLessThan(initialSnapshot.groupBoundsWidth - SHAPE_SCALING_TOLERANCE.direction)
      expect(liveSnapshot.groupBoundsHeight)
        .toBeGreaterThan(initialSnapshot.groupBoundsHeight + SHAPE_SCALING_TOLERANCE.direction)
      expect(liveText?.lineCount).toBeGreaterThan(initialText?.lineCount ?? 0)
      shapes.checkNodeInsideGroup({ snapshot: liveSnapshot, kind: 'shape' })
      shapes.checkNodeInsideGroup({ snapshot: liveSnapshot, kind: 'text' })
    })

    const finalSnapshot = await test.step('Завершить скейлинг и получить финальное состояние', async() => {
      return shapes.finishScale({ objectIndex: 0 })
    })

    await test.step('Проверить отсутствие рывка после отпускания мыши', () => {
      const widthJump = Math.abs(finalSnapshot.groupBoundsWidth - liveSnapshot.groupBoundsWidth)
      const heightJump = Math.abs(finalSnapshot.groupBoundsHeight - liveSnapshot.groupBoundsHeight)

      expect(widthJump).toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
      expect(heightJump).toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
      shapes.checkNodeInsideGroup({ snapshot: finalSnapshot, kind: 'shape' })
      shapes.checkNodeInsideGroup({ snapshot: finalSnapshot, kind: 'text' })
    })
  })

  test('после уменьшения ширины шейпа и обратного её увеличения высота возвращается к исходной высоте текста в одну строку', async({
    shapes
  }) => {
    await test.step('Добавить шейп с текстом в одну строку и минимальной высотой', async() => {
      await shapes.addShapeWithText({
        presetKey: 'square',
        width: 220,
        height: 120,
        text: 'TEST',
        fontSize: 72
      })
    })

    const initialSnapshot = await test.step('Получить исходное состояние шейпа', async() => {
      return shapes.getScaleSnapshot({ objectIndex: 0 })
    })
    const initialText = await test.step('Получить исходное состояние текста', async() => {
      return shapes.getTextNode({ objectIndex: 0 })
    })

    await test.step('Сузить шейп по горизонтали до переноса строк и зафиксировать состояние', async() => {
      await shapes.scaleHorizontallyFromRight({
        scaleX: 0.3,
        objectIndex: 0
      })
      await shapes.finishScale({ objectIndex: 0 })
    })

    const wrappedSnapshot = await test.step('Получить состояние шейпа после переноса текста на новую строку', async() => {
      return shapes.getScaleSnapshot({ objectIndex: 0 })
    })
    const wrappedText = await test.step('Получить состояние текста после переноса на новую строку', async() => {
      return shapes.getTextNode({ objectIndex: 0 })
    })

    await test.step('Проверить что сужение действительно увеличило высоту и число строк', () => {
      expect(wrappedSnapshot.groupBoundsHeight)
        .toBeGreaterThan(initialSnapshot.groupBoundsHeight + SHAPE_SCALING_TOLERANCE.direction)
      expect(wrappedText?.lineCount).toBeGreaterThan(initialText?.lineCount ?? 0)
    })

    await test.step('Расширить шейп обратно и зафиксировать состояние', async() => {
      await shapes.scaleHorizontallyFromRight({
        scaleX: 4.5,
        objectIndex: 0
      })
      await shapes.finishScale({ objectIndex: 0 })
    })

    const expandedSnapshot = await test.step('Получить состояние после обратного расширения', async() => {
      return shapes.getScaleSnapshot({ objectIndex: 0 })
    })
    const expandedText = await test.step('Получить состояние текста после обратного расширения', async() => {
      return shapes.getTextNode({ objectIndex: 0 })
    })

    await test.step('Проверить возврат к исходной высоте и одной строке текста', () => {
      const heightDiff = Math.abs(expandedSnapshot.groupBoundsHeight - initialSnapshot.groupBoundsHeight)

      expect(expandedSnapshot.groupBoundsWidth)
        .toBeGreaterThan(wrappedSnapshot.groupBoundsWidth + SHAPE_SCALING_TOLERANCE.direction)
      expect(heightDiff).toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
      expect(expandedText?.lineCount).toBe(initialText?.lineCount)
      shapes.checkNodeInsideGroup({ snapshot: expandedSnapshot, kind: 'shape' })
      shapes.checkNodeInsideGroup({ snapshot: expandedSnapshot, kind: 'text' })
    })
  })

  // eslint-disable-next-line max-len
  test('если двухстрочный текст уже упёрся в минимальную высоту, при уменьшении ширины путём скейлинга по диагонали текст начинает переноситься', async({
    shapes
  }) => {
    await test.step('Добавить шейп с двухстрочным текстом', async() => {
      await shapes.addShapeWithText({
        presetKey: 'square',
        width: 220,
        height: 220,
        text: 'TEST\nTEST',
        fontSize: 48
      })
    })

    await test.step('Сжать шейп по вертикали до упора в текст и зафиксировать состояние', async() => {
      await shapes.shrinkToMinimumHeight({ objectIndex: 0 })
      await shapes.finishScale({ objectIndex: 0 })
    })

    const initialSnapshot = await test.step('Получить состояние шейпа после сжатия двухстрочного текста', async() => {
      return shapes.getScaleSnapshot({ objectIndex: 0 })
    })
    const initialText = await test.step('Получить состояние двухстрочного текста после сжатия', async() => {
      return shapes.getTextNode({ objectIndex: 0 })
    })

    const liveSnapshot = await test.step('Сжать шейп по диагонали за верхний правый угол', async() => {
      return shapes.scaleDiagonally({
        scaleX: 0.5,
        scaleY: 0.8,
        corner: 'tr',
        objectIndex: 0
      })
    })
    const liveText = await test.step('Получить состояние текста во время скейлинга по диагонали', async() => {
      return shapes.getTextNode({ objectIndex: 0 })
    })

    await test.step('Проверить что текст сразу переносится дальше, а высота продолжает расти', () => {
      expect(liveSnapshot.groupBoundsWidth)
        .toBeLessThan(initialSnapshot.groupBoundsWidth - SHAPE_SCALING_TOLERANCE.direction)
      expect(liveSnapshot.groupBoundsHeight)
        .toBeGreaterThan(initialSnapshot.groupBoundsHeight + SHAPE_SCALING_TOLERANCE.direction)
      expect(liveText?.lineCount).toBeGreaterThan(initialText?.lineCount ?? 0)
      shapes.checkNodeInsideGroup({ snapshot: liveSnapshot, kind: 'shape' })
      shapes.checkNodeInsideGroup({ snapshot: liveSnapshot, kind: 'text' })
    })
  })
})

test.describe('Скейлинг пустого шейпа по диагонали', () => {
  test.beforeEach(async({ shapes }) => {
    await shapes.addEmptyTextShape()
  })

  test('после сжатия почти до вертикальной линии можно продолжать менять высоту, не отпуская мышь', async({
    shapes
  }) => {
    const nearVerticalLineSnapshot = await test.step('Почти схлопнуть ширину шейпа скейлингом по диагонали', async() => {
      return shapes.scaleDiagonally({
        scaleX: 0.01,
        scaleY: 0.8,
        corner: 'br',
        objectIndex: 0
      })
    })

    const tallerSnapshot = await test.step('Не отпуская мышь, продолжить тянуть шейп по высоте', async() => {
      return shapes.scaleDiagonally({
        scaleX: 0.01,
        scaleY: 1.4,
        corner: 'br',
        objectIndex: 0
      })
    })

    await test.step('Проверить что высота продолжает меняться даже при почти нулевой ширине', () => {
      const widthDrift = Math.abs(tallerSnapshot.groupBoundsWidth - nearVerticalLineSnapshot.groupBoundsWidth)

      expect(tallerSnapshot.groupBoundsHeight)
        .toBeGreaterThan(nearVerticalLineSnapshot.groupBoundsHeight + SHAPE_SCALING_TOLERANCE.direction)
      expect(widthDrift).toBeLessThanOrEqual(2)
      shapes.checkNodeInsideGroup({ snapshot: tallerSnapshot, kind: 'shape' })
    })

    const finalSnapshot = await test.step('Завершить скейлинг и получить финальное состояние', async() => {
      return shapes.finishScale({ objectIndex: 0 })
    })

    await test.step('Проверить отсутствие рывка после отпускания мыши', () => {
      const widthJump = Math.abs(finalSnapshot.groupBoundsWidth - tallerSnapshot.groupBoundsWidth)
      const heightJump = Math.abs(finalSnapshot.groupBoundsHeight - tallerSnapshot.groupBoundsHeight)

      expect(widthJump).toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
      expect(heightJump).toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
    })
  })

  test('после сжатия почти до горизонтальной линии можно продолжать менять ширину, не отпуская мышь', async({
    shapes
  }) => {
    const nearHorizontalLineSnapshot = await test.step('Почти схлопнуть высоту шейпа скейлингом по диагонали', async() => {
      return shapes.scaleDiagonally({
        scaleX: 0.8,
        scaleY: 0.01,
        corner: 'br',
        objectIndex: 0
      })
    })

    const widerSnapshot = await test.step('Не отпуская мышь, продолжить тянуть шейп по ширине', async() => {
      return shapes.scaleDiagonally({
        scaleX: 1.4,
        scaleY: 0.01,
        corner: 'br',
        objectIndex: 0
      })
    })

    await test.step('Проверить что ширина продолжает меняться даже при почти нулевой высоте', () => {
      const heightDrift = Math.abs(widerSnapshot.groupBoundsHeight - nearHorizontalLineSnapshot.groupBoundsHeight)

      expect(widerSnapshot.groupBoundsWidth)
        .toBeGreaterThan(nearHorizontalLineSnapshot.groupBoundsWidth + SHAPE_SCALING_TOLERANCE.direction)
      expect(heightDrift).toBeLessThanOrEqual(2)
      shapes.checkNodeInsideGroup({ snapshot: widerSnapshot, kind: 'shape' })
    })

    const finalSnapshot = await test.step('Завершить скейлинг и получить финальное состояние', async() => {
      return shapes.finishScale({ objectIndex: 0 })
    })

    await test.step('Проверить отсутствие рывка после отпускания мыши', () => {
      const widthJump = Math.abs(finalSnapshot.groupBoundsWidth - widerSnapshot.groupBoundsWidth)
      const heightJump = Math.abs(finalSnapshot.groupBoundsHeight - widerSnapshot.groupBoundsHeight)

      expect(widthJump).toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
      expect(heightJump).toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
    })
  })
})

test.describe('Масштабирование скругления', () => {
  test('скругление масштабируется пропорционально при равномерном увеличении', async({ shapes }) => {
    await test.step('Добавить прямоугольник со скруглением 50', async() => {
      await shapes.add({ presetKey: 'square' })
      await shapes.setRounding({ rounding: 50, objectIndex: 0 })
    })

    await test.step('Увеличить шейп в 2 раза', () => shapes.simulateScale({ scaleX: 2, scaleY: 2, objectIndex: 0 }))

    await test.step('Проверить что скругление удвоилось', async() => {
      const shape = await shapes.getFirstShape()
      expect(shape.shapeRounding).toBe(100)
    })
  })

  test('скругление масштабируется пропорционально при уменьшении', async({ shapes }) => {
    await test.step('Добавить прямоугольник со скруглением 80', async() => {
      await shapes.add({ presetKey: 'square' })
      await shapes.setRounding({ rounding: 80, objectIndex: 0 })
    })

    await test.step('Уменьшить шейп в 2 раза', () => shapes.simulateScale({ scaleX: 0.5, scaleY: 0.5, objectIndex: 0 }))

    await test.step('Проверить что скругление уменьшилось вдвое', async() => {
      const shape = await shapes.getFirstShape()
      expect(shape.shapeRounding).toBe(40)
    })
  })

  test('скругление масштабируется по меньшему коэффициенту при непропорциональном растяжении', async({ shapes }) => {
    await test.step('Добавить прямоугольник со скруглением 50', async() => {
      await shapes.add({ presetKey: 'square' })
      await shapes.setRounding({ rounding: 50, objectIndex: 0 })
    })

    await test.step('Растянуть шейп непропорционально (ширина x3, высота x2)', () => {
      return shapes.simulateScale({ scaleX: 3, scaleY: 2, objectIndex: 0 })
    })

    await test.step('Проверить что скругление увеличилось по меньшему коэффициенту', async() => {
      const shape = await shapes.getFirstShape()
      expect(shape.shapeRounding).toBe(100)
    })
  })
})

test.describe('Скейлинг шейпа с обводкой', () => {
  test('при быстрых реверсах шейп меняет размер без смещения и рывка', async({ shapes }) => {
    const liveSnapshots: ShapeScaleSnapshot[] = []

    await test.step('Добавить квадрат и включить обводку', async() => {
      await shapes.add({ presetKey: 'square' })
      await shapes.setStroke({
        stroke: '#0a84ff',
        strokeWidth: SHAPE_SCALING_STROKE_WIDTH,
        objectIndex: 0
      })
    })

    await test.step('Несколько раз быстро поменять направление скейлинга', async() => {
      for (let index = 0; index < SHAPE_SCALING_LIVE_REVERSE_STEPS.length; index += 1) {
        const {
          scaleX,
          scaleY
        } = SHAPE_SCALING_LIVE_REVERSE_STEPS[index]
        const snapshot = await shapes.simulateScaleStep({
          scaleX,
          scaleY,
          corner: 'br',
          originX: 'left',
          originY: 'top',
          objectIndex: 0
        })

        liveSnapshots.push(snapshot)
      }
    })

    await test.step('Проверить что левая верхняя точка остаётся на месте во время скейлинга', () => {
      const firstLiveSnapshot = liveSnapshots[0]

      expect(firstLiveSnapshot, 'должно существовать первое состояние фигуры для проверки левой верхней точки').toBeDefined()

      if (!firstLiveSnapshot) {
        throw new Error('должно существовать первое состояние фигуры для проверки левой верхней точки')
      }

      for (let index = 0; index < liveSnapshots.length; index += 1) {
        const snapshot = liveSnapshots[index]
        const leftDiff = Math.abs(snapshot.groupBoundsLeft - firstLiveSnapshot.groupBoundsLeft)
        const topDiff = Math.abs(snapshot.groupBoundsTop - firstLiveSnapshot.groupBoundsTop)

        expect(leftDiff).toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.anchor)
        expect(topDiff).toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.anchor)
      }

      for (let index = 1; index < liveSnapshots.length; index += 1) {
        const previous = liveSnapshots[index - 1]
        const current = liveSnapshots[index]
        const leftStepDiff = Math.abs(current.groupBoundsLeft - previous.groupBoundsLeft)
        const topStepDiff = Math.abs(current.groupBoundsTop - previous.groupBoundsTop)

        expect(leftStepDiff).toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.anchor)
        expect(topStepDiff).toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.anchor)
      }
    })

    await test.step('Проверить что изменение ширины двигает правую границу в ожидаемую сторону', () => {
      for (let index = 1; index < liveSnapshots.length; index += 1) {
        const previousSnapshot = liveSnapshots[index - 1]
        const currentSnapshot = liveSnapshots[index]
        const previousStep = SHAPE_SCALING_LIVE_REVERSE_STEPS[index - 1]
        const currentStep = SHAPE_SCALING_LIVE_REVERSE_STEPS[index]
        const deltaScaleX = currentStep.scaleX - previousStep.scaleX

        if (deltaScaleX === 0) {
          continue
        }

        if (deltaScaleX > 0) {
          expect(currentSnapshot.groupBoundsRight)
            .toBeGreaterThan(previousSnapshot.groupBoundsRight - SHAPE_SCALING_TOLERANCE.direction)
        }

        if (deltaScaleX < 0) {
          expect(currentSnapshot.groupBoundsRight)
            .toBeLessThan(previousSnapshot.groupBoundsRight + SHAPE_SCALING_TOLERANCE.direction)
        }
      }
    })

    await test.step('Проверить что изменение высоты двигает нижнюю границу в ожидаемую сторону', () => {
      for (let index = 1; index < liveSnapshots.length; index += 1) {
        const previousSnapshot = liveSnapshots[index - 1]
        const currentSnapshot = liveSnapshots[index]
        const previousStep = SHAPE_SCALING_LIVE_REVERSE_STEPS[index - 1]
        const currentStep = SHAPE_SCALING_LIVE_REVERSE_STEPS[index]
        const deltaScaleY = currentStep.scaleY - previousStep.scaleY

        if (deltaScaleY === 0) {
          continue
        }

        if (deltaScaleY > 0) {
          expect(currentSnapshot.groupBoundsBottom)
            .toBeGreaterThan(previousSnapshot.groupBoundsBottom - SHAPE_SCALING_TOLERANCE.direction)
        }

        if (deltaScaleY < 0) {
          expect(currentSnapshot.groupBoundsBottom)
            .toBeLessThan(previousSnapshot.groupBoundsBottom + SHAPE_SCALING_TOLERANCE.direction)
        }
      }
    })

    await test.step('Проверить что обводка не меняется, а шейп совпадает с границами группы во время скейлинга', () => {
      for (let index = 0; index < liveSnapshots.length; index += 1) {
        const snapshot = liveSnapshots[index]
        expect(snapshot.shapeStrokeWidth).toBe(SHAPE_SCALING_STROKE_WIDTH)
        expect(snapshot.shapeStrokeUniform).toBe(true)

        expect(snapshot.shapeBoundsWidth).not.toBeNull()
        expect(snapshot.shapeBoundsHeight).not.toBeNull()

        if (snapshot.shapeBoundsWidth !== null) {
          const widthDiff = Math.abs(snapshot.groupBoundsWidth - snapshot.shapeBoundsWidth)
          expect(widthDiff).toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.bbox)
        }

        if (snapshot.shapeBoundsHeight !== null) {
          const heightDiff = Math.abs(snapshot.groupBoundsHeight - snapshot.shapeBoundsHeight)
          expect(heightDiff).toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.bbox)
        }
      }
    })

    const snapshotBeforeMouseUp = liveSnapshots[liveSnapshots.length - 1]

    expect(snapshotBeforeMouseUp, 'должно существовать последнее состояние фигуры перед отпусканием мыши').toBeDefined()

    if (!snapshotBeforeMouseUp) {
      throw new Error('должно существовать последнее состояние фигуры перед отпусканием мыши')
    }

    const finalSnapshot = await test.step('Завершить скейлинг и получить финальное состояние', async() => {
      return shapes.finishScale({ objectIndex: 0 })
    })

    await test.step('Проверить отсутствие рывка после отпускания мыши', () => {
      const leftJump = Math.abs(finalSnapshot.groupBoundsLeft - snapshotBeforeMouseUp.groupBoundsLeft)
      const topJump = Math.abs(finalSnapshot.groupBoundsTop - snapshotBeforeMouseUp.groupBoundsTop)
      const rightJump = Math.abs(finalSnapshot.groupBoundsRight - snapshotBeforeMouseUp.groupBoundsRight)
      const bottomJump = Math.abs(finalSnapshot.groupBoundsBottom - snapshotBeforeMouseUp.groupBoundsBottom)

      expect(leftJump).toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
      expect(topJump).toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
      expect(rightJump).toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
      expect(bottomJump).toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
    })

    await test.step('Проверить что после завершения скейлинга scale сброшен и обводка сохранена', async() => {
      const shape = await shapes.getFirstShape()
      expect(shape.scaleX).toBe(1)
      expect(shape.scaleY).toBe(1)
      expect(finalSnapshot.shapeStrokeWidth).toBe(SHAPE_SCALING_STROKE_WIDTH)
      expect(finalSnapshot.shapeStrokeUniform).toBe(true)
    })
  })
})

test.describe('Интерактивный скейлинг шейпа с текстом', () => {
  test.beforeEach(async({ shapes }) => {
    await shapes.addShapeWithText()
  })

  // eslint-disable-next-line max-len
  test('при уменьшении ширины объекта путём горизонтального скейлинга текст не выходит за границы шейпа и после отпускания мыши ничего не дёргается', async({ shapes }) => {
    const initialSnapshot = await test.step('Получить исходное состояние шейпа с текстом', async() => {
      return shapes.getScaleSnapshot({ objectIndex: 0 })
    })

    const liveSnapshot = await test.step('Сузить шейп по горизонтали до переноса строк', async() => {
      return shapes.scaleHorizontallyFromRight({
        scaleX: 0.55,
        objectIndex: 0
      })
    })

    await test.step('Проверить что высота увеличилась, а текст и шейп остались внутри границ выделения', () => {
      expect(liveSnapshot.groupBoundsHeight).toBeGreaterThan(initialSnapshot.groupBoundsHeight)
      shapes.checkNodeInsideGroup({ snapshot: liveSnapshot, kind: 'shape' })
      shapes.checkNodeInsideGroup({ snapshot: liveSnapshot, kind: 'text' })
    })

    const finalSnapshot = await test.step('Завершить скейлинг и получить финальное состояние', async() => {
      return shapes.finishScale({ objectIndex: 0 })
    })

    await test.step('Проверить отсутствие рывка после отпускания мыши', () => {
      const heightJump = Math.abs(finalSnapshot.groupBoundsHeight - liveSnapshot.groupBoundsHeight)
      const bottomJump = Math.abs(finalSnapshot.groupBoundsBottom - liveSnapshot.groupBoundsBottom)

      expect(heightJump).toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
      expect(bottomJump).toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
      shapes.checkNodeInsideGroup({ snapshot: finalSnapshot, kind: 'shape' })
      shapes.checkNodeInsideGroup({ snapshot: finalSnapshot, kind: 'text' })
    })
  })

  test('после упора в минимальную ширину шейп можно сразу тянуть обратно, не отпуская мышь', async({ shapes }) => {
    const minimumSnapshot = await test.step('Сжать шейп до минимальной ширины во время скейлинга', async() => {
      return shapes.shrinkToMinimumWidth({ objectIndex: 0 })
    })

    const expandedSnapshot = await test.step('Не отпуская мышь, сразу потянуть шейп обратно вправо', async() => {
      return shapes.scaleHorizontallyFromRight({
        scaleX: 0.9,
        objectIndex: 0
      })
    })

    await test.step('Проверить что ширина снова увеличивается, а текст и шейп остаются внутри границ выделения', () => {
      expect(expandedSnapshot.groupBoundsWidth)
        .toBeGreaterThan(minimumSnapshot.groupBoundsWidth + SHAPE_SCALING_TOLERANCE.direction)
      shapes.checkNodeInsideGroup({ snapshot: expandedSnapshot, kind: 'shape' })
      shapes.checkNodeInsideGroup({ snapshot: expandedSnapshot, kind: 'text' })
    })
  })

  // eslint-disable-next-line max-len
  test('после повторного уменьшения ширины путём горизонтального скейлинга шейп приходит к той же минимальной ширине и тем же переносам строк', async({ shapes }) => {
    const firstMinimumSnapshot = await test.step('Первый раз сузить шейп до минимальной ширины', async() => {
      return shapes.shrinkToMinimumWidth({ objectIndex: 0 })
    })

    await test.step('Зафиксировать первое состояние после сужения', async() => {
      await shapes.finishScale({ objectIndex: 0 })
    })

    await test.step('Растянуть шейп обратно', async() => {
      await shapes.scaleHorizontallyFromRight({ scaleX: 2, objectIndex: 0 })

      await shapes.finishScale({ objectIndex: 0 })
    })

    const secondMinimumSnapshot = await test.step('Повторно сузить шейп до минимальной ширины', async() => {
      return shapes.shrinkToMinimumWidth({ objectIndex: 0 })
    })

    await test.step('Проверить что минимальная ширина и переносы строк совпадают в обоих циклах', () => {
      const widthDiff = Math.abs(secondMinimumSnapshot.groupBoundsWidth - firstMinimumSnapshot.groupBoundsWidth)
      const heightDiff = Math.abs(secondMinimumSnapshot.groupBoundsHeight - firstMinimumSnapshot.groupBoundsHeight)
      const textHeightDiff = Math.abs(
        (secondMinimumSnapshot.textBoundsHeight ?? 0) - (firstMinimumSnapshot.textBoundsHeight ?? 0)
      )

      expect(widthDiff).toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
      expect(heightDiff).toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
      expect(textHeightDiff).toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
      shapes.checkNodeInsideGroup({ snapshot: firstMinimumSnapshot, kind: 'shape' })
      shapes.checkNodeInsideGroup({ snapshot: firstMinimumSnapshot, kind: 'text' })
      shapes.checkNodeInsideGroup({ snapshot: secondMinimumSnapshot, kind: 'shape' })
      shapes.checkNodeInsideGroup({ snapshot: secondMinimumSnapshot, kind: 'text' })
    })
  })
})
