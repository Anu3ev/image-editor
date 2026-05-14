import { test, expect } from '../../fixtures/editor.fixture'

test.describe('Редактирование пустой строки', () => {
  test('после очистки строки с меньшим размером сохраняет высоту и размер текста при повторном вводе', async({ text }) => {
    const initialText = 'TEST\nTEST'
    const secondLineStart = initialText.indexOf('\n') + 1
    const secondLineEnd = initialText.length
    const createdTextObject = await test.step('Добавить текст из двух строк', async() => {
      const textObject = await text.add({
        text: initialText,
        fontSize: 48,
        autoExpand: false,
        width: 240
      })

      return text.checkCreation({ textObject })
    })

    await test.step('Задать второй строке меньший размер текста', async() => {
      const updatedTextObject = await text.updateStyle({
        id: createdTextObject.id,
        selectionRange: {
          start: secondLineStart,
          end: secondLineEnd
        },
        style: {
          fontSize: 20
        }
      })
      const secondLineStyle = await text.getSelectionStyles({
        id: createdTextObject.id,
        start: secondLineStart,
        end: secondLineEnd
      })

      expect(updatedTextObject?.fontSize).toBe(48)
      expect(secondLineStyle?.fontSize).toBe(20)
    })

    const initialSnapshot = await test.step('Зафиксировать исходную высоту объекта', async() => {
      return text.getResizeSnapshot({ id: createdTextObject.id })
    })

    const snapshotAfterDelete = await test.step('Удалить текст второй строки, не удаляя саму строку', async() => {
      await text.enterTextEditing({ id: createdTextObject.id })
      await text.setTextSelection({
        id: createdTextObject.id,
        start: secondLineStart,
        end: secondLineEnd
      })
      await text.deleteSelectedText({ id: createdTextObject.id })

      return text.getResizeSnapshot({ id: createdTextObject.id })
    })

    await test.step('Проверить что высота не изменилась на пустой строке', async() => {
      expect(snapshotAfterDelete.text).toBe('TEST\n')
      expect(snapshotAfterDelete.lineCount).toBe(2)
      expect(snapshotAfterDelete.isEditing).toBe(true)
      expect(snapshotAfterDelete.height).toBeCloseTo(initialSnapshot.height, 1)
    })

    const snapshotAfterTyping = await test.step('Ввести новый текст в очищенную строку', async() => {
      await text.typeText({
        id: createdTextObject.id,
        text: 'TE'
      })

      return text.getResizeSnapshot({ id: createdTextObject.id })
    })

    await test.step('Проверить что повторный ввод не меняет высоту и сохраняет размер второй строки', async() => {
      const secondLineStyle = await text.getSelectionStyles({
        id: createdTextObject.id,
        start: secondLineStart,
        end: secondLineStart + 2
      })

      expect(snapshotAfterTyping.text).toBe('TEST\nTE')
      expect(snapshotAfterTyping.lineCount).toBe(2)
      expect(snapshotAfterTyping.height).toBeCloseTo(initialSnapshot.height, 1)
      expect(secondLineStyle?.fontSize).toBe(20)
    })
  })

  test('после очистки строки с большим размером сохраняет высоту и размер текста при повторном вводе', async({ text }) => {
    const initialText = 'TEST\nTEST'
    const secondLineStart = initialText.indexOf('\n') + 1
    const secondLineEnd = initialText.length
    const createdTextObject = await test.step('Добавить текст из двух строк', async() => {
      const textObject = await text.add({
        text: initialText,
        fontSize: 30,
        autoExpand: false,
        width: 240
      })

      return text.checkCreation({ textObject })
    })

    await test.step('Задать второй строке больший размер текста', async() => {
      const updatedTextObject = await text.updateStyle({
        id: createdTextObject.id,
        selectionRange: {
          start: secondLineStart,
          end: secondLineEnd
        },
        style: {
          fontSize: 80
        }
      })
      const secondLineStyle = await text.getSelectionStyles({
        id: createdTextObject.id,
        start: secondLineStart,
        end: secondLineEnd
      })

      expect(updatedTextObject?.fontSize).toBe(30)
      expect(secondLineStyle?.fontSize).toBe(80)
    })

    const initialSnapshot = await test.step('Зафиксировать исходную высоту объекта', async() => {
      return text.getResizeSnapshot({ id: createdTextObject.id })
    })

    const snapshotAfterDelete = await test.step('Удалить текст второй строки, не удаляя саму строку', async() => {
      await text.enterTextEditing({ id: createdTextObject.id })
      await text.setTextSelection({
        id: createdTextObject.id,
        start: secondLineStart,
        end: secondLineEnd
      })
      await text.deleteSelectedText({ id: createdTextObject.id })

      return text.getResizeSnapshot({ id: createdTextObject.id })
    })

    await test.step('Проверить что высота не уменьшилась на пустой строке', async() => {
      expect(snapshotAfterDelete.text).toBe('TEST\n')
      expect(snapshotAfterDelete.lineCount).toBe(2)
      expect(snapshotAfterDelete.isEditing).toBe(true)
      expect(snapshotAfterDelete.height).toBeCloseTo(initialSnapshot.height, 1)
    })

    const snapshotAfterTyping = await test.step('Ввести новый текст в очищенную строку', async() => {
      await text.typeText({
        id: createdTextObject.id,
        text: 'TE'
      })

      return text.getResizeSnapshot({ id: createdTextObject.id })
    })

    await test.step('Проверить что повторный ввод не меняет высоту и сохраняет размер второй строки', async() => {
      const secondLineStyle = await text.getSelectionStyles({
        id: createdTextObject.id,
        start: secondLineStart,
        end: secondLineStart + 2
      })

      expect(snapshotAfterTyping.text).toBe('TEST\nTE')
      expect(snapshotAfterTyping.lineCount).toBe(2)
      expect(snapshotAfterTyping.height).toBeCloseTo(initialSnapshot.height, 1)
      expect(secondLineStyle?.fontSize).toBe(80)
    })
  })
})
