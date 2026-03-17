import { test, expect } from '../../fixtures/editor.fixture'
import { SHAPE_SCALING_TOLERANCE } from '../../fixtures/data/shape-scaling.data'

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

test.describe('Восстановление scaling runtime после history и rehydration', () => {
  test('после vertical minimum height, undo и redo shape сохраняет состояние и снова масштабируется по горизонтали', async({
    history,
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
      await history.flushPendingSave()
    })

    const minimumSnapshot = await test.step('Получить snapshot после vertical minimum height', async() => {
      return shapes.getScaleSnapshot({ objectIndex: 0 })
    })

    await test.step('Сделать undo и redo', async() => {
      await history.undo()
      await history.redo()
    })

    const restoredSnapshot = await test.step('Получить snapshot после redo', async() => {
      return shapes.getScaleSnapshot({ objectIndex: 0 })
    })

    await test.step('Проверить что redo восстановил тот же minimum state', () => {
      expect(Math.abs(restoredSnapshot.groupBoundsHeight - minimumSnapshot.groupBoundsHeight))
        .toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
      expect(Math.abs(restoredSnapshot.groupBoundsTop - minimumSnapshot.groupBoundsTop))
        .toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
      expect(Math.abs(restoredSnapshot.groupBoundsBottom - minimumSnapshot.groupBoundsBottom))
        .toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
    })

    const liveSnapshot = await test.step('После redo снова сузить shape по горизонтали', async() => {
      return shapes.scaleHorizontallyFromRight({
        scaleX: 0.55,
        objectIndex: 0
      })
    })

    await test.step('Проверить что horizontal scaling после redo всё ещё работает', () => {
      expect(liveSnapshot.groupBoundsWidth).toBeLessThan(restoredSnapshot.groupBoundsWidth)
      shapes.checkNodeInsideGroup({ snapshot: liveSnapshot, kind: 'shape' })
      shapes.checkNodeInsideGroup({ snapshot: liveSnapshot, kind: 'text' })
    })
  })

  test('после copy/paste вставленный shape так же сжимается по вертикали до minimum height текста', async({
    clipboard,
    editorModel,
    shapes
  }) => {
    await test.step('Добавить исходный shape и скопировать его', async() => {
      await shapes.add({
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
      await shapes.select({ objectIndex: 0 })
      await clipboard.copy()
      await clipboard.waitForClipboardReady()
    })

    await test.step('Вставить shape из буфера обмена', async() => {
      const pasted = await clipboard.paste()

      expect(pasted).toBe(true)
      await editorModel.checkObjectCount({ count: 2 })
    })

    const initialSnapshot = await test.step('Получить исходный snapshot вставленного shape', async() => {
      return shapes.getScaleSnapshot({ objectIndex: 1 })
    })
    const initialText = await test.step('Получить исходное состояние текста вставленного shape', async() => {
      return shapes.getTextNode({ objectIndex: 1 })
    })

    const liveSnapshot = await test.step('Сжать вставленный shape по вертикали до minimum height', async() => {
      return shapes.shrinkToMinimumHeight({ objectIndex: 1 })
    })
    const finalSnapshot = await test.step('Зафиксировать vertical minimum height вставленного shape', async() => {
      await shapes.finishScale({ objectIndex: 1 })

      return shapes.getScaleSnapshot({ objectIndex: 1 })
    })
    const finalText = await test.step('Получить финальное состояние текста вставленного shape', async() => {
      return shapes.getTextNode({ objectIndex: 1 })
    })

    await test.step('Проверить что vertical scaling после copy/paste работает так же стабильно', () => {
      expect(liveSnapshot.groupBoundsHeight).toBeLessThan(initialSnapshot.groupBoundsHeight)
      expect(Math.abs(finalSnapshot.groupBoundsHeight - liveSnapshot.groupBoundsHeight))
        .toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
      expect(finalText?.fontSize).toBe(initialText?.fontSize)
      expect(finalText?.lineCount).toBe(initialText?.lineCount)
      shapes.checkNodeInsideGroup({ snapshot: finalSnapshot, kind: 'shape' })
      shapes.checkNodeInsideGroup({ snapshot: finalSnapshot, kind: 'text' })
    })
  })

  test('после applyTemplate восстановленный shape так же сжимается по вертикали до minimum height текста', async({
    shapes,
    template
  }) => {
    await test.step('Создать исходный shape и сериализовать его в шаблон', async() => {
      await shapes.add({
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
      await shapes.select({ objectIndex: 0 })
    })

    const serializedTemplate = await test.step('Сериализовать текущее выделение', async() => {
      return template.serializeSelection()
    })

    await test.step('Удалить исходный shape и применить шаблон', async() => {
      await shapes.remove({ objectIndex: 0 })
      expect(serializedTemplate).not.toBeNull()

      const insertedCount = await template.applyTemplate({
        template: serializedTemplate!
      })

      expect(insertedCount).toBe(1)
    })

    const initialSnapshot = await test.step('Получить исходный snapshot shape из шаблона', async() => {
      return shapes.getScaleSnapshot({ objectIndex: 0 })
    })
    const initialText = await test.step('Получить исходное состояние текста shape из шаблона', async() => {
      return shapes.getTextNode({ objectIndex: 0 })
    })

    const liveSnapshot = await test.step('Сжать shape из шаблона по вертикали до minimum height', async() => {
      return shapes.shrinkToMinimumHeight({ objectIndex: 0 })
    })
    const finalSnapshot = await test.step('Зафиксировать vertical minimum height shape из шаблона', async() => {
      await shapes.finishScale({ objectIndex: 0 })

      return shapes.getScaleSnapshot({ objectIndex: 0 })
    })
    const finalText = await test.step('Получить финальное состояние текста shape из шаблона', async() => {
      return shapes.getTextNode({ objectIndex: 0 })
    })

    await test.step('Проверить что vertical scaling после applyTemplate работает так же стабильно', () => {
      expect(liveSnapshot.groupBoundsHeight).toBeLessThan(initialSnapshot.groupBoundsHeight)
      expect(Math.abs(finalSnapshot.groupBoundsHeight - liveSnapshot.groupBoundsHeight))
        .toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
      expect(finalText?.fontSize).toBe(initialText?.fontSize)
      expect(finalText?.lineCount).toBe(initialText?.lineCount)
      shapes.checkNodeInsideGroup({ snapshot: finalSnapshot, kind: 'shape' })
      shapes.checkNodeInsideGroup({ snapshot: finalSnapshot, kind: 'text' })
    })
  })
})
