import {
  test,
  expect
} from '../../../fixtures/group-moving.fixture'

/** Сложная геометрия группы перед проверкой обычного перемещения. */
const TRANSFORMED_GROUP_OPTIONS = {
  rotatedChildren: true,
  scaleBeforeMove: true,
  groupAngle: 24
} as const

test('повёрнутая и масштабированная группа прилипает при изменённой области просмотра', async({
  createGroupMovingSetup,
  editorModel,
  snapping
}) => {
  const setup = await createGroupMovingSetup(TRANSFORMED_GROUP_OPTIONS)
  const viewportBefore = await editorModel.getCanvasViewportTransform()

  expect(setup.initialComposition.selection.angle).toBeCloseTo(TRANSFORMED_GROUP_OPTIONS.groupAngle, 10)
  expect(Math.min(
    setup.initialComposition.selection.scaleX,
    setup.initialComposition.selection.scaleY
  )).toBeGreaterThan(1)

  await editorModel.zoomInUntilViewportCanMove()
  await editorModel.dragViewportBySpaceMouse({ deltaX: -24, deltaY: -18 })

  const viewportAfter = await editorModel.getCanvasViewportTransform()

  expect(viewportAfter.zoom).toBeGreaterThan(viewportBefore.zoom)
  expect(viewportAfter.x).not.toBeCloseTo(viewportBefore.x, 5)
  expect(viewportAfter.y).not.toBeCloseTo(viewportBefore.y, 5)

  await snapping.startObjectDrag({ id: setup.groupId })
  const snapped = await snapping.dragObjectBoundsTo({
    id: setup.groupId,
    left: setup.reference.boundsLeft + 1,
    top: setup.reference.boundsTop + 1
  })
  const guides = await snapping.getGuideState()

  expect(snapped.boundsLeft).toBeCloseTo(setup.reference.boundsLeft, 5)
  expect(snapped.boundsTop).toBeCloseTo(setup.reference.boundsTop, 5)
  expect(guides.guides).toEqual(expect.arrayContaining([
    { type: 'vertical', position: setup.reference.boundsLeft },
    { type: 'horizontal', position: setup.reference.boundsTop }
  ]))
  expect(guides.guides).toHaveLength(2)

  await snapping.finishPointerInteraction()
})

test('перемещение преобразованной группы сохраняет локальную геометрию и общий сдвиг детей', async({
  createGroupMovingSetup,
  selection,
  snapping
}) => {
  const setup = await createGroupMovingSetup(TRANSFORMED_GROUP_OPTIONS)
  const { initialComposition } = setup

  await snapping.startObjectDrag({ id: setup.groupId })
  const snapped = await snapping.dragObjectBoundsTo({
    id: setup.groupId,
    left: setup.reference.boundsLeft + 1,
    top: setup.reference.boundsTop + 1
  })
  const live = await selection.getCompositionSnapshot()
  const deltaX = live.selection.boundsLeft - initialComposition.selection.boundsLeft
  const deltaY = live.selection.boundsTop - initialComposition.selection.boundsTop

  expect(live.selection).toMatchObject({
    angle: initialComposition.selection.angle,
    height: initialComposition.selection.height,
    scaleX: initialComposition.selection.scaleX,
    scaleY: initialComposition.selection.scaleY,
    width: initialComposition.selection.width
  })
  expect(live.children.map(({ id }) => id)).toEqual(initialComposition.children.map(({ id }) => id))

  for (const initialChild of initialComposition.children) {
    const liveChild = live.children.find(({ id }) => id === initialChild.id)

    expect(liveChild, `${initialChild.id}: дочерний объект должен сохраниться`).toBeDefined()
    if (!liveChild) throw new Error(`После перемещения не найден дочерний объект ${initialChild.id}`)

    expect(liveChild).toMatchObject({
      angle: initialChild.angle,
      height: initialChild.height,
      left: initialChild.left,
      scaleX: initialChild.scaleX,
      scaleY: initialChild.scaleY,
      top: initialChild.top,
      width: initialChild.width
    })
    expect(liveChild.boundsLeft).toBeCloseTo(initialChild.boundsLeft + deltaX, 5)
    expect(liveChild.boundsTop).toBeCloseTo(initialChild.boundsTop + deltaY, 5)
    expect(liveChild.boundsWidth).toBeCloseTo(initialChild.boundsWidth, 5)
    expect(liveChild.boundsHeight).toBeCloseTo(initialChild.boundsHeight, 5)
  }

  const clearedGuides = await snapping.finishPointerInteraction()
  const committed = await selection.getCompositionSnapshot()

  expect(committed).toEqual(live)
  expect(committed.selection).toEqual(snapped)
  expect(clearedGuides).toEqual({ guides: [], spacingGuides: [] })
})
