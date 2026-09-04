import {
  test,
  expect
} from '../../../fixtures/active-selection-scaling.fixture'
import { ACTIVE_SELECTION_TEXT_SCALE_CONTROL_CASES } from '../../../fixtures/data/active-selection-scaling.data'
import {
  expectImageTextScaleCommit,
  expectImageTextScalePreview
} from '../../../helpers/image-text-selection-scaling.helper'

for (const controlCase of ACTIVE_SELECTION_TEXT_SCALE_CONTROL_CASES) {
  test(`в выделении из изображения и текстов ${controlCase.title} не деформирует объекты`, async({
    activeSelectionImageTextScaleSetup: setup,
    selection
  }) => {
    const snapshotParams = { imageIds: setup.imageIds, textIds: setup.textIds }
    const initial = await selection.getImageTextCompositionSnapshot(snapshotParams)

    await selection.scaling.startFromControl({ control: controlCase.control })
    await selection.scaling.dragControlBy({
      deltaX: controlCase.outwardDeltaX,
      deltaY: controlCase.outwardDeltaY,
      pointerSteps: 2
    })
    const live = await selection.getImageTextCompositionSnapshot(snapshotParams)

    await test.step('сохраняет неподвижные границы рамки', async() => {
      expect(live.selection.boundsWidth).toBeGreaterThan(initial.selection.boundsWidth)
      if (controlCase.fixedEdges.includes('left')) {
        expect(Math.abs(live.selection.boundsLeft - initial.selection.boundsLeft))
          .toBeLessThanOrEqual(setup.scenePixel)
      }
      if (controlCase.fixedEdges.includes('right')) {
        expect(Math.abs(live.selection.boundsRight - initial.selection.boundsRight))
          .toBeLessThanOrEqual(setup.scenePixel)
      }
      if (controlCase.fixedEdges.includes('top')) {
        expect(Math.abs(live.selection.boundsTop - initial.selection.boundsTop))
          .toBeLessThanOrEqual(setup.scenePixel)
      }
      if (controlCase.fixedEdges.includes('bottom')) {
        expect(Math.abs(live.selection.boundsBottom - initial.selection.boundsBottom))
          .toBeLessThanOrEqual(setup.scenePixel)
      }
    })

    await test.step('меняет изображения и тексты без искажений', async() => {
      expectImageTextScalePreview({ changesHeight: controlCase.changesHeight, initial, live })
    })

    await selection.scaling.finish()
    const final = await selection.getImageTextCompositionSnapshot(snapshotParams)

    await test.step('не меняет последнее состояние после mouseup', async() => {
      expectImageTextScaleCommit({ final, live })
    })
  })
}

test('при горизонтальном скейлинге одинаково меняет несколько изображений и тексты', async({
  activeSelectionImageTextScaleSetup: setup,
  editorModel,
  images,
  selection
}) => {
  const secondImage = images.checkCreation({
    imageObject: await images.addFilledImage({ width: 150, height: 105, withoutSelection: true })
  })
  await images.moveBoundsTo({
    id: secondImage.id,
    left: setup.montage.left + 245,
    top: setup.montage.top + 75
  })
  await editorModel.selectAllObjects()

  const snapshotParams = {
    imageIds: [...setup.imageIds, secondImage.id],
    textIds: setup.textIds
  }
  const initial = await selection.getImageTextCompositionSnapshot(snapshotParams)

  await selection.scaling.startFromControl({ control: 'mr' })
  await selection.scaling.dragControlBy({ deltaX: 60, deltaY: 0, pointerSteps: 2 })

  const live = await selection.getImageTextCompositionSnapshot(snapshotParams)

  expect(live.selection.boundsWidth).toBeGreaterThan(initial.selection.boundsWidth)
  expect(live.images).toHaveLength(2)
  expectImageTextScalePreview({ changesHeight: false, initial, live })

  await selection.scaling.finish()
  const final = await selection.getImageTextCompositionSnapshot(snapshotParams)

  expectImageTextScaleCommit({ final, live })
})
