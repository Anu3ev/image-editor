import {
  test,
  expect
} from '../../../fixtures/active-selection-scaling.fixture'
import type { TextCornerScaleSnapshot } from '../../../types'

/** Поля текста, которые должны восстанавливаться через историю. */
const TEXT_HISTORY_FIELDS = [
  'width',
  'height',
  'fontSize',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'radiusTopLeft',
  'radiusTopRight',
  'radiusBottomRight',
  'radiusBottomLeft',
  'boundsLeft',
  'boundsTop',
  'boundsWidth',
  'boundsHeight'
] as const satisfies readonly (keyof TextCornerScaleSnapshot)[]

/** Точность сравнения текстовой геометрии после сериализации в истории. */
const TEXT_HISTORY_GEOMETRY_PRECISION = 1

test('после mouseup сохраняет рамку и скрывает индикатор и направляющие', async({
  activeSelectionTextScaleSetup: setup,
  editorModel,
  selection,
  snapping
}) => {
  await selection.scaling.startFromControl({ control: 'br' })
  await selection.scaling.dragControlToScenePoint({
    point: { x: setup.guides.right, y: setup.guides.bottom },
    shiftKey: true
  })

  const live = await selection.getTextCompositionSnapshot()
  const indicator = await editorModel.requireObjectSizeIndicator()
  const liveGuides = await snapping.getGuideState()
  const committedSelection = await selection.scaling.finish()
  const committed = await selection.getTextCompositionSnapshot()

  expect(indicator.width).toBe(Math.round(live.selection.boundsWidth))
  expect(indicator.height).toBe(Math.round(live.selection.boundsHeight))
  expect(liveGuides.guides).toHaveLength(2)
  for (const field of ['boundsLeft', 'boundsTop', 'boundsRight', 'boundsBottom'] as const) {
    expect(committedSelection[field]).toBeCloseTo(live.selection[field], 5)
    expect(committed.selection[field]).toBeCloseTo(live.selection[field], 5)
  }
  expect((await editorModel.getObjectSizeIndicator()).visible).toBe(false)
  const clearedGuides = await snapping.getGuideState()

  expect(clearedGuides.guides).toHaveLength(0)
  expect(clearedGuides.spacingGuides).toHaveLength(0)
})

test('после mouseup переносит размеры в свойства обоих текстов без скачка', async({
  activeSelectionTextScaleSetup: setup,
  selection
}) => {
  await selection.scaling.startFromControl({ control: 'br' })
  await selection.scaling.dragControlToScenePoint({
    point: { x: setup.guides.right, y: setup.guides.bottom },
    shiftKey: true
  })

  const live = await selection.getTextCompositionSnapshot()

  await selection.scaling.finish()

  const committed = await selection.getTextCompositionSnapshot()

  for (const [index, committedText] of committed.children.entries()) {
    const liveText = live.children[index]
    if (!liveText) throw new Error('Состояние до mouseup должно содержать оба текста')

    expect(committedText.scaleX).toBeCloseTo(1, 10)
    expect(committedText.scaleY).toBeCloseTo(1, 10)
    expect(committedText.width).toBeCloseTo(liveText.width, 5)
    expect(committedText.height).toBeCloseTo(liveText.height, 5)
    expect(committedText.fontSize).toBeCloseTo(liveText.fontSize, 5)
    expect(committedText.boundsLeft).toBeCloseTo(liveText.boundsLeft, 5)
    expect(committedText.boundsTop).toBeCloseTo(liveText.boundsTop, 5)
    expect(committedText.boundsRight).toBeCloseTo(liveText.boundsRight, 5)
    expect(committedText.boundsBottom).toBeCloseTo(liveText.boundsBottom, 5)
  }
})

test('один скейлинг создаёт одну запись в истории и восстанавливает оба текста', async({
  activeSelectionTextScaleSetup: setup,
  history,
  selection,
  text
}) => {
  const baseline = await Promise.all(setup.textIds.map((id) => text.scaling.getSnapshot({ id })))
  const historyBefore = await history.getPosition()

  await selection.scaling.startFromControl({ control: 'br' })
  await selection.scaling.dragControlToScenePoint({
    point: { x: setup.guides.right, y: setup.guides.bottom },
    shiftKey: true
  })
  await selection.scaling.finish()

  const committed = await Promise.all(setup.textIds.map((id) => text.scaling.getSnapshot({ id })))
  expect(await history.flushPendingSave()).toBe(true)
  const historyAfter = await history.getPosition()

  expect(historyAfter.patchCount).toBe(historyBefore.patchCount + 1)
  expect(historyAfter.currentIndex).toBe(historyBefore.currentIndex + 1)

  await history.undo()
  const undone = await Promise.all(setup.textIds.map((id) => text.scaling.getSnapshot({ id })))
  await history.redo()
  const redone = await Promise.all(setup.textIds.map((id) => text.scaling.getSnapshot({ id })))

  for (const [index, baselineText] of baseline.entries()) {
    const committedText = committed[index]
    const undoneText = undone[index]
    const redoneText = redone[index]
    if (!committedText || !undoneText || !redoneText) throw new Error('История должна содержать оба текста')

    for (const field of TEXT_HISTORY_FIELDS) {
      expect(undoneText[field]).toBeCloseTo(baselineText[field], TEXT_HISTORY_GEOMETRY_PRECISION)
      expect(redoneText[field]).toBeCloseTo(committedText[field], TEXT_HISTORY_GEOMETRY_PRECISION)
    }
  }
})

test('после отмены указателя очищает направляющие и начинает новую сессию', async({
  activeSelectionTextScaleSetup: setup,
  selection,
  snapping
}) => {
  await selection.scaling.startFromControl({ control: 'ml' })
  await selection.scaling.dragControlToScenePoint({
    point: { x: setup.guides.left, y: setup.initial.selection.centerY }
  })

  expect((await snapping.getGuideState()).guides).toHaveLength(1)

  await selection.scaling.cancelWithPointerEvent()

  const cancelled = await selection.getTextCompositionSnapshot()
  const clearedGuides = await snapping.getGuideState()

  expect(clearedGuides.guides).toHaveLength(0)
  for (const text of cancelled.children) {
    expect(text.scaleX).toBeCloseTo(1, 10)
    expect(text.scaleY).toBeCloseTo(1, 10)
  }

  await selection.scaling.startFromControl({ control: 'mr' })
  const reacquired = await selection.scaling.dragControlToScenePoint({
    point: { x: setup.guides.right, y: cancelled.selection.centerY }
  })

  expect(reacquired.boundsRight).toBeCloseTo(setup.guides.right, 5)
  expect((await snapping.getGuideState()).guides).toEqual([{
    type: 'vertical',
    position: setup.guides.right
  }])

  await selection.scaling.finish()
})

test('при нажатии Shift после изменения размера фиксирует его и начинает новую сессию', async({
  activeSelectionTextScaleSetup: setup,
  selection,
  snapping
}) => {
  await selection.scaling.startFromControl({ control: 'mr' })
  await selection.scaling.dragControlToScenePoint({
    point: { x: setup.guides.right, y: setup.initial.selection.centerY }
  })

  const snapped = await selection.getTextCompositionSnapshot()
  expect((await snapping.getGuideState()).guides).toHaveLength(1)

  const afterSwitch = await selection.scaling.dragControlToScenePoint({
    point: { x: setup.guides.right + 40, y: setup.initial.selection.centerY + 30 },
    shiftKey: true
  })
  const skew = await selection.getSkew()
  await selection.scaling.releasePointerAfterExternalEnd()

  expect(afterSwitch.boundsRight).toBeCloseTo(snapped.selection.boundsRight, 5)
  expect(skew.skewX).toBeCloseTo(0, 10)
  expect(skew.skewY).toBeCloseTo(0, 10)
  expect((await snapping.getGuideState()).guides).toHaveLength(0)

  const committed = await selection.getTextCompositionSnapshot()
  for (const text of committed.children) {
    expect(text.scaleX).toBeCloseTo(1, 10)
    expect(text.scaleY).toBeCloseTo(1, 10)
  }

  await selection.scaling.startFromControl({ control: 'ml' })
  const reacquired = await selection.scaling.dragControlToScenePoint({
    point: { x: setup.guides.left, y: committed.selection.centerY }
  })

  expect(reacquired.boundsLeft).toBeCloseTo(setup.guides.left, 5)
  expect((await snapping.getGuideState()).guides).toEqual([{
    type: 'vertical',
    position: setup.guides.left
  }])

  await selection.scaling.finish()
})
