import { test, expect } from '../../fixtures/editor.fixture'
import {
  OBJECT_SIZE_INDICATOR_TOLERANCE,
  SHAPE_SIZE_INDICATOR_CORNER_CASES,
  SHAPE_SIZE_INDICATOR_SIDE_CASES
} from '../../fixtures/data/object-size-indicator.data'

test.describe('Индикатор размеров фигуры', () => {
  test.beforeEach(async({ shapes }) => {
    const shape = await shapes.add({
      presetKey: 'square',
      options: {
        width: 180,
        height: 120,
        text: ''
      }
    })

    shapes.checkCreation({
      shape,
      presetKey: 'square'
    })
  })

  for (const scaleCase of SHAPE_SIZE_INDICATOR_SIDE_CASES) {
    test(scaleCase.title, async({
      editorModel,
      shapes
    }) => {
      const liveSnapshot = await test.step('Потянуть боковую ручку фигуры', async() => {
        return shapes.scaleFromSide({
          side: scaleCase.side,
          scale: scaleCase.scale,
          objectIndex: 0
        })
      })

      const indicator = await test.step('Получить текст индикатора размеров', async() => {
        return editorModel.requireObjectSizeIndicator()
      })

      await test.step('Проверить, что индикатор показывает текущие размеры фигуры', () => {
        expect(Math.abs(indicator.width - Math.round(liveSnapshot.groupBoundsWidth)))
          .toBeLessThanOrEqual(OBJECT_SIZE_INDICATOR_TOLERANCE)
        expect(Math.abs(indicator.height - Math.round(liveSnapshot.groupBoundsHeight)))
          .toBeLessThanOrEqual(OBJECT_SIZE_INDICATOR_TOLERANCE)
      })
    })
  }

  for (const scaleCase of SHAPE_SIZE_INDICATOR_CORNER_CASES) {
    test(scaleCase.title, async({
      editorModel,
      shapes
    }) => {
      const liveSnapshot = await test.step('Потянуть угловую ручку фигуры', async() => {
        return shapes.scaleDiagonally({
          corner: scaleCase.corner,
          scaleX: scaleCase.scaleX,
          scaleY: scaleCase.scaleY,
          objectIndex: 0
        })
      })

      const indicator = await test.step('Получить текст индикатора размеров', async() => {
        return editorModel.requireObjectSizeIndicator()
      })

      await test.step('Проверить, что индикатор показывает текущие размеры фигуры', () => {
        expect(Math.abs(indicator.width - Math.round(liveSnapshot.groupBoundsWidth)))
          .toBeLessThanOrEqual(OBJECT_SIZE_INDICATOR_TOLERANCE)
        expect(Math.abs(indicator.height - Math.round(liveSnapshot.groupBoundsHeight)))
          .toBeLessThanOrEqual(OBJECT_SIZE_INDICATOR_TOLERANCE)
      })
    })
  }

  test('после отпускания мыши скрывает индикатор размеров фигуры', async({
    editorModel,
    shapes
  }) => {
    await test.step('Потянуть фигуру за правую ручку', async() => {
      await shapes.scaleFromSide({
        side: 'right',
        scale: 1.2,
        objectIndex: 0
      })
    })

    await test.step('Проверить, что индикатор виден во время скейлинга', async() => {
      await editorModel.requireObjectSizeIndicator()
    })

    await test.step('Отпустить мышь и завершить скейлинг', async() => {
      await shapes.finishScale({ objectIndex: 0 })
    })

    const indicator = await test.step('Получить состояние индикатора после mouseup', async() => {
      return editorModel.getObjectSizeIndicator()
    })

    await test.step('Проверить, что индикатор скрыт после mouseup', () => {
      expect(indicator.visible).toBe(false)
    })
  })
})
