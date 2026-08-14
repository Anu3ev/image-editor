import { test, expect } from '../../../fixtures/editor.fixture'
import {
  TEXT_CORNER_SCALE_HOLD_STEPS,
  TEXT_CORNER_SCALE_GUIDE_TOLERANCE,
  TEXT_CORNER_SCALE_RELEASE_DELTA,
  TEXT_CORNER_SCALE_STABLE_FIELDS,
  TEXT_CORNER_SCALE_TARGET_MULTIPLIER
} from '../../../fixtures/data/text-resizing.data'
import {
  createRotatedTextCornerScaleSetup,
  createTextCornerScaleSetup
} from '../../../fixtures/text-corner-scaling.fixture'

test('повёрнутый текст сохраняет размер и направляющую при микродвижениях угловой ручки', async({
  editorModel,
  shapes,
  snapping,
  text
}) => {
  const setup = await createRotatedTextCornerScaleSetup({ editorModel, shapes, snapping, text })
  const acquired = await text.scaling.dragBy({
    corner: 'br',
    deltaX: 24,
    deltaY: 24,
    id: setup.textId
  })

  expect(acquired.angle).toBeCloseTo(55, 5)
  expect(acquired.width).toBeGreaterThan(setup.initial.width)
  expect(acquired.fontSize).toBeGreaterThan(setup.initial.fontSize)
  expect(Math.abs(acquired.boundsRight - setup.reference.boundsLeft))
    .toBeLessThanOrEqual(TEXT_CORNER_SCALE_GUIDE_TOLERANCE)

  for (const pointerStep of TEXT_CORNER_SCALE_HOLD_STEPS) {
    const held = await text.scaling.continueBy(pointerStep)
    const guideState = await snapping.getGuideState()

    for (const field of TEXT_CORNER_SCALE_STABLE_FIELDS) {
      expect(held[field]).toBeCloseTo(acquired[field], 5)
    }
    expect(guideState.guides).toEqual(expect.arrayContaining([
      { type: 'vertical', position: setup.reference.boundsLeft }
    ]))
    expect(guideState.spacingGuides).toHaveLength(0)
  }

  const committed = await text.scaling.finish({ id: setup.textId })
  const clearedGuides = await snapping.getGuideState()

  for (const field of TEXT_CORNER_SCALE_STABLE_FIELDS) {
    expect(committed[field]).toBeCloseTo(acquired[field], 5)
  }
  expect(clearedGuides.guides).toHaveLength(0)
  expect(clearedGuides.spacingGuides).toHaveLength(0)
})

test('текст сохраняет две направляющие при микродвижениях угловой ручки', async({
  editorModel,
  shapes,
  snapping,
  text
}) => {
  const setup = await createTextCornerScaleSetup({
    corner: 'br',
    editorModel,
    shapes,
    snapping,
    text
  })
  await text.scaling.start({ corner: 'br', id: setup.textId })
  const acquired = await text.scaling.dragToScale({
    scale: TEXT_CORNER_SCALE_TARGET_MULTIPLIER
  })

  expect(Math.abs(acquired.boundsRight - setup.snapPoint.x))
    .toBeLessThanOrEqual(TEXT_CORNER_SCALE_GUIDE_TOLERANCE)
  expect(Math.abs(acquired.boundsBottom - setup.snapPoint.y))
    .toBeLessThanOrEqual(TEXT_CORNER_SCALE_GUIDE_TOLERANCE)

  for (const pointerStep of TEXT_CORNER_SCALE_HOLD_STEPS) {
    const held = await text.scaling.continueBy(pointerStep)
    const guideState = await snapping.getGuideState()

    for (const field of TEXT_CORNER_SCALE_STABLE_FIELDS) {
      expect(held[field]).toBeCloseTo(acquired[field], 5)
    }
    expect(guideState.guides).toEqual(expect.arrayContaining([
      { type: 'vertical', position: setup.snapPoint.x },
      { type: 'horizontal', position: setup.snapPoint.y }
    ]))
    expect(guideState.guides).toHaveLength(2)
  }

  const committed = await text.scaling.finish({ id: setup.textId })

  expect(committed).toEqual(acquired)
  expect((await snapping.getGuideState()).guides).toHaveLength(0)
})

test('после выхода из зоны удержания текст отпускает обе направляющие', async({
  editorModel,
  shapes,
  snapping,
  text
}) => {
  const setup = await createTextCornerScaleSetup({
    corner: 'br',
    editorModel,
    shapes,
    snapping,
    text
  })
  await text.scaling.start({
    corner: 'br',
    id: setup.textId
  })
  const acquired = await text.scaling.dragToScale({
    scale: TEXT_CORNER_SCALE_TARGET_MULTIPLIER
  })
  const acquiredGuides = await snapping.getGuideState()

  expect(Math.abs(acquired.boundsRight - setup.snapPoint.x))
    .toBeLessThanOrEqual(TEXT_CORNER_SCALE_GUIDE_TOLERANCE)
  expect(Math.abs(acquired.boundsBottom - setup.snapPoint.y))
    .toBeLessThanOrEqual(TEXT_CORNER_SCALE_GUIDE_TOLERANCE)
  expect(acquiredGuides.guides).toHaveLength(2)

  const released = await text.scaling.continueBy({
    deltaX: TEXT_CORNER_SCALE_RELEASE_DELTA,
    deltaY: TEXT_CORNER_SCALE_RELEASE_DELTA
  })
  const releasedGuides = await snapping.getGuideState()

  expect(released.boundsRight).toBeGreaterThan(acquired.boundsRight + 30)
  expect(released.boundsBottom).toBeGreaterThan(acquired.boundsBottom + 30)
  expect(releasedGuides.guides).toHaveLength(0)
  expect(releasedGuides.spacingGuides).toHaveLength(0)

  const committed = await text.scaling.finish({ id: setup.textId })

  expect(committed).toEqual(released)
  expect((await snapping.getGuideState()).guides).toHaveLength(0)
})

test('Ctrl снимает удержание, после чего угловая ручка снова прилипает', async({
  editorModel,
  shapes,
  snapping,
  text
}) => {
  const setup = await createTextCornerScaleSetup({
    corner: 'br',
    editorModel,
    shapes,
    snapping,
    text
  })
  await text.scaling.start({
    corner: 'br',
    id: setup.textId
  })
  const acquired = await text.scaling.dragToScale({
    scale: TEXT_CORNER_SCALE_TARGET_MULTIPLIER
  })

  const withoutSnap = await text.scaling.continueBy({
    ctrlKey: true,
    deltaX: 1,
    deltaY: 1
  })
  const guidesWithCtrl = await snapping.getGuideState()

  expect(withoutSnap.boundsRight).not.toBeCloseTo(acquired.boundsRight, 5)
  expect(withoutSnap.boundsBottom).not.toBeCloseTo(acquired.boundsBottom, 5)
  expect(guidesWithCtrl.guides).toHaveLength(0)
  expect(guidesWithCtrl.spacingGuides).toHaveLength(0)

  const reacquired = await text.scaling.continueBy({ deltaX: -1, deltaY: -1 })
  const reacquiredGuides = await snapping.getGuideState()

  expect(Math.abs(reacquired.boundsRight - setup.snapPoint.x))
    .toBeLessThanOrEqual(TEXT_CORNER_SCALE_GUIDE_TOLERANCE)
  expect(Math.abs(reacquired.boundsBottom - setup.snapPoint.y))
    .toBeLessThanOrEqual(TEXT_CORNER_SCALE_GUIDE_TOLERANCE)
  expect(reacquiredGuides.guides).toEqual(expect.arrayContaining([
    { type: 'vertical', position: setup.snapPoint.x },
    { type: 'horizontal', position: setup.snapPoint.y }
  ]))
  expect(reacquiredGuides.guides).toHaveLength(2)

  const committed = await text.scaling.finish({ id: setup.textId })

  expect(committed).toEqual(reacquired)
  expect((await snapping.getGuideState()).guides).toHaveLength(0)
})
