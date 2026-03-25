import { test, expect } from '../../fixtures/editor.fixture'
import {
  TEXT_AUTO_EXPAND_BASE_OPTIONS,
  TEXT_AUTO_EXPAND_EDITING_TEXT,
  TEXT_AUTO_EXPAND_FONT_BASE_OPTIONS,
  TEXT_AUTO_EXPAND_GROWN_FONT_SIZE,
  TEXT_AUTO_EXPAND_LIMIT_RESOLUTION,
  TEXT_AUTO_EXPAND_LIMIT_TEXT,
  TEXT_AUTO_EXPAND_LONGER_TEXT,
  TEXT_AUTO_EXPAND_STACK_OFFSET,
  TEXT_AUTO_EXPAND_TOLERANCE
} from '../../fixtures/data/text-auto-expand.data'

test.describe('Авторасширение обычного текста', () => {
  test('новый текстовый объект по умолчанию создаётся с autoExpand', async({ text }) => {
    const textObject = await test.step('Добавить обычный текстовый объект без явного autoExpand', () => {
      return text.add(TEXT_AUTO_EXPAND_BASE_OPTIONS)
    })

    await test.step('Проверить что autoExpand включён по умолчанию', () => {
      const createdTextObject = text.checkCreation({ textObject })

      expect(createdTextObject.autoExpand).toBe(true)
    })
  })

  test('при вводе длинного текста объект расширяется по ширине от центра', async({ text }) => {
    await test.step('Добавить текстовый объект с коротким текстом', async() => {
      const textObject = await text.add(TEXT_AUTO_EXPAND_BASE_OPTIONS)
      text.checkCreation({ textObject })
    })

    const initialSnapshot = await test.step('Получить исходную геометрию текстового объекта', () => {
      return text.getResizeSnapshot({ objectIndex: 0 })
    })

    await test.step('Открыть редактирование и ввести длинный текст', async() => {
      await text.enterTextEditing({ objectIndex: 0 })
      await text.updateEditingText({
        objectIndex: 0,
        text: TEXT_AUTO_EXPAND_EDITING_TEXT
      })
    })

    const expandedSnapshot = await test.step('Получить состояние после авторасширения', () => {
      return text.getResizeSnapshot({ objectIndex: 0 })
    })

    await test.step('Проверить что ширина выросла, а центр и верхняя граница остались на месте', () => {
      const initialCenterX = initialSnapshot.boundsLeft + (initialSnapshot.boundsWidth / 2)
      const expandedCenterX = expandedSnapshot.boundsLeft + (expandedSnapshot.boundsWidth / 2)

      expect(expandedSnapshot.width).toBeGreaterThan(initialSnapshot.width + 10)
      expect(expandedSnapshot.lineCount).toBe(1)
      expect(Math.abs(expandedCenterX - initialCenterX))
        .toBeLessThanOrEqual(TEXT_AUTO_EXPAND_TOLERANCE.geometry)
      expect(Math.abs(expandedSnapshot.leftTopY - initialSnapshot.leftTopY))
        .toBeLessThanOrEqual(TEXT_AUTO_EXPAND_TOLERANCE.geometry)
      expect(expandedSnapshot.leftTopX).toBeLessThan(initialSnapshot.leftTopX)
      expect(expandedSnapshot.rightTopX).toBeGreaterThan(initialSnapshot.rightTopX)
    })
  })

  test('когда текст упирается в ширину монтажной области, объект остаётся внутри неё, а текст начинает переноситься', async({
    canvas,
    editorModel,
    text
  }) => {
    await test.step('Уменьшить монтажную область для сценария с ограничением ширины', async() => {
      await canvas.setMontageResolution(TEXT_AUTO_EXPAND_LIMIT_RESOLUTION)
    })

    await test.step('Добавить текстовый объект по центру монтажной области', async() => {
      const textObject = await text.add({
        text: 'Текст',
        width: 120,
        fontSize: 32
      })

      text.checkCreation({ textObject })
    })

    const montageBounds = await test.step('Получить границы монтажной области', () => {
      return editorModel.getMontageAreaBounds()
    })

    await test.step('Ввести очень длинный текст', async() => {
      await text.enterTextEditing({ objectIndex: 0 })
      await text.updateEditingText({
        objectIndex: 0,
        text: TEXT_AUTO_EXPAND_LIMIT_TEXT
      })
    })

    const limitedSnapshot = await test.step('Получить состояние после упора в ширину монтажной области', () => {
      return text.getResizeSnapshot({ objectIndex: 0 })
    })

    await test.step('Проверить что объект не вышел за границы монтажной области и текст начал переноситься', () => {
      expect(limitedSnapshot.boundsLeft).toBeGreaterThanOrEqual(
        montageBounds.left - TEXT_AUTO_EXPAND_TOLERANCE.geometry
      )
      expect(limitedSnapshot.boundsRight).toBeLessThanOrEqual(
        montageBounds.right + TEXT_AUTO_EXPAND_TOLERANCE.geometry
      )
      expect(limitedSnapshot.lineCount).toBeGreaterThan(1)
    })
  })

  test('при autoExpand false длинный текст переносится на новую строку и увеличивает высоту', async({ text }) => {
    await test.step('Добавить текстовый объект с отключённым autoExpand', async() => {
      const textObject = await text.add({
        ...TEXT_AUTO_EXPAND_BASE_OPTIONS,
        autoExpand: false
      })

      text.checkCreation({ textObject })
    })

    const initialSnapshot = await test.step('Получить исходную геометрию текстового объекта', () => {
      return text.getResizeSnapshot({ objectIndex: 0 })
    })

    await test.step('Открыть редактирование и ввести длинный текст', async() => {
      await text.enterTextEditing({ objectIndex: 0 })
      await text.updateEditingText({
        objectIndex: 0,
        text: TEXT_AUTO_EXPAND_EDITING_TEXT
      })
    })

    const wrappedSnapshot = await test.step('Получить состояние после переноса текста', () => {
      return text.getResizeSnapshot({ objectIndex: 0 })
    })

    await test.step('Проверить что ширина не раздулась до авторасширения, а высота и число строк выросли', () => {
      expect(wrappedSnapshot.autoExpand).toBe(false)
      expect(wrappedSnapshot.lineCount).toBeGreaterThan(initialSnapshot.lineCount)
      expect(Math.abs(wrappedSnapshot.width - initialSnapshot.width))
        .toBeLessThanOrEqual(TEXT_AUTO_EXPAND_TOLERANCE.geometry)
      expect(wrappedSnapshot.height).toBeGreaterThan(initialSnapshot.height + 1)
      expect(Math.abs(wrappedSnapshot.leftTopX - initialSnapshot.leftTopX))
        .toBeLessThanOrEqual(TEXT_AUTO_EXPAND_TOLERANCE.geometry)
    })
  })

  test('изменение текста через updateText ведёт себя так же, как ввод в режиме редактирования', async({ text }) => {
    await test.step('Добавить два одинаковых текстовых объекта', async() => {
      const firstTextObject = text.checkCreation({
        textObject: await text.add(TEXT_AUTO_EXPAND_BASE_OPTIONS)
      })
      text.checkCreation({
        textObject: await text.add(TEXT_AUTO_EXPAND_BASE_OPTIONS)
      })

      await text.updateStyle({
        objectIndex: 1,
        style: {
          left: firstTextObject.left,
          top: firstTextObject.top + TEXT_AUTO_EXPAND_STACK_OFFSET
        }
      })
    })

    await test.step('У первого объекта ввести текст через режим редактирования', async() => {
      await text.enterTextEditing({ objectIndex: 0 })
      await text.updateEditingText({
        objectIndex: 0,
        text: TEXT_AUTO_EXPAND_EDITING_TEXT
      })
    })

    await test.step('У второго объекта изменить текст через updateText', async() => {
      await text.updateStyle({
        objectIndex: 1,
        style: {
          text: TEXT_AUTO_EXPAND_EDITING_TEXT
        }
      })
    })

    const editingSnapshot = await test.step('Получить состояние первого объекта', () => {
      return text.getResizeSnapshot({ objectIndex: 0 })
    })
    const updatedSnapshot = await test.step('Получить состояние второго объекта', () => {
      return text.getResizeSnapshot({ objectIndex: 1 })
    })

    await test.step('Проверить что геометрия и переносы строк совпали', () => {
      expect(editingSnapshot.lineCount).toBe(1)
      expect(updatedSnapshot.lineCount).toBe(1)
      expect(Math.abs(editingSnapshot.width - updatedSnapshot.width))
        .toBeLessThanOrEqual(TEXT_AUTO_EXPAND_TOLERANCE.geometry)
      expect(Math.abs(editingSnapshot.height - updatedSnapshot.height))
        .toBeLessThanOrEqual(TEXT_AUTO_EXPAND_TOLERANCE.geometry)
    })
  })

  test('при увеличении размера шрифта объект тоже расширяется по ширине', async({ text }) => {
    await test.step('Добавить текстовый объект для изменения размера шрифта', async() => {
      const textObject = await text.add(TEXT_AUTO_EXPAND_FONT_BASE_OPTIONS)
      text.checkCreation({ textObject })
    })

    const initialSnapshot = await test.step('Получить исходную геометрию текстового объекта', () => {
      return text.getResizeSnapshot({ objectIndex: 0 })
    })

    await test.step('Увеличить размер шрифта через updateText', async() => {
      await text.updateStyle({
        objectIndex: 0,
        style: {
          fontSize: TEXT_AUTO_EXPAND_GROWN_FONT_SIZE
        }
      })
    })

    const expandedSnapshot = await test.step('Получить состояние после увеличения размера шрифта', () => {
      return text.getResizeSnapshot({ objectIndex: 0 })
    })

    await test.step('Проверить что ширина выросла без переноса текста на новую строку', () => {
      expect(expandedSnapshot.width).toBeGreaterThan(initialSnapshot.width + 5)
      expect(expandedSnapshot.lineCount).toBe(1)
    })
  })

  test('после undo и redo объект продолжает расширяться по ширине', async({ history, text }) => {
    await test.step('Добавить текстовый объект с autoExpand по умолчанию', async() => {
      const textObject = await text.add(TEXT_AUTO_EXPAND_BASE_OPTIONS)
      text.checkCreation({ textObject })
    })

    await test.step('Изменить текст и сохранить это состояние в history', async() => {
      await text.enterTextEditing({ objectIndex: 0 })
      await text.updateEditingText({
        objectIndex: 0,
        text: TEXT_AUTO_EXPAND_EDITING_TEXT
      })
      await text.exitTextEditing({ objectIndex: 0 })
      await history.flushPendingSave()
    })

    const expandedSnapshot = await test.step('Получить состояние после первого авторасширения', () => {
      return text.getResizeSnapshot({ objectIndex: 0 })
    })

    await test.step('Сделать undo и redo', async() => {
      await history.undo()
      await history.redo()
    })

    const redoneSnapshot = await test.step('Получить состояние после redo', () => {
      return text.getResizeSnapshot({ objectIndex: 0 })
    })

    await test.step('Проверить что redo вернул ту же геометрию', () => {
      expect(Math.abs(redoneSnapshot.width - expandedSnapshot.width))
        .toBeLessThanOrEqual(TEXT_AUTO_EXPAND_TOLERANCE.geometry)
      expect(Math.abs(redoneSnapshot.height - expandedSnapshot.height))
        .toBeLessThanOrEqual(TEXT_AUTO_EXPAND_TOLERANCE.geometry)
      expect(redoneSnapshot.lineCount).toBe(expandedSnapshot.lineCount)
    })

    await test.step('После redo снова ввести ещё более длинный текст', async() => {
      await text.enterTextEditing({ objectIndex: 0 })
      await text.updateEditingText({
        objectIndex: 0,
        text: TEXT_AUTO_EXPAND_LONGER_TEXT
      })
    })

    const secondExpandedSnapshot = await test.step('Получить состояние после повторного авторасширения', () => {
      return text.getResizeSnapshot({ objectIndex: 0 })
    })

    await test.step('Проверить что объект снова продолжил расти по ширине', () => {
      expect(secondExpandedSnapshot.width).toBeGreaterThan(redoneSnapshot.width + 5)
      expect(secondExpandedSnapshot.lineCount).toBeGreaterThanOrEqual(redoneSnapshot.lineCount)
    })
  })

  test('объект восстановленный через TemplateManager сохраняет autoExpand и продолжает расширяться по ширине', async({
    template,
    text
  }) => {
    const sourceTextObject = await test.step('Добавить исходный текстовый объект и подготовить его к сериализации в шаблон', async() => {
      const textObject = await text.add(TEXT_AUTO_EXPAND_BASE_OPTIONS)
      const createdTextObject = text.checkCreation({ textObject })
      await text.select({ objectIndex: 0 })

      return createdTextObject
    })

    const serializedTemplate = await test.step('Сериализовать выделенный текстовый объект', () => {
      return template.serializeSelection()
    })

    await test.step('Применить шаблон поверх текущего canvas', async() => {
      expect(serializedTemplate).not.toBeNull()

      const insertedCount = await template.applyTemplate({
        template: serializedTemplate!
      })

      expect(insertedCount).toBe(1)
    })

    const insertedTextObject = await test.step('Получить вставленный текстовый объект', async() => {
      const textObject = await text.getObject({ objectIndex: 1 })
      return text.checkCreation({ textObject })
    })

    await test.step('Разнести исходный и вставленный объекты по вертикали', async() => {
      await text.updateStyle({
        objectIndex: 1,
        style: {
          left: sourceTextObject.left,
          top: sourceTextObject.top + TEXT_AUTO_EXPAND_STACK_OFFSET
        }
      })
    })

    await test.step('Проверить что после шаблона autoExpand сохранился', () => {
      expect(insertedTextObject.autoExpand).toBe(true)
    })

    await test.step('Ввести длинный текст во вставленном объекте', async() => {
      await text.enterTextEditing({ objectIndex: 1 })
      await text.updateEditingText({
        objectIndex: 1,
        text: TEXT_AUTO_EXPAND_EDITING_TEXT
      })
    })

    const expandedSnapshot = await test.step('Получить состояние вставленного объекта после авторасширения', () => {
      return text.getResizeSnapshot({ objectIndex: 1 })
    })

    await test.step('Проверить что объект из шаблона тоже расширился по ширине', () => {
      expect(expandedSnapshot.width).toBeGreaterThan(insertedTextObject.width + 10)
      expect(expandedSnapshot.lineCount).toBe(1)
    })
  })

  test('объект вставленный из буфера сохраняет autoExpand и продолжает расширяться по ширине', async({
    clipboard,
    editorModel,
    text
  }) => {
    const sourceTextObject = await test.step('Добавить исходный текстовый объект и скопировать его', async() => {
      const textObject = await text.add(TEXT_AUTO_EXPAND_BASE_OPTIONS)
      const createdTextObject = text.checkCreation({ textObject })

      await text.select({ objectIndex: 0 })
      await clipboard.copy()
      await clipboard.waitForClipboardReady()

      return createdTextObject
    })

    await test.step('Вставить текстовый объект из буфера обмена', async() => {
      const pasted = await clipboard.paste()

      expect(pasted).toBe(true)
      await editorModel.checkObjectCount({ count: 2 })
    })

    const pastedTextObject = await test.step('Получить вставленный текстовый объект', async() => {
      const textObject = await text.getObject({ objectIndex: 1 })
      return text.checkCreation({ textObject })
    })

    await test.step('Разнести исходный и вставленный объекты по вертикали', async() => {
      await text.updateStyle({
        objectIndex: 1,
        style: {
          left: sourceTextObject.left,
          top: sourceTextObject.top + TEXT_AUTO_EXPAND_STACK_OFFSET
        }
      })
    })

    await test.step('Проверить что после вставки autoExpand сохранился', () => {
      expect(pastedTextObject.autoExpand).toBe(true)
    })

    await test.step('Ввести длинный текст во вставленном объекте', async() => {
      await text.enterTextEditing({ objectIndex: 1 })
      await text.updateEditingText({
        objectIndex: 1,
        text: TEXT_AUTO_EXPAND_EDITING_TEXT
      })
    })

    const expandedSnapshot = await test.step('Получить состояние вставленного объекта после авторасширения', () => {
      return text.getResizeSnapshot({ objectIndex: 1 })
    })

    await test.step('Проверить что объект из буфера тоже расширился по ширине', () => {
      expect(expandedSnapshot.width).toBeGreaterThan(pastedTextObject.width + 10)
      expect(expandedSnapshot.lineCount).toBe(1)
    })
  })
})
