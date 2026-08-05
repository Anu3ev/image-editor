import { test, expect } from '../../../fixtures/editor.fixture'
import type { SnappingObjectSnapshot } from '../../../types'

/** Шейп с текстом и опорный объект для проверки геометрии перемещения. */
type ShapeMovementGeometrySetup = {
  activeShapeId: string
  reference: SnappingObjectSnapshot
}

let setup: ShapeMovementGeometrySetup

test.beforeEach(async({
  editorModel,
  shapes,
  snapping
}) => {
  const montageBounds = await editorModel.getMontageAreaBounds()
  const activeShape = await shapes.addAtBounds({
    presetKey: 'square',
    options: {
      id: 'active-shape',
      left: montageBounds.left + 300,
      top: montageBounds.top + 180,
      width: 160,
      height: 100,
      text: 'Текст внутри шейпа',
      textStyle: {
        fontSize: 24
      }
    }
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

  shapes.checkCreation({ shape: activeShape, presetKey: 'square' })
  shapes.checkCreation({ shape: referenceShape, presetKey: 'square' })

  setup = {
    activeShapeId: 'active-shape',
    reference: await snapping.getObjectSnapshot({ id: 'reference-shape' })
  }
})

test('при перемещении повёрнутого шейпа направляющие удерживают выбранные границы', async({
  shapes,
  snapping
}) => {
  await shapes.setAngle({ id: setup.activeShapeId, angle: 30 })

  const initialObject = await shapes.getObject({ id: setup.activeShapeId })

  expect(initialObject?.angle).toBeCloseTo(30, 5)

  await snapping.startObjectDrag({ id: setup.activeShapeId })
  const snapped = await snapping.dragObjectBoundsTo({
    id: setup.activeShapeId,
    left: setup.reference.boundsLeft + 1,
    top: setup.reference.boundsTop + 1
  })
  const snappedGuides = await snapping.getGuideState()

  expect(snapped.boundsLeft).toBeCloseTo(setup.reference.boundsLeft, 1)
  expect(snapped.boundsTop).toBeCloseTo(setup.reference.boundsTop, 1)
  expect(snappedGuides.guides).toHaveLength(2)
  expect(snappedGuides.guides).toEqual(expect.arrayContaining([
    { type: 'vertical', position: setup.reference.boundsLeft },
    { type: 'horizontal', position: setup.reference.boundsTop }
  ]))
  expect(snappedGuides.spacingGuides).toHaveLength(0)

  const heldBounds = await snapping.dragObjectBoundsTo({
    id: setup.activeShapeId,
    left: snapped.boundsLeft + 3,
    top: snapped.boundsTop + 3
  })
  const heldGuides = await snapping.getGuideState()

  expect(heldBounds.boundsLeft).toBeCloseTo(snapped.boundsLeft, 5)
  expect(heldBounds.boundsTop).toBeCloseTo(snapped.boundsTop, 5)
  expect(heldBounds.boundsWidth).toBeCloseTo(snapped.boundsWidth, 5)
  expect(heldBounds.boundsHeight).toBeCloseTo(snapped.boundsHeight, 5)
  expect(heldGuides).toEqual(snappedGuides)

  await snapping.finishPointerInteraction()
})

test('при перемещении повёрнутого шейпа его размеры и внутренний текст не меняются', async({
  shapes,
  snapping
}) => {
  await shapes.setAngle({ id: setup.activeShapeId, angle: 30 })

  const initial = await shapes.getScaleSnapshot({ id: setup.activeShapeId })
  const initialText = await shapes.getTextNode({ id: setup.activeShapeId })

  expect(initialText).not.toBeNull()
  expect(initial.textBoundsWidth).not.toBeNull()
  expect(initial.textBoundsHeight).not.toBeNull()
  if (!initialText || initial.textBoundsWidth === null || initial.textBoundsHeight === null) {
    throw new Error('У шейпа с текстом должны существовать границы текстового узла')
  }

  await snapping.startObjectDrag({ id: setup.activeShapeId })
  await snapping.dragObjectBoundsTo({
    id: setup.activeShapeId,
    left: setup.reference.boundsLeft + 1,
    top: setup.reference.boundsTop + 1
  })

  const live = await shapes.getScaleSnapshot({ id: setup.activeShapeId })
  const liveObject = await shapes.getObject({ id: setup.activeShapeId })
  const liveText = await shapes.getTextNode({ id: setup.activeShapeId })

  expect(liveText).not.toBeNull()
  if (!liveText) throw new Error('После перемещения текстовый узел шейпа должен сохраниться')

  expect(live.groupBoundsWidth).toBeCloseTo(initial.groupBoundsWidth, 5)
  expect(live.groupBoundsHeight).toBeCloseTo(initial.groupBoundsHeight, 5)
  expect(live.width).toBeCloseTo(initial.width, 5)
  expect(live.height).toBeCloseTo(initial.height, 5)
  expect(live.scaleX).toBeCloseTo(initial.scaleX, 5)
  expect(live.scaleY).toBeCloseTo(initial.scaleY, 5)
  expect(live.textBoundsWidth).toBeCloseTo(initial.textBoundsWidth, 5)
  expect(live.textBoundsHeight).toBeCloseTo(initial.textBoundsHeight, 5)
  expect(liveObject?.angle).toBeCloseTo(30, 5)
  expect(liveText.text).toBe(initialText.text)
  expect(liveText.fontSize).toBe(initialText.fontSize)
  expect(liveText.lines).toEqual(initialText.lines)
  expect(liveText.lineCount).toBe(initialText.lineCount)

  await snapping.finishPointerInteraction()

  const committed = await shapes.getScaleSnapshot({ id: setup.activeShapeId })

  expect(committed).toEqual(live)
  expect(committed.textBoundsWidth).toBeCloseTo(initial.textBoundsWidth, 5)
  expect(committed.textBoundsHeight).toBeCloseTo(initial.textBoundsHeight, 5)
})

test('после масштабирования и перемещения области просмотра выравнивает шейп по направляющим', async({
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

  await snapping.startObjectDrag({ id: setup.activeShapeId })
  const live = await snapping.dragObjectBoundsTo({
    id: setup.activeShapeId,
    left: setup.reference.boundsLeft + 1,
    top: setup.reference.boundsTop + 1
  })
  const guideState = await snapping.getGuideState()

  expect(viewportAfter.zoom).toBeGreaterThan(viewportBefore.zoom)
  expect(viewportAfter.x).not.toBeCloseTo(viewportBefore.x, 5)
  expect(viewportAfter.y).not.toBeCloseTo(viewportBefore.y, 5)
  expect(live.boundsLeft).toBeCloseTo(setup.reference.boundsLeft, 1)
  expect(live.boundsTop).toBeCloseTo(setup.reference.boundsTop, 1)
  expect(guideState.guides).toHaveLength(2)
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
  expect(guideState.spacingGuides).toHaveLength(0)

  await snapping.finishPointerInteraction()
})
