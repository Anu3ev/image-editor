import { test, expect } from '../../../fixtures/editor.fixture'
import { SNAPPING_TOLERANCE } from '../../../fixtures/data/snapping.data'
import type { SnappingObjectSnapshot } from '../../../types'

/** Данные для сценариев перемещения изображения. */
type ImageMovementSetup = {
  imageId: string
  reference: SnappingObjectSnapshot
}

let setup: ImageMovementSetup

test.beforeEach(async({
  editorModel,
  images,
  shapes,
  snapping
}) => {
  const montageBounds = await editorModel.getMontageAreaBounds()
  const importedImage = await images.addFilledImage({
    width: 30,
    height: 30
  })
  const image = images.checkCreation({ imageObject: importedImage })
  const referenceShape = await shapes.addAtBounds({
    presetKey: 'square',
    options: {
      id: 'reference-shape',
      left: montageBounds.left + 100,
      top: montageBounds.top + 120,
      width: 12,
      height: 40,
      text: ''
    }
  })

  shapes.checkCreation({
    shape: referenceShape,
    presetKey: 'square'
  })

  setup = {
    imageId: image.id,
    reference: await snapping.getObjectSnapshot({ id: 'reference-shape' })
  }
})

test('при движении внутри зоны прилипания не переключает изображение на более близкую направляющую', async({
  snapping
}) => {
  await snapping.startObjectDrag({ id: setup.imageId })
  const snapped = await snapping.dragObjectBoundsTo({
    id: setup.imageId,
    left: setup.reference.boundsLeft + 1,
    top: setup.reference.boundsTop + 1
  })

  expect(snapped.boundsLeft).toBeCloseTo(setup.reference.boundsLeft, 1)
  expect(snapped.boundsTop).toBeCloseTo(setup.reference.boundsTop, 1)

  const held = await snapping.dragObjectBoundsTo({
    id: setup.imageId,
    left: snapped.boundsLeft + 4,
    top: snapped.boundsTop + 4
  })
  const guideState = await snapping.getGuideState()

  expect(held.boundsLeft).toBeCloseTo(snapped.boundsLeft, 1)
  expect(held.boundsTop).toBeCloseTo(snapped.boundsTop, 1)
  expect(guideState.guides).toEqual(expect.arrayContaining([
    {
      type: 'vertical',
      position: setup.reference.boundsLeft
    },
    {
      type: 'horizontal',
      position: setup.reference.boundsTop
    }
  ]))

  const clearedGuides = await snapping.finishPointerInteraction()
  const committed = await snapping.getObjectSnapshot({ id: setup.imageId })

  expect(committed.boundsLeft).toBeCloseTo(held.boundsLeft, 1)
  expect(committed.boundsTop).toBeCloseTo(held.boundsTop, 1)
  expect(clearedGuides.guides).toHaveLength(0)
  expect(clearedGuides.spacingGuides).toHaveLength(0)
})

test('при выходе по горизонтали отпускает только вертикальную направляющую и не меняет положение после mouseup', async({
  snapping
}) => {
  await snapping.startObjectDrag({ id: setup.imageId })
  const snapped = await snapping.dragObjectBoundsTo({
    id: setup.imageId,
    left: setup.reference.boundsLeft + 1,
    top: setup.reference.boundsTop + 1
  })

  expect(snapped.boundsLeft).toBeCloseTo(setup.reference.boundsLeft, 1)
  expect(snapped.boundsTop).toBeCloseTo(setup.reference.boundsTop, 1)

  const releasedX = await snapping.dragObjectBoundsTo({
    id: setup.imageId,
    left: snapped.boundsLeft + 40,
    top: snapped.boundsTop + 4
  })
  const guideState = await snapping.getGuideState()
  const verticalGuides = guideState.guides.filter((guide) => guide.type === 'vertical')
  const horizontalGuides = guideState.guides.filter((guide) => guide.type === 'horizontal')

  expect(Math.abs(releasedX.boundsLeft - snapped.boundsLeft))
    .toBeGreaterThan(SNAPPING_TOLERANCE.position)
  expect(releasedX.boundsTop).toBeCloseTo(snapped.boundsTop, 1)
  expect(verticalGuides).toHaveLength(0)
  expect(horizontalGuides).toEqual([{
    type: 'horizontal',
    position: setup.reference.boundsTop
  }])

  const clearedGuides = await snapping.finishPointerInteraction()
  const committed = await snapping.getObjectSnapshot({ id: setup.imageId })

  expect(committed.boundsLeft).toBeCloseTo(releasedX.boundsLeft, 1)
  expect(committed.boundsTop).toBeCloseTo(releasedX.boundsTop, 1)
  expect(clearedGuides.guides).toHaveLength(0)
  expect(clearedGuides.spacingGuides).toHaveLength(0)
})

test('при нажатии Ctrl снимает удержание и после отпускания выбирает направляющую заново', async({
  snapping
}) => {
  await snapping.startObjectDrag({ id: setup.imageId })
  const snapped = await snapping.dragObjectBoundsTo({
    id: setup.imageId,
    left: setup.reference.boundsLeft + 1,
    top: setup.reference.boundsTop + 1
  })
  const withoutSnap = await snapping.dragObjectBoundsTo({
    id: setup.imageId,
    left: snapped.boundsLeft + 4,
    top: snapped.boundsTop + 4,
    ctrlKey: true
  })
  const disabledGuides = await snapping.getGuideState()

  expect(Math.abs(withoutSnap.boundsLeft - (snapped.boundsLeft + 4)))
    .toBeLessThanOrEqual(SNAPPING_TOLERANCE.position)
  expect(Math.abs(withoutSnap.boundsTop - (snapped.boundsTop + 4)))
    .toBeLessThanOrEqual(SNAPPING_TOLERANCE.position)
  expect(disabledGuides.guides).toHaveLength(0)
  expect(disabledGuides.spacingGuides).toHaveLength(0)

  const reacquired = await snapping.dragObjectBoundsTo({
    id: setup.imageId,
    left: setup.reference.centerX + 1,
    top: withoutSnap.boundsTop
  })
  const enabledGuides = await snapping.getGuideState()

  expect(reacquired.boundsLeft).toBeCloseTo(setup.reference.centerX, 1)
  expect(reacquired.boundsLeft).not.toBeCloseTo(snapped.boundsLeft, 1)
  expect(enabledGuides.guides).toEqual(expect.arrayContaining([{
    type: 'vertical',
    position: setup.reference.centerX
  }]))

  const clearedGuides = await snapping.finishPointerInteraction()
  const committed = await snapping.getObjectSnapshot({ id: setup.imageId })

  expect(committed.boundsLeft).toBeCloseTo(reacquired.boundsLeft, 1)
  expect(committed.boundsTop).toBeCloseTo(reacquired.boundsTop, 1)
  expect(clearedGuides.guides).toHaveLength(0)
  expect(clearedGuides.spacingGuides).toHaveLength(0)
})

test('при небольшом продолжении движения удерживает равноудалённость изображения', async({
  shapes,
  snapping
}) => {
  const rightShape = await shapes.addAtBounds({
    presetKey: 'square',
    options: {
      id: 'right-reference-shape',
      left: setup.reference.boundsRight + 130,
      top: setup.reference.boundsTop,
      width: 12,
      height: 40,
      text: ''
    }
  })
  shapes.checkCreation({ shape: rightShape, presetKey: 'square' })
  const rightReference = await snapping.getObjectSnapshot({ id: 'right-reference-shape' })
  const image = await snapping.getObjectSnapshot({ id: setup.imageId })
  const expectedLeft = setup.reference.boundsRight
    + ((rightReference.boundsLeft - setup.reference.boundsRight - image.boundsWidth) / 2)

  await snapping.startObjectDrag({ id: setup.imageId })
  const spaced = await snapping.dragObjectBoundsTo({
    id: setup.imageId,
    left: expectedLeft + 3,
    top: setup.reference.boundsTop + 5
  })
  const firstGuides = await snapping.getGuideState()
  const held = await snapping.dragObjectBoundsTo({
    id: setup.imageId,
    left: spaced.boundsLeft + 4,
    top: spaced.boundsTop
  })
  const heldGuides = await snapping.getGuideState()

  expect(spaced.boundsLeft).toBeCloseTo(expectedLeft, 0)
  expect(firstGuides.spacingGuides.length).toBeGreaterThan(0)
  expect(held.boundsLeft).toBeCloseTo(spaced.boundsLeft, 0)
  expect(held.boundsTop).toBeCloseTo(spaced.boundsTop, 1)
  expect(heldGuides.spacingGuides.length).toBeGreaterThan(0)

  const clearedGuides = await snapping.finishPointerInteraction()
  const committed = await snapping.getObjectSnapshot({ id: setup.imageId })

  expect(committed.boundsLeft).toBeCloseTo(held.boundsLeft, 1)
  expect(committed.boundsTop).toBeCloseTo(held.boundsTop, 1)
  expect(clearedGuides.guides).toHaveLength(0)
  expect(clearedGuides.spacingGuides).toHaveLength(0)
})
