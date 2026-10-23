import { test, expect } from '../../fixtures/editor.fixture'
import { waitForCanvasRender } from '../../helpers/canvas-render.helper'

/** All standard handles of the active crop frame and active selection. */
const ALL_SCALE_HANDLES = ['tl', 'tr', 'br', 'bl', 'ml', 'mt', 'mr', 'mb'] as const

/** Objects included in the active selection created during cropping. */
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

for (const mode of ['image', 'canvas'] as const) {
  test.describe(`Adding an object during ${mode} crop`, () => {
    test.beforeEach(async({ crop }) => {
      if (mode === 'image') {
        // The image is the first object created by the file-level beforeEach.
        await crop.startImageCrop({ objectIndex: 0 })
        return
      }

      await crop.startCanvasCrop()
    })

    test('ends crop and selects the new shape with its own size', async({ crop, editorModel, page, shapes }) => {
      const shape = shapes.checkCreation({ shape: await shapes.add({ presetKey: 'square' }), presetKey: 'square' })

      expect(await crop.isActive(), 'selecting the new shape must end crop mode').toBe(false)
      await test.step('the new shape is the active object right after adding', async() => {
        expect(await editorModel.getActiveObject()).toMatchObject({
          id: shape.id,
          type: shape.type,
          width: shape.width,
          height: shape.height,
          scaleX: shape.scaleX,
          scaleY: shape.scaleY
        })
      })

      await test.step('the selection does not change after the next render', async() => {
        await waitForCanvasRender({ page })

        expect(await editorModel.getActiveObject()).toMatchObject({ id: shape.id, width: shape.width })
      })
    })

    test('saves the shape added during crop as one undoable step', async({ crop, editorModel, history, shapes }) => {
      const { frame } = await crop.requireState()
      const objectsBefore = (await editorModel.getObjects()).filter(({ id }) => id !== frame.id)
      const shape = shapes.checkCreation({ shape: await shapes.add({ presetKey: 'square' }), presetKey: 'square' })

      expect((await editorModel.getObjects()).map(({ id }) => id)).toContain(shape.id)

      await history.undo()

      expect((await editorModel.getObjects()).map(({ id }) => id)).toEqual(objectsBefore.map(({ id }) => id))
    })

    test('ends crop and selects new text', async({ crop, editorModel, text }) => {
      const textObject = await text.add({ text: 'Crop' })
      expect(textObject, 'text must be added').not.toBeNull()

      expect(await crop.isActive()).toBe(false)
      expect(await editorModel.getActiveObject()).toMatchObject({ id: textObject?.id, type: textObject?.type })
    })

    test('keeps crop active when the shape is added without selection', async({ crop, editorModel, shapes }) => {
      const state = await crop.requireState()
      const shape = await shapes.add({ presetKey: 'square', options: { withoutSelection: true } })
      expect(shape, 'shape must be added').not.toBeNull()

      expect(await crop.isActive()).toBe(true)
      expect(await editorModel.getActiveObject()).toMatchObject({ id: state.frame.id })
    })
  })
}
