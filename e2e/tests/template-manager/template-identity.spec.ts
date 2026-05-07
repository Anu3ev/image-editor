import { test, expect } from '../../fixtures/editor.fixture'
import {
  TEMPLATE_IDENTITY_MONTAGE_RESOLUTION,
  TEMPLATE_IDENTITY_SHAPE,
  TEMPLATE_IDENTITY_TEXT
} from '../../fixtures/data/template-identity.data'

test.describe('ID объектов после повторного применения шаблона', () => {
  // eslint-disable-next-line max-len
  test('после сохранения фигуры в шаблон и повторного применения на том же canvas новая фигура и объекты внутри неё получают другие id', async({
    canvas,
    editorModel,
    shapes,
    template
  }) => {
    await test.step('Подготовить монтажную область и добавить исходную фигуру', async() => {
      await canvas.setMontageResolution(TEMPLATE_IDENTITY_MONTAGE_RESOLUTION)

      shapes.checkCreation({
        shape: await shapes.addAtBounds({
          presetKey: 'square',
          options: TEMPLATE_IDENTITY_SHAPE
        }),
        presetKey: 'square'
      })
    })

    const sourceIds = await test.step('Получить id исходной фигуры и объектов внутри неё', async() => {
      return shapes.getObjectTreeIds({ id: TEMPLATE_IDENTITY_SHAPE.id })
    })

    await test.step('Сохранить фигуру в шаблон и применить его на том же canvas', async() => {
      await shapes.select({ id: TEMPLATE_IDENTITY_SHAPE.id })

      const serializedTemplate = await template.serializeSelection()

      expect(serializedTemplate).not.toBeNull()

      const insertedCount = await template.applyTemplate({
        template: serializedTemplate!
      })

      expect(insertedCount).toBe(1)
      await editorModel.checkObjectCount({ count: 2 })
    })

    const appliedShapeId = await test.step('Найти новую фигуру после применения шаблона', async() => {
      const shapeObjects = await shapes.getShapeObjects()
      const appliedShape = shapeObjects.find((shape) => shape.id !== TEMPLATE_IDENTITY_SHAPE.id)

      if (!appliedShape?.id) {
        throw new Error('после применения шаблона должна появиться новая фигура с id')
      }

      return appliedShape.id
    })

    await test.step('Проверить что новая фигура и объекты внутри неё получили другие id', async() => {
      const appliedIds = await shapes.getObjectTreeIds({ id: appliedShapeId })
      const ids = [
        sourceIds.groupId,
        sourceIds.shapeId,
        sourceIds.textId,
        appliedIds.groupId,
        appliedIds.shapeId,
        appliedIds.textId
      ]

      expect(appliedIds.groupId).not.toBe(sourceIds.groupId)
      expect(appliedIds.shapeId).not.toBe(sourceIds.shapeId)
      expect(appliedIds.textId).not.toBe(sourceIds.textId)
      expect(new Set(ids).size).toBe(ids.length)
    })
  })

  test('после сохранения текста в шаблон и повторного применения на том же canvas новый текст получает другой id', async({
    canvas,
    editorModel,
    template,
    text
  }) => {
    await test.step('Подготовить монтажную область и добавить исходный текст', async() => {
      await canvas.setMontageResolution(TEMPLATE_IDENTITY_MONTAGE_RESOLUTION)

      text.checkCreation({
        textObject: await text.add(TEMPLATE_IDENTITY_TEXT)
      })
    })

    await test.step('Сохранить текст в шаблон и применить его на том же canvas', async() => {
      await text.select({ id: TEMPLATE_IDENTITY_TEXT.id })

      const serializedTemplate = await template.serializeSelection()

      expect(serializedTemplate).not.toBeNull()

      const insertedCount = await template.applyTemplate({
        template: serializedTemplate!
      })

      expect(insertedCount).toBe(1)
      await editorModel.checkObjectCount({ count: 2 })
    })

    await test.step('Проверить что применённый текст получил другой id', async() => {
      const objects = await editorModel.getObjects()
      const appliedText = objects.find((object) => {
        return object.type === 'background-textbox' && object.id !== TEMPLATE_IDENTITY_TEXT.id
      })

      expect(appliedText?.id).toEqual(expect.any(String))
      expect(appliedText?.id).not.toBe(TEMPLATE_IDENTITY_TEXT.id)
    })
  })

  test('после сохранения общего выделения из фигуры и текста повторное применение даёт новые id и фигуре, и тексту', async({
    canvas,
    editorModel,
    shapes,
    template,
    text
  }) => {
    await test.step('Подготовить монтажную область и добавить фигуру с текстом и standalone текст', async() => {
      await canvas.setMontageResolution(TEMPLATE_IDENTITY_MONTAGE_RESOLUTION)

      shapes.checkCreation({
        shape: await shapes.addAtBounds({
          presetKey: 'square',
          options: TEMPLATE_IDENTITY_SHAPE
        }),
        presetKey: 'square'
      })

      text.checkCreation({
        textObject: await text.add(TEMPLATE_IDENTITY_TEXT)
      })
    })

    const sourceShapeIds = await test.step('Получить id исходной фигуры и объектов внутри неё', async() => {
      return shapes.getObjectTreeIds({ id: TEMPLATE_IDENTITY_SHAPE.id })
    })

    await test.step('Сохранить общее выделение в шаблон и применить его на том же canvas', async() => {
      await editorModel.selectAllObjects()

      const serializedTemplate = await template.serializeSelection()

      expect(serializedTemplate).not.toBeNull()

      const insertedCount = await template.applyTemplate({
        template: serializedTemplate!
      })

      expect(insertedCount).toBe(2)
      await editorModel.checkObjectCount({ count: 4 })
    })

    const appliedObjects = await test.step('Найти новые объекты после применения смешанного шаблона', async() => {
      const objects = await editorModel.getObjects()
      const appliedShape = objects.find((object) => {
        return object.type === 'shape-group' && object.id !== TEMPLATE_IDENTITY_SHAPE.id
      })
      const appliedText = objects.find((object) => {
        return object.type === 'background-textbox' && object.id !== TEMPLATE_IDENTITY_TEXT.id
      })

      if (!appliedShape?.id || !appliedText?.id) {
        throw new Error('после применения mixed template должны существовать новая фигура и новый текст')
      }

      return {
        appliedShapeId: appliedShape.id,
        appliedTextId: appliedText.id
      }
    })

    await test.step('Проверить что новые id получили и фигура, и текст, и объекты внутри новой фигуры', async() => {
      const appliedShapeIds = await shapes.getObjectTreeIds({ id: appliedObjects.appliedShapeId })
      const ids = [
        sourceShapeIds.groupId,
        sourceShapeIds.shapeId,
        sourceShapeIds.textId,
        TEMPLATE_IDENTITY_TEXT.id,
        appliedShapeIds.groupId,
        appliedShapeIds.shapeId,
        appliedShapeIds.textId,
        appliedObjects.appliedTextId
      ]

      expect(appliedShapeIds.groupId).not.toBe(sourceShapeIds.groupId)
      expect(appliedShapeIds.shapeId).not.toBe(sourceShapeIds.shapeId)
      expect(appliedShapeIds.textId).not.toBe(sourceShapeIds.textId)
      expect(appliedObjects.appliedTextId).not.toBe(TEMPLATE_IDENTITY_TEXT.id)
      expect(new Set(ids).size).toBe(ids.length)
    })
  })
})
