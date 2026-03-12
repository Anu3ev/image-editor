import { test, expect } from '../fixtures/editor.fixture'
import type {
  ShapePresetKey,
  ShapeHorizontalAlign,
  ShapeVerticalAlign,
  ShapeScaleSnapshot
} from '../types'
import {
  SHAPE_SCALING_LIVE_REVERSE_STEPS,
  SHAPE_SCALING_STROKE_WIDTH,
  SHAPE_SCALING_TOLERANCE
} from '../fixtures/data/shape-scaling.data'

test.describe('Добавление фигур', () => {
  test('добавляет круг с дефолтными параметрами', async({ editorModel, shapes }) => {
    await test.step('Добавить круг', async() => {
      const shape = await shapes.add({ presetKey: 'circle' })
      shapes.checkCreation({ shape, presetKey: 'circle' })
    })

    await test.step('Проверить что объект появился на canvas', () => editorModel.checkObjectCount({ count: 1 }))
  })

  test('добавляет прямоугольник с кастомными размерами', async({ shapes }) => {
    const shape = await test.step('Добавить прямоугольник 200×100', async() => {
      const result = await shapes.add({ presetKey: 'square', options: { width: 200, height: 100 } })
      return shapes.checkCreation({ shape: result, presetKey: 'square' })
    })

    await test.step('Проверить размеры', () => {
      expect(shape.width).toBeGreaterThan(0)
      expect(shape.height).toBeGreaterThan(0)
    })
  })

  test('добавляет фигуру с заливкой и прозрачностью', async({ shapes }) => {
    const shape = await test.step('Добавить треугольник с fill и opacity', async() => {
      const result = await shapes.add({ presetKey: 'triangle', options: { fill: '#ff0000', opacity: 0.5 } })
      return shapes.checkCreation({ shape: result, presetKey: 'triangle' })
    })

    await test.step('Проверить fill и opacity', () => {
      expect(shape.shapeFill).toBe('#ff0000')
      expect(shape.shapeOpacity).toBe(0.5)
    })
  })

  test('добавляет фигуру с текстом', async({ shapes }) => {
    await test.step('Добавить прямоугольник с текстом', async() => {
      const shape = await shapes.add({ presetKey: 'square', options: { text: 'Тестовый текст' } })
      shapes.checkCreation({ shape, presetKey: 'square' })
    })
  })

  test('добавляет несколько фигур подряд', async({ editorModel, shapes }) => {
    await test.step('Добавить 3 фигуры', () => shapes.addMultiple({ presets: ['circle', 'square', 'triangle'] }))

    await test.step('Проверить количество объектов на canvas', () => editorModel.checkObjectCount({ count: 3 }))
  })

  const presets: ShapePresetKey[] = [
    'circle', 'triangle', 'square', 'diamond', 'pentagon',
    'hexagon', 'star', 'sparkle', 'heart', 'arrow-right-fat',
    'arrow-up-fat', 'arrow-right', 'arrow-down-fat', 'arrow-up-down',
    'arrow-left-right', 'drop', 'cross', 'gear', 'badge',
    'bookmark', 'tag', 'moon'
  ]

  for (const preset of presets) {
    test(`добавляет фигуру пресета "${preset}"`, async({ shapes }) => {
      const shape = await shapes.add({ presetKey: preset })
      shapes.checkCreation({ shape, presetKey: preset })
    })
  }
})

test.describe('Удаление фигур', () => {
  test('удаляет единственную фигуру — canvas пуст', async({ editorModel, shapes }) => {
    await test.step('Добавить круг', async() => {
      const shape = await shapes.add({ presetKey: 'circle' })
      shapes.checkCreation({ shape, presetKey: 'circle' })
      await editorModel.checkObjectCount({ count: 1 })
    })

    await test.step('Удалить фигуру', () => shapes.checkRemoval({ objectIndex: 0 }))

    await test.step('Canvas пуст', () => editorModel.checkObjectCount({ count: 0 }))
  })

  test('удаляет одну фигуру из нескольких', async({ editorModel, shapes }) => {
    await test.step('Добавить 3 фигуры', () => shapes.addMultiple({ presets: ['circle', 'square', 'triangle'] }))

    await test.step('Удалить вторую фигуру', () => shapes.checkRemoval({ objectIndex: 1 }))

    await test.step('Осталось 2 фигуры', () => editorModel.checkObjectCount({ count: 2 }))
  })
})

test.describe('Свойства фигур', () => {
  test('setFill меняет заливку фигуры', async({ shapes }) => {
    await test.step('Добавить круг', () => shapes.add({ presetKey: 'circle' }))

    await test.step('Установить зелёную заливку', () => shapes.setFill({ fill: '#00ff00', objectIndex: 0 }))

    await test.step('Проверить значение fill', async() => {
      const shape = await shapes.getFirstShape()
      expect(shape.shapeFill).toBe('#00ff00')
    })
  })

  test('setStroke устанавливает обводку фигуры', async({ shapes }) => {
    await test.step('Добавить прямоугольник', () => shapes.add({ presetKey: 'square' }))

    await test.step('Установить синюю обводку шириной 3', () => shapes.setStroke({ stroke: '#0000ff', strokeWidth: 3, objectIndex: 0 }))

    await test.step('Проверить значения stroke', async() => {
      const shape = await shapes.getFirstShape()
      expect(shape.shapeStroke).toBe('#0000ff')
      expect(shape.shapeStrokeWidth).toBe(3)
    })
  })

  test('setOpacity меняет прозрачность фигуры', async({ shapes }) => {
    await test.step('Добавить треугольник', () => shapes.add({ presetKey: 'triangle' }))

    await test.step('Установить прозрачность 0.3', () => shapes.setOpacity({ opacity: 0.3, objectIndex: 0 }))

    await test.step('Проверить значение opacity', async() => {
      const shape = await shapes.getFirstShape()
      expect(shape.shapeOpacity).toBe(0.3)
    })
  })

  test('setRounding устанавливает скругление фигуры', async({ shapes }) => {
    await test.step('Добавить прямоугольник', () => shapes.add({ presetKey: 'square' }))

    await test.step('Установить скругление 20', () => shapes.setRounding({ rounding: 20, objectIndex: 0 }))

    await test.step('Проверить значение rounding', async() => {
      const shape = await shapes.getFirstShape()
      expect(shape.shapeRounding).toBe(20)
    })
  })
})

test.describe('Обновление фигур (update)', () => {
  test('update меняет пресет фигуры', async({ shapes }) => {
    await test.step('Добавить круг', () => shapes.add({ presetKey: 'circle' }))

    const updated = await test.step('Сменить пресет на star', () => shapes.update({ presetKey: 'star', objectIndex: 0 }))

    await test.step('Проверить новый пресет', () => shapes.checkUpdate({ shape: updated, presetKey: 'star' }))
  })

  test('update сохраняет позицию фигуры', async({ shapes }) => {
    const original = await test.step('Добавить круг с позицией', async() => {
      const result = await shapes.add({ presetKey: 'circle', options: { left: 100, top: 150 } })
      return shapes.checkCreation({ shape: result, presetKey: 'circle' })
    })

    const updatedRaw = await test.step('Сменить пресет на square', () => shapes.update({ presetKey: 'square', objectIndex: 0 }))

    await test.step('Проверить что позиция сохранена', () => {
      const updated = shapes.checkUpdate({ shape: updatedRaw, presetKey: 'square' })
      expect(updated.left).toBeCloseTo(original.left, 0)
      expect(updated.top).toBeCloseTo(original.top, 0)
    })
  })

  test('update с невалидным пресетом возвращает null', async({ shapes }) => {
    await test.step('Добавить круг', () => shapes.add({ presetKey: 'circle' }))

    const updated = await test.step('Попытаться сменить на несуществующий пресет', () => {
      return shapes.update({ presetKey: 'nonexistent-preset' as any, objectIndex: 0 })
    })

    await test.step('Проверить что вернулся null', () => {
      expect(updated).toBeNull()
    })
  })
})

test.describe('Выравнивание текста (setTextAlign)', () => {
  const horizontalAligns: ShapeHorizontalAlign[] = ['left', 'center', 'right']
  const verticalAligns: ShapeVerticalAlign[] = ['top', 'middle', 'bottom']

  test('setTextAlign меняет горизонтальное выравнивание', async({ shapes }) => {
    await test.step('Добавить фигуру с текстом', () => shapes.add({ presetKey: 'square', options: { text: 'Тест' } }))

    const result = await test.step('Установить left', () => shapes.setTextAlign({ horizontal: 'left', objectIndex: 0 }))

    await test.step('Проверить выравнивание', () => shapes.checkTextAlign({ shape: result, horizontal: 'left' }))
  })

  test('setTextAlign меняет вертикальное выравнивание', async({ shapes }) => {
    await test.step('Добавить фигуру с текстом', () => shapes.add({ presetKey: 'square', options: { text: 'Тест' } }))

    const result = await test.step('Установить bottom', () => shapes.setTextAlign({ vertical: 'bottom', objectIndex: 0 }))

    await test.step('Проверить выравнивание', () => shapes.checkTextAlign({ shape: result, vertical: 'bottom' }))
  })

  for (const h of horizontalAligns) {
    for (const v of verticalAligns) {
      test(`setTextAlign применяет комбинацию ${h}/${v}`, async({ shapes }) => {
        await test.step('Добавить фигуру с текстом', () => shapes.add({ presetKey: 'square', options: { text: 'Тест' } }))

        const result = await test.step(`Установить ${h}/${v}`, () => shapes.setTextAlign({ horizontal: h, vertical: v, objectIndex: 0 }))

        shapes.checkTextAlign({ shape: result, horizontal: h, vertical: v })
      })
    }
  }
})

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

test.describe('Масштабирование скругления', () => {
  test('скругление масштабируется пропорционально при равномерном увеличении', async({ shapes }) => {
    await test.step('Добавить прямоугольник со скруглением 50', async() => {
      await shapes.add({ presetKey: 'square' })
      await shapes.setRounding({ rounding: 50, objectIndex: 0 })
    })

    await test.step('Увеличить фигуру в 2 раза', () => shapes.simulateScale({ scaleX: 2, scaleY: 2, objectIndex: 0 }))

    await test.step('Проверить что скругление удвоилось', async() => {
      const shape = await shapes.getFirstShape()
      expect(shape.shapeRounding).toBe(100)
    })
  })

  test('скругление масштабируется пропорционально при уменьшении', async({ shapes }) => {
    await test.step('Добавить прямоугольник со скруглением 80', async() => {
      await shapes.add({ presetKey: 'square' })
      await shapes.setRounding({ rounding: 80, objectIndex: 0 })
    })

    await test.step('Уменьшить фигуру в 2 раза', () => shapes.simulateScale({ scaleX: 0.5, scaleY: 0.5, objectIndex: 0 }))

    await test.step('Проверить что скругление уменьшилось вдвое', async() => {
      const shape = await shapes.getFirstShape()
      expect(shape.shapeRounding).toBe(40)
    })
  })

  test('скругление масштабируется по минимальному scale при непропорциональном масштабировании', async({ shapes }) => {
    await test.step('Добавить прямоугольник со скруглением 50', async() => {
      await shapes.add({ presetKey: 'square' })
      await shapes.setRounding({ rounding: 50, objectIndex: 0 })
    })

    await test.step('Масштабировать непропорционально (3x ширина, 2x высота)', () => {
      return shapes.simulateScale({ scaleX: 3, scaleY: 2, objectIndex: 0 })
    })

    await test.step('Проверить что скругление масштабировалось по min(3, 2) = 2', async() => {
      const shape = await shapes.getFirstShape()
      expect(shape.shapeRounding).toBe(100)
    })
  })
})

test.describe('Интерактивное масштабирование shape с обводкой', () => {
  test('стабильно масштабируется при быстрых реверсах без дрейфа и прыжка', async({ shapes }) => {
    const liveSnapshots: ShapeScaleSnapshot[] = []

    await test.step('Добавить квадрат и включить обводку', async() => {
      await shapes.add({ presetKey: 'square' })
      await shapes.setStroke({
        stroke: '#0a84ff',
        strokeWidth: SHAPE_SCALING_STROKE_WIDTH,
        objectIndex: 0
      })
    })

    await test.step('Выполнить live-scale с быстрыми реверсами', async() => {
      for (let index = 0; index < SHAPE_SCALING_LIVE_REVERSE_STEPS.length; index += 1) {
        const {
          scaleX,
          scaleY
        } = SHAPE_SCALING_LIVE_REVERSE_STEPS[index]
        const snapshot = await shapes.simulateScaleStep({
          scaleX,
          scaleY,
          corner: 'br',
          originX: 'left',
          originY: 'top',
          objectIndex: 0
        })

        liveSnapshots.push(shapes.checkScaleSnapshot({
          snapshot,
          message: `должен существовать live snapshot для шага #${index + 1}`
        }))
      }
    })

    await test.step('Проверить что anchor стабилен во время drag', () => {
      const firstLiveSnapshot = shapes.checkScaleSnapshot({
        snapshot: liveSnapshots[0] ?? null,
        message: 'должен существовать первый live snapshot для проверки anchor'
      })

      for (let index = 0; index < liveSnapshots.length; index += 1) {
        const snapshot = liveSnapshots[index]
        const leftDiff = Math.abs(snapshot.groupBoundsLeft - firstLiveSnapshot.groupBoundsLeft)
        const topDiff = Math.abs(snapshot.groupBoundsTop - firstLiveSnapshot.groupBoundsTop)

        expect(leftDiff).toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.anchor)
        expect(topDiff).toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.anchor)
      }

      for (let index = 1; index < liveSnapshots.length; index += 1) {
        const previous = liveSnapshots[index - 1]
        const current = liveSnapshots[index]
        const leftStepDiff = Math.abs(current.groupBoundsLeft - previous.groupBoundsLeft)
        const topStepDiff = Math.abs(current.groupBoundsTop - previous.groupBoundsTop)

        expect(leftStepDiff).toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.anchor)
        expect(topStepDiff).toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.anchor)
      }
    })

    await test.step('Проверить что масштаб идёт в сторону активного угла', () => {
      for (let index = 1; index < liveSnapshots.length; index += 1) {
        const previousSnapshot = liveSnapshots[index - 1]
        const currentSnapshot = liveSnapshots[index]
        const previousStep = SHAPE_SCALING_LIVE_REVERSE_STEPS[index - 1]
        const currentStep = SHAPE_SCALING_LIVE_REVERSE_STEPS[index]
        const deltaScaleX = currentStep.scaleX - previousStep.scaleX
        const deltaScaleY = currentStep.scaleY - previousStep.scaleY

        if (deltaScaleX > 0) {
          expect(currentSnapshot.groupBoundsRight)
            .toBeGreaterThan(previousSnapshot.groupBoundsRight - SHAPE_SCALING_TOLERANCE.direction)
        }

        if (deltaScaleX < 0) {
          expect(currentSnapshot.groupBoundsRight)
            .toBeLessThan(previousSnapshot.groupBoundsRight + SHAPE_SCALING_TOLERANCE.direction)
        }

        if (deltaScaleY > 0) {
          expect(currentSnapshot.groupBoundsBottom)
            .toBeGreaterThan(previousSnapshot.groupBoundsBottom - SHAPE_SCALING_TOLERANCE.direction)
        }

        if (deltaScaleY < 0) {
          expect(currentSnapshot.groupBoundsBottom)
            .toBeLessThan(previousSnapshot.groupBoundsBottom + SHAPE_SCALING_TOLERANCE.direction)
        }
      }
    })

    await test.step('Проверить постоянство обводки и совпадение shape с bbox в live-режиме', () => {
      for (let index = 0; index < liveSnapshots.length; index += 1) {
        const snapshot = liveSnapshots[index]
        expect(snapshot.shapeStrokeWidth).toBe(SHAPE_SCALING_STROKE_WIDTH)
        expect(snapshot.shapeStrokeUniform).toBe(true)

        expect(snapshot.shapeBoundsWidth).not.toBeNull()
        expect(snapshot.shapeBoundsHeight).not.toBeNull()

        if (snapshot.shapeBoundsWidth !== null) {
          const widthDiff = Math.abs(snapshot.groupBoundsWidth - snapshot.shapeBoundsWidth)
          expect(widthDiff).toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.bbox)
        }

        if (snapshot.shapeBoundsHeight !== null) {
          const heightDiff = Math.abs(snapshot.groupBoundsHeight - snapshot.shapeBoundsHeight)
          expect(heightDiff).toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.bbox)
        }
      }
    })

    const snapshotBeforeMouseUp = shapes.checkScaleSnapshot({
      snapshot: liveSnapshots[liveSnapshots.length - 1] ?? null,
      message: 'должен существовать последний live snapshot перед mouseup'
    })

    const finalSnapshot = await test.step('Завершить drag и получить финальный snapshot', async() => {
      const snapshot = await shapes.finishScale({
        objectIndex: 0
      })

      return shapes.checkScaleSnapshot({
        snapshot,
        message: 'должен существовать финальный snapshot после object:modified'
      })
    })

    await test.step('Проверить отсутствие прыжка на mouseup', () => {
      const leftJump = Math.abs(finalSnapshot.groupBoundsLeft - snapshotBeforeMouseUp.groupBoundsLeft)
      const topJump = Math.abs(finalSnapshot.groupBoundsTop - snapshotBeforeMouseUp.groupBoundsTop)
      const rightJump = Math.abs(finalSnapshot.groupBoundsRight - snapshotBeforeMouseUp.groupBoundsRight)
      const bottomJump = Math.abs(finalSnapshot.groupBoundsBottom - snapshotBeforeMouseUp.groupBoundsBottom)

      expect(leftJump).toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
      expect(topJump).toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
      expect(rightJump).toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
      expect(bottomJump).toBeLessThanOrEqual(SHAPE_SCALING_TOLERANCE.mouseupJump)
    })

    await test.step('Проверить что после bake масштаб сброшен и обводка сохранена', async() => {
      const shape = await shapes.getFirstShape()
      expect(shape.scaleX).toBe(1)
      expect(shape.scaleY).toBe(1)
      expect(finalSnapshot.shapeStrokeWidth).toBe(SHAPE_SCALING_STROKE_WIDTH)
      expect(finalSnapshot.shapeStrokeUniform).toBe(true)
    })
  })
})

test.describe('Граничные случаи', () => {
  test('add с неизвестным presetKey возвращает null', async({ editorModel, shapes }) => {
    const shape = await test.step('Добавить с невалидным пресетом', () => shapes.add({ presetKey: 'nonexistent-preset' as any }))

    await test.step('Проверить что shape не создан', () => {
      expect(shape).toBeNull()
    })

    await test.step('Canvas остался пустым', () => editorModel.checkObjectCount({ count: 0 }))
  })

  test('setRounding не влияет на non-roundable пресет (circle)', async({ shapes }) => {
    await test.step('Добавить круг', () => shapes.add({ presetKey: 'circle' }))

    const before = await test.step('Запомнить rounding до операции', async() => {
      const shape = await shapes.getFirstShape()
      return shape.shapeRounding
    })

    await test.step('Попытаться установить скругление', () => shapes.setRounding({ rounding: 50, objectIndex: 0 }))

    await test.step('Проверить что rounding не изменился', async() => {
      const shape = await shapes.getFirstShape()
      expect(shape.shapeRounding).toBe(before)
    })
  })

  test('setRounding не влияет на non-roundable пресет (heart)', async({ shapes }) => {
    await test.step('Добавить сердце', () => shapes.add({ presetKey: 'heart' }))

    const before = await test.step('Запомнить rounding до операции', async() => {
      const shape = await shapes.getFirstShape()
      return shape.shapeRounding
    })

    await test.step('Попытаться установить скругление', () => shapes.setRounding({ rounding: 30, objectIndex: 0 }))

    await test.step('Проверить что rounding не изменился', async() => {
      const shape = await shapes.getFirstShape()
      expect(shape.shapeRounding).toBe(before)
    })
  })

  test('setStroke с dash устанавливает пунктирную обводку', async({ shapes }) => {
    await test.step('Добавить прямоугольник', () => shapes.add({ presetKey: 'square' }))

    await test.step('Установить обводку с dash', () => {
      return shapes.setStroke({ stroke: '#ff0000', strokeWidth: 2, dash: [5, 3], objectIndex: 0 })
    })

    await test.step('Проверить обводку', async() => {
      const shape = await shapes.getFirstShape()
      expect(shape.shapeStroke).toBe('#ff0000')
      expect(shape.shapeStrokeWidth).toBe(2)
    })
  })

  test('операции работают через active object без указания objectIndex', async({ editorModel, shapes }) => {
    await test.step('Добавить круг (он станет активным)', () => shapes.add({ presetKey: 'circle' }))

    await test.step('Проверить что есть активный объект', async() => {
      const active = await editorModel.getActiveObject()
      expect(active).not.toBeNull()
    })

    await test.step('Установить заливку без objectIndex', () => shapes.setFill({ fill: '#123456' }))

    await test.step('Проверить что заливка применена', async() => {
      const shape = await shapes.getFirstShape()
      expect(shape.shapeFill).toBe('#123456')
    })
  })
})
