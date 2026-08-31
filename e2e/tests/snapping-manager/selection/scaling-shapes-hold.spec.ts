import {
  test,
  expect
} from '../../../fixtures/active-selection-scaling.fixture'

test('правая грань выделения из шейпов прилипает к направляющей', async({
  activeSelectionShapeScaleSetup: setup,
  selection,
  snapping
}) => {
  await selection.scaling.startFromControl({ control: 'mr' })
  const acquired = await selection.scaling.dragControlToScenePoint({
    point: { x: setup.guides.right, y: setup.initial.selection.centerY }
  })
  const guides = await snapping.getGuideState()

  expect(acquired.boundsRight).toBeCloseTo(setup.guides.right, 5)
  expect(acquired.boundsLeft).toBeCloseTo(setup.initial.selection.boundsLeft, 5)
  expect(guides.guides).toEqual([{ type: 'vertical', position: setup.guides.right }])
  expect(guides.spacingGuides).toHaveLength(0)

  await selection.scaling.finish()
})

test('при микродвижениях удерживает рамку, размеры шейпов и перенос текста', async({
  activeSelectionShapeScaleSetup: setup,
  selection,
  shapes,
  snapping
}) => {
  await selection.scaling.startFromControl({ control: 'mr' })
  await selection.scaling.dragControlToScenePoint({
    point: { x: setup.guides.right, y: setup.initial.selection.centerY }
  })

  const acquired = await selection.getCompositionSnapshot()
  const acquiredShapes = await Promise.all(setup.shapeIds.map((id) => shapes.getScaleSnapshot({ id })))
  const acquiredTexts = await Promise.all(setup.shapeIds.map((id) => shapes.getTextNode({ id })))

  for (let step = 0; step < 3; step += 1) {
    await selection.scaling.dragControlBy({ deltaX: -1, deltaY: 0 })

    const held = await selection.getCompositionSnapshot()
    const heldShapes = await Promise.all(setup.shapeIds.map((id) => shapes.getScaleSnapshot({ id })))
    const heldTexts = await Promise.all(setup.shapeIds.map((id) => shapes.getTextNode({ id })))

    expect(held.selection.boundsLeft).toBeCloseTo(acquired.selection.boundsLeft, 8)
    expect(held.selection.boundsRight).toBeCloseTo(acquired.selection.boundsRight, 8)
    for (const [index, shape] of heldShapes.entries()) {
      const acquiredShape = acquiredShapes[index]
      const text = heldTexts[index]
      const acquiredText = acquiredTexts[index]
      if (!acquiredShape || !text || !acquiredText) {
        throw new Error('Снимок удержания должен содержать геометрию и текст обоих шейпов')
      }

      expect(shape.width).toBeCloseTo(acquiredShape.width, 8)
      expect(shape.height).toBeCloseTo(acquiredShape.height, 8)
      expect(shape.scaleX).toBeCloseTo(1, 10)
      expect(shape.scaleY).toBeCloseTo(1, 10)
      expect(text.width).toBeCloseTo(acquiredText.width, 8)
      expect(text.height).toBeCloseTo(acquiredText.height, 8)
      expect(text.fontSize).toBeCloseTo(acquiredText.fontSize, 8)
      expect(text.lineCount).toBe(acquiredText.lineCount)
    }
    expect((await snapping.getGuideState()).guides)
      .toEqual([{ type: 'vertical', position: setup.guides.right }])
  }

  await selection.scaling.finish()
})

test('после mouseup сохраняет последний размер и очищает направляющие', async({
  activeSelectionShapeScaleSetup: setup,
  selection,
  snapping
}) => {
  await selection.scaling.startFromControl({ control: 'mr' })
  await selection.scaling.dragControlToScenePoint({
    point: { x: setup.guides.right, y: setup.initial.selection.centerY }
  })

  const beforeMouseUp = await selection.getCompositionSnapshot()
  const committed = await selection.scaling.finish()
  const afterMouseUp = await selection.getCompositionSnapshot()
  const guides = await snapping.getGuideState()

  expect(committed.boundsRight).toBeCloseTo(beforeMouseUp.selection.boundsRight, 5)
  expect(committed.boundsLeft).toBeCloseTo(beforeMouseUp.selection.boundsLeft, 5)
  expect(afterMouseUp.selection.boundsRight).toBeCloseTo(beforeMouseUp.selection.boundsRight, 5)
  expect(afterMouseUp.selection.boundsLeft).toBeCloseTo(beforeMouseUp.selection.boundsLeft, 5)
  expect(guides.guides).toHaveLength(0)
  expect(guides.spacingGuides).toHaveLength(0)
})

test('Ctrl снимает удержание, а после отпускания клавиши выделение из шейпов снова прилипает', async({
  activeSelectionShapeScaleSetup: setup,
  selection,
  shapes,
  snapping
}) => {
  const initialTexts = await Promise.all(setup.shapeIds.map((id) => shapes.getTextNode({ id })))

  await selection.scaling.startFromControl({ control: 'ml' })
  const acquired = await selection.scaling.dragControlToScenePoint({
    point: { x: setup.guides.left + setup.scenePixel, y: setup.initial.selection.centerY }
  })

  expect(acquired.boundsLeft).toBeCloseTo(setup.guides.left, 5)
  expect((await snapping.getGuideState()).guides).toEqual([{
    type: 'vertical',
    position: setup.guides.left
  }])

  const withoutSnap = await selection.scaling.dragControlToScenePoint({
    ctrlKey: true,
    point: { x: setup.guides.left - (2 * setup.scenePixel), y: setup.initial.selection.centerY }
  })
  const disabledGuides = await snapping.getGuideState()

  expect(withoutSnap.boundsLeft).not.toBeCloseTo(setup.guides.left, 5)
  expect(disabledGuides.guides).toHaveLength(0)
  expect(disabledGuides.spacingGuides).toHaveLength(0)

  const reacquired = await selection.scaling.dragControlToScenePoint({
    point: { x: setup.guides.left - setup.scenePixel, y: setup.initial.selection.centerY }
  })
  const reacquiredGuides = await snapping.getGuideState()
  const liveShapes = await Promise.all(setup.shapeIds.map((id) => shapes.getScaleSnapshot({ id })))
  const liveTexts = await Promise.all(setup.shapeIds.map((id) => shapes.getTextNode({ id })))

  expect(reacquired.boundsLeft).toBeCloseTo(setup.guides.left, 5)
  expect(reacquiredGuides.guides).toEqual([{
    type: 'vertical',
    position: setup.guides.left
  }])
  expect(reacquiredGuides.spacingGuides).toHaveLength(0)
  for (const [index, shape] of liveShapes.entries()) {
    expect(shape.scaleX).toBeCloseTo(1, 10)
    expect(shape.scaleY).toBeCloseTo(1, 10)
    expect(liveTexts[index]?.lineCount).toBe(initialTexts[index]?.lineCount)
  }

  await selection.scaling.finish()
})
