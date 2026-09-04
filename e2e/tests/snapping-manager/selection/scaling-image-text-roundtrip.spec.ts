import {
  test,
  expect
} from '../../../fixtures/active-selection-scaling.fixture'
import { expectImageTextScaleRoundtrip } from '../../../helpers/image-text-selection-scaling.helper'

test('после скейлинга копия выделения сохраняет изображение и оформление текстов', async({
  activeSelectionImageTextScaleSetup: setup,
  clipboard,
  selection
}) => {
  await selection.scaling.startFromControl({ control: 'mr' })
  await selection.scaling.dragControlToScenePoint({
    point: { x: setup.montage.right, y: setup.initial.selection.centerY }
  })
  await selection.scaling.finish()

  const source = await selection.getImageTextCompositionSnapshot({
    imageIds: setup.imageIds,
    textIds: setup.textIds
  })

  expect(source.selection.boundsRight).toBeCloseTo(setup.montage.right, 2)
  expect(source.selection.scaleX).toBe(1)

  await clipboard.copy()
  await clipboard.waitForClipboardReady()

  expect(await clipboard.paste()).toBe(true)

  const copied = await selection.getActiveImageTextCompositionSnapshot()
  const sourceIds = new Set([
    ...source.images.map(({ snapshot }) => snapshot.id),
    ...source.texts.map(({ snapshot }) => snapshot.id)
  ])

  expect(copied.selection.boundsLeft - source.selection.boundsLeft).toBeCloseTo(10, 5)
  expect(copied.selection.boundsTop - source.selection.boundsTop).toBeCloseTo(10, 5)
  for (const { snapshot } of [...copied.images, ...copied.texts]) {
    expect(sourceIds.has(snapshot.id)).toBe(false)
  }
  expectImageTextScaleRoundtrip({ actual: copied, expected: source })
})

test('после скейлинга шаблон сохраняет два изображения и оформление текстов', async({
  activeSelectionImageTextScaleSetup: setup,
  editorModel,
  images,
  selection,
  template
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

  const initial = await selection.getActiveImageTextCompositionSnapshot()

  await selection.scaling.startFromControl({ control: 'mr' })
  await selection.scaling.dragControlBy({ deltaX: 60, deltaY: 0, pointerSteps: 2 })
  await selection.scaling.finish()

  const source = await selection.getActiveImageTextCompositionSnapshot()

  expect(source.selection.boundsWidth).toBeGreaterThan(initial.selection.boundsWidth)
  expect(source.images).toHaveLength(2)
  expect(source.texts).toHaveLength(2)

  const serializedTemplate = await template.serializeSelection()

  expect(serializedTemplate, 'общее выделение должно сохраниться в шаблон').not.toBeNull()
  expect(serializedTemplate?.objects).toHaveLength(4)
  expect(await selection.getActiveImageTextCompositionSnapshot()).toEqual(source)
  if (!serializedTemplate) throw new Error('Не удалось сохранить общее выделение в шаблон')

  const templateBeforeApply = JSON.stringify(serializedTemplate)

  await editorModel.deleteSelectedObject()
  await editorModel.checkObjectCount({ count: 0 })

  expect(await template.applyTemplate({ template: serializedTemplate })).toBe(4)
  expect(JSON.stringify(serializedTemplate)).toBe(templateBeforeApply)

  const restored = await selection.getActiveImageTextCompositionSnapshot()
  const sourceIds = new Set([
    ...source.images.map(({ snapshot }) => snapshot.id),
    ...source.texts.map(({ snapshot }) => snapshot.id)
  ])

  expect(restored.selection.boundsLeft).toBeCloseTo(source.selection.boundsLeft, 5)
  expect(restored.selection.boundsTop).toBeCloseTo(source.selection.boundsTop, 5)
  for (const { snapshot } of [...restored.images, ...restored.texts]) {
    expect(sourceIds.has(snapshot.id)).toBe(false)
  }
  expectImageTextScaleRoundtrip({ actual: restored, expected: source })
})
