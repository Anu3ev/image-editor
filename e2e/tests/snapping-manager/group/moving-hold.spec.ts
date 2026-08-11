import {
  test,
  expect
} from '../../../fixtures/group-moving.fixture'
import { SNAPPING_TOLERANCE } from '../../../fixtures/data/snapping.data'

test('при микродвижениях верхнеуровневая группа сохраняет выбранные направляющие и локальную геометрию детей', async({
  groupMovingSetup: setup,
  selection,
  snapping
}) => {
  await snapping.startObjectDrag({ id: setup.groupId })
  const snapped = await snapping.dragObjectBoundsTo({
    id: setup.groupId,
    left: setup.reference.boundsLeft + 1,
    top: setup.reference.boundsTop + 1
  })
  const snappedGuides = await snapping.getGuideState()

  expect(snapped.boundsLeft).toBeCloseTo(setup.reference.boundsLeft, 5)
  expect(snapped.boundsTop).toBeCloseTo(setup.reference.boundsTop, 5)
  expect(snappedGuides.guides).toEqual(expect.arrayContaining([
    { type: 'vertical', position: setup.reference.boundsLeft },
    { type: 'horizontal', position: setup.reference.boundsTop }
  ]))
  expect(snappedGuides.guides).toHaveLength(2)

  for (const offset of [2, 3, 1]) {
    const held = await snapping.dragObjectBoundsTo({
      id: setup.groupId,
      left: snapped.boundsLeft + offset,
      top: snapped.boundsTop + offset
    })
    const heldGuides = await snapping.getGuideState()
    const live = await selection.getCompositionSnapshot()

    expect(held.boundsLeft).toBeCloseTo(snapped.boundsLeft, 5)
    expect(held.boundsTop).toBeCloseTo(snapped.boundsTop, 5)
    expect(heldGuides).toEqual(snappedGuides)

    for (const initialChild of setup.initialComposition.children) {
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
    }
  }

  const clearedGuides = await snapping.finishPointerInteraction()
  const committed = await selection.getCompositionSnapshot()

  expect(committed.selection).toEqual(snapped)
  expect(clearedGuides.guides).toHaveLength(0)
  expect(clearedGuides.spacingGuides).toHaveLength(0)
})

test('при выходе по горизонтали группа отпускает только вертикальную направляющую', async({
  groupMovingSetup: setup,
  snapping
}) => {
  await snapping.startObjectDrag({ id: setup.groupId })
  const snapped = await snapping.dragObjectBoundsTo({
    id: setup.groupId,
    left: setup.reference.boundsLeft + 1,
    top: setup.reference.boundsTop + 1
  })
  const acquiredGuides = await snapping.getGuideState()

  expect(acquiredGuides.guides).toHaveLength(2)
  expect(acquiredGuides.spacingGuides).toHaveLength(0)

  const released = await snapping.dragObjectBoundsTo({
    id: setup.groupId,
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
    position: setup.reference.boundsTop
  }])

  await snapping.finishPointerInteraction()
})

test('при выходе по вертикали группа отпускает только горизонтальную направляющую', async({
  groupMovingSetup: setup,
  snapping
}) => {
  await snapping.startObjectDrag({ id: setup.groupId })
  const snapped = await snapping.dragObjectBoundsTo({
    id: setup.groupId,
    left: setup.reference.boundsLeft + 1,
    top: setup.reference.boundsTop + 1
  })
  const acquiredGuides = await snapping.getGuideState()

  expect(acquiredGuides.guides).toHaveLength(2)
  expect(acquiredGuides.spacingGuides).toHaveLength(0)

  const released = await snapping.dragObjectBoundsTo({
    id: setup.groupId,
    left: snapped.boundsLeft + 4,
    top: snapped.boundsTop + 70
  })
  const releasedGuides = await snapping.getGuideState()

  expect(released.boundsLeft).toBeCloseTo(snapped.boundsLeft, 5)
  expect(Math.abs(released.boundsTop - snapped.boundsTop))
    .toBeGreaterThan(SNAPPING_TOLERANCE.position)
  expect(releasedGuides.guides.filter(({ type }) => type === 'vertical')).toEqual([{
    type: 'vertical',
    position: setup.reference.boundsLeft
  }])
  expect(releasedGuides.guides.filter(({ type }) => type === 'horizontal')).toHaveLength(0)

  await snapping.finishPointerInteraction()
})

test('при нажатии Ctrl группа снимает удержание и после отпускания прилипает заново', async({
  groupMovingSetup: setup,
  snapping
}) => {
  await snapping.startObjectDrag({ id: setup.groupId })
  const snapped = await snapping.dragObjectBoundsTo({
    id: setup.groupId,
    left: setup.reference.boundsLeft + 1,
    top: setup.reference.boundsTop + 1
  })
  const acquiredGuides = await snapping.getGuideState()

  expect(acquiredGuides.guides).toHaveLength(2)
  expect(acquiredGuides.spacingGuides).toHaveLength(0)

  const withoutSnap = await snapping.dragObjectBoundsTo({
    id: setup.groupId,
    left: snapped.boundsLeft + 4,
    top: snapped.boundsTop + 4,
    ctrlKey: true
  })
  const disabledGuides = await snapping.getGuideState()

  expect(Math.abs(withoutSnap.boundsLeft - (snapped.boundsLeft + 4)))
    .toBeLessThanOrEqual(SNAPPING_TOLERANCE.position)
  expect(Math.abs(withoutSnap.boundsTop - (snapped.boundsTop + 4)))
    .toBeLessThanOrEqual(SNAPPING_TOLERANCE.position)
  expect(disabledGuides).toEqual({ guides: [], spacingGuides: [] })

  const reacquired = await snapping.dragObjectBoundsTo({
    id: setup.groupId,
    left: setup.reference.centerX + 1,
    top: setup.reference.centerY + 1
  })
  const enabledGuides = await snapping.getGuideState()

  expect(reacquired.boundsLeft).toBeCloseTo(setup.reference.centerX, 5)
  expect(reacquired.boundsTop).toBeCloseTo(setup.reference.centerY, 5)
  expect(enabledGuides.guides).toEqual(expect.arrayContaining([
    { type: 'vertical', position: setup.reference.centerX },
    { type: 'horizontal', position: setup.reference.centerY }
  ]))
  expect(enabledGuides.guides).toHaveLength(2)

  await snapping.finishPointerInteraction()
})
