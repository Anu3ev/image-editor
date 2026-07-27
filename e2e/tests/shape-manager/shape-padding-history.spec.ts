import { expect, test } from '../../fixtures/editor.fixture'
import {
  SHAPE_PADDING_HISTORY_AUTO_EXPAND_ID
} from '../../fixtures/data/shape-padding-history.data'
import {
  SHAPE_MATERIALIZATION_FONT_SIZE,
  SHAPE_MATERIALIZATION_HORIZONTAL_PADDING,
  SHAPE_MATERIALIZATION_SIZE_TOLERANCE,
  SHAPE_MATERIALIZATION_TEXT
} from '../../fixtures/data/shape-materialization.data'

test.beforeEach(async({ history, shapes }) => {
  const createdShape = await shapes.addWithText({
    presetKey: 'square',
    text: SHAPE_MATERIALIZATION_TEXT,
    fontSize: SHAPE_MATERIALIZATION_FONT_SIZE,
    options: {
      id: SHAPE_PADDING_HISTORY_AUTO_EXPAND_ID
    }
  })

  expect(createdShape?.id).toBe(SHAPE_PADDING_HISTORY_AUTO_EXPAND_ID)
  expect(createdShape?.shapeTextAutoExpand).toBe(true)
  await history.flushPendingSave()

  await shapes.update({
    id: SHAPE_PADDING_HISTORY_AUTO_EXPAND_ID,
    options: {
      textPadding: {
        right: SHAPE_MATERIALIZATION_HORIZONTAL_PADDING
      }
    }
  })
})

test('undo возвращает ширину и перенос текста из шага с одним правым отступом', async({
  history,
  shapes
}) => {
  const rightPaddingShape = await shapes.getObject({ id: SHAPE_PADDING_HISTORY_AUTO_EXPAND_ID })
  const rightPaddingSnapshot = await shapes.getScaleSnapshot({ id: SHAPE_PADDING_HISTORY_AUTO_EXPAND_ID })
  const rightPaddingText = await shapes.getTextNode({ id: SHAPE_PADDING_HISTORY_AUTO_EXPAND_ID })

  await shapes.update({
    id: SHAPE_PADDING_HISTORY_AUTO_EXPAND_ID,
    options: {
      textPadding: {
        left: SHAPE_MATERIALIZATION_HORIZONTAL_PADDING
      }
    }
  })

  const bothPaddingShape = await shapes.getObject({ id: SHAPE_PADDING_HISTORY_AUTO_EXPAND_ID })
  const bothPaddingText = await shapes.getTextNode({ id: SHAPE_PADDING_HISTORY_AUTO_EXPAND_ID })

  await history.undo()

  const restoredShape = await shapes.getObject({ id: SHAPE_PADDING_HISTORY_AUTO_EXPAND_ID })
  const restoredSnapshot = await shapes.getScaleSnapshot({ id: SHAPE_PADDING_HISTORY_AUTO_EXPAND_ID })
  const restoredText = await shapes.getTextNode({ id: SHAPE_PADDING_HISTORY_AUTO_EXPAND_ID })

  expect(rightPaddingShape?.shapePaddingRight).toBe(SHAPE_MATERIALIZATION_HORIZONTAL_PADDING)
  expect(rightPaddingShape?.shapePaddingLeft).toBe(0)
  expect(rightPaddingText).not.toBeNull()
  expect(bothPaddingShape?.shapePaddingRight).toBe(SHAPE_MATERIALIZATION_HORIZONTAL_PADDING)
  expect(bothPaddingShape?.shapePaddingLeft).toBe(SHAPE_MATERIALIZATION_HORIZONTAL_PADDING)
  expect(bothPaddingText?.lineCount).toBeGreaterThan(1)
  expect(restoredShape?.shapePaddingRight).toBe(rightPaddingShape?.shapePaddingRight)
  expect(restoredShape?.shapePaddingLeft).toBe(rightPaddingShape?.shapePaddingLeft)
  expect(restoredText).not.toBeNull()
  expect(restoredText?.lineCount).toBe(rightPaddingText?.lineCount)
  expect(Math.abs(restoredSnapshot.groupBoundsWidth - rightPaddingSnapshot.groupBoundsWidth))
    .toBeLessThanOrEqual(SHAPE_MATERIALIZATION_SIZE_TOLERANCE)
})

test('redo возвращает ширину и перенос текста из шага с двумя отступами', async({
  history,
  shapes
}) => {
  await shapes.update({
    id: SHAPE_PADDING_HISTORY_AUTO_EXPAND_ID,
    options: {
      textPadding: {
        left: SHAPE_MATERIALIZATION_HORIZONTAL_PADDING
      }
    }
  })

  const bothPaddingSnapshot = await shapes.getScaleSnapshot({ id: SHAPE_PADDING_HISTORY_AUTO_EXPAND_ID })
  const bothPaddingText = await shapes.getTextNode({ id: SHAPE_PADDING_HISTORY_AUTO_EXPAND_ID })

  await history.undo()
  await history.redo()

  const redoneShape = await shapes.getObject({ id: SHAPE_PADDING_HISTORY_AUTO_EXPAND_ID })
  const redoneSnapshot = await shapes.getScaleSnapshot({ id: SHAPE_PADDING_HISTORY_AUTO_EXPAND_ID })
  const redoneText = await shapes.getTextNode({ id: SHAPE_PADDING_HISTORY_AUTO_EXPAND_ID })

  expect(bothPaddingText?.lineCount).toBeGreaterThan(1)
  expect(redoneShape?.shapePaddingRight).toBe(SHAPE_MATERIALIZATION_HORIZONTAL_PADDING)
  expect(redoneShape?.shapePaddingLeft).toBe(SHAPE_MATERIALIZATION_HORIZONTAL_PADDING)
  expect(redoneText?.lineCount).toBe(bothPaddingText?.lineCount)
  expect(Math.abs(redoneSnapshot.groupBoundsWidth - bothPaddingSnapshot.groupBoundsWidth))
    .toBeLessThanOrEqual(SHAPE_MATERIALIZATION_SIZE_TOLERANCE)
})
