import { test, expect } from '../../../fixtures/editor.fixture'
import { SNAPPING_TOLERANCE } from '../../../fixtures/data/snapping.data'
import type { SnappingObjectSnapshot } from '../../../types'

/** Геометрия трёх шейпов для проверки равноудалённости. */
type ShapeSpacingSetup = {
  activeShapeId: string
  active: SnappingObjectSnapshot
  left: SnappingObjectSnapshot
  right: SnappingObjectSnapshot
  expectedLeft: number
}

let setup: ShapeSpacingSetup

test.beforeEach(async({
  editorModel,
  shapes,
  snapping
}) => {
  const montageBounds = await editorModel.getMontageAreaBounds()
  const top = montageBounds.top + 300
  const leftShape = await shapes.addAtBounds({
    presetKey: 'square',
    options: {
      id: 'left-shape',
      left: montageBounds.left + 60,
      top,
      width: 60,
      height: 100,
      text: ''
    }
  })
  const rightShape = await shapes.addAtBounds({
    presetKey: 'square',
    options: {
      id: 'right-shape',
      left: montageBounds.left + 280,
      top,
      width: 60,
      height: 100,
      text: ''
    }
  })
  const activeShape = await shapes.addAtBounds({
    presetKey: 'square',
    options: {
      id: 'active-shape',
      left: montageBounds.left + 210,
      top: top + 70,
      width: 40,
      height: 40,
      text: ''
    }
  })

  shapes.checkCreation({ shape: leftShape, presetKey: 'square' })
  shapes.checkCreation({ shape: rightShape, presetKey: 'square' })
  shapes.checkCreation({ shape: activeShape, presetKey: 'square' })

  const left = await snapping.getObjectSnapshot({ id: 'left-shape' })
  const right = await snapping.getObjectSnapshot({ id: 'right-shape' })
  const active = await snapping.getObjectSnapshot({ id: 'active-shape' })
  const expectedLeft = left.boundsRight
    + ((right.boundsLeft - left.boundsRight - active.boundsWidth) / 2)

  setup = {
    activeShapeId: 'active-shape',
    active,
    left,
    right,
    expectedLeft
  }
})

test('между двумя объектами шейп встаёт на одинаковое расстояние от обоих', async({
  snapping
}) => {
  await snapping.startObjectDrag({ id: setup.activeShapeId })
  const snapshot = await snapping.dragObjectBoundsTo({
    id: setup.activeShapeId,
    left: setup.expectedLeft + 3,
    top: setup.active.boundsTop
  })
  const guideState = await snapping.getGuideState()
  const leftGap = snapshot.boundsLeft - setup.left.boundsRight
  const rightGap = setup.right.boundsLeft - snapshot.boundsRight

  expect(snapshot.boundsLeft).toBeCloseTo(setup.expectedLeft, 5)
  expect(leftGap).toBeCloseTo(rightGap, 5)
  expect(guideState.guides).toHaveLength(0)
  expect(guideState.spacingGuides).toEqual([{
    type: 'horizontal',
    axis: snapshot.centerY,
    refStart: setup.left.boundsRight,
    refEnd: snapshot.boundsLeft,
    activeStart: snapshot.boundsRight,
    activeEnd: setup.right.boundsLeft,
    distance: leftGap
  }])

  await snapping.finishPointerInteraction()
})

test('при нескольких микродвижениях шейп сохраняет выбранную равноудалённость', async({
  snapping
}) => {
  await snapping.startObjectDrag({ id: setup.activeShapeId })
  const snapped = await snapping.dragObjectBoundsTo({
    id: setup.activeShapeId,
    left: setup.expectedLeft + 3,
    top: setup.active.boundsTop
  })
  const initialGuides = await snapping.getGuideState()

  expect(initialGuides.spacingGuides).toHaveLength(1)
  expect(initialGuides.guides).toHaveLength(0)
  expect(snapped.boundsLeft).toBeCloseTo(setup.expectedLeft, 5)

  for (const offset of [2, 3, 4]) {
    const held = await snapping.dragObjectBoundsTo({
      id: setup.activeShapeId,
      left: snapped.boundsLeft + offset,
      top: snapped.boundsTop
    })
    const guideState = await snapping.getGuideState()

    expect(held.boundsLeft).toBeCloseTo(snapped.boundsLeft, 5)
    expect(held.boundsWidth).toBeCloseTo(snapped.boundsWidth, 5)
    expect(held.boundsHeight).toBeCloseTo(snapped.boundsHeight, 5)
    expect(guideState).toEqual(initialGuides)
  }

  await snapping.finishPointerInteraction()
})

test('после выхода за пределы удержания шейп перестаёт сохранять равноудалённость', async({
  snapping
}) => {
  await snapping.startObjectDrag({ id: setup.activeShapeId })
  await snapping.dragObjectBoundsTo({
    id: setup.activeShapeId,
    left: setup.expectedLeft + 3,
    top: setup.active.boundsTop
  })
  const snappedGuides = await snapping.getGuideState()

  expect(snappedGuides.spacingGuides).toHaveLength(1)

  const released = await snapping.dragObjectBoundsTo({
    id: setup.activeShapeId,
    left: setup.expectedLeft + 20,
    top: setup.active.boundsTop
  })
  const releasedGuides = await snapping.getGuideState()
  const leftGap = released.boundsLeft - setup.left.boundsRight
  const rightGap = setup.right.boundsLeft - released.boundsRight

  expect(releasedGuides.guides).toHaveLength(0)
  expect(releasedGuides.spacingGuides).toHaveLength(0)
  expect(Math.abs(leftGap - rightGap)).toBeGreaterThan(SNAPPING_TOLERANCE.position)

  await snapping.finishPointerInteraction()
})
