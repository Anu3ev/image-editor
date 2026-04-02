import { test, expect } from '../../fixtures/editor.fixture'
import {
  SHAPE_STROKE_BASE_OPTIONS,
  SHAPE_STROKE_SAFE_AREA_TOLERANCE,
  SHAPE_STROKE_STYLE
} from '../../fixtures/data/shape-stroke.data'

test.describe('Обводка у шейпа с текстом', () => {
  test('при включении обводки на узком шейпе текст не собирается обратно в одну строку', async({ shapes }) => {
    await test.step('Добавить квадрат с текстом и без авторасширения', async() => {
      await shapes.add({
        presetKey: 'square',
        options: {
          ...SHAPE_STROKE_BASE_OPTIONS,
          id: 'shape-stroke-line-breaks'
        }
      })
    })

    await test.step('Сузить шейп до минимальной ширины и зафиксировать это состояние', async() => {
      await shapes.shrinkToMinimumWidth({ id: 'shape-stroke-line-breaks' })
      await shapes.finishScale({ id: 'shape-stroke-line-breaks' })
    })

    const textBeforeStroke = await test.step('Получить состояние текста до включения обводки', async() => {
      return shapes.getTextNode({ id: 'shape-stroke-line-breaks' })
    })

    await test.step('Включить обводку', async() => {
      await shapes.setStroke({
        ...SHAPE_STROKE_STYLE,
        id: 'shape-stroke-line-breaks'
      })
    })

    const textAfterStroke = await test.step('Получить состояние текста после включения обводки', async() => {
      return shapes.getTextNode({ id: 'shape-stroke-line-breaks' })
    })

    await test.step('Проверить что текст не собрался обратно в одну строку', () => {
      expect(textBeforeStroke?.lineCount).toBeGreaterThan(1)
      expect(textAfterStroke?.lineCount).toBe(textBeforeStroke?.lineCount)
    })
  })

  test('если для обводки не хватает места, шейп становится шире и текст остаётся внутри её внутренней области', async({
    shapes
  }) => {
    await test.step('Добавить квадрат с текстом и без авторасширения', async() => {
      await shapes.add({
        presetKey: 'square',
        options: {
          ...SHAPE_STROKE_BASE_OPTIONS,
          id: 'shape-stroke-safe-area'
        }
      })
    })

    const narrowSnapshot = await test.step('Сузить шейп до минимальной ширины и зафиксировать размеры', async() => {
      await shapes.shrinkToMinimumWidth({ id: 'shape-stroke-safe-area' })
      await shapes.finishScale({ id: 'shape-stroke-safe-area' })

      return shapes.getScaleSnapshot({ id: 'shape-stroke-safe-area' })
    })

    await test.step('Включить обводку', async() => {
      await shapes.setStroke({
        ...SHAPE_STROKE_STYLE,
        id: 'shape-stroke-safe-area'
      })
    })

    const strokedSnapshot = await test.step('Получить состояние шейпа после включения обводки', async() => {
      return shapes.getScaleSnapshot({ id: 'shape-stroke-safe-area' })
    })

    await test.step('Проверить что шейп стал шире, а текст остался внутри внутренней области', () => {
      expect(strokedSnapshot.groupBoundsWidth)
        .toBeGreaterThan(narrowSnapshot.groupBoundsWidth + SHAPE_STROKE_SAFE_AREA_TOLERANCE)
      shapes.checkTextInsideStrokeSafeArea({
        snapshot: strokedSnapshot,
        tolerance: SHAPE_STROKE_SAFE_AREA_TOLERANCE
      })
    })
  })

  test('update и setStroke одинаково сохраняют переносы строк и внутреннюю область для текста', async({ shapes }) => {
    await test.step('Добавить две одинаковые фигуры', async() => {
      await shapes.add({
        presetKey: 'square',
        options: {
          ...SHAPE_STROKE_BASE_OPTIONS,
          id: 'shape-stroke-set-stroke'
        }
      })
      await shapes.add({
        presetKey: 'square',
        options: {
          ...SHAPE_STROKE_BASE_OPTIONS,
          id: 'shape-stroke-update',
          top: 420
        }
      })
    })

    await test.step('Сузить обе фигуры до минимальной ширины', async() => {
      await shapes.shrinkToMinimumWidth({ id: 'shape-stroke-set-stroke' })
      await shapes.finishScale({ id: 'shape-stroke-set-stroke' })
      await shapes.shrinkToMinimumWidth({ id: 'shape-stroke-update' })
      await shapes.finishScale({ id: 'shape-stroke-update' })
    })

    await test.step('Включить обводку двумя разными путями', async() => {
      await shapes.setStroke({
        ...SHAPE_STROKE_STYLE,
        id: 'shape-stroke-set-stroke'
      })
      await shapes.update({
        id: 'shape-stroke-update',
        options: {
          ...SHAPE_STROKE_STYLE
        }
      })
    })

    const setStrokeText = await test.step('Получить текст после setStroke', async() => {
      return shapes.getTextNode({ id: 'shape-stroke-set-stroke' })
    })
    const updateText = await test.step('Получить текст после update', async() => {
      return shapes.getTextNode({ id: 'shape-stroke-update' })
    })
    const setStrokeSnapshot = await test.step('Получить геометрию после setStroke', async() => {
      return shapes.getScaleSnapshot({ id: 'shape-stroke-set-stroke' })
    })
    const updateSnapshot = await test.step('Получить геометрию после update', async() => {
      return shapes.getScaleSnapshot({ id: 'shape-stroke-update' })
    })

    await test.step('Проверить что оба пути дают одинаковый результат', () => {
      expect(setStrokeText?.lineCount).toBe(updateText?.lineCount)
      expect(Math.abs(setStrokeSnapshot.groupBoundsWidth - updateSnapshot.groupBoundsWidth))
        .toBeLessThanOrEqual(SHAPE_STROKE_SAFE_AREA_TOLERANCE)

      shapes.checkTextInsideStrokeSafeArea({
        snapshot: setStrokeSnapshot,
        tolerance: SHAPE_STROKE_SAFE_AREA_TOLERANCE
      })
      shapes.checkTextInsideStrokeSafeArea({
        snapshot: updateSnapshot,
        tolerance: SHAPE_STROKE_SAFE_AREA_TOLERANCE
      })
    })
  })

  test('undo и redo возвращают те же переносы строк и внутреннюю область для текста после включения обводки', async({
    history,
    shapes
  }) => {
    await test.step('Добавить уже узкий квадрат с текстом', async() => {
      await shapes.add({
        presetKey: 'square',
        options: {
          ...SHAPE_STROKE_BASE_OPTIONS,
          width: 70,
          height: 360,
          id: 'shape-stroke-history'
        }
      })
    })

    const textBeforeStroke = await test.step('Получить состояние текста до включения обводки', async() => {
      return shapes.getTextNode({ id: 'shape-stroke-history' })
    })

    await test.step('Включить обводку', async() => {
      await shapes.setStroke({
        ...SHAPE_STROKE_STYLE,
        id: 'shape-stroke-history'
      })
    })

    const strokedText = await test.step('Получить состояние после включения обводки', async() => {
      return shapes.getTextNode({ id: 'shape-stroke-history' })
    })
    const strokedSnapshot = await test.step('Получить геометрию после включения обводки', async() => {
      return shapes.getScaleSnapshot({ id: 'shape-stroke-history' })
    })

    const restoredShape = await test.step('Сделать undo и получить восстановленное состояние', async() => {
      await history.undo()
      return shapes.getObject({ id: 'shape-stroke-history' })
    })
    const restoredText = await test.step('Получить текст после undo', async() => {
      return shapes.getTextNode({ id: 'shape-stroke-history' })
    })

    const redoneShape = await test.step('Сделать redo и получить повторно применённое состояние', async() => {
      await history.redo()
      return shapes.getObject({ id: 'shape-stroke-history' })
    })
    const redoneText = await test.step('Получить текст после redo', async() => {
      return shapes.getTextNode({ id: 'shape-stroke-history' })
    })
    const redoneSnapshot = await test.step('Получить геометрию после redo', async() => {
      return shapes.getScaleSnapshot({ id: 'shape-stroke-history' })
    })

    await test.step('Проверить что undo и redo возвращают те же наблюдаемые состояния', () => {
      expect(textBeforeStroke?.lineCount).toBeGreaterThan(1)
      expect(restoredShape?.shapeStrokeWidth ?? 0).toBe(0)
      expect(restoredText?.lineCount).toBe(textBeforeStroke?.lineCount)

      expect(redoneShape?.shapeStrokeWidth).toBe(SHAPE_STROKE_STYLE.strokeWidth)
      expect(redoneText?.lineCount).toBe(strokedText?.lineCount)
      expect(Math.abs((redoneSnapshot.groupBoundsWidth ?? 0) - strokedSnapshot.groupBoundsWidth))
        .toBeLessThanOrEqual(SHAPE_STROKE_SAFE_AREA_TOLERANCE)

      shapes.checkTextInsideStrokeSafeArea({
        snapshot: redoneSnapshot,
        tolerance: SHAPE_STROKE_SAFE_AREA_TOLERANCE
      })
    })
  })
})
