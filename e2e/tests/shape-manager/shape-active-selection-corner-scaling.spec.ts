import {
  differentHeightTest,
  test,
  expect
} from '../../fixtures/shape-active-selection-scaling.fixture'
import {
  SHAPE_MULTI_SCALING_LEFT_OPTIONS,
  SHAPE_MULTI_SCALING_RIGHT_OPTIONS,
  SHAPE_MULTI_SCALING_SCALE_X,
  SHAPE_MULTI_SCALING_SCALE_Y,
  SHAPE_MULTI_SCALING_SHORT_LEFT_OPTIONS,
  SHAPE_MULTI_SCALING_TALL_RIGHT_OPTIONS,
  SHAPE_MULTI_SCALING_TOLERANCE
} from '../../fixtures/data/shape-multi-scaling.data'
import type { ShapeTextInfo } from '../../types'

/** Минимальный размер общего выделения для проверки верхнего угла. */
const MINIMUM_TARGET_SIZE = 1

/** Смещение правого верхнего угла дальше минимального размера. */
const BEYOND_MINIMUM_CORNER_DELTA = Object.freeze({ x: -120, y: 120 })

/** Угловые ручки пропорционального скейлинга. */
const PROPORTIONAL_CORNER_CASES = [
  {
    method: 'scaleDiagonallyFromTopRight',
    title: 'при пропорциональном сужении за правый верхний угол текст переносится во время движения ручки и не дёргается после mouseup'
  },
  {
    method: 'scaleDiagonallyFromBottomRight',
    title: 'при пропорциональном сужении за правый нижний угол текст переносится во время движения ручки и не дёргается после mouseup'
  },
  {
    method: 'scaleDiagonallyFromTopLeft',
    title: 'при пропорциональном сужении за левый верхний угол текст переносится во время движения ручки и не дёргается после mouseup'
  },
  {
    method: 'scaleDiagonallyFromBottomLeft',
    title: 'при пропорциональном сужении за левый нижний угол текст переносится во время движения ручки и не дёргается после mouseup'
  }
] as const

/** Угловые ручки свободного скейлинга одинаковых шейпов. */
const FREE_CORNER_CASES = [
  {
    method: 'scaleDiagonallyFromTopRight',
    // eslint-disable-next-line max-len
    title: 'при сужении нескольких шейпов за правый верхний угол текст переносится во время движения ручки и размер не дёргается после mouseup'
  },
  {
    method: 'scaleDiagonallyFromBottomRight',
    // eslint-disable-next-line max-len
    title: 'при сужении нескольких шейпов за правый нижний угол текст переносится во время движения ручки и размер не дёргается после mouseup'
  }
] as const

/** Проверяет наличие текстовых узлов и возвращает суженный тип. */
function requireShapeTexts({
  stage,
  texts
}: {
  stage: string
  texts: readonly [ShapeTextInfo | null, ShapeTextInfo | null]
}): readonly [ShapeTextInfo, ShapeTextInfo] {
  const [leftText, rightText] = texts

  expect(leftText, `текст в левом шейпе ${stage} должен существовать`).not.toBeNull()
  expect(rightText, `текст в правом шейпе ${stage} должен существовать`).not.toBeNull()
  if (!leftText || !rightText) throw new Error(`текст в обоих шейпах ${stage} должен существовать`)

  return [leftText, rightText]
}

test.describe('Пропорциональный скейлинг общего выделения из шейпов одинаковой высоты', () => {
  for (const cornerCase of PROPORTIONAL_CORNER_CASES) {
    test(cornerCase.title, async({ selection, shapes }) => {
      const leftId = SHAPE_MULTI_SCALING_LEFT_OPTIONS.id
      const rightId = SHAPE_MULTI_SCALING_RIGHT_OPTIONS.id
      const [initialSelection, initialLeftText, initialRightText] = await Promise.all([
        selection.scaling.getSnapshot(),
        shapes.getTextNode({ id: leftId }),
        shapes.getTextNode({ id: rightId })
      ])
      const liveSelection = await selection.scaling[cornerCase.method]({
        scaleX: SHAPE_MULTI_SCALING_SCALE_X,
        scaleY: SHAPE_MULTI_SCALING_SCALE_Y
      })
      const [liveLeftShape, liveRightShape, liveLeftText, liveRightText] = await Promise.all([
        shapes.getScaleSnapshot({ id: leftId }), shapes.getScaleSnapshot({ id: rightId }),
        shapes.getTextNode({ id: leftId }), shapes.getTextNode({ id: rightId })
      ])
      const finalSelection = await selection.scaling.finish()
      const [finalLeftShape, finalRightShape, finalLeftText, finalRightText] = await Promise.all([
        shapes.getScaleSnapshot({ id: leftId }), shapes.getScaleSnapshot({ id: rightId }),
        shapes.getTextNode({ id: leftId }), shapes.getTextNode({ id: rightId })
      ])
      const initialTexts = requireShapeTexts({ stage: 'до движения ручки', texts: [initialLeftText, initialRightText] })
      const liveTexts = requireShapeTexts({ stage: 'во время движения ручки', texts: [liveLeftText, liveRightText] })
      const finalTexts = requireShapeTexts({ stage: 'после mouseup', texts: [finalLeftText, finalRightText] })
      const liveShapes = [liveLeftShape, liveRightShape] as const
      const finalShapes = [finalLeftShape, finalRightShape] as const
      const tolerance = SHAPE_MULTI_SCALING_TOLERANCE.mouseupJump

      expect(liveSelection.boundsWidth).toBeLessThan(initialSelection.boundsWidth - tolerance)
      expect(liveSelection.boundsHeight).toBeLessThan(initialSelection.boundsHeight - tolerance)
      expect(Math.abs(finalSelection.boundsWidth - liveSelection.boundsWidth)).toBeLessThanOrEqual(tolerance)
      expect(Math.abs(finalSelection.boundsHeight - liveSelection.boundsHeight)).toBeLessThanOrEqual(tolerance)
      for (let index = 0; index < liveShapes.length; index += 1) {
        expect(liveTexts[index].lineCount).toBeGreaterThan(initialTexts[index].lineCount)
        expect(liveTexts[index].fontSize).toBe(initialTexts[index].fontSize)
        expect(Math.abs(liveShapes[index].groupBoundsWidth - liveShapes[index].groupBoundsHeight))
          .toBeLessThanOrEqual(tolerance)
        expect(Math.abs(finalShapes[index].groupBoundsWidth - liveShapes[index].groupBoundsWidth))
          .toBeLessThanOrEqual(tolerance)
        expect(Math.abs(finalShapes[index].groupBoundsHeight - liveShapes[index].groupBoundsHeight))
          .toBeLessThanOrEqual(tolerance)
        expect(finalTexts[index]).toMatchObject({
          lineCount: liveTexts[index].lineCount,
          fontSize: liveTexts[index].fontSize
        })
        expect(Math.abs(finalShapes[index].groupBoundsWidth - finalShapes[index].groupBoundsHeight))
          .toBeLessThanOrEqual(tolerance)
        shapes.checkNodeInsideGroup({ snapshot: liveShapes[index], kind: 'text' })
        shapes.checkNodeInsideGroup({ snapshot: finalShapes[index], kind: 'text' })
      }
    })
  }
})

test.describe('Свободный скейлинг общего выделения из шейпов одинаковой высоты', () => {
  for (const cornerCase of FREE_CORNER_CASES) {
    test(cornerCase.title, async({ selection, shapes }) => {
      const leftId = SHAPE_MULTI_SCALING_LEFT_OPTIONS.id
      const rightId = SHAPE_MULTI_SCALING_RIGHT_OPTIONS.id
      const [initialSelection, initialLeftText, initialRightText] = await Promise.all([
        selection.scaling.getSnapshot(),
        shapes.getTextNode({ id: leftId }),
        shapes.getTextNode({ id: rightId })
      ])
      const liveSelection = await selection.scaling[cornerCase.method]({
        scaleX: SHAPE_MULTI_SCALING_SCALE_X,
        scaleY: SHAPE_MULTI_SCALING_SCALE_Y,
        shiftKey: true
      })
      const [liveLeftShape, liveRightShape, liveLeftText, liveRightText] = await Promise.all([
        shapes.getScaleSnapshot({ id: leftId }), shapes.getScaleSnapshot({ id: rightId }),
        shapes.getTextNode({ id: leftId }), shapes.getTextNode({ id: rightId })
      ])
      const finalSelection = await selection.scaling.finish()
      const [finalLeftShape, finalRightShape, finalLeftText, finalRightText] = await Promise.all([
        shapes.getScaleSnapshot({ id: leftId }), shapes.getScaleSnapshot({ id: rightId }),
        shapes.getTextNode({ id: leftId }), shapes.getTextNode({ id: rightId })
      ])
      const initialTexts = requireShapeTexts({ stage: 'до движения ручки', texts: [initialLeftText, initialRightText] })
      const liveTexts = requireShapeTexts({ stage: 'во время движения ручки', texts: [liveLeftText, liveRightText] })
      const finalTexts = requireShapeTexts({ stage: 'после mouseup', texts: [finalLeftText, finalRightText] })
      const liveShapes = [liveLeftShape, liveRightShape] as const
      const finalShapes = [finalLeftShape, finalRightShape] as const
      const tolerance = SHAPE_MULTI_SCALING_TOLERANCE.mouseupJump

      expect(liveSelection.boundsWidth).toBeLessThan(initialSelection.boundsWidth - tolerance)
      expect(liveSelection.boundsHeight).toBeLessThan(initialSelection.boundsHeight - tolerance)
      expect(Math.abs(finalSelection.boundsWidth - liveSelection.boundsWidth)).toBeLessThanOrEqual(tolerance)
      expect(Math.abs(finalSelection.boundsHeight - liveSelection.boundsHeight)).toBeLessThanOrEqual(tolerance)
      for (let index = 0; index < liveShapes.length; index += 1) {
        expect(liveTexts[index].lineCount).toBeGreaterThan(initialTexts[index].lineCount)
        expect(liveTexts[index].fontSize).toBe(initialTexts[index].fontSize)
        expect(Math.abs(finalShapes[index].groupBoundsWidth - liveShapes[index].groupBoundsWidth))
          .toBeLessThanOrEqual(tolerance)
        expect(Math.abs(finalShapes[index].groupBoundsHeight - liveShapes[index].groupBoundsHeight))
          .toBeLessThanOrEqual(tolerance)
        expect(finalTexts[index]).toMatchObject({
          lineCount: liveTexts[index].lineCount,
          fontSize: liveTexts[index].fontSize
        })
        shapes.checkNodeInsideGroup({ snapshot: liveShapes[index], kind: 'text' })
        shapes.checkNodeInsideGroup({ snapshot: finalShapes[index], kind: 'text' })
      }
    })
  }
})

// eslint-disable-next-line max-len
differentHeightTest('при сужении нескольких шейпов разной высоты за правый нижний угол текст переносится во время движения ручки и размер не дёргается после mouseup', async({ selection, shapes }) => {
  const leftId = SHAPE_MULTI_SCALING_SHORT_LEFT_OPTIONS.id
  const rightId = SHAPE_MULTI_SCALING_TALL_RIGHT_OPTIONS.id
  const [initialSelection, initialLeftText, initialRightText] = await Promise.all([
    selection.scaling.getSnapshot(),
    shapes.getTextNode({ id: leftId }),
    shapes.getTextNode({ id: rightId })
  ])
  const liveSelection = await selection.scaling.scaleDiagonallyFromBottomRight({
    scaleX: SHAPE_MULTI_SCALING_SCALE_X,
    scaleY: SHAPE_MULTI_SCALING_SCALE_Y,
    shiftKey: true
  })
  const [liveLeftShape, liveRightShape, liveLeftText, liveRightText] = await Promise.all([
    shapes.getScaleSnapshot({ id: leftId }), shapes.getScaleSnapshot({ id: rightId }),
    shapes.getTextNode({ id: leftId }), shapes.getTextNode({ id: rightId })
  ])
  const finalSelection = await selection.scaling.finish()
  const [finalLeftShape, finalRightShape, finalLeftText, finalRightText] = await Promise.all([
    shapes.getScaleSnapshot({ id: leftId }), shapes.getScaleSnapshot({ id: rightId }),
    shapes.getTextNode({ id: leftId }), shapes.getTextNode({ id: rightId })
  ])
  const initialTexts = requireShapeTexts({ stage: 'до движения ручки', texts: [initialLeftText, initialRightText] })
  const liveTexts = requireShapeTexts({ stage: 'во время движения ручки', texts: [liveLeftText, liveRightText] })
  const finalTexts = requireShapeTexts({ stage: 'после mouseup', texts: [finalLeftText, finalRightText] })
  const liveShapes = [liveLeftShape, liveRightShape] as const
  const finalShapes = [finalLeftShape, finalRightShape] as const
  const tolerance = SHAPE_MULTI_SCALING_TOLERANCE.mouseupJump

  expect(liveSelection.boundsWidth).toBeLessThan(initialSelection.boundsWidth - tolerance)
  expect(liveSelection.boundsHeight).toBeLessThan(initialSelection.boundsHeight - tolerance)
  expect(Math.abs(finalSelection.boundsWidth - liveSelection.boundsWidth)).toBeLessThanOrEqual(tolerance)
  expect(Math.abs(finalSelection.boundsHeight - liveSelection.boundsHeight)).toBeLessThanOrEqual(tolerance)
  for (let index = 0; index < liveShapes.length; index += 1) {
    expect(liveTexts[index].lineCount).toBeGreaterThan(initialTexts[index].lineCount)
    expect(liveTexts[index].fontSize).toBe(initialTexts[index].fontSize)
    expect(Math.abs(finalShapes[index].groupBoundsWidth - liveShapes[index].groupBoundsWidth))
      .toBeLessThanOrEqual(tolerance)
    expect(Math.abs(finalShapes[index].groupBoundsHeight - liveShapes[index].groupBoundsHeight))
      .toBeLessThanOrEqual(tolerance)
    expect(finalTexts[index]).toMatchObject({
      lineCount: liveTexts[index].lineCount,
      fontSize: liveTexts[index].fontSize
    })
    shapes.checkNodeInsideGroup({ snapshot: liveShapes[index], kind: 'text' })
    shapes.checkNodeInsideGroup({ snapshot: finalShapes[index], kind: 'text' })
  }
})

differentHeightTest('при уменьшении из правого верхнего угла меньший шейп остаётся внутри выделения', async({
  selection,
  shapes
}) => {
  const minimumSelection = await selection.scaling.shrinkDiagonallyFromTopRightToMinimum({
    minimumSize: MINIMUM_TARGET_SIZE,
    shiftKey: true
  })
  const [minimumLeftShape, minimumRightShape] = await Promise.all([
    shapes.getScaleSnapshot({ id: SHAPE_MULTI_SCALING_SHORT_LEFT_OPTIONS.id }),
    shapes.getScaleSnapshot({ id: SHAPE_MULTI_SCALING_TALL_RIGHT_OPTIONS.id })
  ])
  const continuedSelection = await selection.scaling.dragControlBy({
    deltaX: BEYOND_MINIMUM_CORNER_DELTA.x,
    deltaY: BEYOND_MINIMUM_CORNER_DELTA.y
  })
  const [continuedLeftShape, continuedRightShape] = await Promise.all([
    shapes.getScaleSnapshot({ id: SHAPE_MULTI_SCALING_SHORT_LEFT_OPTIONS.id }),
    shapes.getScaleSnapshot({ id: SHAPE_MULTI_SCALING_TALL_RIGHT_OPTIONS.id })
  ])
  const finalSelection = await selection.scaling.finish()
  const [finalLeftShape, finalRightShape] = await Promise.all([
    shapes.getScaleSnapshot({ id: SHAPE_MULTI_SCALING_SHORT_LEFT_OPTIONS.id }),
    shapes.getScaleSnapshot({ id: SHAPE_MULTI_SCALING_TALL_RIGHT_OPTIONS.id })
  ])
  const tolerance = SHAPE_MULTI_SCALING_TOLERANCE.mouseupJump

  expect(minimumLeftShape.groupBoundsTop).toBeGreaterThanOrEqual(minimumSelection.boundsTop - tolerance)
  expect(minimumLeftShape.groupBoundsBottom).toBeLessThanOrEqual(minimumSelection.boundsBottom + tolerance)
  expect(Math.abs(minimumLeftShape.groupBoundsBottom - minimumSelection.boundsBottom)).toBeLessThanOrEqual(tolerance)
  expect(Math.abs(continuedSelection.boundsWidth - minimumSelection.boundsWidth)).toBeLessThanOrEqual(tolerance)
  expect(Math.abs(continuedSelection.boundsHeight - minimumSelection.boundsHeight)).toBeLessThanOrEqual(tolerance)
  expect(continuedLeftShape.groupBoundsTop).toBeGreaterThanOrEqual(continuedSelection.boundsTop - tolerance)
  expect(continuedLeftShape.groupBoundsBottom).toBeLessThanOrEqual(continuedSelection.boundsBottom + tolerance)
  expect(Math.abs(continuedLeftShape.groupBoundsBottom - continuedSelection.boundsBottom))
    .toBeLessThanOrEqual(tolerance)
  expect(Math.abs(finalSelection.boundsWidth - continuedSelection.boundsWidth)).toBeLessThanOrEqual(tolerance)
  expect(Math.abs(finalSelection.boundsHeight - continuedSelection.boundsHeight)).toBeLessThanOrEqual(tolerance)
  expect(Math.abs(finalLeftShape.groupBoundsTop - continuedLeftShape.groupBoundsTop)).toBeLessThanOrEqual(tolerance)
  expect(Math.abs(finalLeftShape.groupBoundsBottom - continuedLeftShape.groupBoundsBottom))
    .toBeLessThanOrEqual(tolerance)
  for (const shape of [minimumRightShape, continuedRightShape, finalRightShape]) {
    expect(shape.groupBoundsHeight).toBeGreaterThan(0)
  }
  for (const shape of [
    minimumLeftShape,
    minimumRightShape,
    continuedLeftShape,
    continuedRightShape,
    finalLeftShape,
    finalRightShape
  ]) {
    shapes.checkNodeInsideGroup({ snapshot: shape, kind: 'text' })
  }
})
