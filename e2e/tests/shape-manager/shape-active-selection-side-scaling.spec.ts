import {
  differentHeightTest,
  test,
  expect
} from '../../fixtures/shape-active-selection-scaling.fixture'
import {
  SHAPE_MULTI_SCALING_EXPAND_SCALE_X,
  SHAPE_MULTI_SCALING_EXPAND_SCALE_Y,
  SHAPE_MULTI_SCALING_LEFT_OPTIONS,
  SHAPE_MULTI_SCALING_RIGHT_OPTIONS,
  SHAPE_MULTI_SCALING_SCALE_X,
  SHAPE_MULTI_SCALING_SCALE_Y,
  SHAPE_MULTI_SCALING_SHORT_LEFT_OPTIONS,
  SHAPE_MULTI_SCALING_TALL_RIGHT_OPTIONS,
  SHAPE_MULTI_SCALING_TOLERANCE
} from '../../fixtures/data/shape-multi-scaling.data'

/** Направление вертикального уменьшения общего выделения. */
const EQUAL_HEIGHT_VERTICAL_CASES = [
  {
    direction: 'bottom',
    title: 'при уменьшении нескольких шейпов снизу их высота меняется без деформации текста и без рывка после mouseup'
  },
  {
    direction: 'top',
    title: 'при уменьшении нескольких шейпов сверху их высота меняется без деформации текста и без рывка после mouseup'
  }
] as const

test('при сужении нескольких шейпов справа текст в них переносится уже во время движения ручки', async({
  selection,
  shapes
}) => {
  const initialSelection = await selection.scaling.getSnapshot()
  const [initialLeftText, initialRightText] = await Promise.all([
    shapes.getTextNode({ id: SHAPE_MULTI_SCALING_LEFT_OPTIONS.id }),
    shapes.getTextNode({ id: SHAPE_MULTI_SCALING_RIGHT_OPTIONS.id })
  ])
  const liveSelection = await selection.scaling.scaleHorizontallyFromRight({
    scaleX: SHAPE_MULTI_SCALING_SCALE_X
  })
  const [liveLeftText, liveRightText, liveLeftShape, liveRightShape] = await Promise.all([
    shapes.getTextNode({ id: SHAPE_MULTI_SCALING_LEFT_OPTIONS.id }),
    shapes.getTextNode({ id: SHAPE_MULTI_SCALING_RIGHT_OPTIONS.id }),
    shapes.getScaleSnapshot({ id: SHAPE_MULTI_SCALING_LEFT_OPTIONS.id }),
    shapes.getScaleSnapshot({ id: SHAPE_MULTI_SCALING_RIGHT_OPTIONS.id })
  ])

  expect(initialLeftText, 'текст в левом шейпе должен существовать').not.toBeNull()
  expect(initialRightText, 'текст в правом шейпе должен существовать').not.toBeNull()
  expect(liveLeftText, 'текст в левом шейпе во время движения ручки должен существовать').not.toBeNull()
  expect(liveRightText, 'текст в правом шейпе во время движения ручки должен существовать').not.toBeNull()
  if (!initialLeftText || !initialRightText || !liveLeftText || !liveRightText) {
    throw new Error('текст в обоих шейпах должен существовать до и во время движения ручки')
  }

  expect(liveSelection.boundsWidth)
    .toBeLessThan(initialSelection.boundsWidth - SHAPE_MULTI_SCALING_TOLERANCE.mouseupJump)
  expect(initialLeftText.lineCount).toBe(1)
  expect(initialRightText.lineCount).toBe(1)
  expect(liveLeftText.lineCount).toBeGreaterThan(initialLeftText.lineCount)
  expect(liveRightText.lineCount).toBeGreaterThan(initialRightText.lineCount)
  expect(liveLeftText.fontSize).toBe(initialLeftText.fontSize)
  expect(liveRightText.fontSize).toBe(initialRightText.fontSize)

  for (const snapshot of [liveLeftShape, liveRightShape]) {
    shapes.checkNodeInsideGroup({ snapshot, kind: 'text' })
  }
})

test('после сужения нескольких шейпов справа их размер не дёргается после отпускания мыши', async({
  selection,
  shapes
}) => {
  const liveSelection = await selection.scaling.scaleHorizontallyFromRight({
    scaleX: SHAPE_MULTI_SCALING_SCALE_X
  })
  const [liveLeftShape, liveRightShape, liveLeftText, liveRightText] = await Promise.all([
    shapes.getScaleSnapshot({ id: SHAPE_MULTI_SCALING_LEFT_OPTIONS.id }),
    shapes.getScaleSnapshot({ id: SHAPE_MULTI_SCALING_RIGHT_OPTIONS.id }),
    shapes.getTextNode({ id: SHAPE_MULTI_SCALING_LEFT_OPTIONS.id }),
    shapes.getTextNode({ id: SHAPE_MULTI_SCALING_RIGHT_OPTIONS.id })
  ])
  const finalSelection = await selection.scaling.finish()
  const [finalLeftShape, finalRightShape, finalLeftText, finalRightText] = await Promise.all([
    shapes.getScaleSnapshot({ id: SHAPE_MULTI_SCALING_LEFT_OPTIONS.id }),
    shapes.getScaleSnapshot({ id: SHAPE_MULTI_SCALING_RIGHT_OPTIONS.id }),
    shapes.getTextNode({ id: SHAPE_MULTI_SCALING_LEFT_OPTIONS.id }),
    shapes.getTextNode({ id: SHAPE_MULTI_SCALING_RIGHT_OPTIONS.id })
  ])

  expect(liveLeftText, 'текст в левом шейпе во время движения ручки должен существовать').not.toBeNull()
  expect(liveRightText, 'текст в правом шейпе во время движения ручки должен существовать').not.toBeNull()
  expect(finalLeftText, 'итоговый текст в левом шейпе должен существовать').not.toBeNull()
  expect(finalRightText, 'итоговый текст в правом шейпе должен существовать').not.toBeNull()
  if (!liveLeftText || !liveRightText || !finalLeftText || !finalRightText) {
    throw new Error('текст в обоих шейпах должен существовать до и после mouseup')
  }

  expect(Math.abs(finalSelection.boundsWidth - liveSelection.boundsWidth))
    .toBeLessThanOrEqual(SHAPE_MULTI_SCALING_TOLERANCE.mouseupJump)
  expect(Math.abs(finalLeftShape.groupBoundsWidth - liveLeftShape.groupBoundsWidth))
    .toBeLessThanOrEqual(SHAPE_MULTI_SCALING_TOLERANCE.mouseupJump)
  expect(Math.abs(finalRightShape.groupBoundsWidth - liveRightShape.groupBoundsWidth))
    .toBeLessThanOrEqual(SHAPE_MULTI_SCALING_TOLERANCE.mouseupJump)
  expect(finalLeftText.lineCount).toBe(liveLeftText.lineCount)
  expect(finalRightText.lineCount).toBe(liveRightText.lineCount)
  expect(finalLeftText.fontSize).toBe(liveLeftText.fontSize)
  expect(finalRightText.fontSize).toBe(liveRightText.fontSize)

  for (const snapshot of [finalLeftShape, finalRightShape]) {
    shapes.checkNodeInsideGroup({ snapshot, kind: 'text' })
  }
})

// eslint-disable-next-line max-len
test('после сужения и обратного расширения нескольких шейпов высота не дёргается после mouseup', async({ editorModel, selection, shapes }) => {
  await selection.scaling.scaleHorizontallyFromRight({ scaleX: SHAPE_MULTI_SCALING_SCALE_X })
  await selection.scaling.finish()
  await editorModel.selectAllObjects()
  const narrowedSelection = await selection.scaling.getSnapshot()
  const [narrowedLeftText, narrowedRightText] = await Promise.all([
    shapes.getTextNode({ id: SHAPE_MULTI_SCALING_LEFT_OPTIONS.id }),
    shapes.getTextNode({ id: SHAPE_MULTI_SCALING_RIGHT_OPTIONS.id })
  ])
  const liveSelection = await selection.scaling.scaleHorizontallyFromRight({
    scaleX: SHAPE_MULTI_SCALING_EXPAND_SCALE_X
  })
  const [liveLeftShape, liveRightShape, liveLeftText, liveRightText] = await Promise.all([
    shapes.getScaleSnapshot({ id: SHAPE_MULTI_SCALING_LEFT_OPTIONS.id }),
    shapes.getScaleSnapshot({ id: SHAPE_MULTI_SCALING_RIGHT_OPTIONS.id }),
    shapes.getTextNode({ id: SHAPE_MULTI_SCALING_LEFT_OPTIONS.id }),
    shapes.getTextNode({ id: SHAPE_MULTI_SCALING_RIGHT_OPTIONS.id })
  ])

  expect(narrowedLeftText, 'текст в левом шейпе после сужения должен существовать').not.toBeNull()
  expect(narrowedRightText, 'текст в правом шейпе после сужения должен существовать').not.toBeNull()
  expect(liveLeftText, 'текст в левом шейпе во время обратного расширения должен существовать').not.toBeNull()
  expect(liveRightText, 'текст в правом шейпе во время обратного расширения должен существовать').not.toBeNull()
  if (!narrowedLeftText || !narrowedRightText || !liveLeftText || !liveRightText) {
    throw new Error('текст в обоих шейпах должен существовать после сужения и во время обратного расширения')
  }

  expect(liveSelection.boundsWidth).toBeGreaterThan(
    narrowedSelection.boundsWidth + SHAPE_MULTI_SCALING_TOLERANCE.mouseupJump
  )
  expect(narrowedLeftText.lineCount).toBeGreaterThan(1)
  expect(narrowedRightText.lineCount).toBeGreaterThan(1)
  expect(liveLeftText).toMatchObject({ lineCount: 1, fontSize: narrowedLeftText.fontSize })
  expect(liveRightText).toMatchObject({ lineCount: 1, fontSize: narrowedRightText.fontSize })
  for (const snapshot of [liveLeftShape, liveRightShape]) {
    shapes.checkNodeInsideGroup({ snapshot, kind: 'text' })
  }
  const finalSelection = await selection.scaling.finish()
  const [finalLeftShape, finalRightShape, finalLeftText, finalRightText] = await Promise.all([
    shapes.getScaleSnapshot({ id: SHAPE_MULTI_SCALING_LEFT_OPTIONS.id }),
    shapes.getScaleSnapshot({ id: SHAPE_MULTI_SCALING_RIGHT_OPTIONS.id }),
    shapes.getTextNode({ id: SHAPE_MULTI_SCALING_LEFT_OPTIONS.id }),
    shapes.getTextNode({ id: SHAPE_MULTI_SCALING_RIGHT_OPTIONS.id })
  ])
  expect(finalLeftText, 'итоговый текст в левом шейпе должен существовать').not.toBeNull()
  expect(finalRightText, 'итоговый текст в правом шейпе должен существовать').not.toBeNull()
  if (!finalLeftText || !finalRightText) throw new Error('итоговый текст в обоих шейпах должен существовать')

  const tolerance = SHAPE_MULTI_SCALING_TOLERANCE.mouseupJump
  expect(Math.abs(finalSelection.boundsWidth - liveSelection.boundsWidth)).toBeLessThanOrEqual(tolerance)
  expect(Math.abs(finalLeftShape.groupBoundsWidth - liveLeftShape.groupBoundsWidth)).toBeLessThanOrEqual(tolerance)
  expect(Math.abs(finalRightShape.groupBoundsWidth - liveRightShape.groupBoundsWidth)).toBeLessThanOrEqual(tolerance)
  expect(Math.abs(finalLeftShape.groupBoundsHeight - liveLeftShape.groupBoundsHeight)).toBeLessThanOrEqual(tolerance)
  expect(Math.abs(finalRightShape.groupBoundsHeight - liveRightShape.groupBoundsHeight)).toBeLessThanOrEqual(tolerance)
  expect(finalLeftText).toMatchObject({ lineCount: liveLeftText.lineCount, fontSize: liveLeftText.fontSize })
  expect(finalRightText).toMatchObject({ lineCount: liveRightText.lineCount, fontSize: liveRightText.fontSize })
  for (const snapshot of [finalLeftShape, finalRightShape]) {
    shapes.checkNodeInsideGroup({ snapshot, kind: 'text' })
  }
})

for (const verticalCase of EQUAL_HEIGHT_VERTICAL_CASES) {
  test(verticalCase.title, async({ selection, shapes }) => {
    const initialSelection = await selection.scaling.getSnapshot()
    const [initialLeftText, initialRightText] = await Promise.all([
      shapes.getTextNode({ id: SHAPE_MULTI_SCALING_LEFT_OPTIONS.id }),
      shapes.getTextNode({ id: SHAPE_MULTI_SCALING_RIGHT_OPTIONS.id })
    ])
    const liveSelection = verticalCase.direction === 'bottom'
      ? await selection.scaling.scaleVerticallyFromBottom({ scaleY: SHAPE_MULTI_SCALING_SCALE_Y })
      : await selection.scaling.scaleVerticallyFromTop({ scaleY: SHAPE_MULTI_SCALING_SCALE_Y })
    const [liveLeftShape, liveRightShape, liveLeftText, liveRightText] = await Promise.all([
      shapes.getScaleSnapshot({ id: SHAPE_MULTI_SCALING_LEFT_OPTIONS.id }),
      shapes.getScaleSnapshot({ id: SHAPE_MULTI_SCALING_RIGHT_OPTIONS.id }),
      shapes.getTextNode({ id: SHAPE_MULTI_SCALING_LEFT_OPTIONS.id }),
      shapes.getTextNode({ id: SHAPE_MULTI_SCALING_RIGHT_OPTIONS.id })
    ])
    const finalSelection = await selection.scaling.finish()
    const [finalLeftShape, finalRightShape, finalLeftText, finalRightText] = await Promise.all([
      shapes.getScaleSnapshot({ id: SHAPE_MULTI_SCALING_LEFT_OPTIONS.id }),
      shapes.getScaleSnapshot({ id: SHAPE_MULTI_SCALING_RIGHT_OPTIONS.id }),
      shapes.getTextNode({ id: SHAPE_MULTI_SCALING_LEFT_OPTIONS.id }),
      shapes.getTextNode({ id: SHAPE_MULTI_SCALING_RIGHT_OPTIONS.id })
    ])

    expect(initialLeftText, 'текст в левом шейпе должен существовать').not.toBeNull()
    expect(initialRightText, 'текст в правом шейпе должен существовать').not.toBeNull()
    expect(liveLeftText, 'текст в левом шейпе во время движения ручки должен существовать').not.toBeNull()
    expect(liveRightText, 'текст в правом шейпе во время движения ручки должен существовать').not.toBeNull()
    expect(finalLeftText, 'итоговый текст в левом шейпе должен существовать').not.toBeNull()
    expect(finalRightText, 'итоговый текст в правом шейпе должен существовать').not.toBeNull()
    if (!initialLeftText || !initialRightText || !liveLeftText || !liveRightText || !finalLeftText || !finalRightText) {
      throw new Error('текст в обоих шейпах должен существовать до, во время движения ручки и после mouseup')
    }

    const tolerance = SHAPE_MULTI_SCALING_TOLERANCE.mouseupJump
    expect(liveSelection.boundsHeight).toBeLessThan(initialSelection.boundsHeight - tolerance)
    expect(Math.abs(liveSelection.boundsWidth - initialSelection.boundsWidth)).toBeLessThanOrEqual(tolerance)
    expect(liveLeftText.fontSize).toBe(initialLeftText.fontSize)
    expect(liveRightText.fontSize).toBe(initialRightText.fontSize)
    expect(liveLeftText.lineCount).toBe(initialLeftText.lineCount)
    expect(liveRightText.lineCount).toBe(initialRightText.lineCount)
    expect(Math.abs(finalSelection.boundsHeight - liveSelection.boundsHeight)).toBeLessThanOrEqual(tolerance)
    expect(Math.abs(finalLeftShape.groupBoundsHeight - liveLeftShape.groupBoundsHeight)).toBeLessThanOrEqual(tolerance)
    expect(Math.abs(finalRightShape.groupBoundsHeight - liveRightShape.groupBoundsHeight)).toBeLessThanOrEqual(tolerance)
    expect(finalLeftText.fontSize).toBe(liveLeftText.fontSize)
    expect(finalRightText.fontSize).toBe(liveRightText.fontSize)
    expect(finalLeftText.lineCount).toBe(liveLeftText.lineCount)
    expect(finalRightText.lineCount).toBe(liveRightText.lineCount)
    for (const snapshot of [liveLeftShape, liveRightShape, finalLeftShape, finalRightShape]) {
      shapes.checkNodeInsideGroup({ snapshot, kind: 'text' })
    }
  })
}

// eslint-disable-next-line max-len
differentHeightTest('при сужении шейпов разной высоты справа текст переносится во время движения ручки и размер не дёргается после mouseup', async({
  selection,
  shapes
}) => {
  const leftId = SHAPE_MULTI_SCALING_SHORT_LEFT_OPTIONS.id
  const rightId = SHAPE_MULTI_SCALING_TALL_RIGHT_OPTIONS.id
  const initialSelection = await selection.scaling.getSnapshot()
  const [initialLeftText, initialRightText] = await Promise.all([
    shapes.getTextNode({ id: leftId }),
    shapes.getTextNode({ id: rightId })
  ])
  const liveSelection = await selection.scaling.scaleHorizontallyFromRight({
    scaleX: SHAPE_MULTI_SCALING_SCALE_X
  })
  const [liveLeftShape, liveRightShape, liveLeftText, liveRightText] = await Promise.all([
    shapes.getScaleSnapshot({ id: leftId }),
    shapes.getScaleSnapshot({ id: rightId }),
    shapes.getTextNode({ id: leftId }),
    shapes.getTextNode({ id: rightId })
  ])
  const finalSelection = await selection.scaling.finish()
  const [finalLeftShape, finalRightShape, finalLeftText, finalRightText] = await Promise.all([
    shapes.getScaleSnapshot({ id: leftId }),
    shapes.getScaleSnapshot({ id: rightId }),
    shapes.getTextNode({ id: leftId }),
    shapes.getTextNode({ id: rightId })
  ])

  expect(initialLeftText, 'текст в меньшем шейпе должен существовать').not.toBeNull()
  expect(initialRightText, 'текст в высоком шейпе должен существовать').not.toBeNull()
  expect(liveLeftText, 'текст в меньшем шейпе во время движения ручки должен существовать').not.toBeNull()
  expect(liveRightText, 'текст в высоком шейпе во время движения ручки должен существовать').not.toBeNull()
  expect(finalLeftText, 'итоговый текст в меньшем шейпе должен существовать').not.toBeNull()
  expect(finalRightText, 'итоговый текст в высоком шейпе должен существовать').not.toBeNull()
  if (!initialLeftText || !initialRightText || !liveLeftText || !liveRightText || !finalLeftText || !finalRightText) {
    throw new Error('текст в обоих шейпах должен существовать до, во время движения ручки и после mouseup')
  }

  const tolerance = SHAPE_MULTI_SCALING_TOLERANCE.mouseupJump
  expect(liveSelection.boundsWidth).toBeLessThan(initialSelection.boundsWidth - tolerance)
  expect(liveLeftText.lineCount).toBeGreaterThan(initialLeftText.lineCount)
  expect(liveRightText.lineCount).toBeGreaterThan(initialRightText.lineCount)
  expect(liveLeftText.fontSize).toBe(initialLeftText.fontSize)
  expect(liveRightText.fontSize).toBe(initialRightText.fontSize)
  expect(Math.abs(finalSelection.boundsWidth - liveSelection.boundsWidth)).toBeLessThanOrEqual(tolerance)
  expect(Math.abs(finalLeftShape.groupBoundsWidth - liveLeftShape.groupBoundsWidth)).toBeLessThanOrEqual(tolerance)
  expect(Math.abs(finalRightShape.groupBoundsWidth - liveRightShape.groupBoundsWidth)).toBeLessThanOrEqual(tolerance)
  expect(Math.abs(finalLeftShape.groupBoundsHeight - liveLeftShape.groupBoundsHeight)).toBeLessThanOrEqual(tolerance)
  expect(Math.abs(finalRightShape.groupBoundsHeight - liveRightShape.groupBoundsHeight)).toBeLessThanOrEqual(tolerance)
  expect(finalLeftText.lineCount).toBe(liveLeftText.lineCount)
  expect(finalRightText.lineCount).toBe(liveRightText.lineCount)
  expect(finalLeftText.fontSize).toBe(liveLeftText.fontSize)
  expect(finalRightText.fontSize).toBe(liveRightText.fontSize)
  for (const snapshot of [liveLeftShape, liveRightShape, finalLeftShape, finalRightShape]) {
    shapes.checkNodeInsideGroup({ snapshot, kind: 'text' })
  }
})

differentHeightTest('при уменьшении шейпов разной высоты снизу высота меняется без деформации текста и без рывка после mouseup', async({
  selection,
  shapes
}) => {
  const leftId = SHAPE_MULTI_SCALING_SHORT_LEFT_OPTIONS.id
  const rightId = SHAPE_MULTI_SCALING_TALL_RIGHT_OPTIONS.id
  const initialSelection = await selection.scaling.getSnapshot()
  const [initialLeftText, initialRightText] = await Promise.all([
    shapes.getTextNode({ id: leftId }),
    shapes.getTextNode({ id: rightId })
  ])
  const liveSelection = await selection.scaling.scaleVerticallyFromBottom({
    scaleY: SHAPE_MULTI_SCALING_SCALE_Y
  })
  const [liveLeftShape, liveRightShape, liveLeftText, liveRightText] = await Promise.all([
    shapes.getScaleSnapshot({ id: leftId }),
    shapes.getScaleSnapshot({ id: rightId }),
    shapes.getTextNode({ id: leftId }),
    shapes.getTextNode({ id: rightId })
  ])
  const finalSelection = await selection.scaling.finish()
  const [finalLeftShape, finalRightShape, finalLeftText, finalRightText] = await Promise.all([
    shapes.getScaleSnapshot({ id: leftId }),
    shapes.getScaleSnapshot({ id: rightId }),
    shapes.getTextNode({ id: leftId }),
    shapes.getTextNode({ id: rightId })
  ])

  expect(initialLeftText, 'текст в меньшем шейпе должен существовать').not.toBeNull()
  expect(initialRightText, 'текст в высоком шейпе должен существовать').not.toBeNull()
  expect(liveLeftText, 'текст в меньшем шейпе во время движения ручки должен существовать').not.toBeNull()
  expect(liveRightText, 'текст в высоком шейпе во время движения ручки должен существовать').not.toBeNull()
  expect(finalLeftText, 'итоговый текст в меньшем шейпе должен существовать').not.toBeNull()
  expect(finalRightText, 'итоговый текст в высоком шейпе должен существовать').not.toBeNull()
  if (!initialLeftText || !initialRightText || !liveLeftText || !liveRightText || !finalLeftText || !finalRightText) {
    throw new Error('текст в обоих шейпах должен существовать до, во время движения ручки и после mouseup')
  }

  const tolerance = SHAPE_MULTI_SCALING_TOLERANCE.mouseupJump
  expect(liveSelection.boundsHeight).toBeLessThan(initialSelection.boundsHeight - tolerance)
  expect(Math.abs(liveSelection.boundsWidth - initialSelection.boundsWidth)).toBeLessThanOrEqual(tolerance)
  expect(liveLeftText.fontSize).toBe(initialLeftText.fontSize)
  expect(liveRightText.fontSize).toBe(initialRightText.fontSize)
  expect(liveLeftText.lineCount).toBe(initialLeftText.lineCount)
  expect(liveRightText.lineCount).toBe(initialRightText.lineCount)
  expect(Math.abs(finalSelection.boundsHeight - liveSelection.boundsHeight)).toBeLessThanOrEqual(tolerance)
  expect(Math.abs(finalLeftShape.groupBoundsHeight - liveLeftShape.groupBoundsHeight)).toBeLessThanOrEqual(tolerance)
  expect(Math.abs(finalRightShape.groupBoundsHeight - liveRightShape.groupBoundsHeight)).toBeLessThanOrEqual(tolerance)
  expect(finalLeftText.fontSize).toBe(liveLeftText.fontSize)
  expect(finalRightText.fontSize).toBe(liveRightText.fontSize)
  expect(finalLeftText.lineCount).toBe(liveLeftText.lineCount)
  expect(finalRightText.lineCount).toBe(liveRightText.lineCount)
  for (const snapshot of [liveLeftShape, liveRightShape, finalLeftShape, finalRightShape]) {
    shapes.checkNodeInsideGroup({ snapshot, kind: 'text' })
  }
})

// eslint-disable-next-line max-len
differentHeightTest('после сужения и обратного расширения шейпов разной высоты справа ширина не дёргается после mouseup', async({ editorModel, selection, shapes }) => {
  const leftId = SHAPE_MULTI_SCALING_SHORT_LEFT_OPTIONS.id
  const rightId = SHAPE_MULTI_SCALING_TALL_RIGHT_OPTIONS.id
  await selection.scaling.scaleHorizontallyFromRight({ scaleX: SHAPE_MULTI_SCALING_SCALE_X })
  await selection.scaling.finish()
  await editorModel.selectAllObjects()

  const narrowedSelection = await selection.scaling.getSnapshot()
  const [narrowedLeftText, narrowedRightText] = await Promise.all([
    shapes.getTextNode({ id: leftId }),
    shapes.getTextNode({ id: rightId })
  ])
  const liveSelection = await selection.scaling.scaleHorizontallyFromRight({
    scaleX: SHAPE_MULTI_SCALING_EXPAND_SCALE_X
  })
  const [liveLeftShape, liveRightShape, liveLeftText, liveRightText] = await Promise.all([
    shapes.getScaleSnapshot({ id: leftId }),
    shapes.getScaleSnapshot({ id: rightId }),
    shapes.getTextNode({ id: leftId }),
    shapes.getTextNode({ id: rightId })
  ])
  const finalSelection = await selection.scaling.finish()
  const [finalLeftShape, finalRightShape, finalLeftText, finalRightText] = await Promise.all([
    shapes.getScaleSnapshot({ id: leftId }),
    shapes.getScaleSnapshot({ id: rightId }),
    shapes.getTextNode({ id: leftId }),
    shapes.getTextNode({ id: rightId })
  ])

  expect(narrowedLeftText, 'текст в меньшем шейпе после сужения должен существовать').not.toBeNull()
  expect(narrowedRightText, 'текст в высоком шейпе после сужения должен существовать').not.toBeNull()
  expect(liveLeftText, 'текст в меньшем шейпе во время обратного расширения должен существовать').not.toBeNull()
  expect(liveRightText, 'текст в высоком шейпе во время обратного расширения должен существовать').not.toBeNull()
  expect(finalLeftText, 'итоговый текст в меньшем шейпе должен существовать').not.toBeNull()
  expect(finalRightText, 'итоговый текст в высоком шейпе должен существовать').not.toBeNull()
  if (!narrowedLeftText || !narrowedRightText || !liveLeftText || !liveRightText || !finalLeftText || !finalRightText) {
    throw new Error('текст в обоих шейпах должен существовать после сужения, во время движения ручки и после mouseup')
  }

  const tolerance = SHAPE_MULTI_SCALING_TOLERANCE.mouseupJump
  expect(liveSelection.boundsWidth).toBeGreaterThan(narrowedSelection.boundsWidth + tolerance)
  expect(narrowedLeftText.lineCount).toBeGreaterThan(1)
  expect(narrowedRightText.lineCount).toBeGreaterThan(1)
  expect(liveLeftText.lineCount).toBe(1)
  expect(liveRightText.lineCount).toBe(1)
  expect(liveLeftText.fontSize).toBe(narrowedLeftText.fontSize)
  expect(liveRightText.fontSize).toBe(narrowedRightText.fontSize)
  expect(Math.abs(finalSelection.boundsWidth - liveSelection.boundsWidth)).toBeLessThanOrEqual(tolerance)
  expect(Math.abs(finalLeftShape.groupBoundsWidth - liveLeftShape.groupBoundsWidth)).toBeLessThanOrEqual(tolerance)
  expect(Math.abs(finalRightShape.groupBoundsWidth - liveRightShape.groupBoundsWidth)).toBeLessThanOrEqual(tolerance)
  expect(Math.abs(finalLeftShape.groupBoundsHeight - liveLeftShape.groupBoundsHeight)).toBeLessThanOrEqual(tolerance)
  expect(Math.abs(finalRightShape.groupBoundsHeight - liveRightShape.groupBoundsHeight)).toBeLessThanOrEqual(tolerance)
  expect(finalLeftText.lineCount).toBe(liveLeftText.lineCount)
  expect(finalRightText.lineCount).toBe(liveRightText.lineCount)
  expect(finalLeftText.fontSize).toBe(liveLeftText.fontSize)
  expect(finalRightText.fontSize).toBe(liveRightText.fontSize)
  for (const snapshot of [liveLeftShape, liveRightShape, finalLeftShape, finalRightShape]) {
    shapes.checkNodeInsideGroup({ snapshot, kind: 'text' })
  }
})

differentHeightTest('после сужения и обратного расширения шейпов разной высоты сверху высота не дёргается после mouseup', async({
  editorModel,
  selection,
  shapes
}) => {
  const leftId = SHAPE_MULTI_SCALING_SHORT_LEFT_OPTIONS.id
  const rightId = SHAPE_MULTI_SCALING_TALL_RIGHT_OPTIONS.id
  await selection.scaling.scaleVerticallyFromTop({ scaleY: SHAPE_MULTI_SCALING_SCALE_Y })
  await selection.scaling.finish()
  await editorModel.selectAllObjects()

  const narrowedSelection = await selection.scaling.getSnapshot()
  const [narrowedLeftText, narrowedRightText] = await Promise.all([
    shapes.getTextNode({ id: leftId }),
    shapes.getTextNode({ id: rightId })
  ])
  const liveSelection = await selection.scaling.scaleVerticallyFromTop({
    scaleY: SHAPE_MULTI_SCALING_EXPAND_SCALE_Y
  })
  const [liveLeftShape, liveRightShape, liveLeftText, liveRightText] = await Promise.all([
    shapes.getScaleSnapshot({ id: leftId }),
    shapes.getScaleSnapshot({ id: rightId }),
    shapes.getTextNode({ id: leftId }),
    shapes.getTextNode({ id: rightId })
  ])
  const finalSelection = await selection.scaling.finish()
  const [finalLeftShape, finalRightShape, finalLeftText, finalRightText] = await Promise.all([
    shapes.getScaleSnapshot({ id: leftId }),
    shapes.getScaleSnapshot({ id: rightId }),
    shapes.getTextNode({ id: leftId }),
    shapes.getTextNode({ id: rightId })
  ])

  expect(narrowedLeftText, 'текст в меньшем шейпе после сужения должен существовать').not.toBeNull()
  expect(narrowedRightText, 'текст в высоком шейпе после сужения должен существовать').not.toBeNull()
  expect(liveLeftText, 'текст в меньшем шейпе во время обратного расширения должен существовать').not.toBeNull()
  expect(liveRightText, 'текст в высоком шейпе во время обратного расширения должен существовать').not.toBeNull()
  expect(finalLeftText, 'итоговый текст в меньшем шейпе должен существовать').not.toBeNull()
  expect(finalRightText, 'итоговый текст в высоком шейпе должен существовать').not.toBeNull()
  if (!narrowedLeftText || !narrowedRightText || !liveLeftText || !liveRightText || !finalLeftText || !finalRightText) {
    throw new Error('текст в обоих шейпах должен существовать после сужения, во время движения ручки и после mouseup')
  }

  const tolerance = SHAPE_MULTI_SCALING_TOLERANCE.mouseupJump
  expect(liveSelection.boundsHeight).toBeGreaterThan(narrowedSelection.boundsHeight + tolerance)
  expect(liveLeftText.fontSize).toBe(narrowedLeftText.fontSize)
  expect(liveRightText.fontSize).toBe(narrowedRightText.fontSize)
  expect(Math.abs(finalSelection.boundsHeight - liveSelection.boundsHeight)).toBeLessThanOrEqual(tolerance)
  expect(Math.abs(finalLeftShape.groupBoundsHeight - liveLeftShape.groupBoundsHeight)).toBeLessThanOrEqual(tolerance)
  expect(Math.abs(finalRightShape.groupBoundsHeight - liveRightShape.groupBoundsHeight)).toBeLessThanOrEqual(tolerance)
  expect(Math.abs(finalLeftShape.groupBoundsWidth - liveLeftShape.groupBoundsWidth)).toBeLessThanOrEqual(tolerance)
  expect(Math.abs(finalRightShape.groupBoundsWidth - liveRightShape.groupBoundsWidth)).toBeLessThanOrEqual(tolerance)
  expect(finalLeftText.fontSize).toBe(liveLeftText.fontSize)
  expect(finalRightText.fontSize).toBe(liveRightText.fontSize)
  for (const snapshot of [liveLeftShape, liveRightShape, finalLeftShape, finalRightShape]) {
    shapes.checkNodeInsideGroup({ snapshot, kind: 'text' })
  }
})
