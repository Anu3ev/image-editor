import { test, expect } from '../../fixtures/editor.fixture'
import {
  SHAPE_REPLACE_BASE_OPTIONS,
  SHAPE_REPLACE_EXPANDING_TEXT,
  SHAPE_REPLACE_TOLERANCE
} from '../../fixtures/data/shape-replace.data'

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
