import { test, expect } from '../../fixtures/editor.fixture'
import {
  SHAPE_OPACITY_PRESET,
  SHAPE_OPACITY_TEXT,
  SHAPE_OPACITY_VALUE,
  SHAPE_SHAPE_ONLY_OPACITY_VALUE
} from '../../fixtures/data/shape-opacity.data'
import {
  SHAPE_ROUNDING_MANUAL_SIZE_OPTIONS,
  SHAPE_ROUNDING_SIZE_TOLERANCE,
  SHAPE_ROUNDING_UPDATED_VALUE
} from '../../fixtures/data/shape-rounding.data'

test.describe('Свойства фигур', () => {
  test('при создании прямоугольника слишком большое скругление ограничивается 100', async({ shapes }) => {
    const createdShape = await test.step('Добавить прямоугольник со слишком большим скруглением', () => {
      return shapes.add({
        presetKey: 'square',
        options: {
          id: 'shape-rounding-add-clamp',
          rounding: 999999
        }
      })
    })

    await test.step('Проверить что фигура создана со скруглением 100', () => {
      shapes.checkCreation({
        shape: createdShape,
        presetKey: 'square'
      })
      expect(createdShape?.shapeRounding).toBe(100)
    })
  })

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

  test('setOpacity по умолчанию меняет прозрачность и фигуры, и текста внутри неё', async({ shapes }) => {
    const createdShape = await test.step('Добавить фигуру с текстом', () => {
      return shapes.addShapeWithText({
        presetKey: SHAPE_OPACITY_PRESET,
        text: SHAPE_OPACITY_TEXT
      })
    })

    await test.step('Установить прозрачность для фигуры и текста', () => {
      return shapes.setOpacity({
        id: createdShape.id,
        opacity: SHAPE_OPACITY_VALUE
      })
    })

    await test.step('Проверить прозрачность фигуры и текста', async() => {
      const shape = await shapes.getObject({ id: createdShape.id })
      const textNode = await shapes.getTextNode({ id: createdShape.id })

      expect(shape?.shapeOpacity).toBe(SHAPE_OPACITY_VALUE)
      expect(textNode?.opacity).toBe(SHAPE_OPACITY_VALUE)
    })
  })

  test('setOpacity только для фигуры не меняет прозрачность текста', async({ shapes }) => {
    const createdShape = await test.step('Добавить фигуру с текстом', () => {
      return shapes.addShapeWithText({
        presetKey: SHAPE_OPACITY_PRESET,
        text: SHAPE_OPACITY_TEXT
      })
    })

    await test.step('Установить прозрачность только для фигуры', () => {
      return shapes.setOpacity({
        id: createdShape.id,
        opacity: SHAPE_SHAPE_ONLY_OPACITY_VALUE,
        applyToText: false
      })
    })

    await test.step('Проверить прозрачность фигуры и текста', async() => {
      const shape = await shapes.getObject({ id: createdShape.id })
      const textNode = await shapes.getTextNode({ id: createdShape.id })

      expect(shape?.shapeOpacity).toBe(SHAPE_SHAPE_ONLY_OPACITY_VALUE)
      expect(textNode?.opacity).toBe(1)
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

  test('при изменении скругления шейп с вручную заданными размерами не сжимается', async({ shapes }) => {
    const createdShape = await test.step('Добавить прямоугольник с вручную заданной шириной и высотой', () => {
      return shapes.add({
        presetKey: 'square',
        options: {
          ...SHAPE_ROUNDING_MANUAL_SIZE_OPTIONS,
          id: 'shape-rounding-manual-size'
        }
      })
    })

    await test.step('Проверить что фигура создана в исходном непропорциональном размере', () => {
      shapes.checkCreation({
        shape: createdShape,
        presetKey: 'square'
      })
      expect(createdShape?.shapeTextAutoExpand).toBe(false)
      expect(createdShape?.shapeRounding).toBe(SHAPE_ROUNDING_MANUAL_SIZE_OPTIONS.rounding)
    })

    const initialSnapshot = await test.step('Получить исходную геометрию фигуры', () => {
      return shapes.getScaleSnapshot({ id: 'shape-rounding-manual-size' })
    })

    await test.step('Изменить скругление без смены пресета', () => {
      return shapes.setRounding({
        id: 'shape-rounding-manual-size',
        rounding: SHAPE_ROUNDING_UPDATED_VALUE
      })
    })

    const updatedShape = await test.step('Получить состояние фигуры после изменения скругления', () => {
      return shapes.getObject({ id: 'shape-rounding-manual-size' })
    })
    const updatedSnapshot = await test.step('Получить геометрию после изменения скругления', () => {
      return shapes.getScaleSnapshot({ id: 'shape-rounding-manual-size' })
    })

    await test.step('Проверить что фигура сохранила ширину и высоту, а текст остался внутри', () => {
      expect(updatedShape?.shapePresetKey).toBe('square')
      expect(updatedShape?.shapeRounding).toBe(SHAPE_ROUNDING_UPDATED_VALUE)
      expect(Math.abs(updatedSnapshot.groupBoundsWidth - initialSnapshot.groupBoundsWidth))
        .toBeLessThanOrEqual(SHAPE_ROUNDING_SIZE_TOLERANCE)
      expect(Math.abs(updatedSnapshot.groupBoundsHeight - initialSnapshot.groupBoundsHeight))
        .toBeLessThanOrEqual(SHAPE_ROUNDING_SIZE_TOLERANCE)
      shapes.checkNodeInsideGroup({ snapshot: updatedSnapshot, kind: 'shape' })
      shapes.checkNodeInsideGroup({ snapshot: updatedSnapshot, kind: 'text' })
    })
  })

  test('при обновлении прямоугольника слишком большое скругление ограничивается 100', async({ shapes }) => {
    await test.step('Добавить прямоугольник', () => {
      return shapes.add({
        presetKey: 'square',
        options: {
          id: 'shape-rounding-update-clamp'
        }
      })
    })

    const updatedShape = await test.step('Обновить фигуру со слишком большим скруглением', () => {
      return shapes.update({
        id: 'shape-rounding-update-clamp',
        options: {
          rounding: 999999
        }
      })
    })

    await test.step('Проверить что после обновления скругление ограничено 100', () => {
      expect(updatedShape?.shapeRounding).toBe(100)
      expect(updatedShape?.shapePresetKey).toBe('square')
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
})

test.describe('ID объектов фигуры', () => {
  test('при добавлении фигуры внутренние объекты сразу получают id', async({ shapes }) => {
    await test.step('Добавить фигуру с текстом', async() => {
      shapes.checkCreation({
        shape: await shapes.add({
          presetKey: 'square',
          options: {
            id: 'shape-object-ids-source',
            text: 'Текст внутри фигуры'
          }
        }),
        presetKey: 'square'
      })
    })

    await test.step('Проверить id группы и внутренних объектов', async() => {
      const ids = await shapes.getObjectTreeIds({ id: 'shape-object-ids-source' })

      expect(ids.groupId).toBe('shape-object-ids-source')
      expect(ids.shapeId).toEqual(expect.any(String))
      expect(ids.textId).toEqual(expect.any(String))
      expect(ids.shapeId).not.toBe(ids.textId)
    })
  })

  test('после копирования и вставки фигуры внутренние объекты получают новые id', async({
    clipboard,
    editorModel,
    shapes
  }) => {
    await test.step('Добавить исходную фигуру', async() => {
      shapes.checkCreation({
        shape: await shapes.add({
          presetKey: 'square',
          options: {
            id: 'shape-copy-object-ids-source',
            text: 'Текст для копии'
          }
        }),
        presetKey: 'square'
      })
    })

    const sourceIds = await test.step('Получить id исходной фигуры и внутренних объектов', () => {
      return shapes.getObjectTreeIds({ id: 'shape-copy-object-ids-source' })
    })

    await test.step('Скопировать и вставить фигуру', async() => {
      await shapes.select({ id: 'shape-copy-object-ids-source' })
      await clipboard.copy()
      await clipboard.waitForClipboardReady()

      const pasted = await clipboard.paste()

      expect(pasted).toBe(true)
      await editorModel.checkObjectCount({ count: 2 })
    })

    const pastedShapeId = await test.step('Найти вставленную фигуру', async() => {
      const shapeObjects = await shapes.getShapeObjects()
      const pastedShape = shapeObjects.find((shape) => shape.id !== sourceIds.groupId)

      if (!pastedShape?.id) {
        throw new Error('после вставки должна существовать новая фигура с id')
      }

      return pastedShape.id
    })

    await test.step('Проверить что у вставленной фигуры и внутренних объектов новые id', async() => {
      const pastedIds = await shapes.getObjectTreeIds({ id: pastedShapeId })

      expect(pastedIds.groupId).toEqual(expect.any(String))
      expect(pastedIds.shapeId).toEqual(expect.any(String))
      expect(pastedIds.textId).toEqual(expect.any(String))
      expect(pastedIds.groupId).not.toBe(sourceIds.groupId)
      expect(pastedIds.shapeId).not.toBe(sourceIds.shapeId)
      expect(pastedIds.textId).not.toBe(sourceIds.textId)
      expect(pastedIds.shapeId).not.toBe(pastedIds.textId)
    })
  })
})
