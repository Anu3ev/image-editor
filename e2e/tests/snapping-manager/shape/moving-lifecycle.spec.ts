import { test, expect } from '../../../fixtures/editor.fixture'
import { SNAPPING_TOLERANCE } from '../../../fixtures/data/snapping.data'
import type { SnappingObjectSnapshot } from '../../../types'

/** Исходное состояние отдельного сценария перемещения шейпа. */
type ShapeMovementLifecycleSetup = {
  activeShapeId: string
  baseline: SnappingObjectSnapshot
  reference: SnappingObjectSnapshot
}

let setup: ShapeMovementLifecycleSetup

test.beforeEach(async({
  editorModel,
  history,
  shapes,
  snapping
}) => {
  const montageBounds = await editorModel.getMontageAreaBounds()
  const activeShape = await shapes.addAtBounds({
    presetKey: 'square',
    options: {
      id: 'active-shape',
      left: montageBounds.left + 260,
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
      left: montageBounds.left + 80,
      top: montageBounds.top + 120,
      width: 100,
      height: 60,
      text: ''
    }
  })

  shapes.checkCreation({ shape: activeShape, presetKey: 'square' })
  shapes.checkCreation({ shape: referenceShape, presetKey: 'square' })

  const pendingSaveFlushed = await history.flushPendingSave()

  expect(pendingSaveFlushed, 'подготовка не должна оставлять отложенное сохранение').toBe(false)
  expect(activeShape?.id).toBe('active-shape')

  setup = {
    activeShapeId: 'active-shape',
    baseline: await snapping.getObjectSnapshot({ id: 'active-shape' }),
    reference: await snapping.getObjectSnapshot({ id: 'reference-shape' })
  }
})

test('одно перемещение создаёт одну запись в истории и восстанавливается через undo/redo', async({
  history,
  snapping
}) => {
  const historyBefore = await history.getPosition()

  await snapping.startObjectDrag({ id: setup.activeShapeId })
  const live = await snapping.dragObjectBoundsTo({
    id: setup.activeShapeId,
    left: setup.reference.boundsLeft + 1,
    top: setup.reference.boundsTop + 1
  })
  const guidesBeforeMouseUp = await snapping.getGuideState()

  expect(live.boundsLeft).toBeCloseTo(setup.reference.boundsLeft, 1)
  expect(live.boundsTop).toBeCloseTo(setup.reference.boundsTop, 1)
  expect(guidesBeforeMouseUp.guides).toHaveLength(2)

  const clearedGuides = await snapping.finishPointerInteraction()
  const committed = await snapping.getObjectSnapshot({ id: setup.activeShapeId })
  const historySaved = await history.flushPendingSave()
  const historyAfter = await history.getPosition()

  expect(historySaved, 'object:modified должен сохранить завершённое перемещение').toBe(true)
  expect(committed).toEqual(live)
  expect(clearedGuides.guides).toHaveLength(0)
  expect(clearedGuides.spacingGuides).toHaveLength(0)
  expect(historyAfter.patchCount).toBe(historyBefore.patchCount + 1)
  expect(historyAfter.currentIndex).toBe(historyBefore.currentIndex + 1)

  await history.undo()

  const restored = await snapping.getObjectSnapshot({ id: setup.activeShapeId })

  expect(restored.boundsLeft).toBeCloseTo(setup.baseline.boundsLeft, 5)
  expect(restored.boundsTop).toBeCloseTo(setup.baseline.boundsTop, 5)
  expect(restored.boundsWidth).toBeCloseTo(setup.baseline.boundsWidth, 5)
  expect(restored.boundsHeight).toBeCloseTo(setup.baseline.boundsHeight, 5)

  await history.redo()

  const redone = await snapping.getObjectSnapshot({ id: setup.activeShapeId })

  expect(redone.boundsLeft).toBeCloseTo(committed.boundsLeft, 2)
  expect(redone.boundsTop).toBeCloseTo(committed.boundsTop, 2)
  expect(redone.boundsWidth).toBeCloseTo(committed.boundsWidth, 5)
  expect(redone.boundsHeight).toBeCloseTo(committed.boundsHeight, 5)
})

test('перетаскивание другого шейпа не наследует прежнее удержание', async({
  editorModel,
  shapes,
  snapping
}) => {
  const montageBounds = await editorModel.getMontageAreaBounds()
  const nextShape = await shapes.addAtBounds({
    presetKey: 'square',
    options: {
      id: 'next-shape',
      left: montageBounds.left + 360,
      top: montageBounds.top + 210,
      width: 30,
      height: 30,
      text: ''
    }
  })

  shapes.checkCreation({ shape: nextShape, presetKey: 'square' })

  await snapping.startObjectDrag({ id: setup.activeShapeId })
  const firstSnap = await snapping.dragObjectBoundsTo({
    id: setup.activeShapeId,
    left: setup.reference.boundsLeft + 1,
    top: setup.reference.boundsTop + 1
  })

  expect(firstSnap.boundsLeft).toBeCloseTo(setup.reference.boundsLeft, 1)
  expect(firstSnap.boundsTop).toBeCloseTo(setup.reference.boundsTop, 1)

  await snapping.finishPointerInteraction()
  const activeShapeRemoved = await shapes.remove({ id: setup.activeShapeId })
  const referenceShapeRemoved = await shapes.remove({ id: 'reference-shape' })
  const nextShapeBaseline = await snapping.getObjectSnapshot({ id: 'next-shape' })

  expect(activeShapeRemoved).toBe(true)
  expect(referenceShapeRemoved).toBe(true)

  await snapping.startObjectDrag({ id: 'next-shape' })

  const freshGesture = await snapping.dragObjectBoundsTo({
    id: 'next-shape',
    left: firstSnap.boundsLeft + 8,
    top: nextShapeBaseline.boundsTop
  })
  const guideState = await snapping.getGuideState()

  expect(Math.abs(freshGesture.boundsLeft - firstSnap.boundsLeft))
    .toBeGreaterThan(SNAPPING_TOLERANCE.position)
  expect(freshGesture.boundsLeft).toBeCloseTo(firstSnap.boundsLeft + 8, 1)
  expect(Math.abs(freshGesture.boundsTop - firstSnap.boundsTop))
    .toBeGreaterThan(SNAPPING_TOLERANCE.position)
  expect(Math.abs(freshGesture.boundsTop - nextShapeBaseline.boundsTop))
    .toBeLessThanOrEqual(SNAPPING_TOLERANCE.position)
  expect(guideState.guides).toHaveLength(0)
  expect(guideState.spacingGuides).toHaveLength(0)

  await snapping.finishPointerInteraction()
})
