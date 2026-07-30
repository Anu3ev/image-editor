import { test, expect } from '../../../fixtures/editor.fixture'
import {
  SNAPPING_IMAGE_SCALE_HOLD_OFFSETS_PX,
  SNAPPING_IMAGE_SCALE_POINTER_TOLERANCE_PX,
  SNAPPING_IMAGE_SCALE_REFERENCE_GAP_PX,
  SNAPPING_IMAGE_SCALE_REFERENCE_ID,
  SNAPPING_IMAGE_SCALE_REFERENCE_WIDTH_PX,
  SNAPPING_IMAGE_SCALE_RELEASE_OFFSET_PX,
  SNAPPING_IMAGE_SCALE_SIZE
} from '../../../fixtures/data/snapping-image-scaling.data'
import { SNAPPING_TOLERANCE } from '../../../fixtures/data/snapping.data'
import type { SnappingObjectSnapshot } from '../../../types'

/** Общая геометрия одного изолированного сценария Image scale snapping. */
type ImageScaleSnappingSetup = {
  baseline: SnappingObjectSnapshot
  imageId: string
  reference: SnappingObjectSnapshot
  scenePixel: number
}

let setup: ImageScaleSnappingSetup

test.beforeEach(async({
  editorModel,
  history,
  images,
  shapes,
  snapping
}) => {
  const montage = await editorModel.getMontageAreaBounds()
  const { zoom } = await editorModel.getCanvasState()
  const importedImage = await images.addFilledImage(SNAPPING_IMAGE_SCALE_SIZE)
  const image = images.checkCreation({ imageObject: importedImage })
  const baseline = await images.moveBoundsTo({
    id: image.id,
    left: montage.left + 40,
    top: montage.top + 100
  })
  const referenceShape = await shapes.addAtBounds({
    presetKey: 'square',
    options: {
      id: SNAPPING_IMAGE_SCALE_REFERENCE_ID,
      left: baseline.boundsRight + (SNAPPING_IMAGE_SCALE_REFERENCE_GAP_PX / zoom),
      top: baseline.boundsTop,
      width: SNAPPING_IMAGE_SCALE_REFERENCE_WIDTH_PX / zoom,
      height: baseline.boundsHeight,
      text: ''
    }
  })

  shapes.checkCreation({
    shape: referenceShape,
    presetKey: 'square'
  })
  const setupFlushed = await history.flushPendingSave()

  expect(setupFlushed, 'beforeEach не должен оставлять отложенное сохранение').toBe(false)
  expect(image.id).toBeTruthy()

  setup = {
    baseline,
    imageId: image.id,
    reference: await snapping.getObjectSnapshot({
      id: SNAPPING_IMAGE_SCALE_REFERENCE_ID
    }),
    scenePixel: 1 / zoom
  }

  expect(setup.reference.boundsLeft).toBeGreaterThan(setup.baseline.boundsRight)
  expect(setup.reference.boundsRight).toBeGreaterThan(setup.reference.boundsLeft)
})

test('при растяжении прилипает правой границей и восстанавливает результат через undo/redo', async({
  history,
  images,
  snapping
}) => {
  const historyBefore = await history.getPosition()

  await images.scaling.startFromControl({ control: 'mr', id: setup.imageId })
  const snapped = await images.scaling.dragRightEdgeTo({
    boundsRight: setup.reference.boundsLeft - (2 * setup.scenePixel)
  })
  const guides = await snapping.getGuideState()

  expect(snapped.boundsRight).toBeCloseTo(setup.reference.boundsLeft, 5)
  expect(snapped.boundsLeft).toBeCloseTo(setup.baseline.boundsLeft, 5)
  expect(snapped.boundsTop).toBeCloseTo(setup.baseline.boundsTop, 5)
  expect(snapped.boundsHeight).toBeCloseTo(setup.baseline.boundsHeight, 5)
  expect(snapped.width).toBe(setup.baseline.width)
  expect(snapped.height).toBe(setup.baseline.height)
  expect(snapped.scaleY).toBe(setup.baseline.scaleY)
  expect(guides.guides).toEqual([{
    type: 'vertical',
    position: setup.reference.boundsLeft
  }])
  expect(guides.spacingGuides).toHaveLength(0)

  const committed = await images.scaling.finish({ id: setup.imageId })
  const historySaved = await history.flushPendingSave()
  const historyAfter = await history.getPosition()
  const clearedGuides = await snapping.getGuideState()

  expect(historySaved).toBe(true)
  expect(committed).toEqual(snapped)
  expect(historyAfter.patchCount).toBe(historyBefore.patchCount + 1)
  expect(historyAfter.currentIndex).toBe(historyBefore.currentIndex + 1)
  expect(clearedGuides.guides).toHaveLength(0)
  expect(clearedGuides.spacingGuides).toHaveLength(0)

  await history.undo()

  const restored = await images.getSnapshot({ id: setup.imageId })

  expect(restored.boundsLeft).toBeCloseTo(setup.baseline.boundsLeft, 5)
  expect(restored.boundsRight).toBeCloseTo(setup.baseline.boundsRight, 5)

  await history.redo()

  const redone = await images.getSnapshot({ id: setup.imageId })

  expect(redone.boundsLeft).toBeCloseTo(committed.boundsLeft, 2)
  expect(redone.boundsRight).toBeCloseTo(committed.boundsRight, 2)
})

test('при нескольких микродвижениях удерживает выбранную направляющую без сдвига на один пиксель', async({
  editorModel,
  images,
  snapping
}) => {
  await images.scaling.startFromControl({ control: 'mr', id: setup.imageId })
  const acquired = await images.scaling.dragRightEdgeTo({
    boundsRight: setup.reference.boundsLeft - (2 * setup.scenePixel)
  })
  const acquiredIndicator = await editorModel.requireObjectSizeIndicator()

  expect(acquired.boundsRight).toBeCloseTo(setup.reference.boundsLeft, 5)
  expect(acquiredIndicator.width).toBe(Math.round(acquired.boundsWidth))

  for (const offset of SNAPPING_IMAGE_SCALE_HOLD_OFFSETS_PX) {
    const held = await images.scaling.dragRightEdgeTo({
      boundsRight: setup.reference.boundsLeft + (offset * setup.scenePixel)
    })
    const indicator = await editorModel.requireObjectSizeIndicator()
    const guides = await snapping.getGuideState()

    expect(held.boundsLeft).toBeCloseTo(setup.baseline.boundsLeft, 5)
    expect(held.boundsRight).toBeCloseTo(acquired.boundsRight, 5)
    expect(held.boundsWidth).toBeCloseTo(acquired.boundsWidth, 5)
    expect(held.scaleX).toBeCloseTo(acquired.scaleX, 5)
    expect(indicator.width).toBe(acquiredIndicator.width)
    expect(indicator.height).toBe(acquiredIndicator.height)
    expect(guides.guides).toEqual([{
      type: 'vertical',
      position: setup.reference.boundsLeft
    }])
    expect(guides.spacingGuides).toHaveLength(0)
  }

  const committed = await images.scaling.finish({ id: setup.imageId })
  const clearedGuides = await snapping.getGuideState()

  expect(committed.boundsRight).toBeCloseTo(acquired.boundsRight, 5)
  expect(committed.boundsWidth).toBeCloseTo(acquired.boundsWidth, 5)
  expect(clearedGuides.guides).toHaveLength(0)
  expect(clearedGuides.spacingGuides).toHaveLength(0)
})

test('после выхода из зоны удержания отпускает направляющую и продолжает менять ширину', async({
  images,
  snapping
}) => {
  await images.scaling.startFromControl({ control: 'mr', id: setup.imageId })
  const acquired = await images.scaling.dragRightEdgeTo({
    boundsRight: setup.reference.boundsLeft - (2 * setup.scenePixel)
  })
  const releasedTarget = setup.reference.boundsRight
    + (SNAPPING_IMAGE_SCALE_RELEASE_OFFSET_PX * setup.scenePixel)
  const released = await images.scaling.dragRightEdgeTo({
    boundsRight: releasedTarget
  })
  const guides = await snapping.getGuideState()

  expect(released.boundsLeft).toBeCloseTo(setup.baseline.boundsLeft, 5)
  expect(guides.guides).toHaveLength(0)
  expect(guides.spacingGuides).toHaveLength(0)
  expect(Math.abs(released.boundsRight - releasedTarget) / setup.scenePixel)
    .toBeLessThanOrEqual(SNAPPING_IMAGE_SCALE_POINTER_TOLERANCE_PX)
  expect(Math.abs(released.boundsRight - acquired.boundsRight))
    .toBeGreaterThan(SNAPPING_TOLERANCE.position)
  expect(released.boundsWidth).toBeGreaterThan(acquired.boundsWidth)

  const committed = await images.scaling.finish({ id: setup.imageId })

  expect(committed.boundsLeft).toBeCloseTo(released.boundsLeft, 5)
  expect(committed.boundsRight).toBeCloseTo(released.boundsRight, 5)
})

test('с Ctrl снимает удержание и после отпускания снова прилипает', async({
  images,
  snapping
}) => {
  await images.scaling.startFromControl({ control: 'mr', id: setup.imageId })
  const acquired = await images.scaling.dragRightEdgeTo({
    boundsRight: setup.reference.boundsLeft - (2 * setup.scenePixel)
  })
  const rawTarget = setup.reference.boundsLeft + (2 * setup.scenePixel)
  const withoutSnap = await images.scaling.dragRightEdgeTo({
    boundsRight: rawTarget,
    ctrlKey: true
  })
  const disabledGuides = await snapping.getGuideState()

  expect(acquired.boundsRight).toBeCloseTo(setup.reference.boundsLeft, 5)
  expect(withoutSnap.boundsLeft).toBeCloseTo(setup.baseline.boundsLeft, 5)
  expect(Math.abs(withoutSnap.boundsRight - rawTarget) / setup.scenePixel)
    .toBeLessThanOrEqual(SNAPPING_IMAGE_SCALE_POINTER_TOLERANCE_PX)
  expect(Math.abs(withoutSnap.boundsRight - acquired.boundsRight))
    .toBeGreaterThan(SNAPPING_TOLERANCE.position / 2)
  expect(disabledGuides.guides).toHaveLength(0)
  expect(disabledGuides.spacingGuides).toHaveLength(0)

  const reacquired = await images.scaling.dragRightEdgeTo({
    boundsRight: setup.reference.boundsLeft - setup.scenePixel
  })
  const enabledGuides = await snapping.getGuideState()

  expect(reacquired.boundsLeft).toBeCloseTo(setup.baseline.boundsLeft, 5)
  expect(reacquired.boundsRight).toBeCloseTo(setup.reference.boundsLeft, 5)
  expect(enabledGuides.guides).toEqual([{
    type: 'vertical',
    position: setup.reference.boundsLeft
  }])
  expect(enabledGuides.spacingGuides).toHaveLength(0)

  const committed = await images.scaling.finish({ id: setup.imageId })

  expect(committed.boundsRight).toBeCloseTo(reacquired.boundsRight, 5)
  expect(committed.boundsWidth).toBeCloseTo(reacquired.boundsWidth, 5)
})

test('при уменьшении прилипает правой границей и сохраняет левую границу', async({
  images,
  shapes,
  snapping
}) => {
  const shrinkReferenceLeft = setup.baseline.boundsLeft
    + (setup.baseline.boundsWidth * 0.6)
  const shrinkReferenceShape = await shapes.addAtBounds({
    presetKey: 'square',
    options: {
      id: 'image-scale-shrink-reference',
      left: shrinkReferenceLeft,
      top: setup.baseline.boundsTop,
      width: SNAPPING_IMAGE_SCALE_REFERENCE_WIDTH_PX * setup.scenePixel,
      height: setup.baseline.boundsHeight,
      text: ''
    }
  })

  shapes.checkCreation({
    shape: shrinkReferenceShape,
    presetKey: 'square'
  })

  const shrinkReference = await snapping.getObjectSnapshot({
    id: 'image-scale-shrink-reference'
  })

  await images.scaling.startFromControl({ control: 'mr', id: setup.imageId })

  const snapped = await images.scaling.dragRightEdgeTo({
    boundsRight: shrinkReference.boundsLeft + (2 * setup.scenePixel)
  })
  const guides = await snapping.getGuideState()

  expect(snapped.scaleX).toBeLessThan(setup.baseline.scaleX)
  expect(snapped.boundsWidth).toBeLessThan(setup.baseline.boundsWidth)
  expect(snapped.boundsWidth).toBeGreaterThan(0)
  expect(snapped.boundsRight).toBeCloseTo(shrinkReference.boundsLeft, 5)
  expect(snapped.boundsLeft).toBeCloseTo(setup.baseline.boundsLeft, 5)
  expect(snapped.boundsTop).toBeCloseTo(setup.baseline.boundsTop, 5)
  expect(snapped.boundsHeight).toBeCloseTo(setup.baseline.boundsHeight, 5)
  expect(snapped.width).toBe(setup.baseline.width)
  expect(snapped.height).toBe(setup.baseline.height)
  expect(snapped.scaleY).toBe(setup.baseline.scaleY)
  expect(guides.guides).toEqual([{
    type: 'vertical',
    position: shrinkReference.boundsLeft
  }])
  expect(guides.spacingGuides).toHaveLength(0)

  const committed = await images.scaling.finish({ id: setup.imageId })
  const clearedGuides = await snapping.getGuideState()

  expect(committed).toEqual(snapped)
  expect(clearedGuides.guides).toHaveLength(0)
  expect(clearedGuides.spacingGuides).toHaveLength(0)
})
