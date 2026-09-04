import {
  test,
  expect
} from '../../../fixtures/active-selection-scaling.fixture'

test('после минимальной ширины снова прилипает без новой сессии', async({
  activeSelectionImageTextScaleSetup: setup,
  selection,
  snapping
}) => {
  const snapshotParams = { imageIds: setup.imageIds, textIds: setup.textIds }
  const fixedPoint = await selection.scaling.getControlScenePoint({ control: 'ml' })

  await selection.scaling.startFromControl({ control: 'mr' })
  await selection.scaling.dragControlToScenePoint({ point: fixedPoint })
  const minimum = await selection.getImageTextCompositionSnapshot(snapshotParams)
  const minimumImage = minimum.images[0]
  if (!minimumImage) throw new Error('Минимальное состояние должно содержать изображение')

  await selection.scaling.dragControlToScenePoint({
    point: { x: fixedPoint.x - (20 * setup.scenePixel), y: fixedPoint.y }
  })
  const heldAtMinimum = await selection.getImageTextCompositionSnapshot(snapshotParams)
  const heldImage = heldAtMinimum.images[0]
  if (!heldImage) throw new Error('Удержание должно сохранить изображение')

  expect(heldAtMinimum.selection.boundsLeft).toBeCloseTo(minimum.selection.boundsLeft, 8)
  expect(heldAtMinimum.selection.boundsRight).toBeCloseTo(minimum.selection.boundsRight, 8)
  expect(heldImage.geometry.topEdgeLength).toBeCloseTo(minimumImage.geometry.topEdgeLength, 8)
  expect(heldImage.geometry.leftEdgeLength).toBeCloseTo(minimumImage.geometry.leftEdgeLength, 8)
  for (const [index, heldText] of heldAtMinimum.texts.entries()) {
    const minimumText = minimum.texts[index]
    if (!minimumText) throw new Error('Минимальное состояние должно содержать оба текста')

    expect(heldText.snapshot.width).toBeCloseTo(minimumText.snapshot.width, 8)
    expect(heldText.snapshot.fontSize).toBeCloseTo(minimumText.snapshot.fontSize, 8)
  }

  await selection.scaling.dragControlToScenePoint({
    point: { x: setup.montage.right, y: fixedPoint.y }
  })
  const reacquired = await selection.getImageTextCompositionSnapshot(snapshotParams)
  const guides = await snapping.getGuideState()

  expect(reacquired.selection.boundsRight).toBeCloseTo(setup.montage.right, 5)
  expect(reacquired.selection.boundsWidth).toBeGreaterThan(minimum.selection.boundsWidth)
  expect(guides.guides).toEqual([{ type: 'vertical', position: setup.montage.right }])
  expect(guides.spacingGuides).toHaveLength(0)

  await selection.scaling.finish()
})

test('после минимального размера за угол снова прилипает без новой сессии', async({
  activeSelectionImageTextScaleSetup: setup,
  selection,
  snapping
}) => {
  const snapshotParams = { imageIds: setup.imageIds, textIds: setup.textIds }
  const fixedPoint = await selection.scaling.getControlScenePoint({ control: 'tl' })
  const movingPoint = await selection.scaling.getControlScenePoint({ control: 'br' })

  await selection.scaling.startFromControl({ control: 'br' })
  await selection.scaling.dragControlToScenePoint({ point: fixedPoint })
  const minimum = await selection.getImageTextCompositionSnapshot(snapshotParams)
  const minimumImage = minimum.images[0]
  if (!minimumImage) throw new Error('Минимальное состояние должно содержать изображение')

  await selection.scaling.dragControlToScenePoint({
    point: {
      x: fixedPoint.x - (20 * setup.scenePixel),
      y: fixedPoint.y - (20 * setup.scenePixel)
    }
  })
  const heldAtMinimum = await selection.getImageTextCompositionSnapshot(snapshotParams)
  const heldImage = heldAtMinimum.images[0]
  if (!heldImage) throw new Error('Удержание должно сохранить изображение')

  expect(heldAtMinimum.selection.boundsWidth).toBeCloseTo(minimum.selection.boundsWidth, 8)
  expect(heldAtMinimum.selection.boundsHeight).toBeCloseTo(minimum.selection.boundsHeight, 8)
  expect(heldImage.geometry.topEdgeLength).toBeCloseTo(minimumImage.geometry.topEdgeLength, 8)
  for (const [index, heldText] of heldAtMinimum.texts.entries()) {
    const minimumText = minimum.texts[index]
    if (!minimumText) throw new Error('Минимальное состояние должно содержать оба текста')

    expect(heldText.snapshot.width).toBeCloseTo(minimumText.snapshot.width, 8)
    expect(heldText.snapshot.fontSize).toBeCloseTo(minimumText.snapshot.fontSize, 8)
  }

  const multiplier = (setup.montage.right - fixedPoint.x) / (movingPoint.x - fixedPoint.x)
  if (!Number.isFinite(multiplier) || multiplier <= 1) {
    throw new Error('Точка повторного прилипания должна увеличивать выделение')
  }
  await selection.scaling.dragControlToScenePoint({
    point: {
      x: fixedPoint.x + ((movingPoint.x - fixedPoint.x) * multiplier),
      y: fixedPoint.y + ((movingPoint.y - fixedPoint.y) * multiplier)
    }
  })
  const reacquired = await selection.getImageTextCompositionSnapshot(snapshotParams)
  const guides = await snapping.getGuideState()

  expect(reacquired.selection.boundsRight).toBeCloseTo(setup.montage.right, 5)
  expect(reacquired.selection.boundsWidth).toBeGreaterThan(minimum.selection.boundsWidth)
  expect(guides.guides).toEqual([{ type: 'vertical', position: setup.montage.right }])
  expect(guides.spacingGuides).toHaveLength(0)

  await selection.scaling.finish()
})
