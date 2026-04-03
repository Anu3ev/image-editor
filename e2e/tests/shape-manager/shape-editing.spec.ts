import { test, expect } from '../../fixtures/editor.fixture'
import type { ShapeHorizontalAlign } from '../../types'
import {
  SHAPE_TEXT_LAYOUT_BASE_OPTIONS,
  SHAPE_TEXT_LAYOUT_COMPARISON_FONT_SIZE,
  SHAPE_TEXT_LAYOUT_EXPAND_FONT_SIZE,
  SHAPE_TEXT_LAYOUT_FIRST_POSITION,
  SHAPE_TEXT_LAYOUT_SECOND_POSITION,
  SHAPE_TEXT_LAYOUT_WRAP_FONT_SIZE
} from '../../fixtures/data/shape-text-layout.data'

test.describe('Текст внутри фигуры', () => {
  test.beforeEach(async({ shapes }) => {
    await shapes.add({
      presetKey: 'square',
      options: {
        text: 'Исходный текст'
      }
    })
  })

  test('обновляет стиль текста внутри фигуры, пока режим редактирования текста не открыт', async({ editorModel, shapes }) => {
    const shape = await test.step('Получить фигуру до изменения стиля', () => shapes.getFirstShape())

    await test.step('Применить новый стиль к тексту фигуры', async() => {
      const textNode = await shapes.updateTextStyle({
        objectIndex: 0,
        style: {
          color: '#ff0055',
          fontSize: 54,
          bold: true,
          underline: true
        }
      })

      expect(textNode).not.toBeNull()
    })

    await test.step('Проверить что стиль изменился без открытия режима редактирования текста', async() => {
      const textNode = await shapes.getTextNode({ objectIndex: 0 })
      const activeObject = await editorModel.getActiveObject()

      expect(textNode?.fill).toBe('#ff0055')
      expect(textNode?.fontSize).toBe(54)
      expect(textNode?.fontWeight).toBe('bold')
      expect(textNode?.underline).toBe(true)
      expect(textNode?.isEditing).toBe(false)
      expect(activeObject?.id).toBe(shape.id)
      expect(activeObject?.type).toBe('shape-group')
    })
  })

  test('меняет шрифт текста внутри фигуры', async({ shapes }) => {
    await test.step('Установить новый шрифт', async() => {
      await shapes.updateTextStyle({
        objectIndex: 0,
        style: {
          fontFamily: 'Oswald'
        }
      })
    })

    await test.step('Проверить новый шрифт', async() => {
      const textNode = await shapes.getTextNode({ objectIndex: 0 })

      expect(textNode?.fontFamily).toBe('Oswald')
    })
  })

  test('меняет размер текста внутри фигуры', async({ shapes }) => {
    await test.step('Увеличить размер шрифта', async() => {
      await shapes.updateTextStyle({
        objectIndex: 0,
        style: {
          fontSize: 72
        }
      })
    })

    await test.step('Проверить новый размер шрифта', async() => {
      const textNode = await shapes.getTextNode({ objectIndex: 0 })

      expect(textNode?.fontSize).toBe(72)
      expect(textNode?.isEditing).toBe(false)
    })
  })

  test('меняет цвет текста внутри фигуры', async({ shapes }) => {
    await test.step('Установить новый цвет текста', async() => {
      await shapes.updateTextStyle({
        objectIndex: 0,
        style: {
          color: '#00bb88'
        }
      })
    })

    await test.step('Проверить новый цвет текста', async() => {
      const textNode = await shapes.getTextNode({ objectIndex: 0 })

      expect(textNode?.fill).toBe('#00bb88')
    })
  })

  test('после удаления фигуры undo сначала возвращает её с новым текстом, а потом с прежним текстом', async({
    editorModel,
    history,
    shapes
  }) => {
    await test.step('Открыть редактирование текста, изменить текст и удалить фигуру', async() => {
      await shapes.openTextEditingFromCanvas({ objectIndex: 0 })
      await shapes.updateEditingText({
        objectIndex: 0,
        text: 'Текст перед удалением'
      })
      await editorModel.deleteSelectedObject()
      await history.flushPendingSave()
    })

    await test.step('Проверить что фигура удалена', async() => {
      await editorModel.checkObjectCount({ count: 0 })
    })

    await test.step('Первый undo должен вернуть фигуру уже с новым текстом', async() => {
      await history.undo()

      const shape = await shapes.getObject({ objectIndex: 0 })
      const textNode = await shapes.getTextNode({ objectIndex: 0 })

      expect(shape).not.toBeNull()
      expect(textNode?.text).toBe('Текст перед удалением')
    })

    await test.step('Второй undo должен вернуть прежний текст фигуры', async() => {
      await history.undo()

      const textNode = await shapes.getTextNode({ objectIndex: 0 })

      expect(textNode?.text).toBe('Исходный текст')
    })
  })

  test('применяет цвет обводки текста внутри фигуры сразу без дополнительного изменения толщины', async({ shapes }) => {
    await test.step('Сначала задать толщину и стартовый цвет обводки', async() => {
      await shapes.updateTextStyle({
        objectIndex: 0,
        style: {
          strokeWidth: 3,
          strokeColor: '#ff0000'
        }
      })
    })

    await test.step('Изменить только цвет обводки', async() => {
      await shapes.updateTextStyle({
        objectIndex: 0,
        style: {
          strokeColor: '#00aa44'
        }
      })
    })

    await test.step('Проверить итоговый цвет и толщину обводки', async() => {
      const textNode = await shapes.getTextNode({ objectIndex: 0 })

      expect(textNode?.stroke).toBe('#00aa44')
      expect(textNode?.strokeWidth).toBe(3)
      expect(textNode?.isEditing).toBe(false)
    })
  })

  test('меняет только толщину обводки текста внутри фигуры', async({ shapes }) => {
    await test.step('Изменить только толщину обводки', async() => {
      await shapes.updateTextStyle({
        objectIndex: 0,
        style: {
          strokeWidth: 4
        }
      })
    })

    await test.step('Проверить новую толщину обводки', async() => {
      const textNode = await shapes.getTextNode({ objectIndex: 0 })

      expect(textNode?.strokeWidth).toBe(4)
    })
  })

  test('независимо обновляет толщину и цвет обводки текста внутри фигуры', async({ shapes }) => {
    await test.step('Установить толщину обводки', async() => {
      await shapes.updateTextStyle({
        objectIndex: 0,
        style: {
          strokeWidth: 5
        }
      })
    })

    await test.step('Установить цвет обводки отдельным действием', async() => {
      await shapes.updateTextStyle({
        objectIndex: 0,
        style: {
          strokeColor: '#0044ff'
        }
      })
    })

    await test.step('Проверить что оба значения сохранились', async() => {
      const textNode = await shapes.getTextNode({ objectIndex: 0 })

      expect(textNode?.strokeWidth).toBe(5)
      expect(textNode?.stroke).toBe('#0044ff')
    })
  })

  test('меняет жирность текста внутри фигуры', async({ shapes }) => {
    await test.step('Сделать текст жирным', async() => {
      await shapes.updateTextStyle({
        objectIndex: 0,
        style: {
          bold: true
        }
      })
    })

    await test.step('Проверить жирное начертание', async() => {
      const textNode = await shapes.getTextNode({ objectIndex: 0 })

      expect(textNode?.fontWeight).toBe('bold')
    })
  })

  test('меняет начертание текста внутри фигуры', async({ shapes }) => {
    await test.step('Сделать текст курсивным', async() => {
      await shapes.updateTextStyle({
        objectIndex: 0,
        style: {
          italic: true
        }
      })
    })

    await test.step('Проверить курсивное начертание', async() => {
      const textNode = await shapes.getTextNode({ objectIndex: 0 })

      expect(textNode?.fontStyle).toBe('italic')
    })
  })

  test('включает подчёркивание текста внутри фигуры', async({ shapes }) => {
    await test.step('Включить подчёркивание', async() => {
      await shapes.updateTextStyle({
        objectIndex: 0,
        style: {
          underline: true
        }
      })
    })

    await test.step('Проверить подчёркивание', async() => {
      const textNode = await shapes.getTextNode({ objectIndex: 0 })

      expect(textNode?.underline).toBe(true)
    })
  })

  test('включает зачёркивание текста внутри фигуры', async({ shapes }) => {
    await test.step('Включить зачёркивание', async() => {
      await shapes.updateTextStyle({
        objectIndex: 0,
        style: {
          strikethrough: true
        }
      })
    })

    await test.step('Проверить зачёркивание', async() => {
      const textNode = await shapes.getTextNode({ objectIndex: 0 })

      expect(textNode?.linethrough).toBe(true)
    })
  })

  test('включает и выключает uppercase для текста внутри фигуры без потери исходного текста', async({ shapes }) => {
    await test.step('Включить верхний регистр', async() => {
      await shapes.updateTextStyle({
        objectIndex: 0,
        style: {
          uppercase: true
        }
      })
    })

    await test.step('Проверить текст в верхнем регистре', async() => {
      const textNode = await shapes.getTextNode({ objectIndex: 0 })

      expect(textNode?.uppercase).toBe(true)
      expect(textNode?.text).toBe('ИСХОДНЫЙ ТЕКСТ')
    })

    await test.step('Выключить верхний регистр', async() => {
      await shapes.updateTextStyle({
        objectIndex: 0,
        style: {
          uppercase: false
        }
      })
    })

    await test.step('Проверить возврат исходного текста', async() => {
      const textNode = await shapes.getTextNode({ objectIndex: 0 })

      expect(textNode?.uppercase).toBe(false)
      expect(textNode?.text).toBe('Исходный текст')
    })
  })

  test('циклически меняет горизонтальное выравнивание текста внутри фигуры', async({ shapes }) => {
    const alignSequence: ShapeHorizontalAlign[] = ['left', 'center', 'right', 'justify', 'left']

    await test.step('Последовательно переключить выравнивание текста', async() => {
      for (let index = 0; index < alignSequence.length; index += 1) {
        const horizontal = alignSequence[index]
        const shape = await shapes.setTextAlign({
          objectIndex: 0,
          horizontal
        })
        const textNode = await shapes.getTextNode({ objectIndex: 0 })

        expect(shape?.shapeAlignHorizontal).toBe(horizontal)
        expect(textNode?.textAlign).toBe(horizontal)
      }
    })
  })

  test('меняет прозрачность текста внутри фигуры', async({ shapes }) => {
    await test.step('Установить прозрачность текста', async() => {
      await shapes.updateTextStyle({
        objectIndex: 0,
        style: {
          opacity: 0.35
        }
      })
    })

    await test.step('Проверить прозрачность текста', async() => {
      const textNode = await shapes.getTextNode({ objectIndex: 0 })

      expect(textNode?.opacity).toBe(0.35)
    })
  })

  test('применяет несколько стилей к тексту внутри фигуры одним обновлением', async({ shapes }) => {
    await test.step('Изменить несколько свойств текста одним действием', async() => {
      await shapes.updateTextStyle({
        objectIndex: 0,
        style: {
          fontFamily: 'Roboto',
          fontSize: 66,
          color: '#6633ff',
          strokeColor: '#111111',
          strokeWidth: 2,
          bold: true,
          italic: true,
          underline: true,
          strikethrough: true,
          uppercase: true,
          opacity: 0.55
        }
      })
    })

    await test.step('Проверить что все свойства применились', async() => {
      const textNode = await shapes.getTextNode({ objectIndex: 0 })

      expect(textNode?.fontFamily).toBe('Roboto')
      expect(textNode?.fontSize).toBe(66)
      expect(textNode?.fill).toBe('#6633ff')
      expect(textNode?.stroke).toBe('#111111')
      expect(textNode?.strokeWidth).toBe(2)
      expect(textNode?.fontWeight).toBe('bold')
      expect(textNode?.fontStyle).toBe('italic')
      expect(textNode?.underline).toBe(true)
      expect(textNode?.linethrough).toBe(true)
      expect(textNode?.uppercase).toBe(true)
      expect(textNode?.text).toBe('ИСХОДНЫЙ ТЕКСТ')
      expect(textNode?.opacity).toBe(0.55)
    })
  })

  test('сохраняет ранее применённые стили при последовательных обновлениях текста внутри фигуры', async({ shapes }) => {
    await test.step('Применить цвет текста', async() => {
      await shapes.updateTextStyle({
        objectIndex: 0,
        style: {
          color: '#ff7700'
        }
      })
    })

    await test.step('Применить размер шрифта', async() => {
      await shapes.updateTextStyle({
        objectIndex: 0,
        style: {
          fontSize: 60
        }
      })
    })

    await test.step('Применить bold', async() => {
      await shapes.updateTextStyle({
        objectIndex: 0,
        style: {
          bold: true
        }
      })
    })

    await test.step('Применить обводку', async() => {
      await shapes.updateTextStyle({
        objectIndex: 0,
        style: {
          strokeColor: '#0033cc',
          strokeWidth: 3
        }
      })
    })

    await test.step('Применить выравнивание', async() => {
      await shapes.setTextAlign({
        objectIndex: 0,
        horizontal: 'right'
      })
    })

    await test.step('Проверить что прежние стили не потерялись', async() => {
      const textNode = await shapes.getTextNode({ objectIndex: 0 })
      const shape = await shapes.getFirstShape()

      expect(textNode?.fill).toBe('#ff7700')
      expect(textNode?.fontSize).toBe(60)
      expect(textNode?.fontWeight).toBe('bold')
      expect(textNode?.stroke).toBe('#0033cc')
      expect(textNode?.strokeWidth).toBe(3)
      expect(textNode?.textAlign).toBe('right')
      expect(shape.shapeAlignHorizontal).toBe('right')
    })
  })

  test('после выхода из режима редактирования текста снова выделяет всю фигуру', async({ editorModel, history, shapes }) => {
    const shape = await test.step('Получить фигуру до открытия режима редактирования текста', () => shapes.getFirstShape())

    await test.step('Войти в режим редактирования текста', async() => {
      await shapes.enterTextEditing({ objectIndex: 0 })

      const activeObject = await editorModel.getActiveObject()
      expect(activeObject?.type).toBe('background-textbox')
    })

    await test.step('Выйти из режима редактирования текста', async() => {
      await shapes.exitTextEditing({ objectIndex: 0 })
      await history.flushPendingSave()
    })

    await test.step('Проверить что после выхода снова выделена вся фигура', async() => {
      const activeObject = await editorModel.getActiveObject()
      const textNode = await shapes.getTextNode({ objectIndex: 0 })

      expect(activeObject?.id).toBe(shape.id)
      expect(activeObject?.type).toBe('shape-group')
      expect(textNode?.isEditing).toBe(false)
    })
  })

  test('после изменения текста внутри фигуры можно сразу менять саму фигуру', async({ history, shapes }) => {
    await test.step('Изменить текст внутри фигуры и закрыть режим редактирования текста', async() => {
      await shapes.enterTextEditing({ objectIndex: 0 })
      await shapes.updateEditingText({
        objectIndex: 0,
        text: 'Текст после изменения'
      })
      await shapes.exitTextEditing({ objectIndex: 0 })
      await history.flushPendingSave()
    })

    await test.step('Сразу после этого изменить прозрачность и выравнивание фигуры', async() => {
      await shapes.setOpacity({
        objectIndex: 0,
        opacity: 0.4
      })
      await shapes.setTextAlign({
        objectIndex: 0,
        horizontal: 'right',
        vertical: 'bottom'
      })
    })

    await test.step('Проверить что после изменения текста фигуру всё ещё можно настраивать', async() => {
      const shape = await shapes.getFirstShape()
      const textNode = await shapes.getTextNode({ objectIndex: 0 })

      expect(shape.shapeOpacity).toBe(0.4)
      expect(shape.shapeAlignHorizontal).toBe('right')
      expect(shape.shapeAlignVertical).toBe('bottom')
      expect(textNode?.text).toBe('Текст после изменения')
      expect(textNode?.textAlign).toBe('right')
      expect(textNode?.isEditing).toBe(false)
    })
  })
})

test.describe('Частичные стили текста внутри фигуры', () => {
  test.beforeEach(async({ shapes }) => {
    await shapes.add({
      presetKey: 'square',
      options: {
        text: 'Alpha Beta Gamma'
      }
    })
  })

  test('частичное изменение цвета текста внутри фигуры применяется сразу, когда открыт режим редактирования текста', async({ shapes }) => {
    await test.step('Открыть режим редактирования текста и выделить слово Beta', async() => {
      await shapes.enterTextEditing({ objectIndex: 0 })
      await shapes.setTextSelection({ objectIndex: 0, start: 6, end: 10 })
    })

    await test.step('Применить частичный цвет к выделению', async() => {
      await shapes.updateTextStyle({
        objectIndex: 0,
        style: {
          color: '#ff0055'
        }
      })
    })

    await test.step('Проверить стиль выделенного диапазона, не закрывая режим редактирования текста', async() => {
      const textNode = await shapes.getTextNode({ objectIndex: 0 })
      const selectionStyle = await shapes.getSelectionStyles({ objectIndex: 0 })

      expect(textNode?.isEditing).toBe(true)
      expect(textNode?.selectionStart).toBe(6)
      expect(textNode?.selectionEnd).toBe(10)
      expect(selectionStyle?.fill).toBe('#ff0055')
    })
  })

  test('частичный стиль затрагивает только выделенный диапазон текста внутри фигуры', async({ shapes }) => {
    await test.step('Открыть режим редактирования текста и применить стиль только к слову Beta', async() => {
      await shapes.enterTextEditing({ objectIndex: 0 })
      await shapes.setTextSelection({ objectIndex: 0, start: 6, end: 10 })
      await shapes.updateTextStyle({
        objectIndex: 0,
        style: {
          color: '#3366ff',
          italic: true
        }
      })
    })

    await test.step('Проверить что слово Alpha осталось без нового стиля', async() => {
      await shapes.setTextSelection({ objectIndex: 0, start: 0, end: 5 })
      const alphaStyle = await shapes.getSelectionStyles({ objectIndex: 0 })

      expect(alphaStyle?.fill).not.toBe('#3366ff')
      expect(alphaStyle?.fontStyle).not.toBe('italic')
    })

    await test.step('Проверить что слово Beta сохранило частичный стиль', async() => {
      await shapes.setTextSelection({ objectIndex: 0, start: 6, end: 10 })
      const betaStyle = await shapes.getSelectionStyles({ objectIndex: 0 })

      expect(betaStyle?.fill).toBe('#3366ff')
      expect(betaStyle?.fontStyle).toBe('italic')
    })
  })

  // eslint-disable-next-line max-len
  test('после частичной стилизации и выхода из режима редактирования текста снова выделяет всю фигуру', async({ editorModel, history, shapes }) => {
    const shape = await test.step('Получить исходную фигуру', () => shapes.getFirstShape())

    await test.step('Применить частичный стиль в режиме редактирования', async() => {
      await shapes.enterTextEditing({ objectIndex: 0 })
      await shapes.setTextSelection({ objectIndex: 0, start: 6, end: 10 })
      await shapes.updateTextStyle({
        objectIndex: 0,
        style: {
          strokeColor: '#111111',
          strokeWidth: 2,
          underline: true
        }
      })
      await shapes.exitTextEditing({ objectIndex: 0 })
      await history.flushPendingSave()
    })

    await test.step('Проверить что после выхода снова выделена вся фигура', async() => {
      const activeObject = await editorModel.getActiveObject()
      const textNode = await shapes.getTextNode({ objectIndex: 0 })

      expect(activeObject?.id).toBe(shape.id)
      expect(activeObject?.type).toBe('shape-group')
      expect(textNode?.isEditing).toBe(false)
    })
  })
})

test.describe('Обновление фигуры во время редактирования текста', () => {
  test.beforeEach(async({ shapes }) => {
    await shapes.add({
      presetKey: 'square',
      options: {
        id: 'shape-update-while-editing',
        text: 'TEST',
        textStyle: {
          fontSize: 72
        }
      }
    })
  })

  test('после переноса фигуры во время редактирования следующий ввод удерживает новую позицию', async({ shapes }) => {
    await test.step('Открыть режим редактирования и перенести фигуру', async() => {
      await shapes.enterTextEditing({ id: 'shape-update-while-editing' })
      await shapes.update({
        id: 'shape-update-while-editing',
        options: {
          left: 120,
          top: 80,
          originX: 'left',
          originY: 'top'
        }
      })
    })

    const movedSnapshot = await test.step('Получить положение фигуры сразу после переноса', () => {
      return shapes.getScaleSnapshot({ id: 'shape-update-while-editing' })
    })

    await test.step('Продолжить ввод текста после переноса', async() => {
      await shapes.updateEditingText({
        id: 'shape-update-while-editing',
        text: 'TEST TEST TEST TEST'
      })
    })

    await test.step('Проверить что фигура не вернулась на прежнее место', async() => {
      const currentText = await shapes.getTextNode({ id: 'shape-update-while-editing' })
      const currentSnapshot = await shapes.getScaleSnapshot({ id: 'shape-update-while-editing' })

      expect(currentText?.isEditing).toBe(true)
      expect(currentSnapshot.groupBoundsWidth).toBeGreaterThan(movedSnapshot.groupBoundsWidth + 1)
      expect(Math.abs(currentSnapshot.groupBoundsLeft - movedSnapshot.groupBoundsLeft)).toBeLessThanOrEqual(1.5)
      expect(Math.abs(currentSnapshot.groupBoundsTop - movedSnapshot.groupBoundsTop)).toBeLessThanOrEqual(1.5)
    })
  })

  test('смена пресета во время редактирования не закрывает текст и после выхода снова выделяет фигуру', async({
    editorModel,
    history,
    shapes
  }) => {
    const initialShape = await test.step('Получить исходную фигуру', () => {
      return shapes.getObject({ id: 'shape-update-while-editing' })
    })

    await test.step('Открыть режим редактирования и сменить пресет', async() => {
      await shapes.enterTextEditing({ id: 'shape-update-while-editing' })
      await shapes.update({
        id: 'shape-update-while-editing',
        presetKey: 'star'
      })
    })

    await test.step('Проверить что редактирование текста не закрылось', async() => {
      const currentShape = await shapes.getObject({ id: 'shape-update-while-editing' })
      const currentText = await shapes.getTextNode({ id: 'shape-update-while-editing' })
      const activeObject = await editorModel.getActiveObject()

      expect(currentShape?.id).toBe(initialShape?.id)
      expect(currentShape?.shapePresetKey).toBe('star')
      expect(currentText?.isEditing).toBe(true)
      expect(activeObject?.type).toBe(currentText?.type)
      expect(activeObject?.id).toBe(currentText?.id)
    })

    await test.step('Завершить редактирование текста', async() => {
      await shapes.exitTextEditing({ id: 'shape-update-while-editing' })
      await history.flushPendingSave()
    })

    await test.step('Проверить что после выхода снова выделена та же фигура', async() => {
      const activeObject = await editorModel.getActiveObject()
      const currentText = await shapes.getTextNode({ id: 'shape-update-while-editing' })

      expect(activeObject?.type).toBe('shape-group')
      expect(activeObject?.id).toBe(initialShape?.id)
      expect(currentText?.isEditing).toBe(false)
    })
  })
})

test.describe('Размер текста внутри фигуры', () => {
  test.describe('когда авторасширение включено', () => {
    test.beforeEach(async({ shapes }) => {
      await shapes.add({
        presetKey: 'square',
        options: {
          ...SHAPE_TEXT_LAYOUT_BASE_OPTIONS,
          ...SHAPE_TEXT_LAYOUT_FIRST_POSITION
        }
      })
    })

    // eslint-disable-next-line max-len
    test('при увеличении размера текста фигура ведёт себя одинаково до открытия и после открытия режима редактирования текста', async({ shapes }) => {
      await test.step('Добавить вторую такую же фигуру для сравнения', async() => {
        await shapes.add({
          presetKey: 'square',
          options: {
            ...SHAPE_TEXT_LAYOUT_BASE_OPTIONS,
            ...SHAPE_TEXT_LAYOUT_SECOND_POSITION
          }
        })
      })

      await test.step('Увеличить размер текста у первой фигуры, пока режим редактирования текста ещё не открыт', async() => {
        await shapes.updateTextStyle({
          objectIndex: 0,
          style: {
            fontSize: SHAPE_TEXT_LAYOUT_COMPARISON_FONT_SIZE
          }
        })
      })

      await test.step('Увеличить размер текста у второй фигуры, когда режим редактирования текста уже открыт', async() => {
        await shapes.enterTextEditing({ objectIndex: 1 })
        await shapes.updateTextStyleInEditing({
          objectIndex: 1,
          style: {
            fontSize: SHAPE_TEXT_LAYOUT_COMPARISON_FONT_SIZE
          }
        })
      })

      await test.step('Проверить что размеры фигуры и переносы строк совпадают', async() => {
        const regularSnapshot = await shapes.getScaleSnapshot({ objectIndex: 0 })
        const editingSnapshot = await shapes.getScaleSnapshot({ objectIndex: 1 })
        const regularText = await shapes.getTextNode({ objectIndex: 0 })
        const editingText = await shapes.getTextNode({ objectIndex: 1 })

        expect(regularText?.fontSize).toBe(SHAPE_TEXT_LAYOUT_COMPARISON_FONT_SIZE)
        expect(editingText?.fontSize).toBe(SHAPE_TEXT_LAYOUT_COMPARISON_FONT_SIZE)
        expect(regularText?.lineCount).toBe(editingText?.lineCount)
        expect(regularText?.splitByGrapheme).toBe(editingText?.splitByGrapheme)
        expect(editingText?.isEditing).toBe(true)

        expect(Math.abs(editingSnapshot.groupBoundsWidth - regularSnapshot.groupBoundsWidth)).toBeLessThanOrEqual(1.5)
        expect(Math.abs(editingSnapshot.groupBoundsHeight - regularSnapshot.groupBoundsHeight)).toBeLessThanOrEqual(1.5)
        expect(Math.abs((editingSnapshot.textBoundsWidth ?? 0) - (regularSnapshot.textBoundsWidth ?? 0)))
          .toBeLessThanOrEqual(1.5)
        expect(Math.abs((editingSnapshot.textBoundsHeight ?? 0) - (regularSnapshot.textBoundsHeight ?? 0)))
          .toBeLessThanOrEqual(1.5)

        shapes.checkNodeInsideGroup({
          snapshot: regularSnapshot,
          kind: 'text'
        })
        shapes.checkNodeInsideGroup({
          snapshot: editingSnapshot,
          kind: 'text'
        })
      })
    })

    test('при увеличении размера текста фигура становится шире', async({ shapes }) => {
      const initialSnapshot = await test.step('Получить исходные размеры фигуры', () => {
        return shapes.getScaleSnapshot({ objectIndex: 0 })
      })
      const initialText = await test.step('Получить исходное состояние текста', () => {
        return shapes.getTextNode({ objectIndex: 0 })
      })

      await test.step('Открыть режим редактирования текста и увеличить размер шрифта', async() => {
        await shapes.enterTextEditing({ objectIndex: 0 })
        await shapes.updateTextStyleInEditing({
          objectIndex: 0,
          style: {
            fontSize: SHAPE_TEXT_LAYOUT_WRAP_FONT_SIZE
          }
        })
      })

      await test.step('Проверить что фигура стала шире, а текст остался в одну строку', async() => {
        const expandedSnapshot = await shapes.getScaleSnapshot({ objectIndex: 0 })
        const expandedText = await shapes.getTextNode({ objectIndex: 0 })

        expect(expandedText?.isEditing).toBe(true)
        expect(expandedText?.lineCount).toBe(initialText?.lineCount)
        expect(expandedSnapshot.groupBoundsWidth).toBeGreaterThan(initialSnapshot.groupBoundsWidth + 1)

        shapes.checkNodeInsideGroup({
          snapshot: expandedSnapshot,
          kind: 'text'
        })
      })
    })

    test('если одна буква перестаёт помещаться, фигура становится шире и текст не выходит за её пределы', async({ shapes }) => {
      await test.step('Открыть режим редактирования текста и сначала увеличить размер шрифта', async() => {
        await shapes.enterTextEditing({ objectIndex: 0 })
        await shapes.updateTextStyleInEditing({
          objectIndex: 0,
          style: {
            fontSize: SHAPE_TEXT_LAYOUT_WRAP_FONT_SIZE
          }
        })
      })

      const intermediateSnapshot = await test.step('Получить состояние после первого увеличения', () => {
        return shapes.getScaleSnapshot({ objectIndex: 0 })
      })

      await test.step('Ещё увеличить размер текста', async() => {
        await shapes.updateTextStyleInEditing({
          objectIndex: 0,
          style: {
            fontSize: SHAPE_TEXT_LAYOUT_EXPAND_FONT_SIZE
          }
        })
      })

      await test.step('Проверить что фигура расширилась, а текст остался внутри', async() => {
        const expandedSnapshot = await shapes.getScaleSnapshot({ objectIndex: 0 })
        const expandedText = await shapes.getTextNode({ objectIndex: 0 })

        expect(expandedText?.isEditing).toBe(true)
        expect(expandedSnapshot.groupBoundsWidth).toBeGreaterThan(intermediateSnapshot.groupBoundsWidth + 1)

        shapes.checkNodeInsideGroup({
          snapshot: expandedSnapshot,
          kind: 'text'
        })
      })
    })

    test('меняет выравнивание одинаково до открытия и после открытия режима редактирования текста', async({ shapes }) => {
      await test.step('Добавить вторую такую же фигуру для сравнения', async() => {
        await shapes.add({
          presetKey: 'square',
          options: {
            ...SHAPE_TEXT_LAYOUT_BASE_OPTIONS,
            ...SHAPE_TEXT_LAYOUT_SECOND_POSITION
          }
        })
      })

      await test.step('У первой фигуры сменить выравнивание, пока режим редактирования текста не открыт', async() => {
        await shapes.setTextAlign({
          objectIndex: 0,
          horizontal: 'right'
        })
      })

      await test.step('У второй фигуры сменить выравнивание, когда режим редактирования текста уже открыт', async() => {
        await shapes.enterTextEditing({ objectIndex: 1 })
        await shapes.updateTextStyleInEditing({
          objectIndex: 1,
          style: {
            align: 'right'
          }
        })
      })

      await test.step('Проверить что выравнивание совпало в обоих режимах', async() => {
        const shapeObjects = await shapes.getShapeObjects()
        const regularText = await shapes.getTextNode({ objectIndex: 0 })
        const editingText = await shapes.getTextNode({ objectIndex: 1 })

        expect(shapeObjects[0]?.shapeAlignHorizontal).toBe('right')
        expect(shapeObjects[1]?.shapeAlignHorizontal).toBe('right')
        expect(regularText?.textAlign).toBe('right')
        expect(editingText?.textAlign).toBe('right')
        expect(editingText?.isEditing).toBe(true)
      })
    })

    test('применяет выравнивание по ширине одинаково до открытия и после открытия режима редактирования текста', async({ shapes }) => {
      await test.step('Добавить вторую такую же фигуру для сравнения', async() => {
        await shapes.add({
          presetKey: 'square',
          options: {
            ...SHAPE_TEXT_LAYOUT_BASE_OPTIONS,
            ...SHAPE_TEXT_LAYOUT_SECOND_POSITION
          }
        })
      })

      await test.step('У первой фигуры включить выравнивание по ширине без открытия режима редактирования текста', async() => {
        await shapes.setTextAlign({
          objectIndex: 0,
          horizontal: 'justify'
        })
      })

      await test.step('У второй фигуры включить выравнивание по ширине в режиме редактирования текста', async() => {
        await shapes.enterTextEditing({ objectIndex: 1 })
        await shapes.updateTextStyleInEditing({
          objectIndex: 1,
          style: {
            align: 'justify'
          }
        })
      })

      await test.step('Проверить что выравнивание по ширине совпало в обоих режимах', async() => {
        const shapeObjects = await shapes.getShapeObjects()
        const regularText = await shapes.getTextNode({ objectIndex: 0 })
        const editingText = await shapes.getTextNode({ objectIndex: 1 })

        expect(shapeObjects[0]?.shapeAlignHorizontal).toBe('justify')
        expect(shapeObjects[1]?.shapeAlignHorizontal).toBe('justify')
        expect(regularText?.textAlign).toBe('justify')
        expect(editingText?.textAlign).toBe('justify')
        expect(editingText?.isEditing).toBe(true)
      })
    })
  })

  test.describe('когда авторасширение выключено', () => {
    test.beforeEach(async({ shapes }) => {
      await shapes.add({
        presetKey: 'square',
        options: {
          ...SHAPE_TEXT_LAYOUT_BASE_OPTIONS,
          ...SHAPE_TEXT_LAYOUT_FIRST_POSITION,
          shapeTextAutoExpand: false
        }
      })
    })

    test('при увеличении размера текста происходят переносы строк, которые увеличивают высоту фигуры', async({ shapes }) => {
      const initialSnapshot = await test.step('Получить исходные размеры фигуры', () => {
        return shapes.getScaleSnapshot({ objectIndex: 0 })
      })
      const initialText = await test.step('Получить исходное состояние текста', () => {
        return shapes.getTextNode({ objectIndex: 0 })
      })

      await test.step('Открыть режим редактирования текста и увеличить размер шрифта', async() => {
        await shapes.enterTextEditing({ objectIndex: 0 })
        await shapes.updateTextStyleInEditing({
          objectIndex: 0,
          style: {
            fontSize: SHAPE_TEXT_LAYOUT_WRAP_FONT_SIZE
          }
        })
      })

      await test.step('Проверить что фигура стала выше без заметного роста ширины', async() => {
        const wrappedSnapshot = await shapes.getScaleSnapshot({ objectIndex: 0 })
        const wrappedText = await shapes.getTextNode({ objectIndex: 0 })

        expect(wrappedText?.isEditing).toBe(true)
        expect(wrappedText?.lineCount).toBeGreaterThan(initialText?.lineCount ?? 0)
        expect(wrappedSnapshot.groupBoundsHeight).toBeGreaterThan(initialSnapshot.groupBoundsHeight + 1)
        expect(Math.abs(wrappedSnapshot.groupBoundsWidth - initialSnapshot.groupBoundsWidth)).toBeLessThanOrEqual(1.5)

        shapes.checkNodeInsideGroup({
          snapshot: wrappedSnapshot,
          kind: 'text'
        })
      })
    })
  })
})
