import { test, expect } from '../../fixtures/editor.fixture'
import {
  TEXT_DIAGONAL_SCALING_FACTORS,
  TEXT_DIAGONAL_MINIMUM_PROBE_SCALING_FACTOR,
  TEXT_DIAGONAL_REEXPAND_SCALING_FACTOR,
  TEXT_DIAGONAL_RECOVERY_SCALING_FACTOR,
  TEXT_HORIZONTAL_SCALING_FACTOR,
  TEXT_HORIZONTAL_SCALING_NARROW_STEPS,
  TEXT_MINIMUM_SCALING_ADD_OPTIONS,
  TEXT_RESIZING_REGRESSION_SECOND_LINE_SELECTION,
  TEXT_RESIZING_TOLERANCE,
  TEXT_SCALING_MINIMUM_FONT_SIZE,
  TEXT_SCALING_REGRESSION_WIDTH
} from '../../fixtures/data/text-resizing.data'

test.describe('Скейлинг текстового объекта', () => {
  test.describe('объект с одним размером шрифта', () => {
    test.beforeEach(async({ text }) => {
      const textObject = await text.add(TEXT_MINIMUM_SCALING_ADD_OPTIONS)

      text.checkCreation({ textObject })
    })

    test('при быстром скейлинге по диагонали текст упирается в минимальный размер шрифта и дальше не сжимается', async({
      text
    }) => {
      const initialSnapshot = await test.step('Получить исходное состояние текстового объекта', async() => {
        return text.getResizeSnapshot({ objectIndex: 0 })
      })

      const minimumSnapshot = await test.step('Сжать текст по диагонали до упора в минимальный размер шрифта', async() => {
        return text.shrinkDiagonallyToMinimumSize({ objectIndex: 0 })
      })

      const blockedSnapshot = await test.step('Попробовать ещё сильнее уменьшить текст, не отпуская мышь', async() => {
        return text.scaleDiagonallyFromBottomRight({
          objectIndex: 0,
          scaleX: TEXT_DIAGONAL_MINIMUM_PROBE_SCALING_FACTOR,
          scaleY: TEXT_DIAGONAL_MINIMUM_PROBE_SCALING_FACTOR
        })
      })

      const finalSnapshot = await test.step('Завершить скейлинг и получить финальное состояние', async() => {
        return text.finishScale({ objectIndex: 0 })
      })

      const expectedMinimumWidth = initialSnapshot.width
        * (TEXT_SCALING_MINIMUM_FONT_SIZE / initialSnapshot.fontSize)

      await test.step('Проверить что текст упёрся в минимум и больше не уменьшается', () => {
        expect(minimumSnapshot.fontSize).toBe(TEXT_SCALING_MINIMUM_FONT_SIZE)
        expect(Math.abs(minimumSnapshot.width - expectedMinimumWidth))
          .toBeLessThanOrEqual(TEXT_RESIZING_TOLERANCE.mouseupJump)
        expect(blockedSnapshot.fontSize).toBe(TEXT_SCALING_MINIMUM_FONT_SIZE)
        expect(Math.abs(blockedSnapshot.width - minimumSnapshot.width))
          .toBeLessThanOrEqual(TEXT_RESIZING_TOLERANCE.mouseupJump)
        expect(Math.abs(finalSnapshot.width - minimumSnapshot.width))
          .toBeLessThanOrEqual(TEXT_RESIZING_TOLERANCE.mouseupJump)
        expect(finalSnapshot.fontSize).toBe(TEXT_SCALING_MINIMUM_FONT_SIZE)
        expect(finalSnapshot.scaleX).toBe(1)
        expect(finalSnapshot.scaleY).toBe(1)
      })
    })

    test('после упора в минимальный размер текст можно сразу тянуть обратно, не отпуская мышь', async({
      text
    }) => {
      const minimumSnapshot = await test.step('Сжать текст по диагонали до упора в минимальный размер шрифта', async() => {
        return text.shrinkDiagonallyToMinimumSize({ objectIndex: 0 })
      })

      const expandedSnapshot = await test.step('Не отпуская мышь, сразу потянуть текст обратно', async() => {
        return text.scaleDiagonallyFromBottomRight({
          objectIndex: 0,
          scaleX: TEXT_DIAGONAL_RECOVERY_SCALING_FACTOR,
          scaleY: TEXT_DIAGONAL_RECOVERY_SCALING_FACTOR
        })
      })

      const finalSnapshot = await test.step('Завершить скейлинг и получить финальное состояние', async() => {
        return text.finishScale({ objectIndex: 0 })
      })

      await test.step('Проверить что после упора в минимум текст снова начинает увеличиваться', () => {
        expect(expandedSnapshot.width).toBeGreaterThan(minimumSnapshot.width + 1)
        expect(expandedSnapshot.fontSize).toBeGreaterThan(minimumSnapshot.fontSize)
        expect(Math.abs(finalSnapshot.width - expandedSnapshot.width))
          .toBeLessThanOrEqual(TEXT_RESIZING_TOLERANCE.mouseupJump)
        expect(finalSnapshot.fontSize).toBeCloseTo(expandedSnapshot.fontSize, 5)
      })
    })

    test('после повторного уменьшения по диагонали текст приходит к той же минимальной ширине и тому же размеру шрифта', async({
      text
    }) => {
      const firstMinimumSnapshot = await test.step('Первый раз сжать текст до минимального размера', async() => {
        return text.shrinkDiagonallyToMinimumSize({ objectIndex: 0 })
      })

      await test.step('Зафиксировать первое минимальное состояние', async() => {
        await text.finishScale({ objectIndex: 0 })
      })

      const expandedSnapshot = await test.step('Повторно увеличить текст после фиксации минимального размера', async() => {
        return text.scaleDiagonallyFromBottomRight({
          objectIndex: 0,
          scaleX: TEXT_DIAGONAL_REEXPAND_SCALING_FACTOR,
          scaleY: TEXT_DIAGONAL_REEXPAND_SCALING_FACTOR
        })
      })

      await test.step('Зафиксировать увеличенное состояние', async() => {
        await text.finishScale({ objectIndex: 0 })
      })

      const secondMinimumSnapshot = await test.step('Повторно сжать текст до минимального размера', async() => {
        return text.shrinkDiagonallyToMinimumSize({ objectIndex: 0 })
      })

      await test.step('Проверить что минимальная ширина и минимальный размер шрифта совпадают в обоих циклах', () => {
        expect(expandedSnapshot.width).toBeGreaterThan(firstMinimumSnapshot.width + 1)
        expect(expandedSnapshot.fontSize).toBeGreaterThan(firstMinimumSnapshot.fontSize)
        expect(Math.abs(secondMinimumSnapshot.width - firstMinimumSnapshot.width))
          .toBeLessThanOrEqual(TEXT_RESIZING_TOLERANCE.mouseupJump)
        expect(secondMinimumSnapshot.fontSize).toBe(firstMinimumSnapshot.fontSize)
      })

      await test.step('Завершить повторный скейлинг в минимальное состояние', async() => {
        await text.finishScale({ objectIndex: 0 })
      })
    })
  })

  test.describe('объект с разными размерами строк', () => {
    test.beforeEach(async({ text }) => {
      await text.addRegressionText()
    })

    test('после ручного сужения скейлинг по диагонали использует новую ширину как базовую', async({
      text
    }) => {
      const initialSnapshot = await test.step('Получить исходное состояние текстового объекта', async() => {
        return text.getResizeSnapshot({ objectIndex: 0 })
      })

      const targetWidth = Math.min(
        TEXT_SCALING_REGRESSION_WIDTH,
        Math.max(80, initialSnapshot.width - 80)
      )

      await test.step('Сузить текстовый объект вручную и зафиксировать новую ширину', async() => {
        await text.resizeFromRightToWidth({
          objectIndex: 0,
          width: targetWidth
        })
        await text.finishResize({ objectIndex: 0 })
      })

      const narrowedSnapshot = await test.step('Получить состояние после ручного сужения', async() => {
        return text.getResizeSnapshot({ objectIndex: 0 })
      })

      await test.step('Масштабировать текстовый объект по диагонали', async() => {
        await text.scaleDiagonallyFromBottomRight({
          objectIndex: 0,
          scaleX: TEXT_DIAGONAL_SCALING_FACTORS.scaleX,
          scaleY: TEXT_DIAGONAL_SCALING_FACTORS.scaleY
        })
      })

      const scaledSnapshot = await test.step('Завершить скейлинг и получить финальное состояние', async() => {
        await text.finishScale({ objectIndex: 0 })
        return text.getResizeSnapshot({ objectIndex: 0 })
      })

      const expectedWidthFromNewBase = narrowedSnapshot.width * TEXT_DIAGONAL_SCALING_FACTORS.scaleX
      const expectedWidthFromOriginalBase = initialSnapshot.width * TEXT_DIAGONAL_SCALING_FACTORS.scaleX

      await test.step('Проверить что новой базой стала вручную заданная ширина, а не исходная', () => {
        expect(Math.abs(scaledSnapshot.width - expectedWidthFromNewBase))
          .toBeLessThanOrEqual(TEXT_RESIZING_TOLERANCE.mouseupJump)
        expect(Math.abs(scaledSnapshot.width - expectedWidthFromOriginalBase)).toBeGreaterThan(20)
        expect(scaledSnapshot.width).toBeGreaterThan(narrowedSnapshot.width + 1)
        expect(scaledSnapshot.scaleX).toBe(1)
        expect(scaledSnapshot.scaleY).toBe(1)
      })
    })

    test('после скейлинга по диагонали текст с разными размерами строк сохраняет разницу между строками после mouseup', async({
      text
    }) => {
      const initialSnapshot = await test.step('Получить исходное состояние текстового объекта', async() => {
        return text.getResizeSnapshot({ objectIndex: 0 })
      })

      const initialSecondLineStyle = await test.step('Прочитать размер шрифта второй строки до скейлинга', async() => {
        await text.enterTextEditing({ objectIndex: 0 })
        await text.setTextSelection({
          objectIndex: 0,
          start: TEXT_RESIZING_REGRESSION_SECOND_LINE_SELECTION.start,
          end: TEXT_RESIZING_REGRESSION_SECOND_LINE_SELECTION.end
        })

        const selectionStyle = await text.getSelectionStyles({ objectIndex: 0 })

        await text.exitTextEditing({ objectIndex: 0 })

        return selectionStyle
      })

      await test.step('Масштабировать текст по диагонали', async() => {
        await text.scaleDiagonallyFromBottomRight({
          objectIndex: 0,
          scaleX: TEXT_DIAGONAL_SCALING_FACTORS.scaleX,
          scaleY: TEXT_DIAGONAL_SCALING_FACTORS.scaleY
        })
      })

      const finalSnapshot = await test.step('Завершить скейлинг и получить финальное состояние', async() => {
        return text.finishScale({ objectIndex: 0 })
      })

      const finalSecondLineStyle = await test.step('Прочитать размер шрифта второй строки после завершения скейлинга', async() => {
        await text.enterTextEditing({ objectIndex: 0 })
        await text.setTextSelection({
          objectIndex: 0,
          start: TEXT_RESIZING_REGRESSION_SECOND_LINE_SELECTION.start,
          end: TEXT_RESIZING_REGRESSION_SECOND_LINE_SELECTION.end
        })

        const selectionStyle = await text.getSelectionStyles({ objectIndex: 0 })

        await text.exitTextEditing({ objectIndex: 0 })

        return selectionStyle
      })

      await test.step('Проверить что относительная разница между строками сохраняется после mouseup', () => {
        expect(initialSecondLineStyle?.fontSize).not.toBeNull()
        expect(finalSecondLineStyle?.fontSize).not.toBeNull()

        const initialSecondLineFontSize = initialSecondLineStyle?.fontSize ?? 0
        const finalSecondLineFontSize = finalSecondLineStyle?.fontSize ?? 0
        const initialRatio = initialSecondLineFontSize / initialSnapshot.fontSize
        const finalRatio = finalSecondLineFontSize / finalSnapshot.fontSize

        expect(finalSnapshot.fontSize).toBeGreaterThan(initialSnapshot.fontSize)
        expect(finalSecondLineFontSize).toBeGreaterThan(initialSecondLineFontSize)
        expect(finalSecondLineFontSize).toBeLessThan(finalSnapshot.fontSize)
        expect(finalRatio).toBeCloseTo(initialRatio, 2)
      })
    })

    test('после undo и redo текст с разными размерами строк сохраняет размеры строк после диагонального скейлинга', async({
      history,
      text
    }) => {
      await test.step('Масштабировать текст по диагонали и сохранить это состояние в history', async() => {
        await text.scaleDiagonallyFromBottomRight({
          objectIndex: 0,
          scaleX: TEXT_DIAGONAL_SCALING_FACTORS.scaleX,
          scaleY: TEXT_DIAGONAL_SCALING_FACTORS.scaleY
        })
        await text.finishScale({ objectIndex: 0 })
        await history.flushPendingSave()
      })

      const scaledSnapshot = await test.step('Получить состояние после диагонального скейлинга', async() => {
        return text.getResizeSnapshot({ objectIndex: 0 })
      })

      const scaledSecondLineStyle = await test.step('Прочитать размер шрифта второй строки после скейлинга', async() => {
        await text.enterTextEditing({ objectIndex: 0 })
        await text.setTextSelection({
          objectIndex: 0,
          start: TEXT_RESIZING_REGRESSION_SECOND_LINE_SELECTION.start,
          end: TEXT_RESIZING_REGRESSION_SECOND_LINE_SELECTION.end
        })

        const selectionStyle = await text.getSelectionStyles({ objectIndex: 0 })

        await text.exitTextEditing({ objectIndex: 0 })

        return selectionStyle
      })

      await test.step('Сделать undo и redo', async() => {
        await history.undo()
        await history.redo()
      })

      const redoneSnapshot = await test.step('Получить состояние после redo', async() => {
        return text.getResizeSnapshot({ objectIndex: 0 })
      })

      const redoneSecondLineStyle = await test.step('Прочитать размер шрифта второй строки после redo', async() => {
        await text.enterTextEditing({ objectIndex: 0 })
        await text.setTextSelection({
          objectIndex: 0,
          start: TEXT_RESIZING_REGRESSION_SECOND_LINE_SELECTION.start,
          end: TEXT_RESIZING_REGRESSION_SECOND_LINE_SELECTION.end
        })

        const selectionStyle = await text.getSelectionStyles({ objectIndex: 0 })

        await text.exitTextEditing({ objectIndex: 0 })

        return selectionStyle
      })

      await test.step('Проверить что redo возвращает те же размеры строк и ту же пропорцию между ними', () => {
        expect(scaledSecondLineStyle?.fontSize).not.toBeNull()
        expect(redoneSecondLineStyle?.fontSize).not.toBeNull()

        const scaledSecondLineFontSize = scaledSecondLineStyle?.fontSize ?? 0
        const redoneSecondLineFontSize = redoneSecondLineStyle?.fontSize ?? 0
        const scaledRatio = scaledSecondLineFontSize / scaledSnapshot.fontSize
        const redoneRatio = redoneSecondLineFontSize / redoneSnapshot.fontSize

        expect(Math.abs(redoneSnapshot.fontSize - scaledSnapshot.fontSize))
          .toBeLessThanOrEqual(TEXT_RESIZING_TOLERANCE.mouseupJump)
        expect(Math.abs(redoneSecondLineFontSize - scaledSecondLineFontSize))
          .toBeLessThanOrEqual(TEXT_RESIZING_TOLERANCE.mouseupJump)
        expect(redoneSecondLineFontSize).toBeLessThan(redoneSnapshot.fontSize)
        expect(redoneRatio).toBeCloseTo(scaledRatio, 2)
      })
    })
  })

  test.describe('объект восстановлен из шаблона', () => {
    test.beforeEach(async({ history, text }) => {
      await text.applyRegressionTemplate()
      await history.flushPendingSave()
    })

    test('при постепенном сужении объекта из шаблона скейлингом ширина уменьшается без откатов', async({
      text
    }) => {
      const initialSnapshot = await test.step('Получить исходное состояние объекта из шаблона', async() => {
        return text.getResizeSnapshot({ objectIndex: 0 })
      })

      const firstLiveSnapshot = await test.step('Сделать первый шаг сужения скейлингом', async() => {
        return text.scaleHorizontallyFromRight({
          objectIndex: 0,
          scaleX: TEXT_HORIZONTAL_SCALING_NARROW_STEPS[0]
        })
      })

      const secondLiveSnapshot = await test.step('Сделать второй шаг сужения скейлингом', async() => {
        return text.scaleHorizontallyFromRight({
          objectIndex: 0,
          scaleX: TEXT_HORIZONTAL_SCALING_NARROW_STEPS[1]
        })
      })

      const thirdLiveSnapshot = await test.step('Сделать третий шаг сужения скейлингом', async() => {
        return text.scaleHorizontallyFromRight({
          objectIndex: 0,
          scaleX: TEXT_HORIZONTAL_SCALING_NARROW_STEPS[2]
        })
      })

      await test.step('Завершить скейлинг объекта из шаблона', async() => {
        await text.finishScale({ objectIndex: 0 })
      })

      await test.step('Проверить что при каждом шаге ширина только уменьшается', () => {
        expect(firstLiveSnapshot.width).toBeLessThan(initialSnapshot.width)
        expect(secondLiveSnapshot.width).toBeLessThan(firstLiveSnapshot.width)
        expect(thirdLiveSnapshot.width).toBeLessThan(secondLiveSnapshot.width)
      })
    })

    test('при постепенном сужении объекта из шаблона скейлингом перенос строк не откатывается назад', async({
      text
    }) => {
      const initialSnapshot = await test.step('Получить исходное состояние объекта из шаблона', async() => {
        return text.getResizeSnapshot({ objectIndex: 0 })
      })

      const firstLiveSnapshot = await test.step('Сделать первый шаг сужения скейлингом', async() => {
        return text.scaleHorizontallyFromRight({
          objectIndex: 0,
          scaleX: TEXT_HORIZONTAL_SCALING_NARROW_STEPS[0]
        })
      })

      const secondLiveSnapshot = await test.step('Сделать второй шаг сужения скейлингом', async() => {
        return text.scaleHorizontallyFromRight({
          objectIndex: 0,
          scaleX: TEXT_HORIZONTAL_SCALING_NARROW_STEPS[1]
        })
      })

      const thirdLiveSnapshot = await test.step('Сделать третий шаг сужения скейлингом', async() => {
        return text.scaleHorizontallyFromRight({
          objectIndex: 0,
          scaleX: TEXT_HORIZONTAL_SCALING_NARROW_STEPS[2]
        })
      })

      await test.step('Завершить скейлинг объекта из шаблона', async() => {
        await text.finishScale({ objectIndex: 0 })
      })

      await test.step('Проверить что число строк не уменьшается, пока объект продолжает сужаться', () => {
        expect(thirdLiveSnapshot.lineCount).toBeGreaterThan(initialSnapshot.lineCount)
        expect(secondLiveSnapshot.lineCount).toBeGreaterThanOrEqual(firstLiveSnapshot.lineCount)
        expect(thirdLiveSnapshot.lineCount).toBeGreaterThanOrEqual(secondLiveSnapshot.lineCount)
      })
    })

    test('после ручного сужения объект из шаблона масштабируется от текущей ширины, а не от старой', async({
      text
    }) => {
      const initialSnapshot = await test.step('Получить исходное состояние объекта из шаблона', async() => {
        return text.getResizeSnapshot({ objectIndex: 0 })
      })

      const targetWidth = Math.min(
        TEXT_SCALING_REGRESSION_WIDTH,
        Math.max(80, initialSnapshot.width - 80)
      )

      await test.step('Сузить объект из шаблона вручную и зафиксировать новую ширину', async() => {
        await text.resizeFromRightToWidth({
          objectIndex: 0,
          width: targetWidth
        })
        await text.finishResize({ objectIndex: 0 })
      })

      const narrowedSnapshot = await test.step('Получить состояние после ручного сужения', async() => {
        return text.getResizeSnapshot({ objectIndex: 0 })
      })

      await test.step('Масштабировать объект из шаблона по горизонтали', async() => {
        await text.scaleHorizontallyFromRight({
          objectIndex: 0,
          scaleX: TEXT_HORIZONTAL_SCALING_FACTOR
        })
      })

      const scaledSnapshot = await test.step('Завершить скейлинг и получить финальное состояние', async() => {
        await text.finishScale({ objectIndex: 0 })
        return text.getResizeSnapshot({ objectIndex: 0 })
      })

      const expectedWidthFromNewBase = narrowedSnapshot.width * TEXT_HORIZONTAL_SCALING_FACTOR
      const expectedWidthFromOriginalBase = initialSnapshot.width * TEXT_HORIZONTAL_SCALING_FACTOR
      const distanceToNewBase = Math.abs(scaledSnapshot.width - expectedWidthFromNewBase)
      const distanceToOriginalBase = Math.abs(scaledSnapshot.width - expectedWidthFromOriginalBase)

      await test.step('Проверить что новой базой стала вручную заданная ширина, а не исходная', () => {
        expect(distanceToNewBase).toBeLessThan(distanceToOriginalBase)
        expect(distanceToOriginalBase - distanceToNewBase).toBeGreaterThan(20)
        expect(scaledSnapshot.width).toBeGreaterThan(narrowedSnapshot.width + 1)
        expect(scaledSnapshot.scaleX).toBe(1)
        expect(scaledSnapshot.scaleY).toBe(1)
      })
    })

    test('после undo и redo объект из шаблона снова масштабируется без скачка ширины', async({
      history,
      text
    }) => {
      const initialSnapshot = await test.step('Получить исходное состояние объекта из шаблона', async() => {
        return text.getResizeSnapshot({ objectIndex: 0 })
      })

      await test.step('Один раз масштабировать объект из шаблона и сохранить это состояние в history', async() => {
        await text.scaleHorizontallyFromRight({
          objectIndex: 0,
          scaleX: TEXT_HORIZONTAL_SCALING_NARROW_STEPS[1]
        })
        await text.finishScale({ objectIndex: 0 })
        await history.flushPendingSave()
      })

      const scaledSnapshot = await test.step('Получить состояние после первого скейлинга', async() => {
        return text.getResizeSnapshot({ objectIndex: 0 })
      })

      const afterUndoSnapshot = await test.step('Сделать undo и получить состояние объекта', async() => {
        await history.undo()
        return text.getResizeSnapshot({ objectIndex: 0 })
      })

      await test.step('Проверить что undo вернул объект к исходной ширине', () => {
        expect(Math.abs(afterUndoSnapshot.width - initialSnapshot.width))
          .toBeLessThanOrEqual(TEXT_RESIZING_TOLERANCE.mouseupJump)
      })

      const afterRedoSnapshot = await test.step('Сделать redo и получить состояние объекта', async() => {
        await history.redo()
        return text.getResizeSnapshot({ objectIndex: 0 })
      })

      await test.step('Проверить что redo вернул состояние после первого скейлинга', () => {
        expect(Math.abs(afterRedoSnapshot.width - scaledSnapshot.width))
          .toBeLessThanOrEqual(TEXT_RESIZING_TOLERANCE.mouseupJump)
      })

      const secondLiveSnapshot = await test.step('Снова масштабировать объект после redo', async() => {
        return text.scaleHorizontallyFromRight({
          objectIndex: 0,
          scaleX: TEXT_HORIZONTAL_SCALING_NARROW_STEPS[1]
        })
      })

      const secondFinalSnapshot = await test.step('Завершить повторный скейлинг и получить финальное состояние', async() => {
        return text.finishScale({ objectIndex: 0 })
      })

      const expectedWidthFromRedoBase = afterRedoSnapshot.width * TEXT_HORIZONTAL_SCALING_NARROW_STEPS[1]
      const expectedWidthFromInitialBase = initialSnapshot.width * TEXT_HORIZONTAL_SCALING_NARROW_STEPS[1]
      const distanceToRedoBase = Math.abs(secondLiveSnapshot.width - expectedWidthFromRedoBase)
      const distanceToInitialBase = Math.abs(secondLiveSnapshot.width - expectedWidthFromInitialBase)

      await test.step('Проверить что повторный скейлинг после redo снова идёт от текущей ширины без скачка', () => {
        expect(distanceToRedoBase).toBeLessThan(distanceToInitialBase)
        expect(distanceToInitialBase - distanceToRedoBase).toBeGreaterThan(20)
        expect(Math.abs(secondFinalSnapshot.width - secondLiveSnapshot.width))
          .toBeLessThanOrEqual(TEXT_RESIZING_TOLERANCE.mouseupJump)
      })
    })

    test('после завершения скейлинга движение мыши больше не продолжает менять размер объекта из шаблона', async({
      text
    }) => {
      await test.step('Сузить объект из шаблона скейлингом', async() => {
        await text.scaleHorizontallyFromRight({
          objectIndex: 0,
          scaleX: TEXT_HORIZONTAL_SCALING_NARROW_STEPS[1]
        })
      })

      const finalSnapshot = await test.step('Завершить скейлинг и получить финальное состояние', async() => {
        return text.finishScale({ objectIndex: 0 })
      })

      const afterPointerMoveSnapshot = await test.step('Сдвинуть мышь в сторону от объекта после завершения скейлинга', async() => {
        return text.movePointerAwayFromObject({ objectIndex: 0 })
      })

      await test.step('Проверить что после завершения скейлинга размер больше не меняется', () => {
        expect(Math.abs(afterPointerMoveSnapshot.width - finalSnapshot.width))
          .toBeLessThanOrEqual(TEXT_RESIZING_TOLERANCE.mouseupJump)
        expect(afterPointerMoveSnapshot.lineCount).toBe(finalSnapshot.lineCount)
        expect(afterPointerMoveSnapshot.leftTopX).toBeCloseTo(finalSnapshot.leftTopX, 1)
        expect(afterPointerMoveSnapshot.leftTopY).toBeCloseTo(finalSnapshot.leftTopY, 1)
      })
    })
  })

  test('после ручного сужения объект из буфера масштабируется так же, как исходный', async({
    clipboard,
    editorModel,
    text
  }) => {
    let pastedObjectIndex = 1

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
      const objects = await editorModel.getObjects()

      expect(pasted).toBe(true)
      expect(objects.length).toBeGreaterThan(1)
      pastedObjectIndex = objects.length - 1
      await text.updateStyle({
        objectIndex: pastedObjectIndex,
        style: {
          left: sourceTextObject.left,
          top: sourceTextObject.top + 80
        }
      })
    })

    const sourceInitialSnapshot = await test.step('Получить исходное состояние исходного объекта', async() => {
      return text.getResizeSnapshot({ objectIndex: 0 })
    })
    const pastedInitialSnapshot = await test.step('Получить исходное состояние объекта из буфера', async() => {
      return text.getResizeSnapshot({ objectIndex: pastedObjectIndex })
    })

    const targetWidth = Math.min(
      TEXT_SCALING_REGRESSION_WIDTH,
      Math.max(80, sourceInitialSnapshot.width - 80)
    )

    await test.step('Сузить оба объекта вручную до одной и той же ширины', async() => {
      await text.resizeFromRightToWidth({
        objectIndex: 0,
        width: targetWidth
      })
      await text.finishResize({ objectIndex: 0 })

      await text.resizeFromRightToWidth({
        objectIndex: pastedObjectIndex,
        width: targetWidth
      })
      await text.finishResize({ objectIndex: pastedObjectIndex })
    })

    const sourceNarrowedSnapshot = await test.step('Получить состояние исходного объекта после ручного сужения', async() => {
      return text.getResizeSnapshot({ objectIndex: 0 })
    })
    const pastedNarrowedSnapshot = await test.step('Получить состояние объекта из буфера после ручного сужения', async() => {
      return text.getResizeSnapshot({ objectIndex: pastedObjectIndex })
    })

    const sourceLiveSnapshot = await test.step('Масштабировать по горизонтали исходный объект', async() => {
      return text.scaleHorizontallyFromRight({
        objectIndex: 0,
        scaleX: TEXT_HORIZONTAL_SCALING_FACTOR
      })
    })

    const sourceFinalSnapshot = await test.step('Завершить скейлинг исходного объекта', async() => {
      return text.finishScale({ objectIndex: 0 })
    })

    const pastedLiveSnapshot = await test.step('Масштабировать по горизонтали объект из буфера', async() => {
      return text.scaleHorizontallyFromRight({
        objectIndex: pastedObjectIndex,
        scaleX: TEXT_HORIZONTAL_SCALING_FACTOR
      })
    })

    const pastedFinalSnapshot = await test.step('Завершить скейлинг объекта из буфера', async() => {
      return text.finishScale({ objectIndex: pastedObjectIndex })
    })

    await test.step('Проверить что исходный и вставленный объект масштабируются одинаково', () => {
      expect(Math.abs(sourceLiveSnapshot.width - pastedLiveSnapshot.width))
        .toBeLessThanOrEqual(TEXT_RESIZING_TOLERANCE.mouseupJump)
      expect(Math.abs(sourceFinalSnapshot.width - sourceLiveSnapshot.width))
        .toBeLessThanOrEqual(TEXT_RESIZING_TOLERANCE.mouseupJump)
      expect(Math.abs(pastedFinalSnapshot.width - pastedLiveSnapshot.width))
        .toBeLessThanOrEqual(TEXT_RESIZING_TOLERANCE.mouseupJump)
      expect(Math.abs(sourceFinalSnapshot.width - pastedFinalSnapshot.width))
        .toBeLessThanOrEqual(TEXT_RESIZING_TOLERANCE.mouseupJump)
      expect(sourceFinalSnapshot.lineCount).toBe(pastedFinalSnapshot.lineCount)
      expect(sourceFinalSnapshot.width).toBeGreaterThan(sourceNarrowedSnapshot.width + 1)
      expect(pastedFinalSnapshot.width).toBeGreaterThan(pastedNarrowedSnapshot.width + 1)
      expect(sourceNarrowedSnapshot.width).toBeLessThan(sourceInitialSnapshot.width)
      expect(pastedNarrowedSnapshot.width).toBeLessThan(pastedInitialSnapshot.width)
    })
  })
})
