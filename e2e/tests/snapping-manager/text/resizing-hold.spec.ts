import { test, expect } from '../../../fixtures/editor.fixture'
import { TEXT_SIDE_RESIZE_HOLD_STEPS } from '../../../fixtures/data/text-resizing.data'
import { createTextWidthResizeSetup } from '../../../fixtures/text-width-resizing.fixture'

test('повёрнутый текст сохраняет размер и направляющую при микродвижениях', async({
  editorModel,
  shapes,
  text,
  snapping
}) => {
  const setup = await createTextWidthResizeSetup({
    angle: 55,
    axis: 'x',
    editorModel,
    shapes,
    side: 'right',
    snapping,
    text
  })
  const acquired = await text.resizeSideToGuide({
    axis: 'x',
    position: setup.guidePosition,
    side: 'right',
    id: setup.textId
  })
  const acquiredGuides = await snapping.getGuideState()

  expect(acquired[setup.movingEdge]).toBeCloseTo(setup.guidePosition, 5)
  expect(acquiredGuides.guides).toEqual(expect.arrayContaining([
    expect.objectContaining({ type: 'vertical', position: setup.guidePosition })
  ]))

  for (const pointerStep of TEXT_SIDE_RESIZE_HOLD_STEPS) {
    const held = await text.continueResizeHandleBy(pointerStep)
    const guideState = await snapping.getGuideState()

    expect(held.boundsLeft).toBeCloseTo(acquired.boundsLeft, 5)
    expect(held.boundsTop).toBeCloseTo(acquired.boundsTop, 5)
    expect(held.boundsRight).toBeCloseTo(acquired.boundsRight, 5)
    expect(held.boundsBottom).toBeCloseTo(acquired.boundsBottom, 5)
    expect(held.width).toBeCloseTo(acquired.width, 5)
    expect(held.fontSize).toBe(acquired.fontSize)
    expect(held.leftCenterX).toBeCloseTo(setup.initial.leftCenterX, 5)
    expect(held.leftCenterY).toBeCloseTo(setup.initial.leftCenterY, 5)
    expect(held[setup.movingEdge]).toBeCloseTo(setup.guidePosition, 5)
    expect(guideState.guides).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'vertical', position: setup.guidePosition })
    ]))
  }

  const committed = await text.finishResize({ id: setup.textId })
  const clearedGuides = await snapping.getGuideState()

  expect(committed.boundsLeft).toBeCloseTo(acquired.boundsLeft, 5)
  expect(committed.boundsTop).toBeCloseTo(acquired.boundsTop, 5)
  expect(committed.boundsRight).toBeCloseTo(acquired.boundsRight, 5)
  expect(committed.boundsBottom).toBeCloseTo(acquired.boundsBottom, 5)
  expect(committed.width).toBeCloseTo(acquired.width, 5)
  expect(clearedGuides.guides).toHaveLength(0)
  expect(clearedGuides.spacingGuides).toHaveLength(0)
})

test('Ctrl снимает удержание, после чего текст снова прилипает и отпускает направляющую', async({
  editorModel,
  shapes,
  text,
  snapping
}) => {
  const setup = await createTextWidthResizeSetup({
    angle: 0,
    axis: 'x',
    editorModel,
    shapes,
    side: 'right',
    snapping,
    text
  })
  const acquired = await text.resizeSideToGuide({
    axis: 'x',
    position: setup.guidePosition,
    side: 'right',
    id: setup.textId
  })

  const withoutSnap = await text.continueResizeHandleBy({ deltaX: 1, deltaY: 0, ctrlKey: true })
  const guidesWithCtrl = await snapping.getGuideState()
  expect(withoutSnap.width).not.toBeCloseTo(acquired.width, 5)
  expect(guidesWithCtrl.guides).toHaveLength(0)

  const reacquired = await text.continueResizeHandleBy({ deltaX: -1, deltaY: 0 })
  const reacquiredGuides = await snapping.getGuideState()
  expect(reacquired[setup.movingEdge]).toBeCloseTo(setup.guidePosition, 5)
  expect(reacquiredGuides.guides).toEqual(expect.arrayContaining([
    expect.objectContaining({ type: 'vertical', position: setup.guidePosition })
  ]))

  const released = await text.resizeFromRightToWidth({
    id: setup.textId,
    width: setup.initial.width
  })
  const releasedGuides = await snapping.getGuideState()
  expect(released.width).not.toBeCloseTo(reacquired.width, 5)
  expect(releasedGuides.guides).toHaveLength(0)
  expect(releasedGuides.spacingGuides).toHaveLength(0)

  await text.finishResize({ id: setup.textId })
})
