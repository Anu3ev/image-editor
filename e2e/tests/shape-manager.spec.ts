import { test, expect } from '../fixtures/editor.fixture'
import type { ShapePresetKey } from '../types'

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

    await test.step('Удалить фигуру', async() => {
      const removed = await shapes.remove({ objectIndex: 0 })
      expect(removed).toBe(true)
    })

    await test.step('Canvas пуст', () => editorModel.checkObjectCount({ count: 0 }))
  })

  test('удаляет одну фигуру из нескольких', async({ editorModel, shapes }) => {
    await test.step('Добавить 3 фигуры', () => shapes.addMultiple({ presets: ['circle', 'square', 'triangle'] }))

    await test.step('Удалить вторую фигуру', async() => {
      const removed = await shapes.remove({ objectIndex: 1 })
      expect(removed).toBe(true)
    })

    await test.step('Осталось 2 фигуры', () => editorModel.checkObjectCount({ count: 2 }))
  })
})

test.describe('Свойства фигур', () => {
  test('setFill меняет заливку фигуры', async({ shapes }) => {
    await test.step('Добавить круг', () => shapes.add({ presetKey: 'circle' }))

    await test.step('Установить зелёную заливку', () => shapes.setFill({ fill: '#00ff00', objectIndex: 0 }))

    await test.step('Проверить значение fill', async() => {
      const shapeObjects = await shapes.getShapeObjects()
      expect(shapeObjects[0].shapeFill).toBe('#00ff00')
    })
  })

  test('setStroke устанавливает обводку фигуры', async({ shapes }) => {
    await test.step('Добавить прямоугольник', () => shapes.add({ presetKey: 'square' }))

    await test.step('Установить синюю обводку шириной 3', () => shapes.setStroke({ stroke: '#0000ff', strokeWidth: 3, objectIndex: 0 }))

    await test.step('Проверить значения stroke', async() => {
      const shapeObjects = await shapes.getShapeObjects()
      expect(shapeObjects[0].shapeStroke).toBe('#0000ff')
      expect(shapeObjects[0].shapeStrokeWidth).toBe(3)
    })
  })

  test('setOpacity меняет прозрачность фигуры', async({ shapes }) => {
    await test.step('Добавить треугольник', () => shapes.add({ presetKey: 'triangle' }))

    await test.step('Установить прозрачность 0.3', () => shapes.setOpacity({ opacity: 0.3, objectIndex: 0 }))

    await test.step('Проверить значение opacity', async() => {
      const shapeObjects = await shapes.getShapeObjects()
      expect(shapeObjects[0].shapeOpacity).toBe(0.3)
    })
  })

  test('setRounding устанавливает скругление фигуры', async({ shapes }) => {
    await test.step('Добавить прямоугольник', () => shapes.add({ presetKey: 'square' }))

    await test.step('Установить скругление 20', () => shapes.setRounding({ rounding: 20, objectIndex: 0 }))

    await test.step('Проверить значение rounding', async() => {
      const shapeObjects = await shapes.getShapeObjects()
      expect(shapeObjects[0].shapeRounding).toBe(20)
    })
  })
})
