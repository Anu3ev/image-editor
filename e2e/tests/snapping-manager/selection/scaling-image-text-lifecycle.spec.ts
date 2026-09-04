import {
  test,
  expect
} from '../../../fixtures/active-selection-scaling.fixture'

test('при отмене указателя очищает удержание и позволяет начать новый скейлинг', async({
  activeSelectionImageTextScaleSetup: setup,
  selection,
  snapping
}) => {
  const snapshotParams = { imageIds: setup.imageIds, textIds: setup.textIds }
  const rightControl = await selection.scaling.getControlScenePoint({ control: 'mr' })

  await selection.scaling.startFromControl({ control: 'mr' })
  await selection.scaling.dragControlToScenePoint({
    point: { x: setup.montage.right, y: rightControl.y }
  })
  const live = await selection.getImageTextCompositionSnapshot(snapshotParams)

  expect(live.selection.boundsRight).toBeCloseTo(setup.montage.right, 5)
  expect((await snapping.getGuideState()).guides).toHaveLength(1)

  await selection.scaling.cancelWithPointerEvent()

  const cancelled = await selection.getImageTextCompositionSnapshot(snapshotParams)
  const clearedGuides = await snapping.getGuideState()
  const cancelledImage = cancelled.images[0]
  const liveImage = live.images[0]
  if (!cancelledImage || !liveImage) throw new Error('Состояние должно содержать изображение')

  expect(cancelled.selection.boundsRight).toBeCloseTo(live.selection.boundsRight, 5)
  expect(cancelledImage.geometry.topEdgeLength).toBeCloseTo(liveImage.geometry.topEdgeLength, 5)
  for (const [index, cancelledText] of cancelled.texts.entries()) {
    const liveText = live.texts[index]
    if (!liveText) throw new Error('Состояние до отмены должно содержать оба текста')

    expect(cancelledText.snapshot.width).toBeCloseTo(liveText.snapshot.width, 5)
    expect(cancelledText.snapshot.fontSize).toBeCloseTo(liveText.snapshot.fontSize, 5)
  }
  expect(clearedGuides.guides).toHaveLength(0)
  expect(clearedGuides.spacingGuides).toHaveLength(0)

  await selection.scaling.startFromControl({ control: 'ml' })
  const reacquired = await selection.scaling.dragControlToScenePoint({
    point: { x: setup.montage.left, y: cancelled.selection.centerY }
  })

  expect(reacquired.boundsLeft).toBeCloseTo(setup.montage.left, 5)
  expect((await snapping.getGuideState()).guides).toHaveLength(1)

  await selection.scaling.finish()
})

test('при переключении боковой ручки на наклон фиксирует последний размер без деформации', async({
  activeSelectionImageTextScaleSetup: setup,
  selection,
  snapping
}) => {
  const snapshotParams = { imageIds: setup.imageIds, textIds: setup.textIds }
  const rightControl = await selection.scaling.getControlScenePoint({ control: 'mr' })

  await selection.scaling.startFromControl({ control: 'mr' })
  await selection.scaling.dragControlToScenePoint({
    point: { x: setup.montage.right, y: rightControl.y }
  })
  const snapped = await selection.getImageTextCompositionSnapshot(snapshotParams)

  await selection.scaling.dragControlToScenePoint({
    point: { x: setup.montage.right + 40, y: rightControl.y + 30 },
    shiftKey: true
  })
  await selection.scaling.releasePointerAfterExternalEnd()

  const committed = await selection.getImageTextCompositionSnapshot(snapshotParams)
  const skew = await selection.getSkew()
  const committedImage = committed.images[0]
  const snappedImage = snapped.images[0]
  if (!committedImage || !snappedImage) throw new Error('Состояние должно содержать изображение')

  expect(committed.selection.boundsRight).toBeCloseTo(snapped.selection.boundsRight, 5)
  expect(committedImage.geometry.centerX).toBeCloseTo(snappedImage.geometry.centerX, 5)
  expect(committedImage.geometry.topEdgeLength).toBeCloseTo(snappedImage.geometry.topEdgeLength, 5)
  for (const [index, committedText] of committed.texts.entries()) {
    const snappedText = snapped.texts[index]
    if (!snappedText) throw new Error('Состояние до смены режима должно содержать оба текста')

    expect(committedText.snapshot.width).toBeCloseTo(snappedText.snapshot.width, 5)
    expect(committedText.snapshot.fontSize).toBeCloseTo(snappedText.snapshot.fontSize, 5)
  }
  expect(skew.skewX).toBeCloseTo(0, 10)
  expect(skew.skewY).toBeCloseTo(0, 10)
  expect((await snapping.getGuideState()).guides).toHaveLength(0)
})

test('один скейлинг создаёт одну запись в истории и восстанавливает изображение и тексты', async({
  activeSelectionImageTextScaleSetup: setup,
  history,
  selection,
  snapping,
  text
}) => {
  await history.saveState()

  const [imageId] = setup.imageIds
  const baselineImage = await snapping.getObjectSnapshot({ id: imageId })
  const baselineTexts = await Promise.all(setup.textIds.map((id) => text.scaling.getSnapshot({ id })))
  const historyBefore = await history.getPosition()

  await selection.scaling.startFromControl({ control: 'mr' })
  await selection.scaling.dragControlToScenePoint({
    point: { x: setup.montage.right, y: setup.initial.selection.centerY }
  })
  await selection.scaling.finish()

  const committedImage = await snapping.getObjectSnapshot({ id: imageId })
  const committedTexts = await Promise.all(setup.textIds.map((id) => text.scaling.getSnapshot({ id })))

  expect(await history.flushPendingSave()).toBe(true)
  const historyAfter = await history.getPosition()

  expect(historyAfter.patchCount).toBe(historyBefore.patchCount + 1)
  expect(historyAfter.currentIndex).toBe(historyBefore.currentIndex + 1)

  await history.undo()
  const undoneImage = await snapping.getObjectSnapshot({ id: imageId })
  const undoneTexts = await Promise.all(setup.textIds.map((id) => text.scaling.getSnapshot({ id })))

  await history.redo()
  const redoneImage = await snapping.getObjectSnapshot({ id: imageId })
  const redoneTexts = await Promise.all(setup.textIds.map((id) => text.scaling.getSnapshot({ id })))

  for (const field of ['boundsLeft', 'boundsTop', 'boundsWidth', 'boundsHeight'] as const) {
    expect(undoneImage[field]).toBeCloseTo(baselineImage[field], 1)
    expect(redoneImage[field]).toBeCloseTo(committedImage[field], 1)
  }
  for (const [index, baselineText] of baselineTexts.entries()) {
    const committedText = committedTexts[index]
    const undoneText = undoneTexts[index]
    const redoneText = redoneTexts[index]
    if (!committedText || !undoneText || !redoneText) {
      throw new Error('История должна содержать оба текста')
    }

    for (const field of ['width', 'height', 'fontSize', 'boundsLeft', 'boundsTop'] as const) {
      expect(undoneText[field]).toBeCloseTo(baselineText[field], 1)
      expect(redoneText[field]).toBeCloseTo(committedText[field], 1)
    }
  }
})
