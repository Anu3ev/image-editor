import {
  test,
  expect
} from '../../../fixtures/active-selection-scaling.fixture'

test('при микродвижениях удерживает левую грань на выбранной направляющей', async({
  activeSelectionImageScaleSetup: setup,
  selection,
  snapping
}) => {
  await selection.scaling.startFromControl({ control: 'ml' })
  await selection.scaling.dragControlBy({
    deltaX: (
      setup.leftReference.boundsLeft
      + setup.scenePixel
      - setup.initial.selection.boundsLeft
    ) / setup.scenePixel,
    deltaY: 0
  })

  const acquired = await selection.getCompositionSnapshot()

  expect(acquired.selection.boundsLeft).toBeCloseTo(setup.leftReference.boundsLeft, 5)
  expect(acquired.selection.boundsRight).toBeCloseTo(setup.initial.selection.boundsRight, 5)
  expect((await snapping.getGuideState()).guides).toEqual([{
    type: 'vertical',
    position: setup.leftReference.boundsLeft
  }])

  for (let step = 0; step < 3; step += 1) {
    await selection.scaling.dragControlBy({ deltaX: 1, deltaY: 0 })

    const held = await selection.getCompositionSnapshot()
    const guides = await snapping.getGuideState()

    expect(held).toEqual(acquired)
    expect(guides.guides).toEqual([{
      type: 'vertical',
      position: setup.leftReference.boundsLeft
    }])
    expect(guides.spacingGuides).toHaveLength(0)
  }

  const beforeMouseUp = await selection.getCompositionSnapshot()
  const committed = await selection.scaling.finish()
  const afterMouseUp = await selection.getCompositionSnapshot()
  const guides = await snapping.getGuideState()

  expect(committed).toEqual(beforeMouseUp.selection)
  expect(afterMouseUp).toEqual(beforeMouseUp)
  expect(guides.guides).toHaveLength(0)
  expect(guides.spacingGuides).toHaveLength(0)
})

test('после выхода из зоны удержания отпускает направляющую и продолжает менять ширину', async({
  activeSelectionImageScaleSetup: setup,
  selection,
  snapping
}) => {
  await selection.scaling.startFromControl({ control: 'ml' })
  const acquired = await selection.scaling.dragControlToScenePoint({
    point: {
      x: setup.guides.left + setup.scenePixel,
      y: setup.initial.selection.centerY
    }
  })
  const acquiredGuides = await snapping.getGuideState()

  expect(acquired.boundsLeft).toBeCloseTo(setup.guides.left, 5)
  expect(acquiredGuides.guides).toEqual([{
    type: 'vertical',
    position: setup.guides.left
  }])
  expect(acquiredGuides.spacingGuides).toHaveLength(0)

  const released = await selection.scaling.dragControlToScenePoint({
    point: {
      x: setup.guides.left + (30 * setup.scenePixel),
      y: setup.initial.selection.centerY
    }
  })
  const guides = await snapping.getGuideState()

  expect(Math.abs(released.boundsLeft - acquired.boundsLeft))
    .toBeGreaterThan(20 * setup.scenePixel)
  expect(released.boundsRight).toBeCloseTo(setup.initial.selection.boundsRight, 5)
  expect(guides.guides).toHaveLength(0)
  expect(guides.spacingGuides).toHaveLength(0)

  const committed = await selection.scaling.finish()

  expect(committed).toEqual(released)
})

test('Ctrl снимает удержание, а после отпускания клавиши выделение снова прилипает', async({
  activeSelectionImageScaleSetup: setup,
  selection,
  snapping
}) => {
  await selection.scaling.startFromControl({ control: 'ml' })
  const acquired = await selection.scaling.dragControlToScenePoint({
    point: {
      x: setup.guides.left + setup.scenePixel,
      y: setup.initial.selection.centerY
    }
  })
  const acquiredGuides = await snapping.getGuideState()

  expect(acquired.boundsLeft).toBeCloseTo(setup.guides.left, 5)
  expect(acquiredGuides.guides).toEqual([{
    type: 'vertical',
    position: setup.guides.left
  }])
  expect(acquiredGuides.spacingGuides).toHaveLength(0)

  const withoutSnap = await selection.scaling.dragControlToScenePoint({
    ctrlKey: true,
    point: {
      x: setup.guides.left - (2 * setup.scenePixel),
      y: setup.initial.selection.centerY
    }
  })
  const disabledGuides = await snapping.getGuideState()

  expect(withoutSnap.boundsLeft).not.toBeCloseTo(setup.guides.left, 5)
  expect(disabledGuides.guides).toHaveLength(0)
  expect(disabledGuides.spacingGuides).toHaveLength(0)

  const reacquired = await selection.scaling.dragControlToScenePoint({
    point: {
      x: setup.guides.left - setup.scenePixel,
      y: setup.initial.selection.centerY
    }
  })
  const reacquiredGuides = await snapping.getGuideState()

  expect(reacquired.boundsLeft).toBeCloseTo(setup.guides.left, 5)
  expect(reacquiredGuides.guides).toEqual([{
    type: 'vertical',
    position: setup.guides.left
  }])
  expect(reacquiredGuides.spacingGuides).toHaveLength(0)

  await selection.scaling.finish()
})
