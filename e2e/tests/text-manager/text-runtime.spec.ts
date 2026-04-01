import { test, expect } from '../../fixtures/editor.fixture'

test.describe('Редактирование текста и история объекта', () => {
  test.describe('изменение текста и история', () => {
    test.beforeEach(async({ text }) => {
      const textObject = await text.add({
        text: 'Исходный текст'
      })

      text.checkCreation({ textObject })
    })

    test('после выхода из режима редактирования текста объект остаётся выбранным и готовым к следующему действию', async({
      editorModel,
      history,
      text
    }) => {
      const textObject = await test.step('Получить исходный текстовый объект', async() => {
        const currentTextObject = await text.getObject({ objectIndex: 0 })
        return text.checkCreation({ textObject: currentTextObject })
      })

      await test.step('Изменить текст в режиме редактирования текста', async() => {
        await text.enterTextEditing({ objectIndex: 0 })
        await text.updateEditingText({
          objectIndex: 0,
          text: 'Текст после редактирования'
        })
        await text.exitTextEditing({ objectIndex: 0 })
        await history.flushPendingSave()
      })

      await test.step('Проверить что текстовый объект остался активным после выхода из режима редактирования текста', async() => {
        const updatedTextObject = await text.getObject({ objectIndex: 0 })
        const activeObject = await editorModel.getActiveObject()

        expect(updatedTextObject?.text).toBe('Текст после редактирования')
        expect(updatedTextObject?.isEditing).toBe(false)
        expect(activeObject?.id).toBe(textObject.id)
        expect(activeObject?.type).toBe('background-textbox')
      })

      await test.step('Проверить что после изменения текста можно сразу применить стиль', async() => {
        await text.updateStyle({
          objectIndex: 0,
          style: {
            color: '#aa00ff',
            italic: true
          }
        })

        const updatedTextObject = await text.getObject({ objectIndex: 0 })

        expect(updatedTextObject?.fill).toBe('#aa00ff')
        expect(updatedTextObject?.fontStyle).toBe('italic')
      })
    })

    test('undo после редактирования возвращает исходный текст и не ломает интерактивность', async({
      history,
      text
    }) => {
      await test.step('Изменить текст в режиме редактирования текста и сохранить это в history', async() => {
        await text.enterTextEditing({ objectIndex: 0 })
        await text.updateEditingText({
          objectIndex: 0,
          text: 'Изменённый текст'
        })
        await text.exitTextEditing({ objectIndex: 0 })
        await history.flushPendingSave()
      })

      await test.step('Сделать undo', async() => {
        await history.undo()
      })

      await test.step('Проверить возврат исходного текста и интерактивности объекта', async() => {
        const restoredTextObject = await text.getObject({ objectIndex: 0 })

        expect(restoredTextObject?.text).toBe('Исходный текст')
        expect(restoredTextObject?.isEditing).toBe(false)
        expect(restoredTextObject?.selectable).toBe(true)
        expect(restoredTextObject?.evented).toBe(true)
      })
    })

    test('redo после undo возвращает изменённый текст и сохраняет возможность дальнейшего редактирования', async({
      history,
      text
    }) => {
      await test.step('Изменить текст в режиме редактирования текста и сохранить это в history', async() => {
        await text.enterTextEditing({ objectIndex: 0 })
        await text.updateEditingText({
          objectIndex: 0,
          text: 'Текст после redo'
        })
        await text.exitTextEditing({ objectIndex: 0 })
        await history.flushPendingSave()
      })

      await test.step('Сделать undo и redo', async() => {
        await history.undo()
        await history.redo()
      })

      await test.step('Проверить что текст восстановился и объект остаётся редактируемым', async() => {
        const restoredTextObject = await text.getObject({ objectIndex: 0 })

        expect(restoredTextObject?.text).toBe('Текст после redo')
        expect(restoredTextObject?.isEditing).toBe(false)
        expect(restoredTextObject?.selectable).toBe(true)

        await text.enterTextEditing({ objectIndex: 0 })
        const editingTextObject = await text.getObject({ objectIndex: 0 })

        expect(editingTextObject?.isEditing).toBe(true)

        await text.exitTextEditing({ objectIndex: 0 })
      })
    })

    test('после блокировки текстового объекта undo сначала снимает блокировку, а потом возвращает прежний текст', async({
      editorModel,
      history,
      text
    }) => {
      await test.step('Изменить текст и заблокировать объект прямо из режима редактирования', async() => {
        await text.enterTextEditing({ objectIndex: 0 })
        await text.updateEditingText({
          objectIndex: 0,
          text: 'Текст перед блокировкой'
        })
        await editorModel.lockSelectedObject()
        await history.flushPendingSave()
      })

      await test.step('Первый undo должен снять блокировку, но оставить новый текст', async() => {
        await history.undo()

        const currentTextObject = await text.getObject({ objectIndex: 0 })

        expect(currentTextObject?.locked).toBe(false)
        expect(currentTextObject?.text).toBe('Текст перед блокировкой')
      })

      await test.step('Второй undo должен вернуть исходный текст', async() => {
        await history.undo()

        const currentTextObject = await text.getObject({ objectIndex: 0 })

        expect(currentTextObject?.locked).toBe(false)
        expect(currentTextObject?.text).toBe('Исходный текст')
      })
    })

    test('после удаления текстового объекта undo сначала возвращает его с новым текстом, а потом с прежним текстом', async({
      editorModel,
      history,
      text
    }) => {
      await test.step('Изменить текст и удалить объект прямо из режима редактирования', async() => {
        await text.enterTextEditing({ objectIndex: 0 })
        await text.updateEditingText({
          objectIndex: 0,
          text: 'Текст перед удалением'
        })
        await editorModel.deleteSelectedObject()
        await history.flushPendingSave()
      })

      await test.step('Проверить что объект удалён', async() => {
        await editorModel.checkObjectCount({ count: 0 })
      })

      await test.step('Первый undo должен вернуть объект уже с новым текстом', async() => {
        await history.undo()

        const currentTextObject = await text.getObject({ objectIndex: 0 })

        expect(currentTextObject?.text).toBe('Текст перед удалением')
        expect(currentTextObject?.locked).toBe(false)
      })

      await test.step('Второй undo должен вернуть прежний текст', async() => {
        await history.undo()

        const currentTextObject = await text.getObject({ objectIndex: 0 })

        expect(currentTextObject?.text).toBe('Исходный текст')
        expect(currentTextObject?.locked).toBe(false)
      })
    })
  })

  test.describe('Частичные стили внутри текста', () => {
    test.beforeEach(async({ text }) => {
      const textObject = await text.add({
        text: 'Alpha Beta Gamma'
      })

      text.checkCreation({ textObject })
    })

    test('частичный стиль применяется только к выделенному слову в режиме редактирования текста', async({
      text
    }) => {
      await test.step('Войти в режим редактирования текста и выделить слово Beta', async() => {
        await text.enterTextEditing({ objectIndex: 0 })
        await text.setTextSelection({
          objectIndex: 0,
          start: 6,
          end: 10
        })
      })

      await test.step('Применить стиль к выделенному слову', async() => {
        await text.updateStyle({
          objectIndex: 0,
          style: {
            color: '#3366ff',
            italic: true
          }
        })
      })

      await test.step('Проверить что слово Alpha осталось без нового стиля', async() => {
        await text.setTextSelection({
          objectIndex: 0,
          start: 0,
          end: 5
        })
        const alphaStyle = await text.getSelectionStyles({ objectIndex: 0 })

        expect(alphaStyle?.fill).not.toBe('#3366ff')
        expect(alphaStyle?.fontStyle).not.toBe('italic')
      })

      await test.step('Проверить что слово Beta сохранило частичный стиль', async() => {
        await text.setTextSelection({
          objectIndex: 0,
          start: 6,
          end: 10
        })
        const betaStyle = await text.getSelectionStyles({ objectIndex: 0 })
        const textObject = await text.getObject({ objectIndex: 0 })

        expect(textObject?.isEditing).toBe(true)
        expect(textObject?.selectionStart).toBe(6)
        expect(textObject?.selectionEnd).toBe(10)
        expect(betaStyle?.fill).toBe('#3366ff')
        expect(betaStyle?.fontStyle).toBe('italic')
      })
    })

    test('после частичной стилизации и выхода из режима редактирования текста объект остаётся тем же активным объектом', async({
      editorModel,
      history,
      text
    }) => {
      const textObject = await test.step('Получить исходный текстовый объект', async() => {
        const currentTextObject = await text.getObject({ objectIndex: 0 })
        return text.checkCreation({ textObject: currentTextObject })
      })

      await test.step('Применить частичный стиль в режиме редактирования текста', async() => {
        await text.enterTextEditing({ objectIndex: 0 })
        await text.setTextSelection({
          objectIndex: 0,
          start: 6,
          end: 10
        })
        await text.updateStyle({
          objectIndex: 0,
          style: {
            strokeColor: '#111111',
            strokeWidth: 2,
            underline: true
          }
        })
        await text.exitTextEditing({ objectIndex: 0 })
        await history.flushPendingSave()
      })

      await test.step('Проверить что активным остался тот же текстовый объект', async() => {
        const activeObject = await editorModel.getActiveObject()
        const updatedTextObject = await text.getObject({ objectIndex: 0 })

        expect(activeObject?.id).toBe(textObject.id)
        expect(activeObject?.type).toBe('background-textbox')
        expect(updatedTextObject?.isEditing).toBe(false)
      })
    })
  })

  test.describe('Вставка из буфера обмена и объекты из шаблона', () => {
    test('после копирования и вставки новый текстовый объект можно сразу частично стилизовать', async({
      clipboard,
      editorModel,
      text
    }) => {
      await test.step('Добавить исходный текстовый объект и скопировать его', async() => {
        await text.add({
          text: 'Copy Beta Value'
        })
        await text.select({ objectIndex: 0 })
        await clipboard.copy()
        await clipboard.waitForClipboardReady()
      })

      await test.step('Вставить текстовый объект из буфера обмена', async() => {
        const pasted = await clipboard.paste()

        expect(pasted).toBe(true)
        await editorModel.checkObjectCount({ count: 2 })
      })

      await test.step('Открыть редактирование вставленного объекта и применить стиль к слову Beta', async() => {
        await text.enterTextEditing({ objectIndex: 1 })
        await text.setTextSelection({
          objectIndex: 1,
          start: 5,
          end: 9
        })
        await text.updateStyle({
          objectIndex: 1,
          style: {
            color: '#6633ff',
            italic: true
          }
        })
      })

      await test.step('Проверить стиль выделенного диапазона у вставленного объекта', async() => {
        const pastedTextObject = await text.getObject({ objectIndex: 1 })
        const selectionStyle = await text.getSelectionStyles({ objectIndex: 1 })

        expect(pastedTextObject?.isEditing).toBe(true)
        expect(selectionStyle?.fill).toBe('#6633ff')
        expect(selectionStyle?.fontStyle).toBe('italic')
      })
    })

    test('после применения шаблона текстовый объект можно сразу отредактировать и стилизовать', async({
      history,
      text
    }) => {
      await test.step('Применить шаблон с текстовым объектом', async() => {
        await text.applyRegressionTemplate()
      })

      await test.step('Изменить текст объекта из шаблона в режиме редактирования текста', async() => {
        await text.enterTextEditing({ objectIndex: 0 })
        await text.updateEditingText({
          objectIndex: 0,
          text: 'Текст после шаблона'
        })
        await text.exitTextEditing({ objectIndex: 0 })
        await history.flushPendingSave()
      })

      await test.step('Сразу после редактирования применить новый стиль', async() => {
        await text.updateStyle({
          objectIndex: 0,
          style: {
            color: '#aa00ff',
            italic: true
          }
        })
      })

      await test.step('Проверить что объект из шаблона обновился и не потерял интерактивность', async() => {
        const updatedTextObject = await text.getObject({ objectIndex: 0 })

        expect(updatedTextObject?.text).toBe('Текст после шаблона')
        expect(updatedTextObject?.fill).toBe('#aa00ff')
        expect(updatedTextObject?.fontStyle).toBe('italic')
        expect(updatedTextObject?.isEditing).toBe(false)
        expect(updatedTextObject?.selectable).toBe(true)
      })
    })
  })
})
