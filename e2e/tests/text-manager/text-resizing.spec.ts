import { test, expect } from '../../fixtures/editor.fixture'
import {
  TEXT_RESIZING_REGRESSION_WIDTH,
  TEXT_RESIZING_TOLERANCE
} from '../../fixtures/data/text-resizing.data'

test.describe('Горизонтальный ресайз текстового объекта', () => {
  test.describe('объект создан напрямую', () => {
    test.beforeEach(async({ text }) => {
      await text.addRegressionText()
    })

    test('не смещает объект вниз при сужении справа, когда текст переносится на новую строку', async({
      text
    }) => {
      const initialSnapshot = await test.step('Получить исходное состояние текстового объекта', async() => {
        return text.getResizeSnapshot({ objectIndex: 0 })
      })

      const targetWidth = Math.min(
        TEXT_RESIZING_REGRESSION_WIDTH,
        Math.max(80, initialSnapshot.width - 30)
      )

      const liveSnapshot = await test.step('Сузить объект справа до состояния с переносом текста', async() => {
        return text.resizeFromRightToWidth({
          width: targetWidth,
          objectIndex: 0
        })
      })

      await test.step('Проверить что текст перенёсся, а верхний левый угол остался на месте', () => {
        expect(liveSnapshot.width).toBe(targetWidth)
        expect(liveSnapshot.lineCount).toBeGreaterThan(initialSnapshot.lineCount)
        expect(liveSnapshot.leftTopX).toBeCloseTo(initialSnapshot.leftTopX, 1)
        expect(liveSnapshot.leftTopY).toBeCloseTo(initialSnapshot.leftTopY, 1)
      })

      const finalSnapshot = await test.step('Завершить ресайз и получить финальное состояние', async() => {
        return text.finishResize({ objectIndex: 0 })
      })

      await test.step('Проверить что после завершения ресайза объект не подпрыгнул и scale сброшен', () => {
        expect(Math.abs(finalSnapshot.leftTopX - liveSnapshot.leftTopX))
          .toBeLessThanOrEqual(TEXT_RESIZING_TOLERANCE.mouseupJump)
        expect(Math.abs(finalSnapshot.leftTopY - liveSnapshot.leftTopY))
          .toBeLessThanOrEqual(TEXT_RESIZING_TOLERANCE.mouseupJump)
        expect(finalSnapshot.scaleX).toBe(1)
        expect(finalSnapshot.scaleY).toBe(1)
      })
    })

    test('не смещает объект вниз при сужении слева, когда текст переносится на новую строку', async({
      text
    }) => {
      const initialSnapshot = await test.step('Получить исходное состояние текстового объекта', async() => {
        return text.getResizeSnapshot({ objectIndex: 0 })
      })

      const targetWidth = Math.min(
        TEXT_RESIZING_REGRESSION_WIDTH,
        Math.max(80, initialSnapshot.width - 30)
      )

      const liveSnapshot = await test.step('Сузить объект слева до состояния с переносом текста', async() => {
        return text.resizeFromLeftToWidth({
          width: targetWidth,
          objectIndex: 0
        })
      })

      await test.step('Проверить что текст перенёсся, а верхний правый угол остался на месте', () => {
        expect(liveSnapshot.width).toBe(targetWidth)
        expect(liveSnapshot.lineCount).toBeGreaterThan(initialSnapshot.lineCount)
        expect(liveSnapshot.rightTopX).toBeCloseTo(initialSnapshot.rightTopX, 1)
        expect(liveSnapshot.rightTopY).toBeCloseTo(initialSnapshot.rightTopY, 1)
      })

      const finalSnapshot = await test.step('Завершить ресайз и получить финальное состояние', async() => {
        return text.finishResize({ objectIndex: 0 })
      })

      await test.step('Проверить что после завершения ресайза слева объект не подпрыгнул', () => {
        expect(Math.abs(finalSnapshot.rightTopX - liveSnapshot.rightTopX))
          .toBeLessThanOrEqual(TEXT_RESIZING_TOLERANCE.mouseupJump)
        expect(Math.abs(finalSnapshot.rightTopY - liveSnapshot.rightTopY))
          .toBeLessThanOrEqual(TEXT_RESIZING_TOLERANCE.mouseupJump)
      })
    })

    test('не сдвигает опорную точку у повёрнутого объекта при сужении слева', async({
      text
    }) => {
      await test.step('Повернуть текстовый объект перед ресайзом', async() => {
        await text.rotate({
          angle: 18,
          objectIndex: 0
        })
      })

      const initialSnapshot = await test.step('Получить исходное состояние после поворота', async() => {
        return text.getResizeSnapshot({ objectIndex: 0 })
      })

      const targetWidth = Math.min(
        TEXT_RESIZING_REGRESSION_WIDTH,
        Math.max(80, initialSnapshot.width - 30)
      )

      const liveSnapshot = await test.step('Сузить повёрнутый объект слева с опорой по центру', async() => {
        return text.resizeFromLeftToWidth({
          width: targetWidth,
          originY: 'center',
          objectIndex: 0
        })
      })

      await test.step('Проверить что правая центральная опорная точка осталась на месте', () => {
        expect(liveSnapshot.width).toBe(targetWidth)
        expect(liveSnapshot.rightCenterX).toBeCloseTo(initialSnapshot.rightCenterX, 1)
        expect(liveSnapshot.rightCenterY).toBeCloseTo(initialSnapshot.rightCenterY, 1)
      })

      const finalSnapshot = await test.step('Завершить ресайз повёрнутого объекта', async() => {
        return text.finishResize({ objectIndex: 0 })
      })

      await test.step('Проверить что после завершения повёрнутый объект не подпрыгнул', () => {
        expect(Math.abs(finalSnapshot.rightCenterX - liveSnapshot.rightCenterX))
          .toBeLessThanOrEqual(TEXT_RESIZING_TOLERANCE.mouseupJump)
        expect(Math.abs(finalSnapshot.rightCenterY - liveSnapshot.rightCenterY))
          .toBeLessThanOrEqual(TEXT_RESIZING_TOLERANCE.mouseupJump)
      })
    })
  })

  test.describe('объект восстановлен из шаблона', () => {
    test.beforeEach(async({ text }) => {
      await text.applyRegressionTemplate()
    })

    test('не смещает объект вниз при сужении справа после восстановления из шаблона', async({
      text
    }) => {
      const initialSnapshot = await test.step('Получить исходное состояние объекта из шаблона', async() => {
        return text.getResizeSnapshot({ objectIndex: 0 })
      })

      const targetWidth = Math.min(
        TEXT_RESIZING_REGRESSION_WIDTH,
        Math.max(80, initialSnapshot.width - 30)
      )

      const liveSnapshot = await test.step('Сузить объект из шаблона справа до состояния с переносом текста', async() => {
        return text.resizeFromRightToWidth({
          width: targetWidth,
          objectIndex: 0
        })
      })

      await test.step('Проверить что текст перенёсся, а верхний левый угол остался на месте', () => {
        expect(liveSnapshot.width).toBe(targetWidth)
        expect(liveSnapshot.lineCount).toBeGreaterThan(initialSnapshot.lineCount)
        expect(liveSnapshot.leftTopX).toBeCloseTo(initialSnapshot.leftTopX, 1)
        expect(liveSnapshot.leftTopY).toBeCloseTo(initialSnapshot.leftTopY, 1)
      })
    })

    test('не смещает объект вниз при сужении слева после восстановления из шаблона', async({
      text
    }) => {
      const initialSnapshot = await test.step('Получить исходное состояние объекта из шаблона', async() => {
        return text.getResizeSnapshot({ objectIndex: 0 })
      })

      const targetWidth = Math.min(
        TEXT_RESIZING_REGRESSION_WIDTH,
        Math.max(80, initialSnapshot.width - 30)
      )

      const liveSnapshot = await test.step('Сузить объект из шаблона слева до состояния с переносом текста', async() => {
        return text.resizeFromLeftToWidth({
          width: targetWidth,
          objectIndex: 0
        })
      })

      await test.step('Проверить что текст перенёсся, а верхний правый угол остался на месте', () => {
        expect(liveSnapshot.width).toBe(targetWidth)
        expect(liveSnapshot.lineCount).toBeGreaterThan(initialSnapshot.lineCount)
        expect(liveSnapshot.rightTopX).toBeCloseTo(initialSnapshot.rightTopX, 1)
        expect(liveSnapshot.rightTopY).toBeCloseTo(initialSnapshot.rightTopY, 1)
      })
    })

    test('после undo и redo объект из шаблона всё ещё не прыгает вниз при повторном сужении', async({
      history,
      text
    }) => {
      const initialSnapshot = await test.step('Получить исходное состояние объекта из шаблона', async() => {
        return text.getResizeSnapshot({ objectIndex: 0 })
      })

      const firstTargetWidth = Math.min(
        TEXT_RESIZING_REGRESSION_WIDTH,
        Math.max(80, initialSnapshot.width - 30)
      )

      await test.step('Сузить объект из шаблона и зафиксировать это состояние в history', async() => {
        await text.resizeFromRightToWidth({
          width: firstTargetWidth,
          objectIndex: 0
        })
        await text.finishResize({ objectIndex: 0 })
        await history.flushPendingSave()
      })

      const resizedSnapshot = await test.step('Получить состояние после первого сужения', async() => {
        return text.getResizeSnapshot({ objectIndex: 0 })
      })

      const afterUndoSnapshot = await test.step('Сделать undo и получить состояние объекта', async() => {
        await history.undo()
        return text.getResizeSnapshot({ objectIndex: 0 })
      })

      await test.step('Проверить что undo вернул объект к более широкому состоянию', () => {
        expect(afterUndoSnapshot.width).toBeGreaterThan(resizedSnapshot.width)
        expect(afterUndoSnapshot.lineCount).toBeLessThan(resizedSnapshot.lineCount)
      })

      const afterRedoSnapshot = await test.step('Сделать redo и получить состояние объекта', async() => {
        await history.redo()
        return text.getResizeSnapshot({ objectIndex: 0 })
      })

      await test.step('Проверить что redo вернул узкое состояние без смещения объекта', () => {
        expect(afterRedoSnapshot.width).toBe(resizedSnapshot.width)
        expect(afterRedoSnapshot.lineCount).toBe(resizedSnapshot.lineCount)
        expect(afterRedoSnapshot.leftTopX).toBeCloseTo(resizedSnapshot.leftTopX, 1)
        expect(afterRedoSnapshot.leftTopY).toBeCloseTo(resizedSnapshot.leftTopY, 1)
      })

      const secondTargetWidth = Math.max(80, afterRedoSnapshot.width - 20)
      const secondLiveSnapshot = await test.step('Снова сузить объект после redo', async() => {
        return text.resizeFromRightToWidth({
          width: secondTargetWidth,
          objectIndex: 0
        })
      })

      await test.step('Проверить что повторное сужение после redo снова не двигает объект вниз', () => {
        expect(secondLiveSnapshot.leftTopX).toBeCloseTo(afterRedoSnapshot.leftTopX, 1)
        expect(secondLiveSnapshot.leftTopY).toBeCloseTo(afterRedoSnapshot.leftTopY, 1)
      })
    })
  })

  test('объект, созданный напрямую, и объект из шаблона одинаково ведут себя при сужении справа', async({
    editorModel,
    text
  }) => {
    await test.step('Добавить на canvas объект, созданный напрямую, и объект из шаблона', async() => {
      await text.addRegressionText({
        top: 96
      })
      await text.applyRegressionTemplate()
      await editorModel.checkObjectCount({ count: 2 })
    })

    const newInitialSnapshot = await test.step('Получить исходное состояние объекта, созданного напрямую', async() => {
      return text.getResizeSnapshot({ objectIndex: 0 })
    })
    const templateInitialSnapshot = await test.step('Получить исходное состояние объекта из шаблона', async() => {
      return text.getResizeSnapshot({ objectIndex: 1 })
    })

    const newTargetWidth = Math.min(
      TEXT_RESIZING_REGRESSION_WIDTH,
      Math.max(80, newInitialSnapshot.width - 30)
    )
    const templateTargetWidth = Math.min(
      TEXT_RESIZING_REGRESSION_WIDTH,
      Math.max(80, templateInitialSnapshot.width - 30)
    )

    const newLiveSnapshot = await test.step('Сузить справа объект, созданный напрямую', async() => {
      return text.resizeFromRightToWidth({
        width: newTargetWidth,
        objectIndex: 0
      })
    })
    const templateLiveSnapshot = await test.step('Сузить справа объект из шаблона', async() => {
      return text.resizeFromRightToWidth({
        width: templateTargetWidth,
        objectIndex: 1
      })
    })

    await test.step('Проверить что оба объекта переносят текст и остаются на месте одинаково', () => {
      expect(newLiveSnapshot.width).toBe(newTargetWidth)
      expect(templateLiveSnapshot.width).toBe(templateTargetWidth)
      expect(newLiveSnapshot.lineCount).toBeGreaterThan(newInitialSnapshot.lineCount)
      expect(templateLiveSnapshot.lineCount).toBeGreaterThan(templateInitialSnapshot.lineCount)
      expect(newLiveSnapshot.leftTopX).toBeCloseTo(newInitialSnapshot.leftTopX, 1)
      expect(newLiveSnapshot.leftTopY).toBeCloseTo(newInitialSnapshot.leftTopY, 1)
      expect(templateLiveSnapshot.leftTopX).toBeCloseTo(templateInitialSnapshot.leftTopX, 1)
      expect(templateLiveSnapshot.leftTopY).toBeCloseTo(templateInitialSnapshot.leftTopY, 1)
    })

    await test.step('Проверить что вертикальное смещение у обоих объектов остаётся в одном допуске', () => {
      expect(Math.abs(newLiveSnapshot.leftTopY - newInitialSnapshot.leftTopY))
        .toBeLessThanOrEqual(TEXT_RESIZING_TOLERANCE.anchor)
      expect(Math.abs(templateLiveSnapshot.leftTopY - templateInitialSnapshot.leftTopY))
        .toBeLessThanOrEqual(TEXT_RESIZING_TOLERANCE.anchor)
    })
  })
})
