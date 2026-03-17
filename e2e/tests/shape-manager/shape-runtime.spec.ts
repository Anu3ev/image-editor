import { test, expect } from '../../fixtures/editor.fixture'
import { SHAPE_SCALING_TOLERANCE } from '../../fixtures/data/shape-scaling.data'

test.describe('Shape runtime через history', () => {
  test.beforeEach(async({ shapes }) => {
    await shapes.add({
      presetKey: 'square',
      options: {
        text: 'Исходный текст'
      }
    })
  })

  test('undo после редактирования текста внутри шейпа сохраняет выделяемость группы', async({ history, shapes }) => {
    await test.step('Отредактировать текст внутри шейпа и сохранить это в history', async() => {
      await shapes.enterTextEditing({ objectIndex: 0 })
      await shapes.updateEditingText({
        objectIndex: 0,
        text: 'Изменённый текст'
      })
      await shapes.exitTextEditing({ objectIndex: 0 })
      await history.flushPendingSave()
    })

    await test.step('Выполнить undo', () => history.undo())

    await test.step('Проверить откат текста и интерактивность группы', async() => {
      const shape = await shapes.getFirstShape()
      const textNode = await shapes.getTextNode({ objectIndex: 0 })

      expect(shape.selectable).toBe(true)
      expect(textNode?.text).toBe('Исходный текст')
      expect(textNode?.isEditing).toBe(false)
    })
  })

  test('redo после undo после редактирования текста внутри шейпа сохраняет интерактивность группы', async({ history, shapes }) => {
    await test.step('Отредактировать текст внутри шейпа и сохранить это в history', async() => {
      await shapes.enterTextEditing({ objectIndex: 0 })
      await shapes.updateEditingText({
        objectIndex: 0,
        text: 'Текст после redo'
      })
      await shapes.exitTextEditing({ objectIndex: 0 })
      await history.flushPendingSave()
    })

    await test.step('Сделать undo и redo', async() => {
      await history.undo()
      await history.redo()
    })

    await test.step('Проверить текст и интерактивность группы после redo', async() => {
      const shape = await shapes.getFirstShape()
      const textNode = await shapes.getTextNode({ objectIndex: 0 })

      expect(shape.selectable).toBe(true)
      expect(textNode?.text).toBe('Текст после redo')
      expect(textNode?.isEditing).toBe(false)
    })
  })

  test('после undo и redo стилизация текста внутри шейпа продолжает работать', async({ history, shapes }) => {
    await test.step('Изменить текст через editing и зафиксировать это в history', async() => {
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

    await test.step('После redo снова применить стиль текста', async() => {
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

test.describe('Shape runtime для partial styles', () => {
  test.beforeEach(async({ shapes }) => {
    await shapes.add({
      presetKey: 'square',
      options: {
        text: 'Alpha Beta Gamma'
      }
    })
  })

  test('undo и redo после частичного изменения стиля сохраняют рабочее редактирование текста внутри шейпа', async({ history, shapes }) => {
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

    await test.step('Сделать undo и проверить откат', async() => {
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

    await test.step('Сделать redo и проверить возврат стиля и интерактивности', async() => {
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

test.describe('Восстановление shape runtime после copy/paste и шаблонов', () => {
  test('после copy/paste частичный стиль текста внутри вставленного шейпа применяется сразу', async({ clipboard, editorModel, shapes }) => {
    await test.step('Добавить исходный шейп и скопировать его', async() => {
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

    await test.step('Вставить шейп из буфера обмена', async() => {
      const pasted = await clipboard.paste()

      expect(pasted).toBe(true)
      await editorModel.checkObjectCount({ count: 2 })
    })

    await test.step('Открыть текст вставленного шейпа и применить частичный стиль', async() => {
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

    await test.step('Проверить стиль выделенного диапазона без выхода из editing', async() => {
      const textNode = await shapes.getTextNode({ objectIndex: 1 })
      const selectionStyle = await shapes.getSelectionStyles({ objectIndex: 1 })

      expect(textNode?.isEditing).toBe(true)
      expect(selectionStyle?.fill).toBe('#6633ff')
      expect(selectionStyle?.fontStyle).toBe('italic')
    })
  })

  test('после applyTemplate частичный стиль текста внутри шейпа применяется сразу', async({ shapes, template }) => {
    await test.step('Создать шейп и сериализовать его в шаблон', async() => {
      await shapes.add({
        presetKey: 'square',
        options: {
          text: 'Template Beta Value'
        }
      })
      await shapes.select({ objectIndex: 0 })
    })

    const serializedTemplate = await test.step('Сериализовать текущее выделение', () => template.serializeSelection())

    await test.step('Удалить исходный шейп и применить шаблон', async() => {
      await shapes.remove({ objectIndex: 0 })

      expect(serializedTemplate).not.toBeNull()
      const insertedCount = await template.applyTemplate({
        template: serializedTemplate!
      })

      expect(insertedCount).toBe(1)
    })

    await test.step('Открыть текст шейпа из шаблона и применить частичный стиль', async() => {
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

    await test.step('Проверить немедленное применение стиля в editing', async() => {
      const textNode = await shapes.getTextNode({ objectIndex: 0 })
      const selectionStyle = await shapes.getSelectionStyles({ objectIndex: 0 })

      expect(textNode?.isEditing).toBe(true)
      expect(selectionStyle?.fill).toBe('#ff6600')
      expect(selectionStyle?.underline).toBe(true)
    })
  })

  // eslint-disable-next-line max-len
  test('после applyTemplate, undo и redo частичная стилизация текста внутри шейпа продолжает работать', async({ history, shapes, template }) => {
    await test.step('Создать shape и сохранить его как шаблон', async() => {
      await shapes.add({
        presetKey: 'square',
        options: {
          text: 'Undo Beta Redo'
        }
      })
      await shapes.select({ objectIndex: 0 })
    })

    const serializedTemplate = await test.step('Сериализовать shape в шаблон', () => template.serializeSelection())

    await test.step('Удалить исходный shape и применить шаблон', async() => {
      await shapes.remove({ objectIndex: 0 })
      expect(serializedTemplate).not.toBeNull()

      const insertedCount = await template.applyTemplate({
        template: serializedTemplate!
      })

      expect(insertedCount).toBe(1)
    })

    await test.step('Применить частичный стиль и зафиксировать состояние в history', async() => {
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

    await test.step('Сделать undo и redo', async() => {
      await history.undo()
      await history.redo()
    })

    await test.step('После redo снова применить частичный стиль без выхода из editing', async() => {
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

test.describe('Восстановление scaling runtime после history и rehydration', () => {
  test('после vertical minimum height, undo и redo shape сохраняет состояние и снова масштабируется по горизонтали', async({
    history,
    shapes
  }) => {
    await test.step('Добавить shape с текстом и запасом по высоте', async() => {
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

    await test.step('Сжать shape по вертикали до minimum height и зафиксировать состояние', async() => {
      await shapes.shrinkToMinimumHeight({ objectIndex: 0 })
      await shapes.finishScale({ objectIndex: 0 })
      await history.flushPendingSave()
    })

    const minimumSnapshot = await test.step('Получить snapshot после vertical minimum height', async() => {
      return shapes.getScaleSnapshot({ objectIndex: 0 })
    })

    await test.step('Сделать undo и redo', async() => {
      await history.undo()
      await history.redo()
    })

    const restoredSnapshot = await test.step('Получить snapshot после redo', async() => {
      return shapes.getScaleSnapshot({ objectIndex: 0 })
    })

    await test.step('Проверить что redo восстановил тот же minimum state', () => {
      expect(Math.abs(restoredSnapshot.groupBoundsHeight - minimumSnapshot.groupBoundsHeight))
        .toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
      expect(Math.abs(restoredSnapshot.groupBoundsTop - minimumSnapshot.groupBoundsTop))
        .toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
      expect(Math.abs(restoredSnapshot.groupBoundsBottom - minimumSnapshot.groupBoundsBottom))
        .toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
    })

    const liveSnapshot = await test.step('После redo снова сузить shape по горизонтали', async() => {
      return shapes.scaleHorizontallyFromRight({
        scaleX: 0.55,
        objectIndex: 0
      })
    })

    await test.step('Проверить что horizontal scaling после redo всё ещё работает', () => {
      expect(liveSnapshot.groupBoundsWidth).toBeLessThan(restoredSnapshot.groupBoundsWidth)
      shapes.checkNodeInsideGroup({ snapshot: liveSnapshot, kind: 'shape' })
      shapes.checkNodeInsideGroup({ snapshot: liveSnapshot, kind: 'text' })
    })
  })

  test('после copy/paste вставленный shape так же сжимается по вертикали до minimum height текста', async({
    clipboard,
    editorModel,
    shapes
  }) => {
    await test.step('Добавить исходный shape и скопировать его', async() => {
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

    await test.step('Вставить shape из буфера обмена', async() => {
      const pasted = await clipboard.paste()

      expect(pasted).toBe(true)
      await editorModel.checkObjectCount({ count: 2 })
    })

    const initialSnapshot = await test.step('Получить исходный snapshot вставленного shape', async() => {
      return shapes.getScaleSnapshot({ objectIndex: 1 })
    })
    const initialText = await test.step('Получить исходное состояние текста вставленного shape', async() => {
      return shapes.getTextNode({ objectIndex: 1 })
    })

    const liveSnapshot = await test.step('Сжать вставленный shape по вертикали до minimum height', async() => {
      return shapes.shrinkToMinimumHeight({ objectIndex: 1 })
    })
    const finalSnapshot = await test.step('Зафиксировать vertical minimum height вставленного shape', async() => {
      await shapes.finishScale({ objectIndex: 1 })

      return shapes.getScaleSnapshot({ objectIndex: 1 })
    })
    const finalText = await test.step('Получить финальное состояние текста вставленного shape', async() => {
      return shapes.getTextNode({ objectIndex: 1 })
    })

    await test.step('Проверить что vertical scaling после copy/paste работает так же стабильно', () => {
      expect(liveSnapshot.groupBoundsHeight).toBeLessThan(initialSnapshot.groupBoundsHeight)
      expect(Math.abs(finalSnapshot.groupBoundsHeight - liveSnapshot.groupBoundsHeight))
        .toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
      expect(finalText?.fontSize).toBe(initialText?.fontSize)
      expect(finalText?.lineCount).toBe(initialText?.lineCount)
      shapes.checkNodeInsideGroup({ snapshot: finalSnapshot, kind: 'shape' })
      shapes.checkNodeInsideGroup({ snapshot: finalSnapshot, kind: 'text' })
    })
  })

  test('после applyTemplate восстановленный shape так же сжимается по вертикали до minimum height текста', async({
    shapes,
    template
  }) => {
    await test.step('Создать исходный shape и сериализовать его в шаблон', async() => {
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

    await test.step('Удалить исходный shape и применить шаблон', async() => {
      await shapes.remove({ objectIndex: 0 })
      expect(serializedTemplate).not.toBeNull()

      const insertedCount = await template.applyTemplate({
        template: serializedTemplate!
      })

      expect(insertedCount).toBe(1)
    })

    const initialSnapshot = await test.step('Получить исходный snapshot shape из шаблона', async() => {
      return shapes.getScaleSnapshot({ objectIndex: 0 })
    })
    const initialText = await test.step('Получить исходное состояние текста shape из шаблона', async() => {
      return shapes.getTextNode({ objectIndex: 0 })
    })

    const liveSnapshot = await test.step('Сжать shape из шаблона по вертикали до minimum height', async() => {
      return shapes.shrinkToMinimumHeight({ objectIndex: 0 })
    })
    const finalSnapshot = await test.step('Зафиксировать vertical minimum height shape из шаблона', async() => {
      await shapes.finishScale({ objectIndex: 0 })

      return shapes.getScaleSnapshot({ objectIndex: 0 })
    })
    const finalText = await test.step('Получить финальное состояние текста shape из шаблона', async() => {
      return shapes.getTextNode({ objectIndex: 0 })
    })

    await test.step('Проверить что vertical scaling после applyTemplate работает так же стабильно', () => {
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
