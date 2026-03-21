import { test, expect } from '../../fixtures/editor.fixture'
import type { ShapeScaleSnapshot } from '../../types'
import {
  SHAPE_SCALING_LIVE_REVERSE_STEPS,
  SHAPE_SCALING_STROKE_WIDTH,
  SHAPE_SCALING_TOLERANCE
} from '../../fixtures/data/shape-scaling.data'

test.describe('Вертикальное масштабирование empty-text shape', () => {
  test.beforeEach(async({ shapes }) => {
    await shapes.addEmptyTextShape()
  })

  test('быстрый shrink вниз за нижнюю ручку держит live minimum height 1px и не прыгает после mouseup', async({
    shapes
  }) => {
    const initialSnapshot = await test.step('Получить исходный snapshot', async() => {
      return shapes.getScaleSnapshot({ objectIndex: 0 })
    })

    const liveSnapshot = await test.step('Сжать shape по вертикали до minimum height в live-режиме', async() => {
      return shapes.shrinkToMinimumHeight({ objectIndex: 0 })
    })

    await test.step('Проверить что live-preview дошёл до minimum height', () => {
      expect(liveSnapshot.groupBoundsHeight).toBeLessThan(initialSnapshot.groupBoundsHeight)
      expect(liveSnapshot.groupBoundsHeight).toBeLessThanOrEqual(1 + SHAPE_SCALING_TOLERANCE.mouseupJump)
      shapes.checkNodeInsideGroup({ snapshot: liveSnapshot, kind: 'shape' })
    })

    const finalSnapshot = await test.step('Завершить scaling и получить финальный snapshot', async() => {
      return shapes.finishScale({ objectIndex: 0 })
    })

    await test.step('Проверить отсутствие прыжка после mouseup и bake в 1px', async() => {
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

  test('быстрый shrink вверх за верхнюю ручку так же удерживает minimum height 1px без прыжка после mouseup', async({
    shapes
  }) => {
    const initialSnapshot = await test.step('Получить исходный snapshot', async() => {
      return shapes.getScaleSnapshot({ objectIndex: 0 })
    })

    const liveSnapshot = await test.step('Сжать shape по вертикали за верхнюю ручку до minimum height', async() => {
      return shapes.shrinkToMinimumHeight({
        edge: 'top',
        objectIndex: 0
      })
    })

    await test.step('Проверить что live-preview дошёл до minimum height', () => {
      expect(liveSnapshot.groupBoundsHeight).toBeLessThan(initialSnapshot.groupBoundsHeight)
      expect(liveSnapshot.groupBoundsHeight).toBeLessThanOrEqual(1 + SHAPE_SCALING_TOLERANCE.mouseupJump)
      shapes.checkNodeInsideGroup({ snapshot: liveSnapshot, kind: 'shape' })
    })

    const finalSnapshot = await test.step('Завершить scaling и получить финальный snapshot', async() => {
      return shapes.finishScale({ objectIndex: 0 })
    })

    await test.step('Проверить отсутствие прыжка после mouseup и bake в 1px', async() => {
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

  test('после упора в minimum height можно сразу растягивать empty-text shape обратно без завершения drag', async({
    shapes
  }) => {
    const minimumSnapshot = await test.step('Сжать shape по вертикали до minimum height', async() => {
      return shapes.shrinkToMinimumHeight({ objectIndex: 0 })
    })

    const expandedSnapshot = await test.step('Не отпуская drag, сразу растянуть shape обратно вниз', async() => {
      return shapes.scaleVerticallyFromBottom({
        scaleY: 0.9,
        objectIndex: 0
      })
    })

    await test.step('Проверить что высота снова растёт и shape остаётся внутри bbox', () => {
      expect(expandedSnapshot.groupBoundsHeight)
        .toBeGreaterThan(minimumSnapshot.groupBoundsHeight + SHAPE_SCALING_TOLERANCE.direction)
      shapes.checkNodeInsideGroup({ snapshot: expandedSnapshot, kind: 'shape' })
    })
  })
})

test.describe('Вертикальное масштабирование shape с текстом', () => {
  test.describe('single-line text', () => {
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

    test('быстрый shrink вниз за нижнюю ручку упирается в текст без сжатия шрифта и без изменения переноса строк', async({
      shapes
    }) => {
      const initialSnapshot = await test.step('Получить исходный snapshot shape', async() => {
        return shapes.getScaleSnapshot({ objectIndex: 0 })
      })
      const initialText = await test.step('Получить исходное состояние текстового узла', async() => {
        return shapes.getTextNode({ objectIndex: 0 })
      })

      const minimumSnapshot = await test.step('Сжать shape вниз до minimum height в live-режиме', async() => {
        return shapes.shrinkToMinimumHeight({ objectIndex: 0 })
      })
      const minimumText = await test.step('Получить состояние текста на minimum height', async() => {
        return shapes.getTextNode({ objectIndex: 0 })
      })

      const blockedFurtherShrinkSnapshot = await test.step('Попробовать ещё сильнее уменьшить высоту в той же drag-сессии', async() => {
        return shapes.scaleVerticallyFromBottom({
          scaleY: 0.05,
          objectIndex: 0
        })
      })

      await test.step('Проверить что minimum height достигнут и текст не деформировался', () => {
        expect(minimumSnapshot.groupBoundsHeight).toBeLessThan(initialSnapshot.groupBoundsHeight)
        expect(Math.abs(blockedFurtherShrinkSnapshot.groupBoundsHeight - minimumSnapshot.groupBoundsHeight))
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

      const finalSnapshot = await test.step('Завершить scaling и получить финальный snapshot', async() => {
        return shapes.finishScale({ objectIndex: 0 })
      })
      const finalText = await test.step('Получить финальное состояние текстового узла', async() => {
        return shapes.getTextNode({ objectIndex: 0 })
      })

      await test.step('Проверить отсутствие прыжка после mouseup и сохранение текстового layout', () => {
        const heightJump = Math.abs(finalSnapshot.groupBoundsHeight - minimumSnapshot.groupBoundsHeight)
        const topJump = Math.abs(finalSnapshot.groupBoundsTop - minimumSnapshot.groupBoundsTop)
        const bottomJump = Math.abs(finalSnapshot.groupBoundsBottom - minimumSnapshot.groupBoundsBottom)

        expect(heightJump).toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
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

    test('быстрый shrink вверх за верхнюю ручку так же упирается в текст без изменения текстового layout', async({
      shapes
    }) => {
      const initialSnapshot = await test.step('Получить исходный snapshot shape', async() => {
        return shapes.getScaleSnapshot({ objectIndex: 0 })
      })
      const initialText = await test.step('Получить исходное состояние текста', async() => {
        return shapes.getTextNode({ objectIndex: 0 })
      })

      const minimumSnapshot = await test.step('Сжать shape вверх до minimum height в live-режиме', async() => {
        return shapes.shrinkToMinimumHeight({
          edge: 'top',
          objectIndex: 0
        })
      })
      const minimumText = await test.step('Получить состояние текста на minimum height', async() => {
        return shapes.getTextNode({ objectIndex: 0 })
      })

      await test.step('Проверить minimum height и неизменность text layout', () => {
        expect(minimumSnapshot.groupBoundsHeight).toBeLessThan(initialSnapshot.groupBoundsHeight)
        expect(minimumText?.fontSize).toBe(initialText?.fontSize)
        expect(minimumText?.lineCount).toBe(initialText?.lineCount)
        expect(Math.abs((minimumText?.width ?? 0) - (initialText?.width ?? 0)))
          .toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
        shapes.checkNodeInsideGroup({ snapshot: minimumSnapshot, kind: 'shape' })
        shapes.checkNodeInsideGroup({ snapshot: minimumSnapshot, kind: 'text' })
      })

      const finalSnapshot = await test.step('Завершить scaling и получить финальный snapshot', async() => {
        return shapes.finishScale({ objectIndex: 0 })
      })
      const finalText = await test.step('Получить финальное состояние текста', async() => {
        return shapes.getTextNode({ objectIndex: 0 })
      })

      await test.step('Проверить отсутствие прыжка после mouseup и сохранение text layout', () => {
        const heightJump = Math.abs(finalSnapshot.groupBoundsHeight - minimumSnapshot.groupBoundsHeight)
        const topJump = Math.abs(finalSnapshot.groupBoundsTop - minimumSnapshot.groupBoundsTop)
        const bottomJump = Math.abs(finalSnapshot.groupBoundsBottom - minimumSnapshot.groupBoundsBottom)

        expect(heightJump).toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
        expect(topJump).toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
        expect(bottomJump).toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
        expect(finalText?.fontSize).toBe(initialText?.fontSize)
        expect(finalText?.lineCount).toBe(initialText?.lineCount)
        shapes.checkNodeInsideGroup({ snapshot: finalSnapshot, kind: 'shape' })
        shapes.checkNodeInsideGroup({ snapshot: finalSnapshot, kind: 'text' })
      })
    })
  })

  test('minimum height становится больше после horizontal shrink, который переносит текст на следующую строку', async({
    shapes
  }) => {
    await test.step('Добавить широкий shape с текстом в одну строку', async() => {
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

    await test.step('Сжать shape по вертикали на широкой версии до minimum height и зафиксировать его', async() => {
      await shapes.shrinkToMinimumHeight({ objectIndex: 0 })
      await shapes.finishScale({ objectIndex: 0 })
    })

    const wideMinimumSnapshot = await test.step('Получить финальный snapshot wide minimum height', async() => {
      return shapes.getScaleSnapshot({ objectIndex: 0 })
    })

    await test.step('Сузить shape по горизонтали до переноса текста и зафиксировать width', async() => {
      await shapes.scaleHorizontallyFromRight({
        scaleX: 0.55,
        objectIndex: 0
      })
      await shapes.finishScale({ objectIndex: 0 })
    })

    const wrappedSnapshot = await test.step('Получить snapshot после horizontal wrap', async() => {
      return shapes.getScaleSnapshot({ objectIndex: 0 })
    })

    const wrappedText = await test.step('Получить состояние текста после horizontal wrap', async() => {
      return shapes.getTextNode({ objectIndex: 0 })
    })

    await test.step('Попробовать ещё раз сжать узкую версию по вертикали и зафиксировать стабильный результат', async() => {
      await shapes.shrinkToMinimumHeight({ objectIndex: 0 })
      await shapes.finishScale({ objectIndex: 0 })
    })

    const finalSnapshot = await test.step('Получить финальный snapshot после повторной vertical попытки', async() => {
      return shapes.getScaleSnapshot({ objectIndex: 0 })
    })

    const finalText = await test.step('Получить финальное состояние текста после повторной vertical попытки', async() => {
      return shapes.getTextNode({ objectIndex: 0 })
    })

    await test.step('Проверить что horizontal wrap уже увеличил minimum height, а повторный vertical shrink остаётся стабильным', () => {
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

test.describe('Cross-axis regressions после vertical scaling', () => {
  test('после vertical minimum height horizontal scaling продолжает работать без прыжка после mouseup', async({
    shapes
  }) => {
    await test.step('Добавить shape с текстом и запасом по высоте', async() => {
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

    await test.step('Сжать shape по вертикали до minimum height и зафиксировать состояние', async() => {
      await shapes.shrinkToMinimumHeight({ objectIndex: 0 })
      await shapes.finishScale({ objectIndex: 0 })
    })

    const liveSnapshot = await test.step('Сузить тот же shape по горизонтали до переноса строк', async() => {
      return shapes.scaleHorizontallyFromRight({
        scaleX: 0.55,
        objectIndex: 0
      })
    })
    const liveText = await test.step('Получить live-состояние текста во время horizontal scaling', async() => {
      return shapes.getTextNode({ objectIndex: 0 })
    })

    await test.step('Проверить что horizontal scaling действительно идёт и text/shape остаются внутри bbox', () => {
      expect(liveSnapshot.groupBoundsWidth).toBeLessThan(220)
      expect(liveText?.lineCount).toBeGreaterThan(1)
      shapes.checkNodeInsideGroup({ snapshot: liveSnapshot, kind: 'shape' })
      shapes.checkNodeInsideGroup({ snapshot: liveSnapshot, kind: 'text' })
    })

    const finalSnapshot = await test.step('Завершить horizontal scaling и получить финальный snapshot', async() => {
      return shapes.finishScale({ objectIndex: 0 })
    })

    await test.step('Проверить отсутствие прыжка после mouseup', () => {
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

  test('после minimum width и minimum height horizontal scaling снова расширяет shape', async({
    shapes
  }) => {
    await test.step('Добавить shape с текстом', async() => {
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

    await test.step('Сжать shape до minimum width и зафиксировать его', async() => {
      await shapes.shrinkToMinimumWidth({ objectIndex: 0 })
      await shapes.finishScale({ objectIndex: 0 })
    })

    await test.step('Сжать shape до minimum height и зафиксировать его', async() => {
      await shapes.shrinkToMinimumHeight({ objectIndex: 0 })
      await shapes.finishScale({ objectIndex: 0 })
    })

    const minimumSnapshot = await test.step('Получить snapshot после minimum width + minimum height', async() => {
      return shapes.getScaleSnapshot({ objectIndex: 0 })
    })

    const liveSnapshot = await test.step('Сразу растянуть shape обратно по горизонтали', async() => {
      return shapes.scaleHorizontallyFromRight({
        scaleX: 1.4,
        objectIndex: 0
      })
    })

    await test.step('Проверить что ширина снова растёт и text/shape остаются внутри bbox', () => {
      expect(liveSnapshot.groupBoundsWidth)
        .toBeGreaterThan(minimumSnapshot.groupBoundsWidth + SHAPE_SCALING_TOLERANCE.direction)
      shapes.checkNodeInsideGroup({ snapshot: liveSnapshot, kind: 'shape' })
      shapes.checkNodeInsideGroup({ snapshot: liveSnapshot, kind: 'text' })
    })

    const finalSnapshot = await test.step('Завершить horizontal scaling и получить финальный snapshot', async() => {
      return shapes.finishScale({ objectIndex: 0 })
    })

    await test.step('Проверить отсутствие прыжка после mouseup', () => {
      const widthJump = Math.abs(finalSnapshot.groupBoundsWidth - liveSnapshot.groupBoundsWidth)
      const heightJump = Math.abs(finalSnapshot.groupBoundsHeight - liveSnapshot.groupBoundsHeight)

      expect(widthJump).toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
      expect(heightJump).toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
      shapes.checkNodeInsideGroup({ snapshot: finalSnapshot, kind: 'shape' })
      shapes.checkNodeInsideGroup({ snapshot: finalSnapshot, kind: 'text' })
    })
  })
})

test.describe('Диагональное масштабирование shape с текстом', () => {
  test('при диагональном drag с Shift квадратный shape остаётся пропорциональным', async({
    shapes
  }) => {
    await test.step('Добавить квадратный shape с текстом', async() => {
      await shapes.addShapeWithText({
        presetKey: 'square',
        width: 220,
        height: 220,
        text: 'TEST',
        fontSize: 72
      })
    })

    const initialSnapshot = await test.step('Получить исходный snapshot квадратного shape', async() => {
      return shapes.getScaleSnapshot({ objectIndex: 0 })
    })

    const liveSnapshot = await test.step('Масштабировать shape по диагонали пропорционально с Shift', async() => {
      return shapes.scaleDiagonallyProportionally({
        scale: 1.4,
        corner: 'br',
        objectIndex: 0
      })
    })

    await test.step('Проверить что ширина и высота выросли одинаково уже в live-режиме', () => {
      const proportionalDiff = Math.abs(liveSnapshot.groupBoundsWidth - liveSnapshot.groupBoundsHeight)

      expect(liveSnapshot.groupBoundsWidth)
        .toBeGreaterThan(initialSnapshot.groupBoundsWidth + SHAPE_SCALING_TOLERANCE.direction)
      expect(liveSnapshot.groupBoundsHeight)
        .toBeGreaterThan(initialSnapshot.groupBoundsHeight + SHAPE_SCALING_TOLERANCE.direction)
      expect(proportionalDiff).toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
      shapes.checkNodeInsideGroup({ snapshot: liveSnapshot, kind: 'shape' })
      shapes.checkNodeInsideGroup({ snapshot: liveSnapshot, kind: 'text' })
    })

    const finalSnapshot = await test.step('Завершить proportional scaling и получить финальный snapshot', async() => {
      return shapes.finishScale({ objectIndex: 0 })
    })

    await test.step('Проверить что после mouseup shape остался пропорциональным', async() => {
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

  test('corner scaling без Shift может сделать пропорциональный shape непропорциональным', async({
    shapes
  }) => {
    await test.step('Добавить пропорциональный square shape с текстом', async() => {
      await shapes.addShapeWithText({
        presetKey: 'square',
        width: 220,
        height: 220,
        text: 'TEST',
        fontSize: 72
      })
    })

    const initialSnapshot = await test.step('Получить исходный snapshot пропорционального shape', async() => {
      return shapes.getScaleSnapshot({ objectIndex: 0 })
    })

    const liveSnapshot = await test.step('Масштабировать shape по диагонали без Shift', async() => {
      return shapes.scaleDiagonally({
        scaleX: 1.4,
        scaleY: 0.7,
        corner: 'br',
        objectIndex: 0
      })
    })

    await test.step('Проверить что shape стал непропорциональным уже в live-режиме', () => {
      expect(liveSnapshot.groupBoundsWidth)
        .toBeGreaterThan(initialSnapshot.groupBoundsWidth + SHAPE_SCALING_TOLERANCE.direction)
      expect(liveSnapshot.groupBoundsHeight)
        .toBeLessThan(initialSnapshot.groupBoundsHeight - SHAPE_SCALING_TOLERANCE.direction)
      expect(Math.abs(liveSnapshot.groupBoundsWidth - liveSnapshot.groupBoundsHeight))
        .toBeGreaterThan(SHAPE_SCALING_TOLERANCE.direction)
      shapes.checkNodeInsideGroup({ snapshot: liveSnapshot, kind: 'shape' })
      shapes.checkNodeInsideGroup({ snapshot: liveSnapshot, kind: 'text' })
    })

    const finalSnapshot = await test.step('Завершить diagonal scaling и получить финальный snapshot', async() => {
      return shapes.finishScale({ objectIndex: 0 })
    })

    await test.step('Проверить что непропорциональный результат запёкся без прыжка', async() => {
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

  test('диагональный shrink у single-line текста сразу даёт перенос и увеличивает высоту в live-режиме', async({
    shapes
  }) => {
    await test.step('Добавить shape с текстом в одну строку и минимальной высотой', async() => {
      await shapes.addShapeWithText({
        presetKey: 'square',
        width: 220,
        height: 120,
        text: 'TEST',
        fontSize: 72
      })
    })

    const initialSnapshot = await test.step('Получить исходный snapshot', async() => {
      return shapes.getScaleSnapshot({ objectIndex: 0 })
    })
    const initialText = await test.step('Получить исходный text snapshot', async() => {
      return shapes.getTextNode({ objectIndex: 0 })
    })

    const liveSnapshot = await test.step('Сжать shape по диагонали за верхний правый угол', async() => {
      return shapes.scaleDiagonally({
        scaleX: 0.45,
        scaleY: 0.6,
        corner: 'tr',
        objectIndex: 0
      })
    })
    const liveText = await test.step('Получить live-состояние текста после diagonal shrink', async() => {
      return shapes.getTextNode({ objectIndex: 0 })
    })

    await test.step('Проверить что текст начал переноситься, а высота shape выросла', () => {
      expect(liveSnapshot.groupBoundsWidth)
        .toBeLessThan(initialSnapshot.groupBoundsWidth - SHAPE_SCALING_TOLERANCE.direction)
      expect(liveSnapshot.groupBoundsHeight)
        .toBeGreaterThan(initialSnapshot.groupBoundsHeight + SHAPE_SCALING_TOLERANCE.direction)
      expect(liveText?.lineCount).toBeGreaterThan(initialText?.lineCount ?? 0)
      shapes.checkNodeInsideGroup({ snapshot: liveSnapshot, kind: 'shape' })
      shapes.checkNodeInsideGroup({ snapshot: liveSnapshot, kind: 'text' })
    })

    const finalSnapshot = await test.step('Завершить diagonal scaling и получить финальный snapshot', async() => {
      return shapes.finishScale({ objectIndex: 0 })
    })

    await test.step('Проверить отсутствие прыжка после mouseup', () => {
      const widthJump = Math.abs(finalSnapshot.groupBoundsWidth - liveSnapshot.groupBoundsWidth)
      const heightJump = Math.abs(finalSnapshot.groupBoundsHeight - liveSnapshot.groupBoundsHeight)

      expect(widthJump).toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
      expect(heightJump).toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
      shapes.checkNodeInsideGroup({ snapshot: finalSnapshot, kind: 'shape' })
      shapes.checkNodeInsideGroup({ snapshot: finalSnapshot, kind: 'text' })
    })
  })

  test('после horizontal wrap и обратного расширения высота возвращается к исходному single-line минимуму', async({
    shapes
  }) => {
    await test.step('Добавить shape с single-line текстом и минимальной высотой', async() => {
      await shapes.addShapeWithText({
        presetKey: 'square',
        width: 220,
        height: 120,
        text: 'TEST',
        fontSize: 72
      })
    })

    const initialSnapshot = await test.step('Получить исходный snapshot', async() => {
      return shapes.getScaleSnapshot({ objectIndex: 0 })
    })
    const initialText = await test.step('Получить исходное состояние текста', async() => {
      return shapes.getTextNode({ objectIndex: 0 })
    })

    await test.step('Сузить shape по горизонтали до переноса строк и зафиксировать состояние', async() => {
      await shapes.scaleHorizontallyFromRight({
        scaleX: 0.3,
        objectIndex: 0
      })
      await shapes.finishScale({ objectIndex: 0 })
    })

    const wrappedSnapshot = await test.step('Получить snapshot после horizontal wrap', async() => {
      return shapes.getScaleSnapshot({ objectIndex: 0 })
    })
    const wrappedText = await test.step('Получить состояние текста после horizontal wrap', async() => {
      return shapes.getTextNode({ objectIndex: 0 })
    })

    await test.step('Проверить что narrow state действительно увеличил высоту и lineCount', () => {
      expect(wrappedSnapshot.groupBoundsHeight)
        .toBeGreaterThan(initialSnapshot.groupBoundsHeight + SHAPE_SCALING_TOLERANCE.direction)
      expect(wrappedText?.lineCount).toBeGreaterThan(initialText?.lineCount ?? 0)
    })

    await test.step('Расширить shape обратно и зафиксировать состояние', async() => {
      await shapes.scaleHorizontallyFromRight({
        scaleX: 4.5,
        objectIndex: 0
      })
      await shapes.finishScale({ objectIndex: 0 })
    })

    const expandedSnapshot = await test.step('Получить snapshot после обратного расширения', async() => {
      return shapes.getScaleSnapshot({ objectIndex: 0 })
    })
    const expandedText = await test.step('Получить состояние текста после обратного расширения', async() => {
      return shapes.getTextNode({ objectIndex: 0 })
    })

    await test.step('Проверить возврат к исходной высоте и single-line layout', () => {
      const heightDiff = Math.abs(expandedSnapshot.groupBoundsHeight - initialSnapshot.groupBoundsHeight)

      expect(expandedSnapshot.groupBoundsWidth)
        .toBeGreaterThan(wrappedSnapshot.groupBoundsWidth + SHAPE_SCALING_TOLERANCE.direction)
      expect(heightDiff).toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
      expect(expandedText?.lineCount).toBe(initialText?.lineCount)
      shapes.checkNodeInsideGroup({ snapshot: expandedSnapshot, kind: 'shape' })
      shapes.checkNodeInsideGroup({ snapshot: expandedSnapshot, kind: 'text' })
    })
  })

  test('если двухстрочный текст уже упёрся в minimum height, диагональный shrink сразу продолжает переносить текст', async({
    shapes
  }) => {
    await test.step('Добавить shape с двухстрочным текстом', async() => {
      await shapes.addShapeWithText({
        presetKey: 'square',
        width: 220,
        height: 220,
        text: 'TEST\nTEST',
        fontSize: 48
      })
    })

    await test.step('Сжать shape по вертикали до minimum height и зафиксировать fitted state', async() => {
      await shapes.shrinkToMinimumHeight({ objectIndex: 0 })
      await shapes.finishScale({ objectIndex: 0 })
    })

    const initialSnapshot = await test.step('Получить snapshot fitted two-line shape', async() => {
      return shapes.getScaleSnapshot({ objectIndex: 0 })
    })
    const initialText = await test.step('Получить состояние fitted two-line текста', async() => {
      return shapes.getTextNode({ objectIndex: 0 })
    })

    const liveSnapshot = await test.step('Сжать shape по диагонали за верхний правый угол', async() => {
      return shapes.scaleDiagonally({
        scaleX: 0.6,
        scaleY: 0.8,
        corner: 'tr',
        objectIndex: 0
      })
    })
    const liveText = await test.step('Получить live-состояние текста после diagonal shrink', async() => {
      return shapes.getTextNode({ objectIndex: 0 })
    })

    await test.step('Проверить что dead zone отсутствует: текст сразу переносится дальше, а высота растёт', () => {
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

test.describe('Диагональное масштабирование empty-text shape', () => {
  test.beforeEach(async({ shapes }) => {
    await shapes.addEmptyTextShape()
  })

  test('после сжатия почти до вертикальной линии можно продолжать менять высоту в той же drag-сессии', async({
    shapes
  }) => {
    const nearVerticalLineSnapshot = await test.step('Почти схлопнуть ширину shape диагональным drag', async() => {
      return shapes.scaleDiagonally({
        scaleX: 0.01,
        scaleY: 0.8,
        corner: 'br',
        objectIndex: 0
      })
    })

    const tallerSnapshot = await test.step('Не отпуская drag, продолжить тянуть shape по высоте', async() => {
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

    const finalSnapshot = await test.step('Завершить drag и получить финальный snapshot', async() => {
      return shapes.finishScale({ objectIndex: 0 })
    })

    await test.step('Проверить отсутствие прыжка после mouseup', () => {
      const widthJump = Math.abs(finalSnapshot.groupBoundsWidth - tallerSnapshot.groupBoundsWidth)
      const heightJump = Math.abs(finalSnapshot.groupBoundsHeight - tallerSnapshot.groupBoundsHeight)

      expect(widthJump).toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
      expect(heightJump).toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
    })
  })

  test('после сжатия почти до горизонтальной линии можно продолжать менять ширину в той же drag-сессии', async({
    shapes
  }) => {
    const nearHorizontalLineSnapshot = await test.step('Почти схлопнуть высоту shape диагональным drag', async() => {
      return shapes.scaleDiagonally({
        scaleX: 0.8,
        scaleY: 0.01,
        corner: 'br',
        objectIndex: 0
      })
    })

    const widerSnapshot = await test.step('Не отпуская drag, продолжить тянуть shape по ширине', async() => {
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

    const finalSnapshot = await test.step('Завершить drag и получить финальный snapshot', async() => {
      return shapes.finishScale({ objectIndex: 0 })
    })

    await test.step('Проверить отсутствие прыжка после mouseup', () => {
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

    await test.step('Увеличить фигуру в 2 раза', () => shapes.simulateScale({ scaleX: 2, scaleY: 2, objectIndex: 0 }))

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

    await test.step('Уменьшить фигуру в 2 раза', () => shapes.simulateScale({ scaleX: 0.5, scaleY: 0.5, objectIndex: 0 }))

    await test.step('Проверить что скругление уменьшилось вдвое', async() => {
      const shape = await shapes.getFirstShape()
      expect(shape.shapeRounding).toBe(40)
    })
  })

  test('скругление масштабируется по минимальному scale при непропорциональном масштабировании', async({ shapes }) => {
    await test.step('Добавить прямоугольник со скруглением 50', async() => {
      await shapes.add({ presetKey: 'square' })
      await shapes.setRounding({ rounding: 50, objectIndex: 0 })
    })

    await test.step('Масштабировать непропорционально (3x ширина, 2x высота)', () => {
      return shapes.simulateScale({ scaleX: 3, scaleY: 2, objectIndex: 0 })
    })

    await test.step('Проверить что скругление масштабировалось по min(3, 2) = 2', async() => {
      const shape = await shapes.getFirstShape()
      expect(shape.shapeRounding).toBe(100)
    })
  })
})

test.describe('Интерактивное масштабирование shape с обводкой', () => {
  test('стабильно масштабируется при быстрых реверсах без дрейфа и прыжка', async({ shapes }) => {
    const liveSnapshots: ShapeScaleSnapshot[] = []

    await test.step('Добавить квадрат и включить обводку', async() => {
      await shapes.add({ presetKey: 'square' })
      await shapes.setStroke({
        stroke: '#0a84ff',
        strokeWidth: SHAPE_SCALING_STROKE_WIDTH,
        objectIndex: 0
      })
    })

    await test.step('Выполнить live-scale с быстрыми реверсами', async() => {
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

    await test.step('Проверить что anchor стабилен во время drag', () => {
      const firstLiveSnapshot = liveSnapshots[0]

      expect(firstLiveSnapshot, 'должен существовать первый live snapshot для проверки anchor').toBeDefined()

      if (!firstLiveSnapshot) {
        throw new Error('должен существовать первый live snapshot для проверки anchor')
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

    await test.step('Проверить постоянство обводки и совпадение shape с bbox в live-режиме', () => {
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

    expect(snapshotBeforeMouseUp, 'должен существовать последний live snapshot перед mouseup').toBeDefined()

    if (!snapshotBeforeMouseUp) {
      throw new Error('должен существовать последний live snapshot перед mouseup')
    }

    const finalSnapshot = await test.step('Завершить drag и получить финальный snapshot', async() => {
      return shapes.finishScale({ objectIndex: 0 })
    })

    await test.step('Проверить отсутствие прыжка на mouseup', () => {
      const leftJump = Math.abs(finalSnapshot.groupBoundsLeft - snapshotBeforeMouseUp.groupBoundsLeft)
      const topJump = Math.abs(finalSnapshot.groupBoundsTop - snapshotBeforeMouseUp.groupBoundsTop)
      const rightJump = Math.abs(finalSnapshot.groupBoundsRight - snapshotBeforeMouseUp.groupBoundsRight)
      const bottomJump = Math.abs(finalSnapshot.groupBoundsBottom - snapshotBeforeMouseUp.groupBoundsBottom)

      expect(leftJump).toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
      expect(topJump).toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
      expect(rightJump).toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
      expect(bottomJump).toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
    })

    await test.step('Проверить что после bake масштаб сброшен и обводка сохранена', async() => {
      const shape = await shapes.getFirstShape()
      expect(shape.scaleX).toBe(1)
      expect(shape.scaleY).toBe(1)
      expect(finalSnapshot.shapeStrokeWidth).toBe(SHAPE_SCALING_STROKE_WIDTH)
      expect(finalSnapshot.shapeStrokeUniform).toBe(true)
    })
  })
})

test.describe('Интерактивное масштабирование shape с текстом', () => {
  test.beforeEach(async({ shapes }) => {
    await shapes.addShapeWithText()
  })

  test('уже на первом horizontal shrink держит text и shape внутри bbox и без прыжка после mouseup', async({ shapes }) => {
    const initialSnapshot = await test.step('Получить исходный snapshot shape с текстом', async() => {
      return shapes.getScaleSnapshot({ objectIndex: 0 })
    })

    const liveSnapshot = await test.step('Сузить shape по горизонтали до переноса строк', async() => {
      return shapes.scaleHorizontallyFromRight({
        scaleX: 0.55,
        objectIndex: 0
      })
    })

    await test.step('Проверить что live-preview увеличил высоту и сохранил text/shape внутри bbox', () => {
      expect(liveSnapshot.groupBoundsHeight).toBeGreaterThan(initialSnapshot.groupBoundsHeight)
      shapes.checkNodeInsideGroup({ snapshot: liveSnapshot, kind: 'shape' })
      shapes.checkNodeInsideGroup({ snapshot: liveSnapshot, kind: 'text' })
    })

    const finalSnapshot = await test.step('Завершить scaling и получить финальный snapshot', async() => {
      return shapes.finishScale({ objectIndex: 0 })
    })

    await test.step('Проверить отсутствие прыжка после mouseup', () => {
      const heightJump = Math.abs(finalSnapshot.groupBoundsHeight - liveSnapshot.groupBoundsHeight)
      const bottomJump = Math.abs(finalSnapshot.groupBoundsBottom - liveSnapshot.groupBoundsBottom)

      expect(heightJump).toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
      expect(bottomJump).toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
      shapes.checkNodeInsideGroup({ snapshot: finalSnapshot, kind: 'shape' })
      shapes.checkNodeInsideGroup({ snapshot: finalSnapshot, kind: 'text' })
    })
  })

  test('после упора в minimum width можно сразу растягивать обратно без завершения drag', async({ shapes }) => {
    const minimumSnapshot = await test.step('Сжать shape до minimum width в live-режиме', async() => {
      return shapes.shrinkToMinimumWidth({ objectIndex: 0 })
    })

    const expandedSnapshot = await test.step('Не отпуская drag, сразу растянуть shape обратно вправо', async() => {
      return shapes.scaleHorizontallyFromRight({
        scaleX: 0.9,
        objectIndex: 0
      })
    })

    await test.step('Проверить что ширина снова растёт и text/shape остаются внутри bbox', () => {
      expect(expandedSnapshot.groupBoundsWidth)
        .toBeGreaterThan(minimumSnapshot.groupBoundsWidth + SHAPE_SCALING_TOLERANCE.direction)
      shapes.checkNodeInsideGroup({ snapshot: expandedSnapshot, kind: 'shape' })
      shapes.checkNodeInsideGroup({ snapshot: expandedSnapshot, kind: 'text' })
    })
  })

  test('повторные циклы shrink-expand-shrink дают одинаковую minimum width и одинаковый live layout', async({ shapes }) => {
    const firstMinimumSnapshot = await test.step('Первый shrink до minimum width', async() => {
      return shapes.shrinkToMinimumWidth({ objectIndex: 0 })
    })

    await test.step('Зафиксировать первый minimum state', async() => {
      await shapes.finishScale({ objectIndex: 0 })
    })

    await test.step('Растянуть shape обратно', async() => {
      await shapes.scaleHorizontallyFromRight({ scaleX: 2, objectIndex: 0 })

      await shapes.finishScale({ objectIndex: 0 })
    })

    const secondMinimumSnapshot = await test.step('Повторно shrink до minimum width', async() => {
      return shapes.shrinkToMinimumWidth({ objectIndex: 0 })
    })

    await test.step('Проверить стабильность minimum width и live layout между циклами', () => {
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
