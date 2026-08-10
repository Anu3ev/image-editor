import {
  test,
  expect
} from '../../../fixtures/active-selection-moving.fixture'
import { SNAPPING_TOLERANCE } from '../../../fixtures/data/snapping.data'

test('одно перемещение общего выделения создаёт одну запись и восстанавливает дочерние объекты через undo/redo', async({
  activeSelectionMovingSetup: setup,
  history,
  selection,
  snapping
}) => {
  const pendingSaveFlushed = await history.flushPendingSave()
  const historyBefore = await history.getPosition()

  expect(pendingSaveFlushed, 'подготовка не должна оставлять отложенное сохранение').toBe(false)
  expect(setup.initialComposition.children).toHaveLength(setup.childIds.length)

  await snapping.startObjectDrag({ activeObject: true })
  await snapping.dragObjectBoundsTo({
    activeObject: true,
    left: setup.reference.boundsLeft + 1,
    top: setup.reference.boundsTop + 1
  })
  const live = await selection.getCompositionSnapshot()
  const guidesBeforeMouseUp = await snapping.getGuideState()

  expect(guidesBeforeMouseUp.guides).toHaveLength(2)
  expect(guidesBeforeMouseUp.spacingGuides).toHaveLength(0)

  const clearedGuides = await snapping.finishPointerInteraction()
  const committed = await selection.getCompositionSnapshot()
  const historySaved = await history.flushPendingSave()
  const historyAfter = await history.getPosition()

  expect(historySaved, 'object:modified должен сохранить завершённое перемещение').toBe(true)
  expect(committed).toEqual(live)
  expect(clearedGuides.guides).toHaveLength(0)
  expect(clearedGuides.spacingGuides).toHaveLength(0)
  expect(historyAfter.patchCount).toBe(historyBefore.patchCount + 1)
  expect(historyAfter.currentIndex).toBe(historyBefore.currentIndex + 1)

  await history.undo()

  for (const baselineChild of setup.initialComposition.children) {
    const restored = await snapping.getObjectSnapshot({ id: baselineChild.id })

    expect(restored.boundsLeft).toBeCloseTo(baselineChild.boundsLeft, 5)
    expect(restored.boundsTop).toBeCloseTo(baselineChild.boundsTop, 5)
    expect(restored.boundsWidth).toBeCloseTo(baselineChild.boundsWidth, 5)
    expect(restored.boundsHeight).toBeCloseTo(baselineChild.boundsHeight, 5)
    expect(restored.width).toBeCloseTo(baselineChild.width, 10)
    expect(restored.height).toBeCloseTo(baselineChild.height, 10)
    expect(restored.scaleX).toBeCloseTo(baselineChild.scaleX, 10)
    expect(restored.scaleY).toBeCloseTo(baselineChild.scaleY, 10)
    expect(restored.angle).toBeCloseTo(baselineChild.angle, 10)
  }

  await history.redo()

  for (const committedChild of committed.children) {
    const redone = await snapping.getObjectSnapshot({ id: committedChild.id })

    expect(redone.boundsLeft).toBeCloseTo(committedChild.boundsLeft, 5)
    expect(redone.boundsTop).toBeCloseTo(committedChild.boundsTop, 5)
    expect(redone.boundsWidth).toBeCloseTo(committedChild.boundsWidth, 5)
    expect(redone.boundsHeight).toBeCloseTo(committedChild.boundsHeight, 5)
    expect(redone.width).toBeCloseTo(committedChild.width, 10)
    expect(redone.height).toBeCloseTo(committedChild.height, 10)
    expect(redone.scaleX).toBeCloseTo(committedChild.scaleX, 10)
    expect(redone.scaleY).toBeCloseTo(committedChild.scaleY, 10)
    expect(redone.angle).toBeCloseTo(committedChild.angle, 10)
  }
})

test('новое перемещение общего выделения не наследует удержание завершённого жеста', async({
  activeSelectionMovingSetup: setup,
  shapes,
  snapping
}) => {
  await snapping.startObjectDrag({ activeObject: true })
  const firstSnap = await snapping.dragObjectBoundsTo({
    activeObject: true,
    left: setup.reference.boundsLeft + 1,
    top: setup.reference.boundsTop + 1
  })
  const acquiredGuides = await snapping.getGuideState()

  expect(acquiredGuides.guides).toHaveLength(2)
  expect(acquiredGuides.spacingGuides).toHaveLength(0)

  await snapping.finishPointerInteraction()
  const referenceRemoved = await shapes.remove({ id: setup.referenceId })

  expect(referenceRemoved).toBe(true)
  expect(await snapping.getGuideState()).toEqual({ guides: [], spacingGuides: [] })

  await snapping.startObjectDrag({ activeObject: true })
  const freshGesture = await snapping.dragObjectBoundsTo({
    activeObject: true,
    left: firstSnap.boundsLeft + 8,
    top: firstSnap.boundsTop + 8
  })
  const freshGuides = await snapping.getGuideState()

  expect(Math.abs(freshGesture.boundsLeft - firstSnap.boundsLeft))
    .toBeGreaterThan(SNAPPING_TOLERANCE.position)
  expect(Math.abs(freshGesture.boundsTop - firstSnap.boundsTop))
    .toBeGreaterThan(SNAPPING_TOLERANCE.position)
  expect(Math.abs(freshGesture.boundsLeft - (firstSnap.boundsLeft + 8)))
    .toBeLessThanOrEqual(SNAPPING_TOLERANCE.position)
  expect(Math.abs(freshGesture.boundsTop - (firstSnap.boundsTop + 8)))
    .toBeLessThanOrEqual(SNAPPING_TOLERANCE.position)
  expect(freshGuides.guides).toHaveLength(0)
  expect(freshGuides.spacingGuides).toHaveLength(0)

  await snapping.finishPointerInteraction()
})

test('скопированное общее выделение перемещается с сохранением локальной геометрии дочерних объектов', async({
  activeSelectionMovingSetup: setup,
  clipboard,
  selection,
  snapping
}) => {
  await clipboard.copy()
  await clipboard.waitForClipboardReady()
  const pasted = await clipboard.paste()
  const baseline = await selection.getCompositionSnapshot()
  const sourceIds = new Set(setup.childIds)

  expect(pasted).toBe(true)
  expect(baseline.children).toHaveLength(setup.childIds.length)
  expect(baseline.children.every(({ id }) => !sourceIds.has(id))).toBe(true)

  await snapping.startObjectDrag({ activeObject: true })
  const snapped = await snapping.dragObjectBoundsTo({
    activeObject: true,
    left: setup.reference.boundsLeft + 1,
    top: setup.reference.boundsTop + 1
  })
  const held = await snapping.dragObjectBoundsTo({
    activeObject: true,
    left: snapped.boundsLeft + 3,
    top: snapped.boundsTop + 3
  })
  const live = await selection.getCompositionSnapshot()

  expect(held).toEqual(snapped)
  expect(live.selection).toEqual(held)
  for (const baselineChild of baseline.children) {
    const liveChild = live.children.find(({ id }) => id === baselineChild.id)

    expect(liveChild, `${baselineChild.id}: скопированный объект должен сохраниться`).toBeDefined()
    if (!liveChild) throw new Error(`После перемещения не найден объект ${baselineChild.id}`)

    expect(liveChild).toMatchObject({
      angle: baselineChild.angle,
      height: baselineChild.height,
      left: baselineChild.left,
      scaleX: baselineChild.scaleX,
      scaleY: baselineChild.scaleY,
      top: baselineChild.top,
      width: baselineChild.width
    })
  }

  await snapping.finishPointerInteraction()
  expect(await selection.getCompositionSnapshot()).toEqual(live)
})
