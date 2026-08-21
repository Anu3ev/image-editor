import {
  test,
  expect
} from '../../../fixtures/active-selection-scaling.fixture'

/** Поля изображения, которые должны восстанавливаться через undo и redo. */
const IMAGE_HISTORY_FIELDS = [
  'boundsLeft',
  'boundsTop',
  'boundsWidth',
  'boundsHeight',
  'width',
  'height',
  'angle'
] as const

/** Точность сравнения геометрии после сериализации в истории. */
const HISTORY_GEOMETRY_PRECISION = 2

test('после mouseup сохраняет геометрию и скрывает индикатор и направляющие', async({
  activeSelectionImageScaleSetup: setup,
  editorModel,
  selection,
  snapping
}) => {
  await selection.scaling.startFromControl({ control: 'br' })
  await selection.scaling.dragControlToScenePoint({
    point: {
      x: setup.guides.right,
      y: setup.guides.bottom
    }
  })

  const live = await selection.getCompositionSnapshot()
  const indicator = await editorModel.requireObjectSizeIndicator()
  const liveGuides = await snapping.getGuideState()
  const committed = await selection.scaling.finish()
  const afterMouseUp = await selection.getCompositionSnapshot()
  const hiddenIndicator = await editorModel.getObjectSizeIndicator()
  const clearedGuides = await snapping.getGuideState()

  expect(indicator.width).toBe(Math.round(live.selection.boundsWidth))
  expect(indicator.height).toBe(Math.round(live.selection.boundsHeight))
  expect(liveGuides.guides).toHaveLength(2)
  expect(committed).toEqual(live.selection)
  expect(afterMouseUp).toEqual(live)
  expect(hiddenIndicator.visible).toBe(false)
  expect(clearedGuides.guides).toHaveLength(0)
  expect(clearedGuides.spacingGuides).toHaveLength(0)
})

test('один скейлинг создаёт одну запись в истории и восстанавливает оба изображения', async({
  activeSelectionImageScaleSetup: setup,
  history,
  selection,
  snapping
}) => {
  const childIds = setup.initial.children.map(({ id }) => id)
  const baselineChildren = await Promise.all(childIds.map((id) => snapping.getObjectSnapshot({ id })))
  const historyBefore = await history.getPosition()

  await selection.scaling.startFromControl({ control: 'br' })
  await selection.scaling.dragControlToScenePoint({
    point: {
      x: setup.guides.right,
      y: setup.guides.bottom
    }
  })
  await selection.scaling.finish()

  const committedChildren = await Promise.all(childIds.map((id) => snapping.getObjectSnapshot({ id })))
  const saved = await history.flushPendingSave()
  const historyAfter = await history.getPosition()

  expect(saved, 'завершённый скейлинг должен сохраниться в истории').toBe(true)
  expect(historyAfter.patchCount).toBe(historyBefore.patchCount + 1)
  expect(historyAfter.currentIndex).toBe(historyBefore.currentIndex + 1)

  await history.undo()
  const undoneChildren = await Promise.all(childIds.map((id) => snapping.getObjectSnapshot({ id })))
  await history.redo()
  const redoneChildren = await Promise.all(childIds.map((id) => snapping.getObjectSnapshot({ id })))

  for (const [index, baselineChild] of baselineChildren.entries()) {
    const committedChild = committedChildren[index]
    const undoneChild = undoneChildren[index]
    const redoneChild = redoneChildren[index]
    if (!committedChild || !undoneChild || !redoneChild) {
      throw new Error('История должна содержать оба изображения общего выделения')
    }

    for (const field of IMAGE_HISTORY_FIELDS) {
      expect(undoneChild[field], `undo должен восстановить поле ${field}`)
        .toBeCloseTo(baselineChild[field], HISTORY_GEOMETRY_PRECISION)
      expect(redoneChild[field], `redo должен восстановить поле ${field}`)
        .toBeCloseTo(committedChild[field], HISTORY_GEOMETRY_PRECISION)
    }

    expect(undoneChild.scaleX).toBeCloseTo(baselineChild.scaleX, HISTORY_GEOMETRY_PRECISION)
    expect(undoneChild.scaleY).toBeCloseTo(baselineChild.scaleY, HISTORY_GEOMETRY_PRECISION)
    expect(redoneChild.scaleX).toBeCloseTo(
      redoneChild.boundsWidth / redoneChild.width,
      HISTORY_GEOMETRY_PRECISION
    )
    expect(redoneChild.scaleY).toBeCloseTo(
      redoneChild.boundsHeight / redoneChild.height,
      HISTORY_GEOMETRY_PRECISION
    )
  }
})

test('после отмены указателя очищает направляющие и начинает новую сессию', async({
  activeSelectionImageScaleSetup: setup,
  selection,
  snapping
}) => {
  await selection.scaling.startFromControl({ control: 'ml' })
  await selection.scaling.dragControlToScenePoint({
    point: {
      x: setup.guides.left,
      y: setup.initial.selection.centerY
    }
  })

  expect((await snapping.getGuideState()).guides).toHaveLength(1)

  await selection.scaling.cancelWithPointerEvent()

  const clearedGuides = await snapping.getGuideState()

  expect(clearedGuides.guides).toHaveLength(0)
  expect(clearedGuides.spacingGuides).toHaveLength(0)

  const current = await selection.getCompositionSnapshot()
  await selection.scaling.startFromControl({ control: 'mr' })
  const reacquired = await selection.scaling.dragControlToScenePoint({
    point: {
      x: setup.guides.right,
      y: current.selection.centerY
    }
  })
  const guides = await snapping.getGuideState()

  expect(reacquired.boundsRight).toBeCloseTo(setup.guides.right, 5)
  expect(guides.guides).toEqual([{
    type: 'vertical',
    position: setup.guides.right
  }])

  await selection.scaling.finish()
})
