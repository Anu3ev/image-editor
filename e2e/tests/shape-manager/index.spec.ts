import { test, expect } from '../../fixtures/editor.fixture'

test.describe('Top-level ShapeManager API', () => {
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
