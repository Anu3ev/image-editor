import { test, expect } from '../../fixtures/editor.fixture'
import {
  FIT_OBJECT_EDITED_TEXT,
  FIT_OBJECT_GROWTH_DELTA,
  FIT_OBJECT_INITIAL_TEXT
} from '../../fixtures/data/fit-object.data'
import {
  expectDisplayedFontSizeToMatchFittedText,
  expectShapeToGrowAfterFit,
  expectShapeToStayFitted
} from '../../helpers/fit-object-assertions.helper'

test.describe('fitObject для текста внутри шейпа', () => {
  test('после fitObject текст внутри шейпа сохраняет пересчитанный fontSize и размеры при редактировании', async({
    editorModel,
    shapes
  }) => {
    const shape = await test.step('Добавить шейп с коротким текстом', async() => {
      const createdShape = await shapes.addAtBounds({
        presetKey: 'square',
        options: {
          id: 'shape-fit-single',
          left: 176,
          top: 176,
          width: 160,
          height: 160,
          text: FIT_OBJECT_INITIAL_TEXT
        }
      })

      return shapes.checkCreation({
        shape: createdShape,
        presetKey: 'square'
      })
    })

    const initialText = await shapes.getTextNode({ id: shape.id })
    const initialSnapshot = await shapes.getScaleSnapshot({ id: shape.id })

    await test.step('Выделить шейп и вызвать fitObject как в пользовательском сценарии', async() => {
      await shapes.select({ id: shape.id })
      await editorModel.fitActiveObject({
        fitAsOneObject: true,
        type: 'contain'
      })
    })

    const fittedText = await shapes.getTextNode({ id: shape.id })
    const fittedSnapshot = await shapes.getScaleSnapshot({ id: shape.id })
    const displayedFontSize = await editorModel.getDisplayedTextFontSize()

    await test.step('Открыть text editing и заменить текст на строку той же длины', async() => {
      await shapes.enterTextEditing({ id: shape.id })
      await shapes.updateEditingText({
        id: shape.id,
        text: FIT_OBJECT_EDITED_TEXT
      })
    })

    const editingText = await shapes.getTextNode({ id: shape.id })
    const editingSnapshot = await shapes.getScaleSnapshot({ id: shape.id })

    expect(initialText, 'исходный текст внутри шейпа должен существовать').not.toBeNull()
    expect(fittedText, 'текст внутри шейпа после fitObject должен существовать').not.toBeNull()
    expect(editingText, 'текст внутри шейпа во время редактирования должен существовать').not.toBeNull()

    if (!initialText || !fittedText || !editingText) {
      throw new Error('текст внутри шейпа должен существовать на всех этапах сценария')
    }

    expectShapeToGrowAfterFit({
      initial: initialSnapshot,
      fitted: fittedSnapshot
    })
    expectDisplayedFontSizeToMatchFittedText({
      initialFontSize: initialText.fontSize,
      fittedFontSize: fittedText.fontSize,
      displayedFontSize
    })

    expect(editingText.isEditing).toBe(true)
    expect(editingText.text).toBe(FIT_OBJECT_EDITED_TEXT)
    expect(Math.abs(editingText.fontSize - fittedText.fontSize)).toBeLessThanOrEqual(1)
    expectShapeToStayFitted({
      expected: fittedSnapshot,
      actual: editingSnapshot
    })
  })

  test('после fitObject общего выделения шейпа и текста шейп не теряет fitted-размеры в text editing', async({
    editorModel,
    shapes,
    text
  }) => {
    const shape = await test.step('Добавить шейп для mixed selection', async() => {
      const createdShape = await shapes.addAtBounds({
        presetKey: 'square',
        options: {
          id: 'shape-fit-mixed-shape',
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

    const standaloneText = await test.step('Добавить отдельный текст для mixed selection', async() => {
      const createdText = await text.add({
        id: 'shape-fit-mixed-text',
        left: 312,
        top: 240,
        text: FIT_OBJECT_INITIAL_TEXT
      })

      return text.checkCreation({
        textObject: createdText
      })
    })

    const initialShapeText = await shapes.getTextNode({ id: shape.id })
    const initialShapeSnapshot = await shapes.getScaleSnapshot({ id: shape.id })
    const initialStandaloneTextSnapshot = await text.getResizeSnapshot({ id: standaloneText.id })

    await test.step('Выделить оба объекта и вызвать fitObject для общего выделения', async() => {
      await editorModel.selectAllObjects()
      await editorModel.fitActiveObject({
        fitAsOneObject: true,
        type: 'contain'
      })
    })

    await shapes.select({ id: shape.id })

    const fittedShapeText = await shapes.getTextNode({ id: shape.id })
    const fittedShapeSnapshot = await shapes.getScaleSnapshot({ id: shape.id })
    const displayedShapeFontSize = await editorModel.getDisplayedTextFontSize()

    await text.select({ id: standaloneText.id })

    const fittedStandaloneTextSnapshot = await text.getResizeSnapshot({ id: standaloneText.id })

    await shapes.select({ id: shape.id })

    await test.step('Открыть редактирование текста внутри шейпа и заменить текст на строку той же длины', async() => {
      await shapes.enterTextEditing({ id: shape.id })
      await shapes.updateEditingText({
        id: shape.id,
        text: FIT_OBJECT_EDITED_TEXT
      })
    })

    const editingShapeText = await shapes.getTextNode({ id: shape.id })
    const editingShapeSnapshot = await shapes.getScaleSnapshot({ id: shape.id })

    expect(initialShapeText, 'исходный текст внутри mixed-shape должен существовать').not.toBeNull()
    expect(fittedShapeText, 'текст внутри mixed-shape после fitObject должен существовать').not.toBeNull()
    expect(editingShapeText, 'текст внутри mixed-shape во время редактирования должен существовать').not.toBeNull()

    if (!initialShapeText || !fittedShapeText || !editingShapeText) {
      throw new Error('текст внутри шейпа из mixed selection должен существовать на всех этапах')
    }

    expectShapeToGrowAfterFit({
      initial: initialShapeSnapshot,
      fitted: fittedShapeSnapshot
    })
    expectDisplayedFontSizeToMatchFittedText({
      initialFontSize: initialShapeText.fontSize,
      fittedFontSize: fittedShapeText.fontSize,
      displayedFontSize: displayedShapeFontSize
    })

    expect(fittedStandaloneTextSnapshot.boundsWidth).toBeGreaterThan(initialStandaloneTextSnapshot.boundsWidth + FIT_OBJECT_GROWTH_DELTA)
    expect(fittedStandaloneTextSnapshot.fontSize).toBeGreaterThan(initialStandaloneTextSnapshot.fontSize + 1)

    expect(editingShapeText.isEditing).toBe(true)
    expect(editingShapeText.text).toBe(FIT_OBJECT_EDITED_TEXT)
    expect(Math.abs(editingShapeText.fontSize - fittedShapeText.fontSize)).toBeLessThanOrEqual(1)
    expectShapeToStayFitted({
      expected: fittedShapeSnapshot,
      actual: editingShapeSnapshot
    })
  })

  test('после fitObject общего выделения по умолчанию текст внутри шейпа не теряет fitted-размеры в text editing', async({
    editorModel,
    shapes,
    text
  }) => {
    const shape = await test.step('Добавить шейп для default mixed selection', async() => {
      const createdShape = await shapes.addAtBounds({
        presetKey: 'square',
        options: {
          id: 'shape-fit-default-shape',
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

    const standaloneText = await test.step('Добавить отдельный текст для default mixed selection', async() => {
      const createdText = await text.add({
        id: 'shape-fit-default-text',
        left: 312,
        top: 240,
        text: FIT_OBJECT_INITIAL_TEXT
      })

      return text.checkCreation({
        textObject: createdText
      })
    })

    const initialShapeText = await shapes.getTextNode({ id: shape.id })
    const initialShapeSnapshot = await shapes.getScaleSnapshot({ id: shape.id })
    const initialStandaloneTextSnapshot = await text.getResizeSnapshot({ id: standaloneText.id })

    await test.step('Выделить оба объекта и вызвать fitObject по умолчанию для каждого child отдельно', async() => {
      await editorModel.selectAllObjects()
      await editorModel.fitActiveObject({
        type: 'contain'
      })
    })

    await shapes.select({ id: shape.id })

    const fittedShapeText = await shapes.getTextNode({ id: shape.id })
    const fittedShapeSnapshot = await shapes.getScaleSnapshot({ id: shape.id })
    const displayedShapeFontSize = await editorModel.getDisplayedTextFontSize()

    await text.select({ id: standaloneText.id })

    const fittedStandaloneTextSnapshot = await text.getResizeSnapshot({ id: standaloneText.id })

    await shapes.select({ id: shape.id })

    await test.step('Открыть редактирование текста внутри шейпа и заменить текст на строку той же длины', async() => {
      await shapes.enterTextEditing({ id: shape.id })
      await shapes.updateEditingText({
        id: shape.id,
        text: FIT_OBJECT_EDITED_TEXT
      })
    })

    const editingShapeText = await shapes.getTextNode({ id: shape.id })
    const editingShapeSnapshot = await shapes.getScaleSnapshot({ id: shape.id })

    expect(initialShapeText, 'исходный текст внутри default mixed-shape должен существовать').not.toBeNull()
    expect(fittedShapeText, 'текст внутри default mixed-shape после fitObject должен существовать').not.toBeNull()
    expect(editingShapeText, 'текст внутри default mixed-shape во время редактирования должен существовать').not.toBeNull()

    if (!initialShapeText || !fittedShapeText || !editingShapeText) {
      throw new Error('текст внутри шейпа из default mixed selection должен существовать на всех этапах')
    }

    expectShapeToGrowAfterFit({
      initial: initialShapeSnapshot,
      fitted: fittedShapeSnapshot
    })
    expectDisplayedFontSizeToMatchFittedText({
      initialFontSize: initialShapeText.fontSize,
      fittedFontSize: fittedShapeText.fontSize,
      displayedFontSize: displayedShapeFontSize
    })

    expect(fittedStandaloneTextSnapshot.boundsWidth).toBeGreaterThan(initialStandaloneTextSnapshot.boundsWidth + FIT_OBJECT_GROWTH_DELTA)
    expect(fittedStandaloneTextSnapshot.fontSize).toBeGreaterThan(initialStandaloneTextSnapshot.fontSize + 1)

    expect(editingShapeText.isEditing).toBe(true)
    expect(editingShapeText.text).toBe(FIT_OBJECT_EDITED_TEXT)
    expect(Math.abs(editingShapeText.fontSize - fittedShapeText.fontSize)).toBeLessThanOrEqual(1)
    expectShapeToStayFitted({
      expected: fittedShapeSnapshot,
      actual: editingShapeSnapshot
    })
  })
})
