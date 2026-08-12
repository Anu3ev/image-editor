import { test, expect } from '../../fixtures/editor.fixture'
import {
  TEXT_RESIZING_MINIMUM_WIDTH_ADD_OPTIONS,
  TEXT_RESIZING_MINIMUM_WIDTH_HOLD_DELTA,
  TEXT_RESIZING_MINIMUM_WIDTH_PROBE,
  TEXT_RESIZING_TOLERANCE
} from '../../fixtures/data/text-resizing.data'
import { createTextResizeTemplateRoundtripSetup } from '../../fixtures/text-width-resizing.fixture'

test.describe('Горизонтальный ресайз текстового объекта', () => {
  test.describe('объект создан напрямую', () => {
    test.beforeEach(async({ text }) => {
      await text.addRegressionText()
    })

    test('сохраняет неподвижную сторону при сужении справа и переносе текста', async({
      text
    }) => {
      const initialSnapshot = await test.step('Получить исходное состояние текстового объекта', async() => {
        return text.getResizeSnapshot({ objectIndex: 0 })
      })

      const liveSnapshot = await test.step('Сузить объект справа до состояния с переносом текста', async() => {
        return text.resizeFromRightUntilTextWraps({
          objectIndex: 0
        })
      })

      await test.step('Проверить что текст перенёсся, а левая сторона осталась на месте', () => {
        expect(liveSnapshot.width).toBeLessThan(initialSnapshot.width)
        expect(liveSnapshot.lineCount).toBeGreaterThan(initialSnapshot.lineCount)
        expect(liveSnapshot.leftCenterX).toBeCloseTo(initialSnapshot.leftCenterX, 1)
        expect(liveSnapshot.leftCenterY).toBeCloseTo(initialSnapshot.leftCenterY, 1)
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

    test('сохраняет неподвижную сторону при сужении слева и переносе текста', async({
      text
    }) => {
      const initialSnapshot = await test.step('Получить исходное состояние текстового объекта', async() => {
        return text.getResizeSnapshot({ objectIndex: 0 })
      })

      const liveSnapshot = await test.step('Сузить объект слева до состояния с переносом текста', async() => {
        return text.resizeFromLeftUntilTextWraps({
          objectIndex: 0
        })
      })

      await test.step('Проверить что текст перенёсся, а правая сторона осталась на месте', () => {
        expect(liveSnapshot.width).toBeLessThan(initialSnapshot.width)
        expect(liveSnapshot.lineCount).toBeGreaterThan(initialSnapshot.lineCount)
        expect(liveSnapshot.rightCenterX).toBeCloseTo(initialSnapshot.rightCenterX, 1)
        expect(liveSnapshot.rightCenterY).toBeCloseTo(initialSnapshot.rightCenterY, 1)
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

      const targetWidth = Math.max(80, initialSnapshot.width - 30)

      const liveSnapshot = await test.step('Сузить повёрнутый объект слева с опорой по центру', async() => {
        return text.resizeFromLeftToWidth({
          width: targetWidth,
          objectIndex: 0
        })
      })

      await test.step('Проверить что правая центральная опорная точка осталась на месте', () => {
        expect(liveSnapshot.width).toBeLessThan(initialSnapshot.width)
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

  test.describe('минимальная ширина строки', () => {
    test.beforeEach(async({ text }) => {
      const created = await text.add(TEXT_RESIZING_MINIMUM_WIDTH_ADD_OPTIONS)

      expect(created).not.toBeNull()
      if (!created) throw new Error('текст для проверки минимальной ширины должен быть создан')
      expect(created.width).toBeGreaterThan(TEXT_RESIZING_MINIMUM_WIDTH_PROBE)
    })

    test('останавливает правую ручку на ширине самой длинной строки', async({ text }) => {
      const initial = await text.getResizeSnapshot({ objectIndex: 0 })
      const minimum = await text.resizeFromRightToWidth({
        objectIndex: 0,
        width: TEXT_RESIZING_MINIMUM_WIDTH_PROBE
      })

      expect(initial.lineCount).toBe(2)
      expect(minimum.width).toBeGreaterThan(TEXT_RESIZING_MINIMUM_WIDTH_PROBE)
      expect(minimum.lineCount).toBe(initial.lineCount)
      expect(minimum.leftCenterX).toBeCloseTo(initial.leftCenterX, 1)
      expect(minimum.leftCenterY).toBeCloseTo(initial.leftCenterY, 1)

      const held = await text.continueResizeHandleBy({
        deltaX: -TEXT_RESIZING_MINIMUM_WIDTH_HOLD_DELTA,
        deltaY: 0
      })

      expect(held.width).toBeCloseTo(minimum.width, 4)
      expect(held.leftCenterX).toBeCloseTo(minimum.leftCenterX, 4)
      expect(held.rightCenterX).toBeCloseTo(minimum.rightCenterX, 4)

      const committed = await text.finishResize({ objectIndex: 0 })

      expect(committed.width).toBeCloseTo(held.width, 4)
      expect(committed.leftCenterX).toBeCloseTo(held.leftCenterX, 4)
      expect(committed.rightCenterX).toBeCloseTo(held.rightCenterX, 4)
    })

    test('останавливает левую ручку на ширине самой длинной строки', async({ text }) => {
      const initial = await text.getResizeSnapshot({ objectIndex: 0 })
      const minimum = await text.resizeFromLeftToWidth({
        objectIndex: 0,
        width: TEXT_RESIZING_MINIMUM_WIDTH_PROBE
      })

      expect(initial.lineCount).toBe(2)
      expect(minimum.width).toBeGreaterThan(TEXT_RESIZING_MINIMUM_WIDTH_PROBE)
      expect(minimum.lineCount).toBe(initial.lineCount)
      expect(minimum.rightCenterX).toBeCloseTo(initial.rightCenterX, 1)
      expect(minimum.rightCenterY).toBeCloseTo(initial.rightCenterY, 1)

      const held = await text.continueResizeHandleBy({
        deltaX: TEXT_RESIZING_MINIMUM_WIDTH_HOLD_DELTA,
        deltaY: 0
      })

      expect(held.width).toBeCloseTo(minimum.width, 4)
      expect(held.leftCenterX).toBeCloseTo(minimum.leftCenterX, 4)
      expect(held.rightCenterX).toBeCloseTo(minimum.rightCenterX, 4)

      const committed = await text.finishResize({ objectIndex: 0 })

      expect(committed.width).toBeCloseTo(held.width, 4)
      expect(committed.leftCenterX).toBeCloseTo(held.leftCenterX, 4)
      expect(committed.rightCenterX).toBeCloseTo(held.rightCenterX, 4)
    })
  })

  test.describe('объект восстановлен из шаблона', () => {
    test.beforeEach(async({ text }) => {
      await text.applyRegressionTemplate()
    })

    test('сохраняет неподвижную сторону при сужении справа после восстановления из шаблона', async({
      text
    }) => {
      const initialSnapshot = await test.step('Получить исходное состояние объекта из шаблона', async() => {
        return text.getResizeSnapshot({ objectIndex: 0 })
      })

      const liveSnapshot = await test.step('Сузить объект из шаблона справа до состояния с переносом текста', async() => {
        return text.resizeFromRightUntilTextWraps({
          objectIndex: 0
        })
      })

      await test.step('Проверить что текст перенёсся, а левая сторона осталась на месте', () => {
        expect(liveSnapshot.width).toBeLessThan(initialSnapshot.width)
        expect(liveSnapshot.lineCount).toBeGreaterThan(initialSnapshot.lineCount)
        expect(liveSnapshot.leftCenterX).toBeCloseTo(initialSnapshot.leftCenterX, 1)
        expect(liveSnapshot.leftCenterY).toBeCloseTo(initialSnapshot.leftCenterY, 1)
      })
    })

    test('сохраняет неподвижную сторону при сужении слева после восстановления из шаблона', async({
      text
    }) => {
      const initialSnapshot = await test.step('Получить исходное состояние объекта из шаблона', async() => {
        return text.getResizeSnapshot({ objectIndex: 0 })
      })

      const liveSnapshot = await test.step('Сузить объект из шаблона слева до состояния с переносом текста', async() => {
        return text.resizeFromLeftUntilTextWraps({
          objectIndex: 0
        })
      })

      await test.step('Проверить что текст перенёсся, а правая сторона осталась на месте', () => {
        expect(liveSnapshot.width).toBeLessThan(initialSnapshot.width)
        expect(liveSnapshot.lineCount).toBeGreaterThan(initialSnapshot.lineCount)
        expect(liveSnapshot.rightCenterX).toBeCloseTo(initialSnapshot.rightCenterX, 1)
        expect(liveSnapshot.rightCenterY).toBeCloseTo(initialSnapshot.rightCenterY, 1)
      })
    })

    test('после undo и redo объект из шаблона сохраняет неподвижную сторону при повторном сужении', async({
      history,
      text
    }) => {
      const initialSnapshot = await test.step('Получить исходное состояние объекта из шаблона', async() => {
        return text.getResizeSnapshot({ objectIndex: 0 })
      })

      const firstTargetWidth = Math.max(80, initialSnapshot.width - 30)

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
        expect(afterUndoSnapshot.leftTopX).toBeCloseTo(initialSnapshot.leftTopX, 1)
        expect(afterUndoSnapshot.leftTopY).toBeCloseTo(initialSnapshot.leftTopY, 1)
      })

      const afterRedoSnapshot = await test.step('Сделать redo и получить состояние объекта', async() => {
        await history.redo()
        return text.getResizeSnapshot({ objectIndex: 0 })
      })

      await test.step('Проверить что redo вернул узкое состояние без смещения объекта', () => {
        expect(afterRedoSnapshot.width).toBeCloseTo(resizedSnapshot.width, 4)
        expect(afterRedoSnapshot.lineCount).toBe(resizedSnapshot.lineCount)
        expect(afterRedoSnapshot.leftTopX).toBeCloseTo(resizedSnapshot.leftTopX, 1)
        expect(afterRedoSnapshot.leftTopY).toBeCloseTo(resizedSnapshot.leftTopY, 1)
      })

      const secondLiveSnapshot = await test.step('Снова сузить объект после redo', async() => {
        return text.resizeFromRightUntilTextWraps({
          objectIndex: 0
        })
      })

      await test.step('Проверить что повторное сужение после redo сохраняет левую сторону', () => {
        expect(secondLiveSnapshot.width).toBeLessThan(afterRedoSnapshot.width)
        expect(secondLiveSnapshot.lineCount).toBeGreaterThan(afterRedoSnapshot.lineCount)
        expect(secondLiveSnapshot.leftCenterX).toBeCloseTo(afterRedoSnapshot.leftCenterX, 1)
        expect(secondLiveSnapshot.leftCenterY).toBeCloseTo(afterRedoSnapshot.leftCenterY, 1)
      })
    })

    test('после завершения ресайза движение мыши больше не продолжает сужение объекта из шаблона', async({
      text
    }) => {
      await test.step('Сузить объект из шаблона до состояния с переносом текста', async() => {
        await text.resizeFromRightUntilTextWraps({
          objectIndex: 0
        })
      })

      const finalSnapshot = await test.step('Завершить ресайз и получить финальное состояние', async() => {
        return text.finishResize({ objectIndex: 0 })
      })

      const afterPointerMoveSnapshot = await test.step('Сдвинуть мышь в сторону от объекта после завершения ресайза', async() => {
        return text.movePointerAwayFromObject({ objectIndex: 0 })
      })

      await test.step('Проверить что после завершения ресайза размер и перенос строк больше не меняются', () => {
        expect(Math.abs(afterPointerMoveSnapshot.width - finalSnapshot.width))
          .toBeLessThanOrEqual(TEXT_RESIZING_TOLERANCE.mouseupJump)
        expect(afterPointerMoveSnapshot.lineCount).toBe(finalSnapshot.lineCount)
        expect(afterPointerMoveSnapshot.leftTopX).toBeCloseTo(finalSnapshot.leftTopX, 1)
        expect(afterPointerMoveSnapshot.leftTopY).toBeCloseTo(finalSnapshot.leftTopY, 1)
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

    const newLiveSnapshot = await test.step('Сузить справа объект, созданный напрямую', async() => {
      return text.resizeFromRightUntilTextWraps({
        objectIndex: 0
      })
    })
    await test.step('Завершить ресайз первого объекта перед переходом ко второму', async() => {
      await text.finishResize({ objectIndex: 0 })
    })
    const templateLiveSnapshot = await test.step('Сузить справа объект из шаблона', async() => {
      return text.resizeFromRightUntilTextWraps({
        objectIndex: 1
      })
    })

    await test.step('Проверить что оба объекта переносят текст и остаются на месте одинаково', () => {
      expect(newLiveSnapshot.width).toBeLessThan(newInitialSnapshot.width)
      expect(templateLiveSnapshot.width).toBeLessThan(templateInitialSnapshot.width)
      expect(newLiveSnapshot.lineCount).toBeGreaterThan(newInitialSnapshot.lineCount)
      expect(templateLiveSnapshot.lineCount).toBeGreaterThan(templateInitialSnapshot.lineCount)
      expect(newLiveSnapshot.lineCount).toBe(templateLiveSnapshot.lineCount)
      expect(newLiveSnapshot.leftCenterX).toBeCloseTo(newInitialSnapshot.leftCenterX, 1)
      expect(newLiveSnapshot.leftCenterY).toBeCloseTo(newInitialSnapshot.leftCenterY, 1)
      expect(templateLiveSnapshot.leftCenterX).toBeCloseTo(templateInitialSnapshot.leftCenterX, 1)
      expect(templateLiveSnapshot.leftCenterY).toBeCloseTo(templateInitialSnapshot.leftCenterY, 1)
    })

    await test.step('Проверить что неподвижная сторона обоих объектов остаётся в одном допуске', () => {
      expect(Math.abs(newLiveSnapshot.leftCenterY - newInitialSnapshot.leftCenterY))
        .toBeLessThanOrEqual(TEXT_RESIZING_TOLERANCE.anchor)
      expect(Math.abs(templateLiveSnapshot.leftCenterY - templateInitialSnapshot.leftCenterY))
        .toBeLessThanOrEqual(TEXT_RESIZING_TOLERANCE.anchor)
    })
  })

  test.describe('объект из буфера', () => {
    test('объект из буфера сохраняет неподвижную сторону при сужении справа', async({
      clipboard,
      editorModel,
      text
    }) => {
      const sourceTextObject = await test.step('Добавить исходный текстовый объект и скопировать его', async() => {
        const textObject = await text.addRegressionText()
        const createdTextObject = text.checkCreation({ textObject })

        await text.select({ objectIndex: 0 })
        await clipboard.copy()
        await clipboard.waitForClipboardReady()

        return createdTextObject
      })

      await test.step('Вставить объект из буфера и разнести оба объекта по вертикали', async() => {
        const pasted = await clipboard.paste()

        expect(pasted).toBe(true)
        await editorModel.checkObjectCount({ count: 2 })
        await text.updateStyle({
          objectIndex: 1,
          style: {
            left: sourceTextObject.left,
            top: sourceTextObject.top + 80
          }
        })
      })

      const initialSnapshot = await test.step('Получить исходное состояние объекта из буфера', async() => {
        return text.getResizeSnapshot({ objectIndex: 1 })
      })

      const liveSnapshot = await test.step('Сузить объект из буфера справа до состояния с переносом текста', async() => {
        return text.resizeFromRightUntilTextWraps({
          objectIndex: 1
        })
      })

      await test.step('Проверить что текст перенёсся, а левая сторона осталась на месте', () => {
        expect(liveSnapshot.width).toBeLessThan(initialSnapshot.width)
        expect(liveSnapshot.lineCount).toBeGreaterThan(initialSnapshot.lineCount)
        expect(liveSnapshot.leftCenterX).toBeCloseTo(initialSnapshot.leftCenterX, 1)
        expect(liveSnapshot.leftCenterY).toBeCloseTo(initialSnapshot.leftCenterY, 1)
      })
    })
  })

  test('после сохранения текста в шаблон и повторного применения он так же сужается справа, как исходный', async({
    editorModel,
    template,
    text
  }) => {
    const setup = await test.step('Сохранить исходный текст в шаблон и применить его повторно', async() => {
      return createTextResizeTemplateRoundtripSetup({ editorModel, template, text })
    })

    const sourceLiveSnapshot = await test.step('Сузить справа исходный объект', async() => {
      return text.resizeFromRightUntilTextWraps({
        objectIndex: 0
      })
    })

    await test.step('Завершить сужение исходного объекта перед переходом ко второму', async() => {
      await text.finishResize({ objectIndex: 0 })
    })

    const templateLiveSnapshot = await test.step('Сузить справа объект из повторно применённого шаблона', async() => {
      return text.resizeFromRightUntilTextWraps({
        objectIndex: 1
      })
    })

    await test.step('Проверить что оба объекта одинаково переносят текст и остаются на месте', () => {
      expect(sourceLiveSnapshot.width).toBeLessThan(setup.sourceInitial.width)
      expect(templateLiveSnapshot.width).toBeLessThan(setup.templateInitial.width)
      expect(sourceLiveSnapshot.lineCount).toBeGreaterThan(setup.sourceInitial.lineCount)
      expect(templateLiveSnapshot.lineCount).toBeGreaterThan(setup.templateInitial.lineCount)
      expect(sourceLiveSnapshot.lineCount).toBe(templateLiveSnapshot.lineCount)
      expect(sourceLiveSnapshot.width).toBe(templateLiveSnapshot.width)
      expect(sourceLiveSnapshot.leftCenterX).toBeCloseTo(setup.sourceInitial.leftCenterX, 1)
      expect(sourceLiveSnapshot.leftCenterY).toBeCloseTo(setup.sourceInitial.leftCenterY, 1)
      expect(templateLiveSnapshot.leftCenterX).toBeCloseTo(setup.templateInitial.leftCenterX, 1)
      expect(templateLiveSnapshot.leftCenterY).toBeCloseTo(setup.templateInitial.leftCenterY, 1)
    })
  })
})
