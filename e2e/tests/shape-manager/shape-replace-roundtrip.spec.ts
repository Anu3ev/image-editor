import { test, expect } from '../../fixtures/editor.fixture'
import {
  SHAPE_REPLACE_BASE_OPTIONS,
  SHAPE_REPLACE_EXPANDING_TEXT,
  SHAPE_REPLACE_TOLERANCE
} from '../../fixtures/data/shape-replace.data'
import {
  SHAPE_ROUNDING_MANUAL_SIZE_OPTIONS,
  SHAPE_ROUNDING_SIZE_TOLERANCE,
  SHAPE_ROUNDING_UPDATED_VALUE
} from '../../fixtures/data/shape-rounding.data'

test.describe('Смена фигуры после roundtrip через разные менеджеры', () => {
  test('после сохранения фигуры в шаблон следующая замена сохраняет её увеличенный размер', async({
    canvas,
    editorModel,
    shapes,
    template
  }) => {
    const sourceShape = await test.step('Подготовить фигуру с уже расширенным replacement box', async() => {
      const createdShape = await shapes.add({
        presetKey: 'square',
        options: {
          ...SHAPE_REPLACE_BASE_OPTIONS,
          id: 'shape-replace-template-source'
        }
      })

      shapes.checkCreation({
        shape: createdShape,
        presetKey: 'square'
      })

      await shapes.update({
        id: 'shape-replace-template-source',
        presetKey: 'arrow-up'
      })
      await shapes.update({
        id: 'shape-replace-template-source',
        options: {
          text: SHAPE_REPLACE_EXPANDING_TEXT
        }
      })

      return shapes.getScaleSnapshot({ id: 'shape-replace-template-source' })
    })

    const savedTemplate = await test.step('Сохранить фигуру в шаблон', async() => {
      await shapes.select({ id: 'shape-replace-template-source' })

      return template.serializeSelection()
    })

    await test.step('Очистить canvas и применить шаблон обратно', async() => {
      expect(savedTemplate).not.toBeNull()
      await canvas.clearCanvas()

      const insertedCount = await template.applyTemplate({
        template: savedTemplate!
      })

      expect(insertedCount).toBe(1)
      await editorModel.checkObjectCount({ count: 1 })
    })

    const restoredSnapshot = await test.step('Получить геометрию фигуры после шаблонного roundtrip', () => {
      return shapes.getScaleSnapshot({ objectIndex: 0 })
    })

    await test.step('Сменить восстановленную фигуру на стрелку вправо', async() => {
      await shapes.update({
        objectIndex: 0,
        presetKey: 'arrow-right'
      })
    })

    const finalSnapshot = await test.step('Получить геометрию после следующей замены', () => {
      return shapes.getScaleSnapshot({ objectIndex: 0 })
    })

    await test.step('Проверить что шаблон сохранил replacement box и новая замена использовала его', () => {
      expect(Math.abs(restoredSnapshot.groupBoundsWidth - sourceShape.groupBoundsWidth))
        .toBeLessThanOrEqual(SHAPE_REPLACE_TOLERANCE)
      expect(Math.abs(restoredSnapshot.groupBoundsHeight - sourceShape.groupBoundsHeight))
        .toBeLessThanOrEqual(SHAPE_REPLACE_TOLERANCE)
      expect(finalSnapshot.groupBoundsWidth)
        .toBeGreaterThan(SHAPE_REPLACE_BASE_OPTIONS.width + SHAPE_REPLACE_TOLERANCE)
      shapes.checkNodeInsideGroup({ snapshot: finalSnapshot, kind: 'shape' })
      shapes.checkNodeInsideGroup({ snapshot: finalSnapshot, kind: 'text' })
    })
  })

  test('после копирования и вставки следующая замена сохраняет увеличенный размер фигуры', async({
    clipboard,
    editorModel,
    shapes
  }) => {
    const sourceShape = await test.step('Подготовить фигуру с уже расширенным replacement box', async() => {
      const createdShape = await shapes.add({
        presetKey: 'square',
        options: {
          ...SHAPE_REPLACE_BASE_OPTIONS,
          id: 'shape-replace-copy-source'
        }
      })

      shapes.checkCreation({
        shape: createdShape,
        presetKey: 'square'
      })

      await shapes.update({
        id: 'shape-replace-copy-source',
        presetKey: 'arrow-up'
      })
      await shapes.update({
        id: 'shape-replace-copy-source',
        options: {
          text: SHAPE_REPLACE_EXPANDING_TEXT
        }
      })

      return shapes.getScaleSnapshot({ id: 'shape-replace-copy-source' })
    })

    const pastedShapeId = await test.step('Скопировать фигуру и вставить её копию', async() => {
      await shapes.select({ id: 'shape-replace-copy-source' })
      await clipboard.copy()
      await clipboard.waitForClipboardReady()

      const pasted = await clipboard.paste()
      expect(pasted).toBe(true)
      await editorModel.checkObjectCount({ count: 2 })

      const shapeObjects = await shapes.getShapeObjects()
      const pastedShape = shapeObjects.find((shape) => shape.id !== 'shape-replace-copy-source')

      expect(pastedShape?.id).toBeTruthy()

      return pastedShape?.id as string
    })

    const restoredSnapshot = await test.step('Получить геометрию вставленной копии', () => {
      return shapes.getScaleSnapshot({ id: pastedShapeId })
    })

    await test.step('Сменить вставленную копию на стрелку вправо', async() => {
      await shapes.update({
        id: pastedShapeId,
        presetKey: 'arrow-right'
      })
    })

    const finalSnapshot = await test.step('Получить геометрию после замены вставленной копии', () => {
      return shapes.getScaleSnapshot({ id: pastedShapeId })
    })

    await test.step('Проверить что clipboard roundtrip сохранил replacement box', () => {
      expect(Math.abs(restoredSnapshot.groupBoundsWidth - sourceShape.groupBoundsWidth))
        .toBeLessThanOrEqual(SHAPE_REPLACE_TOLERANCE)
      expect(Math.abs(restoredSnapshot.groupBoundsHeight - sourceShape.groupBoundsHeight))
        .toBeLessThanOrEqual(SHAPE_REPLACE_TOLERANCE)
      expect(finalSnapshot.groupBoundsWidth)
        .toBeGreaterThan(SHAPE_REPLACE_BASE_OPTIONS.width + SHAPE_REPLACE_TOLERANCE)
      shapes.checkNodeInsideGroup({ snapshot: finalSnapshot, kind: 'shape' })
      shapes.checkNodeInsideGroup({ snapshot: finalSnapshot, kind: 'text' })
    })
  })

  test('после undo и redo следующая замена сохраняет увеличенный размер фигуры', async({
    editorModel,
    history,
    shapes
  }) => {
    const sourceShape = await test.step('Подготовить фигуру с уже расширенным replacement box', async() => {
      const createdShape = await shapes.add({
        presetKey: 'square',
        options: {
          ...SHAPE_REPLACE_BASE_OPTIONS,
          id: 'shape-replace-history-source'
        }
      })

      shapes.checkCreation({
        shape: createdShape,
        presetKey: 'square'
      })

      await shapes.update({
        id: 'shape-replace-history-source',
        presetKey: 'arrow-up'
      })
      await shapes.update({
        id: 'shape-replace-history-source',
        options: {
          text: SHAPE_REPLACE_EXPANDING_TEXT
        }
      })
      await history.flushPendingSave()

      return shapes.getScaleSnapshot({ id: 'shape-replace-history-source' })
    })

    await test.step('Удалить фигуру и восстановить её через undo', async() => {
      await shapes.remove({ id: 'shape-replace-history-source' })
      await editorModel.checkObjectCount({ count: 0 })

      await history.undo()
      await editorModel.checkObjectCount({ count: 1 })
    })

    await test.step('Снова убрать фигуру через redo и ещё раз восстановить через undo', async() => {
      await history.redo()
      await editorModel.checkObjectCount({ count: 0 })

      await history.undo()
      await editorModel.checkObjectCount({ count: 1 })
    })

    const restoredSnapshot = await test.step('Получить геометрию восстановленной фигуры', () => {
      return shapes.getScaleSnapshot({ id: 'shape-replace-history-source' })
    })

    await test.step('Сменить восстановленную фигуру на стрелку вправо', async() => {
      await shapes.update({
        id: 'shape-replace-history-source',
        presetKey: 'arrow-right'
      })
    })

    const finalSnapshot = await test.step('Получить геометрию после следующей замены', () => {
      return shapes.getScaleSnapshot({ id: 'shape-replace-history-source' })
    })

    await test.step('Проверить что history roundtrip сохранил replacement box', () => {
      expect(Math.abs(restoredSnapshot.groupBoundsWidth - sourceShape.groupBoundsWidth))
        .toBeLessThanOrEqual(SHAPE_REPLACE_TOLERANCE)
      expect(Math.abs(restoredSnapshot.groupBoundsHeight - sourceShape.groupBoundsHeight))
        .toBeLessThanOrEqual(SHAPE_REPLACE_TOLERANCE)
      expect(finalSnapshot.groupBoundsWidth)
        .toBeGreaterThan(SHAPE_REPLACE_BASE_OPTIONS.width + SHAPE_REPLACE_TOLERANCE)
      shapes.checkNodeInsideGroup({ snapshot: finalSnapshot, kind: 'shape' })
      shapes.checkNodeInsideGroup({ snapshot: finalSnapshot, kind: 'text' })
    })
  })
})

test.describe('Скругление после roundtrip через разные менеджеры', () => {
  test('после сохранения фигуры в шаблон скругление остаётся тем же', async({
    canvas,
    editorModel,
    shapes,
    template
  }) => {
    const createdShape = await test.step('Добавить прямоугольник со скруглением 80', () => {
      return shapes.add({
        presetKey: 'square',
        options: {
          id: 'shape-rounding-template-source',
          rounding: 80
        }
      })
    })

    await test.step('Проверить что исходная фигура создана с нужным скруглением', () => {
      shapes.checkCreation({
        shape: createdShape,
        presetKey: 'square'
      })
      expect(createdShape?.shapeRounding).toBe(80)
    })

    const serializedTemplate = await test.step('Сохранить фигуру в шаблон', async() => {
      await shapes.select({ id: 'shape-rounding-template-source' })

      return template.serializeSelection()
    })

    await test.step('Очистить canvas и применить шаблон обратно', async() => {
      expect(serializedTemplate).not.toBeNull()
      await canvas.clearCanvas()

      const insertedCount = await template.applyTemplate({
        template: serializedTemplate!
      })

      expect(insertedCount).toBe(1)
      await editorModel.checkObjectCount({ count: 1 })
    })

    await test.step('Проверить что после шаблона скругление сохранилось', async() => {
      const restoredShape = await shapes.getObject({ objectIndex: 0 })

      expect(restoredShape?.shapePresetKey).toBe('square')
      expect(restoredShape?.shapeRounding).toBe(80)
    })
  })

  test('после применения шаблона изменение скругления не сжимает шейп с вручную заданными размерами', async({
    canvas,
    editorModel,
    shapes,
    template
  }) => {
    const sourceSnapshot = await test.step('Добавить прямоугольник с вручную заданными размерами', async() => {
      const createdShape = await shapes.add({
        presetKey: 'square',
        options: {
          ...SHAPE_ROUNDING_MANUAL_SIZE_OPTIONS,
          id: 'shape-rounding-template-manual-size'
        }
      })

      shapes.checkCreation({
        shape: createdShape,
        presetKey: 'square'
      })

      return shapes.getScaleSnapshot({ id: 'shape-rounding-template-manual-size' })
    })

    const serializedTemplate = await test.step('Сохранить фигуру в шаблон', async() => {
      await shapes.select({ id: 'shape-rounding-template-manual-size' })

      return template.serializeSelection()
    })

    await test.step('Очистить canvas и применить шаблон обратно', async() => {
      expect(serializedTemplate).not.toBeNull()
      await canvas.clearCanvas()

      const insertedCount = await template.applyTemplate({
        template: serializedTemplate!
      })

      expect(insertedCount).toBe(1)
      await editorModel.checkObjectCount({ count: 1 })
    })

    const restoredShape = await test.step('Получить восстановленную фигуру из шаблона', () => {
      return shapes.getObject({ objectIndex: 0 })
    })
    const restoredSnapshot = await test.step('Получить геометрию восстановленной фигуры', () => {
      return shapes.getScaleSnapshot({ objectIndex: 0 })
    })

    await test.step('Изменить скругление у восстановленной фигуры', async() => {
      await shapes.setRounding({
        objectIndex: 0,
        rounding: SHAPE_ROUNDING_UPDATED_VALUE
      })
    })

    const updatedShape = await test.step('Получить состояние фигуры после изменения скругления', () => {
      return shapes.getObject({ objectIndex: 0 })
    })
    const updatedSnapshot = await test.step('Получить геометрию после изменения скругления', () => {
      return shapes.getScaleSnapshot({ objectIndex: 0 })
    })

    await test.step('Проверить что после шаблона изменение скругления не схлопнуло фигуру', () => {
      expect(restoredShape?.shapePresetKey).toBe('square')
      expect(restoredShape?.shapeTextAutoExpand).toBe(false)
      expect(restoredShape?.shapeRounding).toBe(SHAPE_ROUNDING_MANUAL_SIZE_OPTIONS.rounding)
      expect(Math.abs(restoredSnapshot.groupBoundsWidth - sourceSnapshot.groupBoundsWidth))
        .toBeLessThanOrEqual(SHAPE_ROUNDING_SIZE_TOLERANCE)
      expect(Math.abs(restoredSnapshot.groupBoundsHeight - sourceSnapshot.groupBoundsHeight))
        .toBeLessThanOrEqual(SHAPE_ROUNDING_SIZE_TOLERANCE)
      expect(updatedShape?.shapePresetKey).toBe('square')
      expect(updatedShape?.shapeRounding).toBe(SHAPE_ROUNDING_UPDATED_VALUE)
      expect(Math.abs(updatedSnapshot.groupBoundsWidth - restoredSnapshot.groupBoundsWidth))
        .toBeLessThanOrEqual(SHAPE_ROUNDING_SIZE_TOLERANCE)
      expect(Math.abs(updatedSnapshot.groupBoundsHeight - restoredSnapshot.groupBoundsHeight))
        .toBeLessThanOrEqual(SHAPE_ROUNDING_SIZE_TOLERANCE)
      shapes.checkNodeInsideGroup({ snapshot: updatedSnapshot, kind: 'shape' })
      shapes.checkNodeInsideGroup({ snapshot: updatedSnapshot, kind: 'text' })
    })
  })

  test('после undo и redo скругление возвращается к тем же значениям', async({
    history,
    shapes
  }) => {
    await test.step('Добавить прямоугольник с исходным скруглением 20', () => {
      return shapes.add({
        presetKey: 'square',
        options: {
          id: 'shape-rounding-history-source',
          rounding: 20
        }
      })
    })

    const updatedShape = await test.step('Обновить скругление до 80', () => {
      return shapes.update({
        id: 'shape-rounding-history-source',
        options: {
          rounding: 80
        }
      })
    })

    const restoredShape = await test.step('Сделать undo и получить восстановленное состояние', async() => {
      await history.undo()
      return shapes.getObject({ id: 'shape-rounding-history-source' })
    })

    const redoneShape = await test.step('Сделать redo и получить повторно применённое состояние', async() => {
      await history.redo()
      return shapes.getObject({ id: 'shape-rounding-history-source' })
    })

    await test.step('Проверить что undo и redo вернули ожидаемые значения скругления', () => {
      expect(updatedShape?.shapeRounding).toBe(80)
      expect(restoredShape?.shapeRounding).toBe(20)
      expect(redoneShape?.shapeRounding).toBe(80)
    })
  })
})
