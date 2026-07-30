import { test, expect } from '../../../fixtures/editor.fixture'
import { SNAPPING_IMAGE_SCALE_SIZE } from '../../../fixtures/data/snapping-image-scaling.data'
import type { SnappingObjectSnapshot } from '../../../types'

/** Геометрия, которая должна полностью восстановиться через undo и redo. */
const IMAGE_SCALE_HISTORY_FIELDS = [
  'boundsLeft',
  'boundsTop',
  'boundsWidth',
  'boundsHeight',
  'boundsRight',
  'boundsBottom',
  'width',
  'height',
  'scaleX',
  'scaleY'
] as const

/** Исходное состояние одного изолированного scale-жеста. */
type ImageScaleLifecycleSetup = {
  baseline: SnappingObjectSnapshot
  imageId: string
}

let setup: ImageScaleLifecycleSetup

test.beforeEach(async({
  history,
  images
}) => {
  const importedImage = await images.addFilledImage(SNAPPING_IMAGE_SCALE_SIZE)
  const image = images.checkCreation({ imageObject: importedImage })

  const setupFlushed = await history.flushPendingSave()

  expect(setupFlushed, 'beforeEach не должен оставлять отложенное сохранение').toBe(false)
  expect(image.id).toBeTruthy()

  setup = {
    baseline: await images.getSnapshot({ id: image.id }),
    imageId: image.id
  }
})

test('при обычном растяжении сохраняет live-геометрию после mouseup', async({
  editorModel,
  images,
  snapping
}) => {
  const started = await images.scaling.startFromControl({
    control: 'mr',
    id: setup.imageId
  })

  expect(started.boundsLeft).toBeCloseTo(setup.baseline.boundsLeft, 5)
  expect(started.boundsRight).toBeCloseTo(setup.baseline.boundsRight, 5)
  expect(started.boundsWidth).toBeGreaterThan(0)

  const live = await images.scaling.dragControlBy({
    deltaX: 24,
    deltaY: 0
  })
  const liveIndicator = await editorModel.requireObjectSizeIndicator()
  const liveGuides = await snapping.getGuideState()

  expect(live.boundsWidth).toBeGreaterThan(setup.baseline.boundsWidth)
  expect(live.boundsLeft).toBeCloseTo(setup.baseline.boundsLeft, 5)
  expect(live.boundsTop).toBeCloseTo(setup.baseline.boundsTop, 5)
  expect(live.boundsHeight).toBeCloseTo(setup.baseline.boundsHeight, 5)
  expect(live.width).toBe(setup.baseline.width)
  expect(live.height).toBe(setup.baseline.height)
  expect(live.scaleY).toBe(setup.baseline.scaleY)
  expect(liveIndicator.width).toBe(Math.round(live.boundsWidth))
  expect(liveIndicator.height).toBe(Math.round(live.boundsHeight))
  expect(liveGuides.guides).toHaveLength(0)
  expect(liveGuides.spacingGuides).toHaveLength(0)

  const committed = await images.scaling.finish({ id: setup.imageId })
  const hiddenIndicator = await editorModel.getObjectSizeIndicator()
  const clearedGuides = await snapping.getGuideState()

  expect(committed).toEqual(live)
  expect(hiddenIndicator.visible).toBe(false)
  expect(hiddenIndicator.text).toBe('')
  expect(clearedGuides.guides).toHaveLength(0)
  expect(clearedGuides.spacingGuides).toHaveLength(0)
})

test('после скейлинга за угол создаёт одну запись в истории и восстанавливает обе оси через undo/redo', async({
  history,
  images
}) => {
  const historyBefore = await history.getPosition()

  await images.scaling.startFromControl({
    control: 'br',
    id: setup.imageId
  })
  await images.scaling.dragControlBy({
    deltaX: 24,
    deltaY: 15
  })

  const committed = await images.scaling.finish({ id: setup.imageId })
  const historySaved = await history.flushPendingSave()
  const historyAfter = await history.getPosition()

  expect(historySaved, 'object:modified должен сохранить завершённый жест').toBe(true)
  expect(committed.boundsWidth).toBeGreaterThan(setup.baseline.boundsWidth)
  expect(committed.boundsHeight).toBeGreaterThan(setup.baseline.boundsHeight)
  expect(historyAfter.patchCount).toBe(historyBefore.patchCount + 1)
  expect(historyAfter.currentIndex).toBe(historyBefore.currentIndex + 1)

  await history.undo()

  const restored = await images.getSnapshot({ id: setup.imageId })
  for (const field of IMAGE_SCALE_HISTORY_FIELDS) {
    expect(restored[field]).toBeCloseTo(setup.baseline[field], 5)
  }

  await history.redo()

  const redone = await images.getSnapshot({ id: setup.imageId })
  for (const field of IMAGE_SCALE_HISTORY_FIELDS) {
    expect(redone[field]).toBeCloseTo(committed[field], 2)
  }
})
