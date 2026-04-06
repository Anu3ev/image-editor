import { test, expect } from '../../fixtures/editor.fixture'
import type { ShapePresetKey } from '../../types'

test.describe('Пресеты фигур', () => {
  const presets: ShapePresetKey[] = [
    'circle', 'pie', 'triangle', 'square', 'diamond',
    'pentagon', 'hexagon', 'star', 'star-16', 'sparkle',
    'heart', 'arrow-right-fat', 'arrow-up-fat', 'arrow-right', 'arrow-left',
    'arrow-up', 'arrow-down-fat', 'arrow-down', 'arrow-up-down', 'arrow-left-right',
    'banner', 'drop', 'cross', 'ribbon', 'gear',
    'badge', 'bookmark', 'tag', 'moon'
  ]

  for (const preset of presets) {
    test(`добавляет фигуру пресета "${preset}"`, async({ shapes }) => {
      const shape = await shapes.add({ presetKey: preset })
      shapes.checkCreation({ shape, presetKey: preset })
    })
  }

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

  test('текст внутри banner после увеличения шрифта и обводки остаётся внутри фигуры', async({ shapes }) => {
    const createdShape = await test.step('Добавить banner с текстом', async() => {
      return shapes.add({
        presetKey: 'banner',
        options: {
          id: 'shape-preset-banner-text',
          width: 280,
          height: 160,
          text: 'SALE',
          textStyle: {
            fontSize: 44
          }
        }
      })
    })

    shapes.checkCreation({
      shape: createdShape,
      presetKey: 'banner'
    })

    await test.step('Добавить обводку и увеличить размер текста', async() => {
      await shapes.setStroke({
        id: 'shape-preset-banner-text',
        stroke: '#111111',
        strokeWidth: 10
      })
      await shapes.update({
        id: 'shape-preset-banner-text',
        options: {
          text: 'BIG SALE',
          textStyle: {
            fontSize: 58
          }
        }
      })
    })

    await test.step('Проверить что текст не вышел за пределы фигуры и безопасной области обводки', async() => {
      const snapshot = await shapes.getScaleSnapshot({ id: 'shape-preset-banner-text' })

      shapes.checkNodeInsideGroup({ snapshot, kind: 'shape' })
      shapes.checkNodeInsideGroup({ snapshot, kind: 'text' })
      shapes.checkTextInsideStrokeSafeArea({ snapshot, tolerance: 2 })
    })
  })
})
