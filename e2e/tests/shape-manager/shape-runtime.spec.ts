import { test, expect } from '../../fixtures/editor.fixture'
import { SHAPE_SCALING_TOLERANCE } from '../../fixtures/data/shape-scaling.data'
import {
  SHAPE_TEXT_LAYOUT_BASE_OPTIONS,
  SHAPE_TEXT_LAYOUT_EXPAND_FONT_SIZE
} from '../../fixtures/data/shape-text-layout.data'

test.describe('Текст внутри фигуры после отмены и повтора', () => {
  test.beforeEach(async({ shapes }) => {
    await shapes.add({
      presetKey: 'square',
      options: {
        text: 'Исходный текст'
      }
    })
  })

  test('после отмены изменения текста (undo) фигура остаётся доступной для выделения', async({ history, shapes }) => {
    await test.step('Изменить текст внутри фигуры и сохранить это в истории', async() => {
      await shapes.enterTextEditing({ objectIndex: 0 })
      await shapes.updateEditingText({
        objectIndex: 0,
        text: 'Изменённый текст'
      })
      await shapes.exitTextEditing({ objectIndex: 0 })
      await history.flushPendingSave()
    })

    await test.step('Сделать undo', () => history.undo())

    await test.step('Проверить что текст вернулся, а фигуру можно выделить', async() => {
      const shape = await shapes.getFirstShape()
      const textNode = await shapes.getTextNode({ objectIndex: 0 })

      expect(shape.selectable).toBe(true)
      expect(textNode?.text).toBe('Исходный текст')
      expect(textNode?.isEditing).toBe(false)
    })
  })

  test('после повтора изменения текста (redo) фигуру можно снова выделить', async({ history, shapes }) => {
    await test.step('Изменить текст внутри фигуры и сохранить это в истории', async() => {
      await shapes.enterTextEditing({ objectIndex: 0 })
      await shapes.updateEditingText({
        objectIndex: 0,
        text: 'Текст после redo'
      })
      await shapes.exitTextEditing({ objectIndex: 0 })
      await history.flushPendingSave()
    })

    await test.step('Сделать отмену и повтор', async() => {
      await history.undo()
      await history.redo()
    })

    await test.step('Проверить что текст вернулся, а фигуру можно снова выделить', async() => {
      const shape = await shapes.getFirstShape()
      const textNode = await shapes.getTextNode({ objectIndex: 0 })

      expect(shape.selectable).toBe(true)
      expect(textNode?.text).toBe('Текст после redo')
      expect(textNode?.isEditing).toBe(false)
    })
  })

  test('после отмены и повтора можно снова менять стиль текста внутри фигуры', async({ history, shapes }) => {
    await test.step('Изменить текст в режиме редактирования текста и сохранить это в истории', async() => {
      await shapes.enterTextEditing({ objectIndex: 0 })
      await shapes.updateEditingText({
        objectIndex: 0,
        text: 'Текст для повторной стилизации'
      })
      await shapes.exitTextEditing({ objectIndex: 0 })
      await history.flushPendingSave()
      await history.undo()
      await history.redo()
    })

    await test.step('После повтора снова изменить стиль текста', async() => {
      await shapes.updateTextStyle({
        objectIndex: 0,
        style: {
          color: '#aa00ff',
          italic: true
        }
      })
    })

    await test.step('Проверить что стиль применился', async() => {
      const textNode = await shapes.getTextNode({ objectIndex: 0 })

      expect(textNode?.fill).toBe('#aa00ff')
      expect(textNode?.fontStyle).toBe('italic')
    })
  })
})

test.describe('История изменения размера текста внутри фигуры', () => {
  test.beforeEach(async({ shapes }) => {
    await shapes.add({
      presetKey: 'square',
      options: SHAPE_TEXT_LAYOUT_BASE_OPTIONS
    })
  })

  test('после отмены возвращает прежние размеры фигуры после увеличения текста', async({ history, shapes }) => {
    const initialSnapshot = await test.step('Получить исходные размеры фигуры', () => {
      return shapes.getScaleSnapshot({ objectIndex: 0 })
    })

    await test.step('Открыть режим редактирования текста и увеличить размер текста', async() => {
      await shapes.enterTextEditing({ objectIndex: 0 })
      await shapes.updateTextStyleInEditing({
        objectIndex: 0,
        style: {
          fontSize: SHAPE_TEXT_LAYOUT_EXPAND_FONT_SIZE
        }
      })
      await shapes.exitTextEditing({ objectIndex: 0 })
      await history.flushPendingSave()
    })

    const increasedSnapshot = await test.step('Получить размеры после увеличения текста', () => {
      return shapes.getScaleSnapshot({ objectIndex: 0 })
    })

    await test.step('Проверить что размеры действительно изменились', () => {
      expect(increasedSnapshot.groupBoundsWidth).toBeGreaterThan(initialSnapshot.groupBoundsWidth + 1)
    })

    const restoredSnapshot = await test.step('Сделать undo и получить восстановленное состояние', async() => {
      await history.undo()
      return shapes.getScaleSnapshot({ objectIndex: 0 })
    })

    await test.step('Проверить что undo вернула прежнюю геометрию', () => {
      expect(Math.abs(restoredSnapshot.groupBoundsWidth - initialSnapshot.groupBoundsWidth)).toBeLessThanOrEqual(1.5)
      expect(Math.abs(restoredSnapshot.groupBoundsHeight - initialSnapshot.groupBoundsHeight)).toBeLessThanOrEqual(1.5)

      shapes.checkNodeInsideGroup({
        snapshot: restoredSnapshot,
        kind: 'text'
      })
    })
  })

  test('после повтора возвращает увеличенные размеры фигуры после изменения текста', async({ history, shapes }) => {
    await test.step('Открыть режим редактирования текста и увеличить размер шрифта', async() => {
      await shapes.enterTextEditing({ objectIndex: 0 })
      await shapes.updateTextStyleInEditing({
        objectIndex: 0,
        style: {
          fontSize: SHAPE_TEXT_LAYOUT_EXPAND_FONT_SIZE
        }
      })
      await shapes.exitTextEditing({ objectIndex: 0 })
      await history.flushPendingSave()
    })

    const increasedSnapshot = await test.step('Получить размеры после увеличения текста', () => {
      return shapes.getScaleSnapshot({ objectIndex: 0 })
    })

    await test.step('Сделать отмену', async() => {
      await history.undo()
    })

    const redoneSnapshot = await test.step('Сделать повтор и получить итоговое состояние', async() => {
      await history.redo()
      return shapes.getScaleSnapshot({ objectIndex: 0 })
    })

    await test.step('Проверить что повтор вернул те же размеры', () => {
      expect(Math.abs(redoneSnapshot.groupBoundsWidth - increasedSnapshot.groupBoundsWidth)).toBeLessThanOrEqual(1.5)
      expect(Math.abs(redoneSnapshot.groupBoundsHeight - increasedSnapshot.groupBoundsHeight)).toBeLessThanOrEqual(1.5)

      shapes.checkNodeInsideGroup({
        snapshot: redoneSnapshot,
        kind: 'text'
      })
    })
  })
})

test.describe('Обновление фигуры во время редактирования текста и история', () => {
  test.beforeEach(async({ shapes }) => {
    await shapes.add({
      presetKey: 'square',
      options: {
        id: 'shape-update-during-editing-history',
        text: 'TEST',
        textStyle: {
          fontSize: 72
        }
      }
    })
  })

  test('после обновления фигуры во время редактирования один undo возвращает прежнее состояние', async({
    history,
    shapes
  }) => {
    const initialText = await test.step('Получить исходное состояние текста', () => {
      return shapes.getTextNode({ id: 'shape-update-during-editing-history' })
    })
    const initialSnapshot = await test.step('Получить исходные размеры фигуры', () => {
      return shapes.getScaleSnapshot({ id: 'shape-update-during-editing-history' })
    })

    await test.step('Открыть редактирование текста и обновить фигуру', async() => {
      await shapes.enterTextEditing({ id: 'shape-update-during-editing-history' })
      await shapes.update({
        id: 'shape-update-during-editing-history',
        options: {
          left: 0,
          top: 0,
          originX: 'left',
          originY: 'top',
          width: 220,
          height: 320,
          text: 'TEST',
          textStyle: {
            fontSize: 360
          }
        }
      })
    })

    const updatedText = await test.step('Получить состояние текста после обновления', () => {
      return shapes.getTextNode({ id: 'shape-update-during-editing-history' })
    })
    const updatedSnapshot = await test.step('Получить размеры фигуры после обновления', () => {
      return shapes.getScaleSnapshot({ id: 'shape-update-during-editing-history' })
    })

    await test.step('Проверить что обновление действительно применилось', () => {
      expect(updatedText?.fontSize).toBe(360)
      expect(updatedText?.isEditing).toBe(true)
      expect(updatedSnapshot.groupBoundsWidth).toBeGreaterThan(initialSnapshot.groupBoundsWidth + 1)
      expect(updatedSnapshot.groupBoundsHeight).toBeGreaterThan(initialSnapshot.groupBoundsHeight + 1)
    })

    await test.step('Завершить редактирование и зафиксировать состояние в истории', async() => {
      await shapes.exitTextEditing({ id: 'shape-update-during-editing-history' })
      await history.flushPendingSave()
    })

    await test.step('Сделать undo', () => history.undo())

    await test.step('Проверить что один undo сразу вернул исходные размеры и стиль текста', async() => {
      const restoredText = await shapes.getTextNode({ id: 'shape-update-during-editing-history' })
      const restoredSnapshot = await shapes.getScaleSnapshot({ id: 'shape-update-during-editing-history' })

      expect(restoredText?.fontSize).toBe(initialText?.fontSize)
      expect(restoredText?.isEditing).toBe(false)
      expect(Math.abs(restoredSnapshot.groupBoundsWidth - initialSnapshot.groupBoundsWidth)).toBeLessThanOrEqual(1.5)
      expect(Math.abs(restoredSnapshot.groupBoundsHeight - initialSnapshot.groupBoundsHeight)).toBeLessThanOrEqual(1.5)
    })
  })

  test('после undo и redo фигуру с новым пресетом можно снова редактировать', async({
    history,
    shapes
  }) => {
    await test.step('Открыть редактирование текста и сменить пресет фигуры', async() => {
      await shapes.enterTextEditing({ id: 'shape-update-during-editing-history' })
      await shapes.update({
        id: 'shape-update-during-editing-history',
        presetKey: 'star'
      })
      await shapes.exitTextEditing({ id: 'shape-update-during-editing-history' })
      await history.flushPendingSave()
    })

    await test.step('Сделать undo и проверить возврат прежнего пресета', async() => {
      await history.undo()

      const undoneShape = await shapes.getObject({ id: 'shape-update-during-editing-history' })

      expect(undoneShape?.shapePresetKey).toBe('square')
    })

    await test.step('Сделать redo и проверить новый пресет', async() => {
      await history.redo()

      const redoneShape = await shapes.getObject({ id: 'shape-update-during-editing-history' })

      expect(redoneShape?.shapePresetKey).toBe('star')
    })

    await test.step('После redo снова открыть редактирование и изменить текст', async() => {
      await shapes.enterTextEditing({ id: 'shape-update-during-editing-history' })
      await shapes.updateEditingText({
        id: 'shape-update-during-editing-history',
        text: 'Текст после redo'
      })

      const textNode = await shapes.getTextNode({ id: 'shape-update-during-editing-history' })

      expect(textNode?.isEditing).toBe(true)
      expect(textNode?.text).toBe('Текст после redo')
    })
  })
})

test.describe('Частичные стили текста внутри фигуры после отмены и повтора', () => {
  test.beforeEach(async({ shapes }) => {
    await shapes.add({
      presetKey: 'square',
      options: {
        text: 'Alpha Beta Gamma'
      }
    })
  })

  test('после отмены и повтора частичного стиля текст внутри фигуры снова можно редактировать', async({ history, shapes }) => {
    await test.step('Применить частичный стиль к слову Beta и зафиксировать состояние', async() => {
      await shapes.enterTextEditing({ objectIndex: 0 })
      await shapes.setTextSelection({ objectIndex: 0, start: 6, end: 10 })
      await shapes.updateTextStyle({
        objectIndex: 0,
        style: {
          color: '#00aa44',
          bold: true
        }
      })
      await shapes.exitTextEditing({ objectIndex: 0 })
      await history.flushPendingSave()
    })

    await test.step('Сделать отмену и проверить откат', async() => {
      await history.undo()

      const selectedShape = await shapes.select({ objectIndex: 0 })

      expect(selectedShape).not.toBeNull()

      await shapes.enterTextEditing({ objectIndex: 0 })
      await shapes.setTextSelection({ objectIndex: 0, start: 6, end: 10 })

      const selectionStyle = await shapes.getSelectionStyles({ objectIndex: 0 })

      expect(selectionStyle?.fill).not.toBe('#00aa44')
      expect(selectionStyle?.fontWeight).not.toBe('bold')

      await shapes.exitTextEditing({ objectIndex: 0 })
    })

    await test.step('Сделать повтор и проверить возврат стиля и возможности редактирования', async() => {
      await history.redo()

      const selectedShape = await shapes.select({ objectIndex: 0 })

      expect(selectedShape).not.toBeNull()

      await shapes.enterTextEditing({ objectIndex: 0 })
      await shapes.setTextSelection({ objectIndex: 0, start: 6, end: 10 })

      const selectionStyle = await shapes.getSelectionStyles({ objectIndex: 0 })

      expect(selectionStyle?.fill).toBe('#00aa44')
      expect(selectionStyle?.fontWeight).toBe('bold')

      await shapes.exitTextEditing({ objectIndex: 0 })
    })
  })
})

test.describe('Текст внутри фигуры после копирования и шаблонов', () => {
  test('после копирования фигуры можно сразу поменять стиль части текста', async({ clipboard, editorModel, shapes }) => {
    await test.step('Добавить исходную фигуру и скопировать её', async() => {
      await shapes.add({
        presetKey: 'square',
        options: {
          text: 'Copy Beta Value'
        }
      })
      await shapes.select({ objectIndex: 0 })
      await clipboard.copy()
      await clipboard.waitForClipboardReady()
    })

    await test.step('Вставить фигуру из буфера обмена', async() => {
      const pasted = await clipboard.paste()

      expect(pasted).toBe(true)
      await editorModel.checkObjectCount({ count: 2 })
    })

    await test.step('Открыть текст во вставленной фигуре и применить частичный стиль', async() => {
      await shapes.enterTextEditing({ objectIndex: 1 })
      await shapes.setTextSelection({ objectIndex: 1, start: 5, end: 9 })
      await shapes.updateTextStyle({
        objectIndex: 1,
        style: {
          color: '#6633ff',
          italic: true
        }
      })
    })

    await test.step('Проверить стиль выделенного диапазона, не закрывая режим редактирования текста', async() => {
      const textNode = await shapes.getTextNode({ objectIndex: 1 })
      const selectionStyle = await shapes.getSelectionStyles({ objectIndex: 1 })

      expect(textNode?.isEditing).toBe(true)
      expect(selectionStyle?.fill).toBe('#6633ff')
      expect(selectionStyle?.fontStyle).toBe('italic')
    })
  })

  test('после применения шаблона можно сразу поменять стиль части текста внутри фигуры', async({ shapes, template }) => {
    await test.step('Создать фигуру и сериализовать её в шаблон', async() => {
      await shapes.add({
        presetKey: 'square',
        options: {
          text: 'Template Beta Value'
        }
      })
      await shapes.select({ objectIndex: 0 })
    })

    const serializedTemplate = await test.step('Сериализовать текущее выделение', () => template.serializeSelection())

    await test.step('Удалить исходную фигуру и применить шаблон', async() => {
      await shapes.remove({ objectIndex: 0 })

      expect(serializedTemplate).not.toBeNull()
      const insertedCount = await template.applyTemplate({
        template: serializedTemplate!
      })

      expect(insertedCount).toBe(1)
    })

    await test.step('Открыть текст внутри фигуры из шаблона и применить частичный стиль', async() => {
      await shapes.enterTextEditing({ objectIndex: 0 })
      await shapes.setTextSelection({ objectIndex: 0, start: 9, end: 13 })
      await shapes.updateTextStyle({
        objectIndex: 0,
        style: {
          color: '#ff6600',
          underline: true
        }
      })
    })

    await test.step('Проверить что стиль применился сразу, пока открыт режим редактирования текста', async() => {
      const textNode = await shapes.getTextNode({ objectIndex: 0 })
      const selectionStyle = await shapes.getSelectionStyles({ objectIndex: 0 })

      expect(textNode?.isEditing).toBe(true)
      expect(selectionStyle?.fill).toBe('#ff6600')
      expect(selectionStyle?.underline).toBe(true)
    })
  })

  // eslint-disable-next-line max-len
  test('после шаблона, отмены и повтора можно снова менять стиль части текста', async({ history, shapes, template }) => {
    await test.step('Создать фигуру и сохранить её как шаблон', async() => {
      await shapes.add({
        presetKey: 'square',
        options: {
          text: 'Undo Beta Redo'
        }
      })
      await shapes.select({ objectIndex: 0 })
    })

    const serializedTemplate = await test.step('Сериализовать фигуру в шаблон', () => template.serializeSelection())

    await test.step('Удалить исходную фигуру и применить шаблон', async() => {
      await shapes.remove({ objectIndex: 0 })
      expect(serializedTemplate).not.toBeNull()

      const insertedCount = await template.applyTemplate({
        template: serializedTemplate!
      })

      expect(insertedCount).toBe(1)
    })

    await test.step('Применить частичный стиль и сохранить это состояние в истории', async() => {
      await shapes.enterTextEditing({ objectIndex: 0 })
      await shapes.setTextSelection({ objectIndex: 0, start: 5, end: 9 })
      await shapes.updateTextStyle({
        objectIndex: 0,
        style: {
          color: '#0099ff'
        }
      })
      await shapes.exitTextEditing({ objectIndex: 0 })
      await history.flushPendingSave()
    })

    await test.step('Сделать отмену и повтор', async() => {
      await history.undo()
      await history.redo()
    })

    await test.step('После повтора снова применить частичный стиль, не закрывая режим редактирования текста', async() => {
      await shapes.enterTextEditing({ objectIndex: 0 })
      await shapes.setTextSelection({ objectIndex: 0, start: 10, end: 14 })
      await shapes.updateTextStyle({
        objectIndex: 0,
        style: {
          italic: true,
          underline: true
        }
      })

      const textNode = await shapes.getTextNode({ objectIndex: 0 })
      const selectionStyle = await shapes.getSelectionStyles({ objectIndex: 0 })

      expect(textNode?.isEditing).toBe(true)
      expect(selectionStyle?.fontStyle).toBe('italic')
      expect(selectionStyle?.underline).toBe(true)
    })
  })
})

test.describe('Изменение размеров фигуры после отмены, копирования и шаблонов', () => {
  test('после отмены и повтора фигура снова сужается по ширине', async({
    history,
    shapes
  }) => {
    await test.step('Добавить фигуру с текстом и запасом по высоте', async() => {
      const shape = await shapes.add({
        presetKey: 'square',
        options: {
          width: 220,
          height: 320,
          text: 'TEST TEST',
          textStyle: {
            fontSize: 72
          }
        }
      })

      shapes.checkCreation({
        shape,
        presetKey: 'square'
      })
    })

    await test.step('Сжать фигуру по высоте до упора в текст и зафиксировать состояние', async() => {
      await shapes.shrinkToMinimumHeight({ objectIndex: 0 })
      await shapes.finishScale({ objectIndex: 0 })
      await history.flushPendingSave()
    })

    const minimumSnapshot = await test.step('Получить состояние фигуры после сжатия по высоте', async() => {
      return shapes.getScaleSnapshot({ objectIndex: 0 })
    })

    await test.step('Сделать отмену и повтор', async() => {
      await history.undo()
      await history.redo()
    })

    const restoredSnapshot = await test.step('Получить состояние фигуры после повтора', async() => {
      return shapes.getScaleSnapshot({ objectIndex: 0 })
    })

    await test.step('Проверить что повтор вернул то же состояние после сжатия по высоте', () => {
      expect(Math.abs(restoredSnapshot.groupBoundsHeight - minimumSnapshot.groupBoundsHeight))
        .toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
      expect(Math.abs(restoredSnapshot.groupBoundsTop - minimumSnapshot.groupBoundsTop))
        .toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
      expect(Math.abs(restoredSnapshot.groupBoundsBottom - minimumSnapshot.groupBoundsBottom))
        .toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
    })

    const liveSnapshot = await test.step('После повтора снова сузить фигуру по ширине', async() => {
      return shapes.scaleHorizontallyFromRight({
        scaleX: 0.55,
        objectIndex: 0
      })
    })

    await test.step('Проверить что после повтора фигура снова сужается по ширине', () => {
      expect(liveSnapshot.groupBoundsWidth).toBeLessThan(restoredSnapshot.groupBoundsWidth)
      shapes.checkNodeInsideGroup({ snapshot: liveSnapshot, kind: 'shape' })
      shapes.checkNodeInsideGroup({ snapshot: liveSnapshot, kind: 'text' })
    })
  })

  test('после копирования фигура так же сжимается по высоте до текста', async({
    clipboard,
    editorModel,
    shapes
  }) => {
    await test.step('Добавить исходную фигуру и скопировать её', async() => {
      await shapes.add({
        presetKey: 'square',
        options: {
          width: 220,
          height: 320,
          text: 'TEST',
          textStyle: {
            fontSize: 72
          }
        }
      })
      await shapes.select({ objectIndex: 0 })
      await clipboard.copy()
      await clipboard.waitForClipboardReady()
    })

    await test.step('Вставить фигуру из буфера обмена', async() => {
      const pasted = await clipboard.paste()

      expect(pasted).toBe(true)
      await editorModel.checkObjectCount({ count: 2 })
    })

    const initialSnapshot = await test.step('Получить исходное состояние вставленной фигуры', async() => {
      return shapes.getScaleSnapshot({ objectIndex: 1 })
    })
    const initialText = await test.step('Получить исходное состояние текста во вставленной фигуре', async() => {
      return shapes.getTextNode({ objectIndex: 1 })
    })

    const liveSnapshot = await test.step('Сжать вставленную фигуру по высоте до упора в текст', async() => {
      return shapes.shrinkToMinimumHeight({ objectIndex: 1 })
    })
    const finalSnapshot = await test.step('Зафиксировать итоговое состояние после сжатия вставленной фигуры по высоте', async() => {
      await shapes.finishScale({ objectIndex: 1 })

      return shapes.getScaleSnapshot({ objectIndex: 1 })
    })
    const finalText = await test.step('Получить итоговое состояние текста во вставленной фигуре', async() => {
      return shapes.getTextNode({ objectIndex: 1 })
    })

    await test.step('Проверить что после копирования фигура по высоте ведёт себя так же стабильно', () => {
      expect(liveSnapshot.groupBoundsHeight).toBeLessThan(initialSnapshot.groupBoundsHeight)
      expect(Math.abs(finalSnapshot.groupBoundsHeight - liveSnapshot.groupBoundsHeight))
        .toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
      expect(finalText?.fontSize).toBe(initialText?.fontSize)
      expect(finalText?.lineCount).toBe(initialText?.lineCount)
      shapes.checkNodeInsideGroup({ snapshot: finalSnapshot, kind: 'shape' })
      shapes.checkNodeInsideGroup({ snapshot: finalSnapshot, kind: 'text' })
    })
  })

  test('после применения шаблона фигура так же сжимается по высоте до текста', async({
    shapes,
    template
  }) => {
    await test.step('Создать исходную фигуру и сериализовать её в шаблон', async() => {
      await shapes.add({
        presetKey: 'square',
        options: {
          width: 220,
          height: 320,
          text: 'TEST',
          textStyle: {
            fontSize: 72
          }
        }
      })
      await shapes.select({ objectIndex: 0 })
    })

    const serializedTemplate = await test.step('Сериализовать текущее выделение', async() => {
      return template.serializeSelection()
    })

    await test.step('Удалить исходную фигуру и применить шаблон', async() => {
      await shapes.remove({ objectIndex: 0 })
      expect(serializedTemplate).not.toBeNull()

      const insertedCount = await template.applyTemplate({
        template: serializedTemplate!
      })

      expect(insertedCount).toBe(1)
    })

    const initialSnapshot = await test.step('Получить исходное состояние фигуры из шаблона', async() => {
      return shapes.getScaleSnapshot({ objectIndex: 0 })
    })
    const initialText = await test.step('Получить исходное состояние текста внутри фигуры из шаблона', async() => {
      return shapes.getTextNode({ objectIndex: 0 })
    })

    const liveSnapshot = await test.step('Сжать фигуру из шаблона по высоте до упора в текст', async() => {
      return shapes.shrinkToMinimumHeight({ objectIndex: 0 })
    })
    const finalSnapshot = await test.step('Зафиксировать итоговое состояние после сжатия фигуры из шаблона по высоте', async() => {
      await shapes.finishScale({ objectIndex: 0 })

      return shapes.getScaleSnapshot({ objectIndex: 0 })
    })
    const finalText = await test.step('Получить итоговое состояние текста внутри фигуры из шаблона', async() => {
      return shapes.getTextNode({ objectIndex: 0 })
    })

    await test.step('Проверить что после применения шаблона фигура по высоте ведёт себя так же стабильно', () => {
      expect(liveSnapshot.groupBoundsHeight).toBeLessThan(initialSnapshot.groupBoundsHeight)
      expect(Math.abs(finalSnapshot.groupBoundsHeight - liveSnapshot.groupBoundsHeight))
        .toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
      expect(finalText?.fontSize).toBe(initialText?.fontSize)
      expect(finalText?.lineCount).toBe(initialText?.lineCount)
      shapes.checkNodeInsideGroup({ snapshot: finalSnapshot, kind: 'shape' })
      shapes.checkNodeInsideGroup({ snapshot: finalSnapshot, kind: 'text' })
    })
  })
})
