import { expect, test } from '../../fixtures/editor.fixture'
import {
  SHAPE_MATERIALIZATION_AUXILIARY_ID,
  SHAPE_MATERIALIZATION_FIT_RESOLUTION,
  SHAPE_MATERIALIZATION_FONT_SIZE,
  SHAPE_MATERIALIZATION_HORIZONTAL_PADDING,
  SHAPE_MATERIALIZATION_SIZE_TOLERANCE,
  SHAPE_MATERIALIZATION_SOURCE_ID,
  SHAPE_MATERIALIZATION_TEXT
} from '../../fixtures/data/shape-materialization.data'

test.beforeEach(async({ shapes }) => {
  const createdShape = await shapes.addWithText({
    presetKey: 'square',
    text: SHAPE_MATERIALIZATION_TEXT,
    fontSize: SHAPE_MATERIALIZATION_FONT_SIZE,
    options: {
      id: SHAPE_MATERIALIZATION_SOURCE_ID
    }
  })

  expect(createdShape?.id).toBe(SHAPE_MATERIALIZATION_SOURCE_ID)
  expect(createdShape?.shapeTextAutoExpand).toBe(true)

  await shapes.update({
    id: SHAPE_MATERIALIZATION_SOURCE_ID,
    options: {
      textPadding: {
        right: SHAPE_MATERIALIZATION_HORIZONTAL_PADDING
      }
    }
  })
  await shapes.update({
    id: SHAPE_MATERIALIZATION_SOURCE_ID,
    options: {
      textPadding: {
        left: SHAPE_MATERIALIZATION_HORIZONTAL_PADDING
      }
    }
  })
})

test('после copy/paste копия сохраняет размеры и перенос текста оригинала', async({
  clipboard,
  editorModel,
  shapes
}) => {
  const sourceSnapshot = await shapes.getScaleSnapshot({ id: SHAPE_MATERIALIZATION_SOURCE_ID })
  const sourceText = await shapes.getTextNode({ id: SHAPE_MATERIALIZATION_SOURCE_ID })

  await shapes.select({ id: SHAPE_MATERIALIZATION_SOURCE_ID })
  await clipboard.copy()
  await clipboard.waitForClipboardReady()

  expect(await clipboard.paste()).toBe(true)
  await editorModel.checkObjectCount({ count: 2 })

  const shapeObjects = await shapes.getShapeObjects()
  const pastedShape = shapeObjects.find((shape) => shape.id !== SHAPE_MATERIALIZATION_SOURCE_ID)

  expect(pastedShape?.id).toBeTruthy()
  if (!pastedShape?.id) throw new Error('После paste должна существовать копия фигуры с новым id')

  const pastedSnapshot = await shapes.getScaleSnapshot({ id: pastedShape.id })
  const pastedText = await shapes.getTextNode({ id: pastedShape.id })

  expect(sourceText?.lineCount).toBeGreaterThan(1)
  expect(pastedShape.shapePaddingRight).toBe(SHAPE_MATERIALIZATION_HORIZONTAL_PADDING)
  expect(pastedShape.shapePaddingLeft).toBe(SHAPE_MATERIALIZATION_HORIZONTAL_PADDING)
  expect(pastedText?.lineCount).toBe(sourceText?.lineCount)
  expect(Math.abs(pastedSnapshot.groupBoundsWidth - sourceSnapshot.groupBoundsWidth))
    .toBeLessThanOrEqual(SHAPE_MATERIALIZATION_SIZE_TOLERANCE)
  expect(Math.abs(pastedSnapshot.groupBoundsHeight - sourceSnapshot.groupBoundsHeight))
    .toBeLessThanOrEqual(SHAPE_MATERIALIZATION_SIZE_TOLERANCE)
})

test('после сохранения и применения шаблона сохраняет размеры и перенос текста', async({
  canvas,
  shapes,
  template
}) => {
  const sourceSnapshot = await shapes.getScaleSnapshot({ id: SHAPE_MATERIALIZATION_SOURCE_ID })
  const sourceText = await shapes.getTextNode({ id: SHAPE_MATERIALIZATION_SOURCE_ID })

  await shapes.select({ id: SHAPE_MATERIALIZATION_SOURCE_ID })
  const serializedTemplate = await template.serializeSelection()

  expect(serializedTemplate).not.toBeNull()
  await canvas.clearCanvas()
  expect(await template.applyTemplate({ template: serializedTemplate! })).toBe(1)

  const appliedShape = await shapes.getObject({ objectIndex: 0 })
  const appliedSnapshot = await shapes.getScaleSnapshot({ objectIndex: 0 })
  const appliedText = await shapes.getTextNode({ objectIndex: 0 })

  expect(sourceText?.lineCount).toBeGreaterThan(1)
  expect(appliedShape?.shapePaddingRight).toBe(SHAPE_MATERIALIZATION_HORIZONTAL_PADDING)
  expect(appliedShape?.shapePaddingLeft).toBe(SHAPE_MATERIALIZATION_HORIZONTAL_PADDING)
  expect(appliedText?.lineCount).toBe(sourceText?.lineCount)
  expect(Math.abs(appliedSnapshot.groupBoundsWidth - sourceSnapshot.groupBoundsWidth))
    .toBeLessThanOrEqual(SHAPE_MATERIALIZATION_SIZE_TOLERANCE)
  expect(Math.abs(appliedSnapshot.groupBoundsHeight - sourceSnapshot.groupBoundsHeight))
    .toBeLessThanOrEqual(SHAPE_MATERIALIZATION_SIZE_TOLERANCE)
})

test('после group и ungroup сохраняет размеры и перенос текста', async({
  editorModel,
  grouping,
  shapes
}) => {
  const sourceSnapshot = await shapes.getScaleSnapshot({ id: SHAPE_MATERIALIZATION_SOURCE_ID })
  const sourceText = await shapes.getTextNode({ id: SHAPE_MATERIALIZATION_SOURCE_ID })
  const auxiliaryShape = await shapes.add({
    presetKey: 'square',
    options: {
      id: SHAPE_MATERIALIZATION_AUXILIARY_ID,
      width: 40,
      height: 40
    }
  })

  expect(auxiliaryShape?.id).toBe(SHAPE_MATERIALIZATION_AUXILIARY_ID)
  await editorModel.selectAllObjects()
  await grouping.groupActiveSelection()

  const ungrouped = await grouping.ungroupActiveGroup()

  expect(ungrouped.objectIds).toContain(SHAPE_MATERIALIZATION_SOURCE_ID)

  const ungroupedShape = await shapes.getObject({ id: SHAPE_MATERIALIZATION_SOURCE_ID })
  const ungroupedSnapshot = await shapes.getScaleSnapshot({ id: SHAPE_MATERIALIZATION_SOURCE_ID })
  const ungroupedText = await shapes.getTextNode({ id: SHAPE_MATERIALIZATION_SOURCE_ID })

  expect(sourceText?.lineCount).toBeGreaterThan(1)
  expect(ungroupedShape?.shapePaddingRight).toBe(SHAPE_MATERIALIZATION_HORIZONTAL_PADDING)
  expect(ungroupedShape?.shapePaddingLeft).toBe(SHAPE_MATERIALIZATION_HORIZONTAL_PADDING)
  expect(ungroupedText?.lineCount).toBe(sourceText?.lineCount)
  expect(Math.abs(ungroupedSnapshot.groupBoundsWidth - sourceSnapshot.groupBoundsWidth))
    .toBeLessThanOrEqual(SHAPE_MATERIALIZATION_SIZE_TOLERANCE)
  expect(Math.abs(ungroupedSnapshot.groupBoundsHeight - sourceSnapshot.groupBoundsHeight))
    .toBeLessThanOrEqual(SHAPE_MATERIALIZATION_SIZE_TOLERANCE)
})

test('после вписывания в монтажную область сохраняет рассчитанные размеры фигуры', async({
  canvas,
  editorModel,
  shapes
}) => {
  const sourceSnapshot = await shapes.getScaleSnapshot({ id: SHAPE_MATERIALIZATION_SOURCE_ID })
  const sourceText = await shapes.getTextNode({ id: SHAPE_MATERIALIZATION_SOURCE_ID })

  await canvas.setMontageResolution(SHAPE_MATERIALIZATION_FIT_RESOLUTION)
  const montageBounds = await editorModel.getMontageAreaBounds()
  const expectedScale = Math.min(
    montageBounds.width / sourceSnapshot.groupBoundsWidth,
    montageBounds.height / sourceSnapshot.groupBoundsHeight
  )

  expect(sourceSnapshot.groupBoundsWidth * expectedScale)
    .toBeLessThan(montageBounds.width - SHAPE_MATERIALIZATION_SIZE_TOLERANCE)

  await shapes.select({ id: SHAPE_MATERIALIZATION_SOURCE_ID })
  await editorModel.fitActiveObject({
    type: 'contain'
  })

  const fittedShape = await shapes.getObject({ id: SHAPE_MATERIALIZATION_SOURCE_ID })
  const fittedSnapshot = await shapes.getScaleSnapshot({ id: SHAPE_MATERIALIZATION_SOURCE_ID })
  const fittedText = await shapes.getTextNode({ id: SHAPE_MATERIALIZATION_SOURCE_ID })
  const expectedHorizontalPadding = Math.floor(
    SHAPE_MATERIALIZATION_HORIZONTAL_PADDING * expectedScale
  )

  expect(sourceText?.lineCount).toBeGreaterThan(1)
  expect(fittedShape?.shapePaddingRight).toBe(expectedHorizontalPadding)
  expect(fittedShape?.shapePaddingLeft).toBe(expectedHorizontalPadding)
  expect(fittedText?.lineCount).toBe(sourceText?.lineCount)
  expect(Math.abs(
    fittedSnapshot.groupBoundsWidth - (sourceSnapshot.groupBoundsWidth * expectedScale)
  )).toBeLessThanOrEqual(SHAPE_MATERIALIZATION_SIZE_TOLERANCE)
  expect(Math.abs(
    fittedSnapshot.groupBoundsHeight - (sourceSnapshot.groupBoundsHeight * expectedScale)
  )).toBeLessThanOrEqual(SHAPE_MATERIALIZATION_SIZE_TOLERANCE)
})
