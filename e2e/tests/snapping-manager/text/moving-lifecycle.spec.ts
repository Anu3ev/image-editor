import { test, expect } from '../../../fixtures/editor.fixture'
import { SNAPPING_TOLERANCE } from '../../../fixtures/data/snapping.data'
import type { SnappingObjectSnapshot } from '../../../types'

/** Исходное состояние отдельного сценария перемещения текста. */
type TextMovementLifecycleSetup = {
  activeTextId: string
  baseline: SnappingObjectSnapshot
  reference: SnappingObjectSnapshot
}

let setup: TextMovementLifecycleSetup

test.beforeEach(async({
  editorModel,
  history,
  shapes,
  snapping,
  text
}) => {
  const montageBounds = await editorModel.getMontageAreaBounds()
  const referenceShape = await shapes.addAtBounds({
    presetKey: 'square',
    options: {
      id: 'reference-shape',
      left: montageBounds.left + 80,
      top: montageBounds.top + 120,
      width: 12,
      height: 40,
      text: ''
    }
  })
  const activeText = await text.add({
    id: 'active-text',
    text: 'Отдельный текст',
    left: montageBounds.left + 260,
    top: montageBounds.top + 120,
    originX: 'left',
    originY: 'top',
    width: 90,
    fontSize: 24,
    autoExpand: false
  })

  text.checkCreation({ textObject: activeText })
  shapes.checkCreation({ shape: referenceShape, presetKey: 'square' })

  const pendingSaveFlushed = await history.flushPendingSave()

  expect(pendingSaveFlushed, 'подготовка не должна оставлять отложенное сохранение').toBe(false)
  expect(activeText?.id).toBe('active-text')

  setup = {
    activeTextId: 'active-text',
    baseline: await snapping.getObjectSnapshot({ id: 'active-text' }),
    reference: await snapping.getObjectSnapshot({ id: 'reference-shape' })
  }
})

test('одно перемещение текста создаёт одну запись в истории и восстанавливается через undo/redo', async({
  history,
  snapping
}) => {
  const historyBefore = await history.getPosition()

  await snapping.startObjectDrag({ id: setup.activeTextId })
  const live = await snapping.dragObjectBoundsTo({
    id: setup.activeTextId,
    left: setup.reference.boundsLeft + 1,
    top: setup.reference.boundsTop + 1
  })

  expect(live.boundsLeft).toBeCloseTo(setup.reference.boundsLeft, 1)
  expect(live.boundsTop).toBeCloseTo(setup.reference.boundsTop, 1)

  const clearedGuides = await snapping.finishPointerInteraction()
  const committed = await snapping.getObjectSnapshot({ id: setup.activeTextId })
  const historySaved = await history.flushPendingSave()
  const historyAfter = await history.getPosition()

  expect(historySaved, 'object:modified должен сохранить завершённое перемещение').toBe(true)
  expect(committed).toEqual(live)
  expect(clearedGuides.guides).toHaveLength(0)
  expect(clearedGuides.spacingGuides).toHaveLength(0)
  expect(historyAfter.patchCount).toBe(historyBefore.patchCount + 1)
  expect(historyAfter.currentIndex).toBe(historyBefore.currentIndex + 1)

  await history.undo()
  const restored = await snapping.getObjectSnapshot({ id: setup.activeTextId })

  expect(restored.boundsLeft).toBeCloseTo(setup.baseline.boundsLeft, 5)
  expect(restored.boundsTop).toBeCloseTo(setup.baseline.boundsTop, 5)
  expect(restored.boundsWidth).toBeCloseTo(setup.baseline.boundsWidth, 5)
  expect(restored.boundsHeight).toBeCloseTo(setup.baseline.boundsHeight, 5)

  await history.redo()
  const redone = await snapping.getObjectSnapshot({ id: setup.activeTextId })

  expect(redone.boundsLeft).toBeCloseTo(committed.boundsLeft, 2)
  expect(redone.boundsTop).toBeCloseTo(committed.boundsTop, 2)
  expect(redone.boundsWidth).toBeCloseTo(committed.boundsWidth, 5)
  expect(redone.boundsHeight).toBeCloseTo(committed.boundsHeight, 5)
})

test('новое перетаскивание текста не наследует удержание предыдущего жеста', async({
  shapes,
  snapping
}) => {
  await snapping.startObjectDrag({ id: setup.activeTextId })
  const firstSnap = await snapping.dragObjectBoundsTo({
    id: setup.activeTextId,
    left: setup.reference.boundsLeft + 1,
    top: setup.reference.boundsTop + 1
  })

  expect(firstSnap.boundsLeft).toBeCloseTo(setup.reference.boundsLeft, 1)
  expect(firstSnap.boundsTop).toBeCloseTo(setup.reference.boundsTop, 1)

  await snapping.finishPointerInteraction()
  const referenceRemoved = await shapes.remove({ id: 'reference-shape' })

  expect(referenceRemoved).toBe(true)
  expect((await snapping.getGuideState()).guides).toHaveLength(0)

  await snapping.startObjectDrag({ id: setup.activeTextId })
  const freshGesture = await snapping.dragObjectBoundsTo({
    id: setup.activeTextId,
    left: firstSnap.boundsLeft + 3,
    top: firstSnap.boundsTop + 3
  })
  const guideState = await snapping.getGuideState()

  expect(Math.abs(freshGesture.boundsLeft - (firstSnap.boundsLeft + 3)))
    .toBeLessThanOrEqual(SNAPPING_TOLERANCE.position)
  expect(Math.abs(freshGesture.boundsTop - (firstSnap.boundsTop + 3)))
    .toBeLessThanOrEqual(SNAPPING_TOLERANCE.position)
  expect(Math.abs(freshGesture.boundsLeft - firstSnap.boundsLeft))
    .toBeGreaterThan(SNAPPING_TOLERANCE.position)
  expect(Math.abs(freshGesture.boundsTop - firstSnap.boundsTop))
    .toBeGreaterThan(SNAPPING_TOLERANCE.position)
  expect(guideState.guides).toHaveLength(0)
  expect(guideState.spacingGuides).toHaveLength(0)

  const clearedGuides = await snapping.finishPointerInteraction()

  expect(clearedGuides.guides).toHaveLength(0)
  expect(clearedGuides.spacingGuides).toHaveLength(0)
})

test('восстановленный через undo/redo текст сохраняет направляющие при микродвижении', async({
  history,
  snapping
}) => {
  await snapping.startObjectDrag({ id: setup.activeTextId })
  await snapping.dragObjectBoundsTo({
    id: setup.activeTextId,
    left: setup.reference.boundsLeft + 1,
    top: setup.reference.boundsTop + 1
  })
  await snapping.finishPointerInteraction()

  expect(await history.flushPendingSave()).toBe(true)
  expect((await history.getPosition()).currentIndex).toBeGreaterThan(0)

  await history.undo()
  await history.redo()
  await snapping.startObjectDrag({ id: setup.activeTextId })
  const snapped = await snapping.dragObjectBoundsTo({
    id: setup.activeTextId,
    left: setup.reference.centerX + 1,
    top: setup.reference.centerY + 1
  })
  const snappedGuides = await snapping.getGuideState()
  const held = await snapping.dragObjectBoundsTo({
    id: setup.activeTextId,
    left: snapped.boundsLeft + 3,
    top: snapped.boundsTop + 3
  })
  const guideState = await snapping.getGuideState()

  expect(held.boundsLeft).toBeCloseTo(snapped.boundsLeft, 1)
  expect(held.boundsTop).toBeCloseTo(snapped.boundsTop, 1)
  expect(snappedGuides.guides).toHaveLength(2)
  expect(guideState.guides).toEqual(snappedGuides.guides)
  expect(guideState.guides).toHaveLength(2)
  expect(guideState.spacingGuides).toHaveLength(0)

  const clearedGuides = await snapping.finishPointerInteraction()

  expect(clearedGuides.guides).toHaveLength(0)
  expect(clearedGuides.spacingGuides).toHaveLength(0)
})

test('текст из шаблона сохраняет направляющие при микродвижении', async({
  snapping,
  text
}) => {
  const templateText = text.checkCreation({ textObject: await text.applyRegressionTemplate() })

  if (typeof templateText.id !== 'string') {
    throw new Error('текст из шаблона должен иметь id')
  }

  await snapping.startObjectDrag({ id: templateText.id })
  const snapped = await snapping.dragObjectBoundsTo({
    id: templateText.id,
    left: setup.reference.boundsLeft + 1,
    top: setup.reference.boundsTop + 1
  })
  const snappedGuides = await snapping.getGuideState()
  const held = await snapping.dragObjectBoundsTo({
    id: templateText.id,
    left: snapped.boundsLeft + 4,
    top: snapped.boundsTop + 4
  })
  const guideState = await snapping.getGuideState()

  expect(held.boundsLeft).toBeCloseTo(snapped.boundsLeft, 1)
  expect(held.boundsTop).toBeCloseTo(snapped.boundsTop, 1)
  expect(snappedGuides.guides).toHaveLength(2)
  expect(guideState.guides).toEqual(snappedGuides.guides)
  expect(guideState.guides).toHaveLength(2)
  expect(guideState.spacingGuides).toHaveLength(0)

  const clearedGuides = await snapping.finishPointerInteraction()

  expect(clearedGuides.guides).toHaveLength(0)
  expect(clearedGuides.spacingGuides).toHaveLength(0)
})

test('вставленный из буфера текст сохраняет направляющие при микродвижении', async({
  clipboard,
  editorModel,
  snapping,
  text
}) => {
  const selected = await text.select({ id: setup.activeTextId })

  expect(selected?.id).toBe(setup.activeTextId)
  expect(selected?.type).toBe('background-textbox')

  await clipboard.copy()
  await clipboard.waitForClipboardReady()
  const pasted = await clipboard.paste()
  const copiedText = await editorModel.getActiveObject()

  expect(pasted).toBe(true)
  expect(copiedText?.type).toBe('background-textbox')
  expect(typeof copiedText?.id).toBe('string')

  if (typeof copiedText?.id !== 'string') {
    throw new Error('после вставки скопированный текст должен быть активен')
  }

  expect(copiedText.id).not.toBe(setup.activeTextId)

  await snapping.startObjectDrag({ id: copiedText.id })
  const snapped = await snapping.dragObjectBoundsTo({
    id: copiedText.id,
    left: setup.reference.boundsLeft + 1,
    top: setup.reference.boundsTop + 1
  })
  const snappedGuides = await snapping.getGuideState()
  const held = await snapping.dragObjectBoundsTo({
    id: copiedText.id,
    left: snapped.boundsLeft + 4,
    top: snapped.boundsTop + 4
  })
  const guideState = await snapping.getGuideState()

  expect(held.boundsLeft).toBeCloseTo(snapped.boundsLeft, 1)
  expect(held.boundsTop).toBeCloseTo(snapped.boundsTop, 1)
  expect(snappedGuides.guides).toHaveLength(2)
  expect(guideState.guides).toEqual(snappedGuides.guides)
  expect(guideState.guides).toHaveLength(2)
  expect(guideState.spacingGuides).toHaveLength(0)

  const clearedGuides = await snapping.finishPointerInteraction()

  expect(clearedGuides.guides).toHaveLength(0)
  expect(clearedGuides.spacingGuides).toHaveLength(0)
})
