import {
  test,
  expect
} from '../../../fixtures/active-selection-scaling.fixture'

/** Угол общего выделения в проверке скейлинга после поворота. */
const ACTIVE_SELECTION_ROTATION_DEGREES = 30

test('с Shift свободно меняет ширину и высоту за угол', async({
  activeSelectionImageScaleSetup: setup,
  selection,
  snapping
}) => {
  const pointerBottom = setup.guides.bottom + (20 * setup.scenePixel)

  await selection.scaling.startFromControl({ control: 'br' })
  const live = await selection.scaling.dragControlToScenePoint({
    point: {
      x: setup.guides.right,
      y: pointerBottom
    },
    shiftKey: true
  })
  const guides = await snapping.getGuideState()

  expect(live.boundsLeft).toBeCloseTo(setup.initial.selection.boundsLeft, 5)
  expect(live.boundsTop).toBeCloseTo(setup.initial.selection.boundsTop, 5)
  expect(live.boundsRight).toBeCloseTo(setup.guides.right, 5)
  expect(Math.abs(live.boundsBottom - pointerBottom)).toBeLessThan(setup.scenePixel)
  expect(live.boundsHeight).toBeGreaterThan(setup.initial.selection.boundsHeight)
  expect(live.scaleX).not.toBeCloseTo(live.scaleY, 3)
  expect(guides.guides).toEqual([{
    type: 'vertical',
    position: setup.guides.right
  }])
  expect(guides.spacingGuides).toHaveLength(0)

  await selection.scaling.finish()
})

test('при свободном скейлинге отпускает направляющие независимо по каждой оси', async({
  activeSelectionImageScaleSetup: setup,
  selection,
  snapping
}) => {
  await selection.scaling.startFromControl({ control: 'br' })
  const acquired = await selection.scaling.dragControlToScenePoint({
    point: {
      x: setup.guides.right,
      y: setup.guides.bottom
    },
    shiftKey: true
  })
  const releasedX = await selection.scaling.dragControlToScenePoint({
    point: {
      x: setup.guides.right + (30 * setup.scenePixel),
      y: setup.guides.bottom + (2 * setup.scenePixel)
    },
    shiftKey: true
  })
  const heldYGuides = await snapping.getGuideState()

  expect(Math.abs(releasedX.boundsRight - acquired.boundsRight))
    .toBeGreaterThan(20 * setup.scenePixel)
  expect(releasedX.boundsBottom).toBeCloseTo(acquired.boundsBottom, 5)
  expect(heldYGuides.guides).toEqual([{
    type: 'horizontal',
    position: setup.guides.bottom
  }])

  const releasedBoth = await selection.scaling.dragControlToScenePoint({
    point: {
      x: setup.guides.right + (30 * setup.scenePixel),
      y: setup.guides.bottom + (30 * setup.scenePixel)
    },
    shiftKey: true
  })
  const releasedGuides = await snapping.getGuideState()

  expect(Math.abs(releasedBoth.boundsBottom - acquired.boundsBottom))
    .toBeGreaterThan(20 * setup.scenePixel)
  expect(releasedGuides.guides).toHaveLength(0)
  expect(releasedGuides.spacingGuides).toHaveLength(0)

  await selection.scaling.finish()
})

test('при скейлинге за боковую ручку относительно центра сохраняет центр', async({
  activeSelectionImageScaleSetup: setup,
  selection,
  snapping
}) => {
  await selection.scaling.startFromControl({ centered: true, control: 'mr' })
  const live = await selection.scaling.dragControlToScenePoint({
    point: {
      x: setup.guides.right,
      y: setup.initial.selection.centerY
    }
  })
  const guides = await snapping.getGuideState()

  expect(live.boundsLeft).toBeCloseTo(setup.guides.left, 5)
  expect(live.boundsRight).toBeCloseTo(setup.guides.right, 5)
  expect(live.centerX).toBeCloseTo(setup.initial.selection.centerX, 5)
  expect(live.centerY).toBeCloseTo(setup.initial.selection.centerY, 5)
  expect(live.scaleY).toBeCloseTo(setup.initial.selection.scaleY, 5)
  expect(guides.guides).toHaveLength(1)
  expect(guides.guides[0]?.type).toBe('vertical')
  expect([setup.guides.left, setup.guides.right]).toContain(guides.guides[0]?.position)
  expect(guides.spacingGuides).toHaveLength(0)

  await selection.scaling.finish()
})

test('при скейлинге за угол относительно центра сохраняет центр и прилипает по обеим осям', async({
  activeSelectionImageScaleSetup: setup,
  selection,
  snapping
}) => {
  await selection.scaling.startFromControl({ centered: true, control: 'br' })
  const live = await selection.scaling.dragControlToScenePoint({
    point: {
      x: setup.guides.right,
      y: setup.guides.bottom
    }
  })
  const guides = await snapping.getGuideState()
  const verticalGuides = guides.guides.filter(({ type }) => type === 'vertical')
  const horizontalGuides = guides.guides.filter(({ type }) => type === 'horizontal')

  expect(live.boundsLeft).toBeCloseTo(setup.guides.left, 5)
  expect(live.boundsRight).toBeCloseTo(setup.guides.right, 5)
  expect(live.boundsTop).toBeCloseTo(setup.guides.top, 5)
  expect(live.boundsBottom).toBeCloseTo(setup.guides.bottom, 5)
  expect(live.centerX).toBeCloseTo(setup.initial.selection.centerX, 5)
  expect(live.centerY).toBeCloseTo(setup.initial.selection.centerY, 5)
  expect(guides.guides).toHaveLength(2)
  expect(verticalGuides).toHaveLength(1)
  expect(horizontalGuides).toHaveLength(1)
  expect([setup.guides.left, setup.guides.right]).toContain(verticalGuides[0]?.position)
  expect([setup.guides.top, setup.guides.bottom]).toContain(horizontalGuides[0]?.position)
  expect(guides.spacingGuides).toHaveLength(0)

  await selection.scaling.finish()
})

test('повёрнутое общее выделение прилипает при скейлинге за угол', async({
  activeSelectionImageScaleSetup: setup,
  selection,
  snapping
}) => {
  await selection.setAngle({ angle: ACTIVE_SELECTION_ROTATION_DEGREES })
  const rotated = await selection.getCompositionSnapshot()
  const fixedPoint = await selection.scaling.getControlScenePoint({ control: 'tl' })
  const movingPoint = await selection.scaling.getControlScenePoint({ control: 'br' })
  const multiplier = (setup.guides.right - fixedPoint.x)
    / (rotated.selection.boundsRight - fixedPoint.x)

  expect(multiplier).toBeGreaterThan(0)
  expect(multiplier).not.toBeCloseTo(1, 5)

  await selection.scaling.startFromControl({ control: 'br' })
  const live = await selection.scaling.dragControlToScenePoint({
    point: {
      x: fixedPoint.x + ((movingPoint.x - fixedPoint.x) * multiplier),
      y: fixedPoint.y + ((movingPoint.y - fixedPoint.y) * multiplier)
    }
  })
  const fixedAfter = await selection.scaling.getControlScenePoint({ control: 'tl' })
  const guides = await snapping.getGuideState()

  expect(live.angle).toBeCloseTo(ACTIVE_SELECTION_ROTATION_DEGREES, 5)
  expect(live.boundsRight).toBeCloseTo(setup.guides.right, 5)
  expect(fixedAfter.x).toBeCloseTo(fixedPoint.x, 5)
  expect(fixedAfter.y).toBeCloseTo(fixedPoint.y, 5)
  expect(guides.guides).toEqual(expect.arrayContaining([{
    type: 'vertical',
    position: setup.guides.right
  }]))
  expect(guides.guides).toHaveLength(1)
  expect(guides.spacingGuides).toHaveLength(0)

  const committed = await selection.scaling.finish()

  expect(committed).toEqual(live)
})

test('после изменения масштаба и положения холста прилипает в тех же координатах сцены', async({
  activeSelectionImageScaleSetup: setup,
  editorModel,
  selection,
  snapping
}) => {
  const viewportBefore = await editorModel.getCanvasViewportTransform()

  await editorModel.zoomInUntilViewportCanMove()
  await editorModel.dragViewportBySpaceMouse({ deltaX: -24, deltaY: -18 })

  const viewportAfter = await editorModel.getCanvasViewportTransform()

  expect(viewportAfter.zoom).toBeGreaterThan(viewportBefore.zoom)
  expect(viewportAfter.x).not.toBeCloseTo(viewportBefore.x, 5)
  expect(viewportAfter.y).not.toBeCloseTo(viewportBefore.y, 5)

  await selection.scaling.startFromControl({ control: 'br' })
  const live = await selection.scaling.dragControlToScenePoint({
    point: {
      x: setup.guides.right,
      y: setup.guides.bottom
    }
  })
  const guides = await snapping.getGuideState()

  expect(live.boundsLeft).toBeCloseTo(setup.initial.selection.boundsLeft, 5)
  expect(live.boundsTop).toBeCloseTo(setup.initial.selection.boundsTop, 5)
  expect(live.boundsRight).toBeCloseTo(setup.guides.right, 5)
  expect(live.boundsBottom).toBeCloseTo(setup.guides.bottom, 5)
  expect(guides.guides).toEqual(expect.arrayContaining([
    { type: 'vertical', position: setup.guides.right },
    { type: 'horizontal', position: setup.guides.bottom }
  ]))
  expect(guides.guides).toHaveLength(2)
  expect(guides.spacingGuides).toHaveLength(0)

  await selection.scaling.finish()
})
