import {
  test,
  expect
} from '../../../fixtures/group-moving.fixture'

/** Смещения указателя внутри области удержания равноудалённого прилипания. */
const SPACING_HOLD_OFFSETS = [2, 3, 4] as const

test('при микродвижениях верхнеуровневая группа сохраняет равноудалённость по горизонтали', async({
  groupHorizontalSpacingSetup: setup,
  snapping
}) => {
  const freeTop = setup.left.boundsTop + 70

  await snapping.startObjectDrag({ id: setup.groupId })
  const snapped = await snapping.dragObjectBoundsTo({
    id: setup.groupId,
    left: setup.expectedLeft + 3,
    top: freeTop
  })
  const initialGuides = await snapping.getGuideState()
  const leftGap = snapped.boundsLeft - setup.left.boundsRight
  const rightGap = setup.right.boundsLeft - snapped.boundsRight

  expect(snapped.boundsLeft).toBeCloseTo(setup.expectedLeft, 5)
  expect(leftGap).toBeCloseTo(rightGap, 5)
  expect(initialGuides.spacingGuides).toEqual([{
    type: 'horizontal',
    axis: snapped.centerY,
    refStart: setup.left.boundsRight,
    refEnd: snapped.boundsLeft,
    activeStart: snapped.boundsRight,
    activeEnd: setup.right.boundsLeft,
    distance: Math.round(leftGap)
  }])

  for (const offset of SPACING_HOLD_OFFSETS) {
    const held = await snapping.dragObjectBoundsTo({
      id: setup.groupId,
      left: snapped.boundsLeft + offset,
      top: freeTop
    })
    const heldGuides = await snapping.getGuideState()

    expect(held.boundsLeft).toBeCloseTo(snapped.boundsLeft, 5)
    expect(held.boundsTop).toBeCloseTo(snapped.boundsTop, 5)
    expect(held.boundsWidth).toBeCloseTo(snapped.boundsWidth, 5)
    expect(held.boundsHeight).toBeCloseTo(snapped.boundsHeight, 5)
    expect(heldGuides).toEqual(initialGuides)
  }

  const clearedGuides = await snapping.finishPointerInteraction()
  const committed = await snapping.getObjectSnapshot({ id: setup.groupId })

  expect(committed).toEqual(snapped)
  expect(clearedGuides.guides).toHaveLength(0)
  expect(clearedGuides.spacingGuides).toHaveLength(0)
})

test('при микродвижениях верхнеуровневая группа сохраняет равноудалённость по вертикали', async({
  groupVerticalSpacingSetup: setup,
  snapping
}) => {
  const freeLeft = setup.top.boundsLeft + 50

  await snapping.startObjectDrag({ id: setup.groupId })
  const snapped = await snapping.dragObjectBoundsTo({
    id: setup.groupId,
    left: freeLeft,
    top: setup.expectedTop + 3
  })
  const initialGuides = await snapping.getGuideState()
  const topGap = snapped.boundsTop - setup.top.boundsBottom
  const bottomGap = setup.bottom.boundsTop - snapped.boundsBottom

  expect(snapped.boundsTop).toBeCloseTo(setup.expectedTop, 5)
  expect(topGap).toBeCloseTo(bottomGap, 5)
  expect(initialGuides.spacingGuides).toEqual([{
    type: 'vertical',
    axis: snapped.centerX,
    refStart: setup.top.boundsBottom,
    refEnd: snapped.boundsTop,
    activeStart: snapped.boundsBottom,
    activeEnd: setup.bottom.boundsTop,
    distance: Math.round(topGap)
  }])

  for (const offset of SPACING_HOLD_OFFSETS) {
    const held = await snapping.dragObjectBoundsTo({
      id: setup.groupId,
      left: freeLeft,
      top: snapped.boundsTop + offset
    })
    const heldGuides = await snapping.getGuideState()

    expect(held.boundsLeft).toBeCloseTo(snapped.boundsLeft, 5)
    expect(held.boundsTop).toBeCloseTo(snapped.boundsTop, 5)
    expect(held.boundsWidth).toBeCloseTo(snapped.boundsWidth, 5)
    expect(held.boundsHeight).toBeCloseTo(snapped.boundsHeight, 5)
    expect(heldGuides).toEqual(initialGuides)
  }

  const clearedGuides = await snapping.finishPointerInteraction()
  const committed = await snapping.getObjectSnapshot({ id: setup.groupId })

  expect(committed).toEqual(snapped)
  expect(clearedGuides.guides).toHaveLength(0)
  expect(clearedGuides.spacingGuides).toHaveLength(0)
})
