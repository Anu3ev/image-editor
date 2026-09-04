import {
  test,
  expect
} from '../../../fixtures/active-selection-scaling.fixture'

test('после минимальной ширины продолжает ту же сессию и снова прилипает', async({
  activeSelectionTextScaleSetup: setup,
  selection,
  snapping
}) => {
  const fixedPoint = await selection.scaling.getControlScenePoint({ control: 'ml' })

  await selection.scaling.startFromControl({ control: 'mr' })
  await selection.scaling.dragControlToScenePoint({ point: fixedPoint })

  const minimum = await selection.getTextCompositionSnapshot()

  await selection.scaling.dragControlToScenePoint({
    point: {
      x: fixedPoint.x - (20 * setup.scenePixel),
      y: fixedPoint.y
    }
  })

  const heldAtMinimum = await selection.getTextCompositionSnapshot()

  expect(heldAtMinimum.selection.boundsLeft).toBeCloseTo(minimum.selection.boundsLeft, 8)
  expect(heldAtMinimum.selection.boundsRight).toBeCloseTo(minimum.selection.boundsRight, 8)
  for (const [index, text] of heldAtMinimum.children.entries()) {
    const minimumText = minimum.children[index]
    if (!minimumText) throw new Error('Минимальное состояние должно содержать оба текста')

    expect(text.width).toBeCloseTo(minimumText.width, 8)
    expect(text.fontSize).toBeCloseTo(minimumText.fontSize, 8)
    expect(text.lineCount).toBe(minimumText.lineCount)
  }

  const reacquired = await selection.scaling.dragControlToScenePoint({
    point: { x: setup.guides.right, y: setup.initial.selection.centerY }
  })
  const guides = await snapping.getGuideState()

  expect(reacquired.boundsRight).toBeCloseTo(setup.guides.right, 5)
  expect(guides.guides).toEqual([{ type: 'vertical', position: setup.guides.right }])
  expect(guides.spacingGuides).toHaveLength(0)

  await selection.scaling.finish()
})

test('после минимального размера за угол увеличивается и снова прилипает без mouseup', async({
  activeSelectionTextScaleSetup: setup,
  selection,
  shapes,
  snapping
}) => {
  for (const id of ['active-selection-scale-top-reference', 'active-selection-scale-bottom-reference']) {
    expect(await shapes.remove({ id })).toBe(true)
  }

  const fixedPoint = await selection.scaling.getControlScenePoint({ control: 'tl' })

  await selection.scaling.startFromControl({ control: 'br' })
  await selection.scaling.dragControlToScenePoint({ point: fixedPoint })

  const minimum = await selection.getTextCompositionSnapshot()

  await selection.scaling.dragControlToScenePoint({
    point: {
      x: fixedPoint.x - (20 * setup.scenePixel),
      y: fixedPoint.y - (20 * setup.scenePixel)
    }
  })

  const heldAtMinimum = await selection.getTextCompositionSnapshot()

  for (const [index, text] of heldAtMinimum.children.entries()) {
    const minimumText = minimum.children[index]
    if (!minimumText) throw new Error('Минимальное состояние должно содержать оба текста')

    expect(text.width).toBeCloseTo(minimumText.width, 8)
    expect(text.fontSize).toBeCloseTo(minimumText.fontSize, 8)
    expect(text.lineCount).toBe(minimumText.lineCount)
  }

  const reacquired = await selection.scaling.dragControlToScenePoint({
    point: { x: setup.guides.right, y: setup.guides.bottom }
  })
  const guides = await snapping.getGuideState()

  expect(reacquired.boundsRight).toBeCloseTo(setup.guides.right, 2)
  expect(guides.guides).toEqual([{ type: 'vertical', position: setup.guides.right }])
  expect(guides.spacingGuides).toHaveLength(0)

  const committed = await selection.scaling.finish()
  const texts = await selection.getTextCompositionSnapshot()

  expect(committed.boundsRight).toBeCloseTo(reacquired.boundsRight, 5)
  for (const text of texts.children) {
    expect(text.scaleX).toBeCloseTo(1, 10)
    expect(text.scaleY).toBeCloseTo(1, 10)
  }
})
