import { test, expect } from '../../fixtures/editor.fixture'

test.describe('Удаление шейпов через тулбар', () => {
  test('кнопка "Удалить" под массовым выделением удаляет оба шейпа', async({
    editorModel,
    shapes,
    toolbar
  }) => {
    await test.step('Добавить два шейпа на canvas', async() => {
      const firstShape = await shapes.add({
        presetKey: 'square',
        options: {
          id: 'toolbar-delete-selection-first',
          left: 120,
          top: 120
        }
      })
      const secondShape = await shapes.add({
        presetKey: 'circle',
        options: {
          id: 'toolbar-delete-selection-second',
          left: 280,
          top: 240
        }
      })

      expect(firstShape).not.toBeNull()
      expect(secondShape).not.toBeNull()
    })

    await test.step('Создать массовое выделение из двух шейпов', async() => {
      await editorModel.selectAllObjects()
      await editorModel.checkObjectCount({ count: 2 })
      await toolbar.waitUntilVisible()

      const activeObject = await editorModel.getActiveObject()

      expect(activeObject?.type).toBe('activeselection')
      expect(activeObject?.id ?? null).toBeNull()
    })

    await test.step('Нажать кнопку "Удалить" в тулбаре', async() => {
      await toolbar.clickAction({
        name: 'Удалить'
      })
    })

    await test.step('Проверить что оба шейпа удалены и выделение снято', async() => {
      const activeObject = await editorModel.getActiveObject()

      expect(activeObject).toBeNull()
      await editorModel.checkObjectCount({ count: 0 })
    })
  })

  test('в режиме редактирования текста внутри фигуры кнопка "Удалить" удаляет всю фигуру', async({
    editorModel,
    shapes,
    toolbar
  }) => {
    const shape = await test.step('Добавить фигуру с текстом', async() => {
      return shapes.add({
        presetKey: 'square',
        options: {
          id: 'toolbar-delete-editing-shape',
          text: 'TEST'
        }
      })
    })

    expect(shape).not.toBeNull()
    expect(typeof shape?.id).toBe('string')

    const shapeId = shape!.id as string

    await test.step('Открыть редактирование текста через реальный двойной клик', async() => {
      const textNode = await shapes.openTextEditingFromCanvas({ id: shapeId })

      expect(textNode?.isEditing).toBe(true)
      expect(textNode?.text).toBe('TEST')
      await toolbar.waitUntilVisible()
    })

    await test.step('Нажать кнопку "Удалить" в тулбаре', async() => {
      await toolbar.clickAction({
        name: 'Удалить'
      })
    })

    await test.step('Проверить что фигура удалена целиком', async() => {
      const activeObject = await editorModel.getActiveObject()
      const deletedShape = await shapes.getObject({ id: shapeId })

      expect(activeObject).toBeNull()
      expect(deletedShape).toBeNull()
      await editorModel.checkObjectCount({ count: 0 })
    })
  })
})
