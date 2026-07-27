import { expect, test } from '../../fixtures/editor.fixture'
import {
  SHAPE_MATERIALIZATION_HORIZONTAL_PADDING,
  SHAPE_MATERIALIZATION_INITIAL_HEIGHT,
  SHAPE_MATERIALIZATION_INITIAL_STATE,
  SHAPE_MATERIALIZATION_INITIAL_STATE_ID,
  SHAPE_MATERIALIZATION_INITIAL_WIDTH,
  SHAPE_MATERIALIZATION_SIZE_TOLERANCE
} from '../../fixtures/data/shape-materialization.data'

test.use({
  editorInitOptions: {
    initialState: SHAPE_MATERIALIZATION_INITIAL_STATE
  }
})

test('фигура из начального состояния сохраняет записанные размеры и перенос текста', async({
  shapes
}) => {
  const restoredShape = await shapes.getObject({
    id: SHAPE_MATERIALIZATION_INITIAL_STATE_ID
  })
  const restoredSnapshot = await shapes.getScaleSnapshot({
    id: SHAPE_MATERIALIZATION_INITIAL_STATE_ID
  })
  const restoredText = await shapes.getTextNode({
    id: SHAPE_MATERIALIZATION_INITIAL_STATE_ID
  })

  expect(restoredShape?.shapeTextAutoExpand).toBe(true)
  expect(restoredShape?.shapePaddingRight).toBe(SHAPE_MATERIALIZATION_HORIZONTAL_PADDING)
  expect(restoredShape?.shapePaddingLeft).toBe(SHAPE_MATERIALIZATION_HORIZONTAL_PADDING)
  expect(restoredText?.lineCount).toBeGreaterThan(1)
  expect(Math.abs(restoredSnapshot.groupBoundsWidth - SHAPE_MATERIALIZATION_INITIAL_WIDTH))
    .toBeLessThanOrEqual(SHAPE_MATERIALIZATION_SIZE_TOLERANCE)
  expect(Math.abs(restoredSnapshot.groupBoundsHeight - SHAPE_MATERIALIZATION_INITIAL_HEIGHT))
    .toBeLessThanOrEqual(SHAPE_MATERIALIZATION_SIZE_TOLERANCE)
})
