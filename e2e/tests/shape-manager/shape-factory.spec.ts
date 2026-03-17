import { test, expect } from '../../fixtures/editor.fixture'

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
