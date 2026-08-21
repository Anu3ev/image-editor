import { test, expect } from '../../fixtures/editor.fixture'

/** Все стандартные ручки активной crop-рамки и общего выделения. */
const ALL_SCALE_HANDLES = ['tl', 'tr', 'br', 'bl', 'ml', 'mt', 'mr', 'mb'] as const

/** Объекты, между которыми создаётся общее выделение во время crop. */
type CropSelectionSetup = Readonly<{
  imageId: string
  neighborId: string
}>

let setup: CropSelectionSetup

test.beforeEach(async({ editorModel, images, shapes }) => {
  const montage = await editorModel.getMontageAreaBounds()
  const image = images.checkCreation({
    imageObject: await images.addFilledImage({ width: 220, height: 160, withoutSelection: true })
  })
  const neighborId = 'crop-selection-neighbor'
  const shape = await shapes.addAtBounds({
    presetKey: 'square',
    options: {
      id: neighborId,
      left: montage.left + 60,
      top: montage.top + 70,
      width: 80,
      height: 60
    }
  })
  shapes.checkCreation({ shape, presetKey: 'square' })

  setup = { imageId: image.id, neighborId }
})

test('при настройках по умолчанию общее выделение завершает crop и не включает временную рамку', async({
  crop,
  editorModel,
  selection
}) => {
  const state = await crop.startImageCrop({ id: setup.imageId })
  const frameId = state.frame.id
  expect(typeof frameId, 'активная crop-рамка должна иметь строковый id').toBe('string')
  if (typeof frameId !== 'string') throw new Error('Активная crop-рамка должна иметь строковый id')

  const frameCapability = await selection.scaling.getCapability()
  await editorModel.selectAllObjects()
  const selectionCapability = await selection.scaling.getCapability()

  expect(frameCapability).toMatchObject({
    childIds: [],
    availableScaleHandles: ALL_SCALE_HANDLES,
    targetId: frameId,
    targetType: 'rect'
  })
  expect(await crop.isActive(), 'selectAll должен завершить crop с настройками по умолчанию').toBe(false)
  expect(selectionCapability).toMatchObject({
    childIds: expect.arrayContaining([setup.imageId, setup.neighborId]),
    availableScaleHandles: ALL_SCALE_HANDLES,
    targetId: null,
    targetType: 'activeselection'
  })
  expect(selectionCapability.childIds, 'временная crop-рамка не должна остаться в общем выделении')
    .not.toContain(frameId)
})

test('при сохранении crop после потери выделения временная рамка входит в общее выделение', async({
  crop,
  editorModel,
  selection
}) => {
  const state = await crop.startImageCrop({ id: setup.imageId, cancelOnSelectionClear: false })
  const frameId = state.frame.id
  expect(typeof frameId, 'активная crop-рамка должна иметь строковый id').toBe('string')
  if (typeof frameId !== 'string') throw new Error('Активная crop-рамка должна иметь строковый id')

  const frameCapability = await selection.scaling.getCapability()
  await editorModel.selectAllObjects()
  const selectionCapability = await selection.scaling.getCapability()

  expect(frameCapability).toMatchObject({
    childIds: [],
    availableScaleHandles: ALL_SCALE_HANDLES,
    targetId: frameId,
    targetType: 'rect'
  })
  expect(await crop.isActive(), 'crop с cancelOnSelectionClear: false должен оставаться активным').toBe(true)
  expect(selectionCapability).toMatchObject({
    childIds: expect.arrayContaining([setup.imageId, setup.neighborId, frameId]),
    availableScaleHandles: ALL_SCALE_HANDLES,
    targetId: null,
    targetType: 'activeselection'
  })
  expect(selectionCapability.childIds, 'общее выделение должно содержать рамку активной crop-области')
    .toContain(frameId)
})
