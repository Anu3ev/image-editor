import { test, expect } from '../../fixtures/editor.fixture'
import { FOUR_SHAPE_EQUAL_SPACING_TEMPLATE } from '../../fixtures/data/shape-moving-spacing-template.data'

/** Размер монтажной области, для которого сохранён исходный шаблон. */
const TEMPLATE_RESOLUTION = { width: 512, height: 512 } as const

/** Индексы шейпов в порядке их расположения слева направо. */
const SHAPE_INDEXES = [0, 1, 2, 3] as const

/** Точные интервалы между четырьмя шейпами исходного шаблона. */
const EXPECTED_SPACING_GAPS = [47.25, 47.25, 47.25] as const

test('после undo и redo шаблон сохраняет точные интервалы между шейпами', async({
  canvas,
  editorModel,
  history,
  template
}) => {
  await canvas.setMontageResolution(TEMPLATE_RESOLUTION)
  const insertedCount = await template.applyTemplate({
    template: FOUR_SHAPE_EQUAL_SPACING_TEMPLATE
  })
  expect(insertedCount).toBe(4)
  await history.flushPendingSave()

  const [first, second, third, fourth] = await Promise.all(SHAPE_INDEXES.map((objectIndex) => {
    return editorModel.getObjectSnapshot({ objectIndex })
  }))
  const initialGaps = [
    second.boundsLeft - first.boundsRight,
    third.boundsLeft - second.boundsRight,
    fourth.boundsLeft - third.boundsRight
  ]
  expect(initialGaps).toEqual(EXPECTED_SPACING_GAPS)
  expect(initialGaps).toHaveLength(EXPECTED_SPACING_GAPS.length)

  await history.undo()
  await editorModel.checkObjectCount({ count: 0 })
  await history.redo()
  await editorModel.checkObjectCount({ count: 4 })

  const [restoredFirst, restoredSecond, restoredThird, restoredFourth] = await Promise.all(
    SHAPE_INDEXES.map((objectIndex) => editorModel.getObjectSnapshot({ objectIndex }))
  )
  const restoredGaps = [
    restoredSecond.boundsLeft - restoredFirst.boundsRight,
    restoredThird.boundsLeft - restoredSecond.boundsRight,
    restoredFourth.boundsLeft - restoredThird.boundsRight
  ]
  expect(restoredGaps).toEqual(EXPECTED_SPACING_GAPS)
  expect(restoredGaps).toEqual(initialGaps)
})
