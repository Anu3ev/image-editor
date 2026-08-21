import {
  differentHeightTest,
  test,
  expect
} from '../../fixtures/shape-active-selection-scaling.fixture'
import {
  SHAPE_MULTI_SCALING_LEFT_OPTIONS,
  SHAPE_MULTI_SCALING_RIGHT_OPTIONS,
  SHAPE_MULTI_SCALING_SHORT_LEFT_OPTIONS,
  SHAPE_MULTI_SCALING_TALL_RIGHT_OPTIONS,
  SHAPE_MULTI_SCALING_TOLERANCE
} from '../../fixtures/data/shape-multi-scaling.data'

/** Минимальный размер, до которого тянется ручка общего выделения. */
const MINIMUM_TARGET_SIZE = 1

/** Смещение указателя дальше минимального размера. */
const BEYOND_MINIMUM_DELTA = -120

/** Смещение верхней ручки дальше минимального размера. */
const BEYOND_TOP_MINIMUM_DELTA = 120

test('если продолжать тянуть угол после упора в минимальную ширину, выделение не расширяется по ширине рывком', async({
  selection,
  shapes
}) => {
  const minimumSelection = await selection.scaling.shrinkDiagonallyFromBottomRightToMinimum({
    minimumSize: MINIMUM_TARGET_SIZE,
    shiftKey: true
  })
  const [minimumLeftShape, minimumRightShape] = await Promise.all([
    shapes.getScaleSnapshot({ id: SHAPE_MULTI_SCALING_LEFT_OPTIONS.id }),
    shapes.getScaleSnapshot({ id: SHAPE_MULTI_SCALING_RIGHT_OPTIONS.id })
  ])
  const continuedSelection = await selection.scaling.dragControlBy({
    deltaX: BEYOND_MINIMUM_DELTA,
    deltaY: BEYOND_MINIMUM_DELTA
  })
  const [continuedLeftShape, continuedRightShape] = await Promise.all([
    shapes.getScaleSnapshot({ id: SHAPE_MULTI_SCALING_LEFT_OPTIONS.id }),
    shapes.getScaleSnapshot({ id: SHAPE_MULTI_SCALING_RIGHT_OPTIONS.id })
  ])
  const finalSelection = await selection.scaling.finish()
  const [finalLeftShape, finalRightShape] = await Promise.all([
    shapes.getScaleSnapshot({ id: SHAPE_MULTI_SCALING_LEFT_OPTIONS.id }),
    shapes.getScaleSnapshot({ id: SHAPE_MULTI_SCALING_RIGHT_OPTIONS.id })
  ])
  const tolerance = SHAPE_MULTI_SCALING_TOLERANCE.mouseupJump

  expect(continuedSelection.boundsWidth).toBeGreaterThan(MINIMUM_TARGET_SIZE + tolerance)
  expect(continuedSelection.boundsHeight).toBeGreaterThan(MINIMUM_TARGET_SIZE + tolerance)
  expect(Math.abs(continuedSelection.boundsWidth - minimumSelection.boundsWidth)).toBeLessThanOrEqual(tolerance)
  expect(Math.abs(finalSelection.boundsWidth - continuedSelection.boundsWidth)).toBeLessThanOrEqual(tolerance)
  expect(Math.abs(continuedLeftShape.groupBoundsWidth - minimumLeftShape.groupBoundsWidth))
    .toBeLessThanOrEqual(tolerance)
  expect(Math.abs(continuedRightShape.groupBoundsWidth - minimumRightShape.groupBoundsWidth))
    .toBeLessThanOrEqual(tolerance)
  expect(Math.abs(finalLeftShape.groupBoundsWidth - continuedLeftShape.groupBoundsWidth))
    .toBeLessThanOrEqual(tolerance)
  expect(Math.abs(finalRightShape.groupBoundsWidth - continuedRightShape.groupBoundsWidth))
    .toBeLessThanOrEqual(tolerance)
  expect(finalSelection.boundsHeight).toBeGreaterThan(0)
  expect(finalLeftShape.groupBoundsHeight).toBeGreaterThan(0)
  expect(finalRightShape.groupBoundsHeight).toBeGreaterThan(0)
  for (const snapshot of [continuedLeftShape, continuedRightShape, finalLeftShape, finalRightShape]) {
    shapes.checkNodeInsideGroup({ snapshot, kind: 'text' })
  }
})

differentHeightTest('если продолжать тянуть нижнюю ручку после упора в минимальную высоту, выделение не расширяется рывком', async({
  selection,
  shapes
}) => {
  const leftId = SHAPE_MULTI_SCALING_SHORT_LEFT_OPTIONS.id
  const rightId = SHAPE_MULTI_SCALING_TALL_RIGHT_OPTIONS.id
  const minimumSelection = await selection.scaling.shrinkVerticallyFromBottomToMinimum({
    minimumSize: MINIMUM_TARGET_SIZE
  })
  const [minimumLeftShape, minimumRightShape] = await Promise.all([
    shapes.getScaleSnapshot({ id: leftId }),
    shapes.getScaleSnapshot({ id: rightId })
  ])
  const continuedSelection = await selection.scaling.dragControlBy({
    deltaX: 0,
    deltaY: BEYOND_MINIMUM_DELTA
  })
  const [continuedLeftShape, continuedRightShape] = await Promise.all([
    shapes.getScaleSnapshot({ id: leftId }),
    shapes.getScaleSnapshot({ id: rightId })
  ])
  const finalSelection = await selection.scaling.finish()
  const [finalLeftShape, finalRightShape] = await Promise.all([
    shapes.getScaleSnapshot({ id: leftId }),
    shapes.getScaleSnapshot({ id: rightId })
  ])
  const tolerance = SHAPE_MULTI_SCALING_TOLERANCE.mouseupJump

  expect(continuedSelection.boundsHeight).toBeGreaterThan(MINIMUM_TARGET_SIZE + tolerance)
  expect(continuedSelection.boundsWidth).toBeGreaterThan(MINIMUM_TARGET_SIZE + tolerance)
  expect(Math.abs(continuedSelection.boundsHeight - minimumSelection.boundsHeight)).toBeLessThanOrEqual(tolerance)
  expect(Math.abs(finalSelection.boundsHeight - continuedSelection.boundsHeight)).toBeLessThanOrEqual(tolerance)
  expect(Math.abs(continuedLeftShape.groupBoundsHeight - minimumLeftShape.groupBoundsHeight))
    .toBeLessThanOrEqual(tolerance)
  expect(Math.abs(continuedRightShape.groupBoundsHeight - minimumRightShape.groupBoundsHeight))
    .toBeLessThanOrEqual(tolerance)
  expect(Math.abs(finalLeftShape.groupBoundsHeight - continuedLeftShape.groupBoundsHeight))
    .toBeLessThanOrEqual(tolerance)
  expect(Math.abs(finalRightShape.groupBoundsHeight - continuedRightShape.groupBoundsHeight))
    .toBeLessThanOrEqual(tolerance)
  expect(finalSelection.boundsWidth).toBeGreaterThan(0)
  expect(finalLeftShape.groupBoundsWidth).toBeGreaterThan(0)
  expect(finalRightShape.groupBoundsWidth).toBeGreaterThan(0)
  for (const snapshot of [continuedLeftShape, continuedRightShape, finalLeftShape, finalRightShape]) {
    shapes.checkNodeInsideGroup({ snapshot, kind: 'text' })
  }
})

differentHeightTest('при уменьшении сверху меньший шейп остаётся у нижней границы выделения', async({
  selection,
  shapes
}) => {
  const leftId = SHAPE_MULTI_SCALING_SHORT_LEFT_OPTIONS.id
  const rightId = SHAPE_MULTI_SCALING_TALL_RIGHT_OPTIONS.id
  const minimumSelection = await selection.scaling.shrinkVerticallyFromTopToMinimum({
    minimumSize: MINIMUM_TARGET_SIZE
  })
  const [minimumLeftShape, minimumRightShape] = await Promise.all([
    shapes.getScaleSnapshot({ id: leftId }),
    shapes.getScaleSnapshot({ id: rightId })
  ])
  const continuedSelection = await selection.scaling.dragControlBy({
    deltaX: 0,
    deltaY: BEYOND_TOP_MINIMUM_DELTA
  })
  const [continuedLeftShape, continuedRightShape] = await Promise.all([
    shapes.getScaleSnapshot({ id: leftId }),
    shapes.getScaleSnapshot({ id: rightId })
  ])
  const finalSelection = await selection.scaling.finish()
  const [finalLeftShape, finalRightShape] = await Promise.all([
    shapes.getScaleSnapshot({ id: leftId }),
    shapes.getScaleSnapshot({ id: rightId })
  ])
  const tolerance = SHAPE_MULTI_SCALING_TOLERANCE.mouseupJump

  expect(minimumLeftShape.groupBoundsTop).toBeGreaterThanOrEqual(minimumSelection.boundsTop - tolerance)
  expect(minimumLeftShape.groupBoundsBottom).toBeLessThanOrEqual(minimumSelection.boundsBottom + tolerance)
  expect(Math.abs(minimumLeftShape.groupBoundsBottom - minimumSelection.boundsBottom)).toBeLessThanOrEqual(tolerance)
  expect(Math.abs(continuedSelection.boundsHeight - minimumSelection.boundsHeight)).toBeLessThanOrEqual(tolerance)
  expect(continuedLeftShape.groupBoundsTop).toBeGreaterThanOrEqual(continuedSelection.boundsTop - tolerance)
  expect(continuedLeftShape.groupBoundsBottom).toBeLessThanOrEqual(continuedSelection.boundsBottom + tolerance)
  expect(Math.abs(continuedLeftShape.groupBoundsBottom - continuedSelection.boundsBottom))
    .toBeLessThanOrEqual(tolerance)
  expect(Math.abs(finalSelection.boundsHeight - continuedSelection.boundsHeight)).toBeLessThanOrEqual(tolerance)
  expect(Math.abs(finalLeftShape.groupBoundsTop - continuedLeftShape.groupBoundsTop)).toBeLessThanOrEqual(tolerance)
  expect(Math.abs(finalLeftShape.groupBoundsBottom - continuedLeftShape.groupBoundsBottom))
    .toBeLessThanOrEqual(tolerance)
  expect(minimumRightShape.groupBoundsHeight).toBeGreaterThan(0)
  expect(continuedRightShape.groupBoundsHeight).toBeGreaterThan(0)
  expect(finalRightShape.groupBoundsHeight).toBeGreaterThan(0)
  for (const snapshot of [
    minimumLeftShape,
    minimumRightShape,
    continuedLeftShape,
    continuedRightShape,
    finalLeftShape,
    finalRightShape
  ]) {
    shapes.checkNodeInsideGroup({ snapshot, kind: 'text' })
  }
})
