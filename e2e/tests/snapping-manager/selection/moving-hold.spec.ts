import {
  test,
  expect
} from '../../../fixtures/active-selection-moving.fixture'
import { SNAPPING_TOLERANCE } from '../../../fixtures/data/snapping.data'

test('при микродвижениях общее выделение сохраняет выбранные направляющие', async({
  activeSelectionMovingSetup,
  snapping
}) => {
  const { reference } = activeSelectionMovingSetup

  await snapping.startObjectDrag({ activeObject: true })
  const snapped = await snapping.dragObjectBoundsTo({
    activeObject: true,
    left: reference.boundsLeft + 1,
    top: reference.boundsTop + 1
  })
  const snappedGuides = await snapping.getGuideState()

  expect(snapped.boundsLeft).toBeCloseTo(reference.boundsLeft, 5)
  expect(snapped.boundsTop).toBeCloseTo(reference.boundsTop, 5)
  expect(snappedGuides.guides).toEqual(expect.arrayContaining([
    { type: 'vertical', position: reference.boundsLeft },
    { type: 'horizontal', position: reference.boundsTop }
  ]))
  expect(snappedGuides.guides).toHaveLength(2)
  expect(snappedGuides.spacingGuides).toHaveLength(0)

  for (const offset of [2, 3, 1]) {
    const held = await snapping.dragObjectBoundsTo({
      activeObject: true,
      left: snapped.boundsLeft + offset,
      top: snapped.boundsTop + offset
    })
    const heldGuides = await snapping.getGuideState()

    expect(held.boundsLeft).toBeCloseTo(snapped.boundsLeft, 5)
    expect(held.boundsTop).toBeCloseTo(snapped.boundsTop, 5)
    expect(held.boundsWidth).toBeCloseTo(snapped.boundsWidth, 5)
    expect(held.boundsHeight).toBeCloseTo(snapped.boundsHeight, 5)
    expect(heldGuides).toEqual(snappedGuides)
  }

  const clearedGuides = await snapping.finishPointerInteraction()
  const committed = await snapping.getObjectSnapshot({ activeObject: true })

  expect(committed).toEqual(snapped)
  expect(clearedGuides.guides).toHaveLength(0)
  expect(clearedGuides.spacingGuides).toHaveLength(0)
})

test('при подходе справа общее выделение прилипает к той же вертикальной направляющей', async({
  activeSelectionMovingSetup: setup,
  snapping
}) => {
  await snapping.startObjectDrag({ activeObject: true })
  const relocated = await snapping.dragObjectBoundsTo({
    activeObject: true,
    left: setup.reference.boundsLeft + 60,
    top: setup.initialComposition.selection.boundsTop + 37,
    ctrlKey: true
  })
  const guidesAfterRelocation = await snapping.getGuideState()

  expect(relocated.boundsLeft).toBeGreaterThan(setup.reference.boundsRight)
  expect(guidesAfterRelocation).toEqual({ guides: [], spacingGuides: [] })

  await snapping.finishPointerInteraction()
  await snapping.startObjectDrag({ activeObject: true })
  const snapped = await snapping.dragObjectBoundsTo({
    activeObject: true,
    left: setup.reference.boundsLeft + 1,
    top: relocated.boundsTop
  })
  const snappedGuides = await snapping.getGuideState()

  expect(snapped.boundsLeft).toBeCloseTo(setup.reference.boundsLeft, 5)
  expect(snappedGuides.guides.filter(({ type }) => type === 'vertical')).toEqual([{
    type: 'vertical',
    position: setup.reference.boundsLeft
  }])

  const held = await snapping.dragObjectBoundsTo({
    activeObject: true,
    left: snapped.boundsLeft - 3,
    top: snapped.boundsTop
  })
  const heldGuides = await snapping.getGuideState()

  expect(held.boundsLeft).toBeCloseTo(snapped.boundsLeft, 5)
  expect(held.boundsTop).toBeCloseTo(snapped.boundsTop, 5)
  expect(heldGuides).toEqual(snappedGuides)
  expect(heldGuides.spacingGuides).toHaveLength(0)

  await snapping.finishPointerInteraction()
})

test('при выходе по горизонтали общее выделение отпускает только вертикальную направляющую', async({
  activeSelectionMovingSetup,
  snapping
}) => {
  const { reference } = activeSelectionMovingSetup

  await snapping.startObjectDrag({ activeObject: true })
  const snapped = await snapping.dragObjectBoundsTo({
    activeObject: true,
    left: reference.boundsLeft + 1,
    top: reference.boundsTop + 1
  })
  const acquiredGuides = await snapping.getGuideState()

  expect(acquiredGuides.guides).toEqual(expect.arrayContaining([
    { type: 'vertical', position: reference.boundsLeft },
    { type: 'horizontal', position: reference.boundsTop }
  ]))
  expect(acquiredGuides.guides).toHaveLength(2)

  const released = await snapping.dragObjectBoundsTo({
    activeObject: true,
    left: snapped.boundsLeft + 70,
    top: snapped.boundsTop + 4
  })
  const releasedGuides = await snapping.getGuideState()

  expect(Math.abs(released.boundsLeft - snapped.boundsLeft))
    .toBeGreaterThan(SNAPPING_TOLERANCE.position)
  expect(released.boundsTop).toBeCloseTo(snapped.boundsTop, 5)
  expect(releasedGuides.guides.filter(({ type }) => type === 'vertical')).toHaveLength(0)
  expect(releasedGuides.guides.filter(({ type }) => type === 'horizontal')).toEqual([{
    type: 'horizontal',
    position: reference.boundsTop
  }])
  expect(releasedGuides.spacingGuides).toHaveLength(0)

  await snapping.finishPointerInteraction()
})

test('при выходе по вертикали общее выделение отпускает только горизонтальную направляющую', async({
  activeSelectionMovingSetup,
  snapping
}) => {
  const { reference } = activeSelectionMovingSetup

  await snapping.startObjectDrag({ activeObject: true })
  const snapped = await snapping.dragObjectBoundsTo({
    activeObject: true,
    left: reference.boundsLeft + 1,
    top: reference.boundsTop + 1
  })
  const acquiredGuides = await snapping.getGuideState()

  expect(acquiredGuides.guides).toEqual(expect.arrayContaining([
    { type: 'vertical', position: reference.boundsLeft },
    { type: 'horizontal', position: reference.boundsTop }
  ]))
  expect(acquiredGuides.guides).toHaveLength(2)

  const released = await snapping.dragObjectBoundsTo({
    activeObject: true,
    left: snapped.boundsLeft + 4,
    top: snapped.boundsTop + 50
  })
  const releasedGuides = await snapping.getGuideState()

  expect(released.boundsLeft).toBeCloseTo(snapped.boundsLeft, 5)
  expect(Math.abs(released.boundsTop - snapped.boundsTop))
    .toBeGreaterThan(SNAPPING_TOLERANCE.position)
  expect(releasedGuides.guides.filter(({ type }) => type === 'vertical')).toEqual([{
    type: 'vertical',
    position: reference.boundsLeft
  }])
  expect(releasedGuides.guides.filter(({ type }) => type === 'horizontal')).toHaveLength(0)
  expect(releasedGuides.spacingGuides).toHaveLength(0)

  await snapping.finishPointerInteraction()
})

test('при нажатии Ctrl общее выделение снимает удержание и после отпускания прилипает заново', async({
  activeSelectionMovingSetup,
  snapping
}) => {
  const { reference } = activeSelectionMovingSetup

  await snapping.startObjectDrag({ activeObject: true })
  const snapped = await snapping.dragObjectBoundsTo({
    activeObject: true,
    left: reference.boundsLeft + 1,
    top: reference.boundsTop + 1
  })
  const acquiredGuides = await snapping.getGuideState()

  expect(acquiredGuides.guides).toHaveLength(2)
  expect(acquiredGuides.spacingGuides).toHaveLength(0)

  const withoutSnap = await snapping.dragObjectBoundsTo({
    activeObject: true,
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
    activeObject: true,
    left: reference.centerX + 1,
    top: reference.centerY + 1
  })
  const enabledGuides = await snapping.getGuideState()

  expect(reacquired.boundsLeft).toBeCloseTo(reference.centerX, 5)
  expect(reacquired.boundsTop).toBeCloseTo(reference.centerY, 5)
  expect(enabledGuides.guides).toEqual(expect.arrayContaining([
    { type: 'vertical', position: reference.centerX },
    { type: 'horizontal', position: reference.centerY }
  ]))
  expect(enabledGuides.guides).toHaveLength(2)
  expect(enabledGuides.spacingGuides).toHaveLength(0)

  await snapping.finishPointerInteraction()
})
