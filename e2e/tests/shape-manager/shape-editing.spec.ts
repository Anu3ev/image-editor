import { test, expect } from '../../fixtures/editor.fixture'
import type { ShapeHorizontalAlign } from '../../types'

test.describe('Текст внутри шейпа', () => {
  test.beforeEach(async({ shapes }) => {
    await shapes.add({
      presetKey: 'square',
      options: {
        text: 'Исходный текст'
      }
    })
  })

  test('обновляет стиль текста внутри шейпа без входа в режим редактирования', async({ editorModel, shapes }) => {
    const shape = await test.step('Получить shape до изменения стиля', () => shapes.getFirstShape())

    await test.step('Применить стиль текста через ShapeManager', async() => {
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

    await test.step('Проверить что текст обновился без входа в editing', async() => {
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

  test('меняет шрифт текста внутри шейпа', async({ shapes }) => {
    await test.step('Установить новый fontFamily', async() => {
      await shapes.updateTextStyle({
        objectIndex: 0,
        style: {
          fontFamily: 'Oswald'
        }
      })
    })

    await test.step('Проверить fontFamily', async() => {
      const textNode = await shapes.getTextNode({ objectIndex: 0 })

      expect(textNode?.fontFamily).toBe('Oswald')
    })
  })

  test('меняет размер шрифта текста внутри шейпа', async({ shapes }) => {
    await test.step('Установить новый fontSize', async() => {
      await shapes.updateTextStyle({
        objectIndex: 0,
        style: {
          fontSize: 72
        }
      })
    })

    await test.step('Проверить fontSize', async() => {
      const textNode = await shapes.getTextNode({ objectIndex: 0 })

      expect(textNode?.fontSize).toBe(72)
      expect(textNode?.isEditing).toBe(false)
    })
  })

  test('меняет цвет текста внутри шейпа', async({ shapes }) => {
    await test.step('Установить новый color', async() => {
      await shapes.updateTextStyle({
        objectIndex: 0,
        style: {
          color: '#00bb88'
        }
      })
    })

    await test.step('Проверить fill текста', async() => {
      const textNode = await shapes.getTextNode({ objectIndex: 0 })

      expect(textNode?.fill).toBe('#00bb88')
    })
  })

  test('применяет цвет обводки текста внутри шейпа сразу без дополнительного изменения толщины', async({ shapes }) => {
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

    await test.step('Проверить итоговые значения stroke и strokeWidth', async() => {
      const textNode = await shapes.getTextNode({ objectIndex: 0 })

      expect(textNode?.stroke).toBe('#00aa44')
      expect(textNode?.strokeWidth).toBe(3)
      expect(textNode?.isEditing).toBe(false)
    })
  })

  test('меняет только толщину обводки текста внутри шейпа', async({ shapes }) => {
    await test.step('Установить strokeWidth без изменения цвета', async() => {
      await shapes.updateTextStyle({
        objectIndex: 0,
        style: {
          strokeWidth: 4
        }
      })
    })

    await test.step('Проверить strokeWidth', async() => {
      const textNode = await shapes.getTextNode({ objectIndex: 0 })

      expect(textNode?.strokeWidth).toBe(4)
    })
  })

  test('независимо обновляет толщину и цвет обводки текста внутри шейпа', async({ shapes }) => {
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

  test('меняет жирность текста внутри шейпа', async({ shapes }) => {
    await test.step('Включить bold', async() => {
      await shapes.updateTextStyle({
        objectIndex: 0,
        style: {
          bold: true
        }
      })
    })

    await test.step('Проверить fontWeight', async() => {
      const textNode = await shapes.getTextNode({ objectIndex: 0 })

      expect(textNode?.fontWeight).toBe('bold')
    })
  })

  test('меняет начертание текста внутри шейпа', async({ shapes }) => {
    await test.step('Включить italic', async() => {
      await shapes.updateTextStyle({
        objectIndex: 0,
        style: {
          italic: true
        }
      })
    })

    await test.step('Проверить fontStyle', async() => {
      const textNode = await shapes.getTextNode({ objectIndex: 0 })

      expect(textNode?.fontStyle).toBe('italic')
    })
  })

  test('включает подчёркивание текста внутри шейпа', async({ shapes }) => {
    await test.step('Включить underline', async() => {
      await shapes.updateTextStyle({
        objectIndex: 0,
        style: {
          underline: true
        }
      })
    })

    await test.step('Проверить underline', async() => {
      const textNode = await shapes.getTextNode({ objectIndex: 0 })

      expect(textNode?.underline).toBe(true)
    })
  })

  test('включает зачёркивание текста внутри шейпа', async({ shapes }) => {
    await test.step('Включить strikethrough', async() => {
      await shapes.updateTextStyle({
        objectIndex: 0,
        style: {
          strikethrough: true
        }
      })
    })

    await test.step('Проверить linethrough', async() => {
      const textNode = await shapes.getTextNode({ objectIndex: 0 })

      expect(textNode?.linethrough).toBe(true)
    })
  })

  test('включает и выключает uppercase для текста внутри шейпа без потери исходного текста', async({ shapes }) => {
    await test.step('Включить uppercase', async() => {
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

    await test.step('Выключить uppercase', async() => {
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

  test('циклически меняет горизонтальное выравнивание текста внутри шейпа', async({ shapes }) => {
    const alignSequence: ShapeHorizontalAlign[] = ['left', 'center', 'right', 'left']

    await test.step('Последовательно переключить horizontal align', async() => {
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

  test('меняет прозрачность текста внутри шейпа', async({ shapes }) => {
    await test.step('Установить opacity для текста', async() => {
      await shapes.updateTextStyle({
        objectIndex: 0,
        style: {
          opacity: 0.35
        }
      })
    })

    await test.step('Проверить opacity текста', async() => {
      const textNode = await shapes.getTextNode({ objectIndex: 0 })

      expect(textNode?.opacity).toBe(0.35)
    })
  })

  test('применяет несколько стилей к тексту внутри шейпа одним обновлением', async({ shapes }) => {
    await test.step('Применить комплексное обновление text style', async() => {
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

  test('сохраняет ранее применённые стили при последовательных обновлениях текста внутри шейпа', async({ shapes }) => {
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

  test('после выхода из режима редактирования активным объектом снова становится shape-group', async({ editorModel, history, shapes }) => {
    const shape = await test.step('Получить shape до начала редактирования', () => shapes.getFirstShape())

    await test.step('Войти в режим редактирования текста', async() => {
      await shapes.enterTextEditing({ objectIndex: 0 })

      const activeObject = await editorModel.getActiveObject()
      expect(activeObject?.type).toBe('background-textbox')
    })

    await test.step('Выйти из режима редактирования текста', async() => {
      await shapes.exitTextEditing({ objectIndex: 0 })
      await history.flushPendingSave()
    })

    await test.step('Проверить что активным снова стала группа', async() => {
      const activeObject = await editorModel.getActiveObject()
      const textNode = await shapes.getTextNode({ objectIndex: 0 })

      expect(activeObject?.id).toBe(shape.id)
      expect(activeObject?.type).toBe('shape-group')
      expect(textNode?.isEditing).toBe(false)
    })
  })

  test('редактирование текста внутри шейпа не ломает последующие операции над shape', async({ history, shapes }) => {
    await test.step('Отредактировать текст и выйти из режима editing', async() => {
      await shapes.enterTextEditing({ objectIndex: 0 })
      await shapes.updateEditingText({
        objectIndex: 0,
        text: 'Текст после editing'
      })
      await shapes.exitTextEditing({ objectIndex: 0 })
      await history.flushPendingSave()
    })

    await test.step('После editing изменить opacity и align', async() => {
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

    await test.step('Проверить что shape и text остались рабочими', async() => {
      const shape = await shapes.getFirstShape()
      const textNode = await shapes.getTextNode({ objectIndex: 0 })

      expect(shape.shapeOpacity).toBe(0.4)
      expect(shape.shapeAlignHorizontal).toBe('right')
      expect(shape.shapeAlignVertical).toBe('bottom')
      expect(textNode?.text).toBe('Текст после editing')
      expect(textNode?.textAlign).toBe('right')
      expect(textNode?.isEditing).toBe(false)
    })
  })
})

test.describe('Частичные стили текста внутри шейпа', () => {
  test.beforeEach(async({ shapes }) => {
    await shapes.add({
      presetKey: 'square',
      options: {
        text: 'Alpha Beta Gamma'
      }
    })
  })

  test('частичное изменение цвета текста внутри шейпа применяется сразу в режиме редактирования', async({ shapes }) => {
    await test.step('Войти в режим редактирования и выделить слово Beta', async() => {
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

    await test.step('Проверить стиль выделенного диапазона без выхода из editing', async() => {
      const textNode = await shapes.getTextNode({ objectIndex: 0 })
      const selectionStyle = await shapes.getSelectionStyles({ objectIndex: 0 })

      expect(textNode?.isEditing).toBe(true)
      expect(textNode?.selectionStart).toBe(6)
      expect(textNode?.selectionEnd).toBe(10)
      expect(selectionStyle?.fill).toBe('#ff0055')
    })
  })

  test('частичный стиль затрагивает только выделенный диапазон текста внутри шейпа', async({ shapes }) => {
    await test.step('Открыть редактирование и применить стиль только к слову Beta', async() => {
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
  test('после частичной стилизации и выхода из editing активным объектом снова становится shape-group', async({ editorModel, history, shapes }) => {
    const shape = await test.step('Получить исходный shape', () => shapes.getFirstShape())

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

    await test.step('Проверить возврат активного объекта на shape-group', async() => {
      const activeObject = await editorModel.getActiveObject()
      const textNode = await shapes.getTextNode({ objectIndex: 0 })

      expect(activeObject?.id).toBe(shape.id)
      expect(activeObject?.type).toBe('shape-group')
      expect(textNode?.isEditing).toBe(false)
    })
  })
})
