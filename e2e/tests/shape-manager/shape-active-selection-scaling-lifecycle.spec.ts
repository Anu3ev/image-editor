import {
  differentHeightTest,
  test,
  expect
} from '../../fixtures/shape-active-selection-scaling.fixture'
import {
  SHAPE_MULTI_SCALING_EDITED_TEXT,
  SHAPE_MULTI_SCALING_LEFT_OPTIONS,
  SHAPE_MULTI_SCALING_RIGHT_OPTIONS,
  SHAPE_MULTI_SCALING_SCALE_X,
  SHAPE_MULTI_SCALING_SHORT_LEFT_OPTIONS,
  SHAPE_MULTI_SCALING_TALL_RIGHT_OPTIONS,
  SHAPE_MULTI_SCALING_TOLERANCE
} from '../../fixtures/data/shape-multi-scaling.data'

test('после undo и redo несколько шейпов сохраняют тот же размер и те же переносы строк', async({
  history,
  selection,
  shapes
}) => {
  await selection.scaling.scaleHorizontallyFromRight({ scaleX: SHAPE_MULTI_SCALING_SCALE_X })
  await selection.scaling.finish()
  await history.flushPendingSave()

  const [resizedLeftShape, resizedRightShape, resizedLeftText, resizedRightText] = await Promise.all([
    shapes.getScaleSnapshot({ id: SHAPE_MULTI_SCALING_LEFT_OPTIONS.id }),
    shapes.getScaleSnapshot({ id: SHAPE_MULTI_SCALING_RIGHT_OPTIONS.id }),
    shapes.getTextNode({ id: SHAPE_MULTI_SCALING_LEFT_OPTIONS.id }),
    shapes.getTextNode({ id: SHAPE_MULTI_SCALING_RIGHT_OPTIONS.id })
  ])
  await history.undo()
  await history.redo()
  const [restoredLeftShape, restoredRightShape, restoredLeftText, restoredRightText] = await Promise.all([
    shapes.getScaleSnapshot({ id: SHAPE_MULTI_SCALING_LEFT_OPTIONS.id }),
    shapes.getScaleSnapshot({ id: SHAPE_MULTI_SCALING_RIGHT_OPTIONS.id }),
    shapes.getTextNode({ id: SHAPE_MULTI_SCALING_LEFT_OPTIONS.id }),
    shapes.getTextNode({ id: SHAPE_MULTI_SCALING_RIGHT_OPTIONS.id })
  ])

  expect(resizedLeftText, 'текст в левом шейпе после изменения размера должен существовать').not.toBeNull()
  expect(resizedRightText, 'текст в правом шейпе после изменения размера должен существовать').not.toBeNull()
  expect(restoredLeftText, 'текст в левом шейпе после redo должен существовать').not.toBeNull()
  expect(restoredRightText, 'текст в правом шейпе после redo должен существовать').not.toBeNull()
  if (!resizedLeftText || !resizedRightText || !restoredLeftText || !restoredRightText) {
    throw new Error('текст в обоих шейпах должен существовать после изменения размера и после redo')
  }

  const tolerance = SHAPE_MULTI_SCALING_TOLERANCE.mouseupJump
  expect(Math.abs(restoredLeftShape.groupBoundsWidth - resizedLeftShape.groupBoundsWidth))
    .toBeLessThanOrEqual(tolerance)
  expect(Math.abs(restoredRightShape.groupBoundsWidth - resizedRightShape.groupBoundsWidth))
    .toBeLessThanOrEqual(tolerance)
  expect(restoredLeftText).toMatchObject({ lineCount: resizedLeftText.lineCount, fontSize: resizedLeftText.fontSize })
  expect(restoredRightText).toMatchObject({ lineCount: resizedRightText.lineCount, fontSize: resizedRightText.fontSize })
  for (const snapshot of [restoredLeftShape, restoredRightShape]) {
    shapes.checkNodeInsideGroup({ snapshot, kind: 'text' })
  }
})

test('после массового сужения можно редактировать текст внутри одного шейпа без возврата старой ширины', async({
  selection,
  shapes
}) => {
  await selection.scaling.scaleHorizontallyFromRight({ scaleX: SHAPE_MULTI_SCALING_SCALE_X })
  await selection.scaling.finish()
  const [resizedLeftShape, resizedLeftText, resizedRightShape] = await Promise.all([
    shapes.getScaleSnapshot({ id: SHAPE_MULTI_SCALING_LEFT_OPTIONS.id }),
    shapes.getTextNode({ id: SHAPE_MULTI_SCALING_LEFT_OPTIONS.id }),
    shapes.getScaleSnapshot({ id: SHAPE_MULTI_SCALING_RIGHT_OPTIONS.id })
  ])

  await shapes.enterTextEditing({ id: SHAPE_MULTI_SCALING_LEFT_OPTIONS.id })
  await shapes.updateEditingText({
    id: SHAPE_MULTI_SCALING_LEFT_OPTIONS.id,
    text: SHAPE_MULTI_SCALING_EDITED_TEXT
  })
  await shapes.exitTextEditing({ id: SHAPE_MULTI_SCALING_LEFT_OPTIONS.id })
  const [finalLeftShape, finalRightShape, finalLeftText] = await Promise.all([
    shapes.getScaleSnapshot({ id: SHAPE_MULTI_SCALING_LEFT_OPTIONS.id }),
    shapes.getScaleSnapshot({ id: SHAPE_MULTI_SCALING_RIGHT_OPTIONS.id }),
    shapes.getTextNode({ id: SHAPE_MULTI_SCALING_LEFT_OPTIONS.id })
  ])

  expect(resizedLeftText, 'текст в левом шейпе после изменения размера должен существовать').not.toBeNull()
  expect(finalLeftText, 'итоговый текст в левом шейпе должен существовать').not.toBeNull()
  if (!resizedLeftText || !finalLeftText) {
    throw new Error('текст в левом шейпе должен существовать до и после редактирования')
  }

  expect(finalLeftText.text).toBe(SHAPE_MULTI_SCALING_EDITED_TEXT)
  expect(finalLeftText.fontSize).toBe(resizedLeftText.fontSize)
  expect(finalLeftText.lineCount).toBeGreaterThan(resizedLeftText.lineCount)
  expect(Math.abs(finalLeftShape.groupBoundsWidth - resizedLeftShape.groupBoundsWidth))
    .toBeLessThanOrEqual(SHAPE_MULTI_SCALING_TOLERANCE.mouseupJump)
  expect(Math.abs(finalRightShape.groupBoundsWidth - resizedRightShape.groupBoundsWidth))
    .toBeLessThanOrEqual(SHAPE_MULTI_SCALING_TOLERANCE.mouseupJump)
  for (const snapshot of [finalLeftShape, finalRightShape]) {
    shapes.checkNodeInsideGroup({ snapshot, kind: 'text' })
  }
})

differentHeightTest('после undo и redo шейпы разной высоты сохраняют тот же размер и те же переносы строк', async({
  history,
  selection,
  shapes
}) => {
  const leftId = SHAPE_MULTI_SCALING_SHORT_LEFT_OPTIONS.id
  const rightId = SHAPE_MULTI_SCALING_TALL_RIGHT_OPTIONS.id
  await selection.scaling.scaleHorizontallyFromRight({ scaleX: SHAPE_MULTI_SCALING_SCALE_X })
  await selection.scaling.finish()
  await history.flushPendingSave()

  const [resizedLeftShape, resizedRightShape, resizedLeftText, resizedRightText] = await Promise.all([
    shapes.getScaleSnapshot({ id: leftId }),
    shapes.getScaleSnapshot({ id: rightId }),
    shapes.getTextNode({ id: leftId }),
    shapes.getTextNode({ id: rightId })
  ])
  await history.undo()
  await history.redo()
  const [restoredLeftShape, restoredRightShape, restoredLeftText, restoredRightText] = await Promise.all([
    shapes.getScaleSnapshot({ id: leftId }),
    shapes.getScaleSnapshot({ id: rightId }),
    shapes.getTextNode({ id: leftId }),
    shapes.getTextNode({ id: rightId })
  ])

  expect(resizedLeftText, 'текст в меньшем шейпе после изменения размера должен существовать').not.toBeNull()
  expect(resizedRightText, 'текст в высоком шейпе после изменения размера должен существовать').not.toBeNull()
  expect(restoredLeftText, 'текст в меньшем шейпе после redo должен существовать').not.toBeNull()
  expect(restoredRightText, 'текст в высоком шейпе после redo должен существовать').not.toBeNull()
  if (!resizedLeftText || !resizedRightText || !restoredLeftText || !restoredRightText) {
    throw new Error('текст в обоих шейпах должен существовать после изменения размера и после redo')
  }

  const tolerance = SHAPE_MULTI_SCALING_TOLERANCE.mouseupJump
  expect(Math.abs(restoredLeftShape.groupBoundsWidth - resizedLeftShape.groupBoundsWidth))
    .toBeLessThanOrEqual(tolerance)
  expect(Math.abs(restoredRightShape.groupBoundsWidth - resizedRightShape.groupBoundsWidth))
    .toBeLessThanOrEqual(tolerance)
  expect(restoredLeftText).toMatchObject({ lineCount: resizedLeftText.lineCount, fontSize: resizedLeftText.fontSize })
  expect(restoredRightText).toMatchObject({ lineCount: resizedRightText.lineCount, fontSize: resizedRightText.fontSize })
  for (const snapshot of [restoredLeftShape, restoredRightShape]) {
    shapes.checkNodeInsideGroup({ snapshot, kind: 'text' })
  }
})

differentHeightTest('после массового сужения шейпов разной высоты можно редактировать текст без возврата старой ширины', async({
  selection,
  shapes
}) => {
  const leftId = SHAPE_MULTI_SCALING_SHORT_LEFT_OPTIONS.id
  const rightId = SHAPE_MULTI_SCALING_TALL_RIGHT_OPTIONS.id
  await selection.scaling.scaleHorizontallyFromRight({ scaleX: SHAPE_MULTI_SCALING_SCALE_X })
  await selection.scaling.finish()
  const [resizedLeftShape, resizedLeftText, resizedRightShape] = await Promise.all([
    shapes.getScaleSnapshot({ id: leftId }),
    shapes.getTextNode({ id: leftId }),
    shapes.getScaleSnapshot({ id: rightId })
  ])

  await shapes.enterTextEditing({ id: leftId })
  await shapes.updateEditingText({ id: leftId, text: SHAPE_MULTI_SCALING_EDITED_TEXT })
  await shapes.exitTextEditing({ id: leftId })
  const [finalLeftShape, finalRightShape, finalLeftText] = await Promise.all([
    shapes.getScaleSnapshot({ id: leftId }),
    shapes.getScaleSnapshot({ id: rightId }),
    shapes.getTextNode({ id: leftId })
  ])

  expect(resizedLeftText, 'текст в меньшем шейпе после изменения размера должен существовать').not.toBeNull()
  expect(finalLeftText, 'итоговый текст в меньшем шейпе должен существовать').not.toBeNull()
  if (!resizedLeftText || !finalLeftText) {
    throw new Error('текст в меньшем шейпе должен существовать до и после редактирования')
  }

  expect(finalLeftText.text).toBe(SHAPE_MULTI_SCALING_EDITED_TEXT)
  expect(finalLeftText.fontSize).toBe(resizedLeftText.fontSize)
  expect(finalLeftText.lineCount).toBeGreaterThan(resizedLeftText.lineCount)
  expect(Math.abs(finalLeftShape.groupBoundsWidth - resizedLeftShape.groupBoundsWidth))
    .toBeLessThanOrEqual(SHAPE_MULTI_SCALING_TOLERANCE.mouseupJump)
  expect(Math.abs(finalRightShape.groupBoundsWidth - resizedRightShape.groupBoundsWidth))
    .toBeLessThanOrEqual(SHAPE_MULTI_SCALING_TOLERANCE.mouseupJump)
  for (const snapshot of [finalLeftShape, finalRightShape]) {
    shapes.checkNodeInsideGroup({ snapshot, kind: 'text' })
  }
})
