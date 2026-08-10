import { test, expect } from '../../../fixtures/editor.fixture'
import { SNAPPING_TOLERANCE } from '../../../fixtures/data/snapping.data'
import type { SnappingObjectSnapshot } from '../../../types'

/** Отдельный текст и опорный объект для проверки удержания направляющих. */
type TextMovementSetup = {
  activeTextId: string
  reference: SnappingObjectSnapshot
}

let setup: TextMovementSetup

test.beforeEach(async({
  editorModel,
  shapes,
  snapping,
  text
}) => {
  const montageBounds = await editorModel.getMontageAreaBounds()
  const activeText = await text.add({
    id: 'active-text',
    text: 'Отдельный текст',
    left: montageBounds.left + 240,
    top: montageBounds.top + 120,
    originX: 'left',
    originY: 'top',
    width: 90,
    fontSize: 24,
    autoExpand: false
  })
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

  text.checkCreation({ textObject: activeText })
  shapes.checkCreation({ shape: referenceShape, presetKey: 'square' })

  setup = {
    activeTextId: 'active-text',
    reference: await snapping.getObjectSnapshot({ id: 'reference-shape' })
  }
})

test('при микродвижениях отдельный текст сохраняет выбранные направляющие', async({
  snapping
}) => {
  await snapping.startObjectDrag({ id: setup.activeTextId })
  const snapped = await snapping.dragObjectBoundsTo({
    id: setup.activeTextId,
    left: setup.reference.boundsLeft + 1,
    top: setup.reference.boundsTop + 1
  })

  expect(snapped.boundsLeft).toBeCloseTo(setup.reference.boundsLeft, 1)
  expect(snapped.boundsTop).toBeCloseTo(setup.reference.boundsTop, 1)

  let held = snapped
  for (const offset of [2, 3, 4]) {
    held = await snapping.dragObjectBoundsTo({
      id: setup.activeTextId,
      left: snapped.boundsLeft + offset,
      top: snapped.boundsTop + offset
    })
    const guideState = await snapping.getGuideState()

    expect(held.boundsLeft).toBeCloseTo(snapped.boundsLeft, 1)
    expect(held.boundsTop).toBeCloseTo(snapped.boundsTop, 1)
    expect(held.boundsWidth).toBeCloseTo(snapped.boundsWidth, 5)
    expect(held.boundsHeight).toBeCloseTo(snapped.boundsHeight, 5)
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
    expect(guideState.guides).toHaveLength(2)
    expect(guideState.spacingGuides).toHaveLength(0)
  }

  const clearedGuides = await snapping.finishPointerInteraction()
  const committed = await snapping.getObjectSnapshot({ id: setup.activeTextId })

  expect(committed.boundsLeft).toBeCloseTo(held.boundsLeft, 5)
  expect(committed.boundsTop).toBeCloseTo(held.boundsTop, 5)
  expect(clearedGuides.guides).toHaveLength(0)
  expect(clearedGuides.spacingGuides).toHaveLength(0)
})

test('при выходе по горизонтали отдельный текст отпускает только вертикальную направляющую', async({
  snapping
}) => {
  await snapping.startObjectDrag({ id: setup.activeTextId })
  const snapped = await snapping.dragObjectBoundsTo({
    id: setup.activeTextId,
    left: setup.reference.boundsLeft + 1,
    top: setup.reference.boundsTop + 1
  })
  const acquiredGuides = await snapping.getGuideState()

  expect(snapped.boundsLeft).toBeCloseTo(setup.reference.boundsLeft, 1)
  expect(snapped.boundsTop).toBeCloseTo(setup.reference.boundsTop, 1)
  expect(acquiredGuides.guides).toEqual(expect.arrayContaining([
    { type: 'vertical', position: setup.reference.boundsLeft },
    { type: 'horizontal', position: setup.reference.boundsTop }
  ]))
  expect(acquiredGuides.guides).toHaveLength(2)

  const releasedX = await snapping.dragObjectBoundsTo({
    id: setup.activeTextId,
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
  expect(guideState.spacingGuides).toHaveLength(0)

  const clearedGuides = await snapping.finishPointerInteraction()

  expect(clearedGuides.guides).toHaveLength(0)
  expect(clearedGuides.spacingGuides).toHaveLength(0)
})

test('при выходе по вертикали отдельный текст отпускает только горизонтальную направляющую', async({
  snapping
}) => {
  await snapping.startObjectDrag({ id: setup.activeTextId })
  const snapped = await snapping.dragObjectBoundsTo({
    id: setup.activeTextId,
    left: setup.reference.boundsLeft + 1,
    top: setup.reference.boundsTop + 1
  })
  const acquiredGuides = await snapping.getGuideState()

  expect(snapped.boundsLeft).toBeCloseTo(setup.reference.boundsLeft, 1)
  expect(snapped.boundsTop).toBeCloseTo(setup.reference.boundsTop, 1)
  expect(acquiredGuides.guides).toEqual(expect.arrayContaining([
    { type: 'vertical', position: setup.reference.boundsLeft },
    { type: 'horizontal', position: setup.reference.boundsTop }
  ]))
  expect(acquiredGuides.guides).toHaveLength(2)

  const releasedY = await snapping.dragObjectBoundsTo({
    id: setup.activeTextId,
    left: snapped.boundsLeft + 4,
    top: snapped.boundsTop + 50
  })
  const guideState = await snapping.getGuideState()
  const verticalGuides = guideState.guides.filter((guide) => guide.type === 'vertical')
  const horizontalGuides = guideState.guides.filter((guide) => guide.type === 'horizontal')

  expect(releasedY.boundsLeft).toBeCloseTo(snapped.boundsLeft, 1)
  expect(Math.abs(releasedY.boundsTop - snapped.boundsTop))
    .toBeGreaterThan(SNAPPING_TOLERANCE.position)
  expect(verticalGuides).toEqual([{
    type: 'vertical',
    position: setup.reference.boundsLeft
  }])
  expect(horizontalGuides).toHaveLength(0)
  expect(guideState.spacingGuides).toHaveLength(0)

  const clearedGuides = await snapping.finishPointerInteraction()

  expect(clearedGuides.guides).toHaveLength(0)
  expect(clearedGuides.spacingGuides).toHaveLength(0)
})

test('при нажатии Ctrl отдельный текст снимает удержание и после отпускания прилипает заново', async({
  snapping
}) => {
  await snapping.startObjectDrag({ id: setup.activeTextId })
  const snapped = await snapping.dragObjectBoundsTo({
    id: setup.activeTextId,
    left: setup.reference.boundsLeft + 1,
    top: setup.reference.boundsTop + 1
  })
  const acquiredGuides = await snapping.getGuideState()

  expect(snapped.boundsLeft).toBeCloseTo(setup.reference.boundsLeft, 1)
  expect(snapped.boundsTop).toBeCloseTo(setup.reference.boundsTop, 1)
  expect(acquiredGuides.guides).toEqual(expect.arrayContaining([
    { type: 'vertical', position: setup.reference.boundsLeft },
    { type: 'horizontal', position: setup.reference.boundsTop }
  ]))
  expect(acquiredGuides.guides).toHaveLength(2)

  const withoutSnap = await snapping.dragObjectBoundsTo({
    id: setup.activeTextId,
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
    id: setup.activeTextId,
    left: setup.reference.centerX + 1,
    top: setup.reference.centerY + 1
  })
  const enabledGuides = await snapping.getGuideState()

  expect(reacquired.boundsLeft).toBeCloseTo(setup.reference.centerX, 1)
  expect(reacquired.boundsTop).toBeCloseTo(setup.reference.centerY, 1)
  expect(reacquired.boundsLeft).not.toBeCloseTo(snapped.boundsLeft, 1)
  expect(reacquired.boundsTop).not.toBeCloseTo(snapped.boundsTop, 1)
  expect(enabledGuides.guides).toContainEqual({
    type: 'vertical',
    position: setup.reference.centerX
  })
  expect(enabledGuides.guides).toContainEqual({
    type: 'horizontal',
    position: setup.reference.centerY
  })
  expect(enabledGuides.guides).toHaveLength(2)
  expect(enabledGuides.spacingGuides).toHaveLength(0)

  const clearedGuides = await snapping.finishPointerInteraction()

  expect(clearedGuides.guides).toHaveLength(0)
  expect(clearedGuides.spacingGuides).toHaveLength(0)
})
