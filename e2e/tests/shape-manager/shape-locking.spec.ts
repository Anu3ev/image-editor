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

  test('после блокировки фигуры введённый текст не пропадает', async({
    editorModel,
    history,
    shapes
  }) => {
    await test.step('Открыть редактирование текста и ввести новый текст', async() => {
      await shapes.openTextEditingFromCanvas({
        id: SHAPE_LOCKING_TARGET_ID
      })
      await shapes.updateEditingText({
        id: SHAPE_LOCKING_TARGET_ID,
        text: 'Текст перед блокировкой'
      })
    })

    await test.step('Заблокировать фигуру', async() => {
      await editorModel.lockSelectedObject()
      await history.flushPendingSave()
    })

    await test.step('Проверить что фигура заблокировалась, а введённый текст сохранился', async() => {
      const shape = await shapes.getObject({
        id: SHAPE_LOCKING_TARGET_ID
      })
      const textNode = await shapes.getTextNode({
        id: SHAPE_LOCKING_TARGET_ID
      })

      expect(shape?.locked).toBe(true)
      expect(textNode?.isEditing).toBe(false)
      expect(textNode?.text).toBe('Текст перед блокировкой')
    })
  })

  test('после блокировки фигуры undo сначала снимает блокировку, а потом возвращает прежний текст', async({
    editorModel,
    history,
    shapes
  }) => {
    await test.step('Открыть редактирование текста, изменить текст и заблокировать фигуру', async() => {
      await shapes.openTextEditingFromCanvas({
        id: SHAPE_LOCKING_TARGET_ID
      })
      await shapes.updateEditingText({
        id: SHAPE_LOCKING_TARGET_ID,
        text: 'Текст перед блокировкой'
      })
      await editorModel.lockSelectedObject()
      await history.flushPendingSave()
    })

    await test.step('Сделать первый undo и проверить что снялась только блокировка', async() => {
      await history.undo()

      const shape = await shapes.getObject({
        id: SHAPE_LOCKING_TARGET_ID
      })
      const textNode = await shapes.getTextNode({
        id: SHAPE_LOCKING_TARGET_ID
      })

      expect(shape?.locked).toBe(false)
      expect(textNode?.text).toBe('Текст перед блокировкой')
    })

    await test.step('Сделать второй undo и вернуть исходный текст', async() => {
      await history.undo()

      const shape = await shapes.getObject({
        id: SHAPE_LOCKING_TARGET_ID
      })
      const textNode = await shapes.getTextNode({
        id: SHAPE_LOCKING_TARGET_ID
      })

      expect(shape?.locked).toBe(false)
      expect(textNode?.text).toBe('Alpha Beta')
    })
  })

  test('после undo и redo новый текст и блокировка возвращаются в том же порядке', async({
    editorModel,
    history,
    shapes
  }) => {
    await test.step('Открыть редактирование текста, изменить текст и заблокировать фигуру', async() => {
      await shapes.openTextEditingFromCanvas({
        id: SHAPE_LOCKING_TARGET_ID
      })
      await shapes.updateEditingText({
        id: SHAPE_LOCKING_TARGET_ID,
        text: 'Текст перед блокировкой'
      })
      await editorModel.lockSelectedObject()
      await history.flushPendingSave()
      await history.undo()
      await history.undo()
    })

    await test.step('Первый redo должен вернуть новый текст без блокировки', async() => {
      await history.redo()

      const shape = await shapes.getObject({
        id: SHAPE_LOCKING_TARGET_ID
      })
      const textNode = await shapes.getTextNode({
        id: SHAPE_LOCKING_TARGET_ID
      })

      expect(shape?.locked).toBe(false)
      expect(textNode?.text).toBe('Текст перед блокировкой')
    })

    await test.step('Второй redo должен вернуть блокировку поверх нового текста', async() => {
      await history.redo()

      const shape = await shapes.getObject({
        id: SHAPE_LOCKING_TARGET_ID
      })
      const textNode = await shapes.getTextNode({
        id: SHAPE_LOCKING_TARGET_ID
      })

      expect(shape?.locked).toBe(true)
      expect(textNode?.text).toBe('Текст перед блокировкой')
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

test.describe('Заблокированная фигура и программные обновления', () => {
  test.beforeEach(async({ shapes }) => {
    await shapes.add({
      presetKey: 'square',
      options: SHAPE_LOCKING_BASE_OPTIONS
    })
  })

  test('заблокированная фигура не меняет пресет', async({
    editorModel,
    history,
    shapes
  }) => {
    await test.step('Заблокировать фигуру и дождаться сохранения состояния', async() => {
      await editorModel.lockSelectedObject()
      await history.flushPendingSave()
    })

    const beforeShape = await test.step('Получить состояние фигуры до попытки сменить пресет', async() => {
      return shapes.getObject({
        id: SHAPE_LOCKING_TARGET_ID
      })
    })

    const updateResult = await test.step('Попробовать сменить пресет заблокированной фигуры', async() => {
      return shapes.update({
        id: SHAPE_LOCKING_TARGET_ID,
        presetKey: 'star'
      })
    })

    await test.step('Проверить что пресет и выделение не изменились', async() => {
      const currentShape = await shapes.getObject({
        id: SHAPE_LOCKING_TARGET_ID
      })
      const activeObject = await editorModel.getActiveObject()

      expect(updateResult).toBeNull()
      expect(beforeShape?.shapePresetKey).toBe('square')
      expect(currentShape?.shapePresetKey).toBe('square')
      expect(currentShape?.locked).toBe(true)
      expect(activeObject?.id).toBe(SHAPE_LOCKING_TARGET_ID)
      expect(activeObject?.type).toBe('shape-group')
    })
  })

  test('заблокированная фигура не меняет стиль текста', async({
    editorModel,
    history,
    shapes
  }) => {
    await test.step('Заблокировать фигуру и дождаться сохранения состояния', async() => {
      await editorModel.lockSelectedObject()
      await history.flushPendingSave()
    })

    const beforeText = await test.step('Получить состояние текста до обновления', async() => {
      return shapes.getTextNode({
        id: SHAPE_LOCKING_TARGET_ID
      })
    })

    const updateResult = await test.step('Попробовать изменить стиль текста внутри заблокированной фигуры', async() => {
      return shapes.updateTextStyle({
        id: SHAPE_LOCKING_TARGET_ID,
        style: {
          color: '#ff0000',
          bold: true,
          align: 'right'
        }
      })
    })

    await test.step('Проверить что стиль текста и выделение не изменились', async() => {
      const currentText = await shapes.getTextNode({
        id: SHAPE_LOCKING_TARGET_ID
      })
      const activeObject = await editorModel.getActiveObject()

      expect(updateResult).toBeNull()
      expect(beforeText?.fill).toBe(currentText?.fill)
      expect(beforeText?.fontWeight).toBe(currentText?.fontWeight)
      expect(beforeText?.textAlign).toBe(currentText?.textAlign)
      expect(activeObject?.id).toBe(SHAPE_LOCKING_TARGET_ID)
      expect(activeObject?.type).toBe('shape-group')
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
