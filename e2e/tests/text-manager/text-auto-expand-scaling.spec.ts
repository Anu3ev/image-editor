import { test, expect } from '../../fixtures/editor.fixture'
import {
  TEXT_DIAGONAL_SCALING_FACTORS,
  TEXT_RESIZING_TOLERANCE,
  TEXT_VERTICAL_SCALING_FACTOR
} from '../../fixtures/data/text-resizing.data'
import {
  TEXT_AUTO_EXPAND_LIMIT_BASE_OPTIONS,
  TEXT_AUTO_EXPAND_LIMIT_RESOLUTION,
  TEXT_AUTO_EXPAND_LIMIT_TEXT,
  TEXT_AUTO_EXPAND_STACK_OFFSET,
  TEXT_AUTO_EXPAND_TOLERANCE
} from '../../fixtures/data/text-auto-expand.data'

test.describe('Скейлинг текста с autoExpand', () => {
  test.beforeEach(async({ canvas }) => {
    await canvas.setMontageResolution(TEXT_AUTO_EXPAND_LIMIT_RESOLUTION)
  })

  test.describe('объект создан напрямую', () => {
    test.describe('когда текст уже переносится из-за ширины монтажной области', () => {
      test.beforeEach(async({ text }) => {
        const textObject = await text.add(TEXT_AUTO_EXPAND_LIMIT_BASE_OPTIONS)
        text.checkCreation({ textObject })

        await text.enterTextEditing({ objectIndex: 0 })
        await text.updateEditingText({
          objectIndex: 0,
          text: TEXT_AUTO_EXPAND_LIMIT_TEXT
        })
        await text.exitTextEditing({ objectIndex: 0 })
      })

      test('при скейлинге по диагонали не раздувается по длине строки', async({ text }) => {
        const limitedSnapshot = await test.step('Получить состояние текста после упора в ширину монтажной области', async() => {
          return text.getResizeSnapshot({ objectIndex: 0 })
        })

        await test.step('Проверить предусловие для многострочного текста', () => {
          expect(limitedSnapshot.lineCount).toBeGreaterThan(1)
          expect(limitedSnapshot.autoExpand).toBe(true)
        })

        const liveSnapshot = await test.step('Масштабировать текст по диагонали', async() => {
          return text.scaleDiagonallyFromBottomRight({
            objectIndex: 0,
            scaleX: TEXT_DIAGONAL_SCALING_FACTORS.scaleX,
            scaleY: TEXT_DIAGONAL_SCALING_FACTORS.scaleY
          })
        })

        const finalSnapshot = await test.step('Завершить скейлинг и получить финальное состояние', async() => {
          return text.finishScale({ objectIndex: 0 })
        })

        const expectedWidth = limitedSnapshot.width * TEXT_DIAGONAL_SCALING_FACTORS.scaleX

        await test.step('Проверить что ширина следует за текущей базой, а не за длиной строки', () => {
          expect(Math.abs(liveSnapshot.width - expectedWidth))
            .toBeLessThanOrEqual(TEXT_RESIZING_TOLERANCE.mouseupJump)
          expect(Math.abs(finalSnapshot.width - liveSnapshot.width))
            .toBeLessThanOrEqual(TEXT_RESIZING_TOLERANCE.mouseupJump)
          expect(finalSnapshot.lineCount).toBeGreaterThan(1)
          expect(finalSnapshot.autoExpand).toBe(true)
          expect(finalSnapshot.scaleX).toBe(1)
          expect(finalSnapshot.scaleY).toBe(1)
        })
      })

      test('при вертикальном скейлинге не меняет ширину', async({ text }) => {
        const limitedSnapshot = await test.step('Получить состояние текста после упора в ширину монтажной области', async() => {
          return text.getResizeSnapshot({ objectIndex: 0 })
        })

        await test.step('Проверить предусловие для многострочного текста', () => {
          expect(limitedSnapshot.lineCount).toBeGreaterThan(1)
          expect(limitedSnapshot.autoExpand).toBe(true)
        })

        const liveSnapshot = await test.step('Масштабировать текст по вертикали', async() => {
          return text.scaleVerticallyFromBottom({
            objectIndex: 0,
            scaleY: TEXT_VERTICAL_SCALING_FACTOR
          })
        })

        const finalSnapshot = await test.step('Завершить скейлинг и получить финальное состояние', async() => {
          return text.finishScale({ objectIndex: 0 })
        })

        await test.step('Проверить что ширина не изменилась, а объект не подпрыгнул после mouseup', () => {
          expect(Math.abs(liveSnapshot.width - limitedSnapshot.width))
            .toBeLessThanOrEqual(TEXT_RESIZING_TOLERANCE.mouseupJump)
          expect(Math.abs(finalSnapshot.width - liveSnapshot.width))
            .toBeLessThanOrEqual(TEXT_RESIZING_TOLERANCE.mouseupJump)
          expect(finalSnapshot.height).toBeGreaterThan(limitedSnapshot.height + 1)
          expect(finalSnapshot.lineCount).toBeGreaterThan(1)
          expect(finalSnapshot.autoExpand).toBe(true)
          expect(finalSnapshot.scaleX).toBe(1)
          expect(finalSnapshot.scaleY).toBe(1)
        })
      })
    })

    test('после undo и redo текст можно снова масштабировать без скачка ширины', async({
      history,
      text
    }) => {
      await test.step('Добавить текстовый объект и довести его до переноса из-за ширины монтажной области', async() => {
        const textObject = await text.add(TEXT_AUTO_EXPAND_LIMIT_BASE_OPTIONS)
        text.checkCreation({ textObject })

        await text.enterTextEditing({ objectIndex: 0 })
        await text.updateEditingText({
          objectIndex: 0,
          text: TEXT_AUTO_EXPAND_LIMIT_TEXT
        })
        await text.exitTextEditing({ objectIndex: 0 })
        await history.flushPendingSave()
      })

      const limitedSnapshot = await test.step('Получить базовое состояние перед первым скейлингом', async() => {
        return text.getResizeSnapshot({ objectIndex: 0 })
      })

      await test.step('Проверить предусловие для многострочного текста', () => {
        expect(limitedSnapshot.lineCount).toBeGreaterThan(1)
        expect(limitedSnapshot.autoExpand).toBe(true)
      })

      await test.step('Один раз масштабировать текст и сохранить это состояние в history', async() => {
        await text.scaleDiagonallyFromBottomRight({
          objectIndex: 0,
          scaleX: TEXT_DIAGONAL_SCALING_FACTORS.scaleX,
          scaleY: TEXT_DIAGONAL_SCALING_FACTORS.scaleY
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

      await test.step('Проверить что undo вернул текст к более узкому состоянию', () => {
        expect(Math.abs(afterUndoSnapshot.width - limitedSnapshot.width))
          .toBeLessThanOrEqual(TEXT_RESIZING_TOLERANCE.mouseupJump)
        expect(afterUndoSnapshot.lineCount).toBeGreaterThan(1)
      })

      const afterRedoSnapshot = await test.step('Сделать redo и получить состояние объекта', async() => {
        await history.redo()
        return text.getResizeSnapshot({ objectIndex: 0 })
      })

      await test.step('Проверить что redo вернул состояние после первого скейлинга', () => {
        expect(Math.abs(afterRedoSnapshot.width - scaledSnapshot.width))
          .toBeLessThanOrEqual(TEXT_RESIZING_TOLERANCE.mouseupJump)
        expect(afterRedoSnapshot.lineCount).toBe(scaledSnapshot.lineCount)
      })

      const secondLiveSnapshot = await test.step('Снова масштабировать текст по диагонали после redo', async() => {
        return text.scaleDiagonallyFromBottomRight({
          objectIndex: 0,
          scaleX: TEXT_DIAGONAL_SCALING_FACTORS.scaleX,
          scaleY: TEXT_DIAGONAL_SCALING_FACTORS.scaleY
        })
      })

      const secondFinalSnapshot = await test.step('Завершить повторный скейлинг и получить финальное состояние', async() => {
        return text.finishScale({ objectIndex: 0 })
      })

      const expectedWidth = afterRedoSnapshot.width * TEXT_DIAGONAL_SCALING_FACTORS.scaleX

      await test.step('Проверить что повторный скейлинг после redo снова не даёт лишний скачок ширины', () => {
        expect(Math.abs(secondLiveSnapshot.width - expectedWidth))
          .toBeLessThanOrEqual(TEXT_RESIZING_TOLERANCE.mouseupJump)
        expect(Math.abs(secondFinalSnapshot.width - secondLiveSnapshot.width))
          .toBeLessThanOrEqual(TEXT_RESIZING_TOLERANCE.mouseupJump)
        expect(secondFinalSnapshot.autoExpand).toBe(true)
      })
    })
  })

  // eslint-disable-next-line max-len
  test('объект, созданный напрямую, и объект из шаблона одинаково ведут себя при скейлинге по диагонали после упора в ширину монтажной области', async({
    editorModel,
    template,
    text
  }) => {
    const sourceTextObject = await test.step('Добавить исходный текстовый объект и подготовить его к сериализации в шаблон', async() => {
      const textObject = await text.add(TEXT_AUTO_EXPAND_LIMIT_BASE_OPTIONS)
      const createdTextObject = text.checkCreation({ textObject })
      await text.select({ objectIndex: 0 })

      return createdTextObject
    })

    const serializedTemplate = await test.step('Сериализовать выделенный текстовый объект', () => {
      return template.serializeSelection()
    })

    await test.step('Применить шаблон и проверить что на canvas стало два объекта', async() => {
      expect(serializedTemplate).not.toBeNull()

      const insertedCount = await template.applyTemplate({
        template: serializedTemplate!
      })

      expect(insertedCount).toBe(1)
      await editorModel.checkObjectCount({ count: 2 })
    })

    await test.step('Разнести исходный объект и объект из шаблона по вертикали', async() => {
      await text.updateStyle({
        objectIndex: 1,
        style: {
          left: sourceTextObject.left,
          top: sourceTextObject.top + TEXT_AUTO_EXPAND_STACK_OFFSET
        }
      })
    })

    await test.step('Довести оба объекта до переноса из-за ширины монтажной области', async() => {
      await text.enterTextEditing({ objectIndex: 0 })
      await text.updateEditingText({
        objectIndex: 0,
        text: TEXT_AUTO_EXPAND_LIMIT_TEXT
      })
      await text.exitTextEditing({ objectIndex: 0 })

      await text.enterTextEditing({ objectIndex: 1 })
      await text.updateEditingText({
        objectIndex: 1,
        text: TEXT_AUTO_EXPAND_LIMIT_TEXT
      })
      await text.exitTextEditing({ objectIndex: 1 })
    })

    const directLimitedSnapshot = await test.step('Получить состояние объекта созданного напрямую', async() => {
      return text.getResizeSnapshot({ objectIndex: 0 })
    })
    const templateLimitedSnapshot = await test.step('Получить состояние объекта из шаблона', async() => {
      return text.getResizeSnapshot({ objectIndex: 1 })
    })

    await test.step('Проверить предусловие для многострочного текста у обоих объектов', () => {
      expect(directLimitedSnapshot.lineCount).toBeGreaterThan(1)
      expect(templateLimitedSnapshot.lineCount).toBeGreaterThan(1)
      expect(directLimitedSnapshot.autoExpand).toBe(true)
      expect(templateLimitedSnapshot.autoExpand).toBe(true)
    })

    const directLiveSnapshot = await test.step('Масштабировать по диагонали объект созданный напрямую', async() => {
      return text.scaleDiagonallyFromBottomRight({
        objectIndex: 0,
        scaleX: TEXT_DIAGONAL_SCALING_FACTORS.scaleX,
        scaleY: TEXT_DIAGONAL_SCALING_FACTORS.scaleY
      })
    })

    const directFinalSnapshot = await test.step('Завершить скейлинг объекта созданного напрямую', async() => {
      return text.finishScale({ objectIndex: 0 })
    })

    const templateLiveSnapshot = await test.step('Масштабировать по диагонали объект из шаблона', async() => {
      return text.scaleDiagonallyFromBottomRight({
        objectIndex: 1,
        scaleX: TEXT_DIAGONAL_SCALING_FACTORS.scaleX,
        scaleY: TEXT_DIAGONAL_SCALING_FACTORS.scaleY
      })
    })

    const templateFinalSnapshot = await test.step('Завершить скейлинг объекта из шаблона', async() => {
      return text.finishScale({ objectIndex: 1 })
    })

    const directExpectedWidth = directLimitedSnapshot.width * TEXT_DIAGONAL_SCALING_FACTORS.scaleX
    const templateExpectedWidth = templateLimitedSnapshot.width * TEXT_DIAGONAL_SCALING_FACTORS.scaleX

    await test.step('Проверить что оба пути создания дают одинаковое поведение при скейлинге', () => {
      expect(Math.abs(directLiveSnapshot.width - directExpectedWidth))
        .toBeLessThanOrEqual(TEXT_RESIZING_TOLERANCE.mouseupJump)
      expect(Math.abs(templateLiveSnapshot.width - templateExpectedWidth))
        .toBeLessThanOrEqual(TEXT_RESIZING_TOLERANCE.mouseupJump)
      expect(Math.abs(directFinalSnapshot.width - directLiveSnapshot.width))
        .toBeLessThanOrEqual(TEXT_RESIZING_TOLERANCE.mouseupJump)
      expect(Math.abs(templateFinalSnapshot.width - templateLiveSnapshot.width))
        .toBeLessThanOrEqual(TEXT_RESIZING_TOLERANCE.mouseupJump)
      expect(Math.abs(directFinalSnapshot.width - templateFinalSnapshot.width))
        .toBeLessThanOrEqual(TEXT_AUTO_EXPAND_TOLERANCE.geometry)
      expect(directFinalSnapshot.lineCount).toBe(templateFinalSnapshot.lineCount)
    })
  })

  test('исходный объект и объект из буфера одинаково ведут себя при скейлинге по диагонали после упора в ширину монтажной области', async({
    clipboard,
    editorModel,
    text
  }) => {
    const sourceTextObject = await test.step('Добавить исходный текстовый объект и скопировать его', async() => {
      const textObject = await text.add(TEXT_AUTO_EXPAND_LIMIT_BASE_OPTIONS)
      const createdTextObject = text.checkCreation({ textObject })

      await text.select({ objectIndex: 0 })
      await clipboard.copy()
      await clipboard.waitForClipboardReady()

      return createdTextObject
    })

    await test.step('Вставить объект из буфера и проверить что на canvas стало два объекта', async() => {
      const pasted = await clipboard.paste()

      expect(pasted).toBe(true)
      await editorModel.checkObjectCount({ count: 2 })
    })

    await test.step('Разнести исходный объект и объект из буфера по вертикали', async() => {
      await text.updateStyle({
        objectIndex: 1,
        style: {
          left: sourceTextObject.left,
          top: sourceTextObject.top + TEXT_AUTO_EXPAND_STACK_OFFSET
        }
      })
    })

    await test.step('Довести оба объекта до переноса из-за ширины монтажной области', async() => {
      await text.enterTextEditing({ objectIndex: 0 })
      await text.updateEditingText({
        objectIndex: 0,
        text: TEXT_AUTO_EXPAND_LIMIT_TEXT
      })
      await text.exitTextEditing({ objectIndex: 0 })

      await text.enterTextEditing({ objectIndex: 1 })
      await text.updateEditingText({
        objectIndex: 1,
        text: TEXT_AUTO_EXPAND_LIMIT_TEXT
      })
      await text.exitTextEditing({ objectIndex: 1 })
    })

    const sourceLimitedSnapshot = await test.step('Получить состояние исходного объекта', async() => {
      return text.getResizeSnapshot({ objectIndex: 0 })
    })
    const pastedLimitedSnapshot = await test.step('Получить состояние объекта из буфера', async() => {
      return text.getResizeSnapshot({ objectIndex: 1 })
    })

    await test.step('Проверить предусловие для многострочного текста у обоих объектов', () => {
      expect(sourceLimitedSnapshot.lineCount).toBeGreaterThan(1)
      expect(pastedLimitedSnapshot.lineCount).toBeGreaterThan(1)
      expect(sourceLimitedSnapshot.autoExpand).toBe(true)
      expect(pastedLimitedSnapshot.autoExpand).toBe(true)
    })

    const sourceLiveSnapshot = await test.step('Масштабировать по диагонали исходный объект', async() => {
      return text.scaleDiagonallyFromBottomRight({
        objectIndex: 0,
        scaleX: TEXT_DIAGONAL_SCALING_FACTORS.scaleX,
        scaleY: TEXT_DIAGONAL_SCALING_FACTORS.scaleY
      })
    })

    const sourceFinalSnapshot = await test.step('Завершить скейлинг исходного объекта', async() => {
      return text.finishScale({ objectIndex: 0 })
    })

    const pastedLiveSnapshot = await test.step('Масштабировать по диагонали объект из буфера', async() => {
      return text.scaleDiagonallyFromBottomRight({
        objectIndex: 1,
        scaleX: TEXT_DIAGONAL_SCALING_FACTORS.scaleX,
        scaleY: TEXT_DIAGONAL_SCALING_FACTORS.scaleY
      })
    })

    const pastedFinalSnapshot = await test.step('Завершить скейлинг объекта из буфера', async() => {
      return text.finishScale({ objectIndex: 1 })
    })

    const sourceExpectedWidth = sourceLimitedSnapshot.width * TEXT_DIAGONAL_SCALING_FACTORS.scaleX
    const pastedExpectedWidth = pastedLimitedSnapshot.width * TEXT_DIAGONAL_SCALING_FACTORS.scaleX

    await test.step('Проверить что исходный и вставленный объект масштабируются одинаково', () => {
      expect(Math.abs(sourceLiveSnapshot.width - sourceExpectedWidth))
        .toBeLessThanOrEqual(TEXT_RESIZING_TOLERANCE.mouseupJump)
      expect(Math.abs(pastedLiveSnapshot.width - pastedExpectedWidth))
        .toBeLessThanOrEqual(TEXT_RESIZING_TOLERANCE.mouseupJump)
      expect(Math.abs(sourceFinalSnapshot.width - sourceLiveSnapshot.width))
        .toBeLessThanOrEqual(TEXT_RESIZING_TOLERANCE.mouseupJump)
      expect(Math.abs(pastedFinalSnapshot.width - pastedLiveSnapshot.width))
        .toBeLessThanOrEqual(TEXT_RESIZING_TOLERANCE.mouseupJump)
      expect(Math.abs(sourceFinalSnapshot.width - pastedFinalSnapshot.width))
        .toBeLessThanOrEqual(TEXT_AUTO_EXPAND_TOLERANCE.geometry)
      expect(sourceFinalSnapshot.lineCount).toBe(pastedFinalSnapshot.lineCount)
    })
  })
})
