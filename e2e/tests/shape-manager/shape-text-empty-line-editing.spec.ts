import { test, expect } from '../../fixtures/editor.fixture'

const MULTILINE_TEXT = 'FIRST LINE\nSECOND LINE'

test.describe('Редактирование пустой строки внутри шейпа', () => {
  test('после очистки второй строки с меньшим размером сохраняет высоту шейпа и размер строки при повторном вводе', async({ shapes }) => {
    const secondLineStart = MULTILINE_TEXT.indexOf('\n') + 1
    const secondLineEnd = MULTILINE_TEXT.length

    await test.step('Добавить квадратный шейп с текстом из двух строк', async() => {
      const shape = await shapes.add({
        presetKey: 'square',
        options: {
          text: MULTILINE_TEXT,
          textStyle: {
            fontSize: 48
          }
        }
      })

      shapes.checkCreation({ shape, presetKey: 'square' })
    })

    await test.step('Задать второй строке меньший размер текста', async() => {
      await shapes.enterTextEditing({ objectIndex: 0 })
      await shapes.setTextSelection({
        objectIndex: 0,
        start: secondLineStart,
        end: secondLineEnd
      })
      await shapes.updateTextStyleInEditing({
        objectIndex: 0,
        style: {
          fontSize: 20
        }
      })

      const secondLineStyle = await shapes.getSelectionStyles({
        objectIndex: 0,
        start: secondLineStart,
        end: secondLineEnd
      })

      expect(secondLineStyle?.fontSize).toBe(20)
      expect(secondLineStyle?.fontFamily).not.toBeNull()
    })

    const styledSnapshot = await test.step('Зафиксировать высоту после изменения второй строки', async() => {
      return shapes.getScaleSnapshot({ objectIndex: 0 })
    })
    expect(styledSnapshot.textBoundsHeight).not.toBeNull()

    if (styledSnapshot.textBoundsHeight === null) {
      throw new Error('text bounds должны существовать после изменения второй строки в шейпе')
    }

    const styledTextBoundsHeight = styledSnapshot.textBoundsHeight

    const snapshotAfterDelete = await test.step('Удалить текст второй строки, не удаляя саму строку', async() => {
      await shapes.setTextSelection({
        objectIndex: 0,
        start: secondLineStart,
        end: secondLineEnd
      })
      await shapes.deleteSelectedText({ objectIndex: 0 })

      return shapes.getScaleSnapshot({ objectIndex: 0 })
    })

    await test.step('Проверить что пустая строка не увеличила высоту шейпа', async() => {
      const textNode = await shapes.getTextNode({ objectIndex: 0 })

      expect(textNode?.text).toBe('FIRST LINE\n')
      expect(textNode?.lineCount).toBe(2)
      expect(textNode?.isEditing).toBe(true)
      expect(textNode?.selectionStart).toBe(secondLineStart)
      expect(snapshotAfterDelete.textBoundsHeight).not.toBeNull()

      if (snapshotAfterDelete.textBoundsHeight === null) {
        throw new Error('text bounds должны существовать для текста внутри шейпа')
      }

      expect(snapshotAfterDelete.groupBoundsHeight).toBeCloseTo(styledSnapshot.groupBoundsHeight, 1)
      expect(snapshotAfterDelete.textBoundsHeight).toBeCloseTo(styledTextBoundsHeight, 1)
    })

    const snapshotAfterTyping = await test.step('Ввести новый текст в очищенную строку', async() => {
      await shapes.typeText({
        objectIndex: 0,
        text: 'TE'
      })

      return shapes.getScaleSnapshot({ objectIndex: 0 })
    })

    await test.step('Проверить что повторный ввод не меняет высоту и сохраняет размер второй строки', async() => {
      const textNode = await shapes.getTextNode({ objectIndex: 0 })
      const secondLineStyle = await shapes.getSelectionStyles({
        objectIndex: 0,
        start: secondLineStart,
        end: secondLineStart + 2
      })

      expect(textNode?.text).toBe('FIRST LINE\nTE')
      expect(textNode?.lineCount).toBe(2)
      expect(snapshotAfterTyping.groupBoundsHeight).toBeCloseTo(styledSnapshot.groupBoundsHeight, 1)
      expect(snapshotAfterTyping.textBoundsHeight).not.toBeNull()

      if (snapshotAfterTyping.textBoundsHeight === null) {
        throw new Error('text bounds должны существовать после повторного ввода в шейпе')
      }

      expect(snapshotAfterTyping.textBoundsHeight).toBeCloseTo(styledTextBoundsHeight, 1)
      expect(secondLineStyle?.fontSize).toBe(20)
    })
  })

  test('после очистки второй строки с большим размером сохраняет высоту шейпа и размер строки при повторном вводе', async({ shapes }) => {
    const secondLineStart = MULTILINE_TEXT.indexOf('\n') + 1
    const secondLineEnd = MULTILINE_TEXT.length

    await test.step('Добавить квадратный шейп с текстом из двух строк', async() => {
      const shape = await shapes.add({
        presetKey: 'square',
        options: {
          text: MULTILINE_TEXT,
          textStyle: {
            fontSize: 30
          }
        }
      })

      shapes.checkCreation({ shape, presetKey: 'square' })
    })

    await test.step('Задать второй строке больший размер текста', async() => {
      await shapes.enterTextEditing({ objectIndex: 0 })
      await shapes.setTextSelection({
        objectIndex: 0,
        start: secondLineStart,
        end: secondLineEnd
      })
      await shapes.updateTextStyleInEditing({
        objectIndex: 0,
        style: {
          fontSize: 60
        }
      })

      const secondLineStyle = await shapes.getSelectionStyles({
        objectIndex: 0,
        start: secondLineStart,
        end: secondLineEnd
      })

      expect(secondLineStyle?.fontSize).toBe(60)
      expect(secondLineStyle?.fontFamily).not.toBeNull()
    })

    const styledSnapshot = await test.step('Зафиксировать высоту после изменения второй строки', async() => {
      return shapes.getScaleSnapshot({ objectIndex: 0 })
    })
    expect(styledSnapshot.textBoundsHeight).not.toBeNull()

    if (styledSnapshot.textBoundsHeight === null) {
      throw new Error('text bounds должны существовать после изменения второй строки в шейпе')
    }

    const styledTextBoundsHeight = styledSnapshot.textBoundsHeight

    const snapshotAfterDelete = await test.step('Удалить текст второй строки, не удаляя саму строку', async() => {
      await shapes.setTextSelection({
        objectIndex: 0,
        start: secondLineStart,
        end: secondLineEnd
      })
      await shapes.deleteSelectedText({ objectIndex: 0 })

      return shapes.getScaleSnapshot({ objectIndex: 0 })
    })

    await test.step('Проверить что пустая строка не уменьшила высоту шейпа', async() => {
      const textNode = await shapes.getTextNode({ objectIndex: 0 })

      expect(textNode?.text).toBe('FIRST LINE\n')
      expect(textNode?.lineCount).toBe(2)
      expect(textNode?.isEditing).toBe(true)
      expect(textNode?.selectionStart).toBe(secondLineStart)
      expect(snapshotAfterDelete.textBoundsHeight).not.toBeNull()

      if (snapshotAfterDelete.textBoundsHeight === null) {
        throw new Error('text bounds должны существовать для текста внутри шейпа')
      }

      expect(snapshotAfterDelete.groupBoundsHeight).toBeCloseTo(styledSnapshot.groupBoundsHeight, 1)
      expect(snapshotAfterDelete.textBoundsHeight).toBeCloseTo(styledTextBoundsHeight, 1)
    })

    const snapshotAfterTyping = await test.step('Ввести новый текст в очищенную строку', async() => {
      await shapes.typeText({
        objectIndex: 0,
        text: 'TE'
      })

      return shapes.getScaleSnapshot({ objectIndex: 0 })
    })

    await test.step('Проверить что повторный ввод не меняет высоту и сохраняет размер второй строки', async() => {
      const textNode = await shapes.getTextNode({ objectIndex: 0 })
      const secondLineStyle = await shapes.getSelectionStyles({
        objectIndex: 0,
        start: secondLineStart,
        end: secondLineStart + 2
      })

      expect(textNode?.text).toBe('FIRST LINE\nTE')
      expect(textNode?.lineCount).toBe(2)
      expect(snapshotAfterTyping.groupBoundsHeight).toBeCloseTo(styledSnapshot.groupBoundsHeight, 1)
      expect(snapshotAfterTyping.textBoundsHeight).not.toBeNull()

      if (snapshotAfterTyping.textBoundsHeight === null) {
        throw new Error('text bounds должны существовать после повторного ввода в шейпе')
      }

      expect(snapshotAfterTyping.textBoundsHeight).toBeCloseTo(styledTextBoundsHeight, 1)
      expect(secondLineStyle?.fontSize).toBe(60)
    })
  })
})
