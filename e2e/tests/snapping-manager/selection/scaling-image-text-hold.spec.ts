import {
  test,
  expect
} from '../../../fixtures/active-selection-scaling.fixture'
import { expectImageTextScaleHold } from '../../../helpers/image-text-selection-scaling.helper'

test('при микродвижениях у вертикального гайда не меняет изображение и тексты', async({
  activeSelectionImageTextScaleSetup: setup,
  editorModel,
  selection,
  snapping
}) => {
  const snapshotParams = { imageIds: setup.imageIds, textIds: setup.textIds }
  const movingPoint = await selection.scaling.getControlScenePoint({ control: 'mr' })

  await selection.scaling.startFromControl({ control: 'mr' })
  await selection.scaling.dragControlToScenePoint({
    point: { x: setup.montage.right, y: movingPoint.y }
  })

  const acquired = await selection.getImageTextCompositionSnapshot(snapshotParams)
  const acquiredIndicator = await editorModel.requireObjectSizeIndicator()

  expect(acquired.selection.boundsRight).toBeCloseTo(setup.montage.right, 5)
  expect((await snapping.getGuideState()).guides).toEqual([{
    type: 'vertical',
    position: setup.montage.right
  }])

  for (const offset of [-3, -1, 1, 3]) {
    await selection.scaling.dragControlToScenePoint({
      point: { x: setup.montage.right + (offset * setup.scenePixel), y: movingPoint.y }
    })
    const held = await selection.getImageTextCompositionSnapshot(snapshotParams)

    expectImageTextScaleHold({ acquired, held })
    expect(await editorModel.requireObjectSizeIndicator()).toEqual(acquiredIndicator)
    expect((await snapping.getGuideState()).guides).toEqual([{
      type: 'vertical',
      position: setup.montage.right
    }])
  }

  const committed = await selection.scaling.finish()

  expect(committed.boundsLeft).toBeCloseTo(acquired.selection.boundsLeft, 5)
  expect(committed.boundsRight).toBeCloseTo(acquired.selection.boundsRight, 5)
})

test('при микродвижениях у горизонтального гайда сохраняет пропорциональный размер', async({
  activeSelectionImageTextScaleSetup: setup,
  editorModel,
  selection,
  snapping
}) => {
  const snapshotParams = { imageIds: setup.imageIds, textIds: setup.textIds }
  const guidePosition = setup.montage.centerY
  const path = await selection.scaling.createTopRightProportionalPath({
    topPositions: [0, -3, -1, 1, 3].map((offset) => guidePosition + (offset * setup.scenePixel))
  })
  const acquiredPoint = path[0]
  if (!acquiredPoint) throw new Error('Путь должен содержать точку прилипания')

  await selection.scaling.startFromControl({ control: 'tr' })
  await selection.scaling.dragControlToScenePoint({ point: acquiredPoint })

  const acquired = await selection.getImageTextCompositionSnapshot(snapshotParams)
  const acquiredIndicator = await editorModel.requireObjectSizeIndicator()

  expect(acquired.selection.boundsTop).toBeCloseTo(guidePosition, 5)
  expect((await snapping.getGuideState()).guides).toEqual([{
    type: 'horizontal',
    position: guidePosition
  }])

  for (const point of path.slice(1)) {
    await selection.scaling.dragControlToScenePoint({ point })
    const held = await selection.getImageTextCompositionSnapshot(snapshotParams)

    expectImageTextScaleHold({ acquired, held })
    expect(await editorModel.requireObjectSizeIndicator()).toEqual(acquiredIndicator)
    expect((await snapping.getGuideState()).guides).toEqual([{
      type: 'horizontal',
      position: guidePosition
    }])
  }

  const committed = await selection.scaling.finish()

  expect(committed.boundsTop).toBeCloseTo(acquired.selection.boundsTop, 5)
  expect(committed.boundsBottom).toBeCloseTo(acquired.selection.boundsBottom, 5)
})

test('после выхода из зоны горизонтального гайда продолжает менять изображение и тексты', async({
  activeSelectionImageTextScaleSetup: setup,
  selection,
  snapping
}) => {
  const snapshotParams = { imageIds: setup.imageIds, textIds: setup.textIds }
  const guidePosition = setup.montage.centerY
  const path = await selection.scaling.createTopRightProportionalPath({
    topPositions: [guidePosition, guidePosition - (80 * setup.scenePixel)]
  })
  const acquiredPoint = path[0]
  const releasedPoint = path[1]
  if (!acquiredPoint || !releasedPoint) {
    throw new Error('Путь должен содержать точки удержания и отпускания')
  }

  await selection.scaling.startFromControl({ control: 'tr' })
  await selection.scaling.dragControlToScenePoint({ point: acquiredPoint })
  const acquired = await selection.getImageTextCompositionSnapshot(snapshotParams)

  await selection.scaling.dragControlToScenePoint({ point: releasedPoint })
  const released = await selection.getImageTextCompositionSnapshot(snapshotParams)
  const guideState = await snapping.getGuideState()

  expect(Math.abs(released.selection.boundsTop - acquired.selection.boundsTop))
    .toBeGreaterThan(60 * setup.scenePixel)
  expect(released.selection.boundsWidth).not.toBeCloseTo(acquired.selection.boundsWidth, 5)
  for (const [index, releasedImage] of released.images.entries()) {
    const acquiredImage = acquired.images[index]
    if (!acquiredImage) throw new Error('Состояние удержания должно содержать все изображения')

    expect(releasedImage.geometry.topEdgeLength).not.toBeCloseTo(acquiredImage.geometry.topEdgeLength, 5)
    expect(releasedImage.geometry.leftEdgeLength).not.toBeCloseTo(acquiredImage.geometry.leftEdgeLength, 5)
  }
  for (const [index, releasedText] of released.texts.entries()) {
    const acquiredText = acquired.texts[index]
    if (!acquiredText) throw new Error('Состояние удержания должно содержать оба текста')

    expect(releasedText.snapshot.width).not.toBeCloseTo(acquiredText.snapshot.width, 5)
    expect(releasedText.snapshot.fontSize).not.toBeCloseTo(acquiredText.snapshot.fontSize, 5)
  }
  expect(guideState.guides).toHaveLength(0)
  expect(guideState.spacingGuides).toHaveLength(0)

  await selection.scaling.finish()
})

test('Ctrl снимает удержание, а после отпускания клавиши выделение снова прилипает', async({
  activeSelectionImageTextScaleSetup: setup,
  selection,
  snapping
}) => {
  await selection.scaling.startFromControl({ control: 'ml' })
  const acquired = await selection.scaling.dragControlToScenePoint({
    point: { x: setup.montage.left, y: setup.initial.selection.centerY }
  })

  expect(acquired.boundsLeft).toBeCloseTo(setup.montage.left, 5)
  expect((await snapping.getGuideState()).guides).toEqual([{
    type: 'vertical',
    position: setup.montage.left
  }])

  const withoutSnap = await selection.scaling.dragControlToScenePoint({
    ctrlKey: true,
    point: {
      x: setup.montage.left - (2 * setup.scenePixel),
      y: setup.initial.selection.centerY
    }
  })

  expect(withoutSnap.boundsLeft).not.toBeCloseTo(setup.montage.left, 5)
  expect((await snapping.getGuideState()).guides).toHaveLength(0)

  const reacquired = await selection.scaling.dragControlToScenePoint({
    point: {
      x: setup.montage.left - setup.scenePixel,
      y: setup.initial.selection.centerY
    }
  })

  expect(reacquired.boundsLeft).toBeCloseTo(setup.montage.left, 5)
  expect((await snapping.getGuideState()).guides).toEqual([{
    type: 'vertical',
    position: setup.montage.left
  }])

  await selection.scaling.finish()
})
