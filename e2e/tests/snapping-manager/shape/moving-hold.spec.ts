import { test, expect } from '../../../fixtures/editor.fixture'
import { SNAPPING_TOLERANCE } from '../../../fixtures/data/snapping.data'
import type { SnappingObjectSnapshot } from '../../../types'

/** Данные шейпа и опорного объекта для проверки удержания направляющих. */
type ShapeMovementSetup = {
  activeShapeId: string
  reference: SnappingObjectSnapshot
}

let setup: ShapeMovementSetup

test.beforeEach(async({
  editorModel,
  shapes,
  snapping
}) => {
  const montageBounds = await editorModel.getMontageAreaBounds()
  const activeShape = await shapes.addAtBounds({
    presetKey: 'square',
    options: {
      id: 'active-shape',
      left: montageBounds.left + 240,
      top: montageBounds.top + 120,
      width: 30,
      height: 30,
      text: ''
    }
  })
  const referenceShape = await shapes.addAtBounds({
    presetKey: 'square',
    options: {
      id: 'reference-shape',
      left: montageBounds.left + 100,
      top: montageBounds.top + 120,
      width: 12,
      height: 40,
      text: ''
    }
  })

  shapes.checkCreation({ shape: activeShape, presetKey: 'square' })
  shapes.checkCreation({ shape: referenceShape, presetKey: 'square' })

  setup = {
    activeShapeId: 'active-shape',
    reference: await snapping.getObjectSnapshot({ id: 'reference-shape' })
  }
})

test('при нескольких микродвижениях шейп сохраняет выбранные направляющие', async({
  snapping
}) => {
  await snapping.startObjectDrag({ id: setup.activeShapeId })
  const snapped = await snapping.dragObjectBoundsTo({
    id: setup.activeShapeId,
    left: setup.reference.boundsLeft + 1,
    top: setup.reference.boundsTop + 1
  })

  expect(snapped.boundsLeft).toBeCloseTo(setup.reference.boundsLeft, 1)
  expect(snapped.boundsTop).toBeCloseTo(setup.reference.boundsTop, 1)

  let held = snapped
  for (const offset of [2, 3, 4]) {
    held = await snapping.dragObjectBoundsTo({
      id: setup.activeShapeId,
      left: snapped.boundsLeft + offset,
      top: snapped.boundsTop + offset
    })
    const guideState = await snapping.getGuideState()

    expect(held.boundsLeft).toBeCloseTo(snapped.boundsLeft, 1)
    expect(held.boundsTop).toBeCloseTo(snapped.boundsTop, 1)
    expect(held.boundsWidth).toBeCloseTo(snapped.boundsWidth, 5)
    expect(held.boundsHeight).toBeCloseTo(snapped.boundsHeight, 5)
    expect(guideState.guides).toHaveLength(2)
    expect(guideState.guides).toEqual(expect.arrayContaining([
      {
        type: 'vertical',
        position: setup.reference.boundsLeft
      },
      {
        type: 'horizontal',
        position: setup.reference.boundsTop
      }
    ]))
    expect(guideState.spacingGuides).toHaveLength(0)
  }

  const clearedGuides = await snapping.finishPointerInteraction()
  const committed = await snapping.getObjectSnapshot({ id: setup.activeShapeId })

  expect(committed.boundsLeft).toBeCloseTo(held.boundsLeft, 1)
  expect(committed.boundsTop).toBeCloseTo(held.boundsTop, 1)
  expect(clearedGuides.guides).toHaveLength(0)
  expect(clearedGuides.spacingGuides).toHaveLength(0)
})

test('при выходе по горизонтали отпускает только вертикальную направляющую', async({
  snapping
}) => {
  await snapping.startObjectDrag({ id: setup.activeShapeId })
  const snapped = await snapping.dragObjectBoundsTo({
    id: setup.activeShapeId,
    left: setup.reference.boundsLeft + 1,
    top: setup.reference.boundsTop + 1
  })

  expect(snapped.boundsLeft).toBeCloseTo(setup.reference.boundsLeft, 1)
  expect(snapped.boundsTop).toBeCloseTo(setup.reference.boundsTop, 1)

  const releasedX = await snapping.dragObjectBoundsTo({
    id: setup.activeShapeId,
    left: snapped.boundsLeft + 40,
    top: snapped.boundsTop + 4
  })
  const guideState = await snapping.getGuideState()
  const verticalGuides = guideState.guides.filter((guide) => guide.type === 'vertical')
  const horizontalGuides = guideState.guides.filter((guide) => guide.type === 'horizontal')

  expect(Math.abs(releasedX.boundsLeft - snapped.boundsLeft))
    .toBeGreaterThan(SNAPPING_TOLERANCE.position)
  expect(releasedX.boundsTop).toBeCloseTo(snapped.boundsTop, 1)
  expect(verticalGuides).toHaveLength(0)
  expect(horizontalGuides).toEqual([{
    type: 'horizontal',
    position: setup.reference.boundsTop
  }])
  expect(guideState.spacingGuides).toHaveLength(0)

  await snapping.finishPointerInteraction()
})

test('при выходе по вертикали отпускает только горизонтальную направляющую', async({
  snapping
}) => {
  await snapping.startObjectDrag({ id: setup.activeShapeId })
  const snapped = await snapping.dragObjectBoundsTo({
    id: setup.activeShapeId,
    left: setup.reference.boundsLeft + 1,
    top: setup.reference.boundsTop + 1
  })

  expect(snapped.boundsLeft).toBeCloseTo(setup.reference.boundsLeft, 1)
  expect(snapped.boundsTop).toBeCloseTo(setup.reference.boundsTop, 1)

  const releasedY = await snapping.dragObjectBoundsTo({
    id: setup.activeShapeId,
    left: snapped.boundsLeft + 4,
    top: snapped.boundsTop + 50
  })
  const guideState = await snapping.getGuideState()
  const verticalGuides = guideState.guides.filter((guide) => guide.type === 'vertical')
  const horizontalGuides = guideState.guides.filter((guide) => guide.type === 'horizontal')

  expect(releasedY.boundsLeft).toBeCloseTo(snapped.boundsLeft, 1)
  expect(Math.abs(releasedY.boundsTop - snapped.boundsTop))
    .toBeGreaterThan(SNAPPING_TOLERANCE.position)
  expect(verticalGuides).toEqual([{
    type: 'vertical',
    position: setup.reference.boundsLeft
  }])
  expect(horizontalGuides).toHaveLength(0)
  expect(guideState.spacingGuides).toHaveLength(0)

  await snapping.finishPointerInteraction()
})

test('при нажатии Ctrl снимает удержание и после отпускания снова прилипает', async({
  snapping
}) => {
  await snapping.startObjectDrag({ id: setup.activeShapeId })
  const snapped = await snapping.dragObjectBoundsTo({
    id: setup.activeShapeId,
    left: setup.reference.boundsLeft + 1,
    top: setup.reference.boundsTop + 1
  })
  const withoutSnap = await snapping.dragObjectBoundsTo({
    id: setup.activeShapeId,
    left: snapped.boundsLeft + 4,
    top: snapped.boundsTop + 4,
    ctrlKey: true
  })
  const disabledGuides = await snapping.getGuideState()

  expect(Math.abs(withoutSnap.boundsLeft - (snapped.boundsLeft + 4)))
    .toBeLessThanOrEqual(SNAPPING_TOLERANCE.position)
  expect(Math.abs(withoutSnap.boundsTop - (snapped.boundsTop + 4)))
    .toBeLessThanOrEqual(SNAPPING_TOLERANCE.position)
  expect(disabledGuides.guides).toHaveLength(0)
  expect(disabledGuides.spacingGuides).toHaveLength(0)

  const reacquired = await snapping.dragObjectBoundsTo({
    id: setup.activeShapeId,
    left: setup.reference.centerX + 1,
    top: withoutSnap.boundsTop
  })
  const enabledGuides = await snapping.getGuideState()

  expect(reacquired.boundsLeft).toBeCloseTo(setup.reference.centerX, 1)
  expect(reacquired.boundsLeft).not.toBeCloseTo(snapped.boundsLeft, 1)
  expect(enabledGuides.guides).toEqual(expect.arrayContaining([
    {
      type: 'vertical',
      position: setup.reference.centerX
    },
    {
      type: 'horizontal',
      position: setup.reference.centerY
    }
  ]))
  expect(enabledGuides.guides).toHaveLength(2)
  expect(enabledGuides.spacingGuides).toHaveLength(0)

  await snapping.finishPointerInteraction()
})
