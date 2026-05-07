import { test, expect } from '../../fixtures/editor.fixture'
import {
  FIT_OBJECT_EDITED_TEXT,
  FIT_OBJECT_GROWTH_DELTA,
  FIT_OBJECT_INITIAL_TEXT
} from '../../fixtures/data/fit-object.data'
import {
  expectDisplayedFontSizeToMatchFittedText,
  expectTextToGrowAfterFit,
  expectTextToStayFitted
} from '../../helpers/fit-object-assertions.helper'

test.describe('fitObject для standalone текста', () => {
  test('после fitObject standalone текст сохраняет пересчитанный fontSize и размеры при редактировании', async({
    editorModel,
    text
  }) => {
    const textObject = await test.step('Добавить отдельный текстовый объект', async() => {
      const createdText = await text.add({
        id: 'text-fit-single',
        left: 240,
        top: 240,
        text: FIT_OBJECT_INITIAL_TEXT
      })

      return text.checkCreation({
        textObject: createdText
      })
    })

    const initialSnapshot = await text.getResizeSnapshot({ id: textObject.id })

    await test.step('Выделить текст и вызвать fitObject как в пользовательском сценарии', async() => {
      await text.select({ id: textObject.id })
      await editorModel.fitActiveObject({
        fitAsOneObject: true,
        type: 'contain'
      })
    })

    const fittedSnapshot = await text.getResizeSnapshot({ id: textObject.id })
    const displayedFontSize = await editorModel.getDisplayedTextFontSize()

    await test.step('Открыть text editing и заменить текст на строку той же длины', async() => {
      await text.enterTextEditing({ id: textObject.id })
      await text.updateEditingText({
        id: textObject.id,
        text: FIT_OBJECT_EDITED_TEXT
      })
    })

    const editingSnapshot = await text.getResizeSnapshot({ id: textObject.id })

    expectTextToGrowAfterFit({
      initial: initialSnapshot,
      fitted: fittedSnapshot
    })
    expectDisplayedFontSizeToMatchFittedText({
      initialFontSize: initialSnapshot.fontSize,
      fittedFontSize: fittedSnapshot.fontSize,
      displayedFontSize
    })

    expect(editingSnapshot.isEditing).toBe(true)
    expect(editingSnapshot.text).toBe(FIT_OBJECT_EDITED_TEXT)
    expect(Math.abs(editingSnapshot.fontSize - fittedSnapshot.fontSize)).toBeLessThanOrEqual(1)
    expectTextToStayFitted({
      initial: initialSnapshot,
      expected: fittedSnapshot,
      actual: editingSnapshot
    })
  })

  test('после fitObject общего выделения шейпа и текста standalone текст не теряет fitted-размеры в text editing', async({
    editorModel,
    shapes,
    text
  }) => {
    const shape = await test.step('Добавить шейп для mixed selection', async() => {
      const createdShape = await shapes.addAtBounds({
        presetKey: 'square',
        options: {
          id: 'text-fit-mixed-shape',
          left: 96,
          top: 176,
          width: 128,
          height: 128,
          text: FIT_OBJECT_INITIAL_TEXT
        }
      })

      return shapes.checkCreation({
        shape: createdShape,
        presetKey: 'square'
      })
    })

    const textObject = await test.step('Добавить отдельный текст для mixed selection', async() => {
      const createdText = await text.add({
        id: 'text-fit-mixed-text',
        left: 312,
        top: 240,
        text: FIT_OBJECT_INITIAL_TEXT
      })

      return text.checkCreation({
        textObject: createdText
      })
    })

    const initialShapeSnapshot = await shapes.getScaleSnapshot({ id: shape.id })
    const initialTextSnapshot = await text.getResizeSnapshot({ id: textObject.id })

    await test.step('Выделить оба объекта и вызвать fitObject для общего выделения', async() => {
      await editorModel.selectAllObjects()
      await editorModel.fitActiveObject({
        fitAsOneObject: true,
        type: 'contain'
      })
    })

    await text.select({ id: textObject.id })

    const fittedTextSnapshot = await text.getResizeSnapshot({ id: textObject.id })
    const displayedFontSize = await editorModel.getDisplayedTextFontSize()

    await shapes.select({ id: shape.id })

    const fittedShapeSnapshot = await shapes.getScaleSnapshot({ id: shape.id })

    await text.select({ id: textObject.id })

    await test.step('Открыть text editing у standalone текста и заменить текст на строку той же длины', async() => {
      await text.enterTextEditing({ id: textObject.id })
      await text.updateEditingText({
        id: textObject.id,
        text: FIT_OBJECT_EDITED_TEXT
      })
    })

    const editingTextSnapshot = await text.getResizeSnapshot({ id: textObject.id })

    expect(fittedShapeSnapshot.groupBoundsWidth).toBeGreaterThan(initialShapeSnapshot.groupBoundsWidth + FIT_OBJECT_GROWTH_DELTA)
    expect(fittedShapeSnapshot.groupBoundsHeight).toBeGreaterThan(initialShapeSnapshot.groupBoundsHeight + FIT_OBJECT_GROWTH_DELTA)

    expectTextToGrowAfterFit({
      initial: initialTextSnapshot,
      fitted: fittedTextSnapshot
    })
    expectDisplayedFontSizeToMatchFittedText({
      initialFontSize: initialTextSnapshot.fontSize,
      fittedFontSize: fittedTextSnapshot.fontSize,
      displayedFontSize
    })

    expect(editingTextSnapshot.isEditing).toBe(true)
    expect(editingTextSnapshot.text).toBe(FIT_OBJECT_EDITED_TEXT)
    expect(Math.abs(editingTextSnapshot.fontSize - fittedTextSnapshot.fontSize)).toBeLessThanOrEqual(1)
    expectTextToStayFitted({
      initial: initialTextSnapshot,
      expected: fittedTextSnapshot,
      actual: editingTextSnapshot
    })
  })

  test('после fitObject общего выделения по умолчанию standalone текст не теряет fitted-размеры в text editing', async({
    editorModel,
    shapes,
    text
  }) => {
    const shape = await test.step('Добавить шейп для default mixed selection', async() => {
      const createdShape = await shapes.addAtBounds({
        presetKey: 'square',
        options: {
          id: 'text-fit-default-shape',
          left: 96,
          top: 176,
          width: 128,
          height: 128,
          text: FIT_OBJECT_INITIAL_TEXT
        }
      })

      return shapes.checkCreation({
        shape: createdShape,
        presetKey: 'square'
      })
    })

    const textObject = await test.step('Добавить отдельный текст для default mixed selection', async() => {
      const createdText = await text.add({
        id: 'text-fit-default-text',
        left: 312,
        top: 240,
        text: FIT_OBJECT_INITIAL_TEXT
      })

      return text.checkCreation({
        textObject: createdText
      })
    })

    const initialShapeSnapshot = await shapes.getScaleSnapshot({ id: shape.id })
    const initialTextSnapshot = await text.getResizeSnapshot({ id: textObject.id })

    await test.step('Выделить оба объекта и вызвать fitObject по умолчанию для каждого child отдельно', async() => {
      await editorModel.selectAllObjects()
      await editorModel.fitActiveObject({
        type: 'contain'
      })
    })

    await text.select({ id: textObject.id })

    const fittedTextSnapshot = await text.getResizeSnapshot({ id: textObject.id })
    const displayedFontSize = await editorModel.getDisplayedTextFontSize()

    await shapes.select({ id: shape.id })

    const fittedShapeSnapshot = await shapes.getScaleSnapshot({ id: shape.id })

    await text.select({ id: textObject.id })

    await test.step('Открыть text editing у standalone текста и заменить текст на строку той же длины', async() => {
      await text.enterTextEditing({ id: textObject.id })
      await text.updateEditingText({
        id: textObject.id,
        text: FIT_OBJECT_EDITED_TEXT
      })
    })

    const editingTextSnapshot = await text.getResizeSnapshot({ id: textObject.id })

    expect(fittedShapeSnapshot.groupBoundsWidth).toBeGreaterThan(initialShapeSnapshot.groupBoundsWidth + FIT_OBJECT_GROWTH_DELTA)
    expect(fittedShapeSnapshot.groupBoundsHeight).toBeGreaterThan(initialShapeSnapshot.groupBoundsHeight + FIT_OBJECT_GROWTH_DELTA)

    expectTextToGrowAfterFit({
      initial: initialTextSnapshot,
      fitted: fittedTextSnapshot
    })
    expectDisplayedFontSizeToMatchFittedText({
      initialFontSize: initialTextSnapshot.fontSize,
      fittedFontSize: fittedTextSnapshot.fontSize,
      displayedFontSize
    })

    expect(editingTextSnapshot.isEditing).toBe(true)
    expect(editingTextSnapshot.text).toBe(FIT_OBJECT_EDITED_TEXT)
    expect(Math.abs(editingTextSnapshot.fontSize - fittedTextSnapshot.fontSize)).toBeLessThanOrEqual(1)
    expectTextToStayFitted({
      initial: initialTextSnapshot,
      expected: fittedTextSnapshot,
      actual: editingTextSnapshot
    })
  })
})
