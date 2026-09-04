import {
  test,
  expect
} from '../../../fixtures/active-selection-scaling.fixture'

test('свободный скейлинг выделения из изображения и текстов не деформирует объекты', async({
  activeSelectionImageTextScaleSetup: setup,
  selection
}) => {
  const snapshotParams = { imageIds: setup.imageIds, textIds: setup.textIds }
  const initial = await selection.getImageTextCompositionSnapshot(snapshotParams)
  const movingPoint = await selection.scaling.getControlScenePoint({ control: 'br' })

  await selection.scaling.startFromControl({ control: 'br' })
  await selection.scaling.dragControlToScenePoint({
    point: { x: movingPoint.x + 70, y: movingPoint.y + 25 },
    shiftKey: true
  })

  const live = await selection.getImageTextCompositionSnapshot(snapshotParams)
  const initialImage = initial.images[0]
  const liveImage = live.images[0]
  if (!initialImage || !liveImage) throw new Error('Состояние должно содержать изображение')
  const imageWidthMultiplier = liveImage.geometry.topEdgeLength / initialImage.geometry.topEdgeLength
  const imageHeightMultiplier = liveImage.geometry.leftEdgeLength / initialImage.geometry.leftEdgeLength

  expect(imageWidthMultiplier).toBeGreaterThan(1)
  expect(imageHeightMultiplier).toBeGreaterThan(1)
  expect(imageWidthMultiplier).not.toBeCloseTo(imageHeightMultiplier, 2)
  expect(liveImage.geometry.orthogonality).toBeCloseTo(0, 5)
  for (const [index, liveText] of live.texts.entries()) {
    const initialText = initial.texts[index]
    if (!initialText) throw new Error('Исходное состояние должно содержать оба текста')

    const widthMultiplier = liveText.snapshot.width / initialText.snapshot.width
    const fontMultiplier = liveText.snapshot.fontSize / initialText.snapshot.fontSize

    expect(widthMultiplier).toBeGreaterThan(1)
    expect(fontMultiplier).toBeGreaterThan(1)
    expect(widthMultiplier).not.toBeCloseTo(fontMultiplier, 2)
    expect(liveText.geometry.topEdgeLength / liveText.snapshot.width)
      .toBeCloseTo(initialText.geometry.topEdgeLength / initialText.snapshot.width, 5)
    expect(liveText.geometry.leftEdgeLength / liveText.snapshot.height)
      .toBeCloseTo(initialText.geometry.leftEdgeLength / initialText.snapshot.height, 5)
  }

  await selection.scaling.finish()
  const final = await selection.getImageTextCompositionSnapshot(snapshotParams)
  const finalImage = final.images[0]
  if (!finalImage) throw new Error('Итоговое состояние должно содержать изображение')

  expect(final.selection.boundsWidth).toBeCloseTo(live.selection.boundsWidth, 5)
  expect(final.selection.boundsHeight).toBeCloseTo(live.selection.boundsHeight, 5)
  expect(finalImage.geometry.topEdgeLength).toBeCloseTo(liveImage.geometry.topEdgeLength, 5)
  expect(finalImage.geometry.leftEdgeLength).toBeCloseTo(liveImage.geometry.leftEdgeLength, 5)
  for (const [index, finalText] of final.texts.entries()) {
    const liveText = live.texts[index]
    if (!liveText) throw new Error('Состояние до mouseup должно содержать оба текста')

    expect(finalText.snapshot.width).toBeCloseTo(liveText.snapshot.width, 5)
    expect(finalText.snapshot.fontSize).toBeCloseTo(liveText.snapshot.fontSize, 5)
  }
})

test('горизонтальный скейлинг выделения из изображения и текстов относительно центра не деформирует объекты', async({
  activeSelectionImageTextScaleSetup: setup,
  selection
}) => {
  const snapshotParams = { imageIds: setup.imageIds, textIds: setup.textIds }
  const initial = await selection.getImageTextCompositionSnapshot(snapshotParams)

  await selection.scaling.startFromControl({ centered: true, control: 'mr' })
  await selection.scaling.dragControlBy({ deltaX: 50, deltaY: 0, pointerSteps: 2 })

  const live = await selection.getImageTextCompositionSnapshot(snapshotParams)
  const initialImage = initial.images[0]
  const liveImage = live.images[0]
  if (!initialImage || !liveImage) throw new Error('Состояние должно содержать изображение')

  expect(live.selection.centerX).toBeCloseTo(initial.selection.centerX, 5)
  expect(live.selection.centerY).toBeCloseTo(initial.selection.centerY, 5)
  expect(liveImage.geometry.topEdgeLength).toBeGreaterThan(initialImage.geometry.topEdgeLength)
  expect(liveImage.geometry.leftEdgeLength).toBeCloseTo(initialImage.geometry.leftEdgeLength, 5)
  for (const [index, liveText] of live.texts.entries()) {
    const initialText = initial.texts[index]
    if (!initialText) throw new Error('Исходное состояние должно содержать оба текста')

    expect(liveText.snapshot.width).toBeGreaterThan(initialText.snapshot.width)
    expect(liveText.snapshot.fontSize).toBeCloseTo(initialText.snapshot.fontSize, 5)
    expect(liveText.geometry.topEdgeLength / liveText.snapshot.width)
      .toBeCloseTo(initialText.geometry.topEdgeLength / initialText.snapshot.width, 5)
    expect(liveText.geometry.leftEdgeLength / liveText.snapshot.height)
      .toBeCloseTo(initialText.geometry.leftEdgeLength / initialText.snapshot.height, 5)
  }

  await selection.scaling.finish()
  const final = await selection.getImageTextCompositionSnapshot(snapshotParams)
  const finalImage = final.images[0]
  if (!finalImage) throw new Error('Итоговое состояние должно содержать изображение')

  expect(final.selection.centerX).toBeCloseTo(live.selection.centerX, 5)
  expect(final.selection.centerY).toBeCloseTo(live.selection.centerY, 5)
  expect(finalImage.geometry.topEdgeLength).toBeCloseTo(liveImage.geometry.topEdgeLength, 5)
  for (const [index, finalText] of final.texts.entries()) {
    const liveText = live.texts[index]
    if (!liveText) throw new Error('Состояние до mouseup должно содержать оба текста')

    expect(finalText.snapshot.width).toBeCloseTo(liveText.snapshot.width, 5)
    expect(finalText.snapshot.fontSize).toBeCloseTo(liveText.snapshot.fontSize, 5)
  }
})

test('скейлинг за угол относительно центра одинаково меняет изображение и тексты', async({
  activeSelectionImageTextScaleSetup: setup,
  selection
}) => {
  const snapshotParams = { imageIds: setup.imageIds, textIds: setup.textIds }
  const initial = await selection.getImageTextCompositionSnapshot(snapshotParams)

  await selection.scaling.startFromControl({ centered: true, control: 'br' })
  await selection.scaling.dragControlBy({ deltaX: 55, deltaY: 55, pointerSteps: 2 })

  const live = await selection.getImageTextCompositionSnapshot(snapshotParams)
  const initialImage = initial.images[0]
  const liveImage = live.images[0]
  if (!initialImage || !liveImage) throw new Error('Состояние должно содержать изображение')
  const imageWidthMultiplier = liveImage.geometry.topEdgeLength / initialImage.geometry.topEdgeLength
  const imageHeightMultiplier = liveImage.geometry.leftEdgeLength / initialImage.geometry.leftEdgeLength

  expect(live.selection.centerX).toBeCloseTo(initial.selection.centerX, 5)
  expect(live.selection.centerY).toBeCloseTo(initial.selection.centerY, 5)
  expect(imageWidthMultiplier).toBeGreaterThan(1)
  expect(imageHeightMultiplier).toBeCloseTo(imageWidthMultiplier, 5)
  expect(liveImage.geometry.orthogonality).toBeCloseTo(0, 5)
  for (const [index, liveText] of live.texts.entries()) {
    const initialText = initial.texts[index]
    if (!initialText) throw new Error('Исходное состояние должно содержать оба текста')

    const widthMultiplier = liveText.snapshot.width / initialText.snapshot.width
    const fontMultiplier = liveText.snapshot.fontSize / initialText.snapshot.fontSize

    expect(widthMultiplier).toBeGreaterThan(1)
    expect(fontMultiplier).toBeCloseTo(widthMultiplier, 5)
    expect(liveText.geometry.orthogonality).toBeCloseTo(0, 5)
  }

  await selection.scaling.finish()
  const final = await selection.getImageTextCompositionSnapshot(snapshotParams)
  const finalImage = final.images[0]
  if (!finalImage) throw new Error('Итоговое состояние должно содержать изображение')

  expect(final.selection.centerX).toBeCloseTo(live.selection.centerX, 5)
  expect(final.selection.centerY).toBeCloseTo(live.selection.centerY, 5)
  expect(finalImage.geometry.topEdgeLength).toBeCloseTo(liveImage.geometry.topEdgeLength, 5)
  for (const [index, finalText] of final.texts.entries()) {
    const liveText = live.texts[index]
    if (!liveText) throw new Error('Состояние до mouseup должно содержать оба текста')

    expect(finalText.snapshot.width).toBeCloseTo(liveText.snapshot.width, 5)
    expect(finalText.snapshot.fontSize).toBeCloseTo(liveText.snapshot.fontSize, 5)
  }
})

test('повёрнутое выделение из изображения и текстов меняет ширину без деформации', async({
  activeSelectionImageTextScaleSetup: setup,
  selection
}) => {
  await selection.setAngle({ angle: 25 })
  const snapshotParams = { imageIds: setup.imageIds, textIds: setup.textIds }
  const initial = await selection.getImageTextCompositionSnapshot(snapshotParams)

  await selection.scaling.startFromControl({ control: 'mr' })
  await selection.scaling.dragControlBy({ deltaX: 50, deltaY: 0, pointerSteps: 2 })

  const live = await selection.getImageTextCompositionSnapshot(snapshotParams)
  const initialImage = initial.images[0]
  const liveImage = live.images[0]
  if (!initialImage || !liveImage) throw new Error('Состояние должно содержать изображение')

  expect(liveImage.geometry.topEdgeLength).toBeGreaterThan(initialImage.geometry.topEdgeLength)
  expect(liveImage.geometry.leftEdgeLength).toBeCloseTo(initialImage.geometry.leftEdgeLength, 5)
  expect(liveImage.geometry.sceneAngle).toBeCloseTo(initialImage.geometry.sceneAngle, 5)
  expect(liveImage.geometry.orthogonality).toBeCloseTo(0, 5)
  for (const [index, liveText] of live.texts.entries()) {
    const initialText = initial.texts[index]
    if (!initialText) throw new Error('Исходное состояние должно содержать оба текста')

    expect(liveText.snapshot.width).toBeGreaterThan(initialText.snapshot.width)
    expect(liveText.snapshot.fontSize).toBeCloseTo(initialText.snapshot.fontSize, 5)
    expect(liveText.geometry.topEdgeLength / liveText.snapshot.width)
      .toBeCloseTo(initialText.geometry.topEdgeLength / initialText.snapshot.width, 5)
    expect(liveText.geometry.leftEdgeLength / liveText.snapshot.height)
      .toBeCloseTo(initialText.geometry.leftEdgeLength / initialText.snapshot.height, 5)
    expect(liveText.geometry.sceneAngle).toBeCloseTo(initialText.geometry.sceneAngle, 5)
    expect(liveText.geometry.orthogonality).toBeCloseTo(0, 5)
  }

  await selection.scaling.finish()
  const final = await selection.getImageTextCompositionSnapshot(snapshotParams)
  const finalImage = final.images[0]
  if (!finalImage) throw new Error('Итоговое состояние должно содержать изображение')

  expect(final.selection.boundsWidth).toBeCloseTo(live.selection.boundsWidth, 5)
  expect(final.selection.boundsHeight).toBeCloseTo(live.selection.boundsHeight, 5)
  expect(finalImage.geometry.centerX).toBeCloseTo(liveImage.geometry.centerX, 5)
  expect(finalImage.geometry.centerY).toBeCloseTo(liveImage.geometry.centerY, 5)
  for (const [index, finalText] of final.texts.entries()) {
    const liveText = live.texts[index]
    if (!liveText) throw new Error('Состояние до mouseup должно содержать оба текста')

    expect(finalText.snapshot.width).toBeCloseTo(liveText.snapshot.width, 5)
    expect(finalText.snapshot.fontSize).toBeCloseTo(liveText.snapshot.fontSize, 5)
  }
})
