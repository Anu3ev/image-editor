import {
  test,
  expect
} from '../../../fixtures/active-selection-moving.fixture'

test('при перемещении выделения с повёрнутыми шейпами направляющие удерживают выбранные границы', async({
  createActiveSelectionComposition,
  selection,
  snapping
}) => {
  const setup = await createActiveSelectionComposition({ kind: 'shapes', rotated: true })
  const baselineAngles = setup.initialComposition.children.map(({ angle }) => angle)

  expect(baselineAngles).toEqual(expect.arrayContaining([25, -20]))
  expect(baselineAngles).toHaveLength(2)

  await snapping.startObjectDrag({ activeObject: true })
  const snapped = await snapping.dragObjectBoundsTo({
    activeObject: true,
    left: setup.reference.boundsLeft + 1,
    top: setup.reference.boundsTop + 1
  })
  const snappedGuides = await snapping.getGuideState()
  const held = await snapping.dragObjectBoundsTo({
    activeObject: true,
    left: snapped.boundsLeft + 3,
    top: snapped.boundsTop + 3
  })
  const heldGuides = await snapping.getGuideState()
  const live = await selection.getCompositionSnapshot()
  const deltaX = live.selection.boundsLeft - setup.initialComposition.selection.boundsLeft
  const deltaY = live.selection.boundsTop - setup.initialComposition.selection.boundsTop

  expect(held).toEqual(snapped)
  expect(heldGuides).toEqual(snappedGuides)
  expect(snappedGuides.guides).toEqual(expect.arrayContaining([
    { type: 'vertical', position: setup.reference.boundsLeft },
    { type: 'horizontal', position: setup.reference.boundsTop }
  ]))
  expect(snappedGuides.guides).toHaveLength(2)
  expect(snappedGuides.spacingGuides).toHaveLength(0)

  for (const baselineChild of setup.initialComposition.children) {
    const liveChild = live.children.find(({ id }) => id === baselineChild.id)

    expect(liveChild, `${baselineChild.id}: повёрнутый шейп должен сохраниться`).toBeDefined()
    if (!liveChild) throw new Error(`После перемещения не найден повёрнутый шейп ${baselineChild.id}`)

    expect(liveChild.angle).toBeCloseTo(baselineChild.angle, 10)
    expect(liveChild.width).toBeCloseTo(baselineChild.width, 10)
    expect(liveChild.height).toBeCloseTo(baselineChild.height, 10)
    expect(liveChild.scaleX).toBeCloseTo(baselineChild.scaleX, 10)
    expect(liveChild.scaleY).toBeCloseTo(baselineChild.scaleY, 10)
    expect(liveChild.boundsWidth).toBeCloseTo(baselineChild.boundsWidth, 5)
    expect(liveChild.boundsHeight).toBeCloseTo(baselineChild.boundsHeight, 5)
    expect(liveChild.boundsLeft).toBeCloseTo(baselineChild.boundsLeft + deltaX, 5)
    expect(liveChild.boundsTop).toBeCloseTo(baselineChild.boundsTop + deltaY, 5)
  }

  const clearedGuides = await snapping.finishPointerInteraction()
  const committed = await selection.getCompositionSnapshot()

  expect(committed).toEqual(live)
  expect(clearedGuides.guides).toHaveLength(0)
  expect(clearedGuides.spacingGuides).toHaveLength(0)
})

test('после изменения масштаба и положения области просмотра общее выделение прилипает без смещения', async({
  activeSelectionMovingSetup: setup,
  editorModel,
  snapping
}) => {
  const viewportBefore = await editorModel.getCanvasViewportTransform()

  await editorModel.zoomInUntilViewportCanMove()
  await editorModel.dragViewportBySpaceMouse({ deltaX: -24, deltaY: -18 })

  const viewportAfter = await editorModel.getCanvasViewportTransform()

  expect(viewportAfter.zoom).toBeGreaterThan(viewportBefore.zoom)
  expect(viewportAfter.x).not.toBeCloseTo(viewportBefore.x, 5)
  expect(viewportAfter.y).not.toBeCloseTo(viewportBefore.y, 5)

  await snapping.startObjectDrag({ activeObject: true })
  const snapped = await snapping.dragObjectBoundsTo({
    activeObject: true,
    left: setup.reference.boundsLeft + 1,
    top: setup.reference.boundsTop + 1
  })
  const snappedGuides = await snapping.getGuideState()
  const held = await snapping.dragObjectBoundsTo({
    activeObject: true,
    left: snapped.boundsLeft + 3,
    top: snapped.boundsTop + 3
  })
  const heldGuides = await snapping.getGuideState()

  expect(snapped.boundsLeft).toBeCloseTo(setup.reference.boundsLeft, 5)
  expect(snapped.boundsTop).toBeCloseTo(setup.reference.boundsTop, 5)
  expect(held).toEqual(snapped)
  expect(heldGuides).toEqual(snappedGuides)
  expect(snappedGuides.guides).toEqual(expect.arrayContaining([
    { type: 'vertical', position: setup.reference.boundsLeft },
    { type: 'horizontal', position: setup.reference.boundsTop }
  ]))
  expect(snappedGuides.guides).toHaveLength(2)
  expect(snappedGuides.spacingGuides).toHaveLength(0)

  const clearedGuides = await snapping.finishPointerInteraction()
  const committed = await snapping.getObjectSnapshot({ activeObject: true })

  expect(committed).toEqual(snapped)
  expect(clearedGuides.guides).toHaveLength(0)
  expect(clearedGuides.spacingGuides).toHaveLength(0)
})
