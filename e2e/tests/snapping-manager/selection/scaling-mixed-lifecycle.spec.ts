import {
  test,
  expect
} from '../../../fixtures/active-selection-scaling.fixture'
import {
  expectMixedSelectionHistoryRestore,
  expectMixedSelectionScaleCommit,
  expectMixedSelectionScaleHold
} from '../../../helpers/mixed-selection-scaling.helper'

test('после отмены указателя очищает удержание и позволяет начать новый скейлинг', async({
  activeSelectionMixedScaleSetup: setup,
  selection,
  snapping
}) => {
  const snapshotParams = {
    imageIds: [setup.imageId],
    shapeIds: [setup.shapeId],
    textIds: [setup.textId]
  }
  const rightControl = await selection.scaling.getControlScenePoint({ control: 'mr' })

  await selection.scaling.startFromControl({ control: 'mr' })
  await selection.scaling.dragControlToScenePoint({
    point: { x: setup.montage.right, y: rightControl.y }
  })
  const live = await selection.getMixedCompositionSnapshot(snapshotParams)

  expect(live.selection.boundsRight).toBeCloseTo(setup.montage.right, 5)
  expect((await snapping.getGuideState()).guides).toHaveLength(1)

  await selection.scaling.cancelWithPointerEvent()

  const cancelled = await selection.getMixedCompositionSnapshot(snapshotParams)
  const clearedGuides = await snapping.getGuideState()

  expect(cancelled.selection.boundsRight).toBeCloseTo(live.selection.boundsRight, 5)
  for (const key of ['images', 'shapes', 'texts'] as const) {
    const liveChild = live[key][0]
    const cancelledChild = cancelled[key][0]
    if (!liveChild || !cancelledChild) {
      throw new Error('Состояние до и после отмены должно содержать все три объекта')
    }

    expect(cancelledChild.geometry.centerX).toBeCloseTo(liveChild.geometry.centerX, 5)
    expect(cancelledChild.geometry.centerY).toBeCloseTo(liveChild.geometry.centerY, 5)
    expect(cancelledChild.geometry.topEdgeLength).toBeCloseTo(liveChild.geometry.topEdgeLength, 5)
    expect(cancelledChild.geometry.leftEdgeLength).toBeCloseTo(liveChild.geometry.leftEdgeLength, 5)
  }
  expect(clearedGuides.guides).toHaveLength(0)
  expect(clearedGuides.spacingGuides).toHaveLength(0)

  await selection.scaling.startFromControl({ control: 'ml' })
  const reacquired = await selection.scaling.dragControlToScenePoint({
    point: { x: setup.montage.left, y: cancelled.selection.centerY }
  })

  expect(reacquired.boundsLeft).toBeCloseTo(setup.montage.left, 5)
  expect((await snapping.getGuideState()).guides).toEqual([{
    type: 'vertical',
    position: setup.montage.left
  }])

  await selection.scaling.finish()
})

test('keeps resizing without skew when Shift is pressed on the side handle', async({
  activeSelectionMixedScaleSetup: setup,
  selection,
  snapping
}) => {
  const snapshotParams = {
    imageIds: [setup.imageId],
    shapeIds: [setup.shapeId],
    textIds: [setup.textId]
  }
  const rightControl = await selection.scaling.getControlScenePoint({ control: 'mr' })

  await selection.scaling.startFromControl({ control: 'mr' })
  const snapped = await selection.scaling.dragControlToScenePoint({
    point: { x: setup.montage.right, y: rightControl.y }
  })

  expect((await snapping.getGuideState()).guides).toHaveLength(1)

  const continued = await selection.scaling.dragControlToScenePoint({
    point: { x: setup.montage.right + 40, y: rightControl.y + 30 },
    shiftKey: true
  })
  const live = await selection.getMixedCompositionSnapshot(snapshotParams)
  await selection.scaling.finish()

  const committed = await selection.getMixedCompositionSnapshot(snapshotParams)
  const skew = await selection.getSkew()

  expect(continued.boundsRight).toBeGreaterThan(snapped.boundsRight)
  expectMixedSelectionScaleCommit({ final: committed, live })
  expect(skew.skewX).toBeCloseTo(0, 10)
  expect(skew.skewY).toBeCloseTo(0, 10)
})

test('при ошибке фиксации восстанавливает все объекты и позволяет начать новый скейлинг', async({
  activeSelectionMixedScaleSetup: setup,
  selection,
  snapping
}) => {
  const snapshotParams = {
    imageIds: [setup.imageId],
    shapeIds: [setup.shapeId],
    textIds: [setup.textId]
  }
  const rightControl = await selection.scaling.getControlScenePoint({ control: 'mr' })
  await selection.scaling.startFromControl({ control: 'mr' })
  await selection.scaling.dragControlToScenePoint({ point: { x: setup.montage.right, y: rightControl.y } })
  const confirmed = await selection.getMixedCompositionSnapshot(snapshotParams)

  expect((await snapping.getGuideState()).guides).toHaveLength(1)
  const failure = await selection.scaling.finishWithShapeCommitFailure({ shapeId: setup.shapeId })
  const restored = await selection.getMixedCompositionSnapshot(snapshotParams)
  const restoredComposition = await selection.getCompositionSnapshot()

  expect(failure.errorMessage).toContain('Тестовая ошибка после подготовки геометрии шейпа')
  expectMixedSelectionScaleHold({ acquired: confirmed, held: restored })
  expect(restoredComposition.children.map(({ id }) => id))
    .toEqual(setup.initial.children.map(({ id }) => id))
  for (const field of ['scaleX', 'scaleY', 'angle'] as const) {
    expect(restored.selection[field]).toBeCloseTo(confirmed.selection[field], 8)
  }

  const confirmedImage = confirmed.images[0]
  const restoredImage = restored.images[0]
  const confirmedShape = confirmed.shapes[0]
  const restoredShape = restored.shapes[0]
  const confirmedText = confirmed.texts[0]
  const restoredText = restored.texts[0]
  if (!confirmedImage || !restoredImage || !confirmedShape || !restoredShape || !confirmedText || !restoredText) {
    throw new Error('Подтверждённое и восстановленное состояния должны содержать все три объекта')
  }
  for (const field of ['left', 'top', 'width', 'height', 'scaleX', 'scaleY', 'cropX', 'cropY'] as const) {
    expect(restoredImage.snapshot[field]).toBeCloseTo(confirmedImage.snapshot[field], 8)
  }
  for (const field of ['left', 'top', 'width', 'height', 'scaleX', 'scaleY'] as const) {
    expect(restoredShape.snapshot[field]).toBeCloseTo(confirmedShape.snapshot[field], 8)
    expect(restoredShape.text[field]).toBeCloseTo(confirmedShape.text[field], 8)
    expect(restoredText.snapshot[field]).toBeCloseTo(confirmedText.snapshot[field], 8)
  }
  expect(restoredImage.snapshot.originX).toBe(confirmedImage.snapshot.originX)
  expect(restoredImage.snapshot.originY).toBe(confirmedImage.snapshot.originY)
  expect(restoredShape.text.lineCount).toBe(confirmedShape.text.lineCount)
  expect(restoredText.snapshot.lineCount).toBe(confirmedText.snapshot.lineCount)
  expect((await snapping.getGuideState()).guides).toHaveLength(0)

  const nextControl = await selection.scaling.getControlScenePoint({ control: 'mr' })
  await selection.scaling.startFromControl({ control: 'mr' })
  await selection.scaling.dragControlToScenePoint({ point: { x: nextControl.x + 40, y: nextControl.y } })
  const nextLive = await selection.getMixedCompositionSnapshot(snapshotParams)
  expect(nextLive.selection.boundsWidth).toBeGreaterThan(restored.selection.boundsWidth)
  await selection.scaling.finish()
})

test('один скейлинг создаёт одну запись в истории и восстанавливает все объекты', async({
  activeSelectionMixedScaleSetup: setup,
  history,
  selection,
  shapes,
  snapping,
  text
}) => {
  await history.saveState()

  const baseline = {
    image: await snapping.getObjectSnapshot({ id: setup.imageId }),
    shape: await shapes.getScaleSnapshot({ id: setup.shapeId }),
    shapeText: await shapes.getTextNode({ id: setup.shapeId }),
    text: await text.scaling.getSnapshot({ id: setup.textId })
  }
  const historyBefore = await history.getPosition()

  await selection.scaling.startFromControl({ control: 'br' })
  await selection.scaling.dragControlBy({ deltaX: 65, deltaY: 65, pointerSteps: 2 })
  await selection.scaling.finish()

  const committed = {
    image: await snapping.getObjectSnapshot({ id: setup.imageId }),
    shape: await shapes.getScaleSnapshot({ id: setup.shapeId }),
    shapeText: await shapes.getTextNode({ id: setup.shapeId }),
    text: await text.scaling.getSnapshot({ id: setup.textId })
  }

  expect(await history.flushPendingSave()).toBe(true)
  const historyAfter = await history.getPosition()

  expect(historyAfter.patchCount).toBe(historyBefore.patchCount + 1)
  expect(historyAfter.currentIndex).toBe(historyBefore.currentIndex + 1)

  await history.undo()
  const undone = {
    image: await snapping.getObjectSnapshot({ id: setup.imageId }),
    shape: await shapes.getScaleSnapshot({ id: setup.shapeId }),
    shapeText: await shapes.getTextNode({ id: setup.shapeId }),
    text: await text.scaling.getSnapshot({ id: setup.textId })
  }

  await history.redo()
  const redone = {
    image: await snapping.getObjectSnapshot({ id: setup.imageId }),
    shape: await shapes.getScaleSnapshot({ id: setup.shapeId }),
    shapeText: await shapes.getTextNode({ id: setup.shapeId }),
    text: await text.scaling.getSnapshot({ id: setup.textId })
  }

  expectMixedSelectionHistoryRestore({ actual: undone, expected: baseline })
  expectMixedSelectionHistoryRestore({ actual: redone, expected: committed })
})
