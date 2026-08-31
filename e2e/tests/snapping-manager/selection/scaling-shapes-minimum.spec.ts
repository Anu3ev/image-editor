import {
  test,
  expect
} from '../../../fixtures/active-selection-scaling.fixture'

test('после достижения минимального размера снова увеличивает выделение и прилипает в той же сессии', async({
  activeSelectionShapeScaleSetup: setup,
  selection,
  shapes,
  snapping
}) => {
  await selection.scaling.startFromControl({ control: 'mr' })
  const minimum = await selection.scaling.dragControlToScenePoint({
    point: {
      x: setup.initial.selection.boundsLeft + (5 * setup.scenePixel),
      y: setup.initial.selection.centerY
    }
  })
  const continued = await selection.scaling.dragControlToScenePoint({
    point: {
      x: setup.initial.selection.boundsLeft + setup.scenePixel,
      y: setup.initial.selection.centerY
    }
  })

  expect(minimum.boundsWidth).toBeGreaterThan(5 * setup.scenePixel)
  expect(continued.boundsWidth).toBeCloseTo(minimum.boundsWidth, 5)
  expect(continued.boundsLeft).toBeCloseTo(setup.initial.selection.boundsLeft, 5)
  expect((await snapping.getGuideState()).guides).toHaveLength(0)

  const reacquired = await selection.scaling.dragControlToScenePoint({
    point: { x: setup.guides.right, y: setup.initial.selection.centerY }
  })
  const guides = await snapping.getGuideState()
  const liveShapes = await Promise.all(setup.shapeIds.map((id) => shapes.getScaleSnapshot({ id })))

  expect(reacquired.boundsWidth).toBeGreaterThan(minimum.boundsWidth + (20 * setup.scenePixel))
  expect(reacquired.boundsRight).toBeCloseTo(setup.guides.right, 5)
  expect(guides.guides).toEqual([{ type: 'vertical', position: setup.guides.right }])
  expect(guides.spacingGuides).toHaveLength(0)
  for (const shape of liveShapes) {
    expect(shape.scaleX).toBeCloseTo(1, 10)
    expect(shape.scaleY).toBeCloseTo(1, 10)
  }

  const committed = await selection.scaling.finish()

  expect(committed.boundsRight).toBeCloseTo(reacquired.boundsRight, 5)
  expect(committed.boundsWidth).toBeCloseTo(reacquired.boundsWidth, 5)
})

test('после минимального пропорционального размера снова увеличивает выделение за угол и прилипает', async({
  activeSelectionShapeScaleSetup: setup,
  selection,
  shapes,
  snapping
}) => {
  await selection.scaling.startFromControl({ control: 'br' })
  const minimum = await selection.scaling.dragControlToScenePoint({
    point: {
      x: setup.initial.selection.boundsLeft + (5 * setup.scenePixel),
      y: setup.initial.selection.boundsTop + (5 * setup.scenePixel)
    }
  })
  const continued = await selection.scaling.dragControlToScenePoint({
    point: {
      x: setup.initial.selection.boundsLeft + setup.scenePixel,
      y: setup.initial.selection.boundsTop + setup.scenePixel
    }
  })

  expect(minimum.boundsWidth).toBeGreaterThan(5 * setup.scenePixel)
  expect(minimum.boundsHeight).toBeGreaterThan(5 * setup.scenePixel)
  expect(continued.boundsWidth).toBeCloseTo(minimum.boundsWidth, 5)
  expect(continued.boundsHeight).toBeCloseTo(minimum.boundsHeight, 5)
  expect((await snapping.getGuideState()).guides).toHaveLength(0)

  const reacquired = await selection.scaling.dragControlToScenePoint({
    point: { x: setup.guides.right, y: setup.guides.bottom }
  })
  const guides = await snapping.getGuideState()
  const liveShapes = await Promise.all(setup.shapeIds.map((id) => shapes.getScaleSnapshot({ id })))

  expect(reacquired.boundsWidth).toBeGreaterThan(minimum.boundsWidth + (20 * setup.scenePixel))
  expect(reacquired.boundsHeight).toBeGreaterThan(minimum.boundsHeight + (20 * setup.scenePixel))
  expect(reacquired.boundsRight).toBeCloseTo(setup.guides.right, 5)
  expect(reacquired.boundsBottom).toBeCloseTo(setup.guides.bottom, 5)
  expect(guides.guides).toEqual([
    { type: 'vertical', position: setup.guides.right },
    { type: 'horizontal', position: setup.guides.bottom }
  ])
  expect(guides.spacingGuides).toHaveLength(0)
  for (const shape of liveShapes) {
    expect(shape.scaleX).toBeCloseTo(1, 10)
    expect(shape.scaleY).toBeCloseTo(1, 10)
  }

  const committed = await selection.scaling.finish()

  expect(committed.boundsRight).toBeCloseTo(reacquired.boundsRight, 5)
  expect(committed.boundsBottom).toBeCloseTo(reacquired.boundsBottom, 5)
})
