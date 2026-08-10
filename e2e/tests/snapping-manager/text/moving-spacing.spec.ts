import { test, expect } from '../../../fixtures/text-moving-spacing.fixture'

test('при микродвижениях отдельный текст сохраняет равноудалённость по горизонтали', async({
  textMovingSpacingSetup: setup,
  snapping
}) => {
  await snapping.startObjectDrag({ id: setup.activeTextId })
  const snapped = await snapping.dragObjectBoundsTo({
    id: setup.activeTextId,
    left: setup.expectedLeft + 3,
    top: setup.left.boundsTop + 25
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

  for (const offset of [2, 3, 4]) {
    const held = await snapping.dragObjectBoundsTo({
      id: setup.activeTextId,
      left: snapped.boundsLeft + offset,
      top: snapped.boundsTop
    })
    const guideState = await snapping.getGuideState()

    expect(held.boundsLeft).toBeCloseTo(snapped.boundsLeft, 5)
    expect(held.boundsTop).toBeCloseTo(snapped.boundsTop, 5)
    expect(held.boundsWidth).toBeCloseTo(snapped.boundsWidth, 5)
    expect(held.boundsHeight).toBeCloseTo(snapped.boundsHeight, 5)
    expect(guideState).toEqual(initialGuides)
  }

  const clearedGuides = await snapping.finishPointerInteraction()
  const committed = await snapping.getObjectSnapshot({ id: setup.activeTextId })

  expect(committed.boundsLeft).toBeCloseTo(snapped.boundsLeft, 5)
  expect(committed.boundsTop).toBeCloseTo(snapped.boundsTop, 5)
  expect(clearedGuides.guides).toHaveLength(0)
  expect(clearedGuides.spacingGuides).toHaveLength(0)
})

test('при микродвижениях отдельный текст сохраняет равноудалённость по вертикали', async({
  textMovingSpacingSetup: setup,
  snapping
}) => {
  await snapping.startObjectDrag({ id: setup.activeTextId })
  const snapped = await snapping.dragObjectBoundsTo({
    id: setup.activeTextId,
    left: setup.top.boundsLeft + 40,
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

  for (const offset of [2, 3, 4]) {
    const held = await snapping.dragObjectBoundsTo({
      id: setup.activeTextId,
      left: snapped.boundsLeft,
      top: snapped.boundsTop + offset
    })
    const guideState = await snapping.getGuideState()

    expect(held.boundsLeft).toBeCloseTo(snapped.boundsLeft, 5)
    expect(held.boundsTop).toBeCloseTo(snapped.boundsTop, 5)
    expect(held.boundsWidth).toBeCloseTo(snapped.boundsWidth, 5)
    expect(held.boundsHeight).toBeCloseTo(snapped.boundsHeight, 5)
    expect(guideState).toEqual(initialGuides)
  }

  const clearedGuides = await snapping.finishPointerInteraction()
  const committed = await snapping.getObjectSnapshot({ id: setup.activeTextId })

  expect(committed.boundsLeft).toBeCloseTo(snapped.boundsLeft, 5)
  expect(committed.boundsTop).toBeCloseTo(snapped.boundsTop, 5)
  expect(clearedGuides.guides).toHaveLength(0)
  expect(clearedGuides.spacingGuides).toHaveLength(0)
})
