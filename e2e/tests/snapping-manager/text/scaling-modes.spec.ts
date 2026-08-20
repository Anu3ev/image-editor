import { test, expect } from '../../../fixtures/editor.fixture'
import {
  TEXT_CORNER_SCALE_BELOW_MINIMUM_MULTIPLIER,
  TEXT_CORNER_SCALE_CONTROL_CASES,
  TEXT_CORNER_SCALE_GUIDE_TOLERANCE,
  TEXT_CORNER_SCALE_TARGET_MULTIPLIER,
  TEXT_SCALING_MINIMUM_FONT_SIZE
} from '../../../fixtures/data/text-resizing.data'
import {
  createMinimumTextCornerScaleSetup,
  createTextCornerScaleSetup
} from '../../../fixtures/text-corner-scaling.fixture'

test('при уменьшении за угол сохраняется дробная ширина текста', async({
  editorModel,
  text
}) => {
  const montage = await editorModel.getMontageAreaBounds()
  const textId = 'fractional-corner-scale-text'
  const created = text.checkCreation({
    textObject: await text.add({
      id: textId,
      text: 'Текст',
      left: montage.left + 180,
      top: montage.top + 190,
      width: 101,
      fontSize: 32,
      autoExpand: false
    })
  })

  expect(created.width).toBe(101)
  expect(created.scaleX).toBe(1)

  const baseline = await text.scaling.start({ corner: 'br', id: textId })
  const live = await text.scaling.dragToScale({ ctrlKey: true, scale: 0.5 })
  const appliedScale = live.fontSize / baseline.fontSize

  expect(baseline.width).toBe(101)
  expect(appliedScale).toBeGreaterThan(0.45)
  expect(appliedScale).toBeLessThan(0.55)
  expect(live.width).toBeCloseTo(baseline.width * appliedScale, 5)
  expect(Math.abs(live.width - Math.round(live.width))).toBeGreaterThan(0.01)
  expect(live.scaleX).toBe(1)
  expect(live.scaleY).toBe(1)

  const committed = await text.scaling.finish({ id: textId })

  expect(committed).toEqual(live)
  expect(committed.width).toBeCloseTo(baseline.width * appliedScale, 5)
})

test('при уменьшении за угол текст останавливается на минимальном размере без ложных направляющих', async({
  shapes,
  snapping,
  text
}) => {
  const setup = await createMinimumTextCornerScaleSetup({ shapes, snapping, text })

  await text.scaling.start({ corner: 'br', id: setup.textId })
  const minimum = await text.scaling.dragTowardScale({
    scale: TEXT_CORNER_SCALE_BELOW_MINIMUM_MULTIPLIER
  })
  const guidesAtMinimum = await snapping.getGuideState()
  const held = await text.scaling.dragTowardScale({
    scale: TEXT_CORNER_SCALE_BELOW_MINIMUM_MULTIPLIER - 0.1
  })
  const guidesBelowMinimum = await snapping.getGuideState()

  expect(minimum.fontSize).toBe(TEXT_SCALING_MINIMUM_FONT_SIZE)
  expect(minimum.boundsLeft).toBeCloseTo(setup.initial.boundsLeft, 5)
  expect(minimum.boundsTop).toBeCloseTo(setup.initial.boundsTop, 5)
  expect(Math.abs(minimum.boundsRight - setup.snapPoint.x)).toBeGreaterThan(1)
  expect(Math.abs(minimum.boundsBottom - setup.snapPoint.y)).toBeGreaterThan(1)
  expect(guidesAtMinimum.guides).toHaveLength(0)
  expect(guidesAtMinimum.spacingGuides).toHaveLength(0)
  expect(held).toEqual(minimum)
  expect(guidesBelowMinimum.guides).toHaveLength(0)
  expect(guidesBelowMinimum.spacingGuides).toHaveLength(0)

  const committed = await text.scaling.finish({ id: setup.textId })
  expect(committed).toEqual(held)
  expect(committed.scaleX).toBe(1)
  expect(committed.scaleY).toBe(1)
})

for (const controlCase of TEXT_CORNER_SCALE_CONTROL_CASES) {
  test(`${controlCase.title} при увеличении после минимального размера в той же сессии`, async({
    editorModel,
    shapes,
    snapping,
    text
  }) => {
    const setup = await createTextCornerScaleSetup({
      corner: controlCase.corner,
      editorModel,
      shapes,
      snapping,
      text
    })

    await text.scaling.start({ corner: controlCase.corner, id: setup.textId })
    const minimum = await text.scaling.dragPastFixedPoint()
    const minimumGuides = await snapping.getGuideState()
    const reacquired = await text.scaling.dragTowardScale({
      scale: TEXT_CORNER_SCALE_TARGET_MULTIPLIER - 0.02
    })
    const reacquiredGuides = await snapping.getGuideState()

    expect(minimum.fontSize).toBe(TEXT_SCALING_MINIMUM_FONT_SIZE)
    expect(minimum[controlCase.fixedPoint.x]).toBeCloseTo(setup.initial[controlCase.fixedPoint.x], 5)
    expect(minimum[controlCase.fixedPoint.y]).toBeCloseTo(setup.initial[controlCase.fixedPoint.y], 5)
    expect(minimumGuides.guides).toHaveLength(0)
    expect(reacquired.fontSize).toBeGreaterThan(minimum.fontSize)
    expect(Math.abs(reacquired[controlCase.movingEdgeX] - setup.snapPoint.x))
      .toBeLessThanOrEqual(TEXT_CORNER_SCALE_GUIDE_TOLERANCE)
    expect(Math.abs(reacquired[controlCase.movingEdgeY] - setup.snapPoint.y))
      .toBeLessThanOrEqual(TEXT_CORNER_SCALE_GUIDE_TOLERANCE)
    expect(reacquired[controlCase.fixedPoint.x]).toBeCloseTo(setup.initial[controlCase.fixedPoint.x], 5)
    expect(reacquired[controlCase.fixedPoint.y]).toBeCloseTo(setup.initial[controlCase.fixedPoint.y], 5)
    expect(reacquiredGuides.guides).toEqual(expect.arrayContaining([
      { type: 'vertical', position: setup.snapPoint.x },
      { type: 'horizontal', position: setup.snapPoint.y }
    ]))
    expect(reacquiredGuides.guides).toHaveLength(2)
    expect(reacquired.scaleX).toBe(1)
    expect(reacquired.scaleY).toBe(1)

    const committed = await text.scaling.finish({ id: setup.textId })

    expect(committed).toEqual(reacquired)
    expect((await snapping.getGuideState()).guides).toHaveLength(0)
  })
}

test('Shift не меняет пропорциональный скейлинг текста при неравномерном движении указателя', async({
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
  const live = await text.scaling.continueBy({
    ctrlKey: true,
    deltaX: 54,
    deltaY: 13,
    shiftKey: true
  })
  const guides = await snapping.getGuideState()
  const widthScale = live.boundsWidth / setup.initial.boundsWidth
  const heightScale = live.boundsHeight / setup.initial.boundsHeight

  expect(live.boundsWidth).toBeGreaterThan(setup.initial.boundsWidth)
  expect(live.fontSize).toBeGreaterThan(setup.initial.fontSize)
  expect(widthScale).toBeCloseTo(heightScale, 3)
  expect(live.fontSize / setup.initial.fontSize).toBeCloseTo(widthScale, 3)
  expect(live.scaleX).toBe(1)
  expect(live.scaleY).toBe(1)
  expect(live.boundsLeft).toBeCloseTo(setup.initial.boundsLeft, 5)
  expect(live.boundsTop).toBeCloseTo(setup.initial.boundsTop, 5)
  expect(guides.guides).toHaveLength(0)
  expect(guides.spacingGuides).toHaveLength(0)

  const committed = await text.scaling.finish({ id: setup.textId })

  expect(committed).toEqual(live)
  expect((await snapping.getGuideState()).guides).toHaveLength(0)
})

test('с Alt текст увеличивается относительно центра, а направляющие совпадают с его границами', async({
  editorModel,
  shapes,
  snapping,
  text
}) => {
  const setup = await createTextCornerScaleSetup({
    centered: true,
    corner: 'br',
    editorModel,
    shapes,
    snapping,
    text
  })
  const initialCenterX = setup.initial.boundsLeft + (setup.initial.boundsWidth / 2)
  const initialCenterY = setup.initial.boundsTop + (setup.initial.boundsHeight / 2)

  await text.scaling.start({ centered: true, corner: 'br', id: setup.textId })
  const live = await text.scaling.dragToScale({ scale: TEXT_CORNER_SCALE_TARGET_MULTIPLIER })
  const guides = await snapping.getGuideState()
  const liveCenterX = live.boundsLeft + (live.boundsWidth / 2)
  const liveCenterY = live.boundsTop + (live.boundsHeight / 2)

  expect(liveCenterX).toBeCloseTo(initialCenterX, 5)
  expect(liveCenterY).toBeCloseTo(initialCenterY, 5)
  expect(Math.abs(live.boundsRight - setup.snapPoint.x))
    .toBeLessThanOrEqual(TEXT_CORNER_SCALE_GUIDE_TOLERANCE)
  expect(Math.abs(live.boundsBottom - setup.snapPoint.y))
    .toBeLessThanOrEqual(TEXT_CORNER_SCALE_GUIDE_TOLERANCE)
  expect(guides.guides).toEqual(expect.arrayContaining([
    { type: 'vertical', position: setup.snapPoint.x },
    { type: 'horizontal', position: setup.snapPoint.y }
  ]))
  expect(guides.guides).toHaveLength(2)

  const committed = await text.scaling.finish({ id: setup.textId })

  expect(committed).toEqual(live)
  expect((await snapping.getGuideState()).guides).toHaveLength(0)
})

test('после масштабирования и сдвига холста текст прилипает за угол в координатах сцены', async({
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
  const viewportBefore = await editorModel.getCanvasViewportTransform()

  await editorModel.zoomInUntilViewportCanMove()
  await editorModel.dragViewportBySpaceMouse({ deltaX: -24, deltaY: -18 })

  const viewportAfter = await editorModel.getCanvasViewportTransform()
  await text.scaling.start({ corner: 'br', id: setup.textId })
  const live = await text.scaling.dragToScale({ scale: TEXT_CORNER_SCALE_TARGET_MULTIPLIER })
  const guides = await snapping.getGuideState()

  expect(viewportAfter.zoom).toBeGreaterThan(viewportBefore.zoom)
  expect(viewportAfter.x).not.toBeCloseTo(viewportBefore.x, 5)
  expect(viewportAfter.y).not.toBeCloseTo(viewportBefore.y, 5)
  expect(Math.abs(live.boundsRight - setup.snapPoint.x))
    .toBeLessThanOrEqual(TEXT_CORNER_SCALE_GUIDE_TOLERANCE)
  expect(Math.abs(live.boundsBottom - setup.snapPoint.y))
    .toBeLessThanOrEqual(TEXT_CORNER_SCALE_GUIDE_TOLERANCE)
  expect(guides.guides).toEqual(expect.arrayContaining([
    { type: 'vertical', position: setup.snapPoint.x },
    { type: 'horizontal', position: setup.snapPoint.y }
  ]))
  expect(guides.guides).toHaveLength(2)

  const committed = await text.scaling.finish({ id: setup.textId })

  expect(committed).toEqual(live)
  expect((await snapping.getGuideState()).guides).toHaveLength(0)
})
