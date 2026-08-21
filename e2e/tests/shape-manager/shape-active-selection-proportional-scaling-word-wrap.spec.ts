import { test, expect } from '../../fixtures/editor.fixture'
import { normalizeRenderedText } from '../../helpers/shape-proportional-word-wrap.helper'
import {
  SHAPE_ACTIVE_SELECTION_WORD_WRAP_LEFT_OPTIONS as ACTIVE_SELECTION_WORD_WRAP_LEFT_OPTIONS,
  SHAPE_ACTIVE_SELECTION_WORD_WRAP_RIGHT_OPTIONS as ACTIVE_SELECTION_WORD_WRAP_RIGHT_OPTIONS,
  SHAPE_MULTI_SCALING_TOLERANCE
} from '../../fixtures/data/shape-multi-scaling.data'
import {
  SHAPE_PROPORTIONAL_MINIMUM_TARGET_SIZE,
  SHAPE_PROPORTIONAL_SCALING_CORNERS
} from '../../fixtures/data/shape-scaling.data'

test.beforeEach(async({ editorModel, shapes }) => {
  const leftShape = await shapes.addAtBounds({
    presetKey: 'square',
    options: ACTIVE_SELECTION_WORD_WRAP_LEFT_OPTIONS
  })
  const rightShape = await shapes.addAtBounds({
    presetKey: 'square',
    options: ACTIVE_SELECTION_WORD_WRAP_RIGHT_OPTIONS
  })

  shapes.checkCreation({ shape: leftShape, presetKey: 'square' })
  shapes.checkCreation({ shape: rightShape, presetKey: 'square' })

  await editorModel.selectAllObjects()
})

for (const cornerScenario of SHAPE_PROPORTIONAL_SCALING_CORNERS) {
  test(`при сужении нескольких шейпов ${cornerScenario.title} слова не переносятся по буквам`, async({
    selection,
    shapes
  }) => {
    const leftId = ACTIVE_SELECTION_WORD_WRAP_LEFT_OPTIONS.id
    const rightId = ACTIVE_SELECTION_WORD_WRAP_RIGHT_OPTIONS.id
    const [initialSelection, initialLeftText, initialRightText] = await Promise.all([
      selection.scaling.getSnapshot(),
      shapes.getTextNode({ id: leftId }), shapes.getTextNode({ id: rightId })
    ])
    const liveSelection = await selection.scaling.shrinkDiagonallyToMinimum({
      corner: cornerScenario.corner,
      minimumSize: SHAPE_PROPORTIONAL_MINIMUM_TARGET_SIZE
    })
    const [liveLeftText, liveRightText] = await Promise.all([
      shapes.getTextNode({ id: leftId }), shapes.getTextNode({ id: rightId })
    ])
    if (!initialLeftText || !initialRightText || !liveLeftText || !liveRightText) {
      throw new Error('Текст в обоих шейпах должен существовать до и во время движения ручки')
    }

    expect(liveSelection.boundsWidth)
      .toBeLessThan(initialSelection.boundsWidth - SHAPE_MULTI_SCALING_TOLERANCE.mouseupJump)
    expect(liveSelection.boundsHeight)
      .toBeLessThan(initialSelection.boundsHeight - SHAPE_MULTI_SCALING_TOLERANCE.mouseupJump)

    const finalSelection = await selection.scaling.finish()
    const [finalLeftShape, finalRightShape, finalLeftText, finalRightText] = await Promise.all([
      shapes.getScaleSnapshot({ id: leftId }), shapes.getScaleSnapshot({ id: rightId }),
      shapes.getTextNode({ id: leftId }), shapes.getTextNode({ id: rightId })
    ])
    if (!finalLeftText || !finalRightText) {
      throw new Error('Текст в обоих шейпах должен существовать после mouseup')
    }

    expect(Math.abs(finalSelection.boundsWidth - liveSelection.boundsWidth))
      .toBeLessThanOrEqual(SHAPE_MULTI_SCALING_TOLERANCE.mouseupJump)
    expect(Math.abs(finalSelection.boundsHeight - liveSelection.boundsHeight))
      .toBeLessThanOrEqual(SHAPE_MULTI_SCALING_TOLERANCE.mouseupJump)
    for (const state of [
      { initial: initialLeftText, live: liveLeftText, final: finalLeftText, text: ACTIVE_SELECTION_WORD_WRAP_LEFT_OPTIONS.text },
      { initial: initialRightText, live: liveRightText, final: finalRightText, text: ACTIVE_SELECTION_WORD_WRAP_RIGHT_OPTIONS.text }
    ]) {
      expect(state.live.lineCount).toBeGreaterThan(state.initial.lineCount)
      expect(state.live.splitByGrapheme).toBe(false)
      expect(state.live.fontSize).toBe(state.initial.fontSize)
      expect(normalizeRenderedText({ lines: state.live.lines })).toBe(state.text)
      expect(state.final.lineCount).toBe(state.live.lineCount)
      expect(state.final.splitByGrapheme).toBe(false)
      expect(state.final.fontSize).toBe(state.live.fontSize)
      expect(normalizeRenderedText({ lines: state.final.lines })).toBe(state.text)
    }
    shapes.checkNodeInsideGroup({ snapshot: finalLeftShape, kind: 'text' })
    shapes.checkNodeInsideGroup({ snapshot: finalRightShape, kind: 'text' })
  })
}
