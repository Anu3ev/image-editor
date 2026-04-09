import { test, expect } from '../../fixtures/editor.fixture'
import {
  SHAPE_OPACITY_PRESET,
  SHAPE_OPACITY_TEXT,
  SHAPE_OPACITY_VALUE,
  SHAPE_SHAPE_ONLY_OPACITY_VALUE
} from '../../fixtures/data/shape-opacity.data'

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
