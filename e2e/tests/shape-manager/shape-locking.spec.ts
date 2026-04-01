import { test, expect } from '../../fixtures/editor.fixture'
import {
  SHAPE_LOCKING_BASE_OPTIONS,
  SHAPE_LOCKING_SECONDARY_OPTIONS,
  SHAPE_LOCKING_TARGET_ID
} from '../../fixtures/data/shape-locking.data'

test.describe('Блокировка фигуры с текстом', () => {
  test.beforeEach(async({ shapes }) => {
    await shapes.add({
      presetKey: 'square',
      options: SHAPE_LOCKING_BASE_OPTIONS
    })
  })

  test('если заблокировать фигуру во время редактирования, редактирование сразу закрывается', async({
    editorModel,
    history,
    shapes
  }) => {
    await test.step('Открыть редактирование текста реальным двойным кликом', async() => {
      const textNode = await shapes.openTextEditingFromCanvas({
        id: SHAPE_LOCKING_TARGET_ID
      })
      const activeObject = await editorModel.getActiveObject()

      expect(textNode?.isEditing).toBe(true)
      expect(activeObject?.type).toBe('background-textbox')
    })

    await test.step('Заблокировать текущую фигуру', async() => {
      await editorModel.lockSelectedObject()
      await history.flushPendingSave()
    })

    await test.step('Проверить что редактирование закрылось и снова выбрана вся фигура', async() => {
      const textNode = await shapes.getTextNode({
        id: SHAPE_LOCKING_TARGET_ID
      })
      const activeObject = await editorModel.getActiveObject()
      const shape = await shapes.getObject({
        id: SHAPE_LOCKING_TARGET_ID
      })

      expect(textNode?.isEditing).toBe(false)
      expect(activeObject?.type).toBe('shape-group')
      expect(activeObject?.id).toBe(shape?.id)
      expect(shape?.locked).toBe(true)
    })
  })

  test('после блокировки текст внутри фигуры не открывается по двойному клику', async({
    editorModel,
    history,
    shapes
  }) => {
    await test.step('Открыть редактирование текста и сразу заблокировать фигуру', async() => {
      await shapes.openTextEditingFromCanvas({
        id: SHAPE_LOCKING_TARGET_ID
      })
      await editorModel.lockSelectedObject()
      await history.flushPendingSave()
    })

    await test.step('Снова попробовать открыть текст двойным кликом', async() => {
      await shapes.openTextEditingFromCanvas({
        id: SHAPE_LOCKING_TARGET_ID
      })
    })

    await test.step('Проверить что редактирование не открылось', async() => {
      const textNode = await shapes.getTextNode({
        id: SHAPE_LOCKING_TARGET_ID
      })
      const activeObject = await editorModel.getActiveObject()
      const shape = await shapes.getObject({
        id: SHAPE_LOCKING_TARGET_ID
      })

      expect(textNode?.isEditing).toBe(false)
      expect(activeObject?.type).toBe('shape-group')
      expect(activeObject?.id).toBe(shape?.id)
      expect(shape?.locked).toBe(true)
    })
  })

  test('после разблокировки текст внутри фигуры снова открывается по двойному клику', async({
    editorModel,
    history,
    shapes
  }) => {
    await test.step('Заблокировать фигуру после входа в редактирование', async() => {
      await shapes.openTextEditingFromCanvas({
        id: SHAPE_LOCKING_TARGET_ID
      })
      await editorModel.lockSelectedObject()
      await history.flushPendingSave()
    })

    await test.step('Разблокировать фигуру', async() => {
      await editorModel.unlockSelectedObject()
      await history.flushPendingSave()
    })

    await test.step('Снова открыть текст двойным кликом', async() => {
      await shapes.openTextEditingFromCanvas({
        id: SHAPE_LOCKING_TARGET_ID
      })
    })

    await test.step('Проверить что редактирование снова доступно', async() => {
      const textNode = await shapes.getTextNode({
        id: SHAPE_LOCKING_TARGET_ID
      })
      const activeObject = await editorModel.getActiveObject()
      const shape = await shapes.getObject({
        id: SHAPE_LOCKING_TARGET_ID
      })

      expect(shape?.locked).toBe(false)
      expect(textNode?.isEditing).toBe(true)
      expect(activeObject?.type).toBe('background-textbox')
    })
  })

  test('undo после блокировки во время редактирования снова даёт открыть текст', async({
    history,
    shapes,
    editorModel
  }) => {
    await test.step('Открыть редактирование текста и заблокировать фигуру', async() => {
      await shapes.openTextEditingFromCanvas({
        id: SHAPE_LOCKING_TARGET_ID
      })
      await editorModel.lockSelectedObject()
      await history.flushPendingSave()
    })

    await test.step('Сделать undo', async() => {
      await history.undo()
    })

    await test.step('После undo снова открыть текст двойным кликом', async() => {
      await shapes.openTextEditingFromCanvas({
        id: SHAPE_LOCKING_TARGET_ID
      })
    })

    await test.step('Проверить что редактирование снова открылось', async() => {
      const textNode = await shapes.getTextNode({
        id: SHAPE_LOCKING_TARGET_ID
      })
      const activeObject = await editorModel.getActiveObject()

      expect(textNode?.isEditing).toBe(true)
      expect(activeObject?.type).toBe('background-textbox')
    })
  })

  test('redo после undo снова возвращает блокировку фигуры', async({
    editorModel,
    history,
    shapes
  }) => {
    await test.step('Открыть редактирование текста, заблокировать фигуру и откатить блокировку', async() => {
      await shapes.openTextEditingFromCanvas({
        id: SHAPE_LOCKING_TARGET_ID
      })
      await editorModel.lockSelectedObject()
      await history.flushPendingSave()
      await history.undo()
    })

    await test.step('Сделать redo', async() => {
      await history.redo()
    })

    await test.step('Снова попробовать открыть текст двойным кликом', async() => {
      await shapes.openTextEditingFromCanvas({
        id: SHAPE_LOCKING_TARGET_ID
      })
    })

    await test.step('Проверить что после redo фигура снова не пускает в редактирование', async() => {
      const textNode = await shapes.getTextNode({
        id: SHAPE_LOCKING_TARGET_ID
      })
      const activeObject = await editorModel.getActiveObject()
      const shape = await shapes.getObject({
        id: SHAPE_LOCKING_TARGET_ID
      })

      expect(shape?.locked).toBe(true)
      expect(textNode?.isEditing).toBe(false)
      expect(activeObject?.type).toBe('shape-group')
      expect(activeObject?.id).toBe(shape?.id)
    })
  })
})

test.describe('Заблокированная фигура после восстановления выделения', () => {
  test.beforeEach(async({ shapes }) => {
    await shapes.add({
      presetKey: 'square',
      options: SHAPE_LOCKING_BASE_OPTIONS
    })
  })

  test('после выделения всех объектов текст в заблокированной фигуре всё ещё не открывается', async({
    editorModel,
    history,
    shapes
  }) => {
    await test.step('Добавить вторую фигуру и заблокировать первую после открытия текста', async() => {
      await shapes.add({
        presetKey: 'star',
        options: SHAPE_LOCKING_SECONDARY_OPTIONS
      })
      await shapes.openTextEditingFromCanvas({
        id: SHAPE_LOCKING_TARGET_ID
      })
      await editorModel.lockSelectedObject()
      await history.flushPendingSave()
    })

    await test.step('Выделить все объекты и снова перейти к заблокированной фигуре', async() => {
      await editorModel.selectAllObjects()
      await shapes.clickOnCanvas({
        id: SHAPE_LOCKING_TARGET_ID
      })
      await shapes.openTextEditingFromCanvas({
        id: SHAPE_LOCKING_TARGET_ID
      })
    })

    await test.step('Проверить что текст всё ещё не открылся', async() => {
      const textNode = await shapes.getTextNode({
        id: SHAPE_LOCKING_TARGET_ID
      })
      const activeObject = await editorModel.getActiveObject()
      const shape = await shapes.getObject({
        id: SHAPE_LOCKING_TARGET_ID
      })

      expect(shape?.locked).toBe(true)
      expect(textNode?.isEditing).toBe(false)
      expect(activeObject?.type).not.toBe('background-textbox')
    })
  })

  test('после выхода из режима перемещения текст в заблокированной фигуре всё ещё не открывается', async({
    editorModel,
    history,
    shapes
  }) => {
    await test.step('Открыть текст, заблокировать фигуру и убедиться что она выделена', async() => {
      await shapes.openTextEditingFromCanvas({
        id: SHAPE_LOCKING_TARGET_ID
      })
      await editorModel.lockSelectedObject()
      await history.flushPendingSave()
      await shapes.clickOnCanvas({
        id: SHAPE_LOCKING_TARGET_ID
      })
    })

    await test.step('Войти в режим перемещения canvas и выйти из него', async() => {
      await editorModel.pressSpaceKey()
      await editorModel.releaseSpaceKey()
    })

    await test.step('Снова попробовать открыть текст двойным кликом', async() => {
      await shapes.openTextEditingFromCanvas({
        id: SHAPE_LOCKING_TARGET_ID
      })
    })

    await test.step('Проверить что заблокированная фигура не пустила в редактирование', async() => {
      const textNode = await shapes.getTextNode({
        id: SHAPE_LOCKING_TARGET_ID
      })
      const activeObject = await editorModel.getActiveObject()
      const shape = await shapes.getObject({
        id: SHAPE_LOCKING_TARGET_ID
      })

      expect(shape?.locked).toBe(true)
      expect(textNode?.isEditing).toBe(false)
      expect(activeObject?.type).not.toBe('background-textbox')
    })
  })
})

test.describe('Ручка поворота у фигуры', () => {
  test.beforeEach(async({ shapes }) => {
    await shapes.add({
      presetKey: 'square',
      options: SHAPE_LOCKING_BASE_OPTIONS
    })
  })

  test('у заблокированной фигуры ручка поворота не переходит в режим захвата', async({
    editorModel,
    shapes
  }) => {
    await test.step('Выделить фигуру и заблокировать её', async() => {
      await shapes.clickOnCanvas({
        id: SHAPE_LOCKING_TARGET_ID
      })
      await editorModel.lockSelectedObject()
    })

    await test.step('Навести курсор на ручку поворота', async() => {
      await shapes.hoverRotateHandle({
        id: SHAPE_LOCKING_TARGET_ID
      })
    })

    await test.step('Проверить что курсор не предлагает захват ещё до нажатия', async() => {
      const cursorState = await editorModel.getCanvasCursorState()

      expect(cursorState.currentCursor).toBe('not-allowed')
    })

    await test.step('Нажать на ручку поворота', async() => {
      await shapes.startRotateFromHandle({
        id: SHAPE_LOCKING_TARGET_ID
      })
    })

    await test.step('Проверить что после нажатия курсор не перешёл в grabbing', async() => {
      const cursorState = await editorModel.getCanvasCursorState()

      expect(cursorState.currentCursor).not.toBe('grabbing')
    })

    await test.step('Завершить pointer-взаимодействие', async() => {
      await shapes.finishPointerInteraction()
    })
  })

  test('у незаблокированной фигуры ручка поворота переходит в режим захвата только после начала поворота', async({
    editorModel,
    shapes
  }) => {
    await test.step('Выделить фигуру и навести курсор на ручку поворота', async() => {
      await shapes.clickOnCanvas({
        id: SHAPE_LOCKING_TARGET_ID
      })
      await shapes.hoverRotateHandle({
        id: SHAPE_LOCKING_TARGET_ID
      })
    })

    await test.step('Проверить что до нажатия курсор показывает готовность к повороту', async() => {
      const cursorState = await editorModel.getCanvasCursorState()

      expect(cursorState.currentCursor).toBe('grab')
    })

    await test.step('Начать поворот за ручку', async() => {
      await shapes.startRotateFromHandle({
        id: SHAPE_LOCKING_TARGET_ID
      })
    })

    await test.step('Проверить что после начала поворота курсор стал grabbing', async() => {
      const cursorState = await editorModel.getCanvasCursorState()

      expect(cursorState.currentCursor).toBe('grabbing')
    })

    await test.step('Завершить pointer-взаимодействие', async() => {
      await shapes.finishPointerInteraction()
    })
  })
})
