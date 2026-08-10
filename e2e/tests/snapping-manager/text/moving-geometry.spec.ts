import { test, expect } from '../../../fixtures/editor.fixture'
import type { SnappingObjectSnapshot } from '../../../types'

/** Повёрнутый отдельный текст и опорный объект для проверки геометрии перемещения. */
type TextMovementGeometrySetup = {
  activeTextId: string
  reference: SnappingObjectSnapshot
}

let setup: TextMovementGeometrySetup

test.beforeEach(async({
  editorModel,
  shapes,
  snapping,
  text
}) => {
  const montageBounds = await editorModel.getMontageAreaBounds()
  const activeText = await text.add({
    id: 'active-text',
    text: 'Повёрнутый текст',
    left: montageBounds.left + 280,
    top: montageBounds.top + 180,
    originX: 'left',
    originY: 'top',
    width: 150,
    fontSize: 28,
    autoExpand: false,
    angle: 30,
    paddingTop: 6,
    paddingRight: 10,
    paddingBottom: 8,
    paddingLeft: 12,
    radiusTopLeft: 4,
    radiusTopRight: 6,
    radiusBottomRight: 8,
    radiusBottomLeft: 10
  })
  const referenceShape = await shapes.addAtBounds({
    presetKey: 'square',
    options: {
      id: 'reference-shape',
      left: montageBounds.left + 80,
      top: montageBounds.top + 100,
      width: 40,
      height: 60,
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

test('при перемещении повёрнутого текста его размеры и оформление не меняются', async({
  snapping,
  text
}) => {
  const initial = text.checkCreation({
    textObject: await text.getObject({ id: setup.activeTextId })
  })

  await snapping.startObjectDrag({ id: setup.activeTextId })
  const snapped = await snapping.dragObjectBoundsTo({
    id: setup.activeTextId,
    left: setup.reference.boundsLeft + 1,
    top: setup.reference.boundsTop + 1
  })
  const held = await snapping.dragObjectBoundsTo({
    id: setup.activeTextId,
    left: snapped.boundsLeft + 3,
    top: snapped.boundsTop + 3
  })
  const live = text.checkCreation({
    textObject: await text.getObject({ id: setup.activeTextId })
  })
  const guides = await snapping.getGuideState()

  expect(held.boundsLeft).toBeCloseTo(snapped.boundsLeft, 5)
  expect(held.boundsTop).toBeCloseTo(snapped.boundsTop, 5)
  expect(live).toEqual({
    ...initial,
    left: live.left,
    top: live.top,
    selectionStart: live.selectionStart,
    selectionEnd: live.selectionEnd
  })
  expect(guides.guides).toEqual(expect.arrayContaining([
    { type: 'vertical', position: setup.reference.boundsLeft },
    { type: 'horizontal', position: setup.reference.boundsTop }
  ]))
  expect(guides.guides).toHaveLength(2)
  expect(guides.spacingGuides).toHaveLength(0)

  const clearedGuides = await snapping.finishPointerInteraction()

  const committed = text.checkCreation({
    textObject: await text.getObject({ id: setup.activeTextId })
  })
  const committedBounds = await snapping.getObjectSnapshot({ id: setup.activeTextId })

  expect(committed).toEqual(live)
  expect(committedBounds.boundsLeft).toBeCloseTo(held.boundsLeft, 5)
  expect(committedBounds.boundsTop).toBeCloseTo(held.boundsTop, 5)
  expect(committedBounds.boundsWidth).toBeCloseTo(held.boundsWidth, 5)
  expect(committedBounds.boundsHeight).toBeCloseTo(held.boundsHeight, 5)
  expect(clearedGuides.guides).toHaveLength(0)
  expect(clearedGuides.spacingGuides).toHaveLength(0)
})

test('после изменения масштаба и положения области просмотра выравнивает отдельный текст по направляющим', async({
  editorModel,
  snapping
}) => {
  const viewportBefore = await editorModel.getCanvasViewportTransform()

  await editorModel.zoomInUntilViewportCanMove()
  await editorModel.dragViewportBySpaceMouse({
    deltaX: -24,
    deltaY: -18
  })

  const viewportAfter = await editorModel.getCanvasViewportTransform()

  await snapping.startObjectDrag({ id: setup.activeTextId })
  const live = await snapping.dragObjectBoundsTo({
    id: setup.activeTextId,
    left: setup.reference.boundsLeft + 1,
    top: setup.reference.boundsTop + 1
  })
  const guideState = await snapping.getGuideState()

  expect(viewportAfter.zoom).toBeGreaterThan(viewportBefore.zoom)
  expect(viewportAfter.x).not.toBeCloseTo(viewportBefore.x, 5)
  expect(viewportAfter.y).not.toBeCloseTo(viewportBefore.y, 5)
  expect(live.boundsLeft).toBeCloseTo(setup.reference.boundsLeft, 1)
  expect(live.boundsTop).toBeCloseTo(setup.reference.boundsTop, 1)
  expect(guideState.guides).toEqual(expect.arrayContaining([
    { type: 'vertical', position: setup.reference.boundsLeft },
    { type: 'horizontal', position: setup.reference.boundsTop }
  ]))
  expect(guideState.guides).toHaveLength(2)
  expect(guideState.spacingGuides).toHaveLength(0)

  const clearedGuides = await snapping.finishPointerInteraction()

  expect(clearedGuides.guides).toHaveLength(0)
  expect(clearedGuides.spacingGuides).toHaveLength(0)
})
